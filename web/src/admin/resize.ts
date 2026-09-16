/**
 * Images are resized in the browser, before they are uploaded. The server only
 * checks the first bytes and the size; it never decodes a picture, so no image
 * decoder - and none of its CVEs - lives in the container.
 */

/** The only widths the server serves, and the only field names it reads. */
export const TARGET_WIDTHS = [640, 1280, 1920] as const;

/** What the owner may hand us. Bigger than this and the tab runs out of memory decoding it. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/** The server's per-rendition cap (MediaAdmin.MaxRenditionBytes). */
export const MAX_RENDITION_BYTES = 3 * 1024 * 1024;

const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;

/** Tried in turn, only for a rendition that came back over the cap. */
const FALLBACK_QUALITIES = [0.7, 0.6];

export type ImageType = 'image/webp' | 'image/jpeg';

export interface Rendition {
  /** The slot the server stores it in - w640, w1280, w1920 - not necessarily the pixel width. */
  width: number;
  blob: Blob;
}

export interface ResizedUpload {
  /** The image's own size, which is what the page needs to reserve its space. */
  width: number;
  height: number;
  /** One type for the whole image: a browser that cannot write WebP writes JPEG for every width. */
  type: ImageType;
  renditions: Rendition[];
}

export type ResizeErrorCode = 'not-an-image' | 'too-large' | 'unreadable' | 'no-canvas' | 'rendition-too-large';

/**
 * A refusal the owner can act on. `code` lets a screen say it in the interface
 * language; `message` is the readable English fallback.
 */
export class ResizeError extends Error {
  constructor(
    readonly code: ResizeErrorCode,
    message: string,
    /** Set for 'rendition-too-large': the width that would not fit. */
    readonly width?: number,
  ) {
    super(message);
    this.name = 'ResizeError';
  }
}

const megabytes = (bytes: number) => `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;

interface Source {
  image: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

/**
 * The image's natural size, from `createImageBitmap` where it exists and from a
 * decoded `<img>` where it does not (Safari before 15).
 */
async function readSource(file: File): Promise<Source> {
  if (typeof globalThis.createImageBitmap === 'function') {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new ResizeError('unreadable', `“${file.name}” could not be read as an image.`);
    }
    return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new ResizeError('unreadable', `“${file.name}” could not be read as an image.`);
  }
  return {
    image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

function encode(canvas: HTMLCanvasElement, type: ImageType, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), type, quality));
}

/** Draws the source once at one width, aspect kept, never upscaled past the original. */
function draw(source: Source, slot: number): HTMLCanvasElement {
  const width = Math.min(slot, source.width);
  const height = Math.max(1, Math.round((width / source.width) * source.height));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new ResizeError('no-canvas', 'This browser cannot resize images.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source.image, 0, 0, width, height);
  return canvas;
}

/**
 * Every rendition in one format. Returns null - rather than throwing - when the
 * canvas will not write WebP, because then the whole image is redone as JPEG.
 */
async function renditionsOf(source: Source, slots: number[], type: ImageType): Promise<Rendition[] | null> {
  const renditions: Rendition[] = [];

  for (const slot of slots) {
    const canvas = draw(source, slot);
    let blob = await encode(canvas, type, type === 'image/webp' ? WEBP_QUALITY : JPEG_QUALITY);

    // A canvas that cannot write the type either says nothing or quietly writes PNG.
    if (!blob || (blob.type !== '' && blob.type !== type)) {
      if (type === 'image/webp') return null;
      throw new ResizeError('no-canvas', 'This browser could not save the resized image.');
    }

    for (const quality of FALLBACK_QUALITIES) {
      if (blob.size <= MAX_RENDITION_BYTES) break;
      const smaller = await encode(canvas, type, quality);
      if (!smaller) break;
      blob = smaller;
    }

    if (blob.size > MAX_RENDITION_BYTES) {
      throw new ResizeError(
        'rendition-too-large',
        `The ${slot} px copy is still ${megabytes(blob.size)} after lowering the quality; the limit is 3 MB.`,
        slot,
      );
    }

    renditions.push({ width: slot, blob });
  }

  return renditions;
}

/**
 * One picked file to the two or three WebP copies the server wants.
 *
 * Widths are the target widths the image actually has the pixels for; an image
 * narrower than 640 still goes up once, as w640, at its own width - the slot is
 * only the name the rendition is served under.
 */
export async function resizeForUpload(file: File): Promise<ResizedUpload> {
  if (!file.type.startsWith('image/')) {
    throw new ResizeError('not-an-image', `“${file.name}” is not an image. Pick a JPEG, PNG or WebP picture.`);
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ResizeError('too-large', `“${file.name}” is ${megabytes(file.size)}. Images must be under 25 MB.`);
  }

  const source = await readSource(file);
  try {
    const usable = TARGET_WIDTHS.filter(width => width <= source.width);
    // Narrower than the smallest target: one copy, in the w640 slot.
    const slots = usable.length > 0 ? [...usable] : [TARGET_WIDTHS[0]];

    const webp = await renditionsOf(source, slots, 'image/webp');
    if (webp) return { width: source.width, height: source.height, type: 'image/webp', renditions: webp };

    const jpeg = await renditionsOf(source, slots, 'image/jpeg');
    if (!jpeg) throw new ResizeError('no-canvas', 'This browser could not save the resized image.');
    return { width: source.width, height: source.height, type: 'image/jpeg', renditions: jpeg };
  } finally {
    source.release();
  }
}

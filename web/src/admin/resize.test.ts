import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resizeForUpload, ResizeError } from './resize';

/** Every toBlob call the code made, so a test can see what was drawn and how it was encoded. */
interface Encode {
  width: number;
  height: number;
  type: string | undefined;
  quality: number | undefined;
}

let encodes: Encode[];
let natural: { width: number; height: number };
let answer: (encode: Encode) => Blob | null;

const realGetContext = HTMLCanvasElement.prototype.getContext;
const realToBlob = HTMLCanvasElement.prototype.toBlob;
const realCreateImageBitmap = globalThis.createImageBitmap;

/** A blob of a claimed size, without allocating the bytes. */
function blobOf(type: string, size: number): Blob {
  const blob = new Blob(['x'], { type });
  Object.defineProperty(blob, 'size', { value: size, configurable: true });
  return blob;
}

/** A file of a claimed size, without allocating the bytes. */
function fileOf(name: string, type: string, size = 2048): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size, configurable: true });
  return file;
}

beforeEach(() => {
  encodes = [];
  natural = { width: 1600, height: 1000 };
  answer = encode => blobOf(encode.type ?? 'image/png', 120_000);

  globalThis.createImageBitmap = vi.fn(
    async () => ({ width: natural.width, height: natural.height, close: () => {} }) as unknown as ImageBitmap,
  ) as unknown as typeof createImageBitmap;

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    drawImage: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toBlob = function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
    type?: string,
    quality?: unknown,
  ) {
    const encode = { width: this.width, height: this.height, type, quality: quality as number | undefined };
    encodes.push(encode);
    callback(answer(encode));
  };
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = realGetContext;
  HTMLCanvasElement.prototype.toBlob = realToBlob;
  globalThis.createImageBitmap = realCreateImageBitmap;
  vi.restoreAllMocks();
});

describe('preparing an image for upload', () => {
  it('sends only the widths the image actually has, at high smoothing', async () => {
    const context = { imageSmoothingEnabled: false, imageSmoothingQuality: 'low' as ImageSmoothingQuality, drawImage: vi.fn() };
    HTMLCanvasElement.prototype.getContext = vi.fn(() => context) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    const result = await resizeForUpload(fileOf('hero.jpg', 'image/jpeg'));

    expect(result.width).toBe(1600);
    expect(result.height).toBe(1000);
    expect(result.type).toBe('image/webp');
    // 1920 is wider than the image itself: upscaling only makes a bigger file.
    expect(result.renditions.map(r => r.width)).toEqual([640, 1280]);
    expect(encodes.map(e => [e.width, e.height])).toEqual([
      [640, 400],
      [1280, 800],
    ]);
    expect(encodes.every(e => e.type === 'image/webp' && e.quality === 0.82)).toBe(true);
    expect(context.imageSmoothingQuality).toBe('high');
  });

  it('still sends a narrow image, once, at its own width', async () => {
    natural = { width: 500, height: 250 };

    const result = await resizeForUpload(fileOf('badge.png', 'image/png'));

    // The slot is w640 - that is the only name the server serves it under - but
    // the pixels are the 500 the image has.
    expect(result.renditions.map(r => r.width)).toEqual([640]);
    expect(encodes).toHaveLength(1);
    expect([encodes[0].width, encodes[0].height]).toEqual([500, 250]);
  });

  it('falls back to JPEG for the whole image when WebP is not available', async () => {
    // Older Safari: toBlob quietly ignores the type it does not know.
    answer = encode => (encode.type === 'image/webp' ? null : blobOf('image/jpeg', 90_000));

    const result = await resizeForUpload(fileOf('hero.jpg', 'image/jpeg'));

    expect(result.type).toBe('image/jpeg');
    expect(result.renditions.map(r => r.width)).toEqual([640, 1280]);
    expect(result.renditions.every(r => r.blob.type === 'image/jpeg')).toBe(true);
    // One type per image: the 640 that WebP nearly managed is re-encoded too.
    expect(encodes.filter(e => e.type === 'image/jpeg')).toHaveLength(2);
    expect(encodes.filter(e => e.type === 'image/jpeg').every(e => e.quality === 0.85)).toBe(true);
  });

  it('treats a canvas that hands back another format as no WebP at all', async () => {
    answer = encode => blobOf(encode.type === 'image/webp' ? 'image/png' : 'image/jpeg', 90_000);

    const result = await resizeForUpload(fileOf('hero.jpg', 'image/jpeg'));

    expect(result.type).toBe('image/jpeg');
  });

  it('drops the quality rather than the rendition when a file is over the 3 MB cap', async () => {
    const big = 4 * 1024 * 1024;
    answer = encode => {
      if (encode.width !== 1280) return blobOf('image/webp', 100_000);
      if (encode.quality === 0.82) return blobOf('image/webp', big);
      if (encode.quality === 0.7) return blobOf('image/webp', 3 * 1024 * 1024 + 1);
      return blobOf('image/webp', 2 * 1024 * 1024);
    };

    const result = await resizeForUpload(fileOf('hero.jpg', 'image/jpeg'));

    expect(encodes.filter(e => e.width === 1280).map(e => e.quality)).toEqual([0.82, 0.7, 0.6]);
    expect(result.renditions.find(r => r.width === 1280)?.blob.size).toBe(2 * 1024 * 1024);
  });

  it('says which width it could not get under the cap', async () => {
    answer = encode => blobOf('image/webp', encode.width === 1280 ? 5 * 1024 * 1024 : 100_000);

    const failure = await resizeForUpload(fileOf('hero.jpg', 'image/jpeg')).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ResizeError);
    expect((failure as ResizeError).code).toBe('rendition-too-large');
    expect((failure as ResizeError).width).toBe(1280);
    expect((failure as ResizeError).message).toContain('1280');
  });

  it('refuses a file that is far too big to open', async () => {
    const failure = await resizeForUpload(fileOf('raw.jpg', 'image/jpeg', 30 * 1024 * 1024)).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ResizeError);
    expect((failure as ResizeError).code).toBe('too-large');
    expect((failure as ResizeError).message).toMatch(/25 MB/);
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
  });

  it('refuses something that is not an image at all', async () => {
    const failure = await resizeForUpload(fileOf('cv.pdf', 'application/pdf')).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ResizeError);
    expect((failure as ResizeError).code).toBe('not-an-image');
    expect((failure as ResizeError).message).toMatch(/image/i);
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
  });

  it('says so plainly when the bytes cannot be decoded', async () => {
    globalThis.createImageBitmap = vi.fn(async () => {
      throw new Error('The source image could not be decoded.');
    }) as unknown as typeof createImageBitmap;

    const failure = await resizeForUpload(fileOf('broken.jpg', 'image/jpeg')).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ResizeError);
    expect((failure as ResizeError).code).toBe('unreadable');
  });
});

describe('browsers without createImageBitmap', () => {
  const realDecode = HTMLImageElement.prototype.decode;
  const realCreateObjectURL = URL.createObjectURL;
  const realRevokeObjectURL = URL.revokeObjectURL;
  const naturalWidth = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth');
  const naturalHeight = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalHeight');

  afterEach(() => {
    HTMLImageElement.prototype.decode = realDecode;
    URL.createObjectURL = realCreateObjectURL;
    URL.revokeObjectURL = realRevokeObjectURL;
    if (naturalWidth) Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', naturalWidth);
    if (naturalHeight) Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', naturalHeight);
  });

  it('reads the size from an <img> instead, and lets the object URL go', async () => {
    // @ts-expect-error - the point of the test is that the function is missing
    delete globalThis.createImageBitmap;
    HTMLImageElement.prototype.decode = async function () {};
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { configurable: true, get: () => 800 });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', { configurable: true, get: () => 600 });
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();

    const result = await resizeForUpload(fileOf('hero.jpg', 'image/jpeg'));

    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.renditions.map(r => r.width)).toEqual([640]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});

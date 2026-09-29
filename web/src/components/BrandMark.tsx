/** The Fold: two continuous paths sharing a centre, with a forward-facing open edge. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path d="M8 43 25.8 12H43L25.2 43H8Z" fill="currentColor" />
      <path d="m25.2 43 8.6-15L56 43 47.4 58 25.2 43Z" fill="currentColor" />
      <path
        d="m33.8 28 8.6-15L56 22l-8.6 15-13.6-9Z"
        fill="var(--brand-accent, #ef5835)"
      />
    </svg>
  );
}

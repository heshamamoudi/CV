import { brandShapes, brandViewBox } from "./brandGeometry";

/** Distinct H and A counters share one level bridge: identity, connection, clarity. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      viewBox={brandViewBox}
      fill="currentColor"
      aria-hidden="true"
    >
      <title>Hesham Amoudi HA mark</title>
      {brandShapes.map((shape, i) => (
        <polygon
          key={i}
          points={shape.points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill={shape.color === "bridge" ? "var(--brand-accent, #eea17a)" : "currentColor"}
        />
      ))}
    </svg>
  );
}

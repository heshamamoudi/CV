import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useHome } from "../data";
const Sculpture = lazy(() =>
  import("./Sculpture").then((m) => ({ default: m.Sculpture })),
);

export function ArchiveFrame({
  chapter,
  children,
  label,
  selectedJourneyIndex,
}: {
  chapter: number;
  children: ReactNode;
  label: string;
  selectedJourneyIndex?: number;
}) {
  const { lang = "en" } = useParams();
  const ar = lang === "ar";
  const home = useHome(ar ? 'ar' : 'en');
  const [paused, setPaused] = useState(
    () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  useEffect(() => {
    document.documentElement.dataset.chapter = String(chapter);
    return () => {
      delete document.documentElement.dataset.chapter;
    };
  }, [chapter]);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setPaused(m.matches);
    m.addEventListener("change", change);
    return () => m.removeEventListener("change", change);
  }, []);
  return (
    <div
      className={`experience chapter-${chapter} archive-experience${paused ? " motion-paused" : ""}`}
    >
      <div className="ambient-grid" aria-hidden="true" />
      <Suspense fallback={null}>
        <Sculpture chapter={chapter} paused={paused} rtl={ar} journey={home?.journey} technologies={home?.technologies} selectedJourneyIndex={selectedJourneyIndex} />
      </Suspense>
      <div className="archive-topline">
        <Link to={`/${lang}#${chapter === 2 ? "journey" : "work"}`}>
          {ar ? "العودة إلى التجربة" : "Back to the experience"}
        </Link>
        <span>{label}</span>
      </div>
      <div className="archive-content">{children}</div>
      <footer className="stage-footer">
        <span>{home?.profile.name}</span>
        <Link to={`/${lang}#contact`}>
          {ar ? "لنتحدث" : "Have something in mind? Let’s talk"}
        </Link>
        <button
          className="motion-toggle"
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? "▶" : "Ⅱ"}{" "}
          {paused
            ? ar
              ? "تشغيل الحركة"
              : "Play motion"
            : ar
              ? "إيقاف الحركة"
              : "Pause motion"}
        </button>
      </footer>
    </div>
  );
}

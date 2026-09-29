import { useState } from "react";
import type { HomeData } from "../types";
import { useStrings } from "../i18n/useStrings";
import { ArchiveFrame } from "../components/ArchiveFrame";

export function JourneyPage({ home }: { home: HomeData }) {
  const t = useStrings(home.lang),
    ar = home.lang === "ar";
  const [selected, setSelected] = useState(0);
  const entry = home.journey[selected];
  return (
    <ArchiveFrame
      chapter={2}
      label={ar ? "المسيرة كاملة" : "THE COMPLETE JOURNEY"}
    >
      <div className="career-archive-heading">
        <p className="section-kicker">
          {ar ? "الخبرة / القيادة / النمو" : "EXPERIENCE / LEADERSHIP / GROWTH"}
        </p>
        <h1>
          {ar ? (
            <>
              كل محطة.
              <br />
              <em>خطوة للأمام.</em>
            </>
          ) : (
            <>
              Every chapter.
              <br />
              <em>A step forward.</em>
            </>
          )}
        </h1>
      </div>
      <div className="career-archive-layout">
        <div className="career-track" aria-label={t("section.journey")}>
          {home.journey.map((role, i) => (
            <button
              key={role.id}
              className={selected === i ? "selected" : ""}
              onClick={() => setSelected(i)}
              aria-pressed={selected === i}
            >
              <span className="track-dot" />
              <time>{role.start.slice(0, 4)}</time>
              <span className="track-role">
                {role.title}
                <small>{role.organisation}</small>
              </span>
              <b aria-hidden="true">↗</b>
            </button>
          ))}
        </div>
        <div className="career-archive-detail" data-scroll-region>
          {entry && (
            <article key={entry.id}>
              <div className="archive-counter">
                {String(selected + 1).padStart(2, "0")}
                <small> / {String(home.journey.length).padStart(2, "0")}</small>
                <span>
                  {entry.kind === "additional"
                    ? ar
                      ? "خبرة إضافية"
                      : "ADDITIONAL EXPERIENCE"
                    : ar
                      ? "المسار المهني"
                      : "CAREER CHAPTER"}
                </span>
              </div>
              <p className="micro-label">
                <time dateTime={entry.start}>{entry.start}</time> —{" "}
                {entry.end ? (
                  <time dateTime={entry.end}>{entry.end}</time>
                ) : (
                  t("journey.present")
                )}
              </p>
              <h2>{entry.title}</h2>
              <p className="career-org">{entry.organisation}</p>
              {entry.summary && <p>{entry.summary}</p>}
              <ul>
                {entry.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <div className="archive-paging">
                <button
                  disabled={selected === 0}
                  onClick={() => setSelected(selected - 1)}
                >
                  {ar ? "السابق" : "Previous"} ←
                </button>
                <button
                  disabled={selected === home.journey.length - 1}
                  onClick={() => setSelected(selected + 1)}
                >
                  {ar ? "التالي" : "Next"} →
                </button>
              </div>
            </article>
          )}
        </div>
      </div>
    </ArchiveFrame>
  );
}

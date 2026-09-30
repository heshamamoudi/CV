import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router";
import type { HomeData } from "../types";
import { useStrings } from "../i18n/useStrings";
import { ContactForm } from "../components/ContactForm";

const Sculpture = lazy(() =>
  import("../components/Sculpture").then((m) => ({ default: m.Sculpture })),
);
export const chapters = ["intro", "work", "journey", "about", "contact"];

export function HomePage({ home }: { home: HomeData }) {
  const t = useStrings(home.lang),
    ar = home.lang === "ar",
    p = home.profile;
  const copy = (en: string, arabic: string) => (ar ? arabic : en);
  const location = useLocation(),
    navigate = useNavigate();
  const selected = chapters.indexOf(location.hash.slice(1));
  const chapter = selected < 0 ? 0 : selected;
  const chapterRef = useRef(chapter);
  chapterRef.current = chapter;
  const [paused, setPaused] = useState(
    () =>
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [projectIndex, setProjectIndex] = useState(() => Math.max(0, home.projects.findIndex(item => item.slug === home.featuredProject?.slug))),
    [roleIndex, setRoleIndex] = useState(0),
    [aboutTab, setAboutTab] = useState(0);
  const project =
    home.projects[Math.min(projectIndex, home.projects.length - 1)];
  const role = home.journey[Math.min(roleIndex, home.journey.length - 1)];
  const labels = [
    copy("Introduction", "المقدمة"),
    copy("Selected work", "الأعمال"),
    copy("The journey", "المسيرة"),
    copy("The person", "نبذة"),
    copy("Let’s talk", "لنتحدث"),
  ];
  const go = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(chapters.length - 1, n));
      if (next === chapterRef.current) return;
      navigate(
        {
          pathname: location.pathname,
          hash: next === 0 ? "" : `#${chapters[next]}`,
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [navigate, location.pathname],
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setPaused(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    let lastWheel = 0,
      amount = 0,
      consumed = false,
      lastTransition = 0,
      touchY = 0,
      touchX = 0,
      touchCanUp = false,
      touchCanDown = false;
    const canScroll = (target: EventTarget | null, delta: number) => {
      if (target instanceof Element && target.closest("[data-contact-form]")) return true;
      let region =
        target instanceof Element
          ? target.closest<HTMLElement>("[data-scroll-region]")
          : null;
      while (region) {
        if (
          delta > 0
            ? region.scrollTop + region.clientHeight < region.scrollHeight - 2
            : region.scrollTop > 2
        )
          return true;
        region =
          region.parentElement?.closest<HTMLElement>("[data-scroll-region]") ??
          null;
      }
      return false;
    };
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || document.querySelector("[data-splash]")) return;
      if (canScroll(e.target, e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheel > 180) {
        amount = 0;
        consumed = false;
      }
      lastWheel = now;
      amount += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      if (consumed || now - lastTransition < 850 || Math.abs(amount) < 55)
        return;
      consumed = true;
      lastTransition = now;
      go(chapterRef.current + Math.sign(amount));
    };
    const key = (e: KeyboardEvent) => {
      if (
        document.querySelector("[data-splash]") ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey
      )
        return;
      if (
        e.target instanceof Element &&
        e.target.closest(
          "button,a,input,textarea,select,[contenteditable=true]",
        )
      )
        return;
      const direction = ["ArrowDown", "PageDown", " "].includes(e.key)
        ? 1
        : ["ArrowUp", "PageUp"].includes(e.key)
          ? -1
          : 0;
      if (direction && !canScroll(e.target, direction)) {
        e.preventDefault();
        go(chapterRef.current + direction);
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(4);
      }
    };
    const start = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
      touchX = e.touches[0].clientX;
      touchCanUp = canScroll(e.target, -1);
      touchCanDown = canScroll(e.target, 1);
    };
    const end = (e: TouchEvent) => {
      if (document.querySelector("[data-splash]")) return;
      if (e.target instanceof Element && e.target.closest("[data-contact-form]")) return;
      const dy = touchY - e.changedTouches[0].clientY,
        dx = touchX - e.changedTouches[0].clientX;
      if (
        Math.abs(dy) > 65 &&
        Math.abs(dy) > Math.abs(dx) &&
        !(dy > 0 ? touchCanDown : touchCanUp)
      )
        go(chapterRef.current + Math.sign(dy));
    };
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => {
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchend", end);
    };
  }, [go]);
  useEffect(() => {
    document.documentElement.dataset.chapter = String(chapter);
    return () => {
      delete document.documentElement.dataset.chapter;
    };
  }, [chapter]);
  const name = p.name.split(" ");
  return (
    <div
      className={`experience chapter-${chapter}${paused ? " motion-paused" : ""}`}
    >
      <div className="ambient-grid" aria-hidden="true" />
      <Suspense
        fallback={
          <div className="sculpture placeholder-sculpture" aria-hidden="true" />
        }
      >
        <Sculpture chapter={chapter} paused={paused} rtl={ar} journey={home.journey} technologies={home.technologies} />
      </Suspense>
      <div className="chapter-watermark" aria-hidden="true">
        {["CREATE", "SOLVE", "EVOLVE", "CONNECT", "HELLO"][chapter]}
      </div>
      <div className="scene-meta">
        <span className="eyebrow">
          <i />
          {p.eyebrow}
        </span>
        <span className="location-label">{p.location}</span>
      </div>
      <section
        className="chapter-panel"
        data-scroll-region={chapter === 4 ? "" : undefined}
        key={chapter}
        aria-label={labels[chapter]}
      >
        {chapter === 0 && (
          <div className="intro-content">
            <p className="section-kicker">
              {p.heroTitle}
            </p>
            <h1 className="hero-name">
              <span>{name[0]}</span>
              <span>
                {name.slice(1).join(" ")}
                <b>.</b>
              </span>
            </h1>
            <div className="intro-bottom">
              <p>{p.heroSubtitle}</p>
              <button className="round-link" onClick={() => go(1)}>
                <span>{t("hero.explore")}</span>
                <i aria-hidden="true">↗</i>
              </button>
            </div>
            <p className="role-label">
              <span className="tiny-star" aria-hidden="true">
                ✳
              </span>
              {p.headline}
            </p>
            <span className="object-note" aria-hidden="true">
              {copy("IDEAS, IN MOTION", "أفكار تتحرك")}
              <br />
              01—05
            </span>
          </div>
        )}
        {chapter === 1 && (
          <div className="work-content">
            <div className="section-kicker">01 / {t("section.project")}</div>
            <h2 className="chapter-title">
              {copy("Ideas into", "أفكار تتحوّل إلى")}
              <br />
              <em>{copy("impact.", "أثر.")}</em>
            </h2>
            <div className="work-layout" data-scroll-region>
              <div
                className="project-picker"
                aria-label={t("page.projects")}
                data-scroll-region
              >
                {home.projects.map((item, i) => (
                  <button
                    key={item.slug}
                    className={i === projectIndex ? "chosen" : ""}
                    onClick={() => setProjectIndex(i)}
                    aria-pressed={i === projectIndex}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <strong>{item.title}</strong>
                    <b aria-hidden="true">↗</b>
                  </button>
                ))}
                {home.projects.length === 0 && (
                  <p>
                    {copy(
                      "Projects will appear here as they are published.",
                      "ستظهر المشاريع هنا عند نشرها.",
                    )}
                  </p>
                )}
              </div>
              {project && (
                <article className="project-spotlight" key={project.slug}>
                  <span className="micro-label">
                    {copy("PROJECT NOTES", "عن المشروع")} /{" "}
                    {String(projectIndex + 1).padStart(2, "0")}
                  </span>
                  <p>{project.summary}</p>
                  <Link
                    className="text-link"
                    to={`/${home.lang}/projects/${project.slug}`}
                  >
                    {copy("Explore the project", "استكشف المشروع")}{" "}
                    <span>↗</span>
                  </Link>
                </article>
              )}
            </div>
            <Link className="all-work" to={`/${home.lang}/projects`}>
              {copy("View all projects", "جميع المشاريع")} ↗
            </Link>
          </div>
        )}
        {chapter === 2 && (
          <div className="journey-content">
            <div className="journey-heading">
              <p className="section-kicker">02 / {t("section.journey")}</p>
              <h2 className="chapter-title">
                {copy("Always", "دائماً")}
                <br />
                <em>{copy("building.", "نبني.")}</em>
              </h2>
              <p className="journey-subtitle">
                {copy(
                  "New challenges. Greater responsibility. The same curiosity.",
                  "تحديات جديدة. مسؤولية أكبر. والشغف ذاته.",
                )}
              </p>
            </div>
            <div className="career-panel" data-scroll-region>
              <div
                className="career-selector"
                aria-label={t("section.journey")}
              >
                {home.journey.map((item, i) => (
                  <button
                    key={item.id}
                    className={i === roleIndex ? "chosen" : ""}
                    onClick={() => setRoleIndex(i)}
                    aria-pressed={i === roleIndex}
                  >
                    {item.start.slice(0, 4)}
                    <span>{item.organisation}</span>
                  </button>
                ))}
              </div>
              {role && (
                <article className="career-detail" key={role.id}>
                  <div className="micro-label">
                    <time dateTime={role.start}>{role.start}</time> —{" "}
                    {role.end ? (
                      <time dateTime={role.end}>{role.end}</time>
                    ) : (
                      t("journey.present")
                    )}
                  </div>
                  <h3>{role.title}</h3>
                  <p className="career-org">{role.organisation}</p>
                  {role.summary && <p>{role.summary}</p>}
                  <ul>
                    {role.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              )}
              <Link className="text-link" to={`/${home.lang}/journey`}>
                {copy("The complete journey", "المسيرة الكاملة")} ↗
              </Link>
            </div>
          </div>
        )}
        {chapter === 3 && (
          <div className="about-content">
            <p className="section-kicker">03 / {t("section.about")}</p>
            <h2 className="chapter-title">
              {copy("Human first.", "الإنسان أولاً.")}
              <br />
              <em>{copy("Engineer always.", "مهندس دائماً.")}</em>
            </h2>
            <div className="about-tabs" aria-label={t("section.about")}>
              {[
                copy("Perspective", "الرؤية"),
                t("section.tech"),
                copy("Background", "الخلفية"),
              ].map((label, i) => (
                <button
                  key={label}
                  aria-pressed={aboutTab === i}
                  className={aboutTab === i ? "chosen" : ""}
                  onClick={() => setAboutTab(i)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="about-body" data-scroll-region key={aboutTab}>
              {aboutTab === 0 && (
                <>
                  {p.portrait && <img className="profile-portrait" src={p.portrait.src} srcSet={p.portrait.srcSet} sizes="120px" width={p.portrait.width} height={p.portrait.height} alt={p.portrait.alt} loading="lazy" />}
                  <p className="about-lead">{p.about}</p>
                  {p.quote && <blockquote>“{p.quote}”</blockquote>}
                  <p className="profile-summary">{p.summary}</p>
                </>
              )}
              {aboutTab === 1 && (
                <div className="technology-groups">
                  {home.technologies.map((group) => (
                    <div key={group.category}>
                      <h3>{group.category}</h3>
                      <div>
                        {group.items.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {aboutTab === 2 && (
                <div className="credentials">
                  <h3>{t("section.certificates")}</h3>
                  {home.certificates.map((c) => (
                    <p key={c.title}>
                      {c.title} — {c.issuer}
                      {c.issuedOn && <time className="credential-date" dateTime={c.issuedOn}>{c.issuedOn}</time>}
                    </p>
                  ))}
                  <h3>{t("section.education")}</h3>
                  {home.education.map((e) => (
                    <p key={e.degree}>
                      {e.degree} — {e.institution}
                    </p>
                  ))}
                  <h3>{t("section.languages")}</h3>
                  {home.languages.map((l) => (
                    <p key={l.name}>
                      {l.name} — {l.level}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {chapter === 4 && (
          <div className="contact-content">
            <div className="contact-intro">
              <p className="section-kicker">04 / {t("section.contact")}</p>
              <div className="contact-art-space" aria-hidden="true"><span>04 — 05</span></div>
              <h2 className="contact-title">
                {copy("Let’s start", "لنتحدث")}
                <br />
                <em>{copy("a conversation.", "عن فكرتك.")}</em>
              </h2>
              <p className="contact-lead">{copy("Have a project or an idea in mind? Send a note and I’ll get back to you.", "هل لديك مشروع أو فكرة؟ أرسل رسالة وسأعود إليك.")}</p>
              <div className="contact-bottom">
                <a className="contact-email" href={`mailto:${p.email}`}>{p.email}</a>
                <div className="social-links">
                  {home.hasCv && <a href={`/${home.lang}/cv`}>{t("hero.cv")} ↓</a>}
                  {p.linkedInUrl && <a href={p.linkedInUrl} rel="me noopener noreferrer" target="_blank">LinkedIn ↗</a>}
                  {p.gitHubUrl && <a href={p.gitHubUrl} rel="me noopener noreferrer" target="_blank">GitHub ↗</a>}
                </div>
              </div>
            </div>
            <ContactForm lang={home.lang} />
          </div>
        )}
      </section>
      <aside
        className="chapter-index"
        aria-label={copy("Choose a chapter", "اختر فصلاً")}
      >
        {labels.map((label, i) => (
          <button
            key={label}
            onClick={() => go(i)}
            aria-current={i === chapter ? "step" : undefined}
            aria-label={`${String(i + 1).padStart(2, "0")} ${label}`}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <i />
          </button>
        ))}
      </aside>
      <footer className="stage-footer">
        <div className="chapter-name">
          <b>{String(chapter + 1).padStart(2, "0")}</b>
          <span>/ 05</span>
          <span className="current-label">{labels[chapter]}</span>
        </div>
        <div className="stage-controls">
          <button
            onClick={() => go(chapter - 1)}
            disabled={chapter === 0}
            aria-label={copy("Previous chapter", "الفصل السابق")}
          >
            ↑
          </button>
          <span>{copy("SCROLL TO EXPLORE", "مرّر للاستكشاف")}</span>
          <button
            onClick={() => go(chapter + 1)}
            disabled={chapter === 4}
            aria-label={copy("Next chapter", "الفصل التالي")}
          >
            ↓
          </button>
        </div>
        <button
          className="motion-toggle"
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? "▶" : "Ⅱ"}{" "}
          {paused
            ? copy("Play motion", "تشغيل الحركة")
            : copy("Pause motion", "إيقاف الحركة")}
        </button>
      </footer>
      <div className="sr-only" aria-live="polite">
        {labels[chapter]}
      </div>
    </div>
  );
}

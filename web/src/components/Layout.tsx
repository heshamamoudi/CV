import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import type { Lang } from "../types";
import { useStrings } from "../i18n/useStrings";
import { otherLang, twinPath } from "../paths";
import { BrandMark } from "./BrandMark";
import { IntroContext } from "./IntroContext";

let introShown = false;
export function Layout({
  lang,
  children,
  name,
}: {
  lang: Lang;
  children: ReactNode;
  name?: string;
}) {
  const t = useStrings(lang),
    { pathname, hash } = useLocation();
  const displayName = name ?? (lang === 'ar' ? 'هشام العمودي' : 'Hesham Amoudi');
  const [firstName, ...familyName] = displayName.trim().split(/\s+/);
  const isHome = new RegExp(
    `^/${lang}(?:/(?:journey|projects(?:/[^/]+)?))?/?$`,
  ).test(pathname);
  const entryRoute = useRef(pathname + hash);
  const overlay = useRef<HTMLDivElement>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout>>();
  const [splash, setSplash] = useState(() => !introShown && /^\/(en|ar)\/?$/.test(pathname) && (!hash || hash === '#intro') && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    [menu, setMenu] = useState(false);
  const dismiss = useCallback(() => {
    introShown = true;
    setSplash(false);
  }, []);
  const progress = useCallback((value: number) => {
    // Once a real scene is rendering, let it finish even on a slower device.
    clearTimeout(watchdog.current);
    if (!overlay.current) return;
    overlay.current.style.setProperty('--intro-reveal', String(Math.max(0, Math.min(1, (value - .73) / .23))));
    overlay.current.style.setProperty('--intro-progress', String(value));
    overlay.current.dataset.step = value < .25 ? 'complexity' : value < .72 ? 'clarity' : 'arrival';
  }, []);
  const intro = useMemo(() => ({ active: splash, finish: dismiss, progress }), [splash, dismiss, progress]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.classList.toggle("immersive", isHome);
    return () => document.documentElement.classList.remove("immersive");
  }, [lang, isHome]);
  useEffect(() => {
    if (!splash) return;
    // The sculpture owns the animation clock. This only releases a failed/slow WebGL load.
    watchdog.current = setTimeout(dismiss, 6500);
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const reduce = () => { if (media?.matches) dismiss(); };
    media?.addEventListener('change', reduce);
    return () => { clearTimeout(watchdog.current); media?.removeEventListener('change', reduce); };
  }, [splash, dismiss]);
  const hadSplash = useRef(splash);
  useEffect(() => {
    if(hadSplash.current && !splash) document.getElementById('main-content')?.focus({preventScroll:true});
    hadSplash.current=splash;
  }, [splash]);
  useEffect(() => { if (entryRoute.current !== pathname + hash) dismiss(); }, [pathname, hash, dismiss]);
  useEffect(() => setMenu(false), [pathname, hash]);
  return (
    <IntroContext.Provider value={intro}>
      {splash && (
        <div
          className="identity-intro"
          ref={overlay}
          data-step="complexity"
          data-splash
          role="dialog"
          aria-modal="true"
          aria-label={lang === "ar" ? "مرحباً" : "Welcome"}
          onKeyDown={event => {
            if(event.key==='Escape') dismiss();
            if(event.key==='Tab') { event.preventDefault(); overlay.current?.querySelector('button')?.focus(); }
          }}
        >
          <div className="intro-brand"><BrandMark /><span>{displayName}</span></div>
          <div className="intro-statement"><p className="intro-overline">{lang === 'ar' ? 'فكرة واحدة. احتمالات متعددة.' : 'ONE IDEA. MANY POSSIBILITIES.'}</p><h2>{lang === 'ar' ? <>من التعقيد<br /><em>إلى الوضوح.</em></> : <>Complexity,<br /><em>made clear.</em></>}</h2><p className="intro-sequence"><span>01 / {lang === 'ar' ? 'فهم التعقيد' : 'UNTANGLE'}</span><span>02 / {lang === 'ar' ? 'بناء الوضوح' : 'BUILD CLARITY'}</span></p></div>
          <div className="intro-bottom" aria-hidden="true"><span>{lang === 'ar' ? 'أنظمة مترابطة. نتائج واضحة.' : 'CONNECTED SYSTEMS. CLEAR OUTCOMES.'}</span><div className="intro-progress-track"><i /></div><span>HA / 01</span></div>
          <button className="intro-skip" onClick={dismiss} autoFocus>
            {lang === "ar" ? "تخطّ المقدمة ↖" : "Skip intro ↗"}
          </button>
        </div>
      )}
      <div
        {...(splash ? { inert: "" } : {})}
        className={isHome ? "home-shell" : "document-shell"}
      >
        <a className="skip-link" href="#main-content">
          {lang === "ar" ? "تخطّ إلى المحتوى" : "Skip to content"}
        </a>
        <header className="site-header">
          <Link
            className="wordmark"
            to={`/${lang}`}
            aria-label={
              `${displayName} — ${lang === 'ar' ? 'الرئيسية' : 'Home'}`
            }
          >
            <BrandMark />
            <span className="brand-name">
              {firstName}<br />{familyName.join(' ')}
            </span>
          </Link>
          <nav
            className={menu ? "main-nav open" : "main-nav"}
            aria-label={lang === "ar" ? "التنقل الرئيسي" : "Main navigation"}
          >
            <Link to={`/${lang}#work`}>{t("nav.projects")}</Link>
            <Link to={`/${lang}#journey`}>{t("nav.journey")}</Link>
            <Link to={`/${lang}#about`}>{t("nav.about")}</Link>
            <Link to={`/${lang}#contact`}>
              {t("nav.contact")} <span>↗</span>
            </Link>
          </nav>
          <div className="header-end">
            <Link
              className="language-switch"
              to={`${twinPath(pathname.replace(/\/$/, ""), lang)}${hash}`}
              hrefLang={otherLang(lang)}
            >
              {t("language.other")}
            </Link>
            <button
              className="menu-toggle"
              aria-expanded={menu}
              aria-label={lang === "ar" ? "القائمة" : "Menu"}
              onClick={() => setMenu(!menu)}
            >
              {menu ? "×" : "☰"}
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        {!isHome && (
          <footer className="document-footer">
            <Link to={`/${lang}`}>
              {lang === "ar" ? "العودة إلى التجربة" : "Back to the experience"}{" "}
              ↗
            </Link>
            <BrandMark />
          </footer>
        )}
      </div>
    </IntroContext.Provider>
  );
}

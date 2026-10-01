import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import type { Lang } from "../types";
import { useStrings } from "../i18n/useStrings";
import { otherLang, twinPath } from "../paths";
import { BrandMark } from "./BrandMark";

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
  const [splash, setSplash] = useState(!introShown),
    [menu, setMenu] = useState(false);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.classList.toggle("immersive", isHome);
    return () => document.documentElement.classList.remove("immersive");
  }, [lang, isHome]);
  useEffect(() => {
    if (!splash) return;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = setTimeout(
      () => {
        introShown = true;
        setSplash(false);
      },
      reduce ? 150 : 1500,
    );
    return () => clearTimeout(timer);
  }, [splash]);
  useEffect(() => setMenu(false), [pathname, hash]);
  const dismiss = () => {
    introShown = true;
    setSplash(false);
  };
  return (
    <>
      {splash && (
        <div
          className="scatter-intro refined-intro"
          data-splash
          role="dialog"
          aria-modal="true"
          aria-label={lang === "ar" ? "مرحباً" : "Welcome"}
        >
          <div className="scatter-panels" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <div className="scatter-identity">
            <BrandMark />
            <span>{displayName}</span>
          </div>
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
    </>
  );
}

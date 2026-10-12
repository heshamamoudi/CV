import { useEffect, useId, useRef, useState } from "react";
import type { Lang } from "../types";
import "./analytics-consent.css";

export type AnalyticsConsentChoice = "accepted" | "rejected";
type SavedConsent = { choice: AnalyticsConsentChoice; expiresAt: number };
export const ANALYTICS_CONSENT_STORAGE_KEY = "ha.analytics-consent.v1";

function readSavedConsent(): SavedConsent | null {
  try {
    const raw = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return null;
    const { choice, expiresAt } = saved as Partial<SavedConsent>;
    if ((choice !== "accepted" && choice !== "rejected") ||
      typeof expiresAt !== "number" || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return { choice, expiresAt };
  } catch {
    // Restricted storage means there is no persisted permission to use analytics.
    return null;
  }
}

/** A missing, unreadable, or expired choice never grants analytics permission. */
export function readAnalyticsConsent(): AnalyticsConsentChoice | null {
  return readSavedConsent()?.choice ?? null;
}

type Props = {
  lang: Lang;
  className?: string;
  /** Called on mount, a decision, a cross-tab update, or expiry. null revokes permission. */
  onConsentChange: (choice: AnalyticsConsentChoice | null) => void;
};

export function AnalyticsConsent({ lang, onConsentChange, className }: Props) {
  const [saved, setSaved] = useState<SavedConsent | null>(readSavedConsent);
  const [open, setOpen] = useState(() => readAnalyticsConsent() === null);
  const [storageFailed, setStorageFailed] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusOnOpen = useRef(false);
  const callback = useRef(onConsentChange);
  const id = useId();
  const choice = saved?.choice ?? null;
  const ar = lang === "ar";
  const text = (en: string, arabic: string) => ar ? arabic : en;

  useEffect(() => { callback.current = onConsentChange; }, [onConsentChange]);
  useEffect(() => { callback.current(choice); }, [choice]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== null && event.key !== ANALYTICS_CONSENT_STORAGE_KEY) return;
      const next = readSavedConsent();
      setSaved(next);
      setStorageFailed(false);
      setOpen(next === null);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    if (!saved) return;
    let timer: ReturnType<typeof setTimeout>;
    const checkExpiry = () => {
      const remaining = saved.expiresAt - Date.now();
      if (remaining <= 0) {
        setSaved(null);
        setOpen(true);
      } else {
        // Browser timers are limited to a signed 32-bit delay.
        timer = setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647));
      }
    };
    const onFocus = () => { clearTimeout(timer); checkExpiry(); };
    checkExpiry();
    window.addEventListener("focus", onFocus);
    return () => { clearTimeout(timer); window.removeEventListener("focus", onFocus); };
  }, [saved]);

  useEffect(() => {
    if (open && focusOnOpen.current) {
      heading.current?.focus();
      focusOnOpen.current = false;
    }
  }, [open]);

  function decide(nextChoice: AnalyticsConsentChoice) {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const next = { choice: nextChoice, expiresAt: expiry.getTime() };
    let failed = false;
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify(next));
    } catch { failed = true; }
    setStorageFailed(failed);
    setSaved(next);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  function close() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  return (
    <div className={`analytics-consent${className ? ` ${className}` : ""}`} lang={lang} dir={ar ? "rtl" : "ltr"}>
      <button
        ref={trigger}
        type="button"
        className="analytics-consent-settings"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => { focusOnOpen.current = true; setOpen(true); if (open) heading.current?.focus(); }}
      >
        {text("Analytics settings", "إعدادات التحليلات")}
      </button>
      <span className="sr-only" role="status">
        {storageFailed && text(
          "Your choice applies to this visit. Your browser could not save it for future visits.",
          "يسري اختيارك على هذه الزيارة. تعذّر على متصفحك حفظه للزيارات القادمة.",
        )}
      </span>
      {open && (
        <section
          id={id}
          className="analytics-consent-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-description`}
          onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}
        >
          <div className="analytics-consent-topline">
            <span>{text("YOUR PRIVACY", "خصوصيتك")}</span>
            <button type="button" className="analytics-consent-close" onClick={close}>
              {text("Close", "إغلاق")}
            </button>
          </div>
          <h2 id={`${id}-title`} ref={heading} tabIndex={-1}>
            {text("A choice, before analytics.", "الاختيار لك، قبل التحليلات.")}
          </h2>
          <p id={`${id}-description`}>
            {text(
              "With your permission, Google Analytics helps me understand how visitors use this portfolio. Optional analytics stay off until you accept.",
              "بإذنك، تساعدني تحليلات Google على فهم كيفية استخدام الزوار لهذا الموقع. تظل التحليلات الاختيارية معطّلة حتى توافق.",
            )}
          </p>
          {choice && (
            <p className="analytics-consent-current">
              {choice === "accepted"
                ? text("Current choice: analytics accepted", "اختيارك الحالي: السماح بالتحليلات")
                : text("Current choice: optional analytics rejected", "اختيارك الحالي: رفض التحليلات الاختيارية")}
            </p>
          )}
          <div className="analytics-consent-actions">
            <button type="button" onClick={() => decide("accepted")}>
              {text("Accept analytics", "السماح بالتحليلات")}
            </button>
            <button type="button" onClick={() => decide("rejected")}>
              {text("Reject optional analytics", "رفض التحليلات الاختيارية")}
            </button>
          </div>
          <p className="analytics-consent-note">
            {text(
              "Your choice is saved for 12 months. Change it any time in Analytics settings.",
              "يُحفظ اختيارك لمدة 12 شهرًا. يمكنك تغييره في أي وقت من إعدادات التحليلات.",
            )}
          </p>
        </section>
      )}
    </div>
  );
}

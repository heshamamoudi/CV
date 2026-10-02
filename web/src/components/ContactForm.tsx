import { useRef, useState, type FormEvent } from "react";
import type { Lang } from "../types";
import { BrandMark } from "./BrandMark";

type ContactField = "name" | "email" | "subject" | "message";
type ContactValues = Record<ContactField, string>;
type Props = { lang: Lang };

const emptyValues: ContactValues = { name: "", email: "", subject: "", message: "" };
const copy = (lang: Lang, en: string, ar: string) => lang === "ar" ? ar : en;
const newRequestId = () => {
  const secureCrypto: Crypto | undefined = typeof crypto === "undefined" ? undefined : crypto;
  if (typeof secureCrypto?.randomUUID === "function") return secureCrypto.randomUUID();
  if (typeof secureCrypto?.getRandomValues === "function") {
    const bytes = secureCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error("Secure random IDs are unavailable");
};

export function ContactForm({ lang }: Props) {
  const [values, setValues] = useState<ContactValues>(emptyValues);
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [sent, setSent] = useState(false);
  const request = useRef<{ id: string; payload: string } | null>(null);
  const [website, setWebsite] = useState("");
  const update = (field: ContactField, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setNotice("");
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    setErrors({});
    setNotice("");
    busyRef.current = true;
    setBusy(true);
    try {
      const draft = JSON.stringify({ ...values, lang, website });
      if (request.current?.payload !== draft) request.current = { id: newRequestId(), payload: draft };
      const id = request.current.id;
      const response = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: id,
          ...values,
          lang,
          website,
        }),
      });
      if (response.ok) {
        setValues(emptyValues);
        setWebsite("");
        request.current = null;
        setSent(true);
        return;
      }
      const body = await response.json().catch(() => ({})) as {
        errors?: Partial<Record<ContactField, string | string[]>>;
        retryAfter?: number | string;
      };
      const serverErrors: Partial<Record<ContactField, string>> = {};
      for (const field of ["name", "email", "subject", "message"] as const) {
        const message = body.errors?.[field];
        if (message) serverErrors[field] = Array.isArray(message) ? message[0] : message;
      }
      setErrors(serverErrors);
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") ?? body.retryAfter;
        const retry = retryAfter ? ` (${retryAfter})` : "";
        setNotice(copy(lang, `Please wait before sending another message${retry}.`, `يرجى الانتظار قبل إرسال رسالة أخرى${retry}.`));
      } else if (!Object.keys(serverErrors).length) {
        setNotice(copy(lang, "Your message could not be sent. Please try again.", "تعذر إرسال رسالتك. حاول مرة أخرى."));
      }
    } catch {
      setNotice(copy(lang, "Connection problem. Your message is still here; please try again.", "حدثت مشكلة في الاتصال. رسالتك محفوظة هنا، حاول مرة أخرى."));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const fields: { name: ContactField; en: string; ar: string; max: number }[] = [
    { name: "name", en: "Name", ar: "الاسم", max: 120 },
    { name: "email", en: "Email", ar: "البريد الإلكتروني", max: 200 },
    { name: "subject", en: "Subject", ar: "الموضوع", max: 160 },
    { name: "message", en: "Message", ar: "الرسالة", max: 4000 },
  ];

  if (sent) return (
    <div className="contact-form contact-receipt" role="status">
      <BrandMark />
      <h3>{copy(lang, "Message received.", "وصلت الرسالة.")}</h3>
      <p>{copy(lang, "Thank you for reaching out.", "شكراً لتواصلك.")}</p>
      <button type="button" onClick={() => { setSent(false); setNotice(""); }}>
        {copy(lang, "Send another message", "إرسال رسالة أخرى")} <span aria-hidden="true">↗</span>
      </button>
    </div>
  );

  return (
    <form className="contact-form" data-contact-form data-scroll-region onSubmit={submit}>
      <h3>{copy(lang, "Send a message", "أرسل رسالة")}</h3>
      <p className="form-caption">{copy(lang, "01 / Your details", "01 / بياناتك")}</p>
      <div className="contact-fields">
        {fields.map(({ name, en, ar, max }) => {
          const label = copy(lang, en, ar);
          const id = `contact-${name}`;
          const errorId = `${id}-error`;
          return (
            <div className={`contact-field contact-field-${name}`} key={name}>
              <label htmlFor={id}>{label}</label>
              {name === "message" ? (
                <textarea id={id} name={name} required maxLength={max} rows={3} disabled={busy} value={values[name]} onChange={(e) => update(name, e.target.value)} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? errorId : undefined} />
              ) : (
                <input id={id} name={name} type={name === "email" ? "email" : "text"} autoComplete={name === "name" ? "name" : name === "email" ? "email" : undefined} dir={name === "email" ? "ltr" : undefined} required maxLength={max} disabled={busy} value={values[name]} onChange={(e) => update(name, e.target.value)} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? errorId : undefined} />
              )}
              {errors[name] && <span className="contact-field-error" id={errorId}>{errors[name]}</span>}
            </div>
          );
        })}
      </div>
      <div className="contact-honey" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" disabled={busy} value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <p className="contact-privacy-note">{copy(lang, "Your details are used only to reply to your message.", "تُستخدم بياناتك للرد على رسالتك فقط.")}</p>
      <div className="contact-submit-row">
        <button type="submit" disabled={busy}>{busy ? copy(lang, "Sending…", "جارٍ الإرسال…") : copy(lang, "Send message", "إرسال الرسالة")}<span aria-hidden="true">↗</span></button>
        <p className="contact-notice" role="status" aria-live="polite">{notice}</p>
      </div>
    </form>
  );
}

import type { ChangeEvent, ReactNode } from 'react';

export interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/** A label, a control, and the server's own words when it refused the value. */
export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <p className="admin-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? (
        <span className="admin-hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="admin-error" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </p>
  );
}

interface ControlProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  dir?: 'ltr' | 'rtl';
  lang?: string;
  maxLength?: number;
  placeholder?: string;
}

const describedBy = (id: string, error?: string, hint?: string) =>
  [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

export function TextInput({ id, label, value, onChange, error, hint, dir, lang, maxLength, placeholder }: ControlProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        value={value}
        dir={dir}
        lang={lang}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextArea({ id, label, value, onChange, error, hint, dir, lang, maxLength, rows = 4 }: ControlProps & { rows?: number }) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        value={value}
        dir={dir}
        lang={lang}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function NumberInput({
  id, label, value, onChange, error, hint, min, max,
}: { id: string; label: string; value: number; onChange: (value: number) => void; error?: string; hint?: string; min?: number; max?: number }) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </Field>
  );
}

/** A date as the API wants it: yyyy-MM-dd, or empty for "no date". */
export function DateInput({ id, label, value, onChange, error, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; error?: string; hint?: string }) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        type="date"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        onChange={e => onChange(e.target.value)}
      />
    </Field>
  );
}

export function Toggle({ id, label, checked, onChange, hint }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void; hint?: string }) {
  return (
    <p className="admin-toggle">
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} aria-describedby={hint ? `${id}-hint` : undefined} />
      <label htmlFor={id}>{label}</label>
      {hint ? (
        <span className="admin-hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </p>
  );
}

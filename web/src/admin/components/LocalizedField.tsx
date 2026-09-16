import { TextArea, TextInput } from './Field';
import { useAdminLang } from '../useAdminLang';
import type { LocalizedText } from '../types';

export interface LocalizedFieldProps {
  /** The API's field name, e.g. "headline" - errors arrive as "headline.en" / "headline.ar". */
  name: string;
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  error?: (field: string) => string | undefined;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  hint?: string;
}

/**
 * Both languages, side by side and always visible. Editing one language while
 * the other is out of sight is how a site ends up half-translated.
 */
export function LocalizedField({ name, label, value, onChange, error, multiline, rows, maxLength, hint }: LocalizedFieldProps) {
  const { t } = useAdminLang();
  const Control = multiline ? TextArea : TextInput;

  return (
    <fieldset className="admin-localized">
      <legend>{label}</legend>
      {hint ? <span className="admin-hint">{hint}</span> : null}
      <div className="admin-grid">
        <Control
          id={`${name}-en`}
          label={t('field.english')}
          value={value?.en ?? ''}
          dir="ltr"
          lang="en"
          rows={rows}
          maxLength={maxLength}
          error={error?.(`${name}.en`)}
          onChange={(next: string) => onChange({ en: next, ar: value?.ar ?? '' })}
        />
        <Control
          id={`${name}-ar`}
          label={t('field.arabic')}
          value={value?.ar ?? ''}
          dir="rtl"
          lang="ar"
          rows={rows}
          maxLength={maxLength}
          error={error?.(`${name}.ar`)}
          onChange={(next: string) => onChange({ en: value?.en ?? '', ar: next })}
        />
      </div>
    </fieldset>
  );
}

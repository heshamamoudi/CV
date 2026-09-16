import { useAdminLang } from '../useAdminLang';

export interface MediaPickerProps {
  label: string;
  /** The chosen image's id, or null for none. */
  value: string | null;
  onChange: (id: string | null) => void;
}

export function MediaPicker({ label, value, onChange }: MediaPickerProps) {
  const { t } = useAdminLang();
  return (
    <p className="admin-field">
      <span className="admin-label">{label}</span>
      <span>{value ? value : t('field.none')}</span>
      <button type="button" onClick={() => onChange(null)} disabled={!value}>
        {t('action.clear')}
      </button>
    </p>
  );
}

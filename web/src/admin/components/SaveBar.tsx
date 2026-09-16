import { useAdminLang } from '../useAdminLang';

export interface SaveBarProps {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  /** Anything the server said that does not belong to one field. */
  error?: string;
  onSave: () => void;
  onReset: () => void;
}

export function SaveBar({ dirty, saving, saved, error, onSave, onReset }: SaveBarProps) {
  const { t } = useAdminLang();
  const state = saving ? t('state.saving') : dirty ? t('state.unsaved') : saved ? t('state.saved') : t('state.clean');

  return (
    <div className="admin-savebar">
      <button type="button" onClick={onSave} disabled={!dirty || saving}>
        {t('action.save')}
      </button>
      <button type="button" onClick={onReset} disabled={!dirty || saving}>
        {t('action.reset')}
      </button>
      <span className={saved && !dirty ? 'admin-ok' : undefined} role="status" aria-live="polite">
        {state}
      </span>
      {error ? (
        <span className="admin-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

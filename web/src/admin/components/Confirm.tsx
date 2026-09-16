import { useState } from 'react';
import { useAdminLang } from '../useAdminLang';

export interface ConfirmProps {
  /** Names the thing being deleted, so the owner sees what they are about to lose. */
  question: string;
  confirmLabel?: string;
  triggerLabel: string;
  onConfirm: () => void;
}

/** In-page confirmation. window.confirm cannot be styled, translated, or tested. */
export function Confirm({ question, confirmLabel, triggerLabel, onConfirm }: ConfirmProps) {
  const { t } = useAdminLang();
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)}>
        {triggerLabel}
      </button>
    );
  }

  return (
    <span className="admin-confirm" role="group" aria-label={question}>
      <span>{question}</span>
      <button
        type="button"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel ?? t('action.delete')}
      </button>
      <button type="button" onClick={() => setAsking(false)}>
        {t('action.cancel')}
      </button>
    </span>
  );
}

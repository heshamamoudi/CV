import { useAdminLang } from '../useAdminLang';

export function MediaScreen() {
  const { t } = useAdminLang();
  return (
    <section>
      <h1>{t('nav.media')}</h1>
      <p>{t('state.loading')}</p>
    </section>
  );
}

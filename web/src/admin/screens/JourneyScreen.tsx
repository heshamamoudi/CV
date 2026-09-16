import { useAdminLang } from '../useAdminLang';

export function JourneyScreen() {
  const { t } = useAdminLang();
  return (
    <section>
      <h1>{t('nav.journey')}</h1>
      <p>{t('state.loading')}</p>
    </section>
  );
}

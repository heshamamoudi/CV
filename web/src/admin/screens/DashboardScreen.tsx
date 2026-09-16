import { useAdminLang } from '../useAdminLang';

export function DashboardScreen() {
  const { t } = useAdminLang();
  return (
    <section>
      <h1>{t('nav.dashboard')}</h1>
      <p>{t('state.loading')}</p>
    </section>
  );
}

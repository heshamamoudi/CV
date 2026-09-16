import { useAdminLang } from '../useAdminLang';

export function ProfileScreen() {
  const { t } = useAdminLang();
  return (
    <section>
      <h1>{t('nav.profile')}</h1>
      <p>{t('state.loading')}</p>
    </section>
  );
}

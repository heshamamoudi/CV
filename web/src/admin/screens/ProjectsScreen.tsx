import { useAdminLang } from '../useAdminLang';

export function ProjectsScreen() {
  const { t } = useAdminLang();
  return (
    <section>
      <h1>{t('nav.projects')}</h1>
      <p>{t('state.loading')}</p>
    </section>
  );
}

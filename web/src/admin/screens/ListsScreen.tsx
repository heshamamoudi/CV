import { useAdminLang } from '../useAdminLang';

export function ListsScreen() {
  const { t } = useAdminLang();
  return (
    <section>
      <h1>{t('nav.lists')}</h1>
      <p>{t('state.loading')}</p>
    </section>
  );
}

import { useAdminLang } from '../useAdminLang';

export function SeoScreen() {
  const { t } = useAdminLang();
  return (
    <section>
      <h1>{t('nav.seo')}</h1>
      <p>{t('state.loading')}</p>
    </section>
  );
}

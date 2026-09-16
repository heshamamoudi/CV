import { useAdminLang } from '../useAdminLang';

export function CvScreen() {
  const { t } = useAdminLang();
  return (
    <section>
      <h1>{t('nav.cv')}</h1>
      <p>{t('state.loading')}</p>
    </section>
  );
}

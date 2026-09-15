import { Link } from 'react-router-dom';
import type { Lang } from '../types';
import { useStrings } from '../i18n/useStrings';

export function NotFoundPage({ lang }: { lang: Lang }) {
  const t = useStrings(lang);
  return (<><h1>{t('notFound.title')}</h1><p><Link to={`/${lang}`}>{t('notFound.back')}</Link></p></>);
}

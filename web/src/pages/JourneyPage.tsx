import type { HomeData } from '../types';
import { useStrings } from '../i18n/useStrings';
import { JourneyList } from '../components/JourneyList';

export function JourneyPage({ home }: { home: HomeData }) {
  const t = useStrings(home.lang);
  return (<><h1>{t('page.journey')}</h1><JourneyList journey={home.journey} lang={home.lang} /></>);
}

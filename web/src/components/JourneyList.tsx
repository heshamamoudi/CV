import type { JourneyDto, Lang } from '../types';
import { useStrings } from '../i18n/useStrings';

export function JourneyList({ journey, lang }: { journey: JourneyDto[]; lang: Lang }) {
  const t = useStrings(lang);
  return (
    <ol className="journey">
      {journey.map(j => (
        <li key={j.id}>
          <article>
            <h3>{j.title}</h3>
            <p>{j.organisation}</p>
            <p>
              <time dateTime={j.start}>{j.start}</time> – {j.end ? <time dateTime={j.end}>{j.end}</time> : t('journey.present')}
            </p>
            <ul>{j.highlights.map(h => <li key={h}>{h}</li>)}</ul>
          </article>
        </li>
      ))}
    </ol>
  );
}

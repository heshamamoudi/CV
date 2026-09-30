import type { HomeData } from '../types';

/** Decorative tiles use only published content, including the first and latest career years. */
export function sculptureLabels(journey: HomeData['journey'], technologies: HomeData['technologies']) {
  const years = [...new Set(journey.map(role => role.start.slice(0, 4)).filter(year => /^\d{4}$/.test(year)))].sort();
  const skills = [...new Set(technologies.flatMap(group => group.items))];
  const sampled = Array.from({ length: 4 }, (_, i) => years.length ? years[Math.round(i * (years.length - 1) / 3)] : '·');
  const tech = Array.from({ length: 4 }, (_, i) => skills[i] ?? '·');
  return [tech, ['01', '02', '03', '↗'], sampled, tech, ['Hi', '↗', 'أهلاً', ':)']];
}

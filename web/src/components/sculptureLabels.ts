import type { HomeData } from '../types';

/** Every published role gets its own point, even when roles share a year. */
export const careerMilestonePoint = (index: number, roles: HomeData['journey']) => {
  if (roles.length <= 1) return 0.5;
  const chronological = roles.map((role, i) => ({ start: role.start, i }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.i - b.i);
  const rank = chronological.findIndex(role => role.i === index);
  return 0.07 + Math.max(0, rank) * 0.86 / (roles.length - 1);
};

/** Decorative tiles use only published content, including the first and latest career years. */
export function sculptureLabels(journey: HomeData['journey'], technologies: HomeData['technologies']) {
  const years = [...new Set(journey.map(role => role.start.slice(0, 4)).filter(year => /^\d{4}$/.test(year)))].sort();
  const skills = [...new Set(technologies.flatMap(group => group.items))];
  const sampled = years.length > 4
    ? Array.from({ length: 4 }, (_, i) => years[Math.round(i * (years.length - 1) / 3)])
    : Array.from({ length: 4 }, (_, i) => years[i] ?? '·');
  const tech = Array.from({ length: 4 }, (_, i) => skills[i] ?? '·');
  return [tech, ['01', '02', '03', '↗'], sampled, tech, ['Hi', '↗', 'أهلاً', ':)']];
}

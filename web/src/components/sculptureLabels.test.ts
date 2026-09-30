import { sculptureLabels } from './sculptureLabels';
import type { HomeData } from '../types';

it('takes milestone years only from published roles, including the earliest and latest', () => {
  const roles = ['2028-07', '2018-04', '2022-01', '2022-10', '2023-05'].map(start => ({ start })) as HomeData['journey'];
  const labels = sculptureLabels(roles, [{ category: 'Skills', items: ['Rust', 'React'] }]);
  expect(labels[2]).toEqual(['2018', '2022', '2023', '2028']);
  expect(labels[3]).toEqual(['Rust', 'React', '·', '·']);
});

it('does not invent dates or technologies when content is empty', () => {
  expect(sculptureLabels([], [])[2]).toEqual(['·', '·', '·', '·']);
});

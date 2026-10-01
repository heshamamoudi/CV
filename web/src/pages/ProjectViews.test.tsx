import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { HomeData, ProjectDto } from '../types';
import { ProjectPage } from './ProjectPage';
import { ProjectsPage } from './ProjectsPage';

vi.mock('../components/ArchiveFrame', () => ({ ArchiveFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const project: ProjectDto = {
  slug: 'sample', title: 'Sample project', summary: 'An actual summary', body: 'First paragraph.\n\nSecond paragraph.',
  technologies: ['.NET', 'PostgreSQL'], featured: true, availableInOtherLanguage: true,
  cover: { src: '/media/sample/1280.webp', srcSet: '/media/sample/640.webp 640w, /media/sample/1280.webp 1280w', width: 1280, height: 720, alt: 'Project interface' },
};

it('renders a project cover, featured state and technologies in the index and detail', () => {
  const home = { lang: 'en', projects: [project] } as HomeData;
  const index = render(<MemoryRouter><ProjectsPage home={home} /></MemoryRouter>);
  expect(screen.getByRole('img', { name: 'Project interface' })).toHaveAttribute('src', project.cover?.src);
  expect(screen.getByText('Featured')).toBeInTheDocument();
  expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
  index.unmount();
  render(<MemoryRouter initialEntries={['/en/projects/sample']}><ProjectPage project={project} /></MemoryRouter>);
  expect(screen.getByRole('img', { name: 'Project interface' })).toHaveAttribute('srcset', project.cover?.srcSet);
  expect(screen.getByText('First paragraph.')).toBeInTheDocument();
  expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
});

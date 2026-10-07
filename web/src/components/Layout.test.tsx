import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Layout } from './Layout';
import { useIntro } from './IntroContext';

beforeEach(() => {
  vi.spyOn(window,'matchMedia').mockReturnValue({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as MediaQueryList);
});
afterEach(() => { vi.useRealTimers();vi.restoreAllMocks(); });

it('opens directly on the requested content for reduced motion', () => {
  vi.spyOn(window,'matchMedia').mockReturnValue({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as MediaQueryList);
  render(<MemoryRouter initialEntries={['/en']}><Layout lang="en"><p>Content</p></Layout></MemoryRouter>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Content').closest('[inert]')).toBeNull();
});

it('preserves direct chapter links without starting an unrelated introduction', () => {
  render(<MemoryRouter initialEntries={['/en#journey']}><Layout lang="en"><p>Journey</p></Layout></MemoryRouter>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('lets a rendering scene finish, traps keyboard focus, and releases content on Escape', () => {
  vi.useFakeTimers();
  let control: ReturnType<typeof useIntro>;
  function Scene() { control=useIntro();return <p>Content</p>; }
  render(<MemoryRouter initialEntries={['/en']}><Layout lang="en"><Scene /></Layout></MemoryRouter>);
  const dialog=screen.getByRole('dialog',{name:'Welcome'});
  expect(screen.getByText('Content').closest('[inert]')).not.toBeNull();
  act(()=>control.progress(.2));
  act(()=>vi.advanceTimersByTime(8000));
  expect(dialog).toBeInTheDocument();
  fireEvent.keyDown(dialog,{key:'Tab',shiftKey:true});
  expect(screen.getByRole('button',{name:'Skip intro'})).toHaveFocus();
  fireEvent.keyDown(dialog,{key:'Escape'});
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveFocus();
  expect(screen.getByText('Content').closest('[inert]')).toBeNull();
});

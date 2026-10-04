import { createContext, useContext } from 'react';

export const INTRO_DURATION_MS = 3600;
export const IntroContext = createContext({
  active: false,
  finish: () => {},
  progress: (_value: number) => {},
});
export const useIntro = () => useContext(IntroContext);

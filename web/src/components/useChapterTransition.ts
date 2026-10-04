import { useEffect, useRef, useState } from "react";

export const CHAPTER_EXIT_MS = 160;
export const CHAPTER_TRAVEL_MS = 840;

/** Retain the outgoing composition until its short dissolve has finished. */
export function useChapterTransition(requested: number, immediate: boolean) {
  const [view, setView] = useState({ chapter: requested, phase: "idle" });
  const shown = useRef(requested);
  useEffect(() => {
    let settle: ReturnType<typeof setTimeout> | undefined;
    if (immediate || requested === shown.current) {
      shown.current = requested;
      setView({ chapter: requested, phase: "idle" });
      return;
    }
    setView(value => ({ ...value, phase: "exiting" }));
    const leave = setTimeout(() => {
      shown.current = requested;
      setView({ chapter: requested, phase: "entering" });
      settle = setTimeout(() => setView({ chapter: requested, phase: "idle" }), CHAPTER_TRAVEL_MS);
    }, CHAPTER_EXIT_MS);
    return () => { clearTimeout(leave); clearTimeout(settle); };
  }, [requested, immediate]);
  return view;
}

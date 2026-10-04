import { act, renderHook } from "@testing-library/react";
import { CHAPTER_EXIT_MS, CHAPTER_TRAVEL_MS, useChapterTransition } from "./useChapterTransition";

describe("chapter choreography", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it("retains the outgoing chapter, then brings content and sculpture into the same arrival", () => {
    const { result, rerender } = renderHook(({ chapter }) => useChapterTransition(chapter, false), { initialProps: { chapter: 0 } });
    rerender({ chapter: 2 });
    expect(result.current).toEqual({ chapter: 0, phase: "exiting" });
    act(() => vi.advanceTimersByTime(CHAPTER_EXIT_MS));
    expect(result.current).toEqual({ chapter: 2, phase: "entering" });
    act(() => vi.advanceTimersByTime(CHAPTER_TRAVEL_MS));
    expect(result.current).toEqual({ chapter: 2, phase: "idle" });
  });
  it("cancels stale navigation and honors the latest destination", () => {
    const { result, rerender } = renderHook(({ chapter }) => useChapterTransition(chapter, false), { initialProps: { chapter: 0 } });
    rerender({ chapter: 1 });
    act(() => vi.advanceTimersByTime(80));
    rerender({ chapter: 4 });
    act(() => vi.advanceTimersByTime(CHAPTER_EXIT_MS));
    expect(result.current).toEqual({ chapter: 4, phase: "entering" });
    act(() => vi.advanceTimersByTime(CHAPTER_TRAVEL_MS));
    expect(result.current).toEqual({ chapter: 4, phase: "idle" });
  });
  it("returns immediately to the visible chapter if a pending transition is canceled", () => {
    const { result, rerender } = renderHook(({ chapter }) => useChapterTransition(chapter, false), { initialProps: { chapter: 0 } });
    rerender({ chapter: 3 });
    rerender({ chapter: 0 });
    act(() => vi.advanceTimersByTime(CHAPTER_EXIT_MS + CHAPTER_TRAVEL_MS));
    expect(result.current).toEqual({ chapter: 0, phase: "idle" });
  });
  it("settles immediately when motion is paused mid-transition", () => {
    const { result, rerender } = renderHook(({ chapter, paused }) => useChapterTransition(chapter, paused), { initialProps: { chapter: 0, paused: false } });
    rerender({ chapter: 4, paused: false });
    rerender({ chapter: 4, paused: true });
    expect(result.current).toEqual({ chapter: 4, phase: "idle" });
    act(() => vi.runAllTimers());
    expect(result.current).toEqual({ chapter: 4, phase: "idle" });
  });
});

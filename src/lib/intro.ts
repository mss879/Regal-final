// The home-page intro (src/components/intro) covers the page for about four seconds on the
// first load of a session. Components with an entrance of their own wait for it through these
// helpers; when no intro is playing they all resolve straight away.

export const INTRO_ID = "rvl-intro";
export const INTRO_PLAYED_KEY = "rvl-intro-played";
export const INTRO_READY_EVENT = "rvl:intro-ready";
export const INTRO_EXIT_EVENT = "rvl:intro-exit";

/** True while the overlay covers the page, before it starts to dissolve. */
export function introPlaying(): boolean {
  if (typeof document === "undefined") return false;
  return document.getElementById(INTRO_ID)?.dataset.state === "play";
}

/** Resolves when the overlay starts to dissolve. */
export function introExit(): Promise<void> {
  return new Promise((resolve) => {
    if (!introPlaying()) resolve();
    else window.addEventListener(INTRO_EXIT_EVENT, () => resolve(), { once: true });
  });
}

/** Tells the overlay the hero is ready to be seen, then resolves when it starts to dissolve. */
export function introHandoff(): Promise<void> {
  if (!introPlaying()) return Promise.resolve();
  // Listen first: the overlay may dissolve as soon as it hears the hero is ready.
  const exit = introExit();
  window.dispatchEvent(new Event(INTRO_READY_EVENT));
  return exit;
}

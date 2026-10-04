// The request time for admin Server Components (they render per request, so reading the clock
// during render is intended here).
export const nowMs = () => Date.now();
export const nowIso = () => new Date().toISOString();

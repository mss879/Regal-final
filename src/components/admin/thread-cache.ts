// Conversation messages for the admin drawers, fetched from /admin/api/<kind>/<id>. The last
// copy of each conversation is kept in memory so reopening one shows it instantly.

export type ThreadKind = "chats";

const known = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
const key = (kind: ThreadKind, id: string) => `${kind}:${id}`;

export async function fetchThread<T>(kind: ThreadKind, id: string, query = ""): Promise<T & { ok: true }> {
  let res: Response;
  try {
    res = await fetch(`/admin/api/${kind}/${id}${query}`, { cache: "no-store", headers: { accept: "application/json" } });
  } catch {
    throw new Error("You seem to be offline. Retrying…");
  }
  // The proxy redirects signed-out requests to the sign-in page.
  if (res.redirected || res.status === 401) throw new Error("Your session has ended. Please reload and sign in again.");
  const data = (await res.json().catch(() => null)) as ({ ok: boolean; error?: string } & T) | null;
  if (!data?.ok) throw new Error(data?.error ?? "Couldn't load this conversation.");
  return data as T & { ok: true };
}

/** Starts loading a whole conversation (deduplicated for a few seconds) and remembers it. */
export function prefetchThread<T>(kind: ThreadKind, id: string): Promise<T & { ok: true }> {
  const k = key(kind, id);
  const running = inflight.get(k);
  if (running) return running as Promise<T & { ok: true }>;
  const p = fetchThread<T>(kind, id).then((data) => {
    known.set(k, data);
    return data;
  });
  inflight.set(k, p);
  p.then(
    () => window.setTimeout(() => inflight.delete(k), 5000),
    () => inflight.delete(k),
  );
  return p;
}

export const peekThread = <T,>(kind: ThreadKind, id: string) => known.get(key(kind, id)) as (T & { ok: true }) | undefined;
export const rememberThread = (kind: ThreadKind, id: string, data: unknown) => void known.set(key(kind, id), data);
export const forgetThread = (kind: ThreadKind, id: string) => void known.delete(key(kind, id));

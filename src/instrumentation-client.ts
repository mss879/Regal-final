// Cookieless page-view counter for the dashboard. Runs before the app hydrates and adds no
// component to any page. Sends one tiny beacon per page (not per hash change) to /api/track,
// which stores no IP and no cookie. Skipped entirely for the admin area, for staff browsers,
// and for visitors who send Global Privacy Control or Do Not Track.
const STAFF_KEY = "rvl-staff";
let lastPath = "";
let firstLoad = true;

function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl || navigator.doNotTrack === "1") return true;
  try {
    return Boolean(localStorage.getItem(STAFF_KEY));
  } catch {
    return false;
  }
}

function track(href: string) {
  const url = new URL(href, location.href);
  if (url.origin !== location.origin || url.pathname.startsWith("/admin") || url.pathname === lastPath || optedOut()) return;
  lastPath = url.pathname;
  const q = url.searchParams;
  const body = JSON.stringify({
    path: url.pathname,
    // Only the landing page has a meaningful referrer; later navigations are internal.
    referrer: firstLoad ? document.referrer : "",
    utm_source: q.get("utm_source") ?? "",
    utm_medium: q.get("utm_medium") ?? "",
    utm_campaign: q.get("utm_campaign") ?? "",
  });
  firstLoad = false;
  // A string body is sent as text/plain, which needs no CORS preflight.
  if (!navigator.sendBeacon?.("/api/track", body)) {
    fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
  }
}

function trackLanding() {
  const go = () => track(location.href);
  if ((document as Document & { prerendering?: boolean }).prerendering) {
    document.addEventListener("prerenderingchange", go, { once: true });
  } else if ("requestIdleCallback" in window) {
    requestIdleCallback(go, { timeout: 4000 });
  } else {
    setTimeout(go, 1500);
  }
}

trackLanding();

export function onRouterTransitionStart(url: string) {
  track(url);
}

import "server-only";

// Server-side configuration. Empty strings count as missing, so a blank .env.local behaves
// like an unconfigured project: the public site still works, /admin shows a setup screen
// and the enquiry form falls back gracefully (see contact/actions.ts).
const read = (key: string) => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

export const env = {
  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ?? read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseSecretKey: read("SUPABASE_SECRET_KEY") ?? read("SUPABASE_SERVICE_ROLE_KEY"),
  analyticsSalt: read("ANALYTICS_SALT"),
};

/** Names of required variables that are not set. */
export function missingEnv(): string[] {
  return [
    !env.supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !env.supabasePublishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    !env.supabaseSecretKey && "SUPABASE_SECRET_KEY",
    !env.analyticsSalt && "ANALYTICS_SALT",
  ].filter((v): v is string => Boolean(v));
}

/** True when the admin area can sign people in (URL + publishable key). */
export const authConfigured = () => Boolean(env.supabaseUrl && env.supabasePublishableKey);

/** True when the server can write enquiries and page views (URL + secret key + salt). */
export const writesConfigured = () => Boolean(env.supabaseUrl && env.supabaseSecretKey && env.analyticsSalt);

"use client";

// A script that runs while the HTML is parsed, before first paint (see the Next guide
// "Preventing flash before hydration"). On the client its type is text/plain, so React neither
// warns about it nor runs it again when the page is rendered after a soft navigation.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

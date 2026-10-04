// Structured data for search engines (schema.org). A native <script> per the Next.js JSON-LD
// guide; "<" is escaped so content can never close the tag. JSON-LD isn't executed, so the CSP
// doesn't apply to it.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const graph = { "@context": "https://schema.org", "@graph": Array.isArray(data) ? data : [data] };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
    />
  );
}

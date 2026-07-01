/**
 * Renders a JSON-LD structured-data block. Server-safe (no client JS needed).
 * Pass any schema.org object (or array of objects) as `data`.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is trusted, server-authored content (no user input).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Structured data for one page.
 *
 * The payload is built on the server from our own data, never from anything a
 * visitor typed, and JSON.stringify escapes it — but `<` is replaced anyway so
 * a stray "</script>" inside a description cannot close the tag early.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

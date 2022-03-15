export function getDocumentHeight(): number {
  if (typeof window === 'undefined') return 0;

  const { body } = document;
  const html = document.documentElement;

  return Math.max(body.scrollHeight, body.offsetHeight, html.offsetHeight);
}

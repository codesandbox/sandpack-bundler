export function getDocumentHeight() {
  const { body } = document;
  const html = document.documentElement;

  return Math.max(body.scrollHeight, body.offsetHeight, html.offsetHeight);
}

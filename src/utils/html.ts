export function getHTMLParts(html: string) {
  if (html.includes('<body>')) {
    const bodyMatcher = /<body.*>([\s\S]*)<\/body>/m;
    const headMatcher = /<head>([\s\S]*)<\/head>/m;

    const headMatch = html.match(headMatcher);
    const bodyMatch = html.match(bodyMatcher);
    const head = headMatch && headMatch[1] ? headMatch[1] : '';
    const body = bodyMatch && bodyMatch[1] ? bodyMatch[1] : html;

    return { body, head };
  }

  return { head: '', body: html };
}

export interface IHtmlHydrationState {
  head: string;
  body: string;
}

/**
 * TODO: Use a new iframe that contains the actual html and injects sandpack as a little script that runs in the correct order
 *
 * Example:
 * <html>
 *   <head>
 *     <script src="google.com/maps.js"></script>
 *   </head>
 *
 *   <body>
 *     <div id="root" />
 *
 *     <script>
 *       // Injected by sandpack - this ensures
 *       window.sandpack.evaluate();
 *     </script>
 *
 *     <script src="unpkg.com/jquery.min.js"></script>
 *   </body>
 * </html>
 */
export async function replaceHTML(html: string): Promise<IHtmlHydrationState> {
  const { head, body } = getHTMLParts(html);

  // We only replace the body for now
  document.body.innerHTML = body;

  return {
    head,
    body,
  };
}

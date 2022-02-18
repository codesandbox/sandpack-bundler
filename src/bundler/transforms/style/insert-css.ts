const wrapper = (id: string, css: string, hmrEnabled = false) => `
function createStyleNode(id, content) {
  var styleNode =
    document.getElementById(id) || document.createElement('style');

  styleNode.setAttribute('id', id);
  styleNode.type = 'text/css';
  if (styleNode.styleSheet) {
    styleNode.styleSheet.cssText = content;
  } else {
    styleNode.innerHTML = '';
    styleNode.appendChild(document.createTextNode(content));
  }
  document.head.appendChild(styleNode);
}

createStyleNode(
  ${JSON.stringify(id)},
  ${JSON.stringify(css)}
);

${hmrEnabled ? "module.hot.accept()" : ""}
`;

export function insertCss(
  id: string,
  css?: string,
  hmrEnabled?: boolean
) {
  const result = wrapper(id, css || "", hmrEnabled);
  return result;
}

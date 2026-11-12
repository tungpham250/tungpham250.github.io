/** Text-only DOM creation keeps source data out of HTML parsing. */
export function node(tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function isWhitespace(value: string | undefined): boolean {
  return (
    value === ' ' || value === '\t' || value === '\n' || value === '\r' || value === '\f'
  );
}

function isTagBoundary(value: string | undefined): boolean {
  return value === undefined || value === '>' || value === '/' || isWhitespace(value);
}

function findTagEnd(html: string, start: number): number {
  let quote: string | undefined;
  for (let index = start; index < html.length; index += 1) {
    const value = html[index];
    if (quote) {
      if (value === quote) quote = undefined;
      continue;
    }
    if (value === '"' || value === "'") {
      quote = value;
      continue;
    }
    if (value === '>') return index;
  }
  return -1;
}

function findScriptStart(html: string, start: number): number {
  const lowerHtml = html.toLowerCase();
  let index = lowerHtml.indexOf('<script', start);
  while (index >= 0) {
    if (isTagBoundary(html[index + 7])) return index;
    index = lowerHtml.indexOf('<script', index + 1);
  }
  return -1;
}

function findScriptEnd(html: string, start: number): number {
  const lowerHtml = html.toLowerCase();
  let index = lowerHtml.indexOf('</script', start);
  while (index >= 0) {
    if (isTagBoundary(html[index + 8])) {
      const end = findTagEnd(html, index);
      return end < 0 ? html.length : end + 1;
    }
    index = lowerHtml.indexOf('</script', index + 1);
  }
  return -1;
}

export function removeScriptElements(html: string): string {
  let output = '';
  let cursor = 0;
  while (cursor < html.length) {
    const start = findScriptStart(html, cursor);
    if (start < 0) return output + html.slice(cursor);
    output += html.slice(cursor, start);

    const openingEnd = findTagEnd(html, start);
    if (openingEnd < 0) return output;

    let lastValue = openingEnd - 1;
    while (lastValue >= start && isWhitespace(html[lastValue])) lastValue -= 1;
    if (html[lastValue] === '/') {
      cursor = openingEnd + 1;
      continue;
    }

    const closingEnd = findScriptEnd(html, openingEnd + 1);
    if (closingEnd < 0) return output;
    cursor = closingEnd;
  }
  return output;
}

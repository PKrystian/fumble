import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const theme = readFileSync('src/index.css', 'utf8');
const colors = new Map(
  [...theme.matchAll(/--color-([a-z]+-\d+):\s*(#[a-f\d]{6});/gi)].map(
    (match) => [match[1]!, match[2]!] as const,
  ),
);
const problems: string[] = [];
for (const file of readdirSync('src', { recursive: true }) as string[]) {
  if (!/\.(?:tsx?|css)$/.test(file) || /(?:generated|\.test\.|\.d\.ts)/.test(file))
    continue;
  const target = join('src', file);
  const source = readFileSync(target, 'utf8');
  for (const match of source.matchAll(
    /(?:text|bg|border|ring|outline|shadow|decoration|accent|fill|stroke)-((?:ink|arcane|ember)-\d+)/g,
  )) {
    if (!colors.has(match[1]!)) problems.push(`${target}: undefined color ${match[1]}`);
  }
  if (!file.endsWith('.tsx')) continue;
  const ast = ts.createSourceFile(
    target,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const visit = (node: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ['Button', 'IconButton', 'TextInput', 'Select', 'ToggleChip'].includes(
        node.tagName.getText(ast),
      )
    ) {
      const attribute = node.attributes.properties.find(
        (property) =>
          ts.isJsxAttribute(property) && property.name.getText(ast) === 'className',
      );
      if (
        attribute &&
        ts.isJsxAttribute(attribute) &&
        attribute.initializer &&
        ts.isStringLiteral(attribute.initializer) &&
        /(?:^|\s)(?:\w+:)*min-h-\d/.test(attribute.initializer.text)
      ) {
        problems.push(
          `${target}: use the control size prop instead of min-height overrides`,
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

for (const [foreground, background, minimum] of [
  ['ink-50', 'ink-950', 4.5],
  ['ink-300', 'ink-900', 4.5],
  ['ink-500', 'ink-900', 4.5],
  ['ink-400', 'arcane-950', 4.5],
  ['arcane-300', 'arcane-950', 4.5],
  ['#ffffff', 'arcane-700', 4.5],
  ['#ffffff', 'arcane-600', 4.5],
  ['ink-600', 'ink-950', 3],
  ['ink-600', 'ink-900', 3],
] as const) {
  const a = luminance(colors.get(foreground) ?? foreground);
  const b = luminance(colors.get(background)!);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  if (ratio < minimum)
    problems.push(
      `${foreground} on ${background}: contrast ${ratio.toFixed(2)} below ${minimum}`,
    );
}

if (problems.length) throw new Error(problems.join('\n'));
process.stdout.write('UI tokens, control sizes, and contrast checks passed.\n');

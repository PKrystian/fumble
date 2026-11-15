export interface Release {
  version: string;
  date: string;
  notes: string[];
}
export function releaseAnchor(version: string): string {
  return `version-${version.replaceAll('.', '-')}`;
}
export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^## (\d+\.\d+\.\d+(?:-[\w.-]+)?) - (\d{4}-\d{2}-\d{2})\s*$/.exec(
      line,
    );
    if (heading) {
      releases.push({ version: heading[1]!, date: heading[2]!, notes: [] });
      continue;
    }
    const current = releases.at(-1);
    if (!current) continue;
    if (line.startsWith('- ')) current.notes.push(line.slice(2));
    else if (/^\s+\S/.test(line) && current.notes.length)
      current.notes[current.notes.length - 1] += ` ${line.trim()}`;
  }
  return releases;
}

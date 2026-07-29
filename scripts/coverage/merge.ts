import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import coverageLibrary from 'istanbul-lib-coverage';
import reportLibrary from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const { createCoverageMap } = coverageLibrary;
const { createContext } = reportLibrary;

function mergeCoverage(target: ReturnType<typeof createCoverageMap>, file: string): void {
  const incoming = createCoverageMap(JSON.parse(readFileSync(file, 'utf8')));
  for (const path of incoming.files()) {
    const coverage = incoming.fileCoverageFor(path).data;
    target.addFileCoverage({
      ...coverage,
      path: coverage.path.replaceAll('\\', '/').toLowerCase(),
    });
  }
}

const unitMap = createCoverageMap({});
const unitFile = resolve('coverage/unit/coverage-final.json');
if (existsSync(unitFile)) {
  mergeCoverage(unitMap, unitFile);
}

const e2eMap = createCoverageMap({});
const rawDirectory = resolve('coverage/e2e/raw');
if (existsSync(rawDirectory)) {
  for (const file of readdirSync(rawDirectory)) {
    if (!file.endsWith('.json')) continue;
    mergeCoverage(e2eMap, resolve(rawDirectory, file));
  }
}

const map = createCoverageMap({});
for (const path of new Set([...unitMap.files(), ...e2eMap.files()])) {
  const unit = unitMap.data[path];
  const e2e = e2eMap.data[path];
  if (!unit) {
    map.addFileCoverage(e2e!);
    continue;
  }
  if (!e2e) {
    map.addFileCoverage(unit);
    continue;
  }
  const uncovered = (coverage: typeof unit): number => {
    const summary = createCoverageMap({ [path]: coverage }).getCoverageSummary();
    return (
      summary.statements.total -
      summary.statements.covered +
      summary.branches.total -
      summary.branches.covered +
      summary.functions.total -
      summary.functions.covered +
      summary.lines.total -
      summary.lines.covered
    );
  };
  map.addFileCoverage(uncovered(unit) <= uncovered(e2e) ? unit : e2e);
}

const outputDirectory = resolve('coverage/merged');
mkdirSync(outputDirectory, { recursive: true });
const context = createContext({ dir: outputDirectory, coverageMap: map });
for (const name of ['html', 'json', 'json-summary', 'text-summary'] as const) {
  reports.create(name).execute(context);
}

const summary = map.getCoverageSummary();
const thresholds = {
  statements: 100,
  branches: 100,
  functions: 100,
  lines: 100,
} as const;

let failed = false;
for (const [name, threshold] of Object.entries(thresholds)) {
  const percent = summary[name as keyof typeof thresholds].pct;
  if (percent < threshold) {
    failed = true;
    process.stderr.write(`${name} coverage ${percent}% is below ${threshold}%\n`);
  }
}
if (failed) process.exitCode = 1;

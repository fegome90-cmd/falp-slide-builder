import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, test } from 'vitest';

// The library table in ARCHITECTURE.md is the only register of dependencies. Every package
// declared in package.json must be registered with an installable status, and every package
// registered as in use must be declared. Names are compared exactly: no versions, no aliases.
const repoRoot = new URL('../', import.meta.url);

const SECTION_HEADING = '## Library lifecycle';
const PACKAGE_COLUMN = 'Package';
const STATUS_COLUMN = 'Status';
const NOT_A_PACKAGE = '—';

const INSTALLABLE_STATUSES = new Set([
  'Actively used',
  'Used but not everywhere',
  'Newly added',
  'Migrating from',
  'Deprecated',
]);
const IN_USE_STATUSES = new Set([
  'Actively used',
  'Used but not everywhere',
  'Newly added',
  'Migrating from',
]);
const KNOWN_STATUSES = new Set([...INSTALLABLE_STATUSES, 'To be decided', 'Prohibited', 'Removed']);

interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface LibraryRow {
  packageCell: string;
  status: string;
}

function isTableLine(line: string): boolean {
  return line.trim().startsWith('|');
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  return splitRow(line).every((cell) => /^:?-+:?$/.test(cell));
}

/** Reads the first table under the "## Library lifecycle" heading, bounded by the next "## " heading. */
function readLibraryRows(markdown: string): { error: string } | { rows: LibraryRow[] } {
  const lines = markdown.split(/\r?\n/);
  const start = lines.indexOf(SECTION_HEADING);
  if (start === -1) {
    return { error: `ARCHITECTURE.md has no "${SECTION_HEADING}" section` };
  }
  const nextHeading = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  const section = lines.slice(start + 1, nextHeading === -1 ? undefined : nextHeading);

  const tableStart = section.findIndex(isTableLine);
  if (tableStart === -1) {
    return { error: `ARCHITECTURE.md has no table under "${SECTION_HEADING}"` };
  }
  const table: string[] = [];
  for (const line of section.slice(tableStart)) {
    if (!isTableLine(line)) break;
    table.push(line);
  }

  const [headerLine = '', ...rest] = table;
  const headers = splitRow(headerLine);
  const packageIndex = headers.indexOf(PACKAGE_COLUMN);
  const statusIndex = headers.indexOf(STATUS_COLUMN);
  if (packageIndex === -1 || statusIndex === -1) {
    return {
      error: `the table under "${SECTION_HEADING}" needs "${PACKAGE_COLUMN}" and "${STATUS_COLUMN}" columns`,
    };
  }

  const rows = rest
    .filter((line) => !isSeparatorRow(line))
    .map((line) => {
      const cells = splitRow(line);
      return { packageCell: cells[packageIndex] ?? '', status: cells[statusIndex] ?? '' };
    });
  return { rows };
}

/** Exact npm names: every backticked token in the Package cell. */
function packageNames(packageCell: string): string[] {
  return [...packageCell.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

function declaredNames(packageJson: PackageJsonLike): Set<string> {
  return new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
  ]);
}

/** Returns every problem found; an empty list means the table and package.json agree. */
function checkDependencies(architectureMarkdown: string, packageJson: PackageJsonLike): string[] {
  const read = readLibraryRows(architectureMarkdown);
  if ('error' in read) return [read.error];

  const problems: string[] = [];
  const statuses = new Map<string, string>();
  for (const row of read.rows) {
    if (!KNOWN_STATUSES.has(row.status)) {
      problems.push(`unknown status "${row.status}" for ${row.packageCell}`);
    }
    const names = packageNames(row.packageCell);
    if (names.length === 0) {
      if (row.packageCell !== NOT_A_PACKAGE) {
        problems.push(
          `row "${row.packageCell}" has no backticked npm name; write the name in backticks or use —`,
        );
      }
      continue;
    }
    for (const name of names) {
      if (statuses.has(name)) {
        problems.push(`duplicate package row: ${name}`);
      } else {
        statuses.set(name, row.status);
      }
    }
  }

  const declared = declaredNames(packageJson);
  for (const name of declared) {
    const status = statuses.get(name);
    if (status === undefined) {
      problems.push(
        `unregistered dependency: ${name} — add a row with a documented decision to ARCHITECTURE.md`,
      );
    } else if (KNOWN_STATUSES.has(status) && !INSTALLABLE_STATUSES.has(status)) {
      problems.push(`${name} is declared but its status is ${status}`);
    }
  }
  for (const [name, status] of statuses) {
    if (IN_USE_STATUSES.has(status) && !declared.has(name)) {
      problems.push(`${name} is documented as in use but not declared`);
    }
  }
  return problems;
}

function architectureWith(rows: string[]): string {
  return [
    '# Architecture',
    '',
    SECTION_HEADING,
    '',
    '| Package | Role | Status | Replacement / note |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
    '## Enforcement',
    '',
  ].join('\n');
}

function libraryRow(packageCell: string, status: string): string {
  return `| ${packageCell} | role | ${status} | note |`;
}

describe('dependency allowlist', () => {
  test('the real ARCHITECTURE.md and package.json agree', () => {
    const architecture = fs.readFileSync(new URL('ARCHITECTURE.md', repoRoot), 'utf8');
    const packageJson = JSON.parse(
      fs.readFileSync(new URL('package.json', repoRoot), 'utf8'),
    ) as PackageJsonLike;

    assert.deepEqual(checkDependencies(architecture, packageJson), []);
  });

  describe('negative fixtures', () => {
    test('an unregistered dependency fails', () => {
      const problems = checkDependencies(
        architectureWith([libraryRow('`fastify`', 'Actively used')]),
        {
          dependencies: { fastify: '5.12.7', lodash: '4.17.21' },
        },
      );

      assert.deepEqual(problems, [
        'unregistered dependency: lodash — add a row with a documented decision to ARCHITECTURE.md',
      ]);
    });

    test('a declared Prohibited package fails', () => {
      const problems = checkDependencies(
        architectureWith([libraryRow('`axios`, `node-fetch`, `got`, `superagent`', 'Prohibited')]),
        { devDependencies: { axios: '1.0.0' } },
      );

      assert.deepEqual(problems, ['axios is declared but its status is Prohibited']);
    });

    test('a declared Removed package fails', () => {
      const problems = checkDependencies(architectureWith([libraryRow('`request`', 'Removed')]), {
        dependencies: { request: '2.88.2' },
      });

      assert.deepEqual(problems, ['request is declared but its status is Removed']);
    });

    test('a declared To be decided package fails', () => {
      const problems = checkDependencies(
        architectureWith([libraryRow('`lodash`', 'To be decided')]),
        { devDependencies: { lodash: '4.17.21' } },
      );

      assert.deepEqual(problems, ['lodash is declared but its status is To be decided']);
    });

    test('an in-use row missing from package.json fails', () => {
      const problems = checkDependencies(
        architectureWith([libraryRow('`fastify`', 'Actively used')]),
        {},
      );

      assert.deepEqual(problems, ['fastify is documented as in use but not declared']);
    });

    test('an unknown status fails', () => {
      const problems = checkDependencies(architectureWith([libraryRow('`left-pad`', 'Maybe')]), {
        dependencies: { 'left-pad': '1.3.0' },
      });

      assert.deepEqual(problems, ['unknown status "Maybe" for `left-pad`']);
    });

    test('duplicated package rows fail', () => {
      const problems = checkDependencies(
        architectureWith([
          libraryRow('`lodash`', 'To be decided'),
          libraryRow('`lodash`', 'Prohibited'),
        ]),
        {},
      );

      assert.deepEqual(problems, ['duplicate package row: lodash']);
    });

    test('a Deprecated row absent from package.json passes', () => {
      const problems = checkDependencies(
        architectureWith([libraryRow('`left-pad`', 'Deprecated')]),
        {},
      );

      assert.deepEqual(problems, []);
    });

    test('a comma-separated row is parsed into each package', () => {
      const problems = checkDependencies(
        architectureWith([libraryRow('`axios`, `node-fetch`, `got`, `superagent`', 'Prohibited')]),
        { devDependencies: { superagent: '3.8.0', ky: '1.7.0' } },
      );

      assert.deepEqual(problems, [
        'superagent is declared but its status is Prohibited',
        'unregistered dependency: ky — add a row with a documented decision to ARCHITECTURE.md',
      ]);
    });

    test('a Package cell without a backticked name fails', () => {
      const problems = checkDependencies(
        architectureWith([libraryRow('lodash', 'To be decided')]),
        {},
      );

      assert.deepEqual(problems, [
        'row "lodash" has no backticked npm name; write the name in backticks or use —',
      ]);
    });

    test('a missing section, table or Status column fails', () => {
      assert.deepEqual(checkDependencies('# Architecture\n\n## Enforcement\n', {}), [
        'ARCHITECTURE.md has no "## Library lifecycle" section',
      ]);
      assert.deepEqual(
        checkDependencies(`${SECTION_HEADING}\n\nNo table here.\n\n## Other\n`, {}),
        ['ARCHITECTURE.md has no table under "## Library lifecycle"'],
      );
      assert.deepEqual(
        checkDependencies(
          `${SECTION_HEADING}\n\n| Package | Role | State | note |\n| --- | --- | --- | --- |\n| \`fastify\` | role | Actively used | note |\n`,
          {},
        ),
        ['the table under "## Library lifecycle" needs "Package" and "Status" columns'],
      );
    });
  });
});

import { spawnSync } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * Nothing used to fail the build when a component gained a hardcoded English
 * string — that is how the client drifted to 500+ untranslated literals while
 * the bundle parity stayed green. This pins the guard that closes the hole.
 *
 * The guard is a baseline check, not a hard zero: existing literals are
 * grandfathered, but a *new* one fails. That is what "coverage cannot decay
 * again" requires without blocking the extraction work itself.
 */
const SCRIPT = resolve(__dirname, '../../../scripts/i18n/check-jsx-literals.mjs');

const run = (srcDir: string, baselinePath: string) => {
  const result = spawnSync(
    process.execPath,
    [SCRIPT, '--src', srcDir, '--baseline', baselinePath, '--json'],
    { encoding: 'utf8' }
  );

  return {
    status: result.status,
    report: result.stdout ? JSON.parse(result.stdout) : null,
    stderr: result.stderr,
  };
};

let root: string;
let srcDir: string;
let baselinePath: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'reactory-jsx-guard-'));
  srcDir = join(root, 'src');
  baselinePath = join(root, 'baseline.json');
  mkdirSync(srcDir, { recursive: true });
  writeFileSync(baselinePath, JSON.stringify({}), 'utf8');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const writeComponent = (name: string, content: string) => {
  writeFileSync(join(srcDir, name), content, 'utf8');
};

describe('JSX literal guard', () => {
  it('fails on a hardcoded JSX text literal with no baseline entry', () => {
    writeComponent(
      'Widget.tsx',
      `export const Widget = () => <p>Error loading organizations</p>;\n`
    );

    const { status, report } = run(srcDir, baselinePath);

    expect(status).toBe(1);
    expect(report.added).toEqual([
      { file: 'Widget.tsx', entry: 'text=Error loading organizations' },
    ]);
  });

  /**
   * The ticket called the regex proxy out specifically: it misses attributes,
   * single-word labels and `aria-*`. The guard has to catch them or the
   * coverage it protects is fictional.
   */
  it('catches text-bearing attributes, not just JSX text', () => {
    writeComponent(
      'Panel.tsx',
      `export const Panel = () => (
        <section aria-label="Node types">
          <TextField label="Search" />
          <Any title="Remove" />
        </section>
      );\n`
    );

    const { status, report } = run(srcDir, baselinePath);

    expect(status).toBe(1);
    expect(report.added.map((finding: any) => finding.entry).sort()).toEqual([
      'attr:aria-label=Node types',
      'attr:label=Search',
      'attr:title=Remove',
    ]);
  });

  it('passes when every literal is in the baseline', () => {
    writeComponent('Widget.tsx', `export const Widget = () => <p>Manage</p>;\n`);
    writeFileSync(
      baselinePath,
      JSON.stringify({ 'Widget.tsx': ['text=Manage'] }),
      'utf8'
    );

    const { status, report } = run(srcDir, baselinePath);

    expect(report.added).toEqual([]);
    expect(status).toBe(0);
  });

  it('fails only on the newly added literal', () => {
    writeComponent(
      'Widget.tsx',
      `export const Widget = () => (
        <div>
          <p>Manage</p>
          <p>Delete everything</p>
        </div>
      );\n`
    );
    writeFileSync(
      baselinePath,
      JSON.stringify({ 'Widget.tsx': ['text=Manage'] }),
      'utf8'
    );

    const { status, report } = run(srcDir, baselinePath);

    expect(status).toBe(1);
    expect(report.added).toEqual([
      { file: 'Widget.tsx', entry: 'text=Delete everything' },
    ]);
  });

  it('ignores tests, stories and generated files', () => {
    mkdirSync(join(srcDir, '__tests__'), { recursive: true });
    writeFileSync(
      join(srcDir, '__tests__', 'Widget.test.tsx'),
      `export const Widget = () => <p>Fixture text only</p>;\n`,
      'utf8'
    );
    writeFileSync(
      join(srcDir, 'Widget.stories.tsx'),
      `export const Story = () => <p>Story text only</p>;\n`,
      'utf8'
    );

    const { status, report } = run(srcDir, baselinePath);

    expect(report.added).toEqual([]);
    expect(status).toBe(0);
  });

  it('does not flag already-translated content', () => {
    writeComponent(
      'Widget.tsx',
      `export const Widget = ({ t }) => <p>{t('widget.title')}</p>;\n`
    );

    const { status } = run(srcDir, baselinePath);

    expect(status).toBe(0);
  });
});

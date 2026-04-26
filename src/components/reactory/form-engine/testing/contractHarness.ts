/**
 * Contract test harness — fork vs v5 engine equivalence.
 *
 * The harness exists so we can prove the v5 adapter renders identically
 * to the legacy fork before we cut traffic over. See
 * `docs/forms-engine/09-test-strategy.md#contract-tests` for the design.
 *
 * Phase 1 (now): types, fixture loader, normalize(). The render functions
 * are stubs that throw; they get implemented in Phase 2 when the v5
 * engine lands and we can render side-by-side.
 *
 * Phase 2: `renderWithFork` and `renderWithV5` produce a `RenderResult`
 * for the same fixture. `assertContractParity()` compares them after
 * `normalize()`. Divergences require either a code fix or a documented
 * fixture annotation.
 */

import * as fs from 'fs';
import * as path from 'path';

export type FixtureName = string;

export interface ContractFixture {
  /** Stable identifier — matches the filename minus `.json`. */
  name: FixtureName;
  /** Optional human-readable description; surfaces in test output. */
  description?: string;
  /** JSON Schema. */
  schema: Reactory.Schema.ISchema;
  /** UI schema. Optional. */
  uiSchema?: Reactory.Schema.IUISchema;
  /** Initial form data. Optional. */
  formData?: unknown;
  /**
   * Optional opt-out for known intentional divergences. Each entry must
   * cite a reason; the harness logs but does not fail on listed engines.
   */
  divergences?: Array<{ engine: 'fork' | 'v5'; reason: string }>;
  /** Optional source pointer back to where the fixture was derived from. */
  source?: string;
}

export type RenderEngine = 'fork' | 'v5';

export interface RenderResult {
  engine: RenderEngine;
  /** outerHTML of the rendered form root. */
  html: string;
  /** Visible text content of every label-like element, deduplicated. */
  visibleLabels: Set<string>;
  /** Validation errors surfaced at render time. */
  errors: Array<{ path: string; message: string }>;
}

/**
 * Load a fixture by name from the corpus directory.
 *
 * The corpus lives next to this file under `fixtures/`. Each fixture is a
 * single JSON file whose stem matches `name`.
 */
export function loadFixture(name: FixtureName, dir: string = defaultFixturesDir()): ContractFixture {
  const file = path.join(dir, `${name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Fixture not found: ${file}`);
  }
  const raw = fs.readFileSync(file, 'utf8');
  const fixture = JSON.parse(raw) as ContractFixture;
  if (fixture.name !== name) {
    throw new Error(`Fixture filename and 'name' field disagree: file=${name}, name=${fixture.name}`);
  }
  return fixture;
}

/**
 * List every fixture name in the corpus directory.
 */
export function listFixtures(dir: string = defaultFixturesDir()): FixtureName[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

/**
 * Stub. Renders the fixture using the legacy fork's `<SchemaForm>`.
 * Implemented in Phase 2 once we wire the fork into the test harness
 * with mocked `useReactory` + MUI ThemeProvider.
 */
export function renderWithFork(_fixture: ContractFixture): Promise<RenderResult> {
  throw new Error(
    'renderWithFork: not implemented in Phase 1. Wire up in Phase 2 alongside the v5 engine.',
  );
}

/**
 * Stub. Renders the fixture using the v5 engine. Implemented in Phase 2.
 */
export function renderWithV5(_fixture: ContractFixture): Promise<RenderResult> {
  throw new Error('renderWithV5: not implemented in Phase 1. Adapter lands in Phase 2.');
}

/**
 * Strip differences that don't matter for engine-equivalence: generated IDs,
 * data-* attributes, whitespace runs, MUI's auto-generated class hashes.
 *
 * This must match between the two engines for the contract assertion to be
 * meaningful. Tested in `contractHarness.test.ts`.
 */
export function normalizeHtml(html: string): string {
  return html
    .replace(/\s+/g, ' ')                                  // collapse whitespace
    .replace(/\sid="[^"]*"/g, '')                          // drop generated ids
    .replace(/\sfor="[^"]*"/g, '')                         // drop label-for refs
    .replace(/\saria-(describedby|labelledby)="[^"]*"/g, '') // drop aria id refs
    .replace(/\sdata-[\w-]+="[^"]*"/g, '')                 // drop data-* attrs
    .replace(/\sclass="[^"]*"/g, (match) => {
      // Keep semantically meaningful classes; drop MUI hashed ones (Mui-XXX, css-*, emotion-*),
      // and drop trailing hash segments (those that mix letters with at least one digit).
      const classes = match.slice(8, -1).split(/\s+/);
      const kept = classes.filter((c) =>
        !/^(?:Mui[A-Z]|css-|emotion-|MuiBox-)/.test(c) && !/-[a-z]*\d[a-z0-9]*$/.test(c),
      );
      return kept.length === 0 ? '' : ` class="${kept.join(' ')}"`;
    })
    .replace(/>\s+</g, '><')
    .trim();
}

/**
 * Compare two render results after normalization. In Phase 1 this is just
 * the equality check; Phase 2 introduces structured diff reporting.
 *
 * Throws on mismatch unless the fixture lists the engine as an allowed
 * divergence with a documented reason.
 */
export function assertContractParity(
  fixture: ContractFixture,
  fork: RenderResult,
  v5: RenderResult,
): void {
  const allowedDivergence = fixture.divergences?.find((d) => d.engine === 'v5');
  if (allowedDivergence) {
    return; // documented intentional divergence
  }

  const normFork = normalizeHtml(fork.html);
  const normV5 = normalizeHtml(v5.html);
  if (normFork !== normV5) {
    throw new Error(
      `Contract divergence in fixture "${fixture.name}":\n  fork: ${normFork.slice(0, 200)}\n  v5:   ${normV5.slice(0, 200)}`,
    );
  }
}

function defaultFixturesDir(): string {
  // From form-engine/testing/contractHarness.ts → ../__tests__/fixtures
  return path.resolve(__dirname, '..', '__tests__', 'fixtures');
}

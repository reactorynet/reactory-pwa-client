/**
 * Contract test harness — fork vs v5 engine equivalence.
 *
 * Pure module: fixture loading, HTML normalization, parity assertion.
 * The React-aware renderers (`renderWithFork`, `renderWithV5`) live in
 * `./contractRenderers.tsx` and are imported by tests directly.
 *
 * See `docs/forms-engine/09-test-strategy.md#contract-tests`.
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

// Renderers moved to ./contractRenderers.tsx (React-dependent, .tsx).
// Tests import them directly: `import { renderWithFork, renderWithV5 } from './contractRenderers';`

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

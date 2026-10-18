#!/usr/bin/env node
/**
 * Guards against new hardcoded user-facing English in the client.
 *
 * The parity checker in `reactory-express-server` guards *bundles* — key sets
 * and alignment. Nothing guarded *code*, which is exactly how 500+ untranslated
 * literals accrued silently while the bundles stayed green. This script closes
 * that hole.
 *
 * It walks every JSX file under `src`, parses it with the TypeScript compiler
 * (so JSX text and attribute values are found structurally rather than by
 * regex, which misses attributes and single-word labels), and compares the
 * findings against a checked-in baseline.
 *
 * A baseline rather than a hard zero on purpose: the existing literals cannot
 * all be translated in one change, but **no new one may be added** — a new
 * finding fails the check. The baseline shrinks as strings are extracted, so
 * the guard ratchets toward the goal instead of blocking the work.
 *
 * Usage:
 *   node scripts/i18n/check-jsx-literals.mjs            # verify against baseline
 *   node scripts/i18n/check-jsx-literals.mjs --update   # rewrite the baseline
 *   node scripts/i18n/check-jsx-literals.mjs --json     # machine-readable report
 *
 * Exit: 0 = no new literals, 1 = new literals (or baseline missing a file's
 * entries after an intentional change), 2 = scanner error.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(HERE, '../..');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const update = args.includes('--update');

/** `--src <dir>` / `--baseline <file>` let the guard be tested on fixtures. */
const optionValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? resolve(args[index + 1]) : fallback;
};

const SRC_ROOT = optionValue('--src', join(PROJECT_ROOT, 'src'));
const BASELINE_PATH = optionValue('--baseline', join(HERE, 'jsx-literal-baseline.json'));

/** Attributes that carry user-facing text rather than a programmatic value. */
const TEXT_ATTRIBUTES = ['label', 'title', 'placeholder', 'alt', 'aria-label', 'helperText', 'tooltip'];

/** Files that are not rendered UI and therefore not worth translating. */
const IGNORED_PATH = /(__tests__|__mocks__|\.test\.|\.spec\.|\.stories\.|__generated__|\.d\.ts$)/;

/** Text that is never user-facing: single characters, numbers, punctuation. */
const MEANINGFUL_TEXT = /[A-Za-z]{2,}/;

const walk = (directory) => {
  const entries = [];
  if (!existsSync(directory)) return entries;
  readdirSync(directory).forEach((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      entries.push(...walk(full));
      return;
    }
    if (/\.tsx?$/.test(entry) && !IGNORED_PATH.test(full)) entries.push(full);
  });
  return entries;
};

/** Normalises whitespace so a re-indented literal is not a "new" finding. */
const normalise = (value) => value.replace(/\s+/g, ' ').trim();

/**
 * Collects hardcoded UI strings from one file.
 *
 * Two shapes matter, and a regex proxy catches neither reliably:
 *
 *   * JSX text (`<p>Error loading organizations</p>`), and
 *   * text-bearing attributes (`label="Node types"`).
 */
const collectLiterals = (filePath) => {
  const source = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const found = [];

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const text = normalise(node.getText(sourceFile));
      if (MEANINGFUL_TEXT.test(text)) {
        found.push({ kind: 'text', value: text, line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
      }
    }

    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(sourceFile);
      if (TEXT_ATTRIBUTES.indexOf(name) >= 0) {
        const { initializer } = node;
        if (ts.isStringLiteral(initializer)) {
          const value = normalise(initializer.text);
          if (MEANINGFUL_TEXT.test(value)) {
            found.push({ kind: `attr:${name}`, value, line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
};

/** `{ "<relative path>": ["text", "attr:label=Text", ...] }`, de-duplicated. */
const scan = () => {
  const report = {};
  walk(SRC_ROOT).forEach((filePath) => {
    const literals = collectLiterals(filePath);
    if (literals.length === 0) return;
    const key = relative(SRC_ROOT, filePath).split('\\').join('/');
    report[key] = Array.from(new Set(literals.map((entry) => `${entry.kind}=${entry.value}`))).sort();
  });
  return report;
};

const loadBaseline = () => {
  if (!existsSync(BASELINE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch (error) {
    console.error(`Could not parse ${BASELINE_PATH}: ${error.message}`);
    process.exit(2);
  }
};

const current = scan();

if (update) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  const total = Object.values(current).reduce((sum, list) => sum + list.length, 0);
  console.log(`Baseline written: ${Object.keys(current).length} file(s), ${total} literal(s).`);
  process.exit(0);
}

const baseline = loadBaseline();
const added = [];

Object.keys(current).forEach((file) => {
  const allowed = new Set(baseline[file] || []);
  current[file].forEach((entry) => {
    if (!allowed.has(entry)) added.push({ file, entry });
  });
});

const removed = [];
Object.keys(baseline).forEach((file) => {
  const found = new Set(current[file] || []);
  baseline[file].forEach((entry) => {
    if (!found.has(entry)) removed.push({ file, entry });
  });
});

if (asJson) {
  console.log(JSON.stringify({ added, removed }, null, 2));
} else {
  if (added.length > 0) {
    console.error('New hardcoded user-facing strings (wrap them in t(...) or add a key):');
    added.forEach(({ file, entry }) => console.error(`  ${file}: ${entry}`));
  }
  if (removed.length > 0) {
    // Not a failure: extracting a string is the point. Mentioned so the
    // baseline can be refreshed and keep ratcheting.
    console.log(`${removed.length} baseline entr(ies) no longer present — run --update to shrink the baseline.`);
  }
  if (added.length === 0) console.log('No new hardcoded user-facing strings.');
}

process.exit(added.length > 0 ? 1 : 0);

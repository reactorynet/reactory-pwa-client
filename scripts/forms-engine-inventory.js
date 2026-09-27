/**
 * Static inventory of Reactory form definitions and their readiness for the
 * v5 engine (forms-engine consolidation plan, docs/forms-engine/16-consolidation-plan.md).
 *
 *   node scripts/forms-engine-inventory.js              summary as JSON
 *   node scripts/forms-engine-inventory.js --markdown   per-form table
 *
 * Reads the sibling repos (reactory-express-server, reactory-data) next to
 * this one. It is a static scan: a widget named in a variable or built at
 * runtime is not seen, and YAML forms in reactory-data/forms are not scanned.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const catalogue = new Set(fs.readFileSync(`${ROOT}/reactory-pwa-client/src/components/reactory/form-engine/widgets/index.tsx`, 'utf8').match(/\b[A-Z][A-Za-z]+(Widget|Field)\b/g));
const v5Fields = new Set(['GridLayout', 'ObjectWidgetField', 'ConditionalField', 'ObjectField', 'ArrayField', 'SchemaField']);
const standard = new Set('text textarea password email uri color date datetime time updown range select radio checkboxes checkbox hidden file alt-date alt-datetime TextWidget TextareaWidget PasswordWidget EmailWidget URLWidget ColorWidget DateTimeWidget TimeWidget UpDownWidget RangeWidget RadioWidget CheckboxesWidget CheckboxWidget FileWidget AltDateWidget AltDateTimeWidget BaseInputWidget'.split(' '));

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '__tests__', 'tests', 'docs', 'lib', 'dist', 'build'].includes(e.name) || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(p);
  }
  return out;
};

const sources = [
  ...fs.readdirSync(`${ROOT}/reactory-express-server/src/modules`).map((m) => [`server:${m}`, `${ROOT}/reactory-express-server/src/modules/${m}/forms`]),
  ['pwa', `${ROOT}/reactory-pwa-client/src/components/reactory/formDefinitions`],
  ['pwa-plugins', `${ROOT}/reactory-pwa-client/src/components/plugins`],
  ['client-core', `${ROOT}/reactory-data/plugins/reactory-client-core/src`],
].filter(([, d]) => fs.existsSync(d));

const forms = [];
for (const [owner, dir] of sources) {
  const files = walk(dir);
  // A form: a file that declares a form id plus schema (definition object), grouped by its directory.
  const defs = files.filter((f) => { const s = fs.readFileSync(f, 'utf8'); return /IReactoryForm\b/.test(s) && /\bschema\b/.test(s) && /\b(name|id)\s*[:,]/.test(s); });
  const dirs = [...new Set(defs.map((f) => path.dirname(f)))];
  for (const d of dirs) {
    const own = files.filter((f) => path.dirname(f) === d || (f.startsWith(d + path.sep) && !dirs.some((o) => o !== d && o.startsWith(d + path.sep) && f.startsWith(o + path.sep))));
    const text = own.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
    const widgets = [...text.matchAll(/['"]ui:widget['"]\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    const fields = [...text.matchAll(/['"]ui:field['"]\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    // Names a form maps to components through widgetMap resolve on both engines.
    const mapped = new Set([...text.matchAll(/\b(?:widget|field)\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]));
    const fqnParts = [...widgets, ...fields].filter((w) => w.includes('.') || mapped.has(w));
    const missing = widgets.filter((w) => !w.includes('.') && !mapped.has(w) && !catalogue.has(w) && !standard.has(w));
    const layouts = fields.filter((f) => !f.includes('.') && !mapped.has(f) && !v5Fields.has(f));
    forms.push({
      owner, dir: path.relative(ROOT, d),
      v5: /engine\s*:\s*['"]v5['"]/.test(text),
      conditional: /\bif\s*:\s*\{|\bdependencies\s*:\s*\{|\boneOf\s*:|\banyOf\s*:/.test(text),
      modules: /\bmodules\s*[:,]/.test(text) && /compiler\s*:/.test(text),
      uiSchemas: /\buiSchemas\s*:/.test(text),
      layouts: [...new Set(layouts)], missing: [...new Set(missing)], fqn: [...new Set(fqnParts)],
    });
  }
}

const tier = (f) => f.v5 ? 'on v5' : f.missing.length || f.layouts.length ? 'blocked (adapter needed)' : f.conditional ? 'conditional (ConditionalField)' : f.fqn.length || f.modules ? 'plugin components (verify)' : 'ready';
const byTier = {}, byOwner = {}, missingCount = {}, layoutCount = {};
for (const f of forms) {
  const t = tier(f); f.tier = t;
  byTier[t] = (byTier[t] || 0) + 1;
  byOwner[f.owner] = byOwner[f.owner] || {}; byOwner[f.owner][t] = (byOwner[f.owner][t] || 0) + 1;
  f.missing.forEach((w) => (missingCount[w] = (missingCount[w] || 0) + 1));
  f.layouts.forEach((w) => (layoutCount[w] = (layoutCount[w] || 0) + 1));
}
if (process.argv.includes('--markdown')) {
  const order = ['blocked (adapter needed)', 'conditional (ConditionalField)', 'plugin components (verify)', 'ready', 'on v5'];
  const rows = forms.slice().sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier) || a.dir.localeCompare(b.dir));
  console.log('| Form directory | Owner | Readiness | Gaps |');
  console.log('|---|---|---|---|');
  for (const f of rows) {
    const gaps = [...f.layouts.map((l) => `layout ${l}`), ...f.missing.map((w) => `widget ${w}`)];
    if (f.conditional) gaps.push('conditional schema');
    if (f.modules) gaps.push('runtime modules');
    if (f.fqn.length) gaps.push(`${f.fqn.length} plugin component(s)`);
    console.log(`| \`${f.dir}\` | ${f.owner} | ${f.tier} | ${gaps.join(', ') || '—'} |`);
  }
} else {
  console.log(JSON.stringify({ total: forms.length, byTier, byOwner, missingWidgets: Object.entries(missingCount).sort((a, b) => b[1] - a[1]), missingLayouts: Object.entries(layoutCount).sort((a, b) => b[1] - a[1]) }, null, 1));
}

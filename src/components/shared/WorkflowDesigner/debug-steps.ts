/**
 * Debug script to verify step categories are populated correctly
 */

import { BUILT_IN_STEPS, STEP_CATEGORIES } from './constants';
import { ALL_STEP_DEFINITIONS } from './components/Steps';

console.log('=== Step Library Debug ===\n');

console.log(`Total steps in ALL_STEP_DEFINITIONS: ${ALL_STEP_DEFINITIONS.length}`);
console.log(`Total steps in BUILT_IN_STEPS: ${BUILT_IN_STEPS.length}`);
console.log(`Total categories: ${STEP_CATEGORIES.length}\n`);

console.log('Steps by ID:');
ALL_STEP_DEFINITIONS.forEach(step => {
  console.log(`  - ${step.id} (${step.name}) - category: "${step.category}"`);
});

console.log('\nCategories with step counts:');
STEP_CATEGORIES.forEach(cat => {
  console.log(`  - ${cat.id} (${cat.name}): ${cat.steps.length} steps`);
  cat.steps.forEach(step => {
    console.log(`    * ${step.id} (${step.name})`);
  });
});

console.log('\nSteps by category (direct filter):');
const categories = ['control', 'action', 'logic', 'flow', 'integration', 'interaction', 'observability'];
categories.forEach(catId => {
  const steps = BUILT_IN_STEPS.filter(s => s.category === catId);
  console.log(`  - ${catId}: ${steps.length} steps`);
  steps.forEach(step => {
    console.log(`    * ${step.id}`);
  });
});

// Check for any uncategorized steps
const categorizedIds = new Set(categories);
const uncategorized = BUILT_IN_STEPS.filter(s => !categorizedIds.has(s.category));
if (uncategorized.length > 0) {
  console.log('\nUncategorized steps:');
  uncategorized.forEach(step => {
    console.log(`  - ${step.id} (${step.name}) - category: "${step.category}"`);
  });
}

export { };

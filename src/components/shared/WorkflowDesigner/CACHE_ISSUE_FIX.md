# URGENT: Steps Not Showing - Cache Issue

## Problem
The new steps (GraphQL, REST, gRPC, ServiceInvoke, UserActivity, Telemetry) are not appearing in the Step Library Panel because **webpack is serving cached bundles** that don't include the new step files.

## Evidence
From terminal output:
```
cached modules 32.9 MiB (javascript) 31.9 KiB (runtime) [cached] 17102 modules
webpack 5.97.1 compiled successfully in 4136 ms
```

The "[cached]" indicator means webpack didn't detect the changes.

## Solution

### Option 1: Force Rebuild (Recommended)
Stop the dev server and restart with cache clearing:

```bash
# Stop the current dev server (Ctrl+C in terminal 2)

# Clear webpack cache
rm -rf node_modules/.cache

# Restart dev server
bin/start.sh
```

### Option 2: Touch the constants.ts file
Sometimes webpack needs a hint that a dependency changed:

```bash
# While dev server is running
touch src/components/shared/WorkflowDesigner/constants.ts
```

Wait for webpack to rebuild (watch the terminal).

### Option 3: Hard Reload Browser
After Option 1 or 2, do a hard reload:
- **Chrome/Edge**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- **Firefox**: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows)
- **Safari**: `Cmd+Option+R`

## Why This Happened

1. New step definition files were created
2. They were properly imported in `Steps/index.ts`
3. But webpack's module resolution cache didn't invalidate
4. The browser is loading the old bundle that only has 6 steps

## Verification Steps

After clearing cache and rebuilding:

1. **Check webpack output** - Should see new step files being built:
   ```
   Compiling...
   ./src/components/shared/WorkflowDesigner/components/Steps/GraphQL/definition.ts
   ./src/components/shared/WorkflowDesigner/components/Steps/REST/definition.ts
   ... etc
   ```

2. **Check browser console**:
   ```javascript
   import { BUILT_IN_STEPS } from './constants';
   console.log('Steps:', BUILT_IN_STEPS.length); // Should be 12, not 6
   ```

3. **Check Step Library Panel** - Should show:
   - Control Flow: 2 steps
   - Actions: 1 step
   - Logic: 1 step
   - Flow Control: 2 steps
   - Integration: 4 steps ⬅️ NEW
   - User Interaction: 1 step ⬅️ NEW
   - Observability: 1 step ⬅️ NEW

## If Still Not Working

1. **Check import paths are correct**:
   ```bash
   grep -r "from './.*definition'" src/components/shared/WorkflowDesigner/components/Steps/index.ts
   ```

2. **Verify no TypeScript errors**:
   ```bash
   npx tsc --noEmit
   ```

3. **Check browser network tab**:
   - Look for the `main.[hash].js` file
   - Check the timestamp - should be recent
   - Check size - should be larger than before (more steps = more code)

4. **Nuclear option** - Full clean rebuild:
   ```bash
   # Stop dev server
   rm -rf node_modules/.cache
   rm -rf build
   npm run build
   bin/start.sh
   ```

## Quick Test Script

Add this to your WorkflowDesigner component temporarily:

```typescript
useEffect(() => {
  console.group('🔍 Step Library Debug');
  console.log('BUILT_IN_STEPS.length:', BUILT_IN_STEPS.length);
  console.log('STEP_CATEGORIES:', STEP_CATEGORIES.map(c => ({
    id: c.id,
    name: c.name,
    steps: c.steps.length
  })));
  console.log('All step IDs:', BUILT_IN_STEPS.map(s => s.id));
  console.groupEnd();
}, []);
```

Expected console output:
```
BUILT_IN_STEPS.length: 12
STEP_CATEGORIES: [
  { id: 'control', name: 'Control Flow', steps: 2 },
  { id: 'action', name: 'Actions', steps: 1 },
  { id: 'logic', name: 'Logic', steps: 1 },
  { id: 'flow', name: 'Flow Control', steps: 2 },
  { id: 'integration', name: 'Integration', steps: 4 },
  { id: 'interaction', name: 'User Interaction', steps: 1 },
  { id: 'observability', name: 'Observability', steps: 1 }
]
All step IDs: [
  'start', 'end', 'task', 'condition', 
  'parallel', 'join', 'graphql', 'rest', 
  'grpc', 'service_invoke', 'user_activity', 'telemetry'
]
```

If you see 6 instead of 12, the cache clear didn't work.

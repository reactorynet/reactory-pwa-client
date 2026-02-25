# New Steps Not Showing - Complete Fix Guide

## Current Situation
✅ All 12 step definition files exist and are correct
✅ TypeScript compiles without errors  
✅ Steps are properly exported from `Steps/index.ts`
✅ Constants.ts is correctly importing steps
❌ **But only 6 steps appear in the UI (webpack cache issue)**

## Immediate Action Required

### Step 1: Stop the Dev Server
In Terminal 2, press `Ctrl+C` twice to stop the server

### Step 2: Clear Webpack Cache
Run the cache clearing script:
```bash
cd /Users/wweber/Source/reactory/reactory-pwa-client
./clear-cache.sh
```

Or manually:
```bash
cd /Users/wweber/Source/reactory/reactory-pwa-client
rm -rf node_modules/.cache
rm -rf build
```

### Step 3: Restart Dev Server
```bash
bin/start.sh
```

### Step 4: Wait for Full Compilation
Watch the terminal - you should see:
```
Compiling...
[webpack] Compiling...
[webpack] Hash: xxx
[webpack] Version: webpack 5.x.x
```

**Important**: Look for these NEW modules being compiled:
- `./src/components/shared/WorkflowDesigner/components/Steps/GraphQL/definition.ts`
- `./src/components/shared/WorkflowDesigner/components/Steps/REST/definition.ts`
- `./src/components/shared/WorkflowDesigner/components/Steps/GRPC/definition.ts`
- `./src/components/shared/WorkflowDesigner/components/Steps/ServiceInvoke/definition.ts`
- `./src/components/shared/WorkflowDesigner/components/Steps/UserActivity/definition.ts`
- `./src/components/shared/WorkflowDesigner/components/Steps/Telemetry/definition.ts`

If you see "[cached]" next to these, the cache didn't clear properly.

### Step 5: Hard Reload Browser
Once compilation is complete:
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + R`

Or:
- Open DevTools (F12)
- Right-click the reload button
- Select "Empty Cache and Hard Reload"

## Verification Checklist

### In Browser Console
```javascript
// Check step count
import { BUILT_IN_STEPS } from './constants';
console.log(BUILT_IN_STEPS.length); // Should be 12

// Check category counts
import { STEP_CATEGORIES } from './constants';
STEP_CATEGORIES.forEach(cat => {
  console.log(cat.name + ':', cat.steps.length);
});
```

Expected output:
```
12
Control Flow: 2
Actions: 1
Logic: 1
Flow Control: 2
Integration: 4  ⬅️ NEW
User Interaction: 1  ⬅️ NEW
Observability: 1  ⬅️ NEW
```

### In Step Library Panel
You should now see these categories with steps:

#### Control Flow (2 steps) ✓ Already visible
- Start
- End

#### Actions (1 step) ✓ Already visible
- Task

#### Logic (1 step) ✓ Already visible
- Condition

#### Flow Control (2 steps) ⚠️ Partially visible in screenshot
- Parallel
- Join

#### Integration (4 steps) ❌ NOT visible yet
- **GraphQL** - Execute GraphQL queries/mutations
- **REST API** - Call REST APIs
- **gRPC** - Invoke gRPC services  
- **Service Invoke** - Call Reactory services

#### User Interaction (1 step) ❌ NOT visible yet
- **User Activity** - Manual approvals and forms

#### Observability (1 step) ❌ NOT visible yet
- **Telemetry** - Record metrics and traces

## Why This Is Happening

Webpack Dev Server uses aggressive caching for performance. When new files are added to a module that's already cached, webpack may not detect them without explicit cache invalidation.

The issue chain:
1. ✅ New step files created
2. ✅ Properly imported in `Steps/index.ts`
3. ✅ `ALL_STEP_DEFINITIONS` array populated
4. ❌ Webpack cache still serving old bundle
5. ❌ Browser loading cached bundle (only 6 steps)

## Alternative: Environment Variable Approach

If clearing cache doesn't work, try forcing webpack to disable cache:

```bash
# Stop server
# Edit .env or set environment variable
export WEBPACK_CACHE=false

# Restart
bin/start.sh
```

## Nuclear Option

If nothing else works:

```bash
# Stop server
cd /Users/wweber/Source/reactory/reactory-pwa-client

# Full clean
rm -rf node_modules
npm install

# Clear all caches
rm -rf node_modules/.cache
rm -rf build

# Restart
bin/start.sh
```

## Debugging Tips

### Check Webpack Config
Look for cache configuration in:
- `webpack.config.js`
- `webpack.dev.config.js`
- `.rollup/webpack.config.js`

Look for:
```javascript
cache: {
  type: 'filesystem', // This enables persistent caching
  // ...
}
```

### Monitor File Changes
While dev server is running, try:
```bash
# In another terminal
watch -n 1 'ls -lh node_modules/.cache/webpack/'
```

This will show if webpack is updating its cache.

### Check Bundle Size
Before cache clear:
```
main.[hash].js: ~43 MB
```

After cache clear (with 6 new steps):
```
main.[hash].js: ~43.5-44 MB (should be slightly larger)
```

## Success Indicators

✅ Webpack shows "Compiling..." (not "cached")
✅ New step files listed in webpack output
✅ Browser console shows 12 steps
✅ Integration, User Interaction, and Observability categories visible
✅ All 12 steps draggable onto canvas

## If Still Not Working

1. Check if there's a webpack or babel loader config excluding the Steps folder
2. Verify no `.gitignore` or similar ignoring the new files
3. Check file permissions: `ls -la src/components/shared/WorkflowDesigner/components/Steps/*/definition.ts`
4. Try creating a test file that imports ALL_STEP_DEFINITIONS and logs it
5. Check browser network tab - is it loading a cached bundle?

## Contact Support

If none of these work, the issue may be with:
- Custom webpack configuration
- Build tool configuration
- Module resolution settings
- Babel presets/plugins

Provide:
- Webpack version
- Node version
- Package.json scripts
- Webpack config files
- Console errors (if any)

# Test Plan for Durable Reactory Router

## Test Scenarios
- [x] Missing FQN times out into a failure panel instead of an infinite loader
- [x] Late plugin/component registration resolves the waiting route
- [x] Stop waiting exits the resolving state before the hard timeout
- [x] Catalog redirect on a non-current route does not hard-navigate
- [x] Anonymous user hitting a protected matched route is sent to login with return path
- [x] Authenticated user without roles sees forbidden, not a fake 404
- [x] Public routes render while authenticating is true
- [x] Empty catalog after timeout shows a failure panel
- [x] Catch-all does not hang when core.NotFound is missing
- [x] Development mode mounts the route inspector
- [x] Nearby FQN matching prefers version-normalized keys
- [x] Template string transforms and nested object walking
- [x] Header/footer slot fallbacks
- [x] Route error boundary catch

## Coverage Targets
- Target: 80% minimum for `src/app/router/`
- Current: Statements 88.37%, Lines 88.75%, Branches 68.14%, Functions 74.02%

## Test Results
- [x] All tests passing (10 suites, 35 tests)
- [x] Coverage target met for statements/lines
- [x] Plan updated with results

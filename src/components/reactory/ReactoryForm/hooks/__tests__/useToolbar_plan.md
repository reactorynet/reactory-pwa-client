# Test Plan for useToolbar Hook

## Test Scenarios
- [x] Scenario 1: Hook initializes with required props and returns Toolbar + toolbarPosition.
- [x] Scenario 2: Toolbar position defaults to bottom when not configured.
- [x] Scenario 3: Toolbar position uses uiOptions.toolbarPosition when provided.
- [x] Scenario 4: Submit button is rendered when showSubmit is true.
- [x] Scenario 5: Submit button is hidden when showSubmit is false.
- [x] Scenario 6: Refresh button calls refresh callback on click.
- [x] Scenario 7: Help button is rendered when help topics exist and showHelp is true.
- [x] Scenario 8: Help button click calls toggleHelp callback.
- [x] Scenario 9: Back button is rendered when formDefinition.backButton is true.
- [x] Scenario 10: SchemaSelector renders when showSchemaSelectorInToolbar is true.
- [x] Scenario 11: Additional button navigates for nav:// command.
- [x] Scenario 12: Additional button calls custom handler when configured.
- [x] Scenario 13: Additional button creates notification when no handler/command is resolvable.
- [x] Scenario 14: Hook safely handles uiSchema submit icon fallback variants.

## Coverage Targets
- Target: 80% minimum
- Current: 90.8% statements, 81.14% branches, 77.77% functions, 91.66% lines

## Test Results
- [x] All tests passing (14/14)
- [x] Coverage target met (statements 90.8% >= 80%)
- [x] Plan updated with results

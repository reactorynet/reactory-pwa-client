# Test Plan for useSpeechServices Hook

## Test Scenarios
- [x] Scenario 1: Initial state is correct (voiceModeActive=false, session=null, etc.)
- [x] Scenario 2: startVoiceSession calls graph.startVoiceSession and sets voiceSession state
- [x] Scenario 3: startVoiceSession handles error response
- [x] Scenario 4: endVoiceSession calls graph.endVoiceSession and clears state
- [x] Scenario 5: toggleVoiceMode starts session when inactive
- [x] Scenario 6: toggleVoiceMode ends session when active
- [x] Scenario 7: sendVoiceMessage sends audio and returns AI response
- [x] Scenario 8: sendVoiceMessage handles error response
- [x] Scenario 9: sendVoiceMessage returns error when no active session
- [x] Scenario 10: playAudio creates Audio element and plays base64 audio
- [x] Scenario 11: stopPlayback pauses currently playing audio
- [x] Scenario 12: Cleanup stops playback on unmount

## Coverage Targets
- Target: 80% minimum
- Current: TBD

## Test Results
- [x] All tests passing (11/11)
- [x] Coverage target met
- [x] Plan updated with results

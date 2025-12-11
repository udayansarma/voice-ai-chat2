# Continuous Recognition Implementation Plan

## Objective
Enable continuous speech recognition in the backend using Azure Speech SDK to:
- Accurately capture the duration of recognized speech (excluding silence)
- Support multi-utterance and more natural user interactions
- Provide more granular control over speech session lifecycle

## Key Changes
- Switch from `recognizeOnceAsync` to continuous recognition APIs
- Accumulate recognized segments and their durations
- Decide when to stop recognition (e.g., after silence, timeout, or max duration)
- Return the full transcript and total active speech duration

## Implementation Steps

### 1. Research & Design
- Review Azure Speech SDK documentation for continuous recognition in Node.js
- Identify event handlers: `recognized`, `sessionStopped`, `canceled`, etc.
- Decide on session stop logic (e.g., silence timeout, max length, or explicit stop)

### 2. Refactor Backend Speech Service
- Update `performSpeechRecognition` in `server/src/speechService.ts` to use `recognizer.startContinuousRecognitionAsync()`
- Accumulate recognized text and durations in event handlers
- On session end, return the full transcript and total duration

### 3. Update API Response
- Change the `/api/speech/recognize` endpoint to return both transcript and speech duration
- Update types in `server/types/api.ts` to reflect the new response shape

### 4. Update Stats Tracking
- Record the total recognized speech duration (excluding silence) in `StatsService`
- Ensure stats are only updated after a successful recognition session

### 5. Update Client Handling (if needed)
- If the client expects a different response shape, update the fetch logic
- Optionally, provide UI feedback for longer recognition sessions (e.g., "Listening..." indicator)

### 6. Testing
- Test with short and long utterances, including silence and multiple phrases
- Validate that the duration matches actual spoken time (not total audio length)
- Add unit/integration tests for the new backend logic

### 7. Documentation & Rollout
- Update API and feature documentation
- Communicate UX changes to users (e.g., possible slight delay after speaking)
- Roll out to production after validation

---

**Note:**
- Continuous recognition is more complex but enables accurate speech timing and multi-utterance support.
- Proper session stop logic is critical for good UX.
- This plan can be executed step-by-step, validating each stage before moving to the next.

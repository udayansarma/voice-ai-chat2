# Feature Plan: Stats Tracking

We currently track the number of LLM tokens used per request. To better monitor usage and performance, we will extend our metrics to capture:

- **Transcribed Speech Duration**: Total seconds of user audio transcribed.
- **Synthesized Audio Characters**: Total number of characters converted to audio output.

## Proposed Changes

1. **Extend Stats Data Model**  
   - Update `server/types/api.ts` (or shared types) to include:
     ```ts
     interface Stats {
       llmTokenCount: number;
       speechDurationSeconds: number;
       audioCharacterCount: number;
     }
     ```
   - Adjust any database schema or in-memory store to persist the new fields.

2. **Capture Speech Duration**  
   - In `server/src/speechService.ts`, measure incoming audio buffer duration (e.g., `buffer.length / sampleRate`) and populate `speechDurationSeconds`.

3. **Count Synthesized Audio Characters**  
   - In `server/src/speechServiceApi.ts`, before sending text to TTS API, capture `text.length` and add to `audioCharacterCount`.

4. **Aggregate Metrics**  
   - Introduce a new `StatsService` (e.g., `server/src/services/statsService.ts`) to accumulate per-session and per-request metrics.

5. **Expose Metrics via API**  
   - Add a new route `GET /api/stats` in `server/src/routes/stats.ts` that returns the aggregated `Stats` object.

6. **Update Client UI**  
   - Create a `StatsPanel` component in `client/src/components/StatsPanel.tsx` to display tokens, seconds, and characters.
   - Fetch metrics from `/api/stats` within `ChatContext` or a dedicated `StatsContext`.

7. **Documentation**  
   - Update `README.md` to explain the new metrics and how to interpret them.
   - Ensure `docs/features/plan-stats.md` (this file) remains up to date.

## Implementation Plan

### Step 1: Update Data Model

- File: `server/types/api.ts`
- Add new fields in the `Stats` interface.
- (If using a database) Create migration to add `speechDurationSeconds` and `audioCharacterCount` columns.

### Step 2: Measure Speech Duration

- File: `server/src/speechService.ts`
- After receiving the audio buffer:
  ```ts
  const durationSec = buffer.length / sampleRate;
  stats.speechDurationSeconds = durationSec;
  ```

### Step 3: Count TTS Characters

- File: `server/src/speechServiceApi.ts`
- Before invoking TTS:
  ```ts
  stats.audioCharacterCount = (text || "").length;
  ```

### Step 4: Implement `StatsService`

- Create `server/src/services/statsService.ts` to initialize, accumulate, and retrieve stats per session or request.
- Replace ad-hoc tracking with calls to `StatsService.recordTokens()`, `.recordSpeechDuration()`, `.recordAudioChars()`.

### Step 5: Create Stats API Endpoint

- File: `server/src/routes/stats.ts`
- Define `router.get('/api/stats', async (_req, res) => { ... })` to return the `Stats` object.
- Mount route in `server/src/index.ts` alongside other routes.

### Step 6: Add Client `StatsPanel`

- File: `client/src/components/StatsPanel.tsx`
- Use `useEffect` to fetch `/api/stats` and render:
  ```tsx
  return (
    <div className="stats-panel">
      <p>Tokens: {stats.llmTokenCount}</p>
      <p>Speech (s): {stats.speechDurationSeconds}</p>
      <p>Audio chars: {stats.audioCharacterCount}</p>
    </div>
  );
  ```

- Import and render `<StatsPanel />` in `ChatInterface` or `App.tsx`.

### Step 7: Documentation

- Update root `README.md` to reference the new metrics and endpoint.
- Keep this plan document updated as implementation progresses.

---

This plan ensures we capture and expose all required usage metrics in a type-safe, well-tested, and well-documented manner.
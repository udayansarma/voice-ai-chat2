# High-Priority Dependency Upgrade Plan

This plan outlines a safe, step-by-step approach to upgrading the most critical dependencies in the project, with a focus on React, TypeScript, routing, and core SDKs. Each step includes a testing phase to ensure stability.

---

## Step 1: Upgrade React, React DOM, and TypeScript
- Update `react`, `react-dom`, and `typescript` to their latest stable versions in both `client` and `server` as appropriate.
- Run the full build and lint process to catch type or API changes.
- **Test:** Manually verify the app loads, renders, and basic navigation works. Run all existing unit and integration tests.

## Step 2: Upgrade react-router-dom and MUI (Material UI)
- Upgrade `react-router-dom`, `@mui/material`, and `@mui/icons-material` to the latest versions.
- Refactor code to address any breaking changes (e.g., routing API, component props).
- **Test:** Check all navigation flows, menus, and UI components for regressions. Run UI snapshot tests if available.

## Step 3: Upgrade OpenAI SDKs and Microsoft Cognitive Services Speech SDK
- Update `openai`, `@azure/openai`, and `microsoft-cognitiveservices-speech-sdk` to the latest versions.
- Update API usage as needed for new/changed endpoints or authentication.
- **Test:** Validate chat, voice, and AI features end-to-end, including speech recognition and LLM responses.

## Step 4: Upgrade Core Backend Utilities
- Upgrade `express`, `axios`, `dotenv`, `chokidar`, `cors`, `fs-extra`, `js-yaml`, `sql.js`, and `ts-node` to their latest versions.
- Address any deprecations or breaking changes in middleware or server logic.
- **Test:** Run all backend unit and integration tests. Manually test API endpoints and error handling.

---

**General Testing Guidance:**
- After each step, commit changes and run the full test suite.
- Use manual smoke testing to verify critical user flows.
- Roll back or fix issues before proceeding to the next step.

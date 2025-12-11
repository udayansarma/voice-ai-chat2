# Scenario Parameter Substitution Overhaul – Implementation Plan

## 1. Update Backend API to Accept Scenario Parameters
- Extend the relevant backend API endpoint (e.g., `/api/scenario` or `/api/chat/messages`) to accept a new `parameters` object in the request body.
- The `parameters` object should include: `persona` (string, persona ID), `mood` (string), `name` (string), and `voice` (string).
- Update TypeScript interfaces for request/response payloads to reflect these changes.
- **System message substitutions must be performed on the server side.** The server should receive the user's selections and return the fully substituted system message to the client.
- Document the substitution logic in the backend for maintainability.
- **Code changes:**
  - Update the API route handler to accept and validate the `parameters` object.
  - Update backend TypeScript types/interfaces for request and response payloads.
  - Add/modify request validation middleware if needed.

## 2. Modify Prompty Template Processing Logic
- Refactor the backend logic that processes prompty templates to use the explicit `parameters` object for substitution, rather than pulling values from chat context.
- Ensure the template engine supports the normal parameter syntax (e.g., `{{name}}`, `{{mood}}`, etc.).
- Add validation to ensure all required parameters are provided.
- **Perform all template substitutions on the server, not in the UI.**
- **Code changes:**
  - Refactor the template processing function to accept the `parameters` object.
  - Add parameter validation and error handling for missing/invalid parameters.
  - Update or add unit tests for the template substitution logic.

## 3. Update Database Schema and Storage (If Needed)
- If scenario parameters need to be persisted (e.g., for audit/history or replay), update the relevant database tables and TypeScript types to store the `parameters` object alongside each scenario/chat record.
- Write a migration script if schema changes are required.
- **Code changes:**
  - Update the database schema to add a `parameters` column (JSON or structured fields as appropriate).
  - Update TypeScript types and database access code to handle the new/updated field.
  - Write and test a migration script if schema changes are needed.

## 4. Update Frontend to Collect and Send Scenario Parameters
- Update the frontend UI to allow users to select or input `persona`, `mood`, `name`, and `voice` for each scenario.
- Ensure these values are sent as part of the API request payload to the backend.
- Update frontend TypeScript types and context as needed.
- **Do not perform system message substitutions in the UI.** The UI should only collect and send user selections to the server, and display the substituted message returned by the backend.
- **Code changes:**
  - Update React components and context to collect and manage scenario parameters.
  - Update API call logic to include the `parameters` object in requests.
  - Update TypeScript types/interfaces for API requests and responses.
  - Update UI to display the substituted system message returned from the backend.

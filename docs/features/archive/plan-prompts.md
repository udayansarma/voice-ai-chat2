## Feature: Hamburger Menu for Agent Templates

### User Story
As a user, I want to open a hamburger menu in the chat UI to select from a list of agent templates so that I can start a new chat session with the chosen agent’s system prompt.

### Acceptance Criteria
- A hamburger menu icon is displayed at the top right of the chat interface.
- Clicking the icon opens a dropdown listing available agent templates fetched from the `/templates` API.
- Selecting a template initializes a new chat session.
- The system message for the LLM is set to the selected template's prompt.
- The chat history is reset when a new template is selected.

### Technical Plan
1. UI: Add a hamburger menu component in `ChatHeader.tsx`.
2. Data Fetch: Create a hook to fetch `/templates` and expose the list of agents.
3. State: Add state to manage current template and chat sessions in context or store.
4. Selection Flow: On template selection, reset chat state and update system message.
5. LLM Integration: Ensure LLM calls include the updated system message based on the template.

### Dependencies
- `/templates` API endpoint
- `ChatHeader.tsx`, `ChatInterface.tsx`, and chat state management hooks

### Next Steps
- Design UI mockups for the dropdown list.
- Implement the components and hooks.
- Write unit and integration tests for the selection flow.

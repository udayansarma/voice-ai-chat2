# API Refactor Plan: Modularizing `server/src/index.ts`

## Rationale
The current `index.ts` file is large and contains all API endpoints, business logic, and configuration in one place. Refactoring to a modular structure will:
- Improve maintainability and readability
- Make it easier to test and extend
- Enable separation of concerns

## Proposed Structure
```
server/
  src/
    index.ts                # App entrypoint: setup, middleware, route registration, server start
    routes/
      personas.ts           # /api/personas endpoints
      templates.ts          # /api/templates endpoints
      chat.ts               # /api/chat endpoints
      speech.ts             # /api/speech endpoints
    services/
      personaService.ts     # Business logic for personas
      templateService.ts    # Business logic for templates
      chatService.ts        # Business logic for chat/LLM
      speechService.ts      # Business logic for speech
    middleware/
      errorHandler.ts       # Centralized error handling
    types/
      ...                  # Shared TypeScript types/interfaces
    config/
      env.ts               # Environment/configuration logic
```

## Step-by-Step Refactor Checklist

- [x] **1. Create a `routes/` directory**
   - Move each group of related endpoints into its own file (e.g., `personas.ts`, `templates.ts`, etc.).

- [x] **2. Create a `services/` directory**
   - Move business logic (file reading, OpenAI calls, etc.) into service modules.
   - Each route should call its corresponding service.

- [x] **3. Move error handling to `middleware/errorHandler.ts`**
   - Export a reusable error handler middleware.

- [x] **4. Move custom types to `types/`**
   - Centralize interfaces and types for reuse.

- [x] **5. Move environment/config logic to `config/env.ts`**
   - Handle dotenv/config loading in one place.

- [x] **6. Refactor `index.ts`**
   - Keep only app setup, middleware, route registration, and server start logic.
   - Import and use routers from `routes/`.

- [x] **7. Test all endpoints**
   - Ensure all routes work as before.
   - Update imports as needed.

- [ ] **8. Update documentation** _(done, see README)_

---

**Backend structure and documentation are now up to date as of June 2025.**

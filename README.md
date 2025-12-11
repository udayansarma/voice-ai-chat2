# Voice AI Chat

A voice-based chat application that uses Azure OpenAI's Chat API and Azure Speech Services to conduct natural conversations with a large language model.

## Features

- Voice-to-text input using Azure Speech Recognition with custom audio processing
- Text-to-speech responses via Azure Cognitive Services Speech SDK
- Real-time chat interface with message history and AI avatars
- **AI Conversation Evaluation** using Azure AI Agent Service for analyzing chat quality
- **Prompty template integration** for structured prompt management
- Supports multiple personas and prompt templates (easily extendable)
- Built with React 19, TypeScript, and Material-UI (MUI) v7 on the frontend
- Node.js/Express backend with TypeScript
- Azure OpenAI integration for natural language processing
- Custom audio worklets for PCM audio processing
- Framer Motion animations for enhanced UI interactions
- Error boundary handling with react-error-boundary
- Responsive design with custom Material-UI theming

## Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher) or yarn
- Azure OpenAI service with a deployed model
- Azure Speech Services for speech recognition and synthesis
- (Optional) Azure AI Hub/Project for conversation evaluation features

## Setup

## Azure Deployment Options

This project supports two parallel Azure deployment models:

1. Container-Based (Existing) – Uses Docker images pushed to ACR and deployed to App Service (see `deploy-azure-containers.ps1`).
2. Native App Service (New) – No custom containers; source builds locally and is zip deployed with `deploy-appservice.ps1`.

Both paths are maintained; choose native for faster iteration and simpler operations, container for full OS-level control.

### Native App Service Deployment (Unified Script)

Script: `deploy-appservice.ps1`

Capabilities:
- Deploy server (Node/Express) and client (Vite static assets) separately or together.
- Build locally (production bundles) and Zip Deploy.
- Set App Settings idempotently (no destructive overwrite of unrelated settings).
- Dry run (`-WhatIf`) and selective build skip (`-NoBuild`).
- Runtime-configurable API base URL without rebuilding client.

Example (deploy both):
```powershell
pwsh d:\code\voice-ai-chat\deploy-appservice.ps1 `
   -SubscriptionId <SUB_ID> `
   -ResourceGroupName <RG_NAME> `
   -ServerAppName voice-ai-server-native `
   -ClientAppName voice-ai-client-native
```

Server only (skip client):
```powershell
pwsh d:\code\voice-ai-chat\deploy-appservice.ps1 -SubscriptionId <SUB_ID> -ResourceGroupName <RG_NAME> -ServerAppName voice-ai-server-native -SkipClient
```

Client only (after a previous server deploy):
```powershell
pwsh d:\code\voice-ai-chat\deploy-appservice.ps1 -SubscriptionId <SUB_ID> -ResourceGroupName <RG_NAME> -ClientAppName voice-ai-client-native -SkipServer
```

Dry run (no changes):
```powershell
pwsh d:\code\voice-ai-chat\deploy-appservice.ps1 -SubscriptionId <SUB_ID> -ResourceGroupName <RG_NAME> -ServerAppName voice-ai-server-native -ClientAppName voice-ai-client-native -WhatIf
```

Override API base URL explicitly:
```powershell
pwsh d:\code\voice-ai-chat\deploy-appservice.ps1 -SubscriptionId <SUB_ID> -ResourceGroupName <RG_NAME> -ServerAppName voice-ai-server-native -ClientAppName voice-ai-client-native -ApiBaseUrl https://custom.example.com/api
```

### Runtime Configuration (API Base URL)

The server exposes `GET /runtime-config` returning JSON:
```json
{ "apiBaseUrl": "https://<server-app>.azurewebsites.net/api", "updatedAt": "<ISO timestamp>" }
```
The client loads this before React mounts (see `client/src/utils/runtimeConfig.ts`). Changing the App Setting `API_BASE_URL` (or `VITE_API_URL` fallback) on the server updates the value for users on next page load—no client rebuild required.

### SQLite Persistence (Native Path)

- DB file path env precedence: `SQLITE_DB_PATH` > `DATABASE_PATH` > default.
- Default Azure path: `/home/site/data/voice-ai-documents.db` (persistent between restarts & deployments; NOT in `wwwroot`).
- Single-instance constraint: Do not scale out with raw SQLite on network storage (risk of locking). Keep instance count = 1 until migrating to a managed DB.

### SPA Deep Link Fallback

- `client/public/404.html` injects a lightweight script that loads `index.html` and restores the original path, enabling deep links (`/chat`, etc.).
- This file is copied into the deployment artifact automatically; App Service will serve it for unknown routes, allowing React Router to take over.

### Key App Settings Managed by Script

Server:
- `NODE_ENV=production`
- `PORT=8080`
- `WEBSITE_RUN_FROM_PACKAGE=1`
- `SQLITE_DB_PATH=/home/site/data/voice-ai-documents.db`
- `API_BASE_URL` (computed or provided)

Client:
- `NODE_ENV=production`
- `WEBSITE_RUN_FROM_PACKAGE=1`
- `VITE_API_URL` (set for backward compatibility; runtime-config usually preferred)

Add your existing service keys (`AZURE_OPENAI_*`, `AZURE_SPEECH_*`, auth settings) manually or extend the script.

### Operational Notes & Limitations

- Rolling back: Redeploy prior produced zip (`deploy_artifacts/server.zip` or `client.zip`) with the same script using `-NoBuild`.
- Logs: Use `az webapp log tail` per app. Ensure App Service logging is enabled if deeper diagnostics needed.
- Health: `/healthz` (lightweight) and `/api/health` (original) endpoints available.
- Fallback risk: If 404.html fails to fetch `index.html` (rare), user sees a minimal error message.
- Security: Secrets are stored as App Settings (not Key Vault) per current scope; rotate manually.

### When to Prefer Containers

Stay with or use the container path if you require:
- Custom OS-level packages / libs beyond Node runtime.
- Consistent image immutability across multiple environments via ACR.
- Advanced Nginx tuning for static assets beyond basic CDN caching.

### Future Enhancements (Possible)
- Managed DB migration (PostgreSQL/Azure SQL) to allow scale-out.
- Slot-based blue/green deployments.
- Key Vault + managed identity for secret retrieval.
- GitHub Actions CI/CD pipeline referencing this script.


### Backend Setup

1. Navigate to the server directory:
   ```powershell
   cd d:\code\voice-ai-chat\server
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Create a `.env` file in the server directory with the following variables:
   ```env
   PORT=5000
   AZURE_OPENAI_ENDPOINT=your-azure-openai-endpoint
   AZURE_OPENAI_KEY=your-azure-openai-key
   AZURE_OPENAI_DEPLOYMENT=your-deployment-name
   AZURE_SPEECH_KEY=your-azure-speech-service-key
   AZURE_SPEECH_REGION=your-azure-speech-service-region
   
   # Azure AI Agent Service (for conversation evaluation)
   AZURE_AI_PROJECT_CONNECTION_STRING=region.api.azureml.ms;subscription-id;resource-group;workspace-name
   ```

   See the [Azure AI Agent Service Configuration](#azure-ai-agent-service-configuration) section below for detailed setup instructions.

4. Start the development server:
   ```powershell
   npm run dev
   ```

### Frontend Setup

1. Navigate to the client directory:
   ```powershell
   cd d:\code\voice-ai-chat\client
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Start the development server:
   ```powershell
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Click the microphone button to start speaking
2. The app will convert your speech to text and send it to the AI
3. The AI's response will be displayed and read aloud
4. You can also type your message in the input field and press Enter or click the send button

## Project Structure

```
voice-ai-chat/
├── client/                 # Frontend React application
│   ├── public/             # Static files
│   └── src/                # Source files
│       ├── components/      # React components
│       ├── hooks/          # Custom React hooks
│       ├── worklets/       # Audio worklet processors
│       ├── App.tsx         # Main App component
│       └── main.tsx        # Entry point
└── server/                 # Backend server
    ├── src/
    │   ├── index.ts        # Main server file
    │   ├── speechService.ts # Azure Speech Service integration
    │   ├── prompts/        # AI prompt templates
    │   └── types/          # TypeScript type definitions
    ├── .env                # Environment variables
    └── package.json        # Backend dependencies
```

## Personas & Prompts

The app supports multiple personas and prompt templates, which can be easily extended by adding new files to the appropriate folders. See the `server/src/personas/` and `server/src/prompts/` directories for examples.

## Prompty Templates

This application uses Microsoft's Prompty format for managing prompt templates. Prompty provides a standardized way to define, version, and manage LLM prompts with YAML frontmatter and template content.

Templates are located in `server/src/prompts/` and can be configured via environment variables:

```env
PROMPTY_TEMPLATE=your-template-name
```

For more details, see the [Prompts README](server/src/prompts/README.md).

## Azure AI Agent Service Configuration

The application includes an AI conversation evaluation feature powered by Azure AI Agent Service. This feature analyzes your chat conversations and provides detailed feedback on conversation quality, effectiveness, and areas for improvement.

### Prerequisites

- Azure subscription with access to Azure AI Studio
- Azure AI Hub and Project set up in Azure AI Studio
- Appropriate permissions to create service principals or use managed identities

### Development Setup (Azure CLI Authentication)

This is the easiest method for local development:

1. **Install Azure CLI** if you haven't already:
   ```powershell
   winget install Microsoft.AzureCLI
   ```

2. **Login to Azure**:
   ```powershell
   az login
   ```

3. **Get your Project Connection String**:
   - Go to [Azure AI Studio](https://ai.azure.com)
   - Navigate to your project
   - Go to **Settings** > **Connection details**
   - Copy the connection string (format: `region.api.azureml.ms;subscription-id;resource-group;workspace-name`)

4. **Add to your `.env` file**:
   ```env
   AZURE_AI_PROJECT_CONNECTION_STRING=your-connection-string-here
   ```

5. **Test the setup**:
   ```powershell
   # From the server directory
   curl http://localhost:5000/api/evaluation/test
   ```

### Production Setup

For production deployments, you have two main options:

#### Option 1: Service Principal (Recommended for traditional deployments)

1. **Create a Service Principal**:
   ```powershell
   # Create the service principal
   az ad sp create-for-rbac --name "voice-ai-chat-eval-service" --role "Cognitive Services User" --scopes /subscriptions/YOUR_SUBSCRIPTION_ID
   ```

2. **Grant additional permissions**:
   - Go to your Azure AI Hub in the Azure Portal
   - Navigate to **Access control (IAM)** > **Add role assignment**
   - Role: **Cognitive Services User** or **Contributor**
   - Assign to your service principal

3. **Set environment variables in production**:
   ```env
   AZURE_TENANT_ID=your-tenant-id
   AZURE_CLIENT_ID=your-service-principal-client-id
   AZURE_CLIENT_SECRET=your-service-principal-secret
   AZURE_AI_PROJECT_CONNECTION_STRING=your-connection-string
   ```

#### Option 2: Managed Identity (Recommended for Azure deployments)

If deploying to Azure App Service, Container Apps, Functions, etc.:

1. **Enable Managed Identity** on your Azure resource:
   - In Azure Portal, go to your App Service/Container App
   - Navigate to **Identity** > **System assigned**
   - Turn on the status and save

2. **Grant permissions to your AI Hub**:
   - Go to your Azure AI Hub in the Azure Portal
   - Navigate to **Access control (IAM)** > **Add role assignment**
   - Role: **Cognitive Services User** or **Contributor**
   - Assign to your managed identity

3. **Set only the connection string**:
   ```env
   AZURE_AI_PROJECT_CONNECTION_STRING=your-connection-string
   ```

### Configuration Options

The following environment variables are supported:

```env
# Required: Project connection string
AZURE_AI_PROJECT_CONNECTION_STRING=region.api.azureml.ms;subscription-id;resource-group;workspace-name

# Alternative: Project endpoint URL (use instead of connection string)
# AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://your-project-name.region.api.azureml.ms

# Optional: Specific evaluation agent ID
# AZURE_EVALUATION_AGENT_ID=your-custom-agent-id

# Production: Service Principal credentials (if not using managed identity)
# AZURE_TENANT_ID=your-tenant-id
# AZURE_CLIENT_ID=your-service-principal-client-id  
# AZURE_CLIENT_SECRET=your-service-principal-secret
```

### Authentication Priority

The application uses `DefaultAzureCredential`, which attempts authentication in this order:

1. **Environment variables** (Service Principal)
2. **Managed Identity** (if running on Azure)
3. **Visual Studio** authentication
4. **Azure CLI** authentication (`az login`)
5. **Azure PowerShell** authentication
6. **Interactive browser** (fallback)

### Testing the Setup

1. **Test API endpoint**:
   ```powershell
   # From your server directory
   curl http://localhost:5000/api/evaluation/test
   ```

2. **Test evaluation with sample data**:
   ```powershell
   curl -X POST http://localhost:5000/api/evaluation/analyze-simple `
        -H "Content-Type: application/json" `
        -d '{"messages":[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi there!"}]}'
   ```

### Troubleshooting

**Authentication Issues:**
- Verify your Azure credentials with `az account show`
- Check that your service principal has the correct permissions
- Ensure the connection string format is correct

**Permission Issues:**
- Verify your account/service principal has access to the AI Hub
- Check that the **Cognitive Services User** role is assigned
- Ensure the AI Hub and project exist and are accessible

**Configuration Issues:**
- Validate the connection string format matches: `region.api.azureml.ms;subscription-id;resource-group;workspace-name`
- Check that all required environment variables are set
- Verify the Azure AI project is properly configured in Azure AI Studio

### Using the Evaluation Feature

Once configured, the evaluation feature is available in the UI:

1. Have a conversation with the AI
2. Click the **Export** button in the chat interface
3. In the export dialog, click **AI Evaluation**
4. Wait for the analysis to complete
5. View the detailed Markdown report with conversation insights

The evaluation provides analysis on:
- Conversation quality and flow
- Response appropriateness and helpfulness
- Areas for improvement
- Overall effectiveness metrics

## Environment Variables

### Backend

- `PORT`: The port the server will run on (default: 5000)
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint URL
- `AZURE_OPENAI_KEY`: Your Azure OpenAI API key
- `AZURE_OPENAI_DEPLOYMENT`: The name of your Azure OpenAI deployment
- `AZURE_OPENAI_MODEL`: The model to use (e.g., gpt-4, gpt-4o)
- `AZURE_SPEECH_KEY`: Your Azure Speech Services API key
- `AZURE_SPEECH_REGION`: Your Azure Speech Services region
- `PROMPTY_TEMPLATE`: The Prompty template to use

#### Azure AI Agent Service (Optional - for evaluation features)

- `AZURE_AI_PROJECT_CONNECTION_STRING`: Connection string for your Azure AI project
- `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT`: Alternative to connection string
- `AZURE_EVALUATION_AGENT_ID`: Specific evaluation agent ID (optional)

#### Production Authentication (choose one method)

**Service Principal:**
- `AZURE_TENANT_ID`: Azure AD tenant ID
- `AZURE_CLIENT_ID`: Service principal client ID
- `AZURE_CLIENT_SECRET`: Service principal secret

**Managed Identity:** (No additional variables needed - automatically detected)

## Dependencies (2025)

### Frontend
- react@19.1.0
- @mui/material@7.1.1
- @mui/icons-material@7.1.1
- axios@1.9.0
- microsoft-cognitiveservices-speech-sdk@1.44.1
- react-error-boundary@6.0.0
- react-markdown@10.1.0
- react-router-dom@7.6.2
- remark-gfm@4.0.1

### Backend
- express@5.1.0
- typescript@5.8.3
- ts-node@10.9.2
- @azure/openai@2.0.0
- @azure/ai-projects@1.0.0-beta.2
- @azure/identity@4.5.0
- axios@1.10.0
- chokidar@4.0.3
- cors@2.8.5
- dotenv@16.5.0
- fs-extra@11.3.0
- js-yaml@4.1.0
- microsoft-cognitiveservices-speech-sdk@1.44.1
- openai@5.2.0
- sql.js@1.13.0

#### Backend Dev Dependencies
- @types/express@5.0.3
- @types/fs-extra@11.0.4
- @types/js-yaml@4.0.9
- @types/cors@2.8.19
- @types/sql.js@1.4.9

## Backend API Structure (2025 Refactor)

The server code in `server/` is modular and organized for maintainability:

- **src/routes/** — All API endpoints, grouped by feature (e.g., `personas.ts`, `templates.ts`, `chat.ts`, `speech.ts`).
- **src/services/** — Business logic and utility functions for each feature.
- **src/types/** — Shared TypeScript types/interfaces for API objects.
- **src/config/env.ts** — Centralized environment/configuration logic.
- **src/middleware/errorHandler.ts** — Centralized error handling middleware.

### Example: Adding a New API Feature
1. Add a new route file in `src/routes/` (e.g., `myfeature.ts`).
2. Add business logic in `src/services/` if needed.
3. Add or reuse types in `src/types/`.
4. Register the new router in `src/index.ts`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

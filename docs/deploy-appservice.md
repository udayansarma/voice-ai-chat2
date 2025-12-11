# Deploying to Azure App Service (Native, non-container)

This guide explains how to deploy the Voice AI Chat server and client to Azure App Service using the unified PowerShell script `deploy-appservice.ps1`.

It provisions or updates the Web Apps, builds/packages the code, deploys via ZipDeploy (with automatic CLI fallback), and applies required App Settings for both apps.

## Prerequisites

- Windows PowerShell 7+ (pwsh)
- Azure CLI (az) installed and signed in with a user that has Contributor rights to the target subscription
- An existing Resource Group and an App Service Plan (Linux) where the Web Apps will be created/updated
- Node.js LTS available locally to build
- Optional (server speech token): an Azure Speech resource (Key + Region)

## Script location

- Script path: `D:\code\voice-ai-chat\deploy-appservice.ps1`

## Key concepts

- Server Web App hosts the Node/Express API
- Client Web App hosts the built React/Vite SPA (served via a small Node static server)
- The script disables Oryx/SCM build and performs a deterministic ZipDeploy
- Client reads API base URL at runtime via `config.js` and App Settings

## Parameters

- `-SubscriptionId` (required): Azure Subscription GUID (e.g., `00000000-0000-0000-0000-000000000000`)
- `-ResourceGroupName` (required): Azure Resource Group name (e.g., `my-rg`)
- `-ServerAppName` (optional unless `-SkipServer`): Web App name for the server (e.g., `myapp-server`)
- `-ClientAppName` (optional unless `-SkipClient`): Web App name for the client (e.g., `myapp-client`)
- `-Location` (optional, default `eastus`): used if creating missing Web Apps
- `-ApiBaseUrl` (optional): override API base URL; defaults to `https://<ServerAppName>.azurewebsites.net`
- `-AzureSpeechKey` (optional): Azure Speech key for `/api/speech/token`
- `-AzureSpeechRegion` (optional): Azure Speech region (e.g., `eastus`)
- `-NodeVersion` (optional, default `20-lts`)
- Switches: `-SkipServer`, `-SkipClient`, `-PureStaticClient`, `-NoBuild`, `-EnableLogs`, `-PostDeployInspect`, `-WhatIf`

## One-time setup

1) Sign in and select the subscription

```powershell
# Sign in
az login

# Verify and/or set the active subscription
az account list --output table
az account set --subscription "00000000-0000-0000-0000-000000000000"
```

2) Ensure you have a Resource Group and App Service Plan (Linux)

```powershell
# Example: create if needed
az group create --name "my-rg" --location "eastus"
az appservice plan create --name "my-asp" --resource-group "my-rg" --sku P1v3 --is-linux
```

3) Create the Web Apps (optional)

The script will create Web Apps if missing. If you prefer to pre-create:

```powershell
az webapp create --resource-group "my-rg" --plan "my-asp" --name "myapp-server" --runtime "NODE|20-lts"
az webapp create --resource-group "my-rg" --plan "my-asp" --name "myapp-client" --runtime "NODE|20-lts"
```

## Deploy the Server only

Use this when iterating on the API:

```powershell
pwsh D:\code\voice-ai-chat\deploy-appservice.ps1 \
  -SubscriptionId 00000000-0000-0000-0000-000000000000 \
  -ResourceGroupName my-rg \
  -ServerAppName myapp-server \
  -SkipClient \
  -NoBuild:$false \
  -PostDeployInspect
```

## Deploy both Server and Client

```powershell
pwsh D:\code\voice-ai-chat\deploy-appservice.ps1 \
  -SubscriptionId 00000000-0000-0000-0000-000000000000 \
  -ResourceGroupName my-rg \
  -ServerAppName myapp-server \
  -ClientAppName myapp-client \
  -NoBuild:$false \
  -PostDeployInspect
```

Notes:
- `-NoBuild:$false` forces a fresh install/build for both apps
- The script sets startup commands and disables Oryx/SCM build
- If ZipDeploy encounters issues, it falls back to `az webapp deploy --type zip`

## App Settings

The script sets the essentials and ensures placeholders exist so the app can boot cleanly. Use placeholders below—do not put secrets in source.

### Server (myapp-server)

You may override these via the script or set them in App Service > Configuration.

- `NODE_ENV=production`
- `PORT=8080`
- `WEBSITE_NODE_DEFAULT_VERSION=20-lts` (or your chosen `-NodeVersion`)
- `SQLITE_DB_PATH=/home/site/data/voice-ai-documents.db`
- `SCM_DO_BUILD_DURING_DEPLOYMENT=false`
- `ENABLE_ORYX_BUILD=false`
- `API_BASE_URL=https://myapp-server.azurewebsites.net` (set automatically unless overridden by `-ApiBaseUrl`)
- `AZURE_SPEECH_KEY=<your-speech-key>` (optional; required for `/api/speech/token`)
- `AZURE_SPEECH_REGION=eastus` (optional; required for `/api/speech/token`)

Placeholders the script ensures (optional/feature flags; set as needed):

- `VITE_API_URL=`
- `DATABASE_PATH=`
- `USE_SEED_DATA_MODE=`
- `SKIP_RESTORE=`
- `AZURE_STORAGE_ACCOUNT_NAME=`
- `AZURE_OPENAI_ENDPOINT=`
- `AZURE_OPENAI_KEY=`
- `AZURE_OPENAI_DEPLOYMENT=`
- `AZURE_OPENAI_MODEL=`
- `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=`
- `AZURE_EVALUATION_AGENT_ID=`
- `MESSAGE_WINDOW_SIZE=`
- `AUTH_USERS=`
- `SESSION_SECRET=`
- `SESSION_DURATION_HOURS=`
- `RATE_LIMIT_PER_MINUTE=`
- `AUTH_ENABLED=`
- `PROMPTY_TEMPLATE=`

### Client (myapp-client)

- `NODE_ENV=production`
- `WEBSITE_RUN_FROM_PACKAGE=1`
- `WEBSITE_NODE_DEFAULT_VERSION=20-lts`
- `VITE_API_URL=https://myapp-server.azurewebsites.net` (server origin; no trailing `/api`)
- `RUNTIME_CONFIG_URL=https://myapp-server.azurewebsites.net/runtime-config`
- `SCM_DO_BUILD_DURING_DEPLOYMENT=false`
- `ENABLE_ORYX_BUILD=false`

The script writes a runtime `config.js` into the client package so the SPA reads the correct API origin at runtime.

## Validation

- Server health: `https://myapp-server.azurewebsites.net/healthz`
- Client root: `https://myapp-client.azurewebsites.net/`
- API example: `https://myapp-server.azurewebsites.net/api/moods`

## Troubleshooting

- If requests appear as `.../api/api/...`, the client’s runtime config or interceptor may be outdated; redeploy both server and client so the runtime config points to the server origin (no trailing `/api`).
- ZipDeploy 401/stream issues: the script automatically falls back to `az webapp deploy`. You can re-run with `-PostDeployInspect` to print Kudu listings.
- Missing `moods` data on existing DBs: the server seeds moods from `dist/util/moods.json` on fresh init and has a one-time fallback if the table is empty.
- Speech token 400: set `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` on the server app.

## Clean re-deploy tips

- Use `-NoBuild:$false` when changing server/client source
- The script clears node_modules before building to avoid drift
- Re-running the script is idempotent; it updates app settings and redeploys safely

# Voice AI Chat - Azure App Service (Container) Deployment Script
# This script builds and deploys client and server containers to Azure App Service (Linux)
# Assumes: App Service Plan, Storage Account, Key Vault, and ACR already exist
# Requires: Azure CLI, PowerShell 7+, appropriate Azure permissions
#
# USAGE EXAMPLE:
# .\deploy-azure-containers.ps1 `
#     -SubscriptionId "12345678-1234-1234-1234-123456789012" `
#     -ResourceGroupName "voice-ai-rg" `
#     -AppServicePlanName "voice-ai-asp" `
#     -ClientAppName "voice-ai-client" `
#     -ServerAppName "voice-ai-server" `
#     -Location "eastus" `
#     -StorageAccountName "devst123456" `
#     -KeyVaultName "devkv123456" `
#     -AcrName "devacr123456"
#
# IMPORTANT: Update the Azure service secrets in the configuration section below before running!

param(
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory=$true)]
    [string]$AppServicePlanName,
    
    [Parameter(Mandatory=$true)]
    [string]$ClientAppName,
    
    [Parameter(Mandatory=$true)]
    [string]$ServerAppName,
    
    [Parameter(Mandatory=$true)]
    [string]$StorageAccountName,
    
    [Parameter(Mandatory=$true)]
    [string]$KeyVaultName,
    
    [Parameter(Mandatory=$true)]
    [string]$AcrName
)

# =============================================================================
# CONFIGURATION VARIABLES AND SECRETS - Update these values for your deployment
# =============================================================================

# **IMPORTANT: Update these secret values before running the script**
# Azure OpenAI Configuration (REQUIRED)
$AZURE_OPENAI_ENDPOINT = "https://your-openai-resource.openai.azure.com/"
$AZURE_OPENAI_KEY = "your-openai-api-key-here"
$AZURE_OPENAI_DEPLOYMENT = "gpt-4o"
$AZURE_OPENAI_MODEL = "gpt-4o"

# Azure Speech Services Configuration (REQUIRED)
$AZURE_SPEECH_KEY = "your-speech-service-key-here"
$AZURE_SPEECH_REGION = $Location

# Azure AI Foundry Configuration (REQUIRED)
$AZURE_AI_FOUNDRY_PROJECT_ENDPOINT = "https://your-ai-foundry-project.cognitiveservices.azure.com/"
$AZURE_EVALUATION_AGENT_ID = "your-evaluation-agent-id-here"

# Application Authentication (Update if needed)
$AUTH_USERS = '[{"username":"demo","password":"demo123"}]'
$SESSION_SECRET = (New-Guid).ToString().Replace('-', '')

# =============================================================================
# RESOURCE NAMING
# =============================================================================

# Container Image Configuration
$CLIENT_IMAGE_TAG = "latest"
$SERVER_IMAGE_TAG = "latest"
$CLIENT_IMAGE_NAME = "client"
$SERVER_IMAGE_NAME = "server"

# Storage Container Names (assume containers exist in provided storage account)
$DATABASE_CONTAINER_NAME = "data"
$BACKUP_CONTAINER_NAME = "database-backups"

# Application Configuration (Auto-generated - will be updated after server deployment)
$VITE_API_URL = "https://${ServerAppName}.azurewebsites.net"

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

function Write-Step($message) {
    Write-Host "===== $message =====" -ForegroundColor Green
}

function Write-Info($message) {
    Write-Host "INFO: $message" -ForegroundColor Blue
}

function Write-Error($message) {
    Write-Host "ERROR: $message" -ForegroundColor Red
}

function Test-CommandExists($command) {
    try {
        Get-Command $command -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

# =============================================================================
# PREREQUISITES CHECK AND VALIDATION
# =============================================================================

Write-Step "Validating Configuration and Prerequisites"

# Validate required secrets are provided
$requiredSecrets = @{
    "AZURE_OPENAI_ENDPOINT" = $AZURE_OPENAI_ENDPOINT
    "AZURE_OPENAI_KEY" = $AZURE_OPENAI_KEY
    "AZURE_SPEECH_KEY" = $AZURE_SPEECH_KEY
    "AZURE_AI_FOUNDRY_PROJECT_ENDPOINT" = $AZURE_AI_FOUNDRY_PROJECT_ENDPOINT
    "AZURE_EVALUATION_AGENT_ID" = $AZURE_EVALUATION_AGENT_ID
}

$hasValidationErrors = $false
foreach ($secret in $requiredSecrets.GetEnumerator()) {
    if ($secret.Value -like "*your-*" -or $secret.Value -like "*placeholder*" -or [string]::IsNullOrWhiteSpace($secret.Value)) {
        Write-Error "Please update the $($secret.Key) variable at the top of the script"
        $hasValidationErrors = $true
    }
}

if ($hasValidationErrors) {
    Write-Error "Configuration validation failed. Please update the required variables at the top of the script and try again."
    exit 1
}

if (-not (Test-CommandExists "az")) {
    Write-Error "Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check if logged in to Azure
$currentAccount = az account show --query "name" -o tsv 2>$null
if (-not $currentAccount) {
    Write-Info "Not logged in to Azure. Please log in..."
    az login
}

Write-Info "Current Azure account: $currentAccount"

# =============================================================================
# AZURE SETUP AND VALIDATION
# =============================================================================

Write-Step "Setting up Azure Context and Validating Existing Resources"

# Set subscription
Write-Info "Setting subscription to: $SubscriptionId"
az account set --subscription $SubscriptionId

# Validate resource group exists
Write-Info "Validating resource group: $ResourceGroupName"
$rgExists = az group exists --name $ResourceGroupName
if ($rgExists -eq "false") {
    Write-Error "Resource group $ResourceGroupName does not exist"
    exit 1
}

# Validate App Service Plan exists
Write-Info "Validating App Service Plan: $AppServicePlanName"
$aspExists = az appservice plan show --name $AppServicePlanName --resource-group $ResourceGroupName --query "name" -o tsv 2>$null
if (-not $aspExists) {
    Write-Error "App Service Plan $AppServicePlanName does not exist in resource group $ResourceGroupName"
    exit 1
}

# Validate Storage Account exists
Write-Info "Validating Storage Account: $StorageAccountName"
$storageExists = az storage account show --name $StorageAccountName --resource-group $ResourceGroupName --query "name" -o tsv 2>$null
if (-not $storageExists) {
    Write-Error "Storage Account $StorageAccountName does not exist in resource group $ResourceGroupName"
    exit 1
}

# Validate Key Vault exists
Write-Info "Validating Key Vault: $KeyVaultName"
$kvExists = az keyvault show --name $KeyVaultName --resource-group $ResourceGroupName --query "name" -o tsv 2>$null
if (-not $kvExists) {
    Write-Error "Key Vault $KeyVaultName does not exist in resource group $ResourceGroupName"
    exit 1
}

# Validate ACR exists
Write-Info "Validating Azure Container Registry: $AcrName"
$acrExists = az acr show --name $AcrName --resource-group $ResourceGroupName --query "name" -o tsv 2>$null
if (-not $acrExists) {
    Write-Error "Azure Container Registry $AcrName does not exist in resource group $ResourceGroupName"
    exit 1
}

# Enable admin user for ACR (required for credential retrieval)
Write-Info "Enabling admin user for Azure Container Registry (if not already enabled)"
az acr update -n $AcrName --admin-enabled true

# Get ACR login server
Write-Info "Getting ACR login server"
$ACR_LOGIN_SERVER = az acr show --name $AcrName --resource-group $ResourceGroupName --query "loginServer" -o tsv

# =============================================================================
# BUILD AND PUSH DOCKER IMAGES
# =============================================================================

Write-Step "Building and Pushing Docker Images"

# Build client image (Node.js static build)
Write-Info "Building client image via ACR Build (Node.js static)"
az acr build --registry $AcrName --image "${CLIENT_IMAGE_NAME}:${CLIENT_IMAGE_TAG}" --file "client/Dockerfile.node" .

# Build server image
Write-Info "Building server image via ACR Build"
az acr build --registry $AcrName --image "${SERVER_IMAGE_NAME}:${SERVER_IMAGE_TAG}" --file "server/Dockerfile" .

# =============================================================================
# DEPLOY TO AZURE APP SERVICE (CONTAINER)
# =============================================================================

Write-Step "Deploying to Azure App Service (Linux Container)"

# Create or update client web app
Write-Info "Deploying Client Web App: $ClientAppName"
$clientExists = az webapp show --name $ClientAppName --resource-group $ResourceGroupName --query "name" -o tsv 2>$null
if ($clientExists) {
    Write-Info "Client app exists, updating image and settings"
    az webapp config container set --name $ClientAppName --resource-group $ResourceGroupName --docker-custom-image-name "${ACR_LOGIN_SERVER}/${CLIENT_IMAGE_NAME}:${CLIENT_IMAGE_TAG}" --docker-registry-server-url "https://${ACR_LOGIN_SERVER}"
} else {
    az webapp create --resource-group $ResourceGroupName --plan $AppServicePlanName --name $ClientAppName --deployment-container-image-name "${ACR_LOGIN_SERVER}/${CLIENT_IMAGE_NAME}:${CLIENT_IMAGE_TAG}"
}
az webapp config appsettings set --name $ClientAppName --resource-group $ResourceGroupName --settings "PORT=5173" "VITE_API_URL=$VITE_API_URL"

# Create or update server web app
Write-Info "Deploying Server Web App: $ServerAppName"
$serverExists = az webapp show --name $ServerAppName --resource-group $ResourceGroupName --query "name" -o tsv 2>$null
if ($serverExists) {
    Write-Info "Server app exists, updating image and settings"
    az webapp config container set --name $ServerAppName --resource-group $ResourceGroupName --docker-custom-image-name "${ACR_LOGIN_SERVER}/${SERVER_IMAGE_NAME}:${SERVER_IMAGE_TAG}" --docker-registry-server-url "https://${ACR_LOGIN_SERVER}"
} else {
    az webapp create --resource-group $ResourceGroupName --plan $AppServicePlanName --name $ServerAppName --deployment-container-image-name "${ACR_LOGIN_SERVER}/${SERVER_IMAGE_NAME}:${SERVER_IMAGE_TAG}"
}
Write-Info "Getting ACR login server"
$ACR_LOGIN_SERVER = az acr show --name $AcrName --resource-group $ResourceGroupName --query "loginServer" -o tsv

# Get current user object ID for Key Vault access
$CURRENT_USER_OBJECT_ID = az ad signed-in-user show --query "id" -o tsv

# =============================================================================
# USER-ASSIGNED MANAGED IDENTITY (for App Service)
# =============================================================================

Write-Step "Creating or Getting User-Assigned Managed Identity"

$MANAGED_IDENTITY_NAME = "${ServerAppName}-identity"
$MANAGED_IDENTITY_ID = az identity show --resource-group $ResourceGroupName --name $MANAGED_IDENTITY_NAME --query "id" -o tsv 2>$null
if (-not $MANAGED_IDENTITY_ID) {
    Write-Info "Managed identity $MANAGED_IDENTITY_NAME does not exist. Creating..."
    az identity create --resource-group $ResourceGroupName --name $MANAGED_IDENTITY_NAME --location $Location
    $MANAGED_IDENTITY_ID = az identity show --resource-group $ResourceGroupName --name $MANAGED_IDENTITY_NAME --query "id" -o tsv
} else {
    Write-Info "Using existing managed identity: $MANAGED_IDENTITY_NAME"
}
$MANAGED_IDENTITY_CLIENT_ID = az identity show --resource-group $ResourceGroupName --name $MANAGED_IDENTITY_NAME --query "clientId" -o tsv
$MANAGED_IDENTITY_PRINCIPAL_ID = az identity show --resource-group $ResourceGroupName --name $MANAGED_IDENTITY_NAME --query "principalId" -o tsv

# Assign roles for Key Vault and Storage
$STORAGE_RESOURCE_ID = az storage account show --name $StorageAccountName --resource-group $ResourceGroupName --query "id" -o tsv
Write-Info "Assigning Storage Blob Data Contributor role to managed identity"
az role assignment create --assignee $MANAGED_IDENTITY_PRINCIPAL_ID --role "Storage Blob Data Contributor" --scope $STORAGE_RESOURCE_ID

Write-Info "Assigning Key Vault Secrets User role to managed identity"
$KEYVAULT_RESOURCE_ID = az keyvault show --name $KeyVaultName --resource-group $ResourceGroupName --query "id" -o tsv
az role assignment create --assignee $MANAGED_IDENTITY_PRINCIPAL_ID --role "Key Vault Secrets User" --scope $KEYVAULT_RESOURCE_ID

# =============================================================================
# ASSIGN MANAGED IDENTITY TO APP SERVICES
# =============================================================================

Write-Step "Assigning Managed Identity to App Services"
az webapp identity assign --resource-group $ResourceGroupName --name $ClientAppName --identities $MANAGED_IDENTITY_ID
az webapp identity assign --resource-group $ResourceGroupName --name $ServerAppName --identities $MANAGED_IDENTITY_ID

# Set environment variable for client ID in both apps (if needed by app code)
az webapp config appsettings set --name $ClientAppName --resource-group $ResourceGroupName --settings "AZURE_CLIENT_ID=$MANAGED_IDENTITY_CLIENT_ID"
az webapp config appsettings set --name $ServerAppName --resource-group $ResourceGroupName --settings "AZURE_CLIENT_ID=$MANAGED_IDENTITY_CLIENT_ID"

# =============================================================================
# RETRIEVE DEPLOYMENT INFORMATION
# =============================================================================

Write-Step "Deployment Complete - Retrieving Information"

Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow
Write-Host "Location: $Location" -ForegroundColor Yellow
Write-Host ""
Write-Host "Existing Resources Used:" -ForegroundColor Yellow
Write-Host "  Container Registry: $AcrName" -ForegroundColor White
Write-Host "  Storage Account: $StorageAccountName" -ForegroundColor White
Write-Host "  Key Vault: $KeyVaultName" -ForegroundColor White
Write-Host ""
Write-Host "Created Resources:" -ForegroundColor Yellow
Write-Host "  Managed Identity: $MANAGED_IDENTITY_NAME" -ForegroundColor White
Write-Host "  Client Web App: $ClientAppName" -ForegroundColor White
Write-Host "  Server Web App: $ServerAppName" -ForegroundColor White
Write-Host ""
Write-Host "Application URLs:" -ForegroundColor Cyan
Write-Host "  Client:  https://$ClientAppName.azurewebsites.net" -ForegroundColor White
Write-Host "  Server:  https://$ServerAppName.azurewebsites.net" -ForegroundColor White
Write-Host ""
Write-Host "Authentication:" -ForegroundColor Cyan
Write-Host "  Username: demo" -ForegroundColor White
Write-Host "  Password: demo123" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test the application at: https://$ClientAppName.azurewebsites.net" -ForegroundColor White
Write-Host "2. Login with username: demo, password: demo123" -ForegroundColor White
Write-Host "3. Monitor logs using Azure Portal or CLI" -ForegroundColor White
Write-Host ""
Write-Host "To view application logs, run:" -ForegroundColor Cyan
Write-Host "az webapp log tail --name $ClientAppName --resource-group $ResourceGroupName" -ForegroundColor White
Write-Host "az webapp log tail --name $ServerAppName --resource-group $ResourceGroupName" -ForegroundColor White
Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green

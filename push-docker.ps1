# PowerShell script to build and push client and server images to Azure Container Registry using ACR Tasks (per Azure best practices)

param(
    [switch]$Redeploy
)

$ErrorActionPreference = 'Stop'

Write-Host "Retrieving ACR login server from Terraform output..."
$acrLoginServer = terraform -chdir=infra output -raw container_registry_login_server
if (-not $acrLoginServer) {
    Write-Error "Failed to get ACR login server from Terraform output."
    exit 1
}
Write-Host "ACR_LOGIN_SERVER is [$acrLoginServer]"

# Extract ACR registry name (before first dot)
$acrName = $acrLoginServer.Split('.')[0]
Write-Host "ACR_NAME is [$acrName]"

# Set image tags
# TODO: Consider using unique image tags (e.g., timestamp or commit hash) for better tracking and deployment reliability
$clientImage = "client:latest"
$serverImage = "server:latest"

# Optionally delete and recreate container apps
if ($Redeploy) {
    Write-Host "Redeploy flag is set. Retrieving container app details from Terraform output..."
    $resourceGroup = terraform -chdir=infra output -raw container_app_resource_group
    $environment = terraform -chdir=infra output -raw container_app_environment
    $clientAppName = terraform -chdir=infra output -raw client_container_app_name
    $serverAppName = terraform -chdir=infra output -raw server_container_app_name

    Write-Host "Deleting existing container apps..."
    az containerapp delete --name $clientAppName --resource-group $resourceGroup --yes
    az containerapp delete --name $serverAppName --resource-group $resourceGroup --yes
}

# Build and push server image using ACR Tasks
Write-Host "Building and pushing server image using az acr build..."
az acr build --registry $acrName --image $serverImage --platform linux/amd64 ./server

# Build and push client image using ACR Tasks (no API URL needed - configured at runtime)
Write-Host "Building and pushing client image using az acr build..."
az acr build --registry $acrName --image $clientImage --platform linux/amd64 ./client

if ($Redeploy) {
    Write-Host "Recreating container apps using Azure CLI..."
    # Retrieve additional parameters as needed from Terraform output
    $clientAppParams = terraform -chdir=infra output -json client_container_app_create_params | ConvertFrom-Json
    $serverAppParams = terraform -chdir=infra output -json server_container_app_create_params | ConvertFrom-Json

    az containerapp create @($clientAppParams | ConvertTo-Json -Compress) --resource-group $resourceGroup
    az containerapp create @($serverAppParams | ConvertTo-Json -Compress) --resource-group $resourceGroup
}

Write-Host "Docker images built and pushed to $acrLoginServer via Azure Container Registry Tasks."

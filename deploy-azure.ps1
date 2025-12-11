# Azure Voice AI Chat Deployment Script
# This script deploys the Voice AI Chat application to Azure using Terraform

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$DestroyOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$PlanOnly
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "🚀 Azure Voice AI Chat Deployment Script" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Green

# Check prerequisites
function Test-Prerequisites {
    Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow    # Check Azure CLI
    try {
        $null = az account show 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Azure CLI not found or not logged in"
        }
        Write-Host "✅ Azure CLI: Available and logged in" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Azure CLI is required and you must be logged in. Please run: az login" -ForegroundColor Red
        exit 1
    }
    
    # Check Docker
    try {
        $dockerVersion = docker --version
        if ($LASTEXITCODE -ne 0) {
            throw "Docker not found"
        }
        Write-Host "✅ $dockerVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Docker is required. Please install Docker Desktop" -ForegroundColor Red
        exit 1
    }
    
    # Check Terraform
    try {
        $terraformVersion = terraform version -json | ConvertFrom-Json | Select-Object -ExpandProperty terraform_version
        Write-Host "✅ Terraform: $terraformVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Terraform is required. Please install: https://www.terraform.io/downloads.html" -ForegroundColor Red
        exit 1
    }
    
    # Check if logged into Azure
    try {
        $account = az account show --output json | ConvertFrom-Json
        Write-Host "✅ Logged into Azure as: $($account.user.name)" -ForegroundColor Green
        Write-Host "   Subscription: $($account.name) ($($account.id))" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Not logged into Azure. Please run: az login" -ForegroundColor Red
        exit 1
    }
}

# Get user information for Key Vault access
function Get-DeployerInfo {
    Write-Host "🔍 Getting deployer information..." -ForegroundColor Yellow
    
    try {
        $account = az account show --output json | ConvertFrom-Json
        $userPrincipalName = $account.user.name
        
        # Get object ID
        $objectId = az ad signed-in-user show --query id --output tsv
        
        Write-Host "✅ Deployer UPN: $userPrincipalName" -ForegroundColor Green
        Write-Host "✅ Deployer Object ID: $objectId" -ForegroundColor Green
        
        return @{
            UserPrincipalName = $userPrincipalName
            ObjectId = $objectId
        }
    }
    catch {
        Write-Host "❌ Failed to get user information: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Build and push Docker images
function Build-DockerImages {
    param($registryServer)
    
    Write-Host "🐳 Building and pushing Docker images..." -ForegroundColor Yellow
    
    # Build server image
    Write-Host "Building server image..." -ForegroundColor Cyan
    docker build -t "$registryServer/server:latest" -f server/Dockerfile server/
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to build server image" -ForegroundColor Red
        exit 1
    }
    
    # Build client image
    Write-Host "Building client image..." -ForegroundColor Cyan
    docker build -t "$registryServer/client:latest" -f client/Dockerfile client/
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to build client image" -ForegroundColor Red
        exit 1
    }
    
    # Login to ACR
    Write-Host "Logging into Azure Container Registry..." -ForegroundColor Cyan
    az acr login --name $registryServer.Split('.')[0]
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to login to ACR" -ForegroundColor Red
        exit 1
    }
    
    # Push images
    Write-Host "Pushing server image..." -ForegroundColor Cyan
    docker push "$registryServer/server:latest"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to push server image" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Pushing client image..." -ForegroundColor Cyan
    docker push "$registryServer/client:latest"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to push client image" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Docker images built and pushed successfully" -ForegroundColor Green
}

# Deploy with Terraform
function Deploy-Infrastructure {
    param($deployerInfo)
    
    Write-Host "🏗️  Deploying infrastructure with Terraform..." -ForegroundColor Yellow
    
    # Change to infra directory
    Set-Location -Path "infra"
    
    try {
        # Check if terraform.tfvars exists
        if (-not (Test-Path "terraform.tfvars")) {
            Write-Host "❌ terraform.tfvars not found. Please copy terraform.tfvars.example and fill in your values." -ForegroundColor Red
            Write-Host "   Copy-Item terraform.tfvars.example terraform.tfvars" -ForegroundColor Yellow
            exit 1
        }
        
        # Initialize Terraform
        Write-Host "Initializing Terraform..." -ForegroundColor Cyan
        terraform init
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform init failed"
        }
        
        # Set Terraform variables for deployer info
        $env:TF_VAR_deployer_user_principal_name = $deployerInfo.UserPrincipalName
        $env:TF_VAR_deployer_object_id = $deployerInfo.ObjectId
        
        # Get current Key Vault (if exists) and temporarily enable public access for deployment
        $keyVaultName = $null
        try {
            $existingResources = terraform show -json 2>$null | ConvertFrom-Json
            if ($existingResources -and $existingResources.values.root_module.resources) {
                $keyVaultResource = $existingResources.values.root_module.resources | Where-Object { $_.type -eq "azurerm_key_vault" }
                if ($keyVaultResource) {
                    $keyVaultName = $keyVaultResource.values.name
                    Write-Host "🔓 Temporarily enabling Key Vault access for deployment..." -ForegroundColor Yellow
                    
                    # Get current public IP
                    $publicIP = (Invoke-RestMethod -Uri "https://ipv4.icanhazip.com").Trim()
                    
                    # Enable public access and add IP rule
                    az keyvault update --name $keyVaultName --public-network-access Enabled --default-action Allow
                    az keyvault network-rule add --name $keyVaultName --ip-address $publicIP
                    
                    Write-Host "✅ Key Vault temporarily accessible from IP: $publicIP" -ForegroundColor Green
                }
            }
        }
        catch {
            Write-Host "ℹ️  No existing Key Vault found or unable to modify - proceeding with deployment" -ForegroundColor Yellow
        }
        
        if ($PlanOnly) {
            Write-Host "Planning Terraform deployment..." -ForegroundColor Cyan
            terraform plan
            return
        }
        
        if ($DestroyOnly) {
            Write-Host "⚠️  Destroying infrastructure..." -ForegroundColor Red
            terraform destroy -auto-approve
            return
        }
        
        # Plan and apply
        Write-Host "Planning Terraform deployment..." -ForegroundColor Cyan
        terraform plan -out=tfplan
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform plan failed"
        }
        
        Write-Host "Applying Terraform deployment..." -ForegroundColor Cyan
        terraform apply tfplan
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform apply failed"
        }
        
        # Get outputs
        Write-Host "Getting deployment outputs..." -ForegroundColor Cyan
        $outputs = terraform output -json | ConvertFrom-Json
        
        # Lock down Key Vault again after deployment (if we modified it)
        if ($keyVaultName) {
            Write-Host "🔒 Locking down Key Vault access after deployment..." -ForegroundColor Yellow
            az keyvault update --name $keyVaultName --public-network-access Disabled --default-action Deny
            Write-Host "✅ Key Vault access locked down" -ForegroundColor Green
        }
        
        Write-Host "✅ Infrastructure deployed successfully!" -ForegroundColor Green
        Write-Host "📊 Deployment Information:" -ForegroundColor Cyan
        Write-Host "   Container Registry: $($outputs.container_registry_login_server.value)" -ForegroundColor White
        Write-Host "   Server URL: $($outputs.server_container_app_url.value)" -ForegroundColor White
        Write-Host "   Client URL: $($outputs.client_container_app_url.value)" -ForegroundColor White
        Write-Host "   Key Vault: $($outputs.key_vault_uri.value)" -ForegroundColor White
        
        return $outputs
    }
    catch {
        # If we modified Key Vault access, lock it down again even on failure
        if ($keyVaultName) {
            Write-Host "🔒 Locking down Key Vault access after error..." -ForegroundColor Yellow
            az keyvault update --name $keyVaultName --public-network-access Disabled --default-action Deny
        }
        
        Write-Host "❌ Terraform deployment failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    finally {
        # Return to root directory
        Set-Location -Path ".."
    }
}

# Main deployment process
function Start-Deployment {
    Write-Host "🚀 Starting Azure deployment process..." -ForegroundColor Cyan
    
    # Check prerequisites
    Test-Prerequisites
    
    # Get deployer information
    $deployerInfo = Get-DeployerInfo
    
    # Deploy infrastructure first (to get ACR details)
    Write-Host "🏗️  Deploying infrastructure..." -ForegroundColor Yellow
    $outputs = Deploy-Infrastructure -deployerInfo $deployerInfo
    
    if ($PlanOnly -or $DestroyOnly) {
        return
    }
    
    # Build and push Docker images (unless skipped)
    if (-not $SkipBuild) {
        Build-DockerImages -registryServer $outputs.container_registry_login_server.value
        
        # Re-deploy to update container apps with new images
        Write-Host "🔄 Updating container apps with new images..." -ForegroundColor Yellow
        Deploy-Infrastructure -deployerInfo $deployerInfo
    }
    
    Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Your Voice AI Chat application is now running at:" -ForegroundColor Cyan
    Write-Host "   Client: $($outputs.client_container_app_url.value)" -ForegroundColor White
    Write-Host "   Server: $($outputs.server_container_app_url.value)" -ForegroundColor White
}

# Script execution
try {
    Start-Deployment
}
catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Azure AI Agent Service - Production Deployment Guide

This document provides a step-by-step guide for setting up Azure AI Agent Service evaluation in production environments.

## Quick Setup Checklist

### Prerequisites ✅
- [ ] Azure subscription with appropriate permissions
- [ ] Azure AI Hub created in Azure AI Studio
- [ ] Azure AI Project created and configured
- [ ] Production hosting environment (Azure App Service, Container Apps, etc.)

### Authentication Method Selection

Choose **ONE** of the following authentication methods:

#### Option A: Managed Identity (Recommended for Azure hosting)
- [ ] Enable system-assigned managed identity on your Azure resource
- [ ] Grant managed identity access to Azure AI Hub
- [ ] Set connection string environment variable only

#### Option B: Service Principal (For traditional hosting)
- [ ] Create service principal in Azure AD
- [ ] Generate client secret
- [ ] Grant service principal access to Azure AI Hub  
- [ ] Set tenant ID, client ID, and client secret environment variables

## Step-by-Step Setup

### 1. Azure AI Hub/Project Setup

1. **Go to Azure AI Studio**: https://ai.azure.com
2. **Create or select your AI Hub**
3. **Create or select your AI Project** 
4. **Get connection details**:
   - Navigate to **Settings** > **Connection details**
   - Copy the connection string: `region.api.azureml.ms;subscription-id;resource-group;workspace-name`

### 2A. Managed Identity Setup (Azure hosting)

1. **Enable managed identity**:
   ```powershell
   # For App Service
   az webapp identity assign --name YOUR_APP_NAME --resource-group YOUR_RG
   
   # For Container Apps
   az containerapp identity assign --name YOUR_APP_NAME --resource-group YOUR_RG
   ```

2. **Grant permissions**:
   ```powershell
   # Get the managed identity principal ID
   $principalId = (az webapp identity show --name YOUR_APP_NAME --resource-group YOUR_RG --query principalId -o tsv)
   
   # Grant Cognitive Services User role to your AI Hub
   az role assignment create --assignee $principalId --role "Cognitive Services User" --scope /subscriptions/YOUR_SUB_ID/resourceGroups/YOUR_AI_HUB_RG/providers/Microsoft.CognitiveServices/accounts/YOUR_AI_HUB_NAME
   ```

3. **Set environment variables**:
   ```env
   AZURE_AI_PROJECT_CONNECTION_STRING=region.api.azureml.ms;subscription-id;resource-group;workspace-name
   ```

### 2B. Service Principal Setup (Traditional hosting)

1. **Create service principal**:
   ```powershell
   # Create service principal with Cognitive Services User role
   $sp = az ad sp create-for-rbac --name "voice-ai-chat-eval" --role "Cognitive Services User" --scopes /subscriptions/YOUR_SUBSCRIPTION_ID | ConvertFrom-Json
   
   # Save these values for your environment variables
   Write-Host "Tenant ID: $($sp.tenant)"
   Write-Host "Client ID: $($sp.appId)" 
   Write-Host "Client Secret: $($sp.password)"
   ```

2. **Grant additional permissions to AI Hub**:
   - Go to Azure Portal > Your AI Hub > Access control (IAM)
   - Add role assignment > Cognitive Services User
   - Select your service principal

3. **Set environment variables**:
   ```env
   AZURE_TENANT_ID=your-tenant-id
   AZURE_CLIENT_ID=your-service-principal-client-id
   AZURE_CLIENT_SECRET=your-service-principal-secret
   AZURE_AI_PROJECT_CONNECTION_STRING=region.api.azureml.ms;subscription-id;resource-group;workspace-name
   ```

## Environment Variable Reference

### Required Variables

```env
# Project connection (required for both authentication methods)
AZURE_AI_PROJECT_CONNECTION_STRING=region.api.azureml.ms;subscription-id;resource-group;workspace-name
```

### Service Principal Variables (Option B only)

```env
AZURE_TENANT_ID=12345678-1234-1234-1234-123456789012
AZURE_CLIENT_ID=87654321-4321-4321-4321-210987654321
AZURE_CLIENT_SECRET=your-secret-value-here
```

### Optional Variables

```env
# Alternative to connection string
AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://your-project-name.region.api.azureml.ms

# Custom evaluation agent
AZURE_EVALUATION_AGENT_ID=your-custom-agent-id
```

## Testing Your Setup

### 1. Test Authentication
```powershell
# Test if your app can authenticate
curl https://your-app-url.azurewebsites.net/api/evaluation/test
```

### 2. Test Evaluation
```powershell
# Test evaluation with sample conversation
$body = @{
    messages = @(
        @{ role = "user"; content = "Hello, how are you?" },
        @{ role = "assistant"; content = "I'm doing well, thank you for asking!" }
    )
} | ConvertTo-Json -Depth 3

curl -X POST https://your-app-url.azurewebsites.net/api/evaluation/analyze-simple `
     -H "Content-Type: application/json" `
     -d $body
```

## Troubleshooting Common Issues

### Authentication Errors

**"Unauthorized" or "Forbidden" errors:**
- Verify your managed identity or service principal has the correct role assignments
- Check that the AI Hub resource permissions are correctly configured
- Ensure the connection string format is correct

**"DefaultAzureCredential failed" errors:**
- For managed identity: Verify it's enabled on your Azure resource
- For service principal: Check that all three environment variables are set correctly
- Test authentication locally with `az login` first

### Configuration Errors

**"Project not found" errors:**
- Verify the connection string format: `region.api.azureml.ms;subscription-id;resource-group;workspace-name`
- Check that the AI Hub and Project exist in Azure AI Studio
- Ensure the subscription ID, resource group, and workspace names are correct

**"Agent not available" errors:**
- The Azure AI Agent Service may not be available in your region
- Try using the mock evaluation mode by setting a different configuration
- Check Azure AI Studio for service availability

## Security Best Practices

### For Service Principal Authentication:
- Rotate client secrets regularly (recommended: every 6-12 months)
- Use Azure Key Vault to store secrets instead of environment variables
- Apply principle of least privilege - only grant necessary permissions
- Monitor service principal usage in Azure AD logs

### For Managed Identity Authentication:
- Use system-assigned managed identity when possible
- Regularly review role assignments
- Monitor resource access logs
- Consider using user-assigned managed identity for shared scenarios

### General:
- Enable diagnostic logging for your AI Hub
- Monitor API usage and costs
- Implement proper error handling to avoid exposing sensitive information
- Use HTTPS/TLS for all communications

## Cost Optimization

- Monitor Azure AI Agent Service usage in the Azure portal
- Implement rate limiting in your application
- Consider caching evaluation results for similar conversations
- Set up Azure budgets and alerts for cost management

## Support Resources

- [Azure AI Studio Documentation](https://docs.microsoft.com/azure/ai-studio/)
- [Azure Identity Documentation](https://docs.microsoft.com/azure/developer/intro/azure-developer-identity)
- [Azure AI Agent Service Documentation](https://docs.microsoft.com/azure/ai-services/agent-service/)
- [Managed Identity Documentation](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/)

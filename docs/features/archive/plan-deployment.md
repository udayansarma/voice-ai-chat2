# Azure Container Apps Deployment Plan (Terraform-Based)

This document outlines a step-by-step plan to deploy the Voice AI Chat application to Azure Container Apps using Terraform. Each step is actionable and can be implemented independently.

## Implementation Plan

### 1. Author Terraform Configuration
- Create an `infra/` directory if not already present.
- Author Terraform files in `infra/` to provision:
  - Two Azure Container Apps (for client and server)
  - Azure Container Apps Environment
  - Azure Container Registry
  - Azure Key Vault (for secrets and sensitive config)
  - Azure Application Insights
  - Azure Log Analytics Workspace
- Parameterize environment name, location, and resource group using Terraform variables.
- Define all required environment variables and secrets in Terraform, using Key Vault for sensitive values (see below).
- For non-secret config (like `PORT` or `MESSAGE_WINDOW_SIZE`), use Terraform variables and set them as environment variables in the container app definition.
- Ensure secure connections and managed identity usage for all services.

### 2. Centralize Secrets and Config in Azure Key Vault
- Move all sensitive values (API keys, connection strings) from `.env` files to Azure Key Vault.
- Use Terraform to define Key Vault secrets for:
  - `AZURE_OPENAI_ENDPOINT`
  - `AZURE_OPENAI_KEY`
  - `AZURE_OPENAI_DEPLOYMENT`
  - `AZURE_OPENAI_MODEL`
  - `AZURE_SPEECH_KEY`
  - `AZURE_SPEECH_REGION`
  - `AZURE_AI_PROJECT_CONNECTION_STRING`
  - `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT`
  - `AZURE_EVALUATION_AGENT_ID`
- In your Terraform `azurerm_container_app` resources, use the `secret` and `env` blocks to inject values from Key Vault.

### 3. Initialize and Validate Terraform
- Open a terminal and navigate to the `infra/` directory.
- Run `terraform init` to initialize the working directory.
- Run `terraform validate` to check the configuration for errors.

### 4. Plan and Apply Infrastructure Changes
- Run `terraform plan` to review the changes that will be made.
- Run `terraform apply -auto-approve` to provision the resources in Azure.
- Ensure your deployment pipeline populates Key Vault with the correct values before running `terraform apply`.

### 5. Build and Push Application Containers
- Build Docker images for both client and server.
- Push images to the Azure Container Registry provisioned by Terraform.
- Update Container App definitions with the correct image tags if needed.

### 6. Remove Local .env Dependency in Production
- Update your Node.js config loader to support reading from environment variables (as set by Azure) and fallback to `.env` only for local development.

### 7. Post-Deployment Validation & Monitoring
- Validate the deployment by accessing the application endpoints.
- Check logs and metrics in Application Insights and Log Analytics.
- Confirm secure storage of secrets in Key Vault and proper connectivity between services.

---

**Notes:**
- You cannot use `azd up` for end-to-end provisioning and deployment with Terraform. Use the Terraform CLI for infrastructure and separate scripts or CI/CD for application deployment.
- Always follow [Terraform style guide](https://developer.hashicorp.com/terraform/language/style) and best practices.
- Use managed identities and Key Vault for secrets; never hardcode credentials.
- Restrict network access to only what is necessary.
- Enable logging and monitoring for all services.

**Next Steps:**
Begin with Step 1: authoring the Terraform files in the `infra/` directory.

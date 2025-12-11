# Azure Container Apps Deployment: Docker, ACR, Managed Identity, and Networking

## Table of Contents
1. [Overview & Prerequisites](#overview--prerequisites)
2. [Building Images for Azure Container Apps](#building-images-for-azure-container-apps)
3. [Configuring Azure Container Registry (ACR)](#configuring-azure-container-registry-acr)
4. [Terraform Patterns: Container Apps & Managed Identity](#terraform-patterns-container-apps--managed-identity)
5. [Internal & Public Networking Patterns](#internal--public-networking-patterns)
6. [Custom Domains & Certificates](#custom-domains--certificates)
7. [Troubleshooting & Best Practices](#troubleshooting--best-practices)
8. [References](#references)

---

## 1. Overview & Prerequisites

This guide covers best practices for deploying this project to Azure Container Apps using Docker images stored in Azure Container Registry (ACR), with secure configuration via Azure Key Vault and managed identity authentication. It includes patterns for networking, secret management, and troubleshooting.

**Prerequisites:**
- Azure CLI installed and logged in
- Terraform installed
- Sufficient Azure permissions to create resources and assign roles

---

## 2. Building Images for Azure Container Apps

Azure Container Apps require images built for the `linux/amd64` platform. To ensure compatibility, build your images directly on Azure Container Registry (ACR):

```powershell
az acr build --registry <your-acr-name> --image <image-name>:<tag> --platform linux/amd64 .
```
- Replace `<your-acr-name>`, `<image-name>`, and `<tag>` as appropriate.
- Example:
  ```powershell
  az acr build --registry devacrmllvl0 --image client:latest --platform linux/amd64 .
  ```

---

## 3. Configuring Azure Container Registry (ACR)

To allow Azure Container Apps to pull images from ACR using managed identity, enable authentication-as-ARM on your ACR:

```powershell
az acr config authentication-as-arm update \
  --name <your-acr-name> \
  --status enabled
```
- Replace `<your-acr-name>` with your actual ACR name.
- This step is required for managed identity authentication to work with Container Apps.

---

## 4. Terraform Patterns: Container Apps & Managed Identity

### Required `registry` Block for Managed Identity

Add the following `registry` block to each `azurerm_container_app` resource in your Terraform configuration:

```hcl
registry {
  server   = azurerm_container_registry.acr.login_server
  identity = azurerm_user_assigned_identity.shared.id
}
```
- `server`: The login server URL of your ACR (e.g., `myregistry.azurecr.io`).
- `identity`: The resource ID of the user-assigned managed identity that has the `AcrPull` role on the ACR.

**Additional Requirements:**
- The managed identity must be assigned to the container app via the `identity` block.
- The managed identity must have the `AcrPull` role on the ACR.
- No username/password or admin credentials are required.
- Do **not** use the deprecated `secrets` or `registries` blocks.

#### Example
```hcl
resource "azurerm_container_app" "client" {
  # ...existing code...
  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.shared.id]
  }
  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.shared.id
  }
  # ...template, secrets, etc...
}
```

---

## 5. Internal & Public Networking Patterns

### Internal Communication Between Container Apps
- Container Apps in the same environment can communicate over internal DNS: `<app-name>.<environment-name>.internal`.
- Example: If your server app is `dev-server` and your environment is `voice-ai-chat-cae`, the client can reach the server at:
  ```
  http://dev-server.voice-ai-chat-cae.internal:3000
  ```
- No public ingress is required for internal communication.

### Public Access Patterns
To expose an app to the public, add an `ingress` block with `external_enabled = true`:

```hcl
ingress {
  external_enabled            = true
  target_port                = 5173 # or your app's internal port
  transport                  = "auto"
  allow_insecure_connections = false
  traffic_weight {
    latest_revision = true
    percentage      = 100
  }
}
```
- This exposes your app publicly on `https://...` (port 443), forwarding to the specified port in your container.
- Azure handles TLS termination automatically.

#### Restricting Public Access
- Set `external_enabled = false` for internal-only access, or use Azure networking features (IP restrictions, private endpoints, or Application Gateway/WAF).

---

## 6. Custom Domains & Certificates

- Map a custom domain and upload a certificate using the `azurerm_container_app_custom_domain` and `azurerm_container_app_environment_certificate` resources.
- Azure will handle HTTPS for your custom domain as well.

---

## 7. Troubleshooting & Best Practices

- If you see `UNAUTHORIZED: authentication required` errors, ensure the managed identity is correctly assigned and has the `AcrPull` role, and that the `registry` block is present.
- Allow time for RBAC assignments to propagate (consider a `time_sleep` delay in Terraform).
- Always use the latest Azure CLI and Terraform provider versions.
- Review Azure documentation for updates to Container Apps, ACR, and Key Vault integration.

---

## 8. References
- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [Azure Container Registry Documentation](https://learn.microsoft.com/azure/container-registry/)
- [Terraform AzureRM Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)

---

_Last updated: June 2025_
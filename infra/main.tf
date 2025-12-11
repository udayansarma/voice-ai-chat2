# Removed duplicate terraform, provider, data, and variable blocks. See versions.tf, provider.tf, and variables.tf for these definitions.

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
}

# Container Registry
resource "random_string" "acr_suffix" {
  length  = 6
  upper   = false
  special = false
}

resource "azurerm_container_registry" "acr" {
  name                = "${var.environment_name}acr${random_string.acr_suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  sku                 = "Standard"
  admin_enabled       = true
}

# Key Vault
resource "azurerm_key_vault" "kv" {
  name                      = "${var.environment_name}kv${random_string.acr_suffix.result}"
  location                  = var.location
  resource_group_name       = azurerm_resource_group.main.name
  tenant_id                 = data.azurerm_client_config.current.tenant_id
  sku_name                  = "standard"
  purge_protection_enabled  = true
  enable_rbac_authorization = false
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "log" {
  name                = "${var.environment_name}log"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Application Insights
resource "azurerm_application_insights" "ai" {
  name                = "${var.environment_name}ai"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.log.id
  application_type    = "web"
}

# Storage Account for persistent database storage
resource "random_string" "storage_suffix" {
  length  = 6
  upper   = false
  special = false
}

resource "azurerm_storage_account" "voice_ai_storage" {
  name                     = "${var.environment_name}st${random_string.storage_suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = {
    Environment = var.environment_name
    Purpose     = "SQLite Database Storage"
  }
}

resource "azurerm_storage_container" "blob_container" {
  name                  = "data"
  storage_account_name  = azurerm_storage_account.voice_ai_storage.name
  container_access_type = "private"
  depends_on            = [azurerm_storage_account.voice_ai_storage]
}

# Database backups blob container
resource "azurerm_storage_container" "database_backups" {
  name                  = "database-backups"
  storage_account_name  = azurerm_storage_account.voice_ai_storage.name
  container_access_type = "private"
  depends_on            = [azurerm_storage_account.voice_ai_storage]
}



# Container Apps Environment
resource "azurerm_container_app_environment" "cae" {
  name                       = "${var.environment_name}cae"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.log.id
}



# Create a user-assigned managed identity
resource "azurerm_user_assigned_identity" "shared" {
  name                = "${var.environment_name}-shared-identity"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
}

resource "azurerm_key_vault_access_policy" "shared" {
  key_vault_id       = azurerm_key_vault.kv.id
  tenant_id          = data.azurerm_client_config.current.tenant_id
  object_id          = azurerm_user_assigned_identity.shared.principal_id
  secret_permissions = ["Get", "List"]
  depends_on         = [azurerm_user_assigned_identity.shared]
}

resource "azurerm_role_assignment" "shared_acr_pull" {
  principal_id         = azurerm_user_assigned_identity.shared.principal_id
  role_definition_name = "AcrPull"
  scope                = azurerm_container_registry.acr.id
  depends_on           = [azurerm_user_assigned_identity.shared, azurerm_container_registry.acr]
}

# Role assignment for Azure Blob Storage access
resource "azurerm_role_assignment" "shared_storage_blob_data_contributor" {
  principal_id         = azurerm_user_assigned_identity.shared.principal_id
  role_definition_name = "Storage Blob Data Contributor"
  scope                = azurerm_storage_account.voice_ai_storage.id
  depends_on           = [azurerm_user_assigned_identity.shared, azurerm_storage_account.voice_ai_storage]
}



# Alternative: Storage Account Contributor for broader access
resource "azurerm_role_assignment" "shared_storage_account_contributor" {
  principal_id         = azurerm_user_assigned_identity.shared.principal_id
  role_definition_name = "Storage Account Contributor"
  scope                = azurerm_storage_account.voice_ai_storage.id
  depends_on           = [azurerm_user_assigned_identity.shared, azurerm_storage_account.voice_ai_storage]
}

# Add a delay to allow RBAC propagation for AcrPull role assignment
resource "time_sleep" "acr_rbac_propagation" {
  depends_on      = [azurerm_role_assignment.shared_acr_pull]
  create_duration = "120s"
}

# Add a delay to allow RBAC propagation for storage role assignments
resource "time_sleep" "storage_rbac_propagation" {
  depends_on = [
    azurerm_role_assignment.shared_storage_blob_data_contributor,
    azurerm_role_assignment.shared_storage_account_contributor
  ]
  create_duration = "60s"
}

# Client Container App
resource "azurerm_container_app" "client" {
  name                         = "${var.environment_name}-client"
  container_app_environment_id = azurerm_container_app_environment.cae.id
  resource_group_name          = var.resource_group_name

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.shared.id]
  }

  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.shared.id
  }

  revision_mode = "Single"

  secret {
    name  = "azure-openai-endpoint"
    value = azurerm_key_vault_secret.azure_openai_endpoint.value
  }
  secret {
    name  = "azure-openai-key"
    value = azurerm_key_vault_secret.azure_openai_key.value
  }
  secret {
    name  = "azure-openai-deployment"
    value = azurerm_key_vault_secret.azure_openai_deployment.value
  }
  secret {
    name  = "azure-openai-model"
    value = azurerm_key_vault_secret.azure_openai_model.value
  }
  secret {
    name  = "azure-speech-key"
    value = azurerm_key_vault_secret.azure_speech_key.value
  }
  secret {
    name  = "azure-speech-region"
    value = azurerm_key_vault_secret.azure_speech_region.value
  }
  secret {
    name  = "azure-ai-foundry-project-endpoint"
    value = azurerm_key_vault_secret.azure_ai_foundry_project_endpoint.value
  }
  secret {
    name  = "azure-evaluation-agent-id"
    value = azurerm_key_vault_secret.azure_evaluation_agent_id.value
  }

  template {
    container {
      name   = "client"
      image  = "${azurerm_container_registry.acr.login_server}/client:${var.client_image_tag}"
      cpu    = 0.5
      memory = "1.0Gi"
      env {
        name  = "PORT"
        value = "5173"
      }
      env {
        name  = "VITE_API_URL"
        value = var.vite_api_url
      }
    }
    min_replicas = 1
    max_replicas = 2
  }

  ingress {
    external_enabled           = true
    target_port                = 80
    transport                  = "auto"
    allow_insecure_connections = false
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  depends_on = [time_sleep.acr_rbac_propagation]
}

# Server Container App
resource "azurerm_container_app" "server" {
  name                         = "${var.environment_name}-server"
  container_app_environment_id = azurerm_container_app_environment.cae.id
  resource_group_name          = var.resource_group_name

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.shared.id]
  }

  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.shared.id
  }

  revision_mode = "Single"

  secret {
    name  = "azure-openai-endpoint"
    value = azurerm_key_vault_secret.azure_openai_endpoint.value
  }
  secret {
    name  = "azure-openai-key"
    value = azurerm_key_vault_secret.azure_openai_key.value
  }
  secret {
    name  = "azure-openai-deployment"
    value = azurerm_key_vault_secret.azure_openai_deployment.value
  }
  secret {
    name  = "azure-openai-model"
    value = azurerm_key_vault_secret.azure_openai_model.value
  }
  secret {
    name  = "azure-speech-key"
    value = azurerm_key_vault_secret.azure_speech_key.value
  }
  secret {
    name  = "azure-speech-region"
    value = azurerm_key_vault_secret.azure_speech_region.value
  }
  secret {
    name  = "azure-ai-foundry-project-endpoint"
    value = azurerm_key_vault_secret.azure_ai_foundry_project_endpoint.value
  }
  secret {
    name  = "azure-evaluation-agent-id"
    value = azurerm_key_vault_secret.azure_evaluation_agent_id.value
  }

  template {
    container {
      name   = "server"
      image  = "${azurerm_container_registry.acr.login_server}/server:${var.server_image_tag}"
      cpu    = 0.5
      memory = "1.0Gi"

      env {
        name  = "PORT"
        value = "5000"
      }
      env {
        name  = "USE_SEED_DATA_MODE"
        value = "true"
      }
      env {
        name  = "DATABASE_PATH"
        value = "/app/voice-ai-documents.db"
      }
      env {
        name        = "AZURE_OPENAI_ENDPOINT"
        secret_name = "azure-openai-endpoint"
      }
      env {
        name        = "AZURE_OPENAI_KEY"
        secret_name = "azure-openai-key"
      }
      env {
        name        = "AZURE_OPENAI_DEPLOYMENT"
        secret_name = "azure-openai-deployment"
      }
      env {
        name        = "AZURE_OPENAI_MODEL"
        secret_name = "azure-openai-model"
      }
      env {
        name        = "AZURE_SPEECH_KEY"
        secret_name = "azure-speech-key"
      }
      env {
        name        = "AZURE_SPEECH_REGION"
        secret_name = "azure-speech-region"
      }
      env {
        name        = "AZURE_AI_FOUNDRY_PROJECT_ENDPOINT"
        secret_name = "azure-ai-foundry-project-endpoint"
      }
      env {
        name        = "AZURE_EVALUATION_AGENT_ID"
        secret_name = "azure-evaluation-agent-id"
      }      
      env {
        name  = "MESSAGE_WINDOW_SIZE"
        value = "20"
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "AUTH_ENABLED"
        value = "true"
      }
      env {
        name  = "SESSION_SECRET"
        value = "e3088c150a170f9ed9479856938b206b4f8a02fb4a409a53a80a5af224d6a7de"
      }
      env {
        name  = "AUTH_USERS"
        value = "[{\"username\":\"demo\",\"password\":\"demo123\"}]"
      }
      env {
        name  = "AZURE_STORAGE_ACCOUNT_NAME"
        value = azurerm_storage_account.voice_ai_storage.name
      }
      env {
        name  = "CONTAINER_APP_NAME"
        value = "${var.environment_name}-server"
      }
      env {
        name  = "AZURE_CLIENT_ID"
        value = azurerm_user_assigned_identity.shared.client_id
      }
      env {
        name  = "SKIP_RESTORE"
        value = "false"
      }
    }
    min_replicas = 1
    max_replicas = 2
  }
  depends_on = [time_sleep.acr_rbac_propagation, time_sleep.storage_rbac_propagation]

  ingress {
    external_enabled           = true
    target_port                = 3000
    transport                  = "auto"
    allow_insecure_connections = false
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }
}

resource "azurerm_key_vault_access_policy" "deployer" {
  key_vault_id       = azurerm_key_vault.kv.id
  tenant_id          = data.azurerm_client_config.current.tenant_id
  object_id          = var.deployer_object_id
  secret_permissions = ["Get", "List", "Set", "Delete"]
  depends_on         = [azurerm_key_vault.kv, azurerm_container_registry.acr]
}

# Key Vault Secrets (names must be lowercase, alphanumeric, and dashes only)
resource "azurerm_key_vault_secret" "azure_openai_endpoint" {
  name         = "azure-openai-endpoint"
  value        = var.azure_openai_endpoint
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}
resource "azurerm_key_vault_secret" "azure_openai_key" {
  name         = "azure-openai-key"
  value        = var.azure_openai_key
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}
resource "azurerm_key_vault_secret" "azure_openai_deployment" {
  name         = "azure-openai-deployment"
  value        = var.azure_openai_deployment
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}
resource "azurerm_key_vault_secret" "azure_openai_model" {
  name         = "azure-openai-model"
  value        = var.azure_openai_model
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}
resource "azurerm_key_vault_secret" "azure_speech_key" {
  name         = "azure-speech-key"
  value        = var.azure_speech_key
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}
resource "azurerm_key_vault_secret" "azure_speech_region" {
  name         = "azure-speech-region"
  value        = var.azure_speech_region
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}
resource "azurerm_key_vault_secret" "azure_ai_foundry_project_endpoint" {
  name         = "azure-ai-foundry-project-endpoint"
  value        = var.azure_ai_foundry_project_endpoint
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}
resource "azurerm_key_vault_secret" "azure_evaluation_agent_id" {
  name         = "azure-evaluation-agent-id"
  value        = var.azure_evaluation_agent_id
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}

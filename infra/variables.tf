variable "resource_group_name" {
  description = "Name of the resource group."
  type        = string
}

variable "location" {
  description = "Azure region for resources."
  type        = string
  default     = "eastus"
}

variable "environment_name" {
  description = "Deployment environment name (e.g., dev, prod)."
  type        = string
}

variable "azure_openai_endpoint" {
  description = "Azure OpenAI endpoint URL."
  type        = string
}

variable "azure_openai_key" {
  description = "Azure OpenAI API key."
  type        = string
  sensitive   = true
}

variable "azure_openai_deployment" {
  description = "Azure OpenAI deployment name."
  type        = string
}

variable "azure_openai_model" {
  description = "Azure OpenAI model name."
  type        = string
}

variable "azure_speech_key" {
  description = "Azure Speech API key."
  type        = string
  sensitive   = true
}

variable "azure_speech_region" {
  description = "Azure Speech region."
  type        = string
}

variable "azure_ai_foundry_project_endpoint" {
  description = "Azure AI Foundry project endpoint."
  type        = string
}

variable "azure_evaluation_agent_id" {
  description = "Azure Evaluation Agent ID."
  type        = string
}

variable "subscription_id" {
  description = "Azure Subscription ID."
  type        = string
}

variable "client_image_tag" {
  description = "Tag for the client Docker image"
  type        = string
  default     = "latest"
}

variable "server_image_tag" {
  description = "Tag for the server Docker image"
  type        = string
  default     = "latest"
}

variable "deployer_user_principal_name" {
  description = "Azure AD user principal name (email) for the deployment user to grant Key Vault access."
  type        = string
}

variable "deployer_object_id" {
  description = "Object ID for the deployment user or service principal to grant Key Vault access."
  type        = string
}

variable "database_storage_quota_gb" {
  description = "Storage quota in GB for the SQLite database file share."
  type        = number
  default     = 5
}

variable "deployer_ip_address" {
  description = "IP address of the deployer to allow Key Vault access during deployment"
  type        = string
  default     = null
}

variable "vite_api_url" {
  description = "API URL for the Vite client application."
  type        = string
}

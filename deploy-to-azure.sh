#!/bin/bash

# Automated deployment script for Azure Container Apps
# This script automates the deployment of Entra ACR Management to Azure Container Apps

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

print_info "Starting deployment to Azure Container Apps..."

# Prompt for configuration if not set
read -p "Enter Resource Group name (default: entra-acr-rg): " RESOURCE_GROUP
RESOURCE_GROUP=${RESOURCE_GROUP:-entra-acr-rg}

read -p "Enter Azure region (default: eastus): " LOCATION
LOCATION=${LOCATION:-eastus}

read -p "Enter Azure Container Registry name (default: entraacrreg): " ACR_NAME
ACR_NAME=${ACR_NAME:-entraacrreg}

read -p "Enter Container App Environment name (default: entra-acr-env): " CONTAINER_APP_ENV
CONTAINER_APP_ENV=${CONTAINER_APP_ENV:-entra-acr-env}

read -p "Enter Container App name (default: entra-acr-app): " CONTAINER_APP_NAME
CONTAINER_APP_NAME=${CONTAINER_APP_NAME:-entra-acr-app}

# Prompt for application configuration
print_info "Enter your Azure AD configuration:"
read -p "Tenant ID: " TENANT_ID
read -p "Client ID: " CLIENT_ID
read -sp "Client Secret: " CLIENT_SECRET
echo
read -sp "Session Secret (random string): " SESSION_SECRET
echo

if [ -z "$TENANT_ID" ] || [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$SESSION_SECRET" ]; then
    print_error "All configuration values are required."
    exit 1
fi

# Check if logged in to Azure
print_info "Checking Azure login status..."
if ! az account show &> /dev/null; then
    print_warning "Not logged in to Azure. Please log in."
    az login
fi

# Install Container Apps extension if not installed
print_info "Checking for Container Apps extension..."
if ! az extension show --name containerapp &> /dev/null; then
    print_info "Installing Container Apps extension..."
    az extension add --name containerapp --upgrade
fi

# Register provider
print_info "Registering Microsoft.App provider..."
az provider register --namespace Microsoft.App --wait

# Create resource group
print_info "Creating resource group: $RESOURCE_GROUP..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# Create Azure Container Registry
print_info "Creating Azure Container Registry: $ACR_NAME..."
if ! az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    az acr create \
      --resource-group "$RESOURCE_GROUP" \
      --name "$ACR_NAME" \
      --sku Basic \
      --admin-enabled true \
      --output none
else
    print_warning "ACR $ACR_NAME already exists, skipping creation."
fi

# Build and push container image
print_info "Building and pushing container image..."
az acr build \
  --registry "$ACR_NAME" \
  --image entra-acr:latest \
  --file Dockerfile . \
  --output none

print_info "Image built and pushed successfully."

# Create Container Apps environment
print_info "Creating Container Apps environment: $CONTAINER_APP_ENV..."
if ! az containerapp env show --name "$CONTAINER_APP_ENV" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    az containerapp env create \
      --name "$CONTAINER_APP_ENV" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$LOCATION" \
      --output none
else
    print_warning "Container Apps environment $CONTAINER_APP_ENV already exists, skipping creation."
fi

# Get ACR credentials
print_info "Retrieving ACR credentials..."
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query passwords[0].value -o tsv)
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)

# Determine the app URL (will be available after creation)
APP_URL="${CONTAINER_APP_NAME}.${LOCATION}.azurecontainerapps.io"
REDIRECT_URI="https://${APP_URL}/auth/redirect"

# Deploy or update container app
print_info "Deploying container app: $CONTAINER_APP_NAME..."
if ! az containerapp show --name "$CONTAINER_APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    # Create new container app
    az containerapp create \
      --name "$CONTAINER_APP_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --environment "$CONTAINER_APP_ENV" \
      --image "${ACR_LOGIN_SERVER}/entra-acr:latest" \
      --registry-server "$ACR_LOGIN_SERVER" \
      --registry-username "$ACR_USERNAME" \
      --registry-password "$ACR_PASSWORD" \
      --target-port 3000 \
      --ingress external \
      --env-vars \
        "TENANT_ID=${TENANT_ID}" \
        "CLIENT_ID=${CLIENT_ID}" \
        "CLIENT_SECRET=secretref:client-secret" \
        "REDIRECT_URI=${REDIRECT_URI}" \
        "PORT=3000" \
        "SESSION_SECRET=secretref:session-secret" \
        "AUTHORITY=https://login.microsoftonline.com/" \
        "GRAPH_API_ENDPOINT=https://graph.microsoft.com/" \
        "API_SCOPES=https://graph.microsoft.com/.default" \
      --secrets \
        "client-secret=${CLIENT_SECRET}" \
        "session-secret=${SESSION_SECRET}" \
      --min-replicas 1 \
      --max-replicas 3 \
      --cpu 0.5 \
      --memory 1Gi \
      --output none
else
    # Update existing container app
    print_warning "Container app $CONTAINER_APP_NAME already exists, updating..."
    az containerapp update \
      --name "$CONTAINER_APP_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --image "${ACR_LOGIN_SERVER}/entra-acr:latest" \
      --output none
fi

# Get the actual application URL
ACTUAL_APP_URL=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn \
  -o tsv)

print_info "Deployment completed successfully!"
echo
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo "Resource Group: $RESOURCE_GROUP"
echo "Container Registry: $ACR_NAME"
echo "Container App: $CONTAINER_APP_NAME"
echo
echo "Application URL: https://${ACTUAL_APP_URL}"
echo "Admin Interface: https://${ACTUAL_APP_URL}/admin/signin"
echo "User Interface: https://${ACTUAL_APP_URL}/user"
echo
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo "1. Update your Azure AD app registration:"
echo "   - Go to Azure Portal > App registrations"
echo "   - Add redirect URI: https://${ACTUAL_APP_URL}/auth/redirect"
echo "2. Navigate to: https://${ACTUAL_APP_URL}"
echo "3. Sign in as admin and configure authentication contexts"
echo
print_info "Deployment complete!"

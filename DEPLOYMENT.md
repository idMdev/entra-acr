# Azure Container Services Deployment Guide

This guide provides step-by-step instructions for deploying the Entra ACR Management application to Azure Container Services (Azure Container Apps or Azure Container Instances).

## Important: Port Configuration

**For production deployment on Azure Container Services:**
- The container runs internally on port 3000
- Azure Container Apps/Instances automatically exposes the service on **HTTPS port 443** externally via ingress
- All redirect URIs must use **HTTPS** (e.g., `https://your-app.azurecontainerapps.io/auth/redirect`)
- The PORT environment variable should be set to 3000 (internal container port)
- External users access the application on HTTPS port 443 (no need to specify port in URL)

## Prerequisites

- Azure subscription
- Azure CLI installed and configured
- Docker installed locally (for testing)
- Azure AD app registration completed (see README.md)

## Option 1: Azure Container Apps (Recommended)

Azure Container Apps is a serverless container platform that automatically handles scaling, load balancing, and certificate management.

### 1. Install Azure Container Apps Extension

```bash
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
```

### 2. Set Environment Variables

```bash
# Azure configuration
export RESOURCE_GROUP="entra-acr-rg"
export LOCATION="eastus"
export ACR_NAME="entraacrreg"
export CONTAINER_APP_ENV="entra-acr-env"
export CONTAINER_APP_NAME="entra-acr-app"

# Application configuration (from your .env file)
export TENANT_ID="your-tenant-id"
export CLIENT_ID="your-client-id"
export CLIENT_SECRET="your-client-secret"
export SESSION_SECRET="your-random-session-secret"
```

### 3. Create Resource Group

```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### 4. Create Azure Container Registry

```bash
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true
```

### 5. Build and Push Container Image

```bash
# Log in to ACR
az acr login --name $ACR_NAME

# Build and push image
az acr build \
  --registry $ACR_NAME \
  --image entra-acr:latest \
  --file Dockerfile .
```

### 6. Create Container Apps Environment

```bash
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### 7. Deploy Container App

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)

# Create container app
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image "${ACR_LOGIN_SERVER}/entra-acr:latest" \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --env-vars \
    "TENANT_ID=${TENANT_ID}" \
    "CLIENT_ID=${CLIENT_ID}" \
    "CLIENT_SECRET=secretref:client-secret" \
    "REDIRECT_URI=https://${CONTAINER_APP_NAME}.${LOCATION}.azurecontainerapps.io/auth/redirect" \
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
  --memory 1Gi
```

### 8. Get Application URL

```bash
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  -o tsv
```

### 9. Update Azure AD Redirect URI

1. Go to [Azure Portal](https://portal.azure.com) > Azure Active Directory > App registrations
2. Select your app registration
3. Go to "Authentication"
4. Add the new redirect URI: `https://<your-app-url>/auth/redirect`
5. Save the changes

## Option 2: Azure Container Instances (ACI)

For simpler deployments without auto-scaling requirements.

**Note**: Azure Container Instances does not provide automatic HTTPS/SSL termination like Container Apps. For production use with HTTPS on port 443, you need to:
- Deploy Application Gateway or Azure Front Door in front of ACI
- Use Container Apps (Option 1) which provides automatic HTTPS

The example below shows HTTP deployment for development/testing purposes only.

### 1. Create Azure Container Registry (if not already created)

Follow steps 3-5 from Option 1.

### 2. Deploy Container Instance

```bash
# Set environment variables
export RESOURCE_GROUP="entra-acr-rg"
export LOCATION="eastus"
export ACI_NAME="entra-acr-aci"
export ACR_NAME="entraacrreg"

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)

# Create container instance
az container create \
  --resource-group $RESOURCE_GROUP \
  --name $ACI_NAME \
  --image "${ACR_LOGIN_SERVER}/entra-acr:latest" \
  --registry-login-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label $ACI_NAME \
  --ports 3000 \
  --environment-variables \
    "TENANT_ID=${TENANT_ID}" \
    "CLIENT_ID=${CLIENT_ID}" \
    "REDIRECT_URI=http://${ACI_NAME}.${LOCATION}.azurecontainer.io:3000/auth/redirect" \
    "PORT=3000" \
    "AUTHORITY=https://login.microsoftonline.com/" \
    "GRAPH_API_ENDPOINT=https://graph.microsoft.com/" \
    "API_SCOPES=https://graph.microsoft.com/.default" \
  --secure-environment-variables \
    "CLIENT_SECRET=${CLIENT_SECRET}" \
    "SESSION_SECRET=${SESSION_SECRET}" \
  --cpu 1 \
  --memory 1
```

### 3. Get Container Instance URL

```bash
az container show \
  --resource-group $RESOURCE_GROUP \
  --name $ACI_NAME \
  --query ipAddress.fqdn \
  -o tsv
```

## Automated Deployment Script

A convenience script is provided for automated deployment to Azure Container Apps:

```bash
chmod +x deploy-to-azure.sh
./deploy-to-azure.sh
```

## Testing the Deployment

1. Navigate to the application URL
2. Click "Admin" to access the admin interface
3. Sign in with your Entra ID credentials
4. Verify that authentication contexts are displayed
5. Select contexts and save

## Monitoring and Logs

### Azure Container Apps

```bash
# View logs
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --follow

# View metrics
az monitor metrics list \
  --resource "/subscriptions/<subscription-id>/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.App/containerApps/${CONTAINER_APP_NAME}"
```

### Azure Container Instances

```bash
# View logs
az container logs \
  --resource-group $RESOURCE_GROUP \
  --name $ACI_NAME \
  --follow
```

## Updating the Application

### Azure Container Apps

```bash
# Build new image
az acr build \
  --registry $ACR_NAME \
  --image entra-acr:latest \
  --file Dockerfile .

# Update container app (will automatically pull new image)
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP
```

### Azure Container Instances

```bash
# Delete old instance
az container delete \
  --resource-group $RESOURCE_GROUP \
  --name $ACI_NAME \
  --yes

# Deploy new instance (follow steps from Option 2)
```

## Troubleshooting

### Issue: Authentication fails

**Solution**: Verify that:
- The redirect URI in Azure AD matches the deployed app URL
- Environment variables are correctly set
- Client secret is valid and not expired

### Issue: Cannot fetch authentication contexts

**Solution**: Verify that:
- The app registration has `Policy.Read.ConditionalAccess` permission
- Admin consent has been granted for the permissions
- The client credentials flow is working correctly

### Issue: Container fails to start

**Solution**: Check container logs:
```bash
az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP
```

Common issues:
- Missing or incorrect environment variables
- Port conflicts
- Image build failures

## Security Best Practices

1. **Use Managed Identity**: For production, consider using Azure Managed Identity instead of client secrets
2. **Enable HTTPS**: Always use HTTPS in production (Container Apps provides this automatically)
3. **Rotate Secrets**: Regularly rotate client secrets and session secrets
4. **Use Key Vault**: Store secrets in Azure Key Vault and reference them in Container Apps
5. **Network Security**: Configure virtual networks and firewall rules as needed
6. **Monitor**: Set up Application Insights for monitoring and diagnostics

## Cost Optimization

- **Container Apps**: Uses consumption-based pricing; scale to zero when not in use
- **Container Registry**: Use Basic SKU for development, Standard for production
- **Container Instances**: Billed per second; good for always-on workloads

## Additional Resources

- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [Azure Container Instances Documentation](https://learn.microsoft.com/azure/container-instances/)
- [Azure Container Registry Documentation](https://learn.microsoft.com/azure/container-registry/)
- [Microsoft Identity Platform Documentation](https://learn.microsoft.com/entra/identity-platform/)

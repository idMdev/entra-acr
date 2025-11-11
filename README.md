# Entra ACR Management

Web application that supports Entra Conditional Access authentication context with an admin interface that configures ACR.

## Features

### Admin Interface
- Sign in with Entra ID work/school account using OAuth 2.0 authorization code flow
- Retrieve access tokens using service-to-service API calls to Entra ID
- Fetch and display authentication contexts configured in Entra ID
- Select and save authentication context configurations locally

### User Interface
- View configured authentication contexts (placeholder for future implementation)

## Prerequisites

- Node.js 16+ and npm
- Azure AD (Entra ID) tenant
- Azure AD application registration with appropriate permissions

## Azure AD App Registration Setup

1. Go to [Azure Portal](https://portal.azure.com) > Azure Active Directory > App registrations
2. Click "New registration"
3. Configure the application:
   - **Name**: Entra ACR Management
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Web - `https://your-app-url/auth/redirect` (for production) or `http://localhost:3000/auth/redirect` (for local development)
4. After registration, note the **Application (client) ID** and **Directory (tenant) ID**
5. Go to "Certificates & secrets":
   - Create a new client secret
   - Note the secret value immediately (it won't be shown again)
6. Go to "API permissions":
   - Add the following Microsoft Graph permissions:
     - `User.Read` (Delegated)
     - `Policy.Read.ConditionalAccess` (Application)
   - Grant admin consent for these permissions

## Installation

1. Clone the repository:
```bash
git clone https://github.com/idMdev/entra-acr.git
cd entra-acr
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Edit `.env` file with your Azure AD configuration:
```env
TENANT_ID=your-tenant-id
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
REDIRECT_URI=https://your-app-url/auth/redirect
PORT=3000
SESSION_SECRET=your-random-session-secret
```

**Note**: For local development, you can use `http://localhost:3000/auth/redirect` as the redirect URI. For production deployment on Azure Container Services, use HTTPS redirect URI (e.g., `https://your-app.azurecontainerapps.io/auth/redirect`). The container runs internally on port 3000, but Azure Container Apps exposes it externally on HTTPS port 443.

## Running the Application

### Local Development

Start the server:
```bash
npm start
```

The application will be available at:
- Main page: http://localhost:3000
- Admin interface: http://localhost:3000/admin/signin
- User interface: http://localhost:3000/user

**Note**: For local development, use `PORT=3000` and `http://localhost:3000/auth/redirect` in your `.env` file.

### Production Deployment

For production deployment to Azure Container Services, the application runs on HTTPS port 443. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Project Structure

```
entra-acr/
├── config/
│   └── config.js              # Application configuration
├── src/
│   ├── middleware/
│   │   └── auth.js            # Authentication middleware
│   ├── routes/
│   │   ├── admin.js           # Admin routes
│   │   └── user.js            # User routes
│   └── services/
│       ├── authService.js     # MSAL authentication service
│       ├── graphService.js    # Microsoft Graph API service
│       └── storageService.js  # Local storage service
├── views/
│   ├── admin/
│   │   ├── signin.ejs         # Admin sign-in page
│   │   └── dashboard.ejs      # Admin dashboard
│   ├── user/
│   │   └── index.ejs          # User interface
│   ├── index.ejs              # Home page
│   └── error.ejs              # Error page
├── public/
│   └── css/
│       └── style.css          # Stylesheet
├── data/
│   └── auth-contexts.json     # Stored authentication contexts
├── index.js                   # Main application entry point
├── package.json               # Dependencies and scripts
└── .env                       # Environment variables (not in git)
```

## Authentication Flow

1. Admin clicks "Sign in with Microsoft" on the admin sign-in page
2. User is redirected to Microsoft login page
3. After successful authentication, Microsoft redirects back with authorization code
4. Application exchanges authorization code for ID token and access token
5. Application uses client credentials flow to get a service-to-service access token
6. Service token is used to fetch authentication contexts from Microsoft Graph API
7. Admin selects desired contexts and saves them locally

## API Endpoints

### Admin Routes
- `GET /admin/signin` - Admin sign-in page
- `GET /admin/signin/initiate` - Initiate OAuth flow
- `GET /admin/redirect` - OAuth callback handler
- `GET /admin/dashboard` - Admin dashboard (requires authentication)
- `POST /admin/contexts/save` - Save selected contexts (requires authentication)
- `GET /admin/signout` - Sign out

### User Routes
- `GET /user` - User interface

## Security Considerations

- Environment variables are used for sensitive configuration
- Session secrets should be strong and unique
- HTTPS should be used in production
- Client secrets should be rotated regularly
- CSRF protection is implemented via state parameter in OAuth flow
- Session cookies are HTTP-only and secure in production

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Azure Container Services deployment instructions.

## License

ISC

require('dotenv').config();

const config = {
    auth: {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        authority: `${process.env.AUTHORITY}${process.env.TENANT_ID}`,
        tenantId: process.env.TENANT_ID,
        redirectUri: process.env.REDIRECT_URI
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: 'Info',
        }
    },
    app: {
        port: process.env.PORT || 3000,
        sessionSecret: process.env.SESSION_SECRET
    },
    resources: {
        graphAPI: {
            endpoint: process.env.GRAPH_API_ENDPOINT,
            scopes: [process.env.API_SCOPES]
        }
    }
};

module.exports = config;

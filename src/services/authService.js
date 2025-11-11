const msal = require('@azure/msal-node');
const config = require('../../config/config');

const msalConfig = {
    auth: config.auth,
    system: config.system
};

const pca = new msal.ConfidentialClientApplication(msalConfig);

/**
 * Get authorization URL for admin sign-in
 */
async function getAuthCodeUrl(state) {
    const authCodeUrlParameters = {
        scopes: ['User.Read', 'Policy.Read.ConditionalAccess'],
        redirectUri: config.auth.redirectUri,
        state: state
    };

    try {
        const authCodeUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
        return authCodeUrl;
    } catch (error) {
        console.error('Error getting auth code URL:', error);
        throw error;
    }
}

/**
 * Exchange authorization code for tokens
 */
async function acquireTokenByCode(code) {
    const tokenRequest = {
        code: code,
        scopes: ['User.Read', 'Policy.Read.ConditionalAccess'],
        redirectUri: config.auth.redirectUri
    };

    try {
        const response = await pca.acquireTokenByCode(tokenRequest);
        return response;
    } catch (error) {
        console.error('Error acquiring token by code:', error);
        throw error;
    }
}

/**
 * Acquire token on behalf of user (service-to-service)
 */
async function acquireTokenOnBehalfOf(userToken) {
    const oboRequest = {
        oboAssertion: userToken,
        scopes: config.resources.graphAPI.scopes
    };

    try {
        const response = await pca.acquireTokenOnBehalfOf(oboRequest);
        return response;
    } catch (error) {
        console.error('Error acquiring token on behalf of:', error);
        throw error;
    }
}

/**
 * Acquire token using client credentials (service-to-service)
 */
async function acquireTokenByClientCredentials() {
    const clientCredentialRequest = {
        scopes: config.resources.graphAPI.scopes,
        skipCache: false
    };

    try {
        const response = await pca.acquireTokenByClientCredential(clientCredentialRequest);
        return response;
    } catch (error) {
        console.error('Error acquiring token by client credentials:', error);
        throw error;
    }
}

module.exports = {
    getAuthCodeUrl,
    acquireTokenByCode,
    acquireTokenOnBehalfOf,
    acquireTokenByClientCredentials
};

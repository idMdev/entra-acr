const axios = require('axios');
const config = require('../../config/config');

/**
 * Fetch authentication contexts from Entra ID
 */
async function getAuthenticationContexts(accessToken) {
    const endpoint = `${config.resources.graphAPI.endpoint}v1.0/identity/conditionalAccess/authenticationContextClassReferences`;
    
    try {
        const response = await axios.get(endpoint, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.value || [];
    } catch (error) {
        console.error('Error fetching authentication contexts:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Fetch a specific authentication context by ID
 */
async function getAuthenticationContextById(accessToken, contextId) {
    // Validate contextId to prevent URL injection
    // Valid context IDs are in format c1-c99 or similar patterns
    if (!contextId || typeof contextId !== 'string' || !/^[a-zA-Z0-9\-_]+$/.test(contextId)) {
        throw new Error('Invalid context ID format');
    }
    
    const endpoint = `${config.resources.graphAPI.endpoint}v1.0/identity/conditionalAccess/authenticationContextClassReferences/${contextId}`;
    
    try {
        const response = await axios.get(endpoint, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error fetching authentication context by ID:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Get current user profile
 */
async function getUserProfile(accessToken) {
    const endpoint = `${config.resources.graphAPI.endpoint}v1.0/me`;
    
    try {
        const response = await axios.get(endpoint, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error fetching user profile:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    getAuthenticationContexts,
    getAuthenticationContextById,
    getUserProfile
};

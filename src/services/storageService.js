const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/auth-contexts.json');

/**
 * Initialize data file if it doesn't exist
 */
async function initDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch (error) {
        // File doesn't exist, create it
        await fs.writeFile(DATA_FILE, JSON.stringify({ contexts: [] }, null, 2));
    }
}

/**
 * Save authentication contexts to local storage
 */
async function saveAuthContexts(contexts) {
    try {
        await initDataFile();
        const data = {
            contexts: contexts,
            lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving auth contexts:', error);
        throw error;
    }
}

/**
 * Load authentication contexts from local storage
 */
async function loadAuthContexts() {
    try {
        await initDataFile();
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        return parsed.contexts || [];
    } catch (error) {
        console.error('Error loading auth contexts:', error);
        return [];
    }
}

/**
 * Get a specific authentication context by ID
 */
async function getAuthContextById(contextId) {
    try {
        const contexts = await loadAuthContexts();
        return contexts.find(ctx => ctx.id === contextId);
    } catch (error) {
        console.error('Error getting auth context by ID:', error);
        return null;
    }
}

/**
 * Clear all stored authentication contexts
 */
async function clearAuthContexts() {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify({ contexts: [] }, null, 2));
        return true;
    } catch (error) {
        console.error('Error clearing auth contexts:', error);
        throw error;
    }
}

module.exports = {
    saveAuthContexts,
    loadAuthContexts,
    getAuthContextById,
    clearAuthContexts
};

import axios from 'axios';

const API_BASE_URL = '/api'; // This will be proxied to the backend by nginx

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Check if LLM service is available
let isLLMAvailable = null;

/**
 * Check if LLM service is available
 * @returns {Promise<boolean>} Whether LLM service is available
 */
export const checkLLMAvailability = async () => {
  if (isLLMAvailable !== null) return isLLMAvailable;
  
  try {
    const response = await api.get('/health');
    isLLMAvailable = response.data.llm_available === true;
    return isLLMAvailable;
  } catch (error) {
    console.error('Error checking LLM availability:', error);
    isLLMAvailable = false;
    return false;
  }
};

/**
 * Fetch anomaly detection results using the specified mode
 * @param {string} mode - Detection mode: 'llm', 'baseline', or 'legacy'
 * @returns {Promise<Object>} Anomaly detection results
 */
const fetchAnomalyDataByMode = async (mode = 'baseline') => {
  try {
    let endpoint = '/infer';
    let data = {};
    
    switch (mode) {
      case 'llm':
        endpoint = '/infer/llm';
        break;
      case 'legacy':
        endpoint = '/infer/legacy';
        break;
      default:
        data = { use_llm: false };
    }
    
    const response = await api.post(endpoint, Object.keys(data).length ? data : undefined);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${mode} anomaly data:`, error);
    throw error;
  }
};

/**
 * Fetch anomaly detection results with automatic fallback
 * @param {Object} options - Options for fetching data
 * @param {boolean} options.preferLLM - Whether to prefer LLM-augmented detection
 * @returns {Promise<Object>} Anomaly detection results
 */
export const fetchAnomalyData = async ({ preferLLM = true } = {}) => {
  try {
    // Try LLM endpoint if preferred and available
    if (preferLLM && (await checkLLMAvailability())) {
      return await fetchAnomalyDataByMode('llm');
    }
    // Fall back to baseline
    return await fetchAnomalyDataByMode('baseline');
  } catch (error) {
    console.error('Error in fetchAnomalyData:', error);
    throw error;
  }
};

/**
 * Fetch metrics for the specified detection mode
 * @param {string} mode - Detection mode: 'llm' or 'baseline'
 * @returns {Promise<Object>} Model metrics
 */
export const fetchMetrics = async (mode = 'baseline') => {
  try {
    const response = await api.get('/metrics', {
      params: { use_llm: mode === 'llm' }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${mode} metrics:`, error);
    throw error;
  }
};

/**
 * Fetch explanation for a specific anomaly
 * @param {string|number} anomalyId - ID of the anomaly to explain
 * @returns {Promise<Object>} LLM explanation details
 */
export const fetchAnomalyExplanation = async (anomalyId) => {
  try {
    const response = await api.get(`/explanations/${anomalyId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching explanation for anomaly ${anomalyId}:`, error);
    throw error;
  }
};


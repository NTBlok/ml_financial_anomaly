import axios from 'axios';

const API_BASE_URL = 'http://localhost:8001'; // Directly point to the backend server

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
  const endpoint = '/detect-anomalies';
  console.log(`Fetching data from ${endpoint} in ${mode} mode`);
  
  try {
    const response = await api.get(endpoint, {
      // Add a timeout to prevent hanging requests
      timeout: 30000, // 30 seconds
      // Add request metadata for debugging
      metadata: {
        mode,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`API response received for ${mode} mode:`, {
      status: response.status,
      statusText: response.statusText,
      data: response.data ? 'data received' : 'no data',
      headers: response.headers
    });
    
    // Make sure we have a valid response with data
    if (!response.data) {
      const error = new Error('No data in response');
      error.response = response;
      throw error;
    }
    
    // Handle different response formats
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    } else if (response.data.data && typeof response.data.data === 'object') {
      // If data is an object, convert it to an array
      return Object.values(response.data.data);
    }
    
    throw new Error(`Unexpected response format: ${JSON.stringify(response.data).substring(0, 200)}...`);
    
  } catch (error) {
    const errorInfo = {
      message: error.message,
      code: error.code,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout,
      },
      response: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      },
      stack: error.stack
    };
    
    console.error(`Error in fetchAnomalyDataByMode (${mode}):`, errorInfo);
    
    // Re-throw with enhanced error information
    const enhancedError = new Error(
      `Failed to fetch ${mode} data: ${error.message}`
    );
    enhancedError.originalError = error;
    enhancedError.details = errorInfo;
    throw enhancedError;
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
    console.log('Starting fetchAnomalyData, preferLLM:', preferLLM);
    
    // Check if LLM is available if preferred
    if (preferLLM) {
      try {
        const isLLMAvailable = await checkLLMAvailability();
        console.log('LLM available:', isLLMAvailable);
        if (isLLMAvailable) {
          console.log('Fetching data with LLM mode');
          const data = await fetchAnomalyDataByMode('llm');
          return { success: true, data };
        }
      } catch (llmError) {
        console.warn('Error checking LLM availability, falling back to baseline:', llmError);
      }
    }
    
    // Fall back to baseline
    console.log('Fetching data with baseline mode');
    const data = await fetchAnomalyDataByMode('baseline');
    return { 
      success: true, 
      data,
      source: 'baseline',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      stack: error.stack
    };
    
    console.error('Error in fetchAnomalyData:', errorDetails);
    
    return { 
      success: false, 
      error: error.message || 'Failed to fetch data',
      errorDetails,
      data: [] 
    };
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


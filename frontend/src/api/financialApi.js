import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000'; // Update this if your backend runs on a different port

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchAnomalyData = async () => {
  try {
    const response = await api.post('/infer');
    return response.data;
  } catch (error) {
    console.error('Error fetching anomaly data:', error);
    throw error;
  }
};

export const fetchMetrics = async () => {
  try {
    // This is a placeholder. Update with actual metrics endpoint when available
    return {
      totalTransactions: 1234,
      anomaliesDetected: 24,
      modelAccuracy: 98.5,
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
};

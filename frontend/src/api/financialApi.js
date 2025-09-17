import axios from 'axios';

const API_BASE_URL = '/api'; // This will be proxied to the backend by nginx

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
    const response = await api.get('/metrics');
    return response.data;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
};

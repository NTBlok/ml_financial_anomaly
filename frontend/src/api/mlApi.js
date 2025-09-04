// frontend/src/api/mlApi.js
import axios from "axios";
const API_URL = "http://localhost:8000";

export async function getPrediction() {
  const res = await axios.post(`${API_URL}/infer`);
  return res.data;
}

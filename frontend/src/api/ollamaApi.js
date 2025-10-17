import axios from 'axios';

const OLLAMA_API_URL = 'http://localhost:11434/api';

export const analyzeWithMistral = async (prompt, data) => {
  try {
    const response = await axios.post(`${OLLAMA_API_URL}/generate`, {
      model: 'mistral',
      prompt: `${prompt}\n\nData: ${JSON.stringify(data, null, 2)}\n\nAnalysis:`,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1000
      }
    });

    return {
      success: true,
      analysis: response.data.response,
      model: response.data.model,
      metrics: {
        total_duration: response.data.total_duration,
        load_duration: response.data.load_duration,
        prompt_eval_count: response.data.prompt_eval_count,
        eval_count: response.data.eval_count,
        eval_duration: response.data.eval_duration
      }
    };
  } catch (error) {
    console.error('Error analyzing with Mistral:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      details: error.response?.data
    };
  }
};

export const getAvailableModels = async () => {
  try {
    const response = await axios.get(`${OLLAMA_API_URL}/tags`);
    return {
      success: true,
      models: response.data.models || []
    };
  } catch (error) {
    console.error('Error fetching available models:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      models: []
    };
  }
};

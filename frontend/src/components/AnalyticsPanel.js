import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Paper, 
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert
} from '@mui/material';
import { analyzeWithMistral, getAvailableModels } from '../api/ollamaApi';

const ANALYSIS_PROMPTS = {
  trend: 'Analyze the trend in this financial data. Identify any patterns, significant changes, or anomalies. Provide insights in a clear, business-friendly manner.',
  risk: 'Assess the risk factors in this financial data. Highlight any concerning trends or potential issues that might require attention.',
  summary: 'Provide a comprehensive summary of this financial data, focusing on key metrics and important changes over time.',
  forecast: 'Based on the historical data, provide a short-term forecast. Mention any assumptions made in your analysis.'
};

const AnalyticsPanel = ({ data }) => {
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [promptType, setPromptType] = useState('trend');
  const [customPrompt, setCustomPrompt] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('mistral');

  useEffect(() => {
    const fetchModels = async () => {
      const result = await getAvailableModels();
      if (result.success) {
        setAvailableModels(result.models);
      }
    };
    fetchModels();
  }, []);

  const handleAnalyze = async () => {
    if (!data || data.length === 0) {
      setError('No data available for analysis');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const prompt = promptType === 'custom' 
        ? customPrompt 
        : ANALYSIS_PROMPTS[promptType] || ANALYSIS_PROMPTS.trend;
      
      const result = await analyzeWithMistral(prompt, data);
      
      if (result.success) {
        setAnalysis(result.analysis);
      } else {
        setError(result.error || 'Failed to analyze data');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('An error occurred during analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Advanced Analytics with Mistral
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Analysis Type</InputLabel>
            <Select
              value={promptType}
              label="Analysis Type"
              onChange={(e) => setPromptType(e.target.value)}
            >
              <MenuItem value="trend">Trend Analysis</MenuItem>
              <MenuItem value="risk">Risk Assessment</MenuItem>
              <MenuItem value="summary">Data Summary</MenuItem>
              <MenuItem value="forecast">Forecast</MenuItem>
              <MenuItem value="custom">Custom Prompt</MenuItem>
            </Select>
          </FormControl>

          {availableModels.length > 0 && (
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Model</InputLabel>
              <Select
                value={selectedModel}
                label="Model"
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {availableModels.map((model) => (
                  <MenuItem key={model.name} value={model.name}>
                    {model.name} ({model.size})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            variant="contained"
            onClick={handleAnalyze}
            disabled={isLoading}
            sx={{ minWidth: 150 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Run Analysis'}
          </Button>
        </Box>

        {promptType === 'custom' && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              placeholder="Enter your custom analysis prompt..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {analysis && (
        <Paper sx={{ p: 3, mt: 2, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Analysis Results:
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {analysis}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default AnalyticsPanel;

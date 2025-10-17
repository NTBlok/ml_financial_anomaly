import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, Switch, FormControlLabel } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import { styled } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SettingsIcon from '@mui/icons-material/Settings';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, LabelList } from 'recharts';
import { 
  fetchAnomalyData, 
  fetchMetrics, 
  fetchAnomalyExplanation, 
  checkLLMAvailability 
} from './api/financialApi';
import AnalyticsPanel from './components/AnalyticsPanel';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

// Default empty data structure
const defaultMetrics = {
  totalTransactions: 0,
  anomaliesDetected: 0,
  modelAccuracy: 0,
};

const defaultAnomalyData = {
  anomaly: [],
  normal: []
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#017310',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(2),
  color: theme.palette.text.secondary,
  height: '100%',
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function App() {
  const [value, setValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [anomalyData, setAnomalyData] = useState({ normal: [], anomaly: [] });
  const [loading, setLoading] = useState(true);
  const [llmAvailable, setLlmAvailable] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const [useLLM, setUseLLM] = useState(false);

  useEffect(() => {
    const checkLLM = async () => {
      try {
        const isAvailable = await checkLLMAvailability();
        setLlmAvailable(isAvailable);
        setUseLLM(isAvailable); // Enable LLM by default if available
      } catch (err) {
        console.error('Error checking LLM availability:', err);
        setLlmAvailable(false);
        setUseLLM(false);
      }
    };
    
    checkLLM();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Starting data fetch...');
        
        // Fetch metrics and anomaly data in parallel with error handling for each
        const [metricsData, anomalyResponse] = await Promise.all([
          fetchMetrics(useLLM ? 'llm' : 'baseline').catch(err => {
            console.error('Error fetching metrics:', err);
            return { success: false, error: 'Failed to load metrics' };
          }),
          fetchAnomalyData({ preferLLM: useLLM }).catch(err => {
            console.error('Error fetching anomaly data:', err);
            return { success: false, error: 'Failed to load anomaly data' };
          })
        ]);
        
        console.log('Metrics data:', metricsData);
        console.log('Anomaly response:', anomalyResponse);

        // Debug: Log the raw response
        console.log('Raw anomaly response:', anomalyResponse);
        
        // Handle error cases
        if (!anomalyResponse || !anomalyResponse.success) {
          const errorMsg = anomalyResponse?.error || 'Failed to load anomaly data';
          console.error('Error in response:', errorMsg);
          setError(errorMsg);
          setAnomalyData({ normal: [], anomaly: [] });
          return;
        }
        
        // Process anomaly data - handle both array and object responses
        let anomalyData = [];
        if (Array.isArray(anomalyResponse.data)) {
          anomalyData = anomalyResponse.data;
        } else if (anomalyResponse.data && Array.isArray(anomalyResponse.data.data)) {
          anomalyData = anomalyResponse.data.data;
        }
        
        console.log('Processed anomaly data array:', anomalyData);
        
        // Ensure we have valid data
        if (!anomalyData || anomalyData.length === 0) {
          console.warn('No anomaly data received from the server');
          setError('No data available. The server returned an empty dataset.');
          setAnomalyData({ normal: [], anomaly: [] });
          return;
        }
        
        const processedAnomalyData = {
          normal: anomalyData
            .filter(d => d.anomaly === 0)
            .map(d => {
              const processed = {
                ...d,
                // Make sure we have a timestamp field for the graph
                timestamp: d.timestamp || d.date || new Date().toISOString(),
                date: new Date(d.timestamp || d.date).toLocaleDateString(),
                value: d.price || d.value || 0  // Fallback to 0 if price is missing
              };
              console.log('Normal point:', processed);
              return processed;
            }),
          anomaly: anomalyData
            .filter(d => d.anomaly === 1)
            .map(d => {
              const processed = {
                ...d,
                // Make sure we have a timestamp field for the graph
                timestamp: d.timestamp || d.date || new Date().toISOString(),
                date: new Date(d.timestamp || d.date).toLocaleDateString(),
                value: d.price || d.value || 0  // Fallback to 0 if price is missing
              };
              console.log('Anomaly point:', processed);
              return processed;
            })
        };

        setMetrics(metricsData);
        setAnomalyData(processedAnomalyData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [useLLM]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleAnomalyClick = async (anomaly) => {
    if (!llmAvailable) return;
    
    setSelectedAnomaly(anomaly);
    setExplanation(null);
    setExplanationLoading(true);
    
    try {
      const explanation = await fetchAnomalyExplanation(anomaly.id || anomaly.timestamp);
      setExplanation(explanation);
    } catch (err) {
      console.error('Error fetching explanation:', err);
      setError('Failed to load explanation. Please try again.');
    } finally {
      setExplanationLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setSelectedAnomaly(null);
    setExplanation(null);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const renderLoading = () => (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
      <CircularProgress />
    </Box>
  );

  const renderError = () => (
    <Box my={2}>
      <Alert severity="error">{error}</Alert>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Financial Anomaly Detection {llmAvailable && '(LLM Enhanced)'}
            </Typography>
            {llmAvailable && (
              <FormControlLabel
                control={
                  <Switch
                    checked={useLLM}
                    onChange={(e) => setUseLLM(e.target.checked)}
                    color="secondary"
                  />
                }
                label="Use LLM"
                labelPlacement="start"
                sx={{ color: 'white' }}
              />
            )}
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Grid container spacing={3}>
            {/* Overview Cards */}
            <Grid item xs={12} md={4}>
              <Item>
                <Typography variant="h6" gutterBottom>Total Transactions</Typography>
                {isLoading ? (
                  <CircularProgress size={40} />
                ) : (
                  <>
                    <Typography variant="h4">{formatNumber(metrics.totalTransactions)}</Typography>
                    <Typography color="text.secondary">Tracked transactions</Typography>
                  </>
                )}
              </Item>
            </Grid>
            <Grid item xs={12} md={4}>
              <Item>
                <Typography variant="h6" gutterBottom>Anomalies Detected</Typography>
                {isLoading ? (
                  <CircularProgress size={40} />
                ) : (
                  <>
                    <Typography variant="h4" color="error">
                      {formatNumber(metrics.anomaliesDetected)}
                    </Typography>
                    <Typography color="text.secondary">Potential issues found</Typography>
                  </>
                )}
              </Item>
            </Grid>
            <Grid item xs={12} md={4}>
              <Item>
                <Typography variant="h6" gutterBottom>Model Accuracy</Typography>
                {isLoading ? (
                  <CircularProgress size={40} />
                ) : (
                  <>
                    <Typography variant="h4">{metrics.modelAccuracy}%</Typography>
                    <Typography color="text.secondary">Performance metric</Typography>
                  </>
                )}
              </Item>
            </Grid>

            {/* Main Content */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                <Tabs value={value} onChange={handleChange} aria-label="main tabs">
                  <Tab icon={<DashboardIcon />} label="Dashboard" />
                  <Tab icon={<AnalyticsIcon />} label="Analytics" />
                  <Tab icon={<SettingsIcon />} label="Settings" />
                </Tabs>
                
                <TabPanel value={value} index={0}>
                  <Typography variant="h6" gutterBottom>Transaction Overview</Typography>
                  {error && renderError()}
                  <div style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...anomalyData.normal, ...anomalyData.anomaly]}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(timestamp) => `Date: ${new Date(timestamp).toLocaleString()}`}
                          formatter={(value, name, props) => [value, name]}
                        />
                        <Legend />
                        {/* Normal data line */}
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          name="Price" 
                          stroke="#1976d2" 
                          dot={false}
                          activeDot={{ 
                            r: 8,
                            onClick: (event, payload) => {
                              if (llmAvailable) {
                                handleAnomalyClick(payload.payload);
                              }
                            },
                            style: { cursor: llmAvailable ? 'pointer' : 'default' }
                          }}
                        />
                        {/* Anomaly points */}
                        <Scatter 
                          data={anomalyData.anomaly}
                          name="Anomaly"
                          fill="#ff4081"
                          lineType="none"
                        >
                          <LabelList 
                            dataKey="value" 
                            position="top" 
                            formatter={(value) => value.toFixed(2)}
                          />
                        </Scatter>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabPanel>
                <TabPanel value={value} index={1}>
                  <Typography variant="h6" gutterBottom>Detailed Analytics</Typography>
                  <Typography>Advanced analytics coming soon...</Typography>
                </TabPanel>
                
                <TabPanel value={value} index={2}>
                  <Typography variant="h6" gutterBottom>Settings</Typography>
                  <Typography>Configuration options will appear here</Typography>
                </TabPanel>
              </Paper>
            </Grid>
          </Grid>
        </Container>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {llmAvailable && !useLLM && (
          <Alert severity="info" sx={{ mb: 3 }}>
            LLM-augmented detection is available. Enable it for more accurate anomaly detection.
          </Alert>
        )}
        
        {/* Anomaly Explanation Dialog */}
        <Dialog 
          open={!!selectedAnomaly} 
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Anomaly Details
            {selectedAnomaly && (
              <Typography variant="subtitle2" color="text.secondary">
                {new Date(selectedAnomaly.timestamp).toLocaleString()}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            {explanationLoading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : explanation ? (
              <Box mb={2}>
                <Typography variant="h6" gutterBottom>Analysis:</Typography>
                <Typography variant="body1" paragraph>
                  {explanation.explanation || 'No explanation available'}
                </Typography>
                <Box mt={2}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => setAnalyticsOpen(true)}
                    startIcon={<AnalyticsIcon />}
                  >
                    Advanced Analysis
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography>No explanation available for this anomaly.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedAnomaly(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Analytics Panel Dialog */}
        <Dialog 
          open={analyticsOpen} 
          onClose={() => setAnalyticsOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Advanced Analytics with Mistral</DialogTitle>
          <DialogContent>
            <AnalyticsPanel 
              anomalyData={selectedAnomaly} 
              onClose={() => setAnalyticsOpen(false)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAnalyticsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default App;

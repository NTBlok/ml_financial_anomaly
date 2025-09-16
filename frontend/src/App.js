import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchAnomalyData, fetchMetrics } from './api/financialApi';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

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
      main: '#1976d2',
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
  const [anomalyData, setAnomalyData] = useState(defaultAnomalyData);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch metrics and anomaly data in parallel
        const [metricsData, anomalyResponse] = await Promise.all([
          fetchMetrics(),
          fetchAnomalyData()
        ]);

        // Process anomaly data
        const processedAnomalyData = {};
        anomalyResponse.forEach(item => {
          processedAnomalyData[item.series] = item.data.map(d => ({
            date: new Date(d.timestamp).toLocaleDateString(),
            value: d.price,
            ...d
          }));
        });

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
  }, []);

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
              Financial Anomaly Detection
            </Typography>
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
                    {isLoading ? (
                      renderLoading()
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[...anomalyData.normal, ...anomalyData.anomaly].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(date) => new Date(date).toLocaleDateString()}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(date) => `Date: ${new Date(date).toLocaleString()}`}
                            formatter={(value, name, props) => [value, name]}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="price" 
                            name="Price" 
                            stroke="#1976d2" 
                            dot={false}
                            activeDot={{ r: 6 }}
                          />
                          {anomalyData.anomaly.length > 0 && (
                            <Line 
                              type="scatter" 
                              data={anomalyData.anomaly}
                              dataKey="price"
                              name="Anomaly"
                              stroke="#ff4081"
                              fill="#ff4081"
                              strokeWidth={2}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    )}
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
      </Box>
    </ThemeProvider>
  );
}

export default App;

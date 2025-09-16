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

// Sample data - replace with real data from your API
const sampleData = [
  { date: '2023-01', value: 4000 },
  { date: '2023-02', value: 3000 },
  { date: '2023-03', value: 5000 },
  { date: '2023-04', value: 2780 },
  { date: '2023-05', value: 1890 },
  { date: '2023-06', value: 2390 },
];

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
  const [chartData, setChartData] = useState(sampleData);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  useEffect(() => {
    // Fetch data from your backend API
    const fetchData = async () => {
      try {
        // Replace with actual API call
        // const response = await fetch('http://localhost:8000/api/data');
        // const data = await response.json();
        // setChartData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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
                <Typography variant="h4">1,234</Typography>
                <Typography color="text.secondary">+12% from last month</Typography>
              </Item>
            </Grid>
            <Grid item xs={12} md={4}>
              <Item>
                <Typography variant="h6" gutterBottom>Anomalies Detected</Typography>
                <Typography variant="h4" color="error">24</Typography>
                <Typography color="text.secondary">+2 from last week</Typography>
              </Item>
            </Grid>
            <Grid item xs={12} md={4}>
              <Item>
                <Typography variant="h6" gutterBottom>Accuracy</Typography>
                <Typography variant="h4">98.5%</Typography>
                <Typography color="text.secondary">Model performance</Typography>
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
                  <div style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#1976d2" name="Transaction Value" />
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
      </Box>
    </ThemeProvider>
  );
}

export default App;

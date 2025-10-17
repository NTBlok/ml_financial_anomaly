# Financial Anomaly Detection System

A comprehensive system for detecting anomalies in financial data using machine learning and LLM-powered advanced analysis.

## 🚀 Features

- **Data Processing**: Fetch and clean financial data
- **Machine Learning**: Anomaly detection model training and inference
- **LLM Integration**: Advanced analysis using Mistral model via Ollama
- **Web Interface**: User-friendly dashboard for monitoring and analysis
- **Docker Support**: Containerized deployment for all components

## 🏗️ Project Structure

```
financial_anomaly/
├── backend/               # FastAPI backend service
│   ├── api.py            # API endpoints
│   ├── data_fetch.py     # Data retrieval utilities
│   ├── data_clean.py     # Data preprocessing
│   ├── model_*.py        # Model training and inference
│   ├── llm.py           # LLM integration
│   └── requirements.txt  # Python dependencies
├── frontend/             # React-based web interface
│   ├── src/             # React application source
│   └── public/          # Static assets
├── docker-compose.yml    # Multi-container setup
└── Dockerfile.ollama    # Custom Ollama configuration
```

## 🛠️ Setup

### Prerequisites

- Docker and Docker Compose
- Python 3.8+
- Node.js 16+ (for frontend development)

### Quick Start with Docker

1. Start all services:
   ```bash
   docker compose up -d
   ```

2. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Jupyter Notebooks: http://localhost:8888

## 🖥️ Local Development

### Backend Setup

1. Create and activate virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the development server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

## 🤖 LLM Integration

The system integrates with Ollama's Mistral model for advanced analysis:

- Service runs on port 11434
- Auto-downloads the Mistral model on first run
- Accessible via the backend service

## 📊 Data Flow

1. Data is fetched from financial APIs
2. Preprocessed and cleaned
3. Processed by the ML model for anomaly detection
4. Analyzed by LLM for contextual insights
5. Results displayed in the web interface

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

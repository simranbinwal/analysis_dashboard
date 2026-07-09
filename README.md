# AI-Powered Automated Data Cleaning and Visualization System

This project is a futuristic Streamlit data analytics dashboard built with Python, pandas, scikit-learn, Plotly, ReportLab, and python-pptx.

It automatically cleans uploaded datasets, scores data quality, builds interactive dashboards, detects outliers, forecasts sales-like metrics, segments customers, provides AI-style analytical answers, and exports PDF and PowerPoint reports.

## Run the Project

Install Python 3.10 or newer, then run these commands from this folder:

```powershell
cd D:\projects_resume_simran\analysis_dashboard
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Then open:

```text
http://localhost:4173
```

If Windows does not recognize `python`, install Python from https://www.python.org/downloads/ and enable **Add Python to PATH** during setup.

## Features

- Streamlit futuristic UI
- CSV and Excel upload
- Automated missing value handling
- Duplicate record removal
- IQR-based outlier detection and capping
- Data quality score
- Plotly interactive dashboards
- Correlation, distribution, category, and timeline charts
- Predictive analytics with scikit-learn
- Sales forecasting with linear regression
- Customer segmentation with KMeans and PCA
- Anomaly detection with IsolationForest
- AI chat assistant for dataset insights
- Cleaned CSV download
- PDF report generation
- One-click PowerPoint export

The previous static HTML demo is still included as `index.html`, but the main project entry point is now `streamlit_app.py`.

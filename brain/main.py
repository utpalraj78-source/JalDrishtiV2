"""
JalDrishti Flood Prediction API
FastAPI backend that uses the trained RandomForest model to predict flood severity (PSI)
for all Delhi wards based on rainfall intensity.
Also handles citizen reporting.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import json
import os
import uuid
import datetime
from typing import List, Optional

app = FastAPI(
    title="JalDrishti Flood Prediction API",
    description="Predicts Pre-emptive Severity Index (PSI) for Delhi wards based on rainfall",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development. In prod, specify frontend domain.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- IN-MEMORY STORAGE ---
# For a hackathon/MVP, in-memory is fine. In prod, use PostGIS/PostgreSQL.
REPORTS_DB = []

# 1. Load the Brain (Trained Model)
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "jaldrishti_brain.pkl")
metadata_path = os.path.join(script_dir, "ward_metadata.json")

print(f"📂 Loading model from: {model_path}")
model = joblib.load(model_path)
print("✅ Model loaded!")

# 2. Load Ward Metadata (Generated from GeoJSON)
print(f"📂 Loading ward metadata from: {metadata_path}")
with open(metadata_path, 'r') as f:
    WARD_META = json.load(f)
print(f"✅ Loaded metadata for {len(WARD_META)} wards")


# --- DATA MODELS ---

class PredictionRequest(BaseModel):
    rainfall_intensity: float  # mm/hr from the frontend slider


class WardPrediction(BaseModel):
    ward_id: str
    ward_no: str
    predicted_psi: float
    status: str


class AIAnalysisResult(BaseModel):
    verified: bool
    confidence: float
    tags: List[str]
    description: str


class ReportCoordinates(BaseModel):
    lat: float
    lng: float


class CitizenReport(BaseModel):
    id: Optional[str] = None
    timestamp: Optional[str] = None
    location: str
    coordinates: ReportCoordinates
    type: str
    description: str
    image_url: Optional[str] = None
    ai_analysis: AIAnalysisResult
    admin_status: str = "pending"  # pending, approved, rejected
    is_spam: bool = False


# --- ENDPOINTS ---

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "model": "JalDrishti Brain v2",
        "wards_loaded": len(WARD_META),
        "total_reports": len(REPORTS_DB)
    }


# ... FLOOD PREDICTION ENDPOINTS ...

@app.post("/predict", response_model=List[WardPrediction])
async def predict_flood(request: PredictionRequest):
    """Predict flood severity (PSI) for all wards based on all available data."""
    input_data = []
    
    # Prepare input rows for ALL wards
    # We map to list for DataFrame creation
    ward_list = []
    for ward_id, meta in WARD_META.items():
        ward_list.append({
            "ward_id": int(ward_id),
            "rainfall_intensity": request.rainfall_intensity,
            "drain_capacity": meta['drain_capacity'],
            "imperviousness": meta['imperviousness'],
            "ward_no": meta.get('ward_no', ward_id)
        })
        input_data.append([
            int(ward_id),
            request.rainfall_intensity,
            meta['drain_capacity'],
            meta['imperviousness']
        ])
    
    # Make Predictions
    X_pred = pd.DataFrame(input_data, columns=['ward_id', 'rainfall_intensity', 'drain_capacity', 'imperviousness'])
    predictions = model.predict(X_pred)
    
    # Format Response
    response = []
    for i, item in enumerate(ward_list):
        psi = round(predictions[i], 2)
        status = "SAFE"
        if psi >= 7: status = "CRITICAL"
        elif psi >= 5: status = "HIGH"
        elif psi >= 3: status = "MODERATE"
        
        response.append(WardPrediction(
            ward_id=str(item['ward_id']),
            ward_no=str(item['ward_no']),
            predicted_psi=psi,
            status=status
        ))
    
    return response


@app.get("/wards")
async def get_wards():
    """Get list of all wards and their metadata"""
    return WARD_META


@app.get("/predict/{ward_id}")
async def predict_single_ward(ward_id: str, rainfall: float = 50.0):
    if ward_id not in WARD_META:
        return {"error": f"Ward {ward_id} not found"}
    
    meta = WARD_META[ward_id]
    X = pd.DataFrame([[
        int(ward_id),
        rainfall,
        meta['drain_capacity'],
        meta['imperviousness']
    ]], columns=['ward_id', 'rainfall_intensity', 'drain_capacity', 'imperviousness'])
    
    psi = round(model.predict(X)[0], 2)
    return {
        "ward_id": ward_id,
        "ward_no": meta.get('ward_no'),
        "predicted_psi": psi,
        "status": "CRITICAL" if psi >= 7 else "SAFE"
    }


# --- REPORTING ENDPOINTS ---

@app.get("/reports")
async def get_reports():
    """Get all citizen reports"""
    return REPORTS_DB


@app.post("/reports")
async def submit_report(report: CitizenReport):
    """
    Submit a new verified citizen report.
    This is called AFTER the frontend has verified the image with Azure AI.
    """
    # Assign ID and Timestamp
    report.id = str(uuid.uuid4())
    report.timestamp = datetime.datetime.now().isoformat()
    
    # Auto-spam detection fallback (simple keyword check)
    # Ideally, we rely on the frontend's AI Analysis result
    if not report.ai_analysis.verified and report.ai_analysis.confidence < 60:
        report.is_spam = True
        report.admin_status = "rejected"
    
    REPORTS_DB.append(report)
    return {"message": "Report submitted successfully", "report_id": report.id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
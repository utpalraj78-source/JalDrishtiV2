"""
Enhanced Data Generator for JalDrishti Flood Prediction Model
Reads all wards from delhi-wards.geojson and generates synthetic training data
using the Rational Method (Q = C * I * A) for urban flood modeling.
"""
import pandas as pd
import numpy as np
import json
import os

# Path to GeoJSON (relative to brain folder)
GEOJSON_PATH = "../public/data/delhi-wards.geojson"

# 1. Load Wards from GeoJSON
def load_wards_from_geojson():
    """Extract ward data from GeoJSON file."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    geojson_path = os.path.join(script_dir, GEOJSON_PATH)
    
    with open(geojson_path, 'r') as f:
        data = json.load(f)
    
    wards = []
    for feature in data['features']:
        props = feature.get('properties', {})
        ward_no = props.get('Ward_No')
        shape_area = props.get('Shape_Area', 0.01)
        
        if ward_no is not None:
            wards.append({
                'ward_id': int(ward_no) if isinstance(ward_no, (int, float)) else hash(str(ward_no)) % 1000,
                'ward_no': ward_no,
                'shape_area': float(shape_area) if shape_area else 0.01
            })
    
    return wards

# 2. Generate Synthetic Ward Characteristics
def generate_ward_metadata(wards):
    """
    Generate synthetic infrastructure data for each ward.
    Uses Shape_Area as a proxy for urban density and infrastructure capacity.
    """
    np.random.seed(42)  # For reproducibility
    
    # Normalize shape areas for calculations
    areas = np.array([w['shape_area'] for w in wards])
    min_area, max_area = areas.min(), areas.max()
    
    if max_area == min_area: max_area = min_area + 0.001
    
    ward_metadata = []
    elevation_types = ["Low", "Moderate", "High-Density", "Sink"]
    
    for ward in wards:
        area = ward['shape_area']
        norm_area = (area - min_area) / (max_area - min_area)
        area_hectares = area * 1_000_000 
        
        # Drain Capacity
        drain_capacity = int(100 + norm_area * 700 + np.random.normal(0, 50))
        drain_capacity = max(50, min(1000, drain_capacity))
        
        # Imperviousness
        base_imperv = 0.75 + (1 - norm_area) * 0.2
        imperviousness = np.clip(base_imperv + np.random.normal(0, 0.05), 0.6, 0.98)
        
        # Elevation
        if norm_area < 0.2:
            elev_probs = [0.3, 0.2, 0.3, 0.2] 
        elif norm_area < 0.5:
            elev_probs = [0.25, 0.35, 0.25, 0.15]
        else:
            elev_probs = [0.2, 0.4, 0.3, 0.1]
        
        elevation = np.random.choice(elevation_types, p=elev_probs)
        
        ward_metadata.append({
            'ward_id': ward['ward_id'],
            'ward_no': ward['ward_no'],
            'area': round(area_hectares, 2),
            'drain_capacity': drain_capacity,
            'imperviousness': round(imperviousness, 3),
            'elevation': elevation
        })
    
    return ward_metadata

# 3. Generate Training Data using Capacity Utilization Method
def generate_training_data(ward_metadata, num_events=10000):
    """
    Simulate rainfall events and calculate flood severity (PSI).
    New Method: Capacity Utilization Ratio = Runoff / Capacity
    """
    np.random.seed(42)
    data = []
    
    for event_idx in range(num_events):
        for ward in ward_metadata:
            # Broader rainfall distribution (0 to 180mm)
            rainfall = np.random.beta(2, 4) * 180
            noise = np.random.normal(1.0, 0.1)
            
            # Runoff (Q) - Normalize area to keep values reasonable (divide by 10000 to get per-unit area)
            normalized_area = ward['area'] / 10000.0  # Convert to reasonable scale
            runoff_q = (ward['imperviousness'] * rainfall * normalized_area * noise)
            
            # Elevation multiplier
            elevation_factors = {
                "Sink": 1.3, "Low": 1.15, "Moderate": 1.0, "High-Density": 0.95
            }
            elev_factor = elevation_factors.get(ward['elevation'], 1.0)
            
            # Capacity Utilization Ratio
            utilization_ratio = (runoff_q / ward['drain_capacity']) * elev_factor
            
            # Non-linear spread for PSI 1-10
            if utilization_ratio < 0.3:
                # 0-30% load -> PSI 0-2 (Safe)
                psi = utilization_ratio * 6.6 
            elif utilization_ratio < 0.7:
                # 30-70% load -> PSI 2-5 (Moderate)
                psi = 2 + (utilization_ratio - 0.3) * 7.5
            elif utilization_ratio < 1.0:
                # 70-100% load -> PSI 5-8 (High)
                psi = 5 + (utilization_ratio - 0.7) * 10
            else:
                # >100% load -> PSI 8-10 (Overflow)
                psi = 8 + (utilization_ratio - 1.0) * 1.5
            
            psi = np.clip(psi + np.random.normal(0, 0.2), 0, 10)
            
            data.append({
                'ward_id': ward['ward_id'],
                'rainfall_intensity': round(rainfall, 2),
                'drain_capacity': ward['drain_capacity'],
                'imperviousness': ward['imperviousness'],
                'area': ward['area'],
                'elevation': ward['elevation'],
                'psi_label': round(psi, 2)
            })
    
    return pd.DataFrame(data)

# 4. Save Ward Metadata
def save_ward_metadata(ward_metadata, output_path="ward_metadata.json"):
    metadata_dict = {
        str(w['ward_id']): {
            'ward_no': w['ward_no'],
            'drain_capacity': w['drain_capacity'],
            'imperviousness': w['imperviousness'],
            'area': w['area'],
            'elevation': w['elevation']
        }
        for w in ward_metadata
    }
    with open(output_path, 'w') as f:
        json.dump(metadata_dict, f, indent=2)
    print(f"✅ Ward metadata saved: {output_path} ({len(metadata_dict)} wards)")

# Main
if __name__ == "__main__":
    print("🌧️  JalDrishti Enhanced Data Generator")
    print("=" * 50)
    
    print("\n📍 Loading wards...")
    wards = load_wards_from_geojson()
    print(f"   Found {len(wards)} wards")
    
    print("\n🏗️  Generating metadata...")
    ward_metadata = generate_ward_metadata(wards)
    save_ward_metadata(ward_metadata)
    
    print("\n🌊 Generating training data...")
    df = generate_training_data(ward_metadata, num_events=10000)
    
    df.to_csv("flood_training_data.csv", index=False)
    print(f"\n✅ Training data saved: flood_training_data.csv")
    print(f"   Total samples: {len(df):,}")
    
    print("\n📊 PSI Distribution Summary:")
    print(df['psi_label'].describe())
    
    print("\n🎉 Data generation complete!")
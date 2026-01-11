"""
Train the JalDrishti Flood Prediction Model (RandomForest Regressor)
Uses the enhanced training data generated from all Delhi wards.
"""
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

print("🧠 JalDrishti Model Training")
print("=" * 50)

# 1. Load Data
print("\n📂 Loading training data...")
df = pd.read_csv("flood_training_data.csv")
print(f"   Loaded {len(df):,} samples")

# 2. Features (Inputs) vs Target (Output)
# Using: ward_id, rainfall_intensity, drain_capacity, imperviousness
# Note: We exclude 'area' and 'elevation' for simpler model, but they're encoded in capacity/imperviousness
X = df[['ward_id', 'rainfall_intensity', 'drain_capacity', 'imperviousness']]
y = df['psi_label']

print(f"\n📊 Feature columns: {list(X.columns)}")
print(f"   Target: psi_label (0-10 scale)")

# 3. Train/Test Split (80/20)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"\n🔀 Train/Test Split:")
print(f"   Training samples: {len(X_train):,}")
print(f"   Test samples: {len(X_test):,}")

# 4. Initialize and Train Random Forest
# Use more estimators for better accuracy with large dataset
print("\n⚙️  Training Random Forest Regressor...")
model = RandomForestRegressor(
    n_estimators=150,      # More trees for better accuracy
    max_depth=20,          # Limit depth to prevent overfitting
    min_samples_split=10,  # Require at least 10 samples to split
    n_jobs=-1,             # Use all CPU cores
    random_state=42,
    verbose=1
)
model.fit(X_train, y_train)
print("   ✅ Training complete!")

# 5. Evaluate Model
print("\n📈 Model Evaluation:")
predictions = model.predict(X_test)

mse = mean_squared_error(y_test, predictions)
mae = mean_absolute_error(y_test, predictions)
r2 = r2_score(y_test, predictions)

print(f"   Mean Squared Error (MSE): {mse:.4f}")
print(f"   Mean Absolute Error (MAE): {mae:.4f}")
print(f"   R² Score: {r2:.4f}")

# 6. Feature Importance
print("\n🎯 Feature Importance:")
importances = dict(zip(X.columns, model.feature_importances_))
for feature, importance in sorted(importances.items(), key=lambda x: x[1], reverse=True):
    print(f"   {feature}: {importance:.3f}")

# 7. Save the Model
joblib.dump(model, "jaldrishti_brain.pkl")
print("\n💾 Model saved: jaldrishti_brain.pkl")

# 8. Quick Sanity Check
print("\n🧪 Sanity Check (sample predictions):")
test_cases = [
    {"ward_id": 558, "rainfall_intensity": 0, "drain_capacity": 94, "imperviousness": 0.939},
    {"ward_id": 558, "rainfall_intensity": 50, "drain_capacity": 94, "imperviousness": 0.939},
    {"ward_id": 558, "rainfall_intensity": 100, "drain_capacity": 94, "imperviousness": 0.939},
    {"ward_id": 558, "rainfall_intensity": 150, "drain_capacity": 94, "imperviousness": 0.939},
]
for tc in test_cases:
    pred = model.predict(pd.DataFrame([tc]))[0]
    print(f"   Rainfall {tc['rainfall_intensity']:3.0f} mm/hr → PSI: {pred:.2f}")

print("\n🎉 Training complete!")
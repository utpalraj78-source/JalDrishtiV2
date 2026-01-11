"""Quick model test."""
import joblib
import pandas as pd

model = joblib.load('jaldrishti_brain.pkl')
print("Model loaded successfully!")

# Test predictions at different rainfall levels
test_cases = [
    {'ward_id': 558, 'rainfall_intensity': 0, 'drain_capacity': 94, 'imperviousness': 0.939},
    {'ward_id': 558, 'rainfall_intensity': 10, 'drain_capacity': 94, 'imperviousness': 0.939},
    {'ward_id': 558, 'rainfall_intensity': 30, 'drain_capacity': 94, 'imperviousness': 0.939},
    {'ward_id': 558, 'rainfall_intensity': 50, 'drain_capacity': 94, 'imperviousness': 0.939},
    {'ward_id': 558, 'rainfall_intensity': 100, 'drain_capacity': 94, 'imperviousness': 0.939},
]

print("\nTest Predictions:")
for tc in test_cases:
    X = pd.DataFrame([tc])
    pred = model.predict(X)[0]
    print(f"  Rainfall {tc['rainfall_intensity']:3} mm/hr => PSI: {pred:.2f}")

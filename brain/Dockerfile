FROM python:3.9-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for pandas/numpy often basic build tools are good)
# RUN apt-get update && apt-get install -y build-essential

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Generate data and train model during build
# This ensures self-contained image without needing to check in large .pkl files
RUN python generate_data.py && python train_model.py

# Expose port 8000
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

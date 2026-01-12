# Deploying JalDrishti V2 to Azure

This guide covers how to host both the **Next.js Frontend** and the **Python (FastAPI) Backend** on Microsoft Azure.

## Prerequisites
- An Azure Account (Free tier is fine).
- GitHub Account (Repository pushed to GitHub).
- Azure CLI (optional, but recommended).

---

## Option 1: The "Cloud Native" Way (Recommended)
Use **Azure Static Web Apps** for the Frontend and **Azure Web Apps** for the Backend.

### 1. Deploy the Backend (Python FastAPI)
The backend is located in the `brain/` folder. It serves the Flood Prediction API.

1. **Create an Azure Web App** (Python 3.9):
   - Go to Azure Portal -> Create a resource -> **Web App**.
   - Name: `jaldrishti-api` (example).
   - Publish: **Code**.
   - Runtime stack: **Python 3.9**.
   - OS: **Linux**.
   - Region: Select same region for all resources.

2. **Configure Deployment**:
   - Go to **Deployment Center** in your new Web App.
   - Source: **GitHub**.
   - Authorize and select your repository.
   - Build provider: **GitHub Actions**.
   - Important: **Project details** -> **Workflows** usually auto-detects.
   - **Crucial Step**: You need to tell Azure to look in the `brain/` folder.
     - You might need to edit the generated GitHub Action file (in `.github/workflows/`) to set `app_location` or `working-directory` to `./brain`.
     - **Alternative (Easier)**: Use the Docker method (Option 2 below) for the backend to avoid path issues.

3. **Set Environment Variables**:
   - Go to **Settings** -> **Environment variables**.
   - Add any keys if needed (e.g., `AZURE_CV_KEY`, `AZURE_CV_ENDPOINT` if using backend analysis).

4. **Get the Backend URL**:
   - Copy the URL (e.g., `https://jaldrishti-api.azurewebsites.net`).

### 2. Deploy the Frontend (Next.js)
1. **Create a Static Web App**:
   - Go to Azure Portal -> Create a resource -> **Static Web App**.
   - Name: `jaldrishti-web`.
   - Deployment details: **GitHub**.
   - Organization/Repo/Branch: Select yours.
   - **Build Presets**: Select **Next.js**.
   - **App location**: `/` (Root).
   - **Api location**: Leave empty (we are hosting API separately).
   - **Output location**: `.next` (default).

2. **Configure Environment Variables**:
   - After creation, go to **Environment variables**.
   - Add `NEXT_PUBLIC_API_URL` with the value of your **Backend URL** from Step 1 (e.g., `https://jaldrishti-api.azurewebsites.net`).
     - *Note: Do not add a trailing slash.*
   - If using Azure CV in Next.js API Routes (`/api/analyze-report`), add:
     - `AZURE_CV_KEY`
     - `AZURE_CV_ENDPOINT`

3. **Save and Refresh**:
   - GitHub Actions will rebuild and deploy your site automatically.

---

## Option 2: The Docker Way (Containerized)
This is often more robust as it minimizes environment differences.

### 1. Backend (Docker)
1. Build the image locally or use Azure Container Registry (ACR).
2. Create **Web App for Containers**.
3. Point it to the `Dockerfile` in `brain/` directory (requires setting "Context" to `brain/`).
   - If deploying from GitHub, you can configure the GitHub Action to build `brain/Dockerfile`.

### 2. Frontend (Docker)
1. Use the `Dockerfile` in the root directory.
2. Deploy to **Web App for Containers**.
3. Set `NEXT_PUBLIC_API_URL` environment variable.

---

## Local Testing
To run the full stack locally with Docker:
```sh
docker-compose up --build
```
Access the app at `http://localhost:3000`.

## Notes
- **Database**: The current app uses an **in-memory database** (`REPORTS_DB = []`). All data will be lost when the Azure Web App restarts (which happens frequently). For production, you must connect a database like **Azure PostgreSQL**.
- **Model Generation**: The backend requires `jaldrishti_brain.pkl`. We have generated this locally. Ensure this file is committed to git or generated during the build process (add `RUN python train_model.py` to Dockerfile if strictly necessary, but committing the `.pkl` is faster for small models).

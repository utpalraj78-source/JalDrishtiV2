
export interface WardPrediction {
    ward_id: string | number;
    ward_no?: string | number;
    predicted_psi: number;
    status: "SAFE" | "CRITICAL" | "HIGH" | "MODERATE";
}

// Centralized API URL Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const fetchFloodPrediction = async (rainfallIntensity: number): Promise<WardPrediction[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ rainfall_intensity: rainfallIntensity }),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const text = await response.text();
        try {
            return JSON.parse(text) as WardPrediction[];
        } catch (e) {
            console.warn("Flood Prediction API returned invalid JSON:", text.substring(0, 100));
            throw new Error("Invalid JSON response");
        }
    } catch (error) {
        console.warn("Flood Prediction API offline or error, using fallback logic.", error);

        // Trigger global error notification
        if (typeof window !== "undefined") {
            import('react-hot-toast').then(({ toast }) => {
                toast.error("Backend Disconnected: Using offline mode.", {
                    id: 'api-error',
                });
            });
        }
        return [];
    }
};

export const fetchReports = async (): Promise<any[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/reports`);
        if (!response.ok) {
            throw new Error("Backend unreachable");
        }
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.warn("Reports API returned invalid JSON", text.substring(0, 50));
            return [];
        }
    } catch (error) {
        console.warn("Reports fetch failed - Backend might be offline:", error);
        return [];
    }
};

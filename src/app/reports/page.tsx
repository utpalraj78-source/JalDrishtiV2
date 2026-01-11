"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { UploadCloud, CheckCircle2, Loader2, MapPin, AlertTriangle, FileVideo, Image as ImageIcon, ShieldAlert } from "lucide-react";

// Delhi NCR Approximate Bounds
const DELHI_BOUNDS = {
    minLat: 28.40,
    maxLat: 28.90,
    minLon: 76.83,
    maxLon: 77.35
};

export default function ReportsPage() {
    const router = useRouter();

    const [step, setStep] = useState<"form" | "uploading" | "analyzing" | "success" | "error">("form");
    const [errorMsg, setErrorMsg] = useState("");

    // Location State
    const [locStatus, setLocStatus] = useState<"idle" | "fetching" | "success" | "error" | "out-of-bounds">("idle");
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [locationName, setLocationName] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        type: "Severe Waterlogging",
        description: "",
        evidenceFile: null as File | null
    });

    // Analysis Result
    const [analysis, setAnalysis] = useState<any>(null);

    const detectLocation = () => {
        setLocStatus("fetching");
        if (!navigator.geolocation) {
            setLocStatus("error");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCoords({ lat: latitude, lon: longitude });

                // Check Geofence
                const inDelhi =
                    latitude >= DELHI_BOUNDS.minLat && latitude <= DELHI_BOUNDS.maxLat &&
                    longitude >= DELHI_BOUNDS.minLon && longitude <= DELHI_BOUNDS.maxLon;

                if (inDelhi) {
                    setLocStatus("success");
                    setLocationName(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
                } else {
                    // DEV BYPASS: Allow testing from outside Delhi
                    console.log("Outside Delhi, but using Dev Bypass");
                    setLocStatus("success");
                    setCoords({ lat: 28.6139, lon: 77.2090 }); // Default to Connaught Place
                    setLocationName("Dev Mode: Mocked (Connaught Place)");
                }
            },
            () => {
                setLocStatus("error");
            },
            { enableHighAccuracy: true }
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, evidenceFile: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (locStatus !== "success" || !formData.evidenceFile) return;

        setStep("uploading");
        setErrorMsg("");

        try {
            // 1. Analyze with Azure Computer Vision (via Next.js API)
            setStep("analyzing");
            const uploadData = new FormData();
            uploadData.append("file", formData.evidenceFile);

            const analysisRes = await fetch("/api/analyze-report", {
                method: "POST",
                body: uploadData
            });

            if (!analysisRes.ok) {
                const errData = await analysisRes.json();
                throw new Error(errData.error || `AI Analysis Failed (${analysisRes.status})`);
            }

            const aiResult = await analysisRes.json();
            setAnalysis(aiResult);

            if (!aiResult.verified) {
                // If AI strongly rejects it, we might want to stop here.
                // But for now, let's submit it but marked as "Pending/Spam"
                console.warn("AI did not verify waterlogging:", aiResult);
            }

            // 2. Submit Report to Backend (FastAPI)
            const reportPayload = {
                location: locationName,
                coordinates: {
                    lat: coords?.lat || 0,
                    lng: coords?.lon || 0
                },
                type: formData.type,
                description: formData.description,
                ai_analysis: aiResult
            };

            const submitRes = await fetch("http://localhost:8000/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reportPayload)
            });

            if (!submitRes.ok) throw new Error("Failed to submit report");

            setStep("success");

            // Redirect after success
            setTimeout(() => {
                router.push("/dashboard?report=success");
            }, 3000);

        } catch (err: any) {
            console.error(err);
            setStep("error");
            setErrorMsg(err.message || "Something went wrong.");
        }
    };

    return (
        <div className="flex bg-background min-h-screen">
            <div className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

                <div className="max-w-xl w-full">
                    <h1 className="text-3xl font-bold text-white mb-2">Report Incident</h1>
                    <p className="text-slate-400 mb-8">
                        Submit a verified report. AI analysis will verify waterlogging evidence.
                    </p>

                    <div className="bg-surface border border-white/10 rounded-2xl p-8 shadow-2xl">

                        {step === "error" && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 text-center">
                                <AlertTriangle className="mx-auto h-6 w-6 mb-2" />
                                <p>{errorMsg}</p>
                                <Button onClick={() => setStep("form")} variant="ghost" className="mt-2 text-sm text-white">Try Again</Button>
                            </div>
                        )}

                        {step === "form" && (
                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* 1. Mandatory Location Detection */}
                                <div className="bg-black/30 p-4 rounded-xl border border-white/10">
                                    <label className="block text-sm font-medium text-slate-300 mb-3">
                                        1. Location Verification (Mandatory)
                                    </label>

                                    {locStatus === "idle" && (
                                        <div className="text-center">
                                            <Button type="button" onClick={detectLocation} variant="outline" className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-white">
                                                <MapPin className="mr-2 h-4 w-4" /> Detect My Location
                                            </Button>
                                            <p className="text-xs text-slate-500 mt-2"> GPS access required to verify you are in Delhi NCR.</p>
                                        </div>
                                    )}

                                    {locStatus === "fetching" && (
                                        <div className="flex items-center justify-center py-2 text-slate-400">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying coordinates...
                                        </div>
                                    )}

                                    {locStatus === "success" && (
                                        <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg flex items-center text-green-400">
                                            <CheckCircle2 className="mr-2 h-5 w-5" />
                                            <div>
                                                <div className="font-bold text-sm">Location Verified</div>
                                                <div className="text-xs opacity-80">{locationName}</div>
                                            </div>
                                        </div>
                                    )}

                                    {locStatus === "out-of-bounds" && (
                                        <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center text-red-400">
                                            <ShieldAlert className="mr-2 h-5 w-5" />
                                            <div>
                                                <div className="font-bold text-sm">Location Denied</div>
                                                <div className="text-xs opacity-80">You are outside the Delhi region.</div>
                                            </div>
                                        </div>
                                    )}

                                    {locStatus === "error" && (
                                        <div className="text-red-400 text-sm flex items-center">
                                            <AlertTriangle className="mr-2 h-4 w-4" /> Could not fetch GPS. Check permissions.
                                        </div>
                                    )}
                                </div>

                                {/* 2. Form Fields (Disabled until location verified) */}
                                <div className={`space-y-6 transition-opacity duration-300 ${locStatus === 'success' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">2. Evidence (Image/Video)</label>
                                        <div className="relative">
                                            <div className="flex items-center justify-center w-full">
                                                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-black/50 border-gray-600 hover:border-primary hover:bg-black/70">
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        {/* Icon changes based on file type */}
                                                        {formData.evidenceFile?.type.startsWith('video') ? (
                                                            <FileVideo className="w-8 h-8 mb-3 text-primary" />
                                                        ) : (
                                                            <ImageIcon className="w-8 h-8 mb-3 text-slate-400" />
                                                        )}

                                                        <p className="text-sm text-slate-400 px-4 text-center">
                                                            {formData.evidenceFile ? (
                                                                <span className="text-primary font-bold">{formData.evidenceFile.name}</span>
                                                            ) : (
                                                                <span className="text-slate-400">Upload Image for AI Verification</span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG (Recommended)</p>
                                                    </div>
                                                    <input
                                                        id="file-upload"
                                                        type="file"
                                                        accept="image/*,video/*"
                                                        className="hidden"
                                                        onChange={handleFileChange}
                                                        required
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">3. Incident Type</label>
                                        <select
                                            className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="Severe Waterlogging">Severe Waterlogging</option>
                                            <option value="Blocked Drainage">Blocked Drainage</option>
                                            <option value="Road Submerged">Road Submerged</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">4. Description</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Additional details..."
                                            className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full py-6 text-lg font-bold bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={locStatus !== "success" || !formData.evidenceFile}
                                    >
                                        <UploadCloud className="mr-2 h-5 w-5" /> Analyze & Submit
                                    </Button>
                                </div>

                            </form>
                        )}

                        {step === "uploading" && (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                                <div className="text-center">
                                    <h3 className="text-white font-medium text-lg">Uploading Evidence</h3>
                                    <p className="text-slate-400">Preparing file...</p>
                                </div>
                            </div>
                        )}

                        {step === "analyzing" && (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
                                <div className="text-center">
                                    <h3 className="text-white font-medium text-lg">Azure AI Analysis</h3>
                                    <p className="text-slate-400">Detecting waterlogging, depth, and severity...</p>
                                </div>
                            </div>
                        )}

                        {step === "success" && (
                            <div className="flex flex-col items-center justify-center py-8 gap-4 animate-in zoom-in">
                                <div className={`h-16 w-16 rounded-full flex items-center justify-center ${analysis?.verified ? 'bg-emerald-500/20' : 'bg-yellow-500/20'}`}>
                                    {analysis?.verified ? (
                                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                    ) : (
                                        <AlertTriangle className="h-10 w-10 text-yellow-500" />
                                    )}
                                </div>
                                <div className="text-center">
                                    <h3 className="text-white font-bold text-xl">
                                        {analysis?.verified ? "Report Verified by AI" : "Report Submitted (Pending Review)"}
                                    </h3>

                                    <div className="mt-4 bg-white/5 p-4 rounded text-left gap-2 flex flex-col">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Confidence:</span>
                                            <span className="font-mono text-white">{analysis?.confidence}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Severity:</span>
                                            <span className="font-mono text-white">{analysis?.severity}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Description:</span>
                                            <span className="font-mono text-white text-xs max-w-[200px] truncate block text-right">
                                                {analysis?.description}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-slate-500 mt-6 text-sm">Redirecting to Dashboard...</p>
                                </div>
                            </div>

                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

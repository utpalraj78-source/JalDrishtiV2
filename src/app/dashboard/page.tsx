"use client";

import { useState, Suspense, useEffect } from "react";
import { MapboxView } from "@/components/map/MapboxView";
import { RainfallSlider } from "@/components/dashboard/RainfallSlider";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";


function DashboardContent() {
    const [rainfall, setRainfall] = useState(0);
    const [reports, setReports] = useState<any[]>([]);
    const searchParams = useSearchParams();
    const hasNewReport = searchParams.get("report") === "success";

    useEffect(() => {
        // Use centralized internal API
        import("@/services/api").then(({ fetchReports }) => {
            fetchReports().then(data => {
                if (!Array.isArray(data)) return;

                // Filter: Not Rejected, Not Spam (unless confirmed real by admin)
                const validReports = data.filter((r: any) =>
                    r.admin_status !== "rejected" &&
                    (!r.is_spam || r.admin_status === "approved")
                );
                setReports(validReports);
            });
        });
    }, []);

    return (
        <div className="relative w-full h-[calc(100vh)] bg-background overflow-hidden">
            <MapboxView rainfallIntensity={rainfall} liveReports={reports} />

            {/* Overlay controls */}
            <RainfallSlider intensity={rainfall} onIntensityChange={setRainfall} />

            {/* Verification Badge Notification */}
            {hasNewReport && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="bg-surface/90 backdrop-blur-md border border-emerald-500/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
                        <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-white font-medium">New Verified Incident Added to Map</span>
                    </div>
                </div>
            )}

            {/* Quick View / Public Navigation: Back to Home */}
            <div className="absolute top-4 right-4 z-50">
                <Link
                    href="/"
                    className="flex items-center gap-2 bg-surface/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors shadow-lg"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    <span className="text-sm font-medium">Back to Home</span>
                </Link>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div>Loading Dashboard...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

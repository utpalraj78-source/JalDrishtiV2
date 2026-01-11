"use client";

import { useEffect, useState } from "react";
import { Activity, Server, AlertCircle } from "lucide-react";

const API_HEALTH_URL = "http://localhost:8000/";

export function BackendStatus() {
    const [status, setStatus] = useState<"online" | "offline" | "checking">("checking");
    const [modelName, setModelName] = useState<string>("");

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch(API_HEALTH_URL);
                if (res.ok) {
                    const text = await res.text();
                    try {
                        const data = JSON.parse(text);
                        setStatus("online");
                        setModelName(data.model || "Unknown Model");
                    } catch (e) {
                        console.warn("BackendStatus: Invalid JSON received", text.substring(0, 50));
                        setStatus("offline");
                    }
                } else {
                    setStatus("offline");
                }
            } catch (error) {
                setStatus("offline");
            }
        };

        // Check immediately
        checkHealth();

        // Poll every 30 seconds
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    if (status === "checking") return null;

    return (
        <div className={`
            mt-auto mb-4 mx-4 p-3 rounded-lg border flex items-center gap-3 transition-all duration-300
            ${status === "online"
                ? "bg-green-50/10 border-green-500/20 text-green-400"
                : "bg-red-50/10 border-red-500/20 text-red-400"}
        `}>
            <div className="relative">
                {status === "online" ? <Server size={18} /> : <AlertCircle size={18} />}
                {status === "online" && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
            </div>

            <div className="flex flex-col">
                <span className="text-xs font-medium uppercase tracking-wider">
                    {status === "online" ? "System Online" : "System Offline"}
                </span>
                <span className="text-[10px] opacity-70 truncate max-w-[120px]">
                    {status === "online" ? modelName : "Backend Disconnected"}
                </span>
            </div>
        </div>
    );
}

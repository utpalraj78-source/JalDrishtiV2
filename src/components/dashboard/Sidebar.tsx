"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Droplets, Map, AlertTriangle, BarChart3, CloudRain, LayoutDashboard, BookOpen, LogOut } from "lucide-react";
import { cn } from "@/components/ui/Button";
import { BackendStatus } from "@/components/ui/BackendStatus";

const navItems = [
    { href: "/dashboard", label: "Live Map", icon: Map },
    { href: "/admin", label: "Admin Console", icon: LayoutDashboard },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/simulation", label: "Simulation", icon: CloudRain },
    { href: "/reports", label: "Report Incident", icon: AlertTriangle },
    { href: "/methodology", label: "Methodology", icon: BookOpen },
];

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setRole(null); // No user = public/quick view
            } else {
                // Default to civilian if no role is set
                setRole(user.user_metadata?.role || 'civilian');
            }
            setLoading(false);
        };
        checkUser();
    }, []);

    // Quick View (Public) users see no sidebar
    if (!loading && !role) return null;
    if (!loading && role === 'quick_view') return null;

    const filteredItems = navItems.filter(item => {
        if (loading) return false; // Prevent flickering: show nothing while loading
        if (!role || role === 'civilian') {
            // Civilian: Live Map, Report Incident, Methodology
            return ['/dashboard', '/reports', '/methodology'].includes(item.href);
        }
        if (role === 'engineer') {
            // Engineer: Everything except Admin
            return item.href !== '/admin';
        }
        if (role === 'admin') {
            // Admin: Everything
            return true;
        }
        return true;
    });

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/5 bg-surface/50 backdrop-blur-xl flex flex-col z-40">
            <div className="h-16 flex items-center px-6 border-b border-white/5">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white group-hover:bg-violet-600 transition-colors">
                        <Droplets className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">JalDrishti</span>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {filteredItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/20 text-white border border-primary/20"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-slate-500")} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/5">
                <BackendStatus />

                <div className="rounded-xl bg-background/50 border border-white/5 p-4 mx-4 mb-2">
                    <p className="text-xs text-slate-400 mb-1">IMD Weather Feed: <span className="text-emerald-400">Connected</span></p>
                    <p className="text-xs text-slate-400">Time: <span className="text-slate-300">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
                </div>

                <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors rounded-lg mt-1"
                >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}

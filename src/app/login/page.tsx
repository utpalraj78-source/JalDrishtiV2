"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Mail, Lock, ArrowRight, Check, Users, ArrowLeft } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("civilian");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { data: { user }, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;

            // Determine redirect path based on role (metadata takes precedence over selection if present)
            const userRole = user?.user_metadata?.role || role;

            switch (userRole) {
                case 'admin':
                    router.push("/admin");
                    break;
                case 'engineer':
                case 'quick_view':
                    router.push("/simulation");
                    break;
                case 'civilian':
                default:
                    router.push("/dashboard");
                    break;
            }

            router.refresh();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || "An error occurred" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#1a1033] text-[#e2e8f0] font-sans selection:bg-[#8b5cf6] selection:text-white overflow-hidden relative">

            {/* Background Ambience */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#8b5cf6]/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#22d3ee]/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Main Content */}
            <div className="flex flex-1 flex-col justify-center items-center px-4 sm:px-6 lg:flex-none lg:w-[45%] relative z-10 backdrop-blur-sm bg-[#1a1033]/50 border-r border-[#4c1d95]/30">
                <div className="w-full max-w-sm space-y-10">

                    <Link href="/" className="inline-flex items-center text-sm text-[#94a3b8] hover:text-white transition-colors group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>

                    {/* Logo & Header */}
                    <div className="space-y-2 text-center lg:text-left">
                        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                            <span className="bg-gradient-to-r from-[#8b5cf6] to-[#22d3ee] bg-clip-text text-transparent">JalDrishti</span>
                        </h1>
                        <h2 className="text-2xl font-semibold tracking-tight">
                            Welcome back
                        </h2>
                        <p className="text-sm text-[#94a3b8]">
                            Enter your credentials to access your account.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleAuth} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-[#94a3b8] group-focus-within:text-[#8b5cf6] transition-colors" />
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-[#2d1b4d]/50 border border-[#4c1d95] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/50 focus:border-[#8b5cf6] transition-all placeholder:text-[#64748b] text-white"
                                />
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-[#94a3b8] group-focus-within:text-[#8b5cf6] transition-colors" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-[#2d1b4d]/50 border border-[#4c1d95] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/50 focus:border-[#8b5cf6] transition-all placeholder:text-[#64748b] text-white"
                                />
                            </div>
                            <div className="relative group">
                                <Users className="absolute left-3 top-3 h-5 w-5 text-[#94a3b8] group-focus-within:text-[#8b5cf6] transition-colors" />
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-[#2d1b4d]/50 border border-[#4c1d95] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/50 focus:border-[#8b5cf6] transition-all placeholder:text-[#64748b] text-white appearance-none"
                                >
                                    <option value="civilian" className="bg-[#1a1033] text-gray-300">Civilian</option>
                                    <option value="engineer" className="bg-[#1a1033] text-gray-300">Engineer</option>
                                    <option value="admin" className="bg-[#1a1033] text-gray-300">Admin</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                                    <svg className="h-4 w-4 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        {message && (
                            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {message.type === 'success' ? <Check className="h-4 w-4" /> : null}
                                {message.text}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] hover:from-[#7c3aed] hover:to-[#4f46e5] text-white font-medium rounded-xl shadow-lg shadow-[#8b5cf6]/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Toggle Login/Signup */}
                    <div className="text-center text-sm">
                        <span className="text-[#94a3b8]">Don't have an account?</span>{" "}
                        <Link
                            href="/signup"
                            className="font-medium text-[#c084fc] hover:text-[#d8b4fe] transition-colors hover:underline"
                        >
                            Sign up
                        </Link>
                    </div>
                </div>
            </div >

            {/* Right Side Visual */}
            < div className="hidden lg:flex flex-1 relative bg-[#0f0a1e] items-center justify-center p-12" >
                <div className="absolute inset-0 bg-[#1a1033] opacity-40 pattern-grid-lg" />

                <div className="relative w-full max-w-2xl aspect-square">
                    {/* Abstract Visualization or Map Preview */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#8b5cf6]/20 to-[#22d3ee]/20 rounded-full blur-3xl animate-pulse-slow" />
                    <div className="relative z-10 border border-[#4c1d95]/50 bg-[#2d1b4d]/30 backdrop-blur-xl rounded-2xl p-8 shadow-2xl overflow-hidden group hover:border-[#8b5cf6]/50 transition-colors duration-500">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#8b5cf6] via-[#22d3ee] to-[#8b5cf6]" />

                        <div className="space-y-6">
                            <div className="h-8 w-32 bg-[#4c1d95]/50 rounded-lg animate-pulse" />
                            <div className="space-y-3">
                                <div className="h-4 w-full bg-[#4c1d95]/30 rounded animate-pulse delay-75" />
                                <div className="h-4 w-[90%] bg-[#4c1d95]/30 rounded animate-pulse delay-100" />
                                <div className="h-4 w-[60%] bg-[#4c1d95]/30 rounded animate-pulse delay-150" />
                            </div>
                            <div className="pt-8 flex gap-4">
                                <div className="h-24 w-full bg-gradient-to-br from-[#8b5cf6]/20 to-transparent rounded-lg border border-[#8b5cf6]/20" />
                                <div className="h-24 w-full bg-gradient-to-br from-[#22d3ee]/20 to-transparent rounded-lg border border-[#22d3ee]/20" />
                            </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#8b5cf6]/30 rounded-full blur-2xl" />
                    </div>

                    <div className="absolute bottom-12 left-12 right-12 text-center z-10">
                        <h3 className="text-2xl font-bold text-white mb-2">Advanced Flood Analytics</h3>
                        <p className="text-[#94a3b8]">AI-powered predictions and real-time visualization for urban flood management.</p>
                    </div>
                </div>
            </div >
        </div >
    );
}

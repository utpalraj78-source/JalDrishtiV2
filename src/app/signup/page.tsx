"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, ArrowRight, Check, ArrowLeft, Users } from "lucide-react";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("civilian");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();
    const supabase = createClient();
    const [currentRole, setCurrentRole] = useState<string | null>(null);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            console.log("Signup Debug: User session check:", user, error);
            if (user) {
                // Assuming role is stored in user_metadata
                const userRole = user.user_metadata?.role || "civilian";
                console.log("Signup Debug: Current Role:", userRole);
                setCurrentRole(userRole);
            }
        };
        checkSession();
    }, []);

    // Effect to check for role conflict
    useEffect(() => {
        console.log("Signup Debug: Role Check - Selected:", role, "Current:", currentRole);
        if (currentRole && role !== currentRole) {
            setMessage({
                type: 'error',
                text: `You are currently logged in as a "${currentRole}". You cannot create an account as "${role}" without signing out first.`
            });
        } else if (currentRole && role === currentRole) {
            // Optional: You could show a neutral message "You are already logged in as civilian."
            setMessage(null);
        }
    }, [role, currentRole]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent submission if there is a role conflict
        if (currentRole && role !== currentRole) {
            setMessage({
                type: 'error',
                text: `Please sign out before creating a "${role}" account.`
            });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                    data: { role: role }
                },
            });
            if (error) throw error;
            setMessage({ type: 'success', text: "Account created! Check your email for confirmation." });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || "An error occurred" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#1a1033] text-[#e2e8f0] font-sans selection:bg-[#8b5cf6] selection:text-white overflow-hidden relative">

            {/* Background Ambience */}
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#8b5cf6]/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#22d3ee]/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Main Content */}
            <div className="flex flex-1 flex-col justify-center items-center px-4 sm:px-6 lg:flex-none lg:w-[45%] relative z-10 backdrop-blur-sm bg-[#1a1033]/50 border-r border-[#4c1d95]/30">
                <div className="w-full max-w-sm space-y-10">

                    <div className="flex items-center justify-between">
                        <Link href="/" className="inline-flex items-center text-sm text-[#94a3b8] hover:text-white transition-colors group">
                            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Home
                        </Link>
                        <Link href="/login" className="inline-flex items-center text-sm text-[#94a3b8] hover:text-white transition-colors group">
                            Sign In
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    {/* Logo & Header */}
                    <div className="space-y-2 text-center lg:text-left">
                        {currentRole && role !== currentRole && (
                            <div className="mb-4 p-4 rounded-lg border border-red-500/50 bg-red-900/20 text-red-200 animate-pulse">
                                <div className="flex items-center gap-2 font-bold text-red-400">
                                    <Lock className="w-5 h-5" />
                                    <span>Account Conflict</span>
                                </div>
                                <p className="text-sm mt-1">
                                    You are logged in as <strong>{currentRole}</strong>.
                                    <br />
                                    You cannot create a <strong>{role}</strong> account.
                                </p>
                            </div>
                        )}

                        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                            <span className="bg-gradient-to-r from-[#8b5cf6] to-[#22d3ee] bg-clip-text text-transparent">Join JalDrishti</span>
                        </h1>
                        <h2 className="text-2xl font-semibold tracking-tight">
                            Create an account
                        </h2>
                        <p className="text-sm text-[#94a3b8]">
                            Join the community effort to monitor and predict urban flooding.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSignup} className="space-y-6">

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
                                    Sign Up
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="text-center text-sm">
                        <span className="text-[#94a3b8]">Already have an account?</span>{" "}
                        <Link
                            href="/login"
                            className="font-medium text-[#c084fc] hover:text-[#d8b4fe] transition-colors hover:underline"
                        >
                            Sign in
                        </Link>
                    </div>
                </div>
            </div >

            {/* Right Side Visual */}
            < div className="hidden lg:flex flex-1 relative bg-[#0f0a1e] items-center justify-center p-12" >
                <div className="absolute inset-0 bg-[#1a1033] opacity-40 pattern-grid-lg" />

                <div className="relative w-full max-w-2xl aspect-square">
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#22d3ee]/20 to-[#8b5cf6]/20 rounded-full blur-3xl animate-pulse-slow" />
                    <div className="relative z-10 border border-[#4c1d95]/50 bg-[#2d1b4d]/30 backdrop-blur-xl rounded-2xl p-8 shadow-2xl overflow-hidden group hover:border-[#8b5cf6]/50 transition-colors duration-500">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#22d3ee] via-[#8b5cf6] to-[#22d3ee]" />

                        <div className="space-y-6">
                            <div className="h-8 w-48 bg-[#4c1d95]/50 rounded-lg animate-pulse" />
                            <div className="space-y-3">
                                <div className="h-4 w-full bg-[#4c1d95]/30 rounded animate-pulse delay-75" />
                                <div className="h-4 w-[95%] bg-[#4c1d95]/30 rounded animate-pulse delay-100" />
                                <div className="h-4 w-[80%] bg-[#4c1d95]/30 rounded animate-pulse delay-150" />
                            </div>
                            <div className="pt-8 grid grid-cols-2 gap-4">
                                <div className="h-32 bg-gradient-to-br from-[#8b5cf6]/20 to-transparent rounded-lg border border-[#8b5cf6]/20 flex items-center justify-center">
                                    <div className="h-12 w-12 rounded-full border-2 border-[#8b5cf6]/30 border-t-[#8b5cf6] animate-spin" />
                                </div>
                                <div className="h-32 bg-gradient-to-br from-[#22d3ee]/20 to-transparent rounded-lg border border-[#22d3ee]/20 flex items-center justify-center">
                                    <div className="h-1 w-[80%] bg-[#22d3ee]/30 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#22d3ee] w-2/3 animate-[loading_2s_ease-in-out_infinite]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-12 left-12 right-12 text-center z-10">
                        <h3 className="text-2xl font-bold text-white mb-2">Community Resilience</h3>
                        <p className="text-[#94a3b8]">By creating an account, you contribute to a more flood-resilient Delhi.</p>
                    </div>
                </div>
            </div >
        </div >
    );
}

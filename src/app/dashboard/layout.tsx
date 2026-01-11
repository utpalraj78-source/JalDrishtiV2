import { Sidebar } from "@/components/dashboard/Sidebar";

import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Logic: Only show sidebar if user is logged in and NOT restricted (e.g. quick_view role)
    // Should match Sidebar.tsx logic: if (!user || role === 'quick_view') return null;
    const role = user?.user_metadata?.role;
    const showSidebar = !!user && role !== 'quick_view';

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {showSidebar && <Sidebar />}
            <main className={`flex-1 ${showSidebar ? 'ml-64' : ''} relative min-h-screen`}>
                {children}
            </main>
        </div>
    );
}

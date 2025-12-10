"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { TranscriptionEditor } from "@/components/TranscriptionEditor";
import Auth from "@/components/Auth";
import { Loader2 } from 'lucide-react';

export default function Home() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!session) {
        return <Auth />;
    }

    return (
        <main className="h-screen flex flex-col bg-gray-50 dark:bg-black font-[family-name:var(--font-geist-sans)]">
            <div className="flex-1 overflow-hidden">
                <TranscriptionEditor />
            </div>
        </main>
    );
}

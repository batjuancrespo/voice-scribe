"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useVocabulary() {
    const [replacements, setReplacements] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Use a ref to track if we should skip the next fetch (optimistic update)
    const skipNextFetchRef = useRef(false);

    const fetchReplacements = useCallback(async () => {
        if (skipNextFetchRef.current) {
            skipNextFetchRef.current = false;
            return;
        }

        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setReplacements({});
                return;
            }

            const { data, error } = await supabase
                .from('vocabulary')
                .select('original, replacement')
                .eq('user_id', session.user.id);

            if (error) {
                console.error("Error fetching vocabulary:", error);
                return;
            }

            const map: Record<string, string> = {};
            data.forEach(item => {
                map[item.original] = item.replacement;
            });
            setReplacements(map);
        } catch (error) {
            console.error("Vocabulary hook error:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReplacements();
    }, [fetchReplacements]);

    const updateReplacement = useCallback(async (oldOriginal: string | null, newOriginal: string, newReplacement: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        setIsSaving(true);

        // Optimistic update
        const previousReplacements = { ...replacements };
        const updatedReplacements = { ...replacements };

        if (oldOriginal && updatedReplacements[oldOriginal]) {
            delete updatedReplacements[oldOriginal];
        }
        updatedReplacements[newOriginal.toLowerCase()] = newReplacement;

        setReplacements(updatedReplacements);
        skipNextFetchRef.current = true;

        try {
            if (oldOriginal) {
                // Remove old entry
                await supabase
                    .from('vocabulary')
                    .delete()
                    .eq('original', oldOriginal.toLowerCase())
                    .eq('user_id', session.user.id);
            }

            // check if entry already exists to avoid PK violation if we just updated text without changing original?
            // Actually, we use original as key loosely in UI.

            // Add/Update entry
            const { error } = await supabase
                .from('vocabulary')
                .upsert({
                    user_id: session.user.id,
                    original: newOriginal.toLowerCase(),
                    replacement: newReplacement
                }, { onConflict: 'user_id,original' });

            if (error) {
                console.error("Error updating replacement:", error);
                setReplacements(previousReplacements);
                return;
            }
        } catch (err) {
            console.error("Update failed:", err);
            setReplacements(previousReplacements);
        } finally {
            setIsSaving(false);
        }
    }, [replacements]);

    const addReplacement = useCallback(async (original: string, replacement: string) => {
        return updateReplacement(null, original, replacement);
    }, [updateReplacement]);

    const deleteReplacement = useCallback(async (original: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const previousReplacements = { ...replacements };
        const updatedReplacements = { ...replacements };
        delete updatedReplacements[original];
        setReplacements(updatedReplacements);
        skipNextFetchRef.current = true;

        const { error } = await supabase
            .from('vocabulary')
            .delete()
            .eq('original', original.toLowerCase())
            .eq('user_id', session.user.id);

        if (error) {
            console.error("Error deleting replacement:", error);
            setReplacements(previousReplacements);
        }
    }, [replacements]);

    return {
        replacements,
        isLoading,
        isSaving,
        updateReplacement,
        addReplacement, // Restored
        deleteReplacement,
        refresh: fetchReplacements
    };
}

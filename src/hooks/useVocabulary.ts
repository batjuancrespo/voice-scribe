"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Store compartido: varias componentes llaman useVocabulary() y cada una
// creaba su propio estado. Una corrección añadida en un panel (p. ej.
// LearningDashboard) no llegaba al dictado (TranscriptionEditor) hasta
// recargar. Con este store, el estado es único y todas las instancias
// se sincronizan al instante.
let sharedReplacements: Record<string, string> = {};
const listeners = new Set<() => void>();

const setShared = (next: Record<string, string>) => {
    sharedReplacements = next;
    listeners.forEach(l => l());
};

export function useVocabulary() {
    const [replacements, setReplacements] = useState(sharedReplacements);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const skipNextFetchRef = useRef(false);

    // Suscripción al store compartido
    useEffect(() => {
        const listener = () => setReplacements(sharedReplacements);
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    }, []);

    const fetchReplacements = useCallback(async () => {
        if (skipNextFetchRef.current) {
            skipNextFetchRef.current = false;
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setShared({});
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
            (data || []).forEach(item => {
                map[item.original] = item.replacement;
            });
            setShared(map);
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

        const previousReplacements = { ...sharedReplacements };
        const updatedReplacements = { ...sharedReplacements };

        if (oldOriginal && updatedReplacements[oldOriginal]) {
            delete updatedReplacements[oldOriginal];
        }
        updatedReplacements[newOriginal.toLowerCase()] = newReplacement;

        setShared(updatedReplacements);
        skipNextFetchRef.current = true;

        try {
            const { error } = await supabase
                .from('vocabulary')
                .upsert({
                    user_id: session.user.id,
                    original: newOriginal.toLowerCase(),
                    replacement: newReplacement
                }, { onConflict: 'user_id,original' });

            if (error) {
                console.error("Error updating replacement:", error);
                setShared(previousReplacements);
                return;
            }
        } catch (err) {
            console.error("Update failed:", err);
            setShared(previousReplacements);
        } finally {
            setIsSaving(false);
        }
    }, []);

    const addReplacement = useCallback(async (original: string, replacement: string) => {
        return updateReplacement(null, original, replacement);
    }, [updateReplacement]);

    const deleteReplacement = useCallback(async (original: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const previousReplacements = { ...sharedReplacements };
        const updatedReplacements = { ...sharedReplacements };
        delete updatedReplacements[original];
        setShared(updatedReplacements);
        skipNextFetchRef.current = true;

        const { error } = await supabase
            .from('vocabulary')
            .delete()
            .eq('original', original.toLowerCase())
            .eq('user_id', session.user.id);

        if (error) {
            console.error("Error deleting replacement:", error);
            setShared(previousReplacements);
        }
    }, []);

    return {
        replacements,
        isLoading,
        isSaving,
        updateReplacement,
        addReplacement,
        deleteReplacement,
        refresh: fetchReplacements
    };
}

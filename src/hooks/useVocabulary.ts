"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type ReplacementMap = Record<string, string>;

export const useVocabulary = () => {
    const [replacements, setReplacements] = useState<ReplacementMap>({});

    useEffect(() => {
        const fetchVocabulary = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('vocabulary')
                .select('original, replacement');

            if (error) {
                console.error("Error fetching vocabulary:", error);
                return;
            }

            if (data) {
                const map: ReplacementMap = {};
                data.forEach((item: { original: string; replacement: string }) => {
                    map[item.original.toLowerCase()] = item.replacement;
                });
                setReplacements(map);
            }
        };

        fetchVocabulary();
        // Subscribe to realtime changes? Optional for now.
    }, []);

    const addReplacement = async (original: string, replacement: string) => {
        // Optimistic update
        setReplacements((prev) => ({ ...prev, [original.toLowerCase()]: replacement }));

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { error } = await supabase
            .from('vocabulary')
            .insert({
                user_id: session.user.id,
                original: original.toLowerCase(),
                replacement
            });

        if (error) {
            console.error("Error adding replacement:", error);
            // Revert on error?
        }
    };

    const removeReplacement = async (original: string) => {
        // Optimistic update
        setReplacements((prev) => {
            const next = { ...prev };
            delete next[original.toLowerCase()];
            return next;
        });

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { error } = await supabase
            .from('vocabulary')
            .delete()
            .eq('original', original.toLowerCase())
            .eq('user_id', session.user.id);

        if (error) {
            console.error("Error removing replacement:", error);
        }
    };

    return {
        replacements,
        addReplacement,
        removeReplacement
    };
};

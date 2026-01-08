"use client";

import { useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface AutoCorrectionConfig {
    enabled: boolean;
    minConfidence: number; // Minimum confidence to auto-apply (default 0.95)
    onlyLearnedTerms: boolean; // Only auto-correct previously learned errors
}

export interface AutoCorrectionLog {
    id: string;
    original: string;
    corrected: string;
    confidence: number;
    timestamp: string;
    reverted: boolean;
}

const DEFAULT_CONFIG: AutoCorrectionConfig = {
    enabled: true,
    minConfidence: 0.95,
    onlyLearnedTerms: true
};

export function useAutoCorrection() {
    /**
     * Check if a correction should be auto-applied
     */
    const shouldAutoApply = useCallback(async (
        original: string,
        corrected: string,
        confidence: number,
        config: AutoCorrectionConfig = DEFAULT_CONFIG
    ): Promise<boolean> => {
        if (!config.enabled) return false;
        if (confidence < config.minConfidence) return false;

        // If config requires only learned terms, check the learning stats
        if (config.onlyLearnedTerms) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { data, error } = await supabase
                .from('learning_stats')
                .select('frequency, auto_learned')
                .eq('user_id', user.id)
                .eq('error_pattern', original.toLowerCase().trim())
                .eq('correction', corrected.trim())
                .single();

            if (error || !data) return false;

            // Auto-apply if it has been seen 2+ times
            return data.frequency >= 2;
        }

        return true;
    }, []);

    /**
     * Apply auto-corrections to text
     */
    const applyAutoCorrections = useCallback(async (
        text: string,
        corrections: Array<{ original: string; corrected: string; confidence: number }>,
        config: AutoCorrectionConfig = DEFAULT_CONFIG
    ): Promise<{
        correctedText: string;
        appliedCorrections: AutoCorrectionLog[];
    }> => {
        let correctedText = text;
        const appliedCorrections: AutoCorrectionLog[] = [];

        for (const correction of corrections) {
            const shouldApply = await shouldAutoApply(
                correction.original,
                correction.corrected,
                correction.confidence,
                config
            );

            if (shouldApply) {
                // Apply the correction
                const regex = new RegExp(
                    correction.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                    'gi'
                );
                correctedText = correctedText.replace(regex, correction.corrected);

                // Log the auto-correction
                appliedCorrections.push({
                    id: `${Date.now()}-${Math.random()}`,
                    original: correction.original,
                    corrected: correction.corrected,
                    confidence: correction.confidence,
                    timestamp: new Date().toISOString(),
                    reverted: false
                });

                // Save to correction history
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase
                        .from('correction_history')
                        .insert({
                            user_id: user.id,
                            original_text: correction.original,
                            corrected_text: correction.corrected,
                            confidence: correction.confidence,
                            applied: true,
                            auto_applied: true
                        });
                }
            }
        }

        return { correctedText, appliedCorrections };
    }, [shouldAutoApply]);

    /**
     * Get auto-correction log for today
     */
    const getAutoCorrectLog = useCallback(async (): Promise<AutoCorrectionLog[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('correction_history')
            .select('*')
            .eq('user_id', user.id)
            .eq('auto_applied', true)
            .gte('created_at', today.toISOString())
            .order('created_at', { ascending: false });

        if (error || !data) return [];

        return data.map(item => ({
            id: item.id,
            original: item.original_text,
            corrected: item.corrected_text,
            confidence: item.confidence || 0,
            timestamp: item.created_at,
            reverted: false
        }));
    }, []);

    /**
     * Revert an auto-correction
     */
    const revertAutoCorrection = useCallback(async (logId: string): Promise<boolean> => {
        // Mark as reverted (we'd need to add this field to the schema)
        // For now, just delete it
        const { error } = await supabase
            .from('correction_history')
            .delete()
            .eq('id', logId);

        return !error;
    }, []);

    return {
        shouldAutoApply,
        applyAutoCorrections,
        getAutoCorrectLog,
        revertAutoCorrection,
        DEFAULT_CONFIG
    };
}

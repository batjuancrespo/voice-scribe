"use client";

import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface CorrectionRecord {
    originalText: string;
    correctedText: string;
    confidence?: number;
    contextBefore?: string;
    contextAfter?: string;
    correctionType?: 'word' | 'phrase' | 'punctuation';
}

export interface LearningStat {
    id: string; // Quality 8.6: Use UUID for robust matching
    errorPattern: string;
    correction: string;
    frequency: number;
    lastSeen: string;
    autoLearned: boolean;
}

export function useErrorTracking() {
    const logCorrection = useCallback(async (record: CorrectionRecord, applied: boolean = true) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Insert into correction_history
            const { error: historyError } = await supabase
                .from('correction_history')
                .insert({
                    user_id: user.id,
                    original_text: record.originalText,
                    corrected_text: record.correctedText,
                    confidence: record.confidence || 0,
                    applied,
                    context_before: record.contextBefore,
                    context_after: record.contextAfter,
                    correction_type: record.correctionType || 'word'
                });

            if (historyError) {
                console.error('Error logging correction:', historyError);
                return;
            }

            // Update learning stats if correction was applied
            if (applied) {
                const contextHints = {
                    before: record.contextBefore?.split(' ').slice(-3) || [],
                    after: record.contextAfter?.split(' ').slice(0, 3) || []
                };

                const { error: statsError } = await supabase
                    .rpc('increment_learning_stat', {
                        p_user_id: user.id,
                        p_error_pattern: record.originalText.toLowerCase().replace(/\s+/g, ' ').trim(),
                        p_correction: record.correctedText.replace(/\s+/g, ' ').trim(),
                        p_context: contextHints
                    });

                if (statsError) {
                    console.error('Error updating stats:', statsError);
                }
            }
        } catch (error) {
            console.error('Error in logCorrection:', error);
        }
    }, []);

    const getFrequentErrors = useCallback(async (limit: number = 10): Promise<LearningStat[]> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('learning_stats')
                .select('*')
                .eq('user_id', user.id)
                .eq('auto_learned', false) // Quality 8.6: Only show pending decisions
                .order('frequency', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching frequent errors:', error);
                return [];
            }

            return data.map(stat => ({
                id: stat.id,
                errorPattern: stat.error_pattern,
                correction: stat.correction,
                frequency: stat.frequency,
                lastSeen: stat.last_seen,
                autoLearned: stat.auto_learned
            }));
        } catch (error) {
            console.error('Error in getFrequentErrors:', error);
            return [];
        }
    }, []);

    const shouldSuggestLearning = useCallback(async (errorPattern: string): Promise<boolean> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { data, error } = await supabase
                .from('learning_stats')
                .select('frequency, auto_learned')
                .eq('user_id', user.id)
                .eq('error_pattern', errorPattern.toLowerCase().trim())
                .single();

            if (error || !data) return false;

            // Suggest learning if seen 3+ times and not already learned
            return data.frequency >= 3 && !data.auto_learned;
        } catch (error) {
            return false;
        }
    }, []);

    const markAsAutoLearned = useCallback(async (statId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error, count } = await supabase
                .from('learning_stats')
                .update({ auto_learned: true })
                .eq('id', statId)
                .eq('user_id', user.id);

            if (error) console.error('Error marking as auto-learned:', error);
            else console.log(`[useErrorTracking] Learned/Hidden record ${statId}, count: ${count}`);
        } catch (error) {
            console.error('Error marking as auto-learned:', error);
        }
    }, []);

    const ignoreErrorPattern = useCallback(async (statId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error, count } = await supabase
                .from('learning_stats')
                .delete({ count: 'exact' })
                .eq('id', statId)
                .eq('user_id', user.id);

            if (error) {
                console.error('Error ignoring error pattern:', error);
            } else {
                console.log(`[useErrorTracking] Deleted record ${statId}, count: ${count}`);
            }
        } catch (error) {
            console.error('Unexpected error in ignoreErrorPattern:', error);
        }
    }, []);

    return {
        logCorrection,
        getFrequentErrors,
        shouldSuggestLearning,
        markAsAutoLearned,
        ignoreErrorPattern
    };
}

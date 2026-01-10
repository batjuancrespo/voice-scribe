"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranscription } from '@/hooks/useTranscription';
import { useVocabulary } from '@/hooks/useVocabulary';
import { useTemplates } from '@/hooks/useTemplates';
import { processTranscriptSegment } from '@/lib/textProcessor';
import { VocabularySettings } from '@/components/VocabularySettings';
import { TemplateManager } from '@/components/TemplateManager';
import { StructuredTemplateEditor } from '@/components/StructuredTemplateEditor';
import { supabase } from '@/lib/supabaseClient';
import { Template } from '@/hooks/useTemplates';
import { useAudioLevel } from '@/hooks/useAudioLevel';
import { useAudioQuality } from '@/hooks/useAudioQuality';
import { useAutomaticContext } from '@/hooks/useAutomaticContext';
import { useMedicalLogic } from '@/hooks/useMedicalLogic';
import { useLearningStats } from '@/hooks/useLearningStats';
import { AiSettingsModal } from './AiSettingsModal';
import { CorrectionReviewModal } from './CorrectionReviewModal';
import { LearningDashboard } from './LearningDashboard';
import { TrainingMode } from './TrainingMode';
import { Mic, Square, Trash2, Copy, Check, Settings, Sparkles, Wand2, LogOut, LayoutTemplate, MessageSquare, AlertTriangle, BookPlus, X, Sun, Moon, FileText, Book, TrendingUp, Target } from 'lucide-react';
import { computeDiff, extractCorrectionPairs } from '@/lib/diffUtils';
import { twMerge } from 'tailwind-merge';

export function TranscriptionEditor() {
    const [fullText, setFullText] = useState('');
    const { activeContexts } = useAutomaticContext(fullText);

    const { replacements, addReplacement } = useVocabulary();
    const { getMostUsedTerms } = useLearningStats();
    const [frequentTerms, setFrequentTerms] = useState<string[]>([]);

    useEffect(() => {
        getMostUsedTerms(20).then(terms => {
            setFrequentTerms(terms.map(t => t.term));
        });
    }, [getMostUsedTerms]);

    // Combine frequent terms + context boosted terms
    const [boostedTerms, setBoostedTerms] = useState<string[]>([]);
    useEffect(() => {
        // Collect terms from all active contexts
        const contextTerms = activeContexts.flatMap(ctx => ctx.terms) || [];
        // Unique terms only
        const uniqueContextTerms = Array.from(new Set(contextTerms));

        setBoostedTerms([...frequentTerms, ...uniqueContextTerms]);
    }, [activeContexts, frequentTerms]);

    const {
        isListening,
        interimResult,
        lastEvent,
        error,
        startListening,
        stopListening,
    } = useTranscription(replacements, boostedTerms);

    const { templates } = useTemplates();
    const { audioLevel, isLow, isMuted, initialize: initAudio, cleanup: cleanupAudio } = useAudioLevel();
    const { quality, snr, recommendation } = useAudioQuality(isListening);
    const { issues: medicalIssues } = useMedicalLogic(fullText);

    const [showSettings, setShowSettings] = useState(false);
    const [showAiSettings, setShowAiSettings] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [showTraining, setShowTraining] = useState(false);
    const [editSuggestion, setEditSuggestion] = useState<{ original: string, replacement: string } | null>(null);
    const isAutoChangeRef = useRef(false);
    const sentinelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSentinelProcessedRef = useRef<string>("");

    const [aiKey, setAiKey] = useState<string | null>(null);
    const [aiModel, setAiModel] = useState('gemini-1.5-flash');

    // Sync AI Settings from localStorage
    useEffect(() => {
        setAiKey(localStorage.getItem('gemini_api_key'));
        setAiModel(localStorage.getItem('gemini_model') || 'gemini-1.5-flash');
    }, [showAiSettings]);

    // Sentinel Background Correction (Quality 7.0)
    useEffect(() => {
        const trimmed = fullText.trim();
        // Trigger when a sentence ends with punctuation or newline
        if (/[.\n]$/.test(trimmed) && trimmed !== lastSentinelProcessedRef.current && !isListening) {
            if (sentinelTimeoutRef.current) clearTimeout(sentinelTimeoutRef.current);

            sentinelTimeoutRef.current = setTimeout(async () => {
                // Find last sentence segment (limit to last 200 chars to keep it fast/cheap)
                const lastSegment = trimmed.slice(-200);
                const sentences = lastSegment.split(/(?<=[.\n])/);
                const lastSentence = sentences[sentences.length - 1].trim();

                if (lastSentence.length < 15 || lastSentence.split(' ').length < 3) return;

                console.log("[Sentinel] Background refining:", lastSentence);
                try {
                    const response = await fetch('/api/ai/correct', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: lastSentence,
                            apiKey: aiKey,
                            model: aiModel,
                            mode: 'sentinel'
                        })
                    });
                    const data = await response.json();
                    if (data.correctedText && data.correctedText.trim() !== lastSentence && data.correctedText.length > 5) {
                        console.log("[Sentinel] Applied silent correction:", data.correctedText);
                        setFullText(prev => {
                            // Only replace if the original is still there to avoid race conditions
                            if (prev.includes(lastSentence)) {
                                const newText = prev.replace(lastSentence, data.correctedText.trim());
                                lastSentinelProcessedRef.current = newText.trim();
                                return newText;
                            }
                            return prev;
                        });
                    } else {
                        lastSentinelProcessedRef.current = trimmed;
                    }
                } catch (e) {
                    console.error("Sentinel error:", e);
                }
            }, 3000); // 3 second delay
        }
    }, [fullText, aiKey, aiModel, isListening]);

    // Auto-Punctuation by Silence (Quality 9.1)
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (!isListening) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            return;
        }

        // Reset timer on any transcription activity
        if (interimResult || lastEvent) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            silenceTimerRef.current = setTimeout(() => {
                setFullText(prev => {
                    const trimmed = prev.trim();
                    if (!trimmed) return prev;
                    // If doesn't end in punctuation, add a period
                    if (!/[.!?:](\s+)?$/.test(trimmed)) {
                        console.log("[Auto-Punctuation] Silence detected, adding period.");
                        return trimmed + ". ";
                    }
                    return prev;
                });
            }, 1800); // 1.8s silence threshold for auto-period
        }

        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, [interimResult, lastEvent, isListening]);
    const [isCorrecting, setIsCorrecting] = useState(false);
    const [activeStructuredTemplate, setActiveStructuredTemplate] = useState<Template | null>(null);
    const [reviewData, setReviewData] = useState<{ original: string; corrected: string; confidence?: number } | null>(null);
    const [darkMode, setDarkMode] = useState(true); // Dark mode by default
    const [lastCopiedText, setLastCopiedText] = useState('');

    // fullText state moved up
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

    // Refs to access latest state inside valid event effect without re-triggering
    const fullTextRef = useRef(fullText);
    const selectionRangeRef = useRef(selectionRange);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync refs
    useEffect(() => { fullTextRef.current = fullText; }, [fullText]);
    useEffect(() => { selectionRangeRef.current = selectionRange; }, [selectionRange]);

    // Keyboard Shortcut: Shift + Meta (Command/Windows)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Meta is Command on Mac, Windows key on Windows.
            // Check for Shift + Meta
            if (e.shiftKey && (e.metaKey || e.ctrlKey)) {
                // If the user wants Shift+Meta specifically, but on some browsers Meta might be blocked or tied to OS.
                // We'll also allow Shift+Ctrl as a fallback for some environments.
                e.preventDefault();

                if (isListening) {
                    stopListening();
                    cleanupAudio();
                } else {
                    startListening();
                    initAudio();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isListening, startListening, stopListening, initAudio, cleanupAudio]);

    // Dark mode effect
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // Track selection changes
    const handleSelect = () => {
        if (textareaRef.current) {
            setSelectionRange({
                start: textareaRef.current.selectionStart,
                end: textareaRef.current.selectionEnd
            });
        }
    };

    // Auto-copy to clipboard when text changes
    useEffect(() => {
        if (!fullText) return;

        const timer = setTimeout(() => {
            navigator.clipboard.writeText(fullText).then(() => {
                setLastCopiedText(fullText);
            }).catch(err => console.error('Auto-copy failed:', err));
        }, 1000);

        return () => clearTimeout(timer);
    }, [fullText]);

    const handleCopyToClipboard = async () => {
        if (fullText) {
            await navigator.clipboard.writeText(fullText);
            setLastCopiedText(fullText);
        }
    };

    const getSelectedText = () => {
        if (selectionRange && selectionRange.start !== selectionRange.end) {
            return fullText.substring(selectionRange.start, selectionRange.end);
        }
        return '';
    };

    const handleApplyCorrection = (original: string, replacement: string) => {
        // Replace all occurrences of the original text with the replacement (case insensitive)
        const regex = new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const newText = fullText.replace(regex, replacement);
        setFullText(newText);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    // Manual Edit Detection for Auto-Learning (Deep N-Grams)
    const handleManualChange = (newValue: string) => {
        const oldValue = fullText;
        setFullText(newValue);

        if (isListening || isAutoChangeRef.current) return;

        // Compare if it's a small correction
        const diff = computeDiff(oldValue, newValue);

        // Extract sequences of removed/added words
        // We look for contiguous blocks of changes
        const removed = diff.filter(d => d.removed).map(d => d.value.trim()).filter(v => v.length > 0);
        const added = diff.filter(d => d.added).map(d => d.value.trim()).filter(v => v.length > 0);

        // N-Gram Detection Logic:
        // Case A: 1-to-1 word (handled before)
        // Case B: Multi-word phrase replaced by another phrase (Sprint 4)
        if (removed.length > 0 && added.length > 0 && removed.length <= 3 && added.length <= 3) {
            const orig = removed.join(' ').toLowerCase();
            const repl = added.join(' ');

            // Only suggest if different and not already in dictionary
            if (orig !== repl.toLowerCase() && !replacements[orig]) {
                setEditSuggestion({ original: orig, replacement: repl });
            }
        }
    };

    const handleAiCorrection = async () => {
        // const apiKey = localStorage.getItem('gemini_api_key');
        // if (!apiKey) {
        //     setShowAiSettings(true);
        //     return;
        // }
        // ALLOWING EMPTY API KEY to support Server-Side Environment Variable Fallback
        const apiKey = localStorage.getItem('gemini_api_key') || '';

        const model = localStorage.getItem('gemini_model') || 'gemini-1.5-flash-001';

        if (!fullText.trim()) return;

        setIsCorrecting(true);
        try {
            const response = await fetch('/api/ai/correct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: fullText,
                    apiKey,
                    model,
                    userDictionary: replacements // Pass user vocabulary for phonetic matching
                })
            });

            const data = await response.json();

            if (response.ok && data.correctedText) {
                setReviewData({
                    original: fullText,
                    corrected: data.correctedText,
                    confidence: data.confidence || 0.8
                });
            } else {
                console.error('AI Error:', data.error);
                if (response.status === 401) {
                    setShowAiSettings(true); // Open settings if auth fails
                }
                alert('Error al corregir: ' + (data.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('AI Request Failed:', error);
            alert('Error de conexión con la IA');
        } finally {
            setIsCorrecting(false);
        }
    };

    const handleApplyReview = (finalText: string) => {
        const originalText = reviewData?.original || '';

        // Implicit Learning (Quality 8.4): Precise n-gram extraction
        if (originalText && finalText !== originalText) {
            const diff = computeDiff(originalText, finalText);
            const corrections = extractCorrectionPairs(diff);

            corrections.forEach(({ original: orig, replacement: repl }) => {
                // Only learn short, meaningful phrases (max 4 words) to avoid AI rewrite noise
                const wordCountOrig = orig.split(/\s+/).length;
                const wordCountRepl = repl.split(/\s+/).length;

                if (wordCountOrig <= 4 && wordCountRepl <= 4) {
                    console.log(`[Auto-Learning Phrase] Precise Match: "${orig}" -> "${repl}"`);
                    addReplacement(orig.toLowerCase(), repl);
                }
            });
        }

        setFullText(finalText);
        setSelectionRange({ start: finalText.length, end: finalText.length });
        setReviewData(null);
    };

    const handleInsertTemplate = useCallback((content: string) => {
        const prev = fullTextRef.current;
        const range = selectionRangeRef.current || { start: prev.length, end: prev.length };

        const newText = prev.substring(0, range.start) + content + prev.substring(range.end);
        setFullText(newText);

        const newPos = range.start + content.length;
        setSelectionRange({ start: newPos, end: newPos });

        setShowTemplates(false);
        setActiveStructuredTemplate(null);
        setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(newPos, newPos);
        }, 0);
    }, []);

    const handleOpenStructuredTemplate = useCallback((template: Template) => {
        setShowTemplates(false);
        setActiveStructuredTemplate(template);
    }, []);

    // Main Transcription Logic
    useEffect(() => {
        if (lastEvent && !activeStructuredTemplate) {
            const prevText = fullTextRef.current;
            const range = selectionRangeRef.current || { start: prevText.length, end: prevText.length };

            const context = prevText.substring(0, range.start);
            let processedText = processTranscriptSegment(lastEvent.text, replacements, context);

            let before = prevText.substring(0, range.start);
            const after = prevText.substring(range.end);

            // Voice Command: Template Insertion
            const templateCommandMatch = processedText.match(/insertar plantilla\s+(.+)/i);
            if (templateCommandMatch) {
                const templateName = templateCommandMatch[1].trim().replace(/[.,?!]$/, '');
                const template = templates.find(t => t.name.toLowerCase() === templateName.toLowerCase());
                if (template) {
                    processedText = template.content;
                }
            }

            // Voice Command: Editing (Sprint 2)
            if (processedText.toLowerCase().includes('borrar última palabra')) {
                const parts = before.trimEnd().split(/\s+/);
                if (parts.length > 0) {
                    parts.pop();
                    before = parts.join(' ');
                    // Add back space if needed
                    if (before.length > 0) before += ' ';
                }
                processedText = ''; // Consume the command
            } else if (processedText.toLowerCase().includes('borrar línea') || processedText.toLowerCase().includes('borrar párrafo')) {
                const lines = before.split('\n');
                if (lines.length > 0) {
                    lines.pop();
                    before = lines.join('\n');
                    if (before.length > 0 && !before.endsWith('\n')) before += '\n';
                }
                processedText = ''; // Consume the command
            } else if (processedText.toLowerCase().includes('deshacer dictado') || processedText.toLowerCase() === 'deshacer') {
                // Restore previous text before this segment
                setFullText(prevText);
                return; // Stop processing this event
            }

            if (/^[.,:;?!]/.test(processedText)) {
                before = before.trimEnd();
            }

            if (/\n\s*$/.test(before)) {
                processedText = processedText.trimStart();
            }

            if (before.endsWith(' ') && processedText.startsWith(' ')) {
                processedText = processedText.trimStart();
            } else if (!before.endsWith(' ') && !before.endsWith('\n') && !processedText.startsWith(' ') && before.trim().length > 0 && !/[.\n]$/.test(before.trim())) {
                if (!/^[.,:;?!]/.test(processedText) && !processedText.startsWith('\n')) {
                    processedText = ' ' + processedText;
                }
            }

            if (after && !after.startsWith(' ') && !/^[.,:;?!?\n]/.test(after)) {
                if (!processedText.endsWith(' ')) {
                    processedText += ' ';
                }
            }

            const newText = before + processedText + after;
            const newPos = before.length + processedText.length;

            isAutoChangeRef.current = true;
            setFullText(newText);
            setSelectionRange({ start: newPos, end: newPos });

            // Reset the auto-change flag after react has processed it
            setTimeout(() => { isAutoChangeRef.current = false; }, 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastEvent]);

    // Sync DOM selection
    useEffect(() => {
        if (selectionRange && textareaRef.current) {
            if (document.activeElement === textareaRef.current) {
                textareaRef.current.setSelectionRange(selectionRange.start, selectionRange.end);
                textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
            }
        }
    }, [selectionRange, fullText]);

    // Initialize audio level monitoring when listening starts
    useEffect(() => {
        if (isListening) {
            initAudio();
        } else {
            cleanupAudio();
        }
        return () => cleanupAudio();
    }, [isListening]);

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto p-6 space-y-6">
            <header className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white uppercase italic">
                        Voice-Scribe <span className="text-[var(--accent)]">Pro</span>
                    </h1>
                    <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--accent)] uppercase opacity-80">
                        Wayne Medical Division • Gotham City
                    </span>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                        title={darkMode ? "Modo claro" : "Modo oscuro"}
                    >
                        {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
                    </button>
                    <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                        title="Plantillas"
                    >
                        <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                        onClick={() => setShowAiSettings(!showAiSettings)}
                        className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                        title="Configuración IA"
                    >
                        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </button>
                    <button
                        onClick={() => setShowDashboard(!showDashboard)}
                        className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                        title="Panel de Aprendizaje"
                    >
                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button
                        onClick={() => setShowTraining(!showTraining)}
                        className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                        title="Modo Entrenamiento"
                    >
                        <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                        title="Diccionario"
                    >
                        <Book className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800"
                        title="Cerrar sesión"
                    >
                        <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-red-600" />
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm border border-red-200 dark:border-red-800">
                    {error}
                </div>
            )}

            <main className="flex-1 relative glass-card rounded-2xl overflow-hidden flex flex-col min-h-[500px]">
                {activeStructuredTemplate ? (
                    <StructuredTemplateEditor
                        templateName={activeStructuredTemplate.name}
                        fields={activeStructuredTemplate.fields || []}
                        onComplete={handleInsertTemplate}
                        onCancel={() => setActiveStructuredTemplate(null)}
                    />
                ) : (
                    <>
                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => { setFullText(''); setSelectionRange({ start: 0, end: 0 }); }}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 flex items-center space-x-2 border border-transparent hover:border-red-200 dark:hover:border-red-800"
                                    title="Borrar todo"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">Borrar</span>
                                </button>
                                <button
                                    onClick={handleCopyToClipboard}
                                    disabled={!fullText}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 flex items-center space-x-2 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Copiar al portapapeles"
                                >
                                    {fullText === lastCopiedText ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    <span className="text-sm font-medium">{fullText === lastCopiedText ? 'Copiado' : 'Copiar'}</span>
                                </button>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleAiCorrection}
                                    disabled={!fullText || isCorrecting}
                                    className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 border ${isCorrecting
                                        ? 'bg-purple-100 text-purple-600 border-purple-200 animate-pulse'
                                        : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-sm hover:shadow'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    title="Corregir con IA"
                                >
                                    {isCorrecting ? <Sparkles className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    <span className="text-sm font-medium">{isCorrecting ? 'Corrigiendo...' : 'Corregir con IA'}</span>
                                </button>
                                <div className={`text-xs font-bold tracking-widest px-3 py-1.5 rounded-full border ${isListening ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'}`}>
                                    {isListening ? '● AUDIO ANALYTICS ACTIVE' : 'SYSTEM READY'}
                                </div>
                                {activeContexts.length > 0 && (
                                    <div className="flex items-center space-x-1 animate-in fade-in slide-in-from-right-4 duration-500">
                                        {activeContexts.map(ctx => (
                                            <div key={ctx.id} className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800">
                                                <Wand2 className="w-3 h-3" />
                                                <span>{ctx.description}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {medicalIssues.length > 0 && (
                                    <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800 animate-in fade-in slide-in-from-right-4 duration-500 cursor-help group relative">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>{medicalIssues.length} alerta{medicalIssues.length !== 1 ? 's' : ''}</span>

                                        {/* Tooltip */}
                                        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 hidden group-hover:block z-50">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Incoherencias detectadas</h4>
                                            <div className="space-y-2">
                                                {medicalIssues.map((issue) => (
                                                    <div key={issue.id} className="text-xs">
                                                        <p className="font-medium text-amber-600 dark:text-amber-400">{issue.text}</p>
                                                        <p className="text-gray-600 dark:text-gray-400">{issue.message}</p>
                                                        {issue.suggestion && (
                                                            <p className="mt-1 text-green-600 dark:text-green-400 font-mono bg-green-50 dark:bg-green-900/20 p-1 rounded">
                                                                Sugerencia: {issue.suggestion}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Editor Area */}
                        <div className="relative flex-1 p-6">
                            <textarea
                                ref={textareaRef}
                                className="w-full h-full resize-none outline-none text-lg leading-relaxed bg-transparent text-gray-800 dark:text-gray-200 font-serif"
                                placeholder="Iniciando secuencia de dictado... Los hallazgos se procesarán encriptados."
                                value={fullText}
                                onChange={(e) => {
                                    handleManualChange(e.target.value);
                                    handleSelect();
                                }}
                                onSelect={handleSelect}
                                onClick={handleSelect}
                                onKeyUp={handleSelect}
                            />

                            {showSettings && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                                    <div className="glass-card rounded-2xl max-w-3xl w-full relative animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
                                        <button
                                            onClick={() => setShowSettings(false)}
                                            className="absolute top-4 right-4 text-white/50 hover:text-[var(--accent)] z-10 p-2 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                        <VocabularySettings
                                            selectedText={getSelectedText()}
                                            onCorrect={handleApplyCorrection}
                                        />
                                    </div>
                                </div>
                            )}

                            {showTemplates && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                                    <TemplateManager
                                        onClose={() => setShowTemplates(false)}
                                        onInsert={handleInsertTemplate}
                                        onInsertStructured={handleOpenStructuredTemplate}
                                    />
                                </div>
                            )}

                            <AiSettingsModal
                                isOpen={showAiSettings}
                                onClose={() => setShowAiSettings(false)}
                            />

                            <CorrectionReviewModal
                                isOpen={!!reviewData}
                                onClose={() => setReviewData(null)}
                                originalText={reviewData?.original || ''}
                                correctedText={reviewData?.corrected || ''}
                                confidence={reviewData?.confidence}
                                onApply={handleApplyReview}
                                onSaveToDictionary={addReplacement}
                            />

                            <LearningDashboard
                                isOpen={showDashboard}
                                onClose={() => setShowDashboard(false)}
                            />

                            <TrainingMode
                                isOpen={showTraining}
                                onClose={() => setShowTraining(false)}
                                isListening={isListening}
                                transcript={lastEvent?.text || ''}
                                onStartListening={() => {
                                    if (!isListening) {
                                        startListening();
                                        initAudio();
                                    }
                                }}
                                onStopListening={() => {
                                    if (isListening) {
                                        stopListening();
                                        cleanupAudio();
                                    }
                                }}
                                onComplete={(results) => {
                                    results.forEach(r => addReplacement(r.error, r.correct));
                                }}
                            />



                            {/* Interim Overlay */}
                            {isListening && interimResult && (
                                <div className="absolute bottom-6 left-6 right-6 bg-blue-50/90 dark:bg-blue-900/30 backdrop-blur-md p-4 rounded-xl text-gray-700 dark:text-gray-300 italic pointer-events-none border-l-4 border-blue-500 shadow-lg">
                                    {interimResult}
                                </div>
                            )}

                            {/* Learning Suggestion Toast */}
                            {editSuggestion && (
                                <div className="absolute top-24 right-6 left-6 sm:left-auto sm:w-80 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded-xl shadow-2xl p-4 animate-in slide-in-from-right duration-300 z-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="bg-purple-100 dark:bg-purple-900/50 p-1.5 rounded-lg">
                                            <BookPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <button onClick={() => setEditSuggestion(null)} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                                        ¿Añadir esta corrección al diccionario para que aprenda?
                                    </p>
                                    <div className="flex items-center space-x-2 text-xs font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded-lg mb-4">
                                        <span className="text-red-500 line-through truncate max-w-[100px]">{editSuggestion.original}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="text-green-600 font-bold truncate max-w-[100px]">{editSuggestion.replacement}</span>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => {
                                                addReplacement(editSuggestion.original, editSuggestion.replacement);
                                                setEditSuggestion(null);
                                            }}
                                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            onClick={() => setEditSuggestion(null)}
                                            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold py-2 rounded-lg transition-colors"
                                        >
                                            Ignorar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {!activeStructuredTemplate && (
                <>
                    <div className="flex justify-center pb-8">
                        <button
                            onClick={() => {
                                if (isListening) {
                                    stopListening();
                                    cleanupAudio();
                                } else {
                                    startListening();
                                    initAudio();
                                }
                            }}
                            className={twMerge(
                                "group relative flex items-center justify-center w-24 h-24 rounded-full shadow-[0_0_50px_rgba(34,211,238,0.2)] dark:shadow-[0_0_50px_rgba(34,211,238,0.4)] transition-all duration-500 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 border-4",
                                isListening
                                    ? "bg-red-600 border-red-400 shadow-red-500/50 focus:ring-red-200"
                                    : "bg-gray-900 border-[var(--accent)] shadow-cyan-500/50 focus:ring-cyan-200"
                            )}
                        >
                            {isListening ? (
                                <Square className="w-10 h-10 text-white fill-current" />
                            ) : (
                                <Mic className="w-12 h-12 text-[var(--accent)]" />
                            )}

                            {/* Pulse effect ring */}
                            {isListening && (
                                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                            )}
                        </button>
                    </div>

                    {/* Unified Audio Status Bar (Stabilized) */}
                    <div className="flex flex-col items-center pb-8 px-4 h-32">
                        <div className={twMerge(
                            "w-full max-w-md space-y-4 transition-all duration-500",
                            isListening ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                        )}>
                            {/* Audio level bar */}
                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner font-sans">
                                <div
                                    className={twMerge(
                                        "h-full transition-all duration-150 ease-out",
                                        isMuted ? 'bg-gray-400' : isLow ? 'bg-yellow-500' : 'bg-indigo-500'
                                    )}
                                    style={{ width: `${audioLevel}%` }}
                                />
                            </div>

                            {/* Unified Info Line */}
                            <div className="flex flex-col items-center justify-center space-y-2 min-h-[48px] font-sans">
                                {isMuted ? (
                                    <div className="flex items-center space-x-2 text-red-500 dark:text-red-400 text-sm font-medium animate-pulse">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>Micrófono silenciado o no detectado</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center space-y-2">
                                        {/* Priority 1: Volume Warning */}
                                        {isLow && (
                                            <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span>Sube el volumen o acércate al micro</span>
                                            </div>
                                        )}

                                        {/* Priority 2: Quality/SNR Info */}
                                        <div className="flex items-center gap-3">
                                            <div className={twMerge(
                                                "px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider border transition-colors duration-300",
                                                quality === 'excellent' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    quality === 'good' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        quality === 'fair' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                            'bg-red-50 text-red-600 border-red-100'
                                            )}>
                                                <div className={twMerge(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    quality === 'excellent' ? 'bg-green-500' :
                                                        quality === 'good' ? 'bg-blue-500' :
                                                            quality === 'fair' ? 'bg-yellow-500' :
                                                                'bg-red-500'
                                                )} />
                                                SNR {snr}dB • {
                                                    quality === 'excellent' ? 'Calidad Óptima' :
                                                        quality === 'good' ? 'Buena Calidad' :
                                                            quality === 'fair' ? 'Calidad Regular' :
                                                                'Ambiente Ruidoso'
                                                }
                                            </div>

                                            {recommendation && !isLow && (
                                                <span className="text-[10px] text-orange-500 font-medium animate-pulse">
                                                    {recommendation}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

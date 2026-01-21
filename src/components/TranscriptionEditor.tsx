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
import { Mic, Square, Trash2, Copy, Check, Sparkles, Wand2, LogOut, AlertTriangle, BookPlus, X, Sun, Moon, FileText, Book, TrendingUp, Target } from 'lucide-react';
import { extractCorrectionPairs } from '@/lib/diffUtils';
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
    const [aiModel, setAiModel] = useState('gemini-2.5-flash');

    // Sync AI Settings from localStorage
    useEffect(() => {
        setAiKey(localStorage.getItem('gemini_api_key'));
        setAiModel(localStorage.getItem('gemini_model') || 'gemini-2.5-flash');
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

    // Theme Image Logic
    const [themeImage, setThemeImage] = useState<string | null>(null);

    // Dark mode and Theme Image effect
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            // Randomly select one of the 3 dark mode images
            const images = ['dark-1.jpg', 'dark-2.jpg', 'dark-3.jpg'];
            const randomImage = images[Math.floor(Math.random() * images.length)];
            setThemeImage(`/images/theme/${randomImage}`);
        } else {
            document.documentElement.classList.remove('dark');
            // Randomly select one of the 3 light mode images
            const images = ['light-1.jpg', 'light-2.jpg', 'light-3.jpg'];
            const randomImage = images[Math.floor(Math.random() * images.length)];
            setThemeImage(`/images/theme/${randomImage}`);
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
        // const oldValue = fullText;
        setFullText(newValue);

        // DISABLED PER USER REQUEST: Manual edit detection was too intrusive.
        // if (isListening || isAutoChangeRef.current) return;

        // // Compare if it's a small correction
        // const diff = computeDiff(oldValue, newValue);

        // // Extract sequences of removed/added words
        // // We look for contiguous blocks of changes
        // const removed = diff.filter(d => d.removed).map(d => d.value.trim()).filter(v => v.length > 0);
        // const added = diff.filter(d => d.added).map(d => d.value.trim()).filter(v => v.length > 0);

        // // N-Gram Detection Logic:
        // // Case A: 1-to-1 word (handled before)
        // // Case B: Multi-word phrase replaced by another phrase (Sprint 4)
        // if (removed.length > 0 && added.length > 0 && removed.length <= 3 && added.length <= 3) {
        //     const orig = removed.join(' ').toLowerCase();
        //     const repl = added.join(' ');

        //     // Only suggest if different and not already in dictionary
        //     // if (orig !== repl.toLowerCase() && !replacements[orig]) {
        //     //     setEditSuggestion({ original: orig, replacement: repl });
        //     // }
        // }
    };

    const handleAiCorrection = async () => {
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
            alert('Error de conexiÃ³n con la IA');
        } finally {
            setIsCorrecting(false);
        }
    };

    const handleApplyReview = (finalText: string) => {
        const originalText = reviewData?.original || '';

        // Implicit Learning (Quality 8.4) - REMOVED PER USER REQUEST (Supervised only)
        // Previous logic automatically added corrections to dictionary. Now relying on manual addition in Review Modal.

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

            // Voice Command: Editing
            if (processedText.toLowerCase().includes('borrar Ãºltima palabra')) {
                const parts = before.trimEnd().split(/\s+/);
                if (parts.length > 0) {
                    parts.pop();
                    before = parts.join(' ');
                    if (before.length > 0) before += ' ';
                }
                processedText = '';
            } else if (processedText.toLowerCase().includes('borrar lÃ­nea') || processedText.toLowerCase().includes('borrar pÃ¡rrafo')) {
                const lines = before.split('\n');
                if (lines.length > 0) {
                    lines.pop();
                    before = lines.join('\n');
                    if (before.length > 0 && !before.endsWith('\n')) before += '\n';
                }
                processedText = '';
            } else if (processedText.toLowerCase().includes('deshacer dictado') || processedText.toLowerCase() === 'deshacer') {
                setFullText(prevText);
                return;
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

            setTimeout(() => { isAutoChangeRef.current = false; }, 0);
        }
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
                        Wayne Medical Division â€¢ Gotham City
                    </span>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={() => setDarkMode(!darkMode)} className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700">
                        {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
                    </button>
                    <button onClick={() => setShowTemplates(!showTemplates)} className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700">
                        <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button onClick={() => setShowAiSettings(!showAiSettings)} className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700">
                        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </button>
                    <button onClick={() => setShowDashboard(!showDashboard)} className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700">
                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button onClick={() => setShowTraining(!showTraining)} className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700">
                        <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </button>
                    <button onClick={() => setShowSettings(!showSettings)} className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700">
                        <Book className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button onClick={handleLogout} className="p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-gray-200 dark:border-gray-700">
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
                        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex space-x-2">
                                <button onClick={() => { setFullText(''); setSelectionRange({ start: 0, end: 0 }); }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center space-x-2 border border-transparent">
                                    <Trash2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">Borrar</span>
                                </button>
                                <button onClick={handleCopyToClipboard} disabled={!fullText} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all flex items-center space-x-2 border border-transparent disabled:opacity-50">
                                    {fullText === lastCopiedText ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    <span className="text-sm font-medium">{fullText === lastCopiedText ? 'Copiado' : 'Copiar'}</span>
                                </button>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={handleAiCorrection} disabled={!fullText || isCorrecting} className={`px-4 py-2 rounded-lg transition-all flex items-center space-x-2 border ${isCorrecting ? 'bg-purple-100 text-purple-600 border-purple-200 animate-pulse' : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm disabled:opacity-50'}`}>
                                    {isCorrecting ? <Sparkles className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    <span className="text-sm font-medium">{isCorrecting ? 'Corrigiendo...' : 'Corregir con IA'}</span>
                                </button>
                                <div className={`text-xs font-bold tracking-widest px-3 py-1.5 rounded-full border ${isListening ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'}`}>
                                    {isListening ? '● ANÁLISIS DE AUDIO ACTIVO' : 'SISTEMA PREPARADO'}
                                </div>
                            </div>
                        </div>

                        <div className="relative flex-1 p-6 flex flex-col">
                            <textarea
                                ref={textareaRef}
                                className="w-full flex-1 resize-none outline-none text-lg leading-relaxed bg-transparent text-gray-800 dark:text-gray-200 font-serif"
                                placeholder="Iniciando secuencia de dictado..."
                                value={fullText}
                                onChange={(e) => {
                                    handleManualChange(e.target.value);
                                    handleSelect();
                                }}
                                onSelect={handleSelect}
                                onClick={handleSelect}
                                onKeyUp={handleSelect}
                            />
                            {isListening && interimResult && (
                                <div className="absolute bottom-6 left-6 right-6 bg-blue-50/90 dark:bg-blue-900/30 backdrop-blur-md p-4 rounded-xl text-gray-700 dark:text-gray-300 italic border-l-4 border-blue-500 shadow-lg">
                                    {interimResult}
                                </div>
                            )}
                        </div>

                        {editSuggestion && (
                            <div className="absolute top-24 right-6 left-6 sm:left-auto sm:w-80 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded-xl shadow-2xl p-4 z-50 animate-in slide-in-from-right">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="bg-purple-100 p-1.5 rounded-lg">
                                        <BookPlus className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <button onClick={() => setEditSuggestion(null)} className="text-gray-400 hover:text-gray-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Â¿AÃ±adir correcciÃ³n?</p>
                                <div className="flex items-center space-x-2 text-xs font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded-lg mb-4">
                                    <span className="text-red-500 line-through truncate">{editSuggestion.original}</span>
                                    <span>â†’</span>
                                    <span className="text-green-600 font-bold truncate">{editSuggestion.replacement}</span>
                                </div>
                                <div className="flex space-x-2">
                                    <button onClick={() => { addReplacement(editSuggestion.original, editSuggestion.replacement); setEditSuggestion(null); }} className="flex-1 bg-purple-600 text-white text-xs font-bold py-2 rounded-lg">Guardar</button>
                                    <button onClick={() => setEditSuggestion(null)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-xs font-bold py-2 rounded-lg">Ignorar</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {!activeStructuredTemplate && (
                <>
                    <div className="flex justify-center pb-8 shrink-0">
                        <button
                            onClick={() => { if (isListening) { stopListening(); cleanupAudio(); } else { startListening(); initAudio(); } }}
                            className={twMerge(
                                "group relative flex items-center justify-center w-24 h-24 rounded-full shadow-lg transition-all transform hover:scale-110 active:scale-95 border-4",
                                isListening ? "bg-red-600 border-red-400 shadow-red-500/50" : "bg-gray-900 border-[var(--accent)] shadow-cyan-500/50"
                            )}
                        >
                            {isListening ? <Square className="w-10 h-10 text-white fill-current" /> : <Mic className="w-12 h-12 text-[var(--accent)]" />}
                            {isListening && <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>}
                        </button>
                    </div>

                    <div className="flex flex-col items-center pb-8 px-4 h-32 shrink-0">
                        <div className={twMerge("w-full max-w-md space-y-4 transition-all duration-500", isListening ? "opacity-100" : "opacity-0 pointer-events-none")}>
                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className={twMerge("h-full transition-all duration-150", isMuted ? 'bg-gray-400' : isLow ? 'bg-yellow-500' : 'bg-indigo-500')} style={{ width: `${audioLevel}%` }} />
                            </div>
                            <div className="flex flex-col items-center justify-center space-y-2 min-h-[48px]">
                                {isMuted ? (
                                    <div className="flex items-center space-x-2 text-red-500 text-sm font-medium animate-pulse">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>MicrÃ³fono silenciado</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center space-y-1">
                                        {isLow && <div className="text-yellow-600 text-xs">Sube el volumen</div>}
                                        <div className={twMerge("px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase", quality === 'excellent' ? 'bg-green-50 text-green-600' : quality === 'good' ? 'bg-blue-50 text-blue-600' : quality === 'fair' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600')}>
                                            <div className={twMerge("w-1.5 h-1.5 rounded-full", quality === 'excellent' ? 'bg-green-500' : quality === 'good' ? 'bg-blue-500' : quality === 'fair' ? 'bg-yellow-500' : 'bg-red-500')} />
                                            SNR {snr}dB â€¢ {quality === 'excellent' ? 'EXCELENTE' : quality === 'good' ? 'BUENO' : quality === 'fair' ? 'REGULAR' : 'MALO'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* MODALS RELOCATED TO ROOT */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="glass-card rounded-2xl max-w-3xl w-full relative animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col border border-white/10 shadow-2xl overflow-hidden">
                        <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-white/50 hover:text-[var(--accent)] z-10 p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
                        <div className="flex-1 overflow-y-auto">
                            <VocabularySettings selectedText={getSelectedText()} onCorrect={handleApplyCorrection} />
                        </div>
                    </div>
                </div>
            )}

            {showTemplates && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <TemplateManager onClose={() => setShowTemplates(false)} onInsert={handleInsertTemplate} onInsertStructured={handleOpenStructuredTemplate} />
                </div>
            )}

            <AiSettingsModal isOpen={showAiSettings} onClose={() => setShowAiSettings(false)} />
            <CorrectionReviewModal isOpen={!!reviewData} onClose={() => setReviewData(null)} originalText={reviewData?.original || ''} correctedText={reviewData?.corrected || ''} confidence={reviewData?.confidence} onApply={handleApplyReview} onSaveToDictionary={addReplacement} />
            <LearningDashboard isOpen={showDashboard} onClose={() => setShowDashboard(false)} />
            <TrainingMode isOpen={showTraining} onClose={() => setShowTraining(false)} isListening={isListening} transcript={lastEvent?.text || ''} onStartListening={() => { if (!isListening) { startListening(); initAudio(); } }} onStopListening={() => { if (isListening) { stopListening(); cleanupAudio(); } }} onComplete={(results) => { results.forEach(r => addReplacement(r.error, r.correct)); }} />
            {/* Theme Image (Dynamic) */}
            {themeImage && (
                <img
                    src={themeImage}
                    alt="Theme Illustration"
                    className={twMerge(
                        "fixed bottom-0 right-0 max-h-[500px] w-auto pointer-events-none -z-10 animate-in fade-in duration-1000 slide-in-from-bottom-10",
                        // Frame/Border Styling
                        "border-4 border-white/50 dark:border-white/10 shadow-2xl rounded-tl-3xl",
                        // Mode specific blending
                        darkMode ? "opacity-40 mix-blend-luminosity" : "opacity-100 mix-blend-multiply"
                    )}
                />
            )}
        </div>
    );
}

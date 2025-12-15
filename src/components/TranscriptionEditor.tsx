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
import { Mic, Square, Trash2, Book, FileText, Copy, Moon, Sun, Check, LogOut, AlertTriangle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export function TranscriptionEditor() {
    const {
        isListening,
        interimResult,
        lastEvent,
        error,
        startListening,
        stopListening,
    } = useTranscription();

    const { replacements } = useVocabulary();
    const { templates } = useTemplates();
    const { audioLevel, isLow, isMuted, initialize: initAudio, cleanup: cleanupAudio } = useAudioLevel();

    const [showSettings, setShowSettings] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [activeStructuredTemplate, setActiveStructuredTemplate] = useState<Template | null>(null);
    const [darkMode, setDarkMode] = useState(true); // Dark mode by default
    const [copied, setCopied] = useState(false);

    const [fullText, setFullText] = useState('');
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

    // Refs to access latest state inside valid event effect without re-triggering
    const fullTextRef = useRef(fullText);
    const selectionRangeRef = useRef(selectionRange);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync refs
    useEffect(() => { fullTextRef.current = fullText; }, [fullText]);
    useEffect(() => { selectionRangeRef.current = selectionRange; }, [selectionRange]);

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

    const handleCopyToClipboard = async () => {
        if (fullText) {
            await navigator.clipboard.writeText(fullText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
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

            // Voice Command: Template Insertion
            const templateCommandMatch = processedText.match(/insertar plantilla\s+(.+)/i);
            if (templateCommandMatch) {
                const templateName = templateCommandMatch[1].trim().replace(/[.,?!]$/, '');
                const template = templates.find(t => t.name.toLowerCase() === templateName.toLowerCase());
                if (template) {
                    processedText = template.content;
                }
            }

            let before = prevText.substring(0, range.start);
            const after = prevText.substring(range.end);

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

            setFullText(newText);
            setSelectionRange({ start: newPos, end: newPos });
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
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                        Voz a texto online
                    </h1>
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

            <main className="flex-1 relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-h-[500px]">
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
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    <span className="text-sm font-medium">{copied ? 'Copiado' : 'Copiar'}</span>
                                </button>
                            </div>
                            <div className={`text-xs font-semibold px-3 py-1.5 rounded-full ${isListening ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                {isListening ? '● GRABANDO' : 'LISTO'}
                            </div>
                        </div>

                        {/* Editor Area */}
                        <div className="relative flex-1 p-6">
                            <textarea
                                ref={textareaRef}
                                className="w-full h-full resize-none outline-none text-lg leading-relaxed bg-transparent text-gray-800 dark:text-gray-200 font-serif"
                                placeholder="Pulsa el micrófono para empezar a dictar..."
                                value={fullText}
                                onChange={(e) => {
                                    setFullText(e.target.value);
                                    handleSelect();
                                }}
                                onSelect={handleSelect}
                                onClick={handleSelect}
                                onKeyUp={handleSelect}
                            />

                            {showSettings && (
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center p-4">
                                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in fade-in zoom-in duration-200 max-h-[80vh] overflow-y-auto">
                                        <button
                                            onClick={() => setShowSettings(false)}
                                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                        <VocabularySettings
                                            selectedText={getSelectedText()}
                                            onCorrect={handleApplyCorrection}
                                        />
                                    </div>
                                </div>
                            )}

                            {showTemplates && (
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center p-4">
                                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
                                        <TemplateManager
                                            onClose={() => setShowTemplates(false)}
                                            onInsert={handleInsertTemplate}
                                            onInsertStructured={handleOpenStructuredTemplate}
                                        />
                                    </div>
                                </div>
                            )}



                            {/* Interim Overlay */}
                            {isListening && interimResult && (
                                <div className="absolute bottom-6 left-6 right-6 bg-blue-50/90 dark:bg-blue-900/30 backdrop-blur-md p-4 rounded-xl text-gray-700 dark:text-gray-300 italic pointer-events-none border-l-4 border-blue-500 shadow-lg">
                                    {interimResult}
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
                            onClick={isListening ? stopListening : startListening}
                            className={twMerge(
                                "group relative flex items-center justify-center w-20 h-20 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4",
                                isListening
                                    ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/50 focus:ring-red-200"
                                    : "bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-600/50 focus:ring-blue-200"
                            )}
                        >
                            {isListening ? (
                                <Square className="w-8 h-8 text-white fill-current" />
                            ) : (
                                <Mic className="w-10 h-10 text-white" />
                            )}

                            {/* Pulse effect ring */}
                            {isListening && (
                                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                            )}
                        </button>
                    </div>

                    {/* Audio Level Indicator */}
                    {isListening && (
                        <div className="flex flex-col items-center pb-6 px-4">
                            <div className="w-full max-w-md space-y-2">
                                {/* Audio level bar */}
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-100 ${isMuted ? 'bg-gray-400' :
                                            isLow ? 'bg-yellow-500' :
                                                'bg-green-500'
                                            }`}
                                        style={{ width: `${audioLevel}%` }}
                                    />
                                </div>

                                {/* Warning messages */}
                                {isLow && !isMuted && (
                                    <div className="flex items-center justify-center space-x-2 text-yellow-600 dark:text-yellow-400 text-sm">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>Audio bajo - acerca el micrófono</span>
                                    </div>
                                )}
                                {isMuted && (
                                    <div className="flex items-center justify-center space-x-2 text-red-600 dark:text-red-400 text-sm">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>No se detecta audio - verifica el micrófono</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

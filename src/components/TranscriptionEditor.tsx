"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranscription } from '@/hooks/useTranscription';
import { useVocabulary } from '@/hooks/useVocabulary';
import { useTemplates } from '@/hooks/useTemplates';
import { processTranscriptSegment } from '@/lib/textProcessor';
import { VocabularySettings } from '@/components/VocabularySettings';
import { TemplateManager } from '@/components/TemplateManager';
import { Mic, Square, Trash2, Settings, FileText } from 'lucide-react';
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

    const [showSettings, setShowSettings] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);

    const [fullText, setFullText] = useState('');
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

    // Refs to access latest state inside valid event effect without re-triggering
    const fullTextRef = useRef(fullText);
    const selectionRangeRef = useRef(selectionRange);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync refs
    useEffect(() => { fullTextRef.current = fullText; }, [fullText]);
    useEffect(() => { selectionRangeRef.current = selectionRange; }, [selectionRange]);

    // Track selection changes
    const handleSelect = () => {
        if (textareaRef.current) {
            setSelectionRange({
                start: textareaRef.current.selectionStart,
                end: textareaRef.current.selectionEnd
            });
        }
    };

    const handleInsertTemplate = useCallback((content: string) => {
        const prev = fullTextRef.current;
        const range = selectionRangeRef.current || { start: prev.length, end: prev.length };

        const newText = prev.substring(0, range.start) + content + prev.substring(range.end);
        setFullText(newText);

        const newPos = range.start + content.length;
        setSelectionRange({ start: newPos, end: newPos });

        setShowTemplates(false);
        // Restore focus next tick
        setTimeout(() => {
            textareaRef.current?.focus();
            // Manually set cursor for robustness
            textareaRef.current?.setSelectionRange(newPos, newPos);
        }, 0);
    }, []); // No deps needed due to refs

    // Main Transcription Logic
    useEffect(() => {
        if (lastEvent) {
            const prevText = fullTextRef.current;
            const range = selectionRangeRef.current || { start: prevText.length, end: prevText.length };

            // Determine context for capitalization (text before insertion point)
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

            // Logic: Replace the selected range with the new text
            let before = prevText.substring(0, range.start);
            const after = prevText.substring(range.end);

            // 1. Punctuation Gluing: If new text starts with punctuation, remove trailing space from 'before'
            if (/^[.,:;?!]/.test(processedText)) {
                before = before.trimEnd();
            }

            // 2. Newline Trimming: If before ends with newline (and optional spaces), remove ALL leading whitespace from new text
            if (/\n\s*$/.test(before)) {
                processedText = processedText.trimStart();
            }

            // 3. Double Space Prevention & Space Insertion
            if (before.endsWith(' ') && processedText.startsWith(' ')) {
                processedText = processedText.trimStart();
            } else if (!before.endsWith(' ') && !before.endsWith('\n') && !processedText.startsWith(' ') && before.trim().length > 0 && !/[.\n]$/.test(before.trim())) {
                // Add space if appending to a word without space/punctuation AND new text is not punctuation/newline
                if (!/^[.,:;?!]/.test(processedText) && !processedText.startsWith('\n')) {
                    processedText = ' ' + processedText;
                }
            }

            // 4. Trailing Space Logic: If 'after' text exists and starts with a letter/number (not punctuation/space), ensure we have a space.
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
            // Only update if currently focused or we just dictated? 
            // If user clicks away, we might not want to steal focus back?
            // But if they are dictating, they likely want it.
            if (document.activeElement === textareaRef.current) {
                textareaRef.current.setSelectionRange(selectionRange.start, selectionRange.end);
                textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
            }
        }
    }, [selectionRange, fullText]); // Sync when text or range updates

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto p-6 space-y-6">
            <header className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Voice Scribe
                    </h1>
                    <p className="text-sm text-gray-500">Transcripción y Edición Inteligente</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Plantillas"
                    >
                        <FileText className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Diccionario"
                    >
                        <Settings className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                    {error}
                </div>
            )}

            <main className="flex-1 relative bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col min-h-[500px]">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex space-x-1">
                        <button
                            onClick={() => { setFullText(''); setSelectionRange({ start: 0, end: 0 }); }}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Borrar todo"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                        {isListening ? 'GRABANDO' : 'LISTO'}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="relative flex-1 p-4">
                    <textarea
                        ref={textareaRef}
                        className="w-full h-full resize-none outline-none text-lg leading-relaxed bg-transparent text-gray-800 dark:text-gray-200 font-serif"
                        placeholder="Pulsa el micrófono para empezar dictar... Selecciona texto para re-dictar encima."
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
                        <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center p-4 backdrop-blur-sm">
                            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                                <VocabularySettings />
                            </div>
                        </div>
                    )}

                    {showTemplates && (
                        <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center p-4 backdrop-blur-sm">
                            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg relative animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
                                <TemplateManager onClose={() => setShowTemplates(false)} onInsert={handleInsertTemplate} />
                            </div>
                        </div>
                    )}

                    {/* Interim Overlay */}
                    {isListening && interimResult && (
                        <div className="absolute bottom-4 left-4 right-4 bg-black/5 backdrop-blur-sm p-2 rounded text-gray-600 italic pointer-events-none border-l-4 border-blue-500">
                            {interimResult}
                        </div>
                    )}
                </div>
            </main>

            <div className="flex justify-center pb-8">
                <button
                    onClick={isListening ? stopListening : startListening}
                    className={twMerge(
                        "group relative flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-200",
                        isListening
                            ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
                            : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30"
                    )}
                >
                    {isListening ? (
                        <Square className="w-6 h-6 text-white fill-current" />
                    ) : (
                        <Mic className="w-8 h-8 text-white" />
                    )}

                    {/* Pulse effect ring */}
                    {isListening && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                    )}
                </button>
            </div>
        </div>
    );
}

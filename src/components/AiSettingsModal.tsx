"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Save, Key, X, RefreshCw } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface AiSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AiSettingsModal({ isOpen, onClose }: AiSettingsModalProps) {
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gemini-2.0-flash-exp');
    const [isVisible, setIsVisible] = useState(false);

    // Default safe fallback models
    const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.5 Flash (2.0 Exp)' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Estable)' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
    ]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Dynamic model fetching
    const fetchModels = useCallback(async (key: string) => {
        if (!key) return;
        setIsLoadingModels(true);
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const data = await response.json();
            if (data.models) {
                const validModels = data.models
                    .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                    .map((m: any) => ({
                        id: m.name.replace('models/', ''),
                        name: m.displayName || m.name
                    }))
                    .sort((a: any, b: any) => a.name.localeCompare(b.name));

                if (validModels.length > 0) {
                    setAvailableModels(validModels);
                }
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            // Don't clear defaults on error, just log
        } finally {
            setIsLoadingModels(false);
        }
    }, []);

    // Load initial state
    useEffect(() => {
        if (isOpen) {
            const storedKey = localStorage.getItem('gemini_api_key');
            const storedModel = localStorage.getItem('gemini_model');

            if (storedKey) {
                setApiKey(storedKey);
                // Auto-fetch using stored key
                fetchModels(storedKey);
            }
            if (storedModel) setModel(storedModel);
        }
    }, [isOpen, fetchModels]);

    const handleSave = () => {
        // Clear key if empty (server fallback), otherwise save trimmed key
        if (apiKey.trim()) {
            localStorage.setItem('gemini_api_key', apiKey.trim());
        } else {
            localStorage.removeItem('gemini_api_key');
        }

        // Always save the model
        localStorage.setItem('gemini_model', model);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md overflow-y-auto">
            <div className="glass-card rounded-2xl max-w-md w-full border border-white/10 shadow-2xl">
                <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-6 text-white border-b border-white/10 shrink-0">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                            <Sparkles className="w-6 h-6 text-[var(--accent)]" />
                            <div className="flex flex-col">
                                <h2 className="text-xl font-black uppercase tracking-tighter italic">Configuración IA</h2>
                                <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--accent)] uppercase opacity-80">Módulo de Encriptación</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-[var(--accent)] uppercase tracking-widest mb-2 flex items-center opacity-80">
                            <Key className="w-4 h-4 mr-1.5" />
                            Clave de Seguridad
                        </label>
                        <div className="relative">
                            <input
                                type={isVisible ? "text" : "password"}
                                className="w-full pl-4 pr-12 py-4 border border-white/10 rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none bg-black/40 text-white font-mono text-sm shadow-inner"
                                placeholder="..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setIsVisible(!isVisible)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-[var(--accent)] text-[10px] font-black tracking-widest"
                            >
                                {isVisible ? 'OCULTAR' : 'MOSTRAR'}
                            </button>
                        </div>
                        <p className="text-[10px] text-white/40 mt-2 font-bold uppercase tracking-widest">
                            Requerido si GEMINI_API_KEY no está definido en el sistema.
                        </p>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest flex items-center opacity-80">
                                <Sparkles className="w-4 h-4 mr-1.5" />
                                Motor Neuronal
                            </label>
                            <button
                                onClick={() => fetchModels(apiKey)}
                                disabled={isLoadingModels || !apiKey}
                                className="text-[10px] text-[var(--accent)] hover:underline font-black tracking-widest flex items-center"
                            >
                                <RefreshCw className={twMerge("w-3 h-3 mr-1", isLoadingModels && "animate-spin")} />
                                {isLoadingModels ? 'SINCRONIZANDO...' : 'SINCRONIZAR LISTA'}
                            </button>
                        </div>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full px-4 py-4 border border-white/10 rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none bg-black/40 text-white font-bold"
                        >
                            {availableModels.map(m => (
                                <option key={m.id} value={m.id} className="bg-gray-900">{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 pb-2">
                        <button
                            onClick={handleSave}
                            className="w-full py-5 bg-[var(--accent)] text-black rounded-xl hover:scale-[1.02] active:scale-[0.98] font-black uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(234,179,8,0.4)] flex justify-center items-center"
                        >
                            <Save className="w-6 h-6 mr-3" />
                            Inicializar Núcleo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Key, X } from 'lucide-react';

interface AiSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AiSettingsModal({ isOpen, onClose }: AiSettingsModalProps) {
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gemini-1.5-flash');
    const [isVisible, setIsVisible] = useState(false);

    const MODELS = [
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Alias)' },
        { id: 'gemini-1.5-flash-001', name: 'Gemini 1.5 Flash-001 (Estable)' },
        { id: 'gemini-1.5-flash-002', name: 'Gemini 1.5 Flash-002 (Nuevo)' },
        { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Alias)' },
        { id: 'gemini-1.5-pro-001', name: 'Gemini 1.5 Pro-001 (Estable)' },
        { id: 'gemini-1.5-pro-002', name: 'Gemini 1.5 Pro-002 (Nuevo)' },
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' }
    ];

    useEffect(() => {
        if (isOpen) {
            const storedKey = localStorage.getItem('gemini_api_key');
            const storedModel = localStorage.getItem('gemini_model');
            if (storedKey) setApiKey(storedKey);
            if (storedModel) setModel(storedModel);
        }
    }, [isOpen]);

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem('gemini_api_key', apiKey.trim());
            localStorage.setItem('gemini_model', model);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                            <Sparkles className="w-6 h-6" />
                            <h2 className="text-xl font-bold">Configuración IA</h2>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-purple-100 text-sm mt-2">
                        Configura Google Gemini para potenciar tus dictados.
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                            <Key className="w-4 h-4 mr-1.5 text-purple-600" />
                            Google Gemini API Key
                        </label>
                        <div className="relative">
                            <input
                                type={isVisible ? "text" : "password"}
                                className="w-full pl-3 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-gray-50 dark:bg-gray-800 dark:text-white"
                                placeholder="Pega tu clave aquí (AIza...)"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setIsVisible(!isVisible)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-medium"
                            >
                                {isVisible ? 'OCULTAR' : 'MOSTRAR'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            ¿No tienes clave? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Consíguela gratis aquí</a>.
                            Se guardará en tu navegador de forma segura.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                            <Sparkles className="w-4 h-4 mr-1.5 text-purple-600" />
                            Modelo de IA
                        </label>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-gray-50 dark:bg-gray-800 dark:text-white"
                        >
                            {MODELS.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            Si el modelo por defecto da error, prueba con otro como "Flash-8B".
                        </p>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={handleSave}
                            disabled={!apiKey}
                            className="w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-lg flex justify-center items-center"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Configuración
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

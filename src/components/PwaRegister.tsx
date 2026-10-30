"use client";

import { useEffect } from 'react';

// Registra el service worker de la PWA (lado cliente).
export default function PwaRegister() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        const onLoad = () => {
            navigator.serviceWorker.register('/sw.js').catch(() => { });
        };
        if (document.readyState === 'complete') onLoad();
        else window.addEventListener('load', onLoad);
        return () => window.removeEventListener('load', onLoad);
    }, []);
    return null;
}

import { NextResponse } from 'next/server';

// Requerido por @cloudflare/next-on-pages: Cloudflare Pages ejecuta las
// rutas dinámicas en el Edge Runtime.
export const runtime = 'edge';

// Ruta de 'keep-alive': mantiene activo el proyecto de Supabase (plan Free).
// Vercel Cron la invoca una vez al día (ver vercel.json). Cada invocación
// hace una consulta mínima a la API REST de Supabase; esa consulta llega a
// Postgres y cuenta como actividad, evitando el pausado automático por
// inactividad.
export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith('https://')) {
        return NextResponse.json(
            { ok: false, reason: 'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel' },
            { status: 500 }
        );
    }

    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id`, {
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            return NextResponse.json(
                { ok: false, status: res.status, reason: 'Supabase respondió con error (¿proyecto pausado?)' },
                { status: 502 }
            );
        }

        return NextResponse.json({ ok: true, status: res.status });
    } catch (err) {
        return NextResponse.json(
            { ok: false, reason: err instanceof Error ? err.message : 'Error de red' },
            { status: 502 }
        );
    }
}

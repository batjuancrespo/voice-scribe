/**
 * Keep-alive de la BD de la réplica (iplqpnyvgtvbmswfxodk).
 * Cloudflare Worker con cron trigger diario. Capa independiente de GitHub:
 * el plan Free de Supabase pausa proyectos sin actividad de BD en 7 días;
 * este ping diario lo evita.
 */
export default {
    async scheduled(controller, env, ctx) {
        try {
            const res = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?select=id`, {
                headers: {
                    apikey: env.SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
                },
            });
            if (res.ok) {
                console.log(`[keepalive-replica] OK ${res.status} - proyecto activo`);
            } else {
                console.error(`[keepalive-replica] HTTP ${res.status} - ¿proyecto pausado?`);
            }
        } catch (err) {
            console.error("[keepalive-replica] fetch error:", err);
        }
    },
};

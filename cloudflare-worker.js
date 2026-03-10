export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const apiKey = request.headers.get('x-api-key');
    if (env.API_KEY && apiKey !== env.API_KEY) {
      return json({ ok: false, error: 'No autorizado' }, 401);
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, service: 'whatsapp-business-worker' });
    }

    if (url.pathname === '/send' && request.method === 'POST') {
      try {
        const body = await request.json();
        const telefono = String(body.telefono || '').replace(/\D/g, '');
        const mensaje = String(body.mensaje || '').trim();
        if (!telefono || !mensaje) {
          return json({ ok: false, error: 'Faltan telefono o mensaje' }, 400);
        }

        const res = await fetch(`https://graph.facebook.com/v23.0/${env.PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: telefono,
            type: 'text',
            text: { body: mensaje }
          })
        });

        const data = await res.json();
        if (!res.ok) {
          return json({ ok: false, error: data }, 500);
        }
        return json({ ok: true, data });
      } catch (error) {
        return json({ ok: false, error: error.message }, 500);
      }
    }

    return json({ ok: false, error: 'Ruta no encontrada' }, 404);
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-api-key'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

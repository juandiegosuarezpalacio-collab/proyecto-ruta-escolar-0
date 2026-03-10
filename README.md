# Ruta Escolar Montenegro

## Qué se corrigió
- CSS y JS enlazados correctamente.
- WhatsApp con 3 modos: demo, abrir WhatsApp y WhatsApp Business.
- Backend Cloudflare Worker con `/health`, `/send` y CORS.
- Ruta Bachillerato 1 cargada con los 3 estudiantes enviados.
- Panel móvil más simple.
- Gestión de estudiantes, orden de recogida y dejada.
- IA local para mejorar mensajes.

## Cómo probar rápido
1. Abre `index.html` desde un servidor estático o GitHub Pages.
2. Entra a **Config**.
3. Elige el canal:
   - `Demo`: solo registra en bitácora.
   - `Abrir WhatsApp`: abre la app o WhatsApp Web.
   - `WhatsApp Business`: envía al backend.
4. Si usas backend, pega la URL del Worker y la API key.
5. Pulsa **Probar conexión**.

## Cloudflare Worker
Configura estos secretos:
- `API_KEY`
- `PHONE_NUMBER_ID`
- `WHATSAPP_TOKEN`

## Nota
Para que los avisos por GPS funcionen bien, ajusta lat/lng de cada estudiante con ubicaciones reales.

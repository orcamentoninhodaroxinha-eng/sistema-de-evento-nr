import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');

Deno.serve(async (req) => {
  try {
    createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { title, message, target_roles, url, include_player_ids } = body;

    if (!title || !message) {
      return Response.json({ error: 'title e message são obrigatórios' }, { status: 400 });
    }

    const notifPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title, pt: title },
      contents: { en: message, pt: message },
      url: url || 'https://ninhodaroxinha.base44.app/',
      small_icon: 'ic_stat_onesignal_default',
      large_icon: 'https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png',
      chrome_web_icon: 'https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png',
    };

    // Prioridade: player IDs específicos > filtros por role > todos
    if (include_player_ids && include_player_ids.length > 0) {
      notifPayload.include_player_ids = include_player_ids;
    } else if (target_roles && target_roles.length > 0) {
      const filters = [];
      target_roles.forEach((role, i) => {
        if (i > 0) filters.push({ operator: "OR" });
        filters.push({ field: "tag", key: "role", relation: "=", value: role });
      });
      notifPayload.filters = filters;
    } else {
      notifPayload.included_segments = ['All'];
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(notifPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal error:', JSON.stringify(result));
      return Response.json({ error: result }, { status: response.status });
    }

    console.log(`OneSignal enviado: ${result.recipients || 0} destinatários`);
    return Response.json({ success: true, recipients: result.recipients });
  } catch (error) {
    console.error('Erro OneSignal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
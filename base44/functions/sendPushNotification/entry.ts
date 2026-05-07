import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PUSHALERT_API_KEY = Deno.env.get('PUSHALERT_API_KEY');
const PUSHALERT_APP_ID = Deno.env.get('PUSHALERT_APP_ID');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch { /* empty body */ }

    const { title, body: msgBody } = body;

    if (!title) {
      return Response.json({ error: 'title is required' }, { status: 400 });
    }

    // Usa PushAlert se configurado (envia para TODOS os assinantes de uma vez)
    if (PUSHALERT_API_KEY) {
      const params = new URLSearchParams({
        title,
        message: msgBody || '',
        url: 'https://ninhrodaroxinha.base44.app/',
      });

      const res = await fetch('https://api.pushalert.co/rest/v2/web-push/send', {
        method: 'POST',
        headers: {
          'Authorization': `api_key=${PUSHALERT_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await res.json();
      console.log('PushAlert key prefix:', PUSHALERT_API_KEY?.substring(0, 8));
      console.log('PushAlert response status:', res.status);
      console.log('PushAlert response:', JSON.stringify(data));
      return Response.json({ success: res.ok, data });
    }

    // Fallback: envia via KodePush para assinantes salvos
    const KODEPUSH_API_KEY = Deno.env.get('KODEPUSH_API_KEY');
    if (!KODEPUSH_API_KEY) {
      return Response.json({ error: 'Nenhum serviço de push configurado' }, { status: 500 });
    }

    const subscriptions = await base44.asServiceRole.entities.PushSubscription.list();
    console.log(`Enviando via KodePush para ${subscriptions.length} usuário(s)`);

    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      const userId = sub.external_user_id || sub.username;
      if (!userId) continue;

      const res = await fetch('https://api.kodebase.us/v1/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KODEPUSH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ external_user_id: userId, title, message: msgBody || '' }),
      });

      if (res.ok) { successCount++; }
      else { failCount++; const err = await res.text(); console.warn(`Falhou para ${userId}: ${err}`); }
    }

    return Response.json({ success: true, recipients: successCount, failure: failCount });
  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const KODEPUSH_API_KEY = Deno.env.get('KODEPUSH_API_KEY');
    if (!KODEPUSH_API_KEY) {
      return Response.json({ error: 'KODEPUSH_API_KEY not set' }, { status: 500 });
    }

    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch { /* empty body */ }

    const { title, body: msgBody, target_roles, external_user_id } = body;

    if (!title) {
      return Response.json({ error: 'title is required' }, { status: 400 });
    }

    // Se um external_user_id específico foi passado, envia só para ele
    if (external_user_id) {
      const res = await fetch('https://api.kodebase.us/v1/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KODEPUSH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          external_user_id,
          title,
          message: msgBody || '',
        }),
      });
      const data = await res.json();
      return Response.json({ success: res.ok, data });
    }

    // Caso contrário, busca subscriptions e envia por role
    let subscriptions = await base44.asServiceRole.entities.PushSubscription.list();

    if (target_roles && target_roles.length > 0) {
      subscriptions = subscriptions.filter(s => target_roles.includes(s.role));
    }

    console.log(`Enviando para ${subscriptions.length} usuário(s)`);

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
        body: JSON.stringify({
          external_user_id: userId,
          title,
          message: msgBody || '',
        }),
      });

      if (res.ok) {
        successCount++;
        console.log(`Enviado para ${userId}`);
      } else {
        failCount++;
        const err = await res.text();
        console.warn(`Falhou para ${userId}: ${err}`);
      }
    }

    return Response.json({ success: true, recipients: successCount, failure: failCount });
  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = "BNQy3Mtf8Mt8Bf6MJ0nmWZkjQphbIrOlRXSvW9oL0javIAVJLQXr8TaUhFqFUJCyr3MiUV1om4VZ6CCCk62qbF0";

Deno.serve(async (req) => {
  try {
    const VAPID_PRIVATE_KEY = Deno.env.get('FIREBASE_SERVER_KEY');
    if (!VAPID_PRIVATE_KEY) {
      return Response.json({ error: 'FIREBASE_SERVER_KEY not set' }, { status: 500 });
    }

    webpush.setVapidDetails(
      'mailto:admin@ninhoxaroxinha.com.br',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch { /* empty body */ }

    const { title, body: msgBody, target_roles } = body;

    if (!title) {
      return Response.json({ error: 'title is required' }, { status: 400 });
    }

    let subscriptions = await base44.asServiceRole.entities.PushSubscription.list();

    if (target_roles && target_roles.length > 0) {
      subscriptions = subscriptions.filter(s => target_roles.includes(s.role));
    }

    const validSubs = subscriptions.filter(s => s.endpoint && s.p256dh && s.auth);
    console.log(`Total: ${subscriptions.length}, válidas: ${validSubs.length}`);

    if (validSubs.length === 0) {
      return Response.json({ success: true, recipients: 0, reason: 'No valid subscribers' });
    }

    const payload = JSON.stringify({
      title,
      body: msgBody || '',
      icon: "https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png",
      url: "/",
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of validSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        console.log(`Enviado para ${sub.username}`);
        successCount++;
      } catch (err) {
        console.warn(`Falhou para ${sub.username}: ${err.message}`);
        // Remove subscriptions inválidas (410 = expirada)
        if (err.statusCode === 410) {
          await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
        }
        failCount++;
      }
    }

    return Response.json({ success: true, recipients: successCount, failure: failCount });
  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
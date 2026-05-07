import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
// @ts-ignore
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails(
  'mailto:contato@ninhodaroxinha.com.br',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { title, body: msgBody, url } = body;

    if (!title) {
      return Response.json({ error: 'title é obrigatório' }, { status: 400 });
    }

    const subscriptions = await base44.asServiceRole.entities.PushSubscription.list();

    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ success: true, sent: 0, message: 'Nenhum assinante encontrado' });
    }

    const payload = JSON.stringify({
      title,
      body: msgBody || '',
      url: url || 'https://ninhodaroxinha.base44.app/',
      icon: 'https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png',
    });

    let sent = 0;
    let failed = 0;
    const toDelete: string[] = [];

    for (const sub of subscriptions) {
      if (!sub.endpoint || !sub.p256dh || !sub.auth) continue;

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (err: any) {
        console.warn(`Falhou para ${sub.username}: ${err.message}`);
        if (err.statusCode === 410 || err.statusCode === 404) {
          toDelete.push(sub.id);
        }
        failed++;
      }
    }

    for (const id of toDelete) {
      await base44.asServiceRole.entities.PushSubscription.delete(id).catch(() => {});
    }

    console.log(`Push enviado: ${sent} sucesso, ${failed} falha`);
    return Response.json({ success: true, sent, failed });
  } catch (error: any) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@ninho.com';

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return Response.json({ skipped: true, reason: 'VAPID keys not configured' });
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const base44 = createClientFromRequest(req);
    const { title, body, target_roles } = await req.json();

    // Get all subscriptions
    const allSubs = await base44.asServiceRole.entities.PushSubscription.list('-created_date', 200);

    // Filter by role if provided
    const subs = target_roles && target_roles.length > 0
      ? allSubs.filter(s => target_roles.includes(s.role))
      : allSubs;

    const payload = JSON.stringify({ title, body });

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return Response.json({ success: true, sent, total: subs.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
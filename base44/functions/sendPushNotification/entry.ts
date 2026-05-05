import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY');

    if (!FIREBASE_SERVER_KEY) {
      return Response.json({ skipped: true, reason: 'Firebase server key not configured' });
    }

    const base44 = createClientFromRequest(req);
    const { title, body, target_roles } = await req.json();

    // Get all FCM tokens from PushSubscription entity, filtered by role
    let subscriptions = await base44.asServiceRole.entities.PushSubscription.list();

    if (target_roles && target_roles.length > 0) {
      subscriptions = subscriptions.filter(s => target_roles.includes(s.role));
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for roles:', target_roles);
      return Response.json({ success: true, recipients: 0, reason: 'No subscribers' });
    }

    const tokens = subscriptions.map(s => s.endpoint).filter(Boolean);

    if (tokens.length === 0) {
      return Response.json({ success: true, recipients: 0, reason: 'No tokens' });
    }

    // Send via FCM HTTP v1 (legacy API)
    const payload = {
      registration_ids: tokens,
      notification: {
        title,
        body,
        icon: "https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png",
        click_action: "/",
      },
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FIREBASE_SERVER_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('FCM result:', JSON.stringify(result));

    return Response.json({ success: true, recipients: result.success, failure: result.failure, results: result.results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
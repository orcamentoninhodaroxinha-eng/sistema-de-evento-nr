import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY');

    if (!FIREBASE_SERVER_KEY) {
      return Response.json({ skipped: true, reason: 'FIREBASE_SERVER_KEY not set' });
    }

    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch { /* empty body */ }

    const { title, body: msgBody, target_roles } = body;

    if (!title) {
      return Response.json({ error: 'title is required' }, { status: 400 });
    }

    // Get all FCM tokens filtered by role
    let subscriptions = await base44.asServiceRole.entities.PushSubscription.list();

    if (target_roles && target_roles.length > 0) {
      subscriptions = subscriptions.filter(s => target_roles.includes(s.role));
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for roles:', target_roles);
      return Response.json({ success: true, recipients: 0, reason: 'No subscribers' });
    }

    const tokens = subscriptions.map(s => s.endpoint).filter(Boolean);
    console.log(`Sending to ${tokens.length} tokens, key starts with: ${FIREBASE_SERVER_KEY.substring(0, 10)}...`);

    if (tokens.length === 0) {
      return Response.json({ success: true, recipients: 0, reason: 'No tokens' });
    }

    // FCM Legacy HTTP API
    const payload = {
      registration_ids: tokens,
      notification: {
        title,
        body: msgBody || '',
        icon: "https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png",
        click_action: "https://preview--rh-prime-5bf14962.base44.app/",
      },
      data: { url: "/" },
      android: { priority: "high" },
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FIREBASE_SERVER_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('FCM HTTP status:', response.status);
    console.log('FCM response:', responseText.substring(0, 300));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      return Response.json({
        error: `FCM rejected the request (HTTP ${response.status}). Check FIREBASE_SERVER_KEY - it must be the "Server key" from Firebase Console > Project Settings > Cloud Messaging (Legacy API).`,
        fcm_response_preview: responseText.substring(0, 200),
      }, { status: 500 });
    }

    return Response.json({ success: true, recipients: result.success, failure: result.failure, results: result.results });
  } catch (error) {
    console.error('sendPushNotification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
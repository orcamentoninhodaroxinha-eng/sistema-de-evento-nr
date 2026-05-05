import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      return Response.json({ skipped: true, reason: 'OneSignal keys not configured' });
    }

    const base44 = createClientFromRequest(req);
    const { title, body, target_roles } = await req.json();

    // Build the OneSignal notification payload
    // Filter by role using tags, or send to all if no roles specified
    let filters = [];
    if (target_roles && target_roles.length > 0) {
      target_roles.forEach((role, i) => {
        if (i > 0) filters.push({ operator: 'OR' });
        filters.push({ field: 'tag', key: 'role', relation: '=', value: role });
      });
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { pt: title, en: title },
      contents: { pt: body, en: body },
      ...(filters.length > 0 ? { filters } : { included_segments: ['All'] }),
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json({ error: result }, { status: response.status });
    }

    return Response.json({ success: true, recipients: result.recipients, id: result.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
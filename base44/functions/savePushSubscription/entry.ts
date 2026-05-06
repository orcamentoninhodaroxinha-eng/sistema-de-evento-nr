import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { username, role, token, p256dh, auth } = await req.json();

    if (!username || !token) {
      return Response.json({ error: 'username and token required' }, { status: 400 });
    }

    // Remove old subscriptions for this user
    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ username });
    for (const sub of existing) {
      await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
    }

    // Save new subscription with p256dh and auth for encrypted Web Push
    const saved = await base44.asServiceRole.entities.PushSubscription.create({
      username,
      role,
      endpoint: token,
      p256dh: p256dh || null,
      auth: auth || null,
    });

    return Response.json({ success: true, id: saved.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
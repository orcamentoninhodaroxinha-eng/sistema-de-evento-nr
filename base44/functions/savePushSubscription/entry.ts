import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const body = await req.json().catch(() => ({}));
    const { endpoint, p256dh, auth } = body;

    if (!endpoint || !p256dh || !auth) {
      return Response.json({ error: 'endpoint, p256dh e auth são obrigatórios' }, { status: 400 });
    }

    // Verifica se já existe
    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint });

    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.PushSubscription.update(existing[0].id, {
        p256dh,
        auth,
        username: user?.email || user?.full_name || 'unknown',
        role: user?.role || 'user',
      });
      return Response.json({ success: true, action: 'updated' });
    }

    await base44.asServiceRole.entities.PushSubscription.create({
      endpoint,
      p256dh,
      auth,
      username: user?.email || user?.full_name || 'unknown',
      role: user?.role || 'user',
    });

    return Response.json({ success: true, action: 'created' });
  } catch (error: any) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

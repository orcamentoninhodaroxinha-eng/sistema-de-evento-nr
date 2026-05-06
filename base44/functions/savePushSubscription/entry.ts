import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const KODEPUSH_API_KEY = Deno.env.get('KODEPUSH_API_KEY');
    if (!KODEPUSH_API_KEY) {
      return Response.json({ error: 'KODEPUSH_API_KEY not set' }, { status: 500 });
    }

    const base44 = createClientFromRequest(req);
    const { username, role } = await req.json();

    if (!username) {
      return Response.json({ error: 'username is required' }, { status: 400 });
    }

    // Remove registros antigos deste usuário
    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ username });
    for (const sub of existing) {
      await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
    }

    // Salva registro simples com external_user_id = username
    const saved = await base44.asServiceRole.entities.PushSubscription.create({
      username,
      role,
      endpoint: username, // mantém campo obrigatório
      external_user_id: username,
    });

    return Response.json({ success: true, id: saved.id, external_user_id: username });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
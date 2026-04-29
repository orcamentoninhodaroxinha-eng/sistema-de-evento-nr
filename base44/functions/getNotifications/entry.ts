import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { role } = await req.json();

    const all = await base44.asServiceRole.entities.Notification.list("-created_date", 50);
    const mine = (all || []).filter(n =>
      !n.target_roles || n.target_roles.length === 0 || n.target_roles.includes(role)
    );

    return Response.json({ notifications: mine });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
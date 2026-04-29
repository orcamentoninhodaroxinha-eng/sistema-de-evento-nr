import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { title, message, type, target_roles, event_id, event_name } = await req.json();

    const notification = await base44.asServiceRole.entities.Notification.create({
      title,
      message,
      type,
      target_roles: target_roles || ["admin", "cozinha", "salao", "aprovador"],
      event_id: event_id || "",
      event_name: event_name || "",
      read_by: []
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
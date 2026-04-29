import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const event = payload.data;

    if (!event) return Response.json({ skipped: true });

    await base44.asServiceRole.entities.Notification.create({
      title: "📅 Novo Evento Criado",
      message: `O evento "${event.name}" foi criado${event.date ? ` para ${event.date}` : ""}.`,
      type: "event_created",
      target_roles: ["admin", "cozinha", "salao", "aprovador"],
      event_id: event.id || "",
      event_name: event.name || "",
      read_by: []
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const event = payload.data;

    if (!event) return Response.json({ skipped: true });

    const title = "📅 Novo Evento Criado";
    const message = `O evento "${event.name}" foi criado${event.date ? ` para ${event.date}` : ""}.`;
    const target_roles = ["admin", "cozinha", "salao", "aprovador"];

    await Promise.all([
      base44.asServiceRole.entities.Notification.create({
        title,
        message,
        type: "event_created",
        target_roles,
        event_id: event.id || "",
        event_name: event.name || "",
        read_by: []
      }),
      base44.asServiceRole.functions.invoke("sendPushNotification", {
        title,
        body: message,
        target_roles,
      }),
    ]);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
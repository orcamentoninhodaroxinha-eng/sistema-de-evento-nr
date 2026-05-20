import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { notification_id, username } = await req.json();

    if (!notification_id || !username) {
      return Response.json({ error: 'notification_id e username são obrigatórios' }, { status: 400 });
    }

    // Busca a notificação com service role
    let notifications;
    try {
      notifications = await base44.asServiceRole.entities.Notification.filter({ id: notification_id });
    } catch {
      return Response.json({ success: true }); // ID inválido — ignora
    }
    if (!notifications || notifications.length === 0) {
      return Response.json({ success: true });
    }

    const notif = notifications[0];
    const readBy = notif.read_by || [];
    if (!readBy.includes(username)) {
      readBy.push(username);
      await base44.asServiceRole.entities.Notification.update(notification_id, { read_by: readBy });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('markNotificationRead error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
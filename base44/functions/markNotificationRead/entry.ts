import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { notification_id, username } = await req.json();

    const notifications = await base44.asServiceRole.entities.Notification.filter({ id: notification_id });
    if (!notifications || notifications.length === 0) {
      return Response.json({ error: 'Notification not found' }, { status: 404 });
    }

    const notif = notifications[0];
    const readBy = notif.read_by || [];
    if (!readBy.includes(username)) {
      readBy.push(username);
      await base44.asServiceRole.entities.Notification.update(notification_id, { read_by: readBy });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
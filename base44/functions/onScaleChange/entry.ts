import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const data = payload.data;
    const oldData = payload.old_data;
    const changedFields = payload.changed_fields || [];

    if (!data) return Response.json({ skipped: true });

    const notifications = [];

    // --- COZINHA submetida ---
    if (changedFields.includes("scale_submitted") && data.scale_submitted === true && oldData?.scale_submitted !== true) {
      notifications.push({
        title: "🍳 Escala da Cozinha Enviada",
        message: `Juberly enviou a escala da cozinha do evento "${data.name}" para aprovação.`,
        type: "scale_submitted",
        target_roles: ["aprovador", "admin"],
        event_id: data.id, event_name: data.name, read_by: []
      });
    }

    // --- SALÃO submetido ---
    if (changedFields.includes("salao_submitted") && data.salao_submitted === true && oldData?.salao_submitted !== true) {
      notifications.push({
        title: "🍽️ Escala do Salão Enviada",
        message: `AndreF enviou a escala do salão do evento "${data.name}" para aprovação.`,
        type: "scale_submitted",
        target_roles: ["aprovador", "admin"],
        event_id: data.id, event_name: data.name, read_by: []
      });
    }

    // --- COZINHA aprovada ---
    if (changedFields.includes("scale_approved") && data.scale_approved === true && oldData?.scale_approved !== true) {
      notifications.push({
        title: "✅ Escala da Cozinha Aprovada",
        message: `AndreM aprovou a escala da cozinha do evento "${data.name}".`,
        type: "scale_approved",
        target_roles: ["admin", "cozinha", "salao", "aprovador"],
        event_id: data.id, event_name: data.name, read_by: []
      });
    }

    // --- COZINHA reprovada ---
    if (changedFields.includes("scale_rejected") && data.scale_rejected === true && oldData?.scale_rejected !== true) {
      notifications.push({
        title: "❌ Escala da Cozinha Reprovada",
        message: `AndreM reprovou a escala da cozinha do evento "${data.name}". Motivo: ${data.scale_rejected_reason || "não informado"}.`,
        type: "scale_rejected",
        target_roles: ["admin", "cozinha", "salao", "aprovador"],
        event_id: data.id, event_name: data.name, read_by: []
      });
    }

    // --- SALÃO aprovado ---
    if (changedFields.includes("salao_approved") && data.salao_approved === true && oldData?.salao_approved !== true) {
      notifications.push({
        title: "✅ Escala do Salão Aprovada",
        message: `AndreM aprovou a escala do salão do evento "${data.name}".`,
        type: "scale_approved",
        target_roles: ["admin", "cozinha", "salao", "aprovador"],
        event_id: data.id, event_name: data.name, read_by: []
      });
    }

    // --- SALÃO reprovado ---
    if (changedFields.includes("salao_rejected") && data.salao_rejected === true && oldData?.salao_rejected !== true) {
      notifications.push({
        title: "❌ Escala do Salão Reprovada",
        message: `AndreM reprovou a escala do salão do evento "${data.name}". Motivo: ${data.salao_rejected_reason || "não informado"}.`,
        type: "scale_rejected",
        target_roles: ["admin", "cozinha", "salao", "aprovador"],
        event_id: data.id, event_name: data.name, read_by: []
      });
    }

    if (notifications.length === 0) return Response.json({ success: true, created: 0 });

    await Promise.all([
      ...notifications.map(n => base44.asServiceRole.entities.Notification.create(n)),
      ...notifications.map(n => base44.asServiceRole.functions.invoke("sendPushNotification", {
        title: n.title,
        body: n.message,
        target_roles: n.target_roles,
      })),
    ]);

    return Response.json({ success: true, created: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
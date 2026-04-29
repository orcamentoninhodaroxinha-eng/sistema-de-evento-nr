import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Busca todos os eventos não concluídos
    const events = await base44.asServiceRole.entities.Event.list("-date", 200);
    const activeEvents = (events || []).filter(ev => ev.status !== "Concluído" && ev.status !== "Cancelado");

    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    for (const ev of activeEvents) {
      const createdAt = new Date(ev.created_date).getTime();
      const hoursSinceCreation = (now - createdAt) / ONE_HOUR;

      // Só lembra se o evento foi criado há mais de 1 hora
      if (hoursSinceCreation < 1) continue;

      // Busca notificações de lembrete recentes (última hora) para não duplicar
      const recentNotifs = await base44.asServiceRole.entities.Notification.filter({
        event_id: ev.id,
        type: "reminder"
      });

      const lastReminder = (recentNotifs || [])
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

      const timeSinceLastReminder = lastReminder
        ? (now - new Date(lastReminder.created_date).getTime())
        : Infinity;

      // Só notifica se passou 1 hora desde o último lembrete
      if (timeSinceLastReminder < ONE_HOUR) continue;

      // Lembrete: escala da cozinha não feita
      if (!ev.scale_csv_url && !ev.scale_approved) {
        await base44.asServiceRole.entities.Notification.create({
          title: "⏰ Escala da Cozinha Pendente",
          message: `O evento "${ev.name}" ainda não tem escala da cozinha criada.`,
          type: "reminder",
          target_roles: ["cozinha", "admin"],
          event_id: ev.id,
          event_name: ev.name,
          read_by: []
        });
      }

      // Lembrete: escala do salão não feita
      if (!ev.salao_csv_url && !ev.salao_approved) {
        await base44.asServiceRole.entities.Notification.create({
          title: "⏰ Escala do Salão Pendente",
          message: `O evento "${ev.name}" ainda não tem escala do salão criada.`,
          type: "reminder",
          target_roles: ["salao", "admin"],
          event_id: ev.id,
          event_name: ev.name,
          read_by: []
        });
      }

      // Lembrete: escala da cozinha enviada mas não aprovada/reprovada
      if (ev.scale_submitted && !ev.scale_approved && !ev.scale_rejected) {
        await base44.asServiceRole.entities.Notification.create({
          title: "⏰ Aprovação da Cozinha Pendente",
          message: `A escala da cozinha do evento "${ev.name}" aguarda sua aprovação.`,
          type: "reminder",
          target_roles: ["aprovador", "admin"],
          event_id: ev.id,
          event_name: ev.name,
          read_by: []
        });
      }

      // Lembrete: escala do salão enviada mas não aprovada/reprovada
      if (ev.salao_submitted && !ev.salao_approved && !ev.salao_rejected) {
        await base44.asServiceRole.entities.Notification.create({
          title: "⏰ Aprovação do Salão Pendente",
          message: `A escala do salão do evento "${ev.name}" aguarda sua aprovação.`,
          type: "reminder",
          target_roles: ["aprovador", "admin"],
          event_id: ev.id,
          event_name: ev.name,
          read_by: []
        });
      }
    }

    return Response.json({ success: true, checked: activeEvents.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
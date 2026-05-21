import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function removeAccents(str = "") {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x00-\x7F]/g, "").toLowerCase().trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    const event = events?.[0];
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    const employees = await base44.asServiceRole.entities.Employee.list("full_name", 500);
    const empMap = {};
    for (const e of employees) {
      empMap[removeAccents(e.full_name)] = e;
    }

    const updated = {};

    // Processa CSV do salão
    if (event.salao_csv_url) {
      const text = await fetch(event.salao_csv_url).then(r => r.text());
      const lines = text.trim().split("\n");
      const header = lines[0];
      const rows = lines.slice(1);
      const newRows = rows.map(line => {
        const parts = line.split(";");
        const name = parts[0]?.trim() || "";
        if (!name || name.toUpperCase().startsWith("TOTAL")) return line;
        const found = empMap[removeAccents(name)];
        if (found?.pix && !parts[3]?.trim()) {
          parts[3] = found.pix;
        }
        if (found?.phone && !parts[4]?.trim()) {
          parts[4] = found.phone;
        }
        return parts.join(";");
      });
      const newCsv = "\uFEFF" + [header, ...newRows].join("\n");
      const blob = new Blob([newCsv], { type: "text/csv;charset=utf-8;" });
      const file = new File([blob], `escala_salao_${event_id}.csv`, { type: "text/csv" });
      const res = await base44.asServiceRole.integrations.Core.UploadFile({ file });
      await base44.asServiceRole.entities.Event.update(event_id, { salao_csv_url: res.file_url });
      updated.salao_csv_url = res.file_url;
    }

    // Processa CSV da cozinha
    if (event.scale_csv_url) {
      const text = await fetch(event.scale_csv_url).then(r => r.text());
      const lines = text.trim().split("\n");
      const header = lines[0];
      const rows = lines.slice(1);
      const newRows = rows.map(line => {
        const parts = line.split(";");
        const name = parts[0]?.trim() || "";
        if (!name || name.toUpperCase().startsWith("TOTAL")) return line;
        const found = empMap[removeAccents(name)];
        if (found?.pix && !parts[3]?.trim()) {
          parts[3] = found.pix;
        }
        if (found?.phone && !parts[4]?.trim()) {
          parts[4] = found.phone;
        }
        return parts.join(";");
      });
      const newCsv = "\uFEFF" + [header, ...newRows].join("\n");
      const blob = new Blob([newCsv], { type: "text/csv;charset=utf-8;" });
      const file = new File([blob], `escala_cozinha_${event_id}.csv`, { type: "text/csv" });
      const res = await base44.asServiceRole.integrations.Core.UploadFile({ file });
      await base44.asServiceRole.entities.Event.update(event_id, { scale_csv_url: res.file_url });
      updated.scale_csv_url = res.file_url;
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
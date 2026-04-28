import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event_id } = await req.json();

    if (!event_id) {
      return Response.json({ error: 'event_id é obrigatório' }, { status: 400 });
    }

    const events = await base44.entities.Event.filter({ id: event_id });
    if (!events || events.length === 0) {
      return Response.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    const event = events[0];
    const { scale_csv_url, salao_csv_url } = event;

    // Ambas as escalas devem estar submissas para unificar
    if (!event.scale_submitted || !event.salao_submitted) {
      return Response.json({ error: 'Ambas as escalas devem estar submissas' }, { status: 400 });
    }

    // Se não temos as URLs, não podemos unificar
    if (!scale_csv_url || !salao_csv_url) {
      return Response.json({ error: 'Escalas não disponíveis' }, { status: 400 });
    }

    // Busca e parseia os CSVs
    const parseCsv = (csvText) => {
      const lines = csvText.trim().split('\n');
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('TOTAL')) continue;
        const parts = line.split(';');
        if (parts.length >= 3) {
          rows.push({
            nome: parts[0]?.trim() || '',
            funcao: parts[1]?.trim() || '',
            valor: parts[2]?.trim() || '0'
          });
        }
      }
      return rows;
    };

    const cozinhaCsv = await fetch(scale_csv_url).then(r => r.text());
    const salaoCSv = await fetch(salao_csv_url).then(r => r.text());

    const cozinhaRows = parseCsv(cozinhaCsv);
    const salaoRows = parseCsv(salaoCSv);
    const allRows = [...cozinhaRows, ...salaoRows];

    // Calcula total
    const total = allRows.reduce((sum, row) => {
      const valor = parseFloat(row.valor.replace(',', '.')) || 0;
      return sum + valor;
    }, 0);

    // Gera CSV unificado
    const bom = '\uFEFF';
    const header = 'Nome;Função;Valor (R$)\n';
    const rows = allRows.map(r => `${r.nome};${r.funcao};${r.valor}`).join('\n');
    const totalRow = `\nTOTAL;;${total.toFixed(2).replace('.', ',')}`;
    const unifiedCsv = bom + header + rows + totalRow;

    // Upload do CSV unificado
    const csvBlob = new Blob([unifiedCsv], { type: 'text/csv;charset=utf-8;' });
    const csvFile = new File([csvBlob], `escala_unificada_${event.name.replace(/\s+/g, '_')}.csv`, { type: 'text/csv' });
    const uploadRes = await base44.integrations.Core.UploadFile({ file: csvFile });

    // Atualiza o evento com a URL da escala unificada
    await base44.entities.Event.update(event_id, { unified_scale_csv_url: uploadRes.file_url });

    return Response.json({ success: true, unified_scale_csv_url: uploadRes.file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
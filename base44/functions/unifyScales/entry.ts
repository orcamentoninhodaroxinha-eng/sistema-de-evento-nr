import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const event_id = body.event_id || body.event?.entity_id || body.data?.id;
    if (!event_id) {
      return Response.json({ error: 'event_id é obrigatório' }, { status: 400 });
    }

    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    if (!events || events.length === 0) {
      return Response.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    const event = events[0];
    const { scale_csv_url, salao_csv_url } = event;

    if (!event.scale_submitted || !event.salao_submitted) {
      return Response.json({ error: 'Ambas as escalas devem estar submissas' }, { status: 400 });
    }
    if (!scale_csv_url || !salao_csv_url) {
      return Response.json({ error: 'Escalas não disponíveis' }, { status: 400 });
    }

    const removeAccents = (str) => {
      if (!str) return '';
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');
    };

    const parseCsv = (csvText) => {
      const lines = csvText.trim().split('\n');
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.toUpperCase().startsWith('TOTAL')) continue;
        const parts = line.split(';');
        if (parts.length >= 3) {
          rows.push({
            nome: removeAccents(parts[0]?.trim() || ''),
            funcao: removeAccents(parts[1]?.trim() || ''),
            valor: parseFloat((parts[2]?.trim() || '0').replace(',', '.')) || 0,
          });
        }
      }
      return rows;
    };

    const [cozinhaCsv, salaoCsv] = await Promise.all([
      fetch(scale_csv_url).then(r => r.text()),
      fetch(salao_csv_url).then(r => r.text()),
    ]);

    const cozinhaRows = parseCsv(cozinhaCsv);
    const salaoRows = parseCsv(salaoCsv);

    // Build worksheet data
    const wb = XLSX.utils.book_new();
    const wsData = [];

    // Title row
    wsData.push([`Escala Unificada - ${removeAccents(event.name)}`, '', '']);

    // Empty row
    wsData.push(['', '', '']);

    // --- COZINHA ---
    wsData.push(['COZINHA', '', '']);
    wsData.push(['Nome', 'Funcao', 'Valor (R$)']);
    let cozinhaTotal = 0;
    for (const r of cozinhaRows) {
      wsData.push([r.nome, r.funcao, r.valor]);
      cozinhaTotal += r.valor;
    }
    wsData.push(['Total Cozinha', '', cozinhaTotal]);

    // Empty row
    wsData.push(['', '', '']);

    // --- SALAO ---
    wsData.push(['SALAO', '', '']);
    wsData.push(['Nome', 'Funcao', 'Valor (R$)']);
    let salaoTotal = 0;
    for (const r of salaoRows) {
      wsData.push([r.nome, r.funcao, r.valor]);
      salaoTotal += r.valor;
    }
    wsData.push(['Total Salao', '', salaoTotal]);

    // Empty row
    wsData.push(['', '', '']);

    // Grand total
    wsData.push(['TOTAL GERAL', '', cozinhaTotal + salaoTotal]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [{ wch: 36 }, { wch: 22 }, { wch: 14 }];

    // Helper to set cell style
    const setStyle = (cellRef, style) => {
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      ws[cellRef].s = style;
    };

    const styleTitle = { font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4338CA' } }, alignment: { horizontal: 'center' } };
    const styleSectionCozinha = { font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'EA580C' } }, alignment: { horizontal: 'center' } };
    const styleSectionSalao = { font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '2563EB' } }, alignment: { horizontal: 'center' } };
    const styleHeader = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '475569' } }, alignment: { horizontal: 'center' } };
    const styleRowEven = { fill: { fgColor: { rgb: 'F8FAFC' } } };
    const styleRowOdd = { fill: { fgColor: { rgb: 'EEF2FF' } } };
    const styleTotal = { font: { bold: true, color: { rgb: '166534' } }, fill: { fgColor: { rgb: 'DCFCE7' } } };
    const styleGrandTotal = { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '15803D' } }, alignment: { horizontal: 'center' } };

    // Row index mapping (0-based)
    // Row 0: Title
    setStyle('A1', styleTitle); setStyle('B1', styleTitle); setStyle('C1', styleTitle);
    // Row 2 (index 2): COZINHA label
    setStyle('A3', styleSectionCozinha); setStyle('B3', styleSectionCozinha); setStyle('C3', styleSectionCozinha);
    // Row 3 (index 3): Header cozinha
    setStyle('A4', styleHeader); setStyle('B4', styleHeader); setStyle('C4', styleHeader);
    // Cozinha data rows
    for (let i = 0; i < cozinhaRows.length; i++) {
      const rowIdx = 5 + i; // 1-based
      const s = i % 2 === 0 ? styleRowEven : styleRowOdd;
      setStyle(`A${rowIdx}`, s); setStyle(`B${rowIdx}`, s); setStyle(`C${rowIdx}`, s);
    }
    // Total cozinha row
    const cozinhaTotalRow = 5 + cozinhaRows.length;
    setStyle(`A${cozinhaTotalRow}`, styleTotal); setStyle(`B${cozinhaTotalRow}`, styleTotal); setStyle(`C${cozinhaTotalRow}`, styleTotal);

    // SALAO section — starts 2 rows after cozinha total
    const salaoSectionRow = cozinhaTotalRow + 2;
    setStyle(`A${salaoSectionRow}`, styleSectionSalao); setStyle(`B${salaoSectionRow}`, styleSectionSalao); setStyle(`C${salaoSectionRow}`, styleSectionSalao);
    const salaoHeaderRow = salaoSectionRow + 1;
    setStyle(`A${salaoHeaderRow}`, styleHeader); setStyle(`B${salaoHeaderRow}`, styleHeader); setStyle(`C${salaoHeaderRow}`, styleHeader);
    for (let i = 0; i < salaoRows.length; i++) {
      const rowIdx = salaoHeaderRow + 1 + i;
      const s = i % 2 === 0 ? styleRowEven : styleRowOdd;
      setStyle(`A${rowIdx}`, s); setStyle(`B${rowIdx}`, s); setStyle(`C${rowIdx}`, s);
    }
    const salaoTotalRow = salaoHeaderRow + 1 + salaoRows.length;
    setStyle(`A${salaoTotalRow}`, styleTotal); setStyle(`B${salaoTotalRow}`, styleTotal); setStyle(`C${salaoTotalRow}`, styleTotal);

    // Grand total row
    const grandTotalRow = salaoTotalRow + 2;
    setStyle(`A${grandTotalRow}`, styleGrandTotal); setStyle(`B${grandTotalRow}`, styleGrandTotal); setStyle(`C${grandTotalRow}`, styleGrandTotal);

    XLSX.utils.book_append_sheet(wb, ws, 'Escala');

    const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const xlsxFile = new File(
      [xlsxBuffer],
      `escala_unificada_${removeAccents(event.name).replace(/\s+/g, '_')}.xlsx`,
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );

    const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file: xlsxFile });

    await base44.asServiceRole.entities.Event.update(event_id, { unified_scale_csv_url: uploadRes.file_url });

    return Response.json({ success: true, unified_scale_csv_url: uploadRes.file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
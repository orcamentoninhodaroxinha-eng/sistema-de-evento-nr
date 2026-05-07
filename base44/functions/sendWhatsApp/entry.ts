import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const INFOBIP_BASE_URL = Deno.env.get('INFOBIP_BASE_URL');
const INFOBIP_API_KEY = Deno.env.get('INFOBIP_API_KEY');
const ADMIN_NUMBER = '5527995266011';

Deno.serve(async (req) => {
  try {
    createClientFromRequest(req); // auth context

    const body = await req.json().catch(() => ({}));
    const { message } = body;

    if (!message) {
      return Response.json({ error: 'message é obrigatório' }, { status: 400 });
    }

    const response = await fetch(`https://${INFOBIP_BASE_URL}/whatsapp/1/message/text`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        from: ADMIN_NUMBER,
        to: ADMIN_NUMBER,
        content: { text: message },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Infobip error:', JSON.stringify(result));
      return Response.json({ error: result }, { status: response.status });
    }

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
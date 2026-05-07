Deno.serve(async (_req) => {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  if (!publicKey) {
    return Response.json({ error: 'VAPID_PUBLIC_KEY não configurada' }, { status: 500 });
  }
  return Response.json({ publicKey });
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  createClientFromRequest(req);
  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  return Response.json({ appId });
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Simple in-memory cache to avoid hammering the API
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 45000; // 45 seconds

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { role } = await req.json();

    const now = Date.now();
    if (!cache || (now - cacheTime) > CACHE_TTL) {
      const all = await base44.asServiceRole.entities.Notification.list("-created_date", 50);
      cache = all || [];
      cacheTime = now;
    }

    const mine = cache.filter(n =>
      !n.target_roles || n.target_roles.length === 0 || n.target_roles.includes(role)
    );

    return Response.json({ notifications: mine });
  } catch (error) {
    // On rate limit, return cached data if available, otherwise empty list
    if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
      const { role } = (() => { try { return { role: 'admin' }; } catch { return { role: '' }; } })();
      return Response.json({ notifications: cache ? cache.filter(n => !n.target_roles || n.target_roles.length === 0) : [] });
    }
    return Response.json({ notifications: [] }, { status: 200 });
  }
});
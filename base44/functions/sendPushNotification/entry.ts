import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Web Push VAPID implementation using web-push
const VAPID_PUBLIC_KEY = "BNQy3Mtf8Mt8Bf6MJ0nmWZkjQphbIrOlRXSvW9oL0javIAVJLQXr8TaUhFqFUJCyr3MiUV1om4VZ6CCCk62qbF0";
const CONTACT_EMAIL = "mailto:admin@ninhoxaroxinha.com.br";

// Base64url decode helper
function base64UrlToUint8Array(base64UrlData) {
  const padding = '='.repeat((4 - base64UrlData.length % 4) % 4);
  const base64 = (base64UrlData + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function uint8ArrayToBase64Url(array) {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Import VAPID keys as CryptoKey
async function importVapidKeys(publicKeyB64, privateKeyB64) {
  const publicKeyBytes = base64UrlToUint8Array(publicKeyB64);
  const privateKeyBytes = base64UrlToUint8Array(privateKeyB64);

  // Construct the JWK for the P-256 key pair
  // public key is uncompressed: 0x04 || x (32 bytes) || y (32 bytes)
  const x = uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33));
  const y = uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65));
  const d = uint8ArrayToBase64Url(privateKeyBytes);

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d, key_ops: ['sign'] },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  return { privateKey, x, y };
}

// Generate VAPID JWT
async function generateVapidJWT(audience, privateKey, publicKeyB64) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: CONTACT_EMAIL,
  };

  const encode = (obj) => uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
  const signingInput = `${encode(header)}.${encode(payload)}`;

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`;
}

// Encrypt the push message payload using AES-GCM + ECDH
async function encryptPayload(subscription, payload) {
  const userPublicKey = base64UrlToUint8Array(subscription.p256dh);
  const userAuth = base64UrlToUint8Array(subscription.auth);
  const payloadBytes = new TextEncoder().encode(payload);

  // Generate ephemeral ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  const serverPublicKey = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);

  // Import user public key
  const recipientPublicKey = await crypto.subtle.importKey(
    'raw',
    userPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: recipientPublicKey },
    serverKeyPair.privateKey,
    256
  );

  // HKDF to derive content encryption key and nonce
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const prk = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveBits']);

  // auth secret HKDF
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const authHkdfInput = new Uint8Array([...userAuth, ...authInfo]);
  
  const ikm = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: userAuth, info: new TextEncoder().encode('Content-Encoding: auth\0') },
    await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveBits']),
    256
  );

  const context = new Uint8Array([
    ...new TextEncoder().encode('P-256\0'),
    0, 65, ...userPublicKey,
    0, 65, ...new Uint8Array(serverPublicKey)
  ]);

  const cekInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: aesgcm\0'), ...context]);
  const nonceInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: nonce\0'), ...context]);

  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);

  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo },
    ikmKey,
    128
  );

  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    ikmKey,
    96
  );

  const cek = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt']);

  // Pad payload
  const padded = new Uint8Array(2 + payloadBytes.length);
  padded.set(payloadBytes, 2);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonceBits) },
    cek,
    padded
  );

  return {
    body: new Uint8Array(encrypted),
    salt,
    serverPublicKey: new Uint8Array(serverPublicKey),
  };
}

Deno.serve(async (req) => {
  try {
    const VAPID_PRIVATE_KEY = Deno.env.get('FIREBASE_SERVER_KEY');

    if (!VAPID_PRIVATE_KEY) {
      return Response.json({ error: 'FIREBASE_SERVER_KEY (VAPID private key) not set' }, { status: 500 });
    }

    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch { /* empty body */ }

    const { title, body: msgBody, target_roles } = body;

    if (!title) {
      return Response.json({ error: 'title is required' }, { status: 400 });
    }

    // Get subscriptions from DB
    let subscriptions = await base44.asServiceRole.entities.PushSubscription.list();

    if (target_roles && target_roles.length > 0) {
      subscriptions = subscriptions.filter(s => target_roles.includes(s.role));
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for roles:', target_roles);
      return Response.json({ success: true, recipients: 0, reason: 'No subscribers' });
    }

    // Filter subscriptions that have p256dh and auth (full Web Push subscriptions)
    const validSubs = subscriptions.filter(s => s.endpoint && s.p256dh && s.auth);
    console.log(`Total: ${subscriptions.length}, valid (with p256dh+auth): ${validSubs.length}`);

    if (validSubs.length === 0) {
      return Response.json({ 
        success: false, 
        reason: 'Subscriptions exist but have no p256dh/auth keys. Users need to re-subscribe.',
        total: subscriptions.length
      });
    }

    const { privateKey } = await importVapidKeys(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const notifPayload = JSON.stringify({
      title,
      body: msgBody || '',
      icon: "https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png",
      url: "/",
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of validSubs) {
      try {
        const url = new URL(sub.endpoint);
        const audience = `${url.protocol}//${url.host}`;
        const jwt = await generateVapidJWT(audience, privateKey, VAPID_PUBLIC_KEY);

        const encrypted = await encryptPayload({
          p256dh: sub.p256dh,
          auth: sub.auth,
        }, notifPayload);

        const cryptoKey = `dh=${uint8ArrayToBase64Url(encrypted.serverPublicKey)}`;
        const encryptionHeader = `salt=${uint8ArrayToBase64Url(encrypted.salt)}`;

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'TTL': '86400',
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aesgcm',
            'Encryption': encryptionHeader,
            'Crypto-Key': `p256ecdsa=${VAPID_PUBLIC_KEY};${cryptoKey}`,
            'Authorization': `WebPush ${jwt}`,
          },
          body: encrypted.body,
        });

        console.log(`Push to ${sub.username}: HTTP ${response.status}`);
        if (response.status < 300) {
          successCount++;
        } else {
          const text = await response.text();
          console.warn(`Failed for ${sub.username}: ${text.substring(0, 100)}`);
          failCount++;
        }
      } catch (err) {
        console.warn(`Error for ${sub.username}:`, err.message);
        failCount++;
      }
    }

    return Response.json({ success: true, recipients: successCount, failure: failCount });
  } catch (error) {
    console.error('sendPushNotification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
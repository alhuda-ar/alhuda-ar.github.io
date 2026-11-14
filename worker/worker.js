/**
 * الهدى — Worker إرسال الإشعارات (Cloudflare Workers — الخطة المجانية)
 *
 * بيستقبل طلب من لوحة التحكم، يتأكد إن اللي بعته أدمن (Firebase ID Token)،
 * وبعدين يبعت الإشعار لتطبيقات الطلاب عن طريق Firebase Cloud Messaging (HTTP v1).
 *
 * المتغيرات (Settings → Variables and Secrets):
 *   FIREBASE_PROJECT_ID  نص عادي:  alhuda-ar
 *   ADMIN_EMAILS         نص عادي:  إيميلات الأدمن مفصولة بفاصلة (نفس الموجودة في قواعد Firestore)
 *   ALLOWED_ORIGINS      نص عادي (اختياري): https://alhuda-ar.github.io
 *   SERVICE_ACCOUNT      Secret:   محتوى ملف JSON الخاص بالـ Service Account كامل
 */

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const TYPES = { lesson: 'lessons', exam: 'exams', msg: 'messages' };
const TARGETS = ['all', 'prep1', 'prep2', 'prep3', 'sec1', 'sec2'];

let jwksCache = { keys: null, exp: 0 };
let tokenCache = { token: null, exp: 0 };

/* ----------------------------- أدوات ----------------------------- */
const enc = new TextEncoder();
const b64uToBytes = s => {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const bytesToB64u = b => {
  let s = ''; b = new Uint8Array(b);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const jsonB64u = o => bytesToB64u(enc.encode(JSON.stringify(o)));
const parseJson = b64 => JSON.parse(new TextDecoder().decode(b64uToBytes(b64)));

function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || 'https://alhuda-ar.github.io,https://localhost,http://localhost').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] || '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
const reply = (req, env, status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req, env) } });

/* ------------------- التحقق من Firebase ID Token ------------------- */
async function getJwks() {
  const now = Date.now();
  if (jwksCache.keys && now < jwksCache.exp) return jwksCache.keys;
  const r = await fetch(JWKS_URL);
  if (!r.ok) throw new Error('jwks fetch failed');
  const j = await r.json();
  const cc = /max-age=(\d+)/.exec(r.headers.get('Cache-Control') || '');
  jwksCache = { keys: j.keys, exp: now + (cc ? Number(cc[1]) : 3600) * 1000 };
  return j.keys;
}

export async function verifyIdToken(token, projectId) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('bad token');
  const header = parseJson(parts[0]), payload = parseJson(parts[1]);
  if (header.alg !== 'RS256') throw new Error('bad alg');
  const keys = await getJwks();
  const jwk = keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uToBytes(parts[2]), enc.encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new Error('bad signature');
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new Error('bad aud');
  if (payload.iss !== 'https://securetoken.google.com/' + projectId) throw new Error('bad iss');
  if (!payload.sub) throw new Error('no sub');
  if (typeof payload.exp !== 'number' || payload.exp < now) throw new Error('expired');
  if (typeof payload.iat !== 'number' || payload.iat > now + 300) throw new Error('bad iat');
  return payload;
}

/* ------------------- OAuth لـ FCM من الـ Service Account ------------------- */
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.exp - 60 > now) return tokenCache.token;
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', b64uToBytes(pem.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const head = jsonB64u({ alg: 'RS256', typ: 'JWT' });
  const claim = jsonB64u({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(head + '.' + claim));
  const r = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + head + '.' + claim + '.' + bytesToB64u(sig)
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error('oauth failed: ' + (j.error_description || j.error || r.status));
  tokenCache = { token: j.access_token, exp: now + (j.expires_in || 3600) };
  return j.access_token;
}

/* ----------------------------- الإرسال ----------------------------- */
function clean(b) {
  const title = String(b.title || '').trim(), body = String(b.body || '').trim();
  if (!title || title.length > 80) throw new Error('العنوان غير صالح');
  if (!body || body.length > 300) throw new Error('النص غير صالح');
  if (!TYPES[b.type]) throw new Error('نوع غير صالح');
  if (!TARGETS.includes(b.target)) throw new Error('فئة غير صالحة');
  const link = String(b.link || '');
  if (link && !/^\/[\w\-\/]*$/.test(link)) throw new Error('رابط غير صالح');
  const nid = String(b.nid || '').replace(/[^\w-]/g, '').slice(0, 40);
  return { title, body, type: b.type, target: b.target, link, nid };
}

async function sendFcm(env, sa, m) {
  const topic = m.target === 'all' ? 'all' : 'grade_' + m.target;
  const token = await getAccessToken(sa);
  const message = {
    topic,
    notification: { title: m.title, body: m.body },
    data: { nid: m.nid, type: m.type, link: m.link },
    android: {
      priority: 'HIGH',
      notification: { channel_id: TYPES[m.type], icon: 'ic_stat_alhuda', color: '#1E3E38', sound: 'default' }
    }
  };
  const r = await fetch('https://fcm.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/messages:send', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ message })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('FCM ' + r.status + ': ' + ((j.error && j.error.message) || 'failed'));
  return { topic, name: j.name };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req, env) });
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) return reply(req, env, 200, { ok: true, service: 'alhuda-push' });
    if (req.method !== 'POST' || url.pathname !== '/send') return reply(req, env, 404, { error: 'not found' });

    try {
      const auth = req.headers.get('Authorization') || '';
      if (!auth.startsWith('Bearer ')) return reply(req, env, 401, { error: 'غير مصرح' });
      let payload;
      try { payload = await verifyIdToken(auth.slice(7), env.FIREBASE_PROJECT_ID); }
      catch (e) { return reply(req, env, 401, { error: 'جلسة غير صالحة، سجّل دخول تاني' }); }

      const admins = String(env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (!payload.email || !admins.includes(String(payload.email).toLowerCase())) return reply(req, env, 403, { error: 'للأدمن فقط' });

      let body; try { body = await req.json(); } catch (e) { return reply(req, env, 400, { error: 'طلب غير صالح' }); }
      let m; try { m = clean(body); } catch (e) { return reply(req, env, 400, { error: e.message }); }

      let sa; try { sa = JSON.parse(env.SERVICE_ACCOUNT); } catch (e) { return reply(req, env, 500, { error: 'SERVICE_ACCOUNT غير مضبوط' }); }
      const r = await sendFcm(env, sa, m);
      return reply(req, env, 200, { ok: true, topic: r.topic });
    } catch (e) {
      return reply(req, env, 502, { error: String(e.message || e) });
    }
  }
};


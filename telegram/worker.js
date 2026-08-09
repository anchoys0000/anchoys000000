/* ============================================================
   CLOUDFLARE WORKER — приём заказов и пересылка в Telegram
   ============================================================

   КАК ОБНОВИТЬ:
   1. https://workers.cloudflare.com → аккаунт kirillburkalo71
      → Workers → cafe-orders → Edit code.
   2. Скопировать код ниже, вставить вместо файла целиком, Deploy.
   3. Токен и chat_id лежат прямо в коде (sendToTelegram).
      Код Worker'а не виден снаружи, но при желании их можно
      вынести в Settings → Variables and Secrets.
   4. Deployments → проверить, что новая версия активна.

   ЗАЩИТА ОТ СПАМА:
   - Рейт-лимит по IP: максимум 3 заказа в минуту и 30 в сутки
     (привязка к инстансу; для гарантии на всех изолетах
     понадобилось бы Cloudflare KV);
   - Honeypot `hp`: если скрытое поле заполнено — отбиваем;
   - `elapsed` < 3 сек — форма отправлена слишком быстро, бот;
   - Чистим только управляющие символы, режем длину;
   - Ответ с ошибкой всегда → 200 — меньше шума.
   ============================================================ */

// --- Разрешённые origin'ы ---
const ORIGINS = new Set([
  'https://anchoys0000.github.io',   // сайт на GitHub Pages
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:5500', 'http://127.0.0.1:5500', // Live Server
]);
const MAX_PER_MIN = 3;        // заказов в минуту с одного IP
const MAX_PER_DAY = 30;       // заказов в сутки с одного IP
const MIN_SECONDS = 3;        // быстрее — не человек
const MAX_TEXT_LEN = 3800;    // запас текста под Telegram
const TG_LIMIT     = 4096;    // жёсткий лимит Telegram API

// Рейт-лимит в памяти изолета (не глобален; для надёжности
// на несколько регионов понадобится Cloudflare KV — скажи, сделаем).
const hits = new Map(); // ip -> {minStart,minCount,dayStart,dayCount}

function isAllowed(ip){
  if(!ip) return true;        // нет IP — не режем
  const now = Date.now();
  let h = hits.get(ip);
  if(!h){ h={minStart:now,minCount:0,dayStart:now,dayCount:0}; hits.set(ip,h); }

  if(now-h.minStart>60000){ h.minStart=now; h.minCount=0; }
  h.minCount++;
  if(h.minCount>MAX_PER_MIN) return false;

  if(now-h.dayStart>86400000){ h.dayStart=now; h.dayCount=0; }
  h.dayCount++;
  if(h.dayCount>MAX_PER_DAY) return false;

  // Не раздуваем карту бесконечно
  if(hits.size>10000){
    for(const [k,v] of hits){ if(now-v.dayStart>86400000) hits.delete(k); }
  }
  return true;
}

function sanitize(s, max){
  // Чистим ТОЛЬКО управляющие символы. Теги <b> резать нельзя —
  // это легитимная разметка, а пользовательский ввод уже заэкранирован на клиенте.
  return String(s==null?'':s)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim()
    .slice(0, max || 250);
}

async function sendToTelegram(text){
  const TOKEN = '8839069821:AAFN1OMtRuoSzZNln2q2KWaJwl5aORglcwU';
  const CHAT_ID = '-5504031325';

  try{
    const res = await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text.slice(0, TG_LIMIT),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    return res.ok;
  }catch(e){
    return false;
  }
}

export default {
  async fetch(request, env, ctx){
    const origin = request.headers.get('Origin') || '';

    // CORS: разрешаем только свои origin'ы
    const cors = {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    if(ORIGINS.has(origin)) cors['Access-Control-Allow-Origin'] = origin;

    // Preflight
    if(request.method === 'OPTIONS'){
      return new Response(null, {status: 204, headers: cors});
    }

    if(request.method !== 'POST'){
      return new Response('Method Not Allowed', {status: 405, headers: cors});
    }

    if(origin && !ORIGINS.has(origin)){
      return new Response('Forbidden', {status: 403, headers: cors});
    }

    // Лимит тела (в кодировке запроса)
    const len = Number(request.headers.get('Content-Length')) || 0;
    if(len > 16000) return new Response('Too Large', {status: 413, headers: cors});

    let data;
    try{ data = await request.json(); }
    catch{ return new Response('Bad Request', {status: 400, headers: cors}); }

    // === Антиспам ===
    const hp = String(data.hp || '').trim();
    if(hp) return new Response(JSON.stringify({ok: true}), {status: 200, headers: cors}); // «успех» боту, но не шлём

    const elapsed = Number(data.elapsed);
    if(elapsed > 0 && elapsed < MIN_SECONDS){
      return new Response('Too Fast', {status: 429, headers: cors});
    }

    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Forwarded-For') || '';
    if(!isAllowed(ip)){
      return new Response('Rate Limited', {status: 429, headers: cors});
    }

    const text = sanitize(data.text, MAX_TEXT_LEN);
    if(!text || text.length < 10){
      return new Response('Bad Request', {status: 400, headers: cors});
    }

    // === Пересылка в Telegram ===
    const ok = await sendToTelegram(text);
    return ok
      ? new Response(JSON.stringify({ok: true}), {status: 200, headers: cors})
      : new Response('Upstream Error', {status: 502, headers: cors});
  }
};

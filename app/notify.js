/* =====================================================================
   الهدى — نظام الإشعارات
   - مركز إشعارات جوه الموقع/التطبيق (جرس + قائمة + بانر فوري)
   - تبويب "الإشعارات" في لوحة التحكم لإرسال إشعار لكل الطلاب أو لصف معين
   - تسجيل الجهاز في FCM على أندرويد (Topics) وإشعارات النظام على ويندوز
   بيشتغل بنفس تطبيق Firebase بتاع الصفحة (getApp) زي موديول الامتحانات.
   ===================================================================== */
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, deleteDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ★ بعد ما ترفع الـ Worker على Cloudflare حط رابطه هنا (من غير / في الآخر) ★
   مثال: 'https://alhuda-push.YOURNAME.workers.dev'                                   */
const PUSH_URL = 'https://alhuda-push.016nooralhuda.workers.dev/';

const app = getApp(), A = getAuth(app), D = getFirestore(app);
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const N = n => Number(n).toLocaleString('ar-EG');
const GKEY = { 'الأول الإعدادي': 'prep1', 'الثاني الإعدادي': 'prep2', 'الثالث الإعدادي': 'prep3', 'الأول الثانوي': 'sec1', 'الثاني الثانوي': 'sec2' };
const TARGETS = [['all', 'كل الطلاب'], ['prep1', 'الأول الإعدادي'], ['prep2', 'الثاني الإعدادي'], ['prep3', 'الثالث الإعدادي'], ['sec1', 'الأول الثانوي'], ['sec2', 'الثاني الثانوي']];
const TLABEL = Object.fromEntries(TARGETS);
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  bell: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>'),
  lesson: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 9.5v5l4.2-2.5z" fill="currentColor"/>'),
  exam: svg('<path d="M9 4h6l1 2h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3z"/><path d="m9 13 2 2 4-4"/>'),
  msg: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/><path d="M9 11h6M9 14h4"/>'),
  send: svg('<path d="m22 2-9 20-3-9-9-3z"/><path d="M22 2 10 13"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  repeat: svg('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>')
};
const TYPES = {
  lesson: { label: 'درس جديد', color: '#34D399', ic: IC.lesson, link: '/studentprofile/videos/', ch: 'lessons' },
  exam: { label: 'امتحان / واجب', color: '#FBBF24', ic: IC.exam, link: '/studentprofile/exams/', ch: 'exams' },
  msg: { label: 'رسالة', color: '#38BDF8', ic: IC.msg, link: '', ch: 'messages' }
};
const App = () => window.AlHudaApp || null;
const isAdminNow = () => !!(window.__acc && window.__acc.admin);

/* ---------------------------------------------------------------- CSS */
const css = document.createElement('style'); css.id = 'notify-css';
css.textContent = `
.nt-hwrap{ display:flex; align-items:center; gap:10px; }
.nt-bell{ position:relative; width:42px; height:42px; border-radius:14px; border:1px solid var(--panel-border,rgba(250,246,236,.14)); background:rgba(250,246,236,.06); color:var(--cream,#FAF6EC); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; transition:background .2s ease, transform .15s ease; }
.nt-bell:hover{ background:rgba(250,246,236,.12); }
.nt-bell:active{ transform:scale(.93); }
.nt-bell svg{ width:21px; height:21px; transform-origin:50% 8%; }
.nt-bell.ring svg{ animation:ntRing 1.1s ease; }
@keyframes ntRing{ 0%,100%{ transform:rotate(0); } 15%{ transform:rotate(16deg); } 30%{ transform:rotate(-14deg); } 45%{ transform:rotate(10deg); } 60%{ transform:rotate(-8deg); } 75%{ transform:rotate(4deg); } }
.nt-bell .nt-b{ position:absolute; top:-5px; inset-inline-start:-5px; min-width:19px; height:19px; padding:0 5px; border-radius:99px; background:#ff4a3d; color:#fff; font:800 .68rem/19px 'Tajawal',sans-serif; text-align:center; box-shadow:0 0 0 2px var(--bg-alt,#17302B); }
.nt-bell .nt-b[hidden]{ display:none; }
.nt-dbell{ padding:0; width:42px; height:42px; justify-content:center; }
.nt-dbell svg{ width:21px; height:21px; }
.nt-dbell .nt-b{ position:absolute; top:-5px; inset-inline-start:-5px; min-width:19px; height:19px; padding:0 5px; border-radius:99px; background:#ff4a3d; color:#fff; font:800 .68rem/19px 'Tajawal',sans-serif; text-align:center; }
.nt-dbell .nt-b[hidden]{ display:none; }

/* اللوحة */
.nt-panel{ position:fixed; inset:0; z-index:320; direction:rtl; visibility:hidden; pointer-events:none; }
.nt-panel.open{ visibility:visible; pointer-events:auto; }
.nt-back{ position:absolute; inset:0; background:rgba(5,12,10,.6); backdrop-filter:blur(3px); opacity:0; transition:opacity .3s ease; }
.nt-panel.open .nt-back{ opacity:1; }
.nt-sheet{ position:absolute; inset-inline:0; bottom:0; max-height:80vh; display:flex; flex-direction:column; background:#12281f; border:1px solid rgba(250,246,236,.14); border-bottom:0; border-radius:26px 26px 0 0; box-shadow:0 -20px 60px -20px rgba(0,0,0,.7); transform:translateY(100%); transition:transform .45s cubic-bezier(.2,.9,.25,1.05); padding-bottom:env(safe-area-inset-bottom,0px); }
.nt-panel.open .nt-sheet{ transform:none; }
.nt-grab{ width:44px; height:5px; border-radius:9px; background:rgba(250,246,236,.22); margin:10px auto 2px; }
.nt-head{ display:flex; align-items:center; gap:10px; padding:10px 18px 12px; }
.nt-head h3{ flex:1; font-size:1.15rem; font-weight:900; color:var(--cream,#FAF6EC); }
.nt-head button{ font-family:inherit; cursor:pointer; border:0; border-radius:12px; color:var(--teal-300,#A9CFC6); background:rgba(169,207,198,.1); padding:8px 12px; font-weight:700; font-size:.82rem; }
.nt-head button.nt-x{ width:36px; height:36px; padding:0; display:inline-flex; align-items:center; justify-content:center; color:var(--cream,#FAF6EC); }
.nt-head button.nt-x svg{ width:18px; height:18px; }
.nt-list{ overflow:auto; padding:2px 14px 18px; display:flex; flex-direction:column; gap:10px; }
.nt-item{ display:flex; gap:12px; text-align:start; width:100%; font-family:inherit; color:var(--cream,#FAF6EC); background:rgba(250,246,236,.05); border:1px solid rgba(250,246,236,.1); border-radius:18px; padding:13px; cursor:pointer; position:relative; opacity:0; transform:translateY(10px); animation:ntIn .45s cubic-bezier(.2,.9,.3,1) forwards; }
@keyframes ntIn{ to{ opacity:1; transform:none; } }
.nt-item.new{ border-color:rgba(211,166,103,.55); background:rgba(211,166,103,.09); }
.nt-item.new::after{ content:""; position:absolute; top:14px; inset-inline-end:14px; width:9px; height:9px; border-radius:50%; background:var(--gold,#D3A667); box-shadow:0 0 10px var(--gold,#D3A667); }
.nt-ico{ flex-shrink:0; width:44px; height:44px; border-radius:14px; display:flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--c) 18%, transparent); color:var(--c); }
.nt-ico svg{ width:23px; height:23px; }
.nt-txt{ min-width:0; flex:1; }
.nt-txt b{ display:block; font-size:.98rem; margin-bottom:3px; padding-inline-end:16px; }
.nt-txt p{ color:var(--text-soft,#CBDAD3); font-size:.88rem; line-height:1.7; white-space:pre-wrap; word-break:break-word; }
.nt-txt small{ display:block; margin-top:6px; color:#8fb0a6; font-size:.74rem; font-weight:700; }
.nt-empty{ text-align:center; padding:38px 18px; color:var(--text-soft,#CBDAD3); }
.nt-empty .nt-ico{ margin:0 auto 12px; width:64px; height:64px; border-radius:20px; --c:#A9CFC6; }
.nt-empty .nt-ico svg{ width:32px; height:32px; }
@media (min-width:760px){
  .nt-sheet{ inset-inline:auto; inset-inline-start:24px; bottom:auto; top:74px; width:400px; max-height:calc(100vh - 110px); border-radius:24px; border-bottom:1px solid rgba(250,246,236,.14); transform:translateY(-12px) scale(.97); opacity:0; transition:transform .3s ease, opacity .3s ease; }
  .nt-panel.open .nt-sheet{ transform:none; opacity:1; }
  .nt-grab{ display:none; }
}

/* بانر الإشعار الفوري */
.nt-banner{ position:fixed; z-index:2147481000; top:calc(12px + env(safe-area-inset-top,0px)); inset-inline:12px; max-width:440px; margin-inline:auto; direction:rtl; display:flex; gap:12px; align-items:center; padding:12px 14px; border-radius:20px; color:var(--cream,#FAF6EC); background:rgba(18,40,31,.97); border:1px solid rgba(211,166,103,.4); box-shadow:0 20px 44px -14px rgba(0,0,0,.75); transform:translateY(-140%); transition:transform .5s cubic-bezier(.2,.9,.25,1.2); cursor:pointer; }
.nt-banner.in{ transform:none; }
.nt-banner .nt-ico{ width:42px; height:42px; }
.nt-banner b{ display:block; font-size:.95rem; } .nt-banner p{ font-size:.85rem; color:#CBDAD3; margin-top:2px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }

/* لوحة التحكم */
#adNotify .nt-wrap{ display:grid; gap:18px; grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr); align-items:start; }
@media (max-width:980px){ #adNotify .nt-wrap{ grid-template-columns:1fr; } }
#adNotify .nt-card{ background:rgba(250,246,236,.04); border:1px solid rgba(250,246,236,.12); border-radius:22px; padding:18px; }
#adNotify h3{ font-size:1.02rem; font-weight:900; margin-bottom:12px; color:var(--cream,#FAF6EC); }
#adNotify .nt-types{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px; }
#adNotify .nt-ty{ font-family:inherit; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:7px; padding:13px 6px; border-radius:16px; color:var(--text-soft,#CBDAD3); font-weight:800; font-size:.86rem; background:rgba(250,246,236,.04); border:1.5px solid rgba(250,246,236,.12); transition:all .2s ease; }
#adNotify .nt-ty svg{ width:24px; height:24px; color:var(--c); }
#adNotify .nt-ty[aria-pressed="true"]{ border-color:var(--c); background:color-mix(in srgb, var(--c) 14%, transparent); color:var(--cream,#FAF6EC); transform:translateY(-2px); }
#adNotify label{ display:block; margin-bottom:12px; font-weight:700; font-size:.86rem; color:var(--text-soft,#CBDAD3); }
#adNotify input[type=text], #adNotify textarea, #adNotify select{ display:block; width:100%; margin-top:6px; font-family:inherit; font-size:.96rem; color:var(--cream,#FAF6EC); background:rgba(0,0,0,.22); border:1px solid rgba(250,246,236,.16); border-radius:13px; padding:11px 13px; outline:none; }
#adNotify select option{ color:#10241f; }
#adNotify input:focus, #adNotify textarea:focus, #adNotify select:focus{ border-color:var(--gold,#D3A667); box-shadow:0 0 0 3px rgba(211,166,103,.18); }
#adNotify textarea{ resize:vertical; min-height:84px; line-height:1.7; }
#adNotify .nt-cnt{ display:block; text-align:start; margin-top:4px; font-size:.74rem; color:#8fb0a6; }
#adNotify .nt-chk{ display:flex; align-items:center; gap:9px; cursor:pointer; }
#adNotify .nt-chk input{ width:18px; height:18px; accent-color:var(--gold,#D3A667); }
#adNotify .nt-send{ width:100%; font-family:inherit; cursor:pointer; border:0; border-radius:16px; padding:14px; font-weight:900; font-size:1.02rem; color:#10241f; background:linear-gradient(135deg,#E9C58B,#D3A667); display:flex; gap:9px; align-items:center; justify-content:center; box-shadow:0 14px 26px -12px rgba(211,166,103,.8); transition:transform .15s ease, opacity .2s; }
#adNotify .nt-send svg{ width:20px; height:20px; }
#adNotify .nt-send:active{ transform:scale(.98); }
#adNotify .nt-send[disabled]{ opacity:.6; cursor:wait; }
#adNotify .nt-stat{ margin-top:10px; font-size:.86rem; line-height:1.7; min-height:1.2em; }
#adNotify .nt-stat.ok{ color:#34D399; } #adNotify .nt-stat.warn{ color:#FBBF24; } #adNotify .nt-stat.err{ color:#F87171; }
#adNotify .nt-phone{ border-radius:22px; padding:16px; background:linear-gradient(160deg,#1a2a28,#0e1a18); border:1px solid rgba(250,246,236,.1); }
#adNotify .nt-phone small{ display:block; margin-bottom:10px; color:#8fb0a6; font-weight:700; }
#adNotify .nt-pv{ display:flex; gap:11px; padding:12px; border-radius:18px; background:rgba(250,246,236,.1); backdrop-filter:blur(6px); }
#adNotify .nt-pv .app{ width:38px; height:38px; border-radius:50%; background:#0F5A43; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
#adNotify .nt-pv .app img{ width:22px; height:22px; display:block; }
#adNotify .nt-pv .nm{ font-size:.72rem; color:#A9CFC6; font-weight:800; display:flex; justify-content:space-between; }
#adNotify .nt-pv b{ display:block; font-size:.94rem; color:#fff; margin:2px 0; }
#adNotify .nt-pv p{ font-size:.84rem; color:#d9e5e0; line-height:1.6; white-space:pre-wrap; word-break:break-word; }
#adNotify .nt-hist{ display:flex; flex-direction:column; gap:9px; max-height:520px; overflow:auto; }
#adNotify .nt-row{ display:flex; gap:11px; align-items:center; padding:11px; border-radius:16px; background:rgba(250,246,236,.04); border:1px solid rgba(250,246,236,.1); }
#adNotify .nt-row .nt-ico{ width:38px; height:38px; border-radius:12px; } #adNotify .nt-row .nt-ico svg{ width:20px; height:20px; }
#adNotify .nt-row .m{ flex:1; min-width:0; } #adNotify .nt-row b{ display:block; font-size:.9rem; color:var(--cream,#FAF6EC); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#adNotify .nt-row small{ color:#8fb0a6; font-size:.74rem; font-weight:700; }
#adNotify .nt-row button{ font-family:inherit; cursor:pointer; width:34px; height:34px; border-radius:11px; border:0; background:rgba(250,246,236,.07); color:var(--text-soft,#CBDAD3); display:inline-flex; align-items:center; justify-content:center; }
#adNotify .nt-row button:hover{ background:rgba(250,246,236,.14); } #adNotify .nt-row button.del:hover{ color:#F87171; }
#adNotify .nt-row button svg{ width:17px; height:17px; }
#adNotify .nt-setup{ margin-top:12px; padding:12px 14px; border-radius:14px; background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.3); color:#f3dca0; font-size:.84rem; line-height:1.8; }
@media (prefers-reduced-motion:reduce){ .nt-item,.nt-banner,.nt-sheet,.nt-bell svg{ animation:none !important; transition:none !important; } }
`;
document.head.appendChild(css);

/* ------------------------------------------------------------ الحالة */
let me = null, myGrade = null, items = [], seenKey = '', firstSnap = true, unsub = null, panelOpen = false, openSeen = 0;
const shown = new Set();
const seenAt = () => Number(localStorage.getItem(seenKey) || 0);
const atMs = d => d && d.at && typeof d.at.toMillis === 'function' ? d.at.toMillis() : 0;
const mine = d => isAdminNow() || !myGrade || d.target === 'all' || d.target === myGrade;

function ago(ms){
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if(s < 60) return 'الآن';
  const f = (n, one, two, few, many) => 'منذ ' + (n === 1 ? one : n === 2 ? two : n <= 10 ? N(n) + ' ' + few : N(n) + ' ' + many);
  const m = Math.floor(s / 60); if(m < 60) return f(m, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة');
  const h = Math.floor(m / 60); if(h < 24) return f(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
  const d = Math.floor(h / 24); if(d < 30) return f(d, 'يوم', 'يومين', 'أيام', 'يومًا');
  return new Date(ms).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
}
const unread = () => items.filter(x => mine(x) && atMs(x) > seenAt()).length;

/* ------------------------------------------------------------ الجرس */
function bellBtn(id, cls){
  return `<button type="button" id="${id}" class="${cls}" aria-label="الإشعارات" hidden>${IC.bell}<span class="nt-b" hidden>0</span></button>`;
}
function mountBells(){
  const a = $('#authBtn');
  if(a && !$('#ntBellH')){
    const w = document.createElement('div'); w.className = 'nt-hwrap';
    a.parentNode.insertBefore(w, a); w.appendChild(a);
    w.insertAdjacentHTML('afterbegin', bellBtn('ntBellH', 'nt-bell'));
  }
  const out = $('#dpOut');
  if(out && !$('#ntBellD')){
    out.insertAdjacentHTML('afterend', bellBtn('ntBellD', 'dp-top nt-dbell nt-bell'));
    const place = () => {
      const b = $('#ntBellD'), back = $('#dpBack'); if(!b) return;
      b.style.top = ''; b.style.left = (18 + out.offsetWidth + 10) + 'px';
      if(back && out.offsetWidth){ const r = b.getBoundingClientRect(), br = back.getBoundingClientRect(); if(r.right > br.left - 6) { b.style.left = '18px'; b.style.top = '66px'; } }
    };
    if('ResizeObserver' in window) new ResizeObserver(place).observe(out);
    window.addEventListener('resize', place); setTimeout(place, 300);
  }
  document.querySelectorAll('.nt-bell').forEach(b => { if(!b._nt){ b._nt = 1; b.addEventListener('click', openPanel); } });
}
function paintBadges(ring){
  const n = unread(), on = !!me;
  document.querySelectorAll('.nt-bell').forEach(b => {
    b.hidden = !on;
    const t = b.querySelector('.nt-b'); if(t){ t.hidden = !n; t.textContent = n > 9 ? N(9) + '+' : N(n); }
    if(ring && n){ b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring'); }
  });
}

/* ------------------------------------------------------------ اللوحة */
function mountPanel(){
  if($('#nPanel')) return;
  document.body.insertAdjacentHTML('beforeend',
    `<div id="nPanel" class="nt-panel" role="dialog" aria-modal="true" aria-label="الإشعارات"><div class="nt-back"></div>
      <div class="nt-sheet"><div class="nt-grab"></div>
        <div class="nt-head"><h3>الإشعارات</h3><button type="button" id="nAll">تعليم الكل كمقروء</button><button type="button" class="nt-x" id="nX" aria-label="إغلاق">${IC.x}</button></div>
        <div class="nt-list" id="nList"></div></div></div>`);
  $('#nPanel .nt-back').addEventListener('click', closePanel);
  $('#nX').addEventListener('click', closePanel);
  $('#nAll').addEventListener('click', () => { localStorage.setItem(seenKey, String(Date.now())); openSeen = Date.now(); paintList(); paintBadges(); });
  $('#nList').addEventListener('click', e => {
    const b = e.target.closest('[data-id]'); if(!b) return;
    const it = items.find(x => x.id === b.dataset.id); closePanel();
    if(it && it.link) go(it.link);
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && panelOpen) closePanel(); });
  window.addEventListener('alhuda:close-notifs', closePanel);
}
function paintList(){
  const box = $('#nList'); if(!box) return;
  const list = items.filter(mine).filter(x => atMs(x) || x.at === null);
  if(!list.length){ box.innerHTML = `<div class="nt-empty"><div class="nt-ico">${IC.bell}</div><b>مفيش إشعارات لسه</b><p style="margin-top:4px">أول ما فيه درس جديد أو تنبيه هتلاقيه هنا.</p></div>`; return; }
  box.innerHTML = list.map((x, i) => {
    const t = TYPES[x.type] || TYPES.msg, ms = atMs(x);
    return `<button type="button" class="nt-item${ms > openSeen ? ' new' : ''}" data-id="${esc(x.id)}" style="--c:${t.color};animation-delay:${Math.min(i, 8) * 45}ms">
      <span class="nt-ico">${t.ic}</span><span class="nt-txt"><b>${esc(x.title)}</b><p>${esc(x.body)}</p><small>${ms ? ago(ms) : 'الآن'} · ${esc(t.label)}</small></span></button>`;
  }).join('');
}
function openPanel(){
  if(panelOpen) return; panelOpen = true;
  openSeen = seenAt(); localStorage.setItem(seenKey, String(Date.now()));
  paintList(); paintBadges();
  requestAnimationFrame(() => $('#nPanel').classList.add('open'));
}
function closePanel(){ panelOpen = false; const p = $('#nPanel'); if(p) p.classList.remove('open'); }
function go(path){
  if(App() && App().navigate) return App().navigate(path);
  history.pushState(null, '', path); window.dispatchEvent(new PopStateEvent('popstate'));
}

/* ------------------------------------------------------------ بانر + إشعار نظام */
function banner(x){
  if(shown.has(x.id)) return; shown.add(x.id);
  const t = TYPES[x.type] || TYPES.msg;
  const b = document.createElement('div'); b.className = 'nt-banner'; b.style.setProperty('--c', t.color);
  b.innerHTML = `<span class="nt-ico">${t.ic}</span><div style="min-width:0"><b>${esc(x.title)}</b><p>${esc(x.body)}</p></div>`;
  document.body.appendChild(b);
  requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('in')));
  const kill = () => { b.classList.remove('in'); setTimeout(() => b.remove(), 520); };
  b.addEventListener('click', () => { kill(); if(x.link) go(x.link); else openPanel(); });
  setTimeout(kill, 6000);
  if(navigator.vibrate) try{ navigator.vibrate([30, 40, 30]); }catch(e){}
}
function systemNotify(x){
  if(!window.alhudaDesktop || document.hasFocus()) return;
  try{
    const n = new Notification(x.title, { body: x.body, icon: '/app/icon-192.png', silent: false });
    n.onclick = () => { if(window.alhudaDesktop.focus) window.alhudaDesktop.focus(); if(x.link) go(x.link); else openPanel(); };
  }catch(e){}
}

/* ------------------------------------------------------------ Firestore (لحظي) */
function listen(){
  if(unsub) unsub(); firstSnap = true;
  unsub = onSnapshot(query(collection(D, 'notifications'), orderBy('at', 'desc'), limit(40)), snap => {
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if(!firstSnap){
      snap.docChanges().forEach(ch => {
        if(ch.type !== 'added') return;
        const x = { id: ch.doc.id, ...ch.doc.data() };
        if(!x.at || (me && x.by === me.email) || !mine(x)) return;
        banner(x); systemNotify(x); paintBadges(true);
      });
    }
    firstSnap = false;
    paintBadges(); if(panelOpen) paintList(); if(adVisible()) histPaint();
  }, err => console.warn('notifications listener', err && err.code));
}

/* ------------------------------------------------------------ Push (أندرويد) */
let pushReady = false;
const FM = () => (App() && App().plug && App().plug('FirebaseMessaging')) || (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseMessaging) || null;
async function pushSetup(){
  const fm = FM(); if(!fm || pushReady) return !!fm; pushReady = true;
  try{
    const ch = [['lessons', 'الدروس الجديدة', 'تنبيهات الفيديوهات والدروس الجديدة'], ['exams', 'الامتحانات والواجبات', 'تنبيهات الامتحانات والواجبات'], ['messages', 'رسائل المدرسة', 'رسائل من المدرسة أو المنصة']];
    for(const c of ch) await fm.createChannel({ id: c[0], name: c[1], description: c[2], importance: 4, visibility: 1, vibration: true, lights: true, lightColor: '#D3A667' });
  }catch(e){}
  fm.addListener('notificationReceived', ev => {
    const d = (ev.notification && ev.notification.data) || {}, n = ev.notification || {};
    banner({ id: d.nid || ('p' + Date.now()), title: n.title || '', body: n.body || '', type: d.type, link: d.link });
  });
  fm.addListener('notificationActionPerformed', ev => {
    const d = (ev.notification && ev.notification.data) || {};
    if(d.link) go(d.link); else openPanel();
  });
  return true;
}
async function pushRegister(){
  const fm = FM(); if(!fm || !(await pushSetup())) return;
  try{
    const p = await fm.requestPermissions(); if(p.receive !== 'granted') return;
    await fm.subscribeToTopic({ topic: 'all' });
    const want = myGrade ? 'grade_' + myGrade : '', old = localStorage.getItem('alhuda_push_topic') || '';
    if(old && old !== want) try{ await fm.unsubscribeFromTopic({ topic: old }); }catch(e){}
    if(want){ await fm.subscribeToTopic({ topic: want }); localStorage.setItem('alhuda_push_topic', want); }
    else localStorage.removeItem('alhuda_push_topic');
  }catch(e){ console.warn('push register', e); }
}
async function pushUnregister(){
  const fm = FM(), old = localStorage.getItem('alhuda_push_topic');
  if(!fm || !old) return;
  try{ await fm.unsubscribeFromTopic({ topic: old }); localStorage.removeItem('alhuda_push_topic'); }catch(e){}
}

/* ------------------------------------------------------------ لوحة التحكم: تبويب الإشعارات */
const ED = { type: 'lesson' };
const adVisible = () => { const s = $('#adNotify'); return !!(s && !s.hidden); };
function adHTML(){
  return `<div class="nt-wrap"><div>
    <div class="nt-card"><h3>إرسال إشعار جديد</h3>
      <div class="nt-types" role="group" aria-label="نوع الإشعار">${Object.entries(TYPES).map(([k, t]) => `<button type="button" class="nt-ty" data-ty="${k}" style="--c:${t.color}" aria-pressed="${k === ED.type}">${t.ic}<span>${t.label}</span></button>`).join('')}</div>
      <label>الفئة المستهدفة<select id="ntTarget">${TARGETS.map(t => `<option value="${t[0]}">${t[1]}</option>`).join('')}</select></label>
      <label>العنوان<input type="text" id="ntTitle" maxlength="60" placeholder="مثال: نزل شرح درس جديد" autocomplete="off"><span class="nt-cnt" id="ntC1"></span></label>
      <label>نص الإشعار<textarea id="ntBody" maxlength="240" placeholder="اكتب الرسالة اللي هتوصل للطلاب"></textarea><span class="nt-cnt" id="ntC2"></span></label>
      <label class="nt-chk"><input type="checkbox" id="ntLink" checked><span>لما الطالب يضغط على الإشعار يفتح القسم المناسب (الفيديوهات / الامتحانات)</span></label>
      <button type="button" class="nt-send" id="ntSend">${IC.send}<span>إرسال الإشعار</span></button>
      <div class="nt-stat" id="ntStat" role="status"></div>
      ${PUSH_URL ? '' : '<div class="nt-setup">إشعارات الموبايل (التطبيق) لسه مش متفعّلة: الإشعار بيظهر جوه الموقع والتطبيق، وبيوصل للموبايل نفسه بعد ما تربط خدمة الإرسال (الـ Worker). شوف ملف الشرح.</div>'}
    </div></div>
    <div><div class="nt-phone"><small>معاينة شكل الإشعار على الموبايل</small>
      <div class="nt-pv"><div class="app"><img src="/app/ic-notif.png" alt="" width="22" height="22"></div>
      <div style="min-width:0;flex:1"><div class="nm"><span>الهدى</span><span>الآن</span></div><b id="pvT">عنوان الإشعار</b><p id="pvB">نص الإشعار هيظهر هنا.</p></div></div></div>
      <div class="nt-card" style="margin-top:18px"><h3>آخر الإشعارات</h3><div class="nt-hist" id="ntHist"></div></div></div></div>`;
}
function histPaint(){
  const h = $('#ntHist'); if(!h) return;
  h.innerHTML = items.length ? items.map(x => { const t = TYPES[x.type] || TYPES.msg, ms = atMs(x);
    return `<div class="nt-row" style="--c:${t.color}"><span class="nt-ico">${t.ic}</span><div class="m"><b>${esc(x.title)}</b><small>${esc(TLABEL[x.target] || x.target)} · ${ms ? ago(ms) : 'الآن'}</small></div>
      ${PUSH_URL ? `<button type="button" data-re="${esc(x.id)}" title="إعادة إرسال للموبايل" aria-label="إعادة إرسال">${IC.repeat}</button>` : ''}<button type="button" class="del" data-del="${esc(x.id)}" title="حذف" aria-label="حذف">${IC.trash}</button></div>`; }).join('')
    : '<p style="color:#8fb0a6;font-size:.88rem">لسه ماتبعتش إشعارات.</p>';
}
function preview(){
  const t = $('#ntTitle'), b = $('#ntBody'); if(!t) return;
  $('#pvT').textContent = t.value.trim() || 'عنوان الإشعار';
  $('#pvB').textContent = b.value.trim() || 'نص الإشعار هيظهر هنا.';
  $('#ntC1').textContent = N(t.value.length) + ' / ' + N(60); $('#ntC2').textContent = N(b.value.length) + ' / ' + N(240);
}
function stat(msg, cls){ const s = $('#ntStat'); if(s){ s.textContent = msg; s.className = 'nt-stat ' + (cls || ''); } }
async function pushSend(p){
  if(!PUSH_URL) return { skipped: true };
  const tok = await A.currentUser.getIdToken();
  const r = await fetch(PUSH_URL.replace(/\/$/, '') + '/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(p) });
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}
async function onSend(){
  const title = $('#ntTitle').value.trim(), body = $('#ntBody').value.trim(), target = $('#ntTarget').value, type = ED.type;
  if(!title) return stat('اكتب عنوان للإشعار', 'err');
  if(!body) return stat('اكتب نص الإشعار', 'err');
  const link = $('#ntLink').checked ? TYPES[type].link : '';
  const btn = $('#ntSend'); btn.disabled = true; stat('جاري الإرسال…');
  let id;
  try{ id = (await addDoc(collection(D, 'notifications'), { title, body, type, target, link, at: serverTimestamp(), by: (A.currentUser && A.currentUser.email) || '' })).id; }
  catch(e){ btn.disabled = false; return stat('تعذر الحفظ: ' + (e.code || 'error') + ' — اتأكد إنك حدّثت قواعد Firestore.', 'err'); }
  try{
    const r = await pushSend({ nid: id, title, body, type, target, link });
    stat(r.skipped ? 'اتحفظ الإشعار وظهر للطلاب جوه الموقع والتطبيق. (إشعار الموبايل محتاج ربط الـ Worker)' : 'تم الإرسال ✓ — وصل لتطبيقات الطلاب.', r.skipped ? 'warn' : 'ok');
  }catch(e){ stat('اتحفظ جوه الموقع، لكن إرسال إشعار الموبايل فشل: ' + e.message, 'warn'); }
  $('#ntTitle').value = ''; $('#ntBody').value = ''; preview(); btn.disabled = false;
  if(window.toast) window.toast('تم إرسال الإشعار');
}
function adInit(){
  const nav = $('#adTabs'), body = $('#adBody'); if(!nav || !body || $('#ntNav')) return;
  const rev = nav.querySelector('[data-t=reviews]'), grp = rev && rev.previousElementSibling;
  const html = '<div class="adm-grp">التواصل</div><button type="button" class="adm-ni" id="ntNav"><span class="ni c-pink" style="display:inline-flex;align-items:center;justify-content:center">' + IC.bell.replace('<svg ', '<svg width="20" height="20" ') + '</span><span>الإشعارات</span></button>';
  if(grp && grp.classList.contains('adm-grp')) grp.insertAdjacentHTML('beforebegin', html); else nav.insertAdjacentHTML('beforeend', html);
  body.insertAdjacentHTML('beforeend', '<section id="adNotify" hidden></section>');
  const sec = $('#adNotify'); sec.innerHTML = adHTML(); histPaint(); preview();

  const hideMine = () => { sec.hidden = true; const n = $('#ntNav'); if(n) n.removeAttribute('aria-current'); };
  nav.addEventListener('click', e => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.id !== 'ntNav') return hideMine();
    body.querySelectorAll(':scope > section').forEach(s => s.hidden = s.id !== 'adNotify');
    nav.querySelectorAll('.adm-ni').forEach(x => x.removeAttribute('aria-current')); b.setAttribute('aria-current', 'page');
    $('#adTitle').textContent = 'الإشعارات'; $('#adSub').textContent = 'ابعت تنبيه لطلابك: درس جديد، امتحان أو واجب، أو رسالة';
    $('#adSide').classList.remove('open'); $('#adBackdrop').classList.remove('open');
    histPaint(); preview();
  }, true);
  const ttl = $('#adTitle');
  if(ttl) new MutationObserver(() => { if(!sec.hidden && ttl.textContent !== 'الإشعارات') hideMine(); }).observe(ttl, { childList: true, characterData: true, subtree: true });

  sec.addEventListener('click', async e => {
    const ty = e.target.closest('[data-ty]'), del = e.target.closest('[data-del]'), re = e.target.closest('[data-re]');
    if(ty){ ED.type = ty.dataset.ty; sec.querySelectorAll('.nt-ty').forEach(b => b.setAttribute('aria-pressed', String(b === ty))); }
    else if(e.target.closest('#ntSend')) onSend();
    else if(del){ if(confirm('حذف الإشعار؟ هيختفي من عند الطلاب كمان.')){ try{ await deleteDoc(doc(D, 'notifications', del.dataset.del)); }catch(err){ alert('تعذر الحذف: ' + (err.code || 'error')); } } }
    else if(re){ const x = items.find(i => i.id === re.dataset.re); if(!x) return;
      if(!confirm('إعادة إرسال الإشعار لتطبيقات الطلاب؟')) return;
      try{ await pushSend({ nid: x.id, title: x.title, body: x.body, type: x.type, target: x.target, link: x.link || '' }); stat('تمت إعادة الإرسال ✓', 'ok'); }catch(err){ stat('فشل الإرسال: ' + err.message, 'err'); } }
  });
  sec.addEventListener('input', preview);
}

/* ------------------------------------------------------------ تشغيل */
mountPanel(); adInit();
window.addEventListener('alhuda:app-ready', () => { if(me) pushRegister(); });
const mo = new MutationObserver(() => mountBells());
mo.observe(document.body, { childList: true, subtree: true });
mountBells();

onAuthStateChanged(A, async u => {
  me = u; items = []; paintBadges(); if(unsub){ unsub(); unsub = null; }
  if(!u){ myGrade = null; seenKey = ''; closePanel(); pushUnregister(); return; }
  seenKey = 'alhuda_n_seen_' + u.uid;
  if(!localStorage.getItem(seenKey)) localStorage.setItem(seenKey, String(Date.now()));   // أول مرة: ماتعتبرش القديم "جديد"
  try{ const s = await getDoc(doc(D, 'users', u.uid)); myGrade = s.exists() ? (GKEY[s.data().grade] || null) : null; }catch(e){ myGrade = null; }
  listen(); mountBells(); paintBadges();
  if(!isAdminNow()) pushRegister();
});


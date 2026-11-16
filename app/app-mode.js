/* =====================================================================
   الهدى — وضع التطبيق (أندرويد + ويندوز)
   بيتحمّل من index.html بس لما الـ User-Agent فيه AlHudaApp.
   ===================================================================== */
(function(){
  'use strict';
  var D = document, H = D.documentElement;
  var MOBILE = H.classList.contains('am-mobile'), DESK = H.classList.contains('am-desktop');
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var YT_URL = 'https://www.youtube.com/@MsNour.Elhoda';
  var YT_SUB = 'https://www.youtube.com/@MsNour.Elhoda?sub_confirmation=1';

  function plug(n){ var c = window.Capacitor; return (c && c.Plugins && c.Plugins[n]) || null; }
  function toast(m, t){ if(typeof window.toast === 'function') window.toast(m, t); }
  function el(tag, cls, html){ var e = D.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; }
  function openExternal(u){
    if(window.alhudaDesktop && window.alhudaDesktop.openExternal) return window.alhudaDesktop.openExternal(u);
    if(MOBILE){ location.href = u; return; }
    window.open(u, '_blank', 'noopener');
  }
  function navigate(path){
    closeYt(true);
    if(location.pathname !== path) history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  /* ------------------------------------------------------------------ */
  /*  Splash                                                            */
  /* ------------------------------------------------------------------ */
  function buildSplash(){
    if(DESK) return;                       // نسخة ويندوز ليها Splash مستقل
    var s = el('div'); s.id = 'amSplash'; s.setAttribute('aria-hidden', 'true');
    var letters = 'أبتثجحخدذرزسشصضطظعغفقكلمنهوي'.split(''), lt = el('div', 'am-sp-letters');
    for(var i = 0; i < 18; i++){
      var sp = el('span', null, letters[Math.floor(Math.random() * letters.length)]);
      sp.style.left = (Math.random() * 94) + '%';
      sp.style.fontSize = (22 + Math.random() * 44) + 'px';
      sp.style.animationDuration = (7 + Math.random() * 7) + 's';
      sp.style.animationDelay = (-Math.random() * 10) + 's';
      sp.style.setProperty('--o', (0.06 + Math.random() * 0.1).toFixed(2));
      lt.appendChild(sp);
    }
    var sparks = '';
    for(var k = 0; k < 8; k++){
      var a = k * Math.PI / 4;
      sparks += '<circle class="am-sp-spark" cx="20" cy="20" r="1" style="--dx:' + (Math.cos(a) * 26).toFixed(1) + 'px;--dy:' + (Math.sin(a) * 26).toFixed(1) + 'px"/>';
    }
    s.appendChild(lt);
    s.insertAdjacentHTML('beforeend',
      '<div class="am-sp-logo"><svg viewBox="0 0 40 40" fill="none">' +
        '<circle class="am-sp-ring2" cx="20" cy="20" r="17" stroke="#D3A667" stroke-width=".6"/>' +
        '<circle class="am-sp-ring" cx="20" cy="20" r="19" stroke="#A9CFC6" stroke-width="1.5"/>' +
        '<path class="am-sp-star" d="M20 6 L23 17 L34 20 L23 23 L20 34 L17 23 L6 20 L17 17 Z" fill="#D3A667"/>' + sparks +
      '</svg></div>' +
      '<div class="am-sp-word">الهُدى</div><div class="am-sp-line"></div>' +
      '<div class="am-sp-tag"><span class="on">العربي بقى أسهل</span><span>ابدأ رحلتك لأعلى الدرجات</span><span>مع ميس نور الهدى</span></div>' +
      '<div class="am-sp-track"><div class="am-sp-fill"></div>' +
        '<svg class="am-sp-run" viewBox="0 0 40 40"><path d="M20 4 L24 16 L36 20 L24 24 L20 36 L16 24 L4 20 L16 16 Z" fill="#E9C58B"/></svg></div>');
    H.appendChild(s);

    var tags = s.querySelectorAll('.am-sp-tag span'), ti = 0;
    var tagTimer = setInterval(function(){
      tags[ti].classList.remove('on'); ti = (ti + 1) % tags.length; tags[ti].classList.add('on');
    }, 1500);

    var p = 4, t0 = Date.now(), MIN = RM ? 600 : 2800, loaded = false, closed = false;
    s.style.setProperty('--p', p);
    var pt = setInterval(function(){ p += (90 - p) * 0.07; s.style.setProperty('--p', p.toFixed(1)); }, 140);

    function close(){
      if(closed) return; closed = true;
      clearInterval(pt); clearInterval(tagTimer);
      s.style.setProperty('--p', 100);
      setTimeout(function(){ s.classList.add('out'); setTimeout(function(){ s.remove(); }, 800); }, 380);
    }
    function maybeClose(){
      if(!loaded) return;
      setTimeout(close, Math.max(0, MIN - (Date.now() - t0)));
    }
    if(D.readyState === 'complete'){ loaded = true; maybeClose(); }
    else window.addEventListener('load', function(){ loaded = true; maybeClose(); });
    setTimeout(function(){ loaded = true; close(); }, 9000);     // أمان: ماتفضلش الـ Splash للأبد

    // اخفي الـ Splash الأصلي (الثابت) بتاع أندرويد أول ما الشاشة المتحركة تترسم
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      var sc = plug('SplashScreen'); if(sc && sc.hide) sc.hide({ fadeOutDuration: 250 });
    }); });
  }

  /* ------------------------------------------------------------------ */
  /*  أيقونات الشريط السفلي (SVG متحرك بالـ CSS)                         */
  /* ------------------------------------------------------------------ */
  var ICONS = {
    home:
      '<svg viewBox="0 0 24 24"><path class="dr" pathLength="1" d="M3 11.2 12 4l9 7.2"/>' +
      '<path class="dr2" pathLength="1" d="M5.5 9.8V19a1 1 0 0 0 1 1H10v-4.5a2 2 0 0 1 4 0V20h3.5a1 1 0 0 0 1-1V9.8"/>' +
      '<circle class="door am-tb" cx="12" cy="18.6" r=".9" fill="currentColor" stroke="none"/></svg>',
    profile:
      '<svg viewBox="0 0 24 24"><circle class="hd am-tb" cx="12" cy="8" r="3.6"/>' +
      '<path class="dr2" pathLength="1" d="M4.8 20.5c.7-4.1 3.8-6.2 7.2-6.2s6.5 2.1 7.2 6.2"/></svg>',
    videos:
      '<svg viewBox="0 0 24 24"><path class="dr" pathLength="1" d="M4 9.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>' +
      '<g class="clap"><rect x="4" y="5.2" width="16" height="3.6" rx="1"/></g>' +
      '<path class="plf am-tb" d="M10.6 12.6v4.6l4-2.3z" fill="currentColor" stroke="none"/></svg>',
    youtube:
      '<svg viewBox="0 0 24 24"><rect class="yt am-tb" x="2.6" y="5.6" width="18.8" height="12.8" rx="4.2"/>' +
      '<path class="ytp am-tb" d="M10 9.4v5.2l4.6-2.6z" fill="currentColor" stroke="none"/></svg>'
  };
  var ITEMS = [
    { k: 'home',    t: 'الرئيسية' },
    { k: 'profile', t: 'بروفايلي' },
    { k: 'videos',  t: 'الفيديوهات' },
    { k: 'youtube', t: 'اليوتيوب' }
  ];

  var bar, bub, active = null, ytOpen = false, kbOpen = false, yt, layer = null, want = null, keepLy = false, LY = {};

  function buildBar(){
    if(!MOBILE) return;
    bar = el('nav', 'am-bar hide'); bar.setAttribute('aria-label', 'التنقل');
    bub = el('div', 'am-bub'); bar.appendChild(bub);
    ITEMS.forEach(function(it){
      var b = el('button', 'am-it', '<span class="am-ic">' + ICONS[it.k] + '</span><span class="am-lb">' + it.t + '</span>');
      b.type = 'button'; b.dataset.k = it.k; b.setAttribute('aria-label', it.t);
      b.addEventListener('click', function(){ onTap(it.k); });
      bar.appendChild(b);
    });
    D.body.appendChild(bar);
    window.addEventListener('resize', place);
  }

  function place(){
    if(!bar || !active) return;
    var b = bar.querySelector('.am-it[data-k="' + active + '"]'); if(!b) return;
    var r = b.getBoundingClientRect(), br = bar.getBoundingClientRect();
    if(!r.width) return;
    bub.style.setProperty('--bx', (r.left - br.left + r.width / 2 - 28) + 'px');
  }

  function setActive(k, silent){
    if(!bar || k === active) return;
    var first = active === null;
    active = k;
    bar.querySelectorAll('.am-it').forEach(function(b){
      var on = b.dataset.k === k;
      b.classList.toggle('on', on);
      if(on && !silent){ b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    });
    if(first){ bub.style.transition = 'none'; place(); void bub.offsetWidth; bub.style.transition = ''; }
    else{
      place();
      if(!RM){ bub.classList.remove('mv'); void bub.offsetWidth; bub.classList.add('mv'); }
    }
  }

  function vis(id){ var e = D.getElementById(id); return !!(e && !e.hidden && e.offsetParent !== null || (e && !e.hidden && getComputedStyle(e).position === 'fixed' && getComputedStyle(e).display !== 'none')); }

  function currentState(){
    if(ytOpen) return 'youtube';
    var blockers = ['adminPage', 'authPage', 'buyPage', 'walletPage', 'secPage', 'xo'];
    for(var i = 0; i < blockers.length; i++) if(vis(blockers[i])) return null;
    var cm = D.getElementById('courseModal'); if(cm && cm.classList.contains('open')) return null;
    if(layer) return layer === 'gp' ? 'profile' : 'videos';
    if(vis('dashPage')) return /\/studentprofile\/videos/.test(location.pathname) ? 'videos' : 'profile';
    return 'home';
  }

  var pend = false;
  function sync(){
    if(!bar || pend) return; pend = true;
    requestAnimationFrame(function(){
      pend = false;
      if(layer && isIn()) closeLayer(true);
      var st = currentState();
      if(want){ if(st === want.k || Date.now() > want.t) want = null; else if(st) st = want.k; }
      var hide = !st || kbOpen;
      bar.classList.toggle('hide', hide);
      D.body.classList.toggle('am-nobar', hide);
      if(st) setActive(st, bar.classList.contains('hide'));
    });
  }

  function onTap(k){
    if(navigator.vibrate) try{ navigator.vibrate(9); }catch(e){}
    want = null;
    if(k === 'youtube'){ closeLayer(true); openYt(); setActive('youtube'); return; }
    closeYt(true);
    setActive(k);
    if(k === 'home'){
      closeLayer(true);
      var atHome = location.pathname === '/' && !vis('dashPage');
      navigate('/');
      if(atHome) window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
    }else if(!isIn()){
      openLayer(k === 'profile' ? 'gp' : 'gv');
    }else{
      closeLayer(true); goTab(k);
    }
    setTimeout(sync, 250);
  }

  /* فتح تبويب الطالب مباشرة (من غير ما نقفل الصفحة ونرجع للرئيسية الأول) */
  function goTab(k){
    var path = k === 'profile' ? '/studentprofile/' : '/studentprofile/videos/';
    want = { k: k, t: Date.now() + 4000 };
    if(location.pathname !== path) history.pushState(null, '', path);
    var HK = window.__authHooks;
    if(HK && typeof parseRoute === 'function'){ if(typeof syncMeta === 'function') syncMeta(); HK.apply(parseRoute(path)); }
    else navigate(path);
  }

  /* ------------------------------------------------------------------ */
  /*  شاشات الزائر (بروفايل + فيديوهات)                                  */
  /* ------------------------------------------------------------------ */
  var GNM = { prep1: '01', prep2: '02', prep3: '03', sec1: '04', sec2: '05' };
  function isIn(){ var b = D.getElementById('authBtn'); return !!(b && b.classList.contains('in')); }
  function ico(p){ return '<svg viewBox="0 0 24 24">' + p + '</svg>'; }
  function buildLayers(){
    var rows = [
      ['<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9.5 4.5 2.5-4.5 2.5z"/>', 'فيديوهات ومذكرات صفك', 'شروحات الدروس وملفات PDF متقسمة حسب صفك الدراسي.'],
      ['<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><rect x="5" y="6" width="14" height="15" rx="2.5"/><path d="m9 14 2 2 4-4.5"/>', 'امتحانات أونلاين', 'اختبر نفسك واعرف نتيجتك ومحاولاتك أول بأول.'],
      ['<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/>', 'كورسات مميزة ومصروفاتك', 'اشترك في الباقات وتابع مدفوعاتك من مكان واحد.'],
      ['<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>', 'جدول الحصص والتنبيهات', 'مواعيد حصصك وإشعار بكل درس أو امتحان جديد.']
    ];
    var gp = el('div', 'am-ly'); gp.id = 'amGp'; gp.setAttribute('role', 'dialog'); gp.setAttribute('aria-label', 'بروفايلي');
    gp.innerHTML =
      '<div class="am-ly-in">' +
        '<div class="am-gp-hero"><div class="am-gp-orb">' + ico('<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c.7-4 3.7-6 7.5-6s6.8 2 7.5 6"/>') + '</div>' +
        '<h2>بروفايلك مستنيك</h2><p>سجّل دخولك وكمّل مذاكرتك من حيث وقفت، وكل حاجة خاصة بصفك في مكان واحد.</p></div>' +
        '<div class="am-gp-list">' + rows.map(function(r){ return '<div class="am-gp-it"><div class="ci">' + ico(r[0]) + '</div><div><b>' + r[1] + '</b><small>' + r[2] + '</small></div></div>'; }).join('') + '</div>' +
        '<div class="am-gp-cta"><button type="button" class="am-gp-btn" id="amGpLogin">تسجيل الدخول</button></div>' +
        '<button type="button" class="am-gp-link" id="amGpSign">معندكش حساب؟ <b>أنشئ حساب جديد</b></button>' +
        '<p class="am-gp-note">الحساب الجديد بيتراجع الأول وبعدها بيتفعّل.</p>' +
      '</div>';
    var gv = el('div', 'am-ly'); gv.id = 'amGv'; gv.setAttribute('role', 'dialog'); gv.setAttribute('aria-label', 'الفيديوهات');
    gv.innerHTML = '<div class="am-ly-in wrap" id="amGvBody"></div>';
    D.body.appendChild(gp); D.body.appendChild(gv); LY.gp = gp; LY.gv = gv;
    function toAuth(p){ closeLayer(true); navigate(p); }
    gp.querySelector('#amGpLogin').addEventListener('click', function(){ toAuth('/login/'); });
    gp.querySelector('#amGpSign').addEventListener('click', function(){ toAuth('/signup/'); });
    gv.addEventListener('click', function(e){
      var c = e.target.closest && e.target.closest('.grade-card');
      if(c && GNM[c.dataset.grade]){ keepLy = true; try{ navigate('/' + GNM[c.dataset.grade] + '/modal/'); }finally{ keepLy = false; } }
      else if(e.target.closest && e.target.closest('.am-gv-chip')) toAuth('/login/');
    });
  }
  function fillGv(){
    var body = LY.gv.querySelector('#amGvBody'), src = D.getElementById('programs');
    if(body.dataset.done || !src) return;
    var head = src.querySelector('.section-head'), nodes = [].slice.call(src.querySelectorAll('.grades-row'));
    if(head){
      var h = head.cloneNode(true); h.classList.remove('section-reveal'); h.classList.add('in-view'); body.appendChild(h);
      var h2 = h.querySelector('h2'), hp = h.querySelector('p'); if(h2) h2.textContent = 'فيديوهات الصفوف'; if(hp) hp.textContent = 'اختار صفك وشوف فيديوهاته ومذكراته.';
    }
    var chip = el('button', 'am-gv-chip', ico('<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>') + '<span>عندك حساب؟ <b>سجّل دخولك</b> وافتح كل فيديوهات صفك</span>');
    chip.type = 'button'; body.appendChild(chip);
    nodes.forEach(function(n){
      var c = n.cloneNode(true); c.classList.remove('section-reveal'); c.classList.add('in-view');
      [].forEach.call(c.querySelectorAll('img'), function(i){ i.loading = 'eager'; });
      body.appendChild(c);
    });
    body.dataset.done = '1';
  }
  function openLayer(k){
    if(layer === k) return;
    closeYt(true);
    if(k === 'gv') fillGv();
    if(layer){ LY[layer].classList.remove('open'); history.replaceState({ am: k }, '', location.pathname + location.search); }
    else history.pushState({ am: k }, '', location.pathname + location.search);
    layer = k; LY[k].scrollTop = 0; LY[k].classList.add('open'); D.body.classList.add('am-ly-open');
    sync();
  }
  function closeLayer(quiet){
    if(!layer) return;
    LY[layer].classList.remove('open'); layer = null; D.body.classList.remove('am-ly-open');
    if(!quiet) sync();
  }

  /* ------------------------------------------------------------------ */
  /*  صفحة اليوتيوب                                                     */
  /* ------------------------------------------------------------------ */
  function buildYt(){
    yt = el('div'); yt.id = 'amYt'; yt.setAttribute('role', 'dialog'); yt.setAttribute('aria-label', 'قناة الهدى على يوتيوب');
    var ic = function(p){ return '<svg viewBox="0 0 24 24">' + p + '</svg>'; };
    yt.innerHTML =
      '<div class="am-yt-in">' +
        '<div class="am-yt-hero">' +
          '<div class="am-yt-play"><svg viewBox="0 0 92 64"><rect class="ring" x="4" y="4" width="84" height="56" rx="18" fill="none" stroke="#ff4a3d" stroke-width="3"/>' +
            '<rect x="4" y="4" width="84" height="56" rx="18" fill="#ff2b1f"/><path d="M37 19v26l24-13z" fill="#fff"/></svg></div>' +
          '<h2>قناة ميس نور الهدى</h2><div class="handle">@MsNour.Elhoda</div>' +
          '<p>شروحات اللغة العربية للمرحلة الإعدادية والثانوية، من معلمة لغة عربية بخبرة +8 سنين.</p>' +
          '<button type="button" class="am-yt-sub" id="amYtSub">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/></svg>' +
            'اشترك في القناة</button>' +
        '</div>' +
        '<div class="am-yt-grid">' +
          '<div class="am-yt-card"><div class="ci">' + ic('<path d="M3 10 12 5l9 5-9 5z"/><path d="M7 12.5V17c0 1 2.5 2 5 2s5-1 5-2v-4.5"/>') + '</div><b>إعدادي وثانوي</b><small>شروحات لكل صف دراسي.</small></div>' +
          '<div class="am-yt-card"><div class="ci">' + ic('<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/>') + '</div><b>من غير ضغط</b><small>بأسلوب بيخليك مرتاح ومن غير خوف من الغلط.</small></div>' +
          '<button type="button" class="am-yt-card" id="amYtVid" style="text-align:start;font-family:inherit;cursor:pointer"><div class="ci">' + ic('<path d="M4 9.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 5.5h16v4H4z"/><path d="M10.6 12.6v4.6l4-2.3z"/>') + '</div><b>فيديوهات المنصة</b><small>فيديوهات صفّك جوه قسم الفيديوهات.</small></button>' +
          '<div class="am-yt-card"><div class="ci">' + ic('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>') + '</div><b>فعّل الجرس</b><small>عشان يوصلك كل جديد أول بأول.</small></div>' +
        '</div>' +
        '<p class="am-yt-note">زر الاشتراك بيفتح قناة الهدى على يوتيوب.</p>' +
      '</div>';
    D.body.appendChild(yt);
    yt.querySelector('#amYtSub').addEventListener('click', function(){ openExternal(YT_SUB); });
    yt.querySelector('#amYtVid').addEventListener('click', function(){ onTap('videos'); });
  }
  function openYt(){
    if(ytOpen || !yt) return;
    ytOpen = true; yt.scrollTop = 0; yt.classList.add('open');
    history.pushState({ am: 'yt' }, '', location.pathname + location.search);
    sync();
  }
  function closeYt(silent){
    if(!ytOpen) return;
    ytOpen = false; yt.classList.remove('open');
    if(!silent) sync();
  }
  window.addEventListener('popstate', function(){
    if(ytOpen) closeYt(true);
    if(layer && !keepLy && !(history.state && history.state.am === layer)) closeLayer(true);
    sync();
  });

  /* ------------------------------------------------------------------ */
  /*  زر الرجوع في أندرويد                                              */
  /* ------------------------------------------------------------------ */
  var lastBack = 0;
  function setupBack(){
    var A = plug('App'); if(!A || !A.addListener) return;
    A.addListener('backButton', function(ev){
      if(ytOpen){ closeYt(); history.back(); return; }
      var busy = ['adminPage', 'authPage', 'buyPage', 'walletPage', 'secPage', 'xo', 'dashPage'].some(vis);
      var cm = D.getElementById('courseModal'); if(cm && cm.classList.contains('open')) busy = true;
      var np = D.getElementById('nPanel'); if(np && np.classList.contains('open')){ window.dispatchEvent(new CustomEvent('alhuda:close-notifs')); return; }
      if(layer && !busy){ closeLayer(); history.back(); return; }
      if(busy || location.pathname !== '/'){
        if(ev && ev.canGoBack) history.back(); else navigate('/');
        return;
      }
      if(Date.now() - lastBack < 2000){ A.exitApp(); }
      else{ lastBack = Date.now(); toast('اضغط رجوع مرة تانية للخروج'); }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  شاشة "النت قاطع"                                                  */
  /* ------------------------------------------------------------------ */
  var off, offShown = false, offTimer = 0;
  function buildOff(){
    off = el('div'); off.id = 'amOff'; off.setAttribute('role', 'alert');
    off.innerHTML =
      '<div class="am-off-ic"><svg viewBox="0 0 100 100">' +
        '<path class="w1" d="M12 40a54 54 0 0 1 76 0"/><path class="w2" d="M26 54a34 34 0 0 1 48 0"/><path class="w3" d="M40 68a14 14 0 0 1 20 0"/>' +
        '<circle class="dot" cx="50" cy="80" r="4"/><path class="slash" d="M18 14 82 90"/></svg></div>' +
      '<h2>النت فصل شوية 🌙</h2>' +
      '<p>مفيش اتصال بالإنترنت دلوقتي. اتأكد من الواي فاي أو بيانات الموبايل وارجع كمّل من حيث وقفت.</p>' +
      '<button type="button" class="am-off-btn" id="amOffRetry">حاول تاني</button>';
    D.body.appendChild(off);
    off.querySelector('#amOffRetry').addEventListener('click', function(){ probe(true); });
  }
  function showOff(){
    if(offShown) return; offShown = true; off.classList.add('show');
    clearInterval(offTimer); offTimer = setInterval(function(){ probe(false); }, 4000);
  }
  function hideOff(){
    if(!offShown) return; offShown = false; off.classList.remove('show'); clearInterval(offTimer);
    toast('رجع النت ✓');
  }
  function probe(manual){
    var b = off.querySelector('#amOffRetry');
    if(manual) b.classList.add('spin');
    var ctl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function(){ if(ctl) ctl.abort(); }, 5000);
    fetch('/robots.txt?_=' + Date.now(), { cache: 'no-store', signal: ctl && ctl.signal })
      .then(function(r){ clearTimeout(to); b.classList.remove('spin'); if(r && (r.ok || r.status === 404)) hideOff(); else if(!offShown) showOff(); })
      .catch(function(){ clearTimeout(to); b.classList.remove('spin'); showOff(); });
  }
  function setupNet(){
    window.addEventListener('offline', showOff);
    window.addEventListener('online', function(){ probe(false); });
    if(navigator.onLine === false) showOff();
  }

  /* ------------------------------------------------------------------ */
  /*  شريط الحالة (أندرويد)                                              */
  /* ------------------------------------------------------------------ */
  function setupStatusBar(){
    var S = plug('StatusBar'); if(!S) return;
    try{ S.setBackgroundColor({ color: '#1E3E38' }); S.setStyle({ style: 'DARK' }); }catch(e){}
  }

  /* ------------------------------------------------------------------ */
  /*  راحة الاستخدام: الشريط يتخبّى مع النزول، واهتزاز خفيف للأزرار        */
  /* ------------------------------------------------------------------ */
  function setupComfort(){
    var tucked = false;
    function set(v){ if(!bar || v === tucked) return; tucked = v; bar.classList.toggle('tuck', v); }
    D.addEventListener('scroll', function(e){
      var t = e.target, doc = (t === D || t === D.documentElement || t === D.body);
      var y = doc ? (window.pageYOffset || 0) : t.scrollTop;
      if(typeof y !== 'number') return;
      var dy = y - (t.__amY || 0); t.__amY = y;
      var atEnd = doc ? (y + window.innerHeight >= D.documentElement.scrollHeight - 6) : (y + t.clientHeight >= t.scrollHeight - 6);
      if(y < 40 || dy < -6 || atEnd) set(false); else if(dy > 10 && !kbOpen) set(true);
    }, { capture: true, passive: true });
    window.addEventListener('popstate', function(){ set(false); });
    D.addEventListener('click', function(e){
      if(navigator.vibrate && e.target.closest && e.target.closest('.btn-primary,.btn-light,.btn-ghost,.btn-outline-light,.grade-btn,.dp-link,.opt,.grade-card')) try{ navigator.vibrate(6); }catch(x){}
    }, true);
  }

  /* ------------------------------------------------------------------ */
  /*  تشغيل                                                              */
  /* ------------------------------------------------------------------ */
  buildSplash();

  function init(){
    buildOff(); setupNet();
    if(MOBILE){
      buildBar(); buildYt(); buildLayers(); setupBack(); setupStatusBar(); setupComfort();
      D.addEventListener('focusin', function(e){ if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)){ kbOpen = true; sync(); } });
      D.addEventListener('focusout', function(){ setTimeout(function(){ var a = D.activeElement; kbOpen = !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); sync(); }, 80); });
      new MutationObserver(sync).observe(D.body, { subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
      D.addEventListener('click', function(){ setTimeout(sync, 120); }, true);
      setInterval(sync, 900);
      sync();
    }
    window.AlHudaApp = { isApp: true, mobile: MOBILE, desktop: DESK, navigate: navigate, openExternal: openExternal, plug: plug };
    window.dispatchEvent(new CustomEvent('alhuda:app-ready'));
  }
  if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();


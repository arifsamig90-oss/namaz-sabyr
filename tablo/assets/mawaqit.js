/*!
 * mawaqit.js — табло в стиле Mawaqit (index.html).
 *
 * Для проверки можно «перемотать» время: index.html?at=2026-10-21T12:59:50
 * (часы пойдут с этого момента — удобно смотреть экраны азана и икамы).
 */
(function () {
  'use strict';
  var PT = window.PrayerTimes;
  var Store = window.NamazStore;
  var Sched = window.NamazSchedule;

  var $ = function (s) { return document.getElementById(s); };
  var MAIN_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var ARABIC = {
    fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر',
    maghrib: 'المغرب', isha: 'العشاء', jumuah: 'الجمعة'
  };
  var WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  /* ---------- время (с возможностью «перемотки» для проверки) ---------- */
  var offsetMs = 0;
  (function () {
    var m = /[?&]at=([^&]+)/.exec(location.search);
    if (!m) return;
    var t = new Date(decodeURIComponent(m[1]));
    if (!isNaN(t.getTime())) offsetMs = t.getTime() - (window.NamazTime ? NamazTime.now() : Date.now());
  })();
  function now() { return new Date((window.NamazTime ? NamazTime.now() : Date.now()) + offsetMs); }

  /* в приложении на ТВ — облегчённая отрисовка (см. html.lite в mawaqit.css) */
  var LITE = !!window.TabloNative;
  if (LITE) document.documentElement.classList.add('lite');

  var cfg = Store.load();
  var schedule = null, tomorrow = null, events = [], dayKey = '';
  var tiles = {};

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }

  /* Короткий отсчёт: 1:23:45 или 23:45 */
  function fmtLeft(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    return (h ? h + ':' + p2(m) : p2(m)) + ':' + p2(sec);
  }

  /* ---------- «выезжающие» цифры ---------- */
  function roll(el, text) {
    text = String(text);
    if (el._text === text) return;
    var cells = el.children;
    if (!el._text || el._text.length !== text.length) {
      el.innerHTML = '';
      for (var i = 0; i < text.length; i++) {
        var c = document.createElement('span');
        c.className = 'rc';
        c.innerHTML = '<span>' + esc(text[i]) + '</span>';
        el.appendChild(c);
      }
      el._text = text;
      return;
    }
    for (var j = 0; j < text.length; j++) {
      if (el._text[j] === text[j]) continue;
      var cell = cells[j];
      var olds = cell.querySelectorAll('span.out');
      for (var k = 0; k < olds.length; k++) olds[k].remove();
      var cur = cell.lastElementChild;
      if (cur) { cur.className = 'out'; scheduleRemove(cur); }
      var nu = document.createElement('span');
      nu.className = 'in';
      nu.textContent = text[j];
      cell.appendChild(nu);
    }
    el._text = text;
  }
  function scheduleRemove(node) {
    setTimeout(function () { if (node.parentNode) node.remove(); }, 600);
  }

  /* ---------- оформление ---------- */
  function applyTheme() {
    document.documentElement.dataset.accent = cfg.display.accent || 'emerald';
    document.documentElement.dataset.style = cfg.display.boardStyle === 'accent' ? 'accent' : 'mosque';
    var bg = cfg.display.bg || {};
    var NB = window.NamazBackgrounds;
    var uri = NB ? NB.uriFor(bg.mode, bg.image) : (bg.mode === 'image' ? bg.image : null);
    var el = $('bg');
    if (uri) {
      el.classList.add('has-image');
      el.style.setProperty('--bg-image', 'url("' + uri + '")');
      el.style.setProperty('--bg-dim', ((bg.dim != null ? bg.dim : 45) / 100).toFixed(2));
      el.style.setProperty('--bg-blur', (bg.blur || 0) + 'px');
    } else {
      el.classList.remove('has-image');
    }
    /* плитки, рамки и экраны азана подстраиваются под цвет фона */
    var mosque = document.documentElement.dataset.style === 'mosque';
    var seq = ++paletteSeq;
    if (NB && NB.paletteFor) NB.paletteFor(bg.mode, bg.image, function (p) { if (seq === paletteSeq) applyPalette(p, mosque); });
    else applyPalette(null, mosque);
  }
  var paletteSeq = 0;
  var PALETTE_VARS = {
    tile: '--tile', border: '--tile-border', panelA: '--panel-a', panelB: '--panel-b',
    solidA: '--panel-solid-a', solidB: '--panel-solid-b', glow: '--ov-glow', base: '--ov-base'
  };
  var ACCENT_VARS = { accent: '--accent', accent2: '--accent-2', ink: '--accent-ink' };
  function applyPalette(p, mosque) {
    var st = document.documentElement.style, k;
    for (k in PALETTE_VARS) { if (p) st.setProperty(PALETTE_VARS[k], p[k]); else st.removeProperty(PALETTE_VARS[k]); }
    for (k in ACCENT_VARS) { if (p && mosque) st.setProperty(ACCENT_VARS[k], p[k]); else st.removeProperty(ACCENT_VARS[k]); }
  }

  function renderStatic() {
    $('mosqueName').textContent = cfg.mosque.name || 'Мечеть';
    $('mosqueSub').textContent = [cfg.location.cityName ? 'г. ' + cfg.location.cityName : '', cfg.mosque.subtitle].filter(Boolean).join(' · ');
    var logo = $('logo');
    logo.classList.remove('own');
    if (cfg.mosque.logoData) {
      logo.innerHTML = '<img alt="" src="' + esc(cfg.mosque.logoData) + '">';
    } else {
      /* значок мечети: файл assets/logo.png рядом с табло (если положен) */
      logo.textContent = cfg.mosque.logoEmoji || '🕌';
      var img = new Image();
      img.alt = '';
      img.onload = function () {
        if (cfg.mosque.logoData) return;
        logo.innerHTML = '';
        logo.appendChild(img);
        logo.classList.toggle('own', img.src.indexOf('logo.png') !== -1);
      };
      img.onerror = function () { if (img.src.indexOf('emblem.svg') === -1) img.src = 'assets/emblem.svg'; };
      img.src = 'assets/logo.png';
    }
    $('hijriBlock').style.visibility = cfg.display.showHijri ? '' : 'hidden';
    $('ss').hidden = !cfg.display.showSeconds;
    document.title = (cfg.mosque.name || 'Табло намаза') + ' — табло намаза';
  }

  function buildTicker() {
    var items = cfg.display.announcements || [];
    var tk = $('ticker');
    if (!items.length) { tk.hidden = true; $('tickerTrack').innerHTML = ''; return; }
    tk.hidden = false;
    tk.style.setProperty('--ticker-dur', { slow: '70s', normal: '45s', fast: '28s' }[cfg.display.tickerSpeed] || '45s');
    var inner = items.map(function (t) { return '<span class="mw-ticker-item">' + esc(t) + '</span>'; }).join('');
    $('tickerTrack').innerHTML = '<div class="mw-ticker-half">' + inner + '</div><div class="mw-ticker-half" aria-hidden="true">' + inner + '</div>';
    if (document.documentElement.classList.contains('lite')) startLiteTicker();
  }

  /* На ТВ строка движется из скрипта ~12 раз в секунду, а не CSS-анимацией
     на 60 кадрах: слабые приставки перерисовывают экран в 5 раз реже
     (строка идёт медленно, ~3 пикселя за шаг — на глаз почти не заметно). */
  var liteTimer = null, liteStart = 0;
  function startLiteTicker() {
    if (liteTimer) return;
    liteStart = Date.now();
    liteTimer = setInterval(function () {
      var track = $('tickerTrack');
      var half = track.firstChild ? track.firstChild.offsetWidth : 0;
      if (!half || $('ticker').hidden) return;
      var dur = { slow: 70, normal: 45, fast: 28 }[cfg.display.tickerSpeed] || 45;
      var x = ((Date.now() - liteStart) / (dur * 1000) * half) % half;
      track.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)';
    }, 80);
  }

  /* ---------- расписание дня ---------- */
  function prayerOf(list, id) {
    if (!list || !list.ok) return null;
    for (var i = 0; i < list.prayers.length; i++) if (list.prayers[i].id === id) return list.prayers[i];
    return null;
  }

  function recompute() {
    var n = now();
    schedule = Sched.buildDay(cfg, n);
    tomorrow = Sched.buildDay(cfg, PT.addDays(n, 1));
    events = PT.collectEvents(schedule, tomorrow).filter(function (e) {
      return e.kind !== 'jumuah' || n.getDay() === 5; /* джума — только по пятницам */
    });
    if (schedule && schedule.read && !schedule.readHidden) {
      events.push({ at: schedule.read.getTime(), kind: 'read', id: 'read', name: 'Читается в мечетях' });
    }
    if (tomorrow && tomorrow.read && !tomorrow.readHidden) {
      events.push({ at: tomorrow.read.getTime(), kind: 'read', id: 'read', name: 'Читается в мечетях', tomorrow: true });
    }
    events.sort(function (a, b) { return a.at - b.at; });
    dayKey = PT.dateKey(n);

    $('gWeekday').textContent = WEEKDAYS[n.getDay()];
    $('gDate').textContent = n.getDate() + ' ' + MONTHS[n.getMonth()] + ' ' + n.getFullYear();
    $('hDate').textContent = PT.hijriText(n, cfg.calc.hijriOffset);
    buildTiles();
    fillBoxes();
  }

  function buildTiles() {
    var box = $('prayers');
    box.innerHTML = '';
    tiles = {};
    if (!schedule || !schedule.ok) {
      box.innerHTML = '<div class="pt" style="grid-column:1/-1;padding:2em">Расписание не построено — откройте <a href="admin.html" style="color:inherit">Настройки</a>.</div>';
      return;
    }
    var friday = now().getDay() === 5 && cfg.jumuah.enabled && schedule.jumuah.length;
    MAIN_IDS.forEach(function (id) {
      var p = prayerOf(schedule, id);
      if (!p) return;
      var el = document.createElement('article');
      el.className = 'pt';
      el.dataset.id = id;
      var name = p.name, ar = ARABIC[id];
      if (id === 'fajr' && Sched.tyumenActive(cfg)) name = 'Фаджр';
      el.innerHTML =
        '<span class="pt-tag"></span>' +
        '<div class="pt-head"><div class="pt-ru">' + esc(name) + '</div><div class="pt-ar">' + ar + '</div></div>' +
        '<div class="pt-time roll"></div>' +
        '<div class="pt-iq"></div>';
      box.appendChild(el);
      tiles[id] = el;
      roll(el.querySelector('.pt-time'), PT.fmtHM(p.adhan));
      el.querySelector('.pt-iq').innerHTML = p.iqama
        ? '<small>Икама</small>' + PT.fmtHM(p.iqama)
        : '&nbsp;';
      if (friday && id === 'dhuhr') el.querySelector('.pt-tag').textContent = 'Пятница';
    });
  }

  function fillBoxes() {
    var ok = schedule && schedule.ok;
    var sr = prayerOf(schedule, 'sunrise');
    $('boxSunrise').hidden = !(ok && cfg.display.showSunrise && sr);
    if (sr) $('tSunrise').textContent = PT.fmtHM(sr.adhan);

    var showRead = ok && cfg.reading && cfg.reading.show;
    $('boxRead').hidden = !showRead;
    if (showRead) {
      if (schedule.readHidden) {
        $('tRead').textContent = '—';
        $('nRead').textContent = 'в Рамадан не читается';
      } else {
        $('tRead').textContent = schedule.read ? PT.fmtHM(schedule.read) : '--:--';
        var fj = prayerOf(schedule, 'fajr');
        $('nRead').textContent = schedule.fajrByRead && fj && fj.iqama
          ? 'азан Фаджра · икама ' + PT.fmtHM(fj.iqama)
          : (schedule.readNote || '');
      }
    }

    var jm = ok && cfg.jumuah.enabled && schedule.jumuah.length;
    $('boxJumuah').hidden = !jm;
    if (jm) {
      $('tJumuah').innerHTML = schedule.jumuah.map(function (j) {
        return '<div><small>' + esc(j.label) + '</small>' + PT.fmtHM(j.time) + '</div>';
      }).join('');
      $('boxJumuah').classList.toggle('today', now().getDay() === 5);
    }

    $('boxZenith').hidden = !(ok && cfg.display.showZenith && schedule.zenith);
    if (schedule && schedule.zenith) $('tZenith').textContent = PT.fmtHM(schedule.zenith);
  }

  /* ---------- состояние плиток и отсчёт ---------- */
  function nextAdhan(nowMs) {
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.at > nowMs && e.kind === 'adhan' && e.id !== 'sunrise') return e;
    }
    return null;
  }

  function currentPrayer(nowMs) {
    /* намаз, у которого прошёл азан, но ещё не было икамы */
    for (var i = 0; i < MAIN_IDS.length; i++) {
      var p = prayerOf(schedule, MAIN_IDS[i]);
      if (p && p.adhan && p.iqama && nowMs >= p.adhan.getTime() && nowMs < p.iqama.getTime()) return p;
    }
    return null;
  }

  function updateTiles(nowMs) {
    var na = nextAdhan(nowMs);
    var cur = currentPrayer(nowMs);
    MAIN_IDS.forEach(function (id) {
      var el = tiles[id];
      if (!el) return;
      var p = prayerOf(schedule, id);
      var isNext = na && na.id === id;
      var tag = el.querySelector('.pt-tag');
      el.classList.toggle('next', !!isNext && !cur);
      el.classList.toggle('now', !!cur && cur.id === id);
      el.classList.toggle('passed', !isNext && !(cur && cur.id === id) && p && p.adhan && nowMs >= p.adhan.getTime());
      /* после Иши показываем завтрашний Фаджр */
      if (id === 'fajr') {
        var src = (na && na.id === 'fajr' && na.tomorrow) ? prayerOf(tomorrow, 'fajr') : p;
        if (src) {
          roll(el.querySelector('.pt-time'), PT.fmtHM(src.adhan));
          el.querySelector('.pt-iq').innerHTML = src.iqama ? '<small>Икама</small>' + PT.fmtHM(src.iqama) : '&nbsp;';
        }
        if (!(now().getDay() === 5)) tag.textContent = (na && na.tomorrow && na.id === 'fajr') ? 'Завтра' : '';
      }
    });

    var rd = $('boxRead');
    var nxRead = schedule && schedule.read && !schedule.readHidden && nowMs < schedule.read.getTime();
    rd.classList.toggle('passed', !!(schedule && schedule.read && !schedule.readHidden && !nxRead));
    rd.classList.toggle('next', !!nxRead && schedule.read.getTime() - nowMs < 3 * 3600000);
    if (schedule && schedule.zenith) $('boxZenith').classList.toggle('passed', nowMs >= schedule.zenith.getTime());
    var sr = prayerOf(schedule, 'sunrise');
    if (sr) $('boxSunrise').classList.toggle('passed', nowMs >= sr.adhan.getTime());
  }

  function describe(e) {
    if (e.kind === 'iqama') return 'Икама ' + e.name + ' через';
    if (e.kind === 'read') return 'Чтение в мечетях через';
    if (e.kind === 'jumuah') return 'Джума · ' + e.name + ' через';
    if (e.id === 'sunrise') return 'Восход через';
    return e.name + ' через';
  }

  function updateNext(nowMs) {
    var e = PT.nextEvent(events, nowMs);
    if (!e) { $('nextLabel').textContent = '—'; roll($('nextCount'), ''); return; }
    $('nextLabel').textContent = describe(e);
    roll($('nextCount'), fmtLeft(e.at - nowMs));
  }

  /* ---------- всплывающее окно и полноэкранные экраны ---------- */
  function updatePopup(nowMs) {
    var pop = $('popup');
    var sc = cfg.screens || {};
    var show = false;
    if (schedule && schedule.read && !schedule.readHidden && sc.readWarn > 0) {
      var left = schedule.read.getTime() - nowMs;
      if (left > 0 && left <= sc.readWarn * 60000) {
        show = true;
        $('ppTime').textContent = PT.fmtHM(schedule.read);
        $('ppCount').textContent = 'через ' + fmtLeft(left);
      }
    }
    pop.classList.toggle('show', show && !overlayType);
  }

  function screenState(nowMs) {
    var sc = cfg.screens || {};
    if (!schedule || !schedule.ok) return null;
    /* Отдельный экран чтения — только когда оно не служит азаном Фаджра */
    if (sc.read && schedule.read && !schedule.readHidden && !schedule.fajrByRead) {
      var r = schedule.read.getTime();
      if (nowMs >= r && nowMs < r + sc.readSec * 1000) return { type: 'read' };
    }
    for (var i = 0; i < MAIN_IDS.length; i++) {
      var p = prayerOf(schedule, MAIN_IDS[i]);
      if (!p || !p.adhan) continue;
      var a = (p.mosqueAdhan || p.adhan).getTime(), q = p.iqama ? p.iqama.getTime() : null;
      if (sc.adhan && nowMs >= a && nowMs < a + sc.adhanSec * 1000 && (!q || nowMs < q)) return { type: 'adhan', p: p };
      if (sc.iqama && q && nowMs >= a && nowMs < q) return { type: 'iqama', p: p, left: q - nowMs };
      if (sc.prayer && q && nowMs >= q && nowMs < q + sc.prayerMin * 60000) return { type: 'prayer', p: p };
    }
    return null;
  }

  var overlayType = '';
  function updateOverlay(n, nowMs) {
    var st = dismissed && dismissed.until > nowMs ? null : screenState(nowMs);
    var ov = $('overlay');
    var key = st ? st.type + (st.p ? st.p.id : '') : '';
    if (!st) {
      if (overlayType) { ov.hidden = true; overlayType = ''; }
      return;
    }
    if (key !== overlayType) {
      overlayType = key;
      ov.className = 'mw-overlay ' + st.type;
      ov.hidden = false;
      $('ovBig')._text = null;
      $('ovBig').innerHTML = '';
      if (st.type === 'adhan') {
        $('ovAr').textContent = 'الأذان';
        $('ovTitle').textContent = st.p.mosqueAdhan ? 'Читается в мечетях' : 'Азан';
        $('ovName').textContent = st.p.mosqueAdhan
          ? 'Азан Фаджра · ' + PT.fmtHM(st.p.mosqueAdhan)
          : st.p.name + ' · ' + PT.fmtHM(st.p.adhan);
        $('ovNote').textContent = st.p.iqama ? 'Икама в ' + PT.fmtHM(st.p.iqama) : '';
      } else if (st.type === 'iqama') {
        $('ovAr').textContent = 'الإقامة';
        $('ovTitle').textContent = 'До икамы';
        $('ovName').textContent = st.p.name;
        $('ovNote').textContent = st.p.mosqueAdhan ? 'Время сунны · пожалуйста, выключите телефоны' : 'Пожалуйста, выключите телефоны';
      } else if (st.type === 'prayer') {
        $('ovAr').textContent = 'استووا واعتدلوا';
        $('ovTitle').textContent = 'Идёт намаз';
        $('ovName').textContent = '';
        $('ovNote').textContent = 'Выровняйте ряды · выключите телефоны';
      } else if (st.type === 'read') {
        $('ovAr').textContent = '';
        $('ovTitle').textContent = 'Читается в мечетях';
        $('ovName').textContent = PT.fmtHM(schedule.read);
        $('ovNote').textContent = schedule.readNote || '';
      }
    }
    roll($('ovClock'), PT.fmtHM(n) + ':' + p2(n.getSeconds()));
    if (st.type === 'iqama') {
      roll($('ovBig'), fmtLeft(st.left));
      ov.classList.toggle('soon', st.left <= 60000);
    }
  }

  /* Клик или Esc закрывает полноэкранный экран до конца текущего события */
  var dismissed = null;
  function dismissOverlay() {
    if (!overlayType) return;
    dismissed = { until: now().getTime() + 15 * 60000 };
    $('overlay').hidden = true;
    overlayType = '';
  }

  /* ---------- главный цикл ---------- */
  function tick() {
    var n = now();
    var nowMs = n.getTime();
    if (PT.dateKey(n) !== dayKey) recompute();
    roll($('hh'), p2(n.getHours()));
    roll($('mm'), p2(n.getMinutes()));
    if (cfg.display.showSeconds) roll($('ss'), p2(n.getSeconds()));
    if (LITE) $('clock').classList.toggle('dim', n.getSeconds() % 2 === 1); /* мигание двоеточия без CSS-анимации */
    updateTiles(nowMs);
    updateNext(nowMs);
    updateOverlay(n, nowMs);
    updatePopup(nowMs);
  }

  /* настройки из облака: применяем, но своё подключение к облаку табло не меняет */
  function onCloudConfig(json) {
    try {
      var raw = JSON.parse(json);
      raw.cloud = cfg.cloud;
      Store.applyExternal(raw);
    } catch (e) { if (window.console) console.error(e); }
  }

  function rebuild() {
    if (window.NamazWeather) window.NamazWeather.start($('weather'), cfg);
    if (window.NamazCloud && !Store.remote) window.NamazCloud.watch(cfg, onCloudConfig);
    applyTheme();
    renderStatic();
    buildTicker();
    recompute();
    tick();
  }

  /* ---------- управление ---------- */
  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
  }
  $('btnFull').addEventListener('click', toggleFull);
  $('overlay').addEventListener('click', dismissOverlay);
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if (k === 'f' || k === 'а') toggleFull();
    if (k === 'escape') dismissOverlay();
  });

  var idleTimer = null;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { document.body.classList.add('idle'); }, 3000);
  }
  ['mousemove', 'touchstart', 'keydown'].forEach(function (ev) { document.addEventListener(ev, wake, { passive: true }); });
  wake();

  window.addEventListener('storage', function (e) {
    if (e.key === Store.KEY) { cfg = Store.load(); rebuild(); }
  });
  /* настройки пришли с телефона (Wi‑Fi) или из облака */
  window.addEventListener('namaz-config', function () { cfg = Store.load(); rebuild(); });
  /* приставка: держим у приложения копию настроек — её отдаёт страница для телефона */
  if (window.TabloNative && !Store.remote) Store.save(cfg);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) recompute();
  });

  rebuild();
  /* точный ход часов: каждый тик — в начало секунды, без отставания (assets/clock-tick.js) */
  window.NamazTick(tick);
})();

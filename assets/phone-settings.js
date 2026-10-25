/*!
 * phone-settings.js — разделы «Настройки» и «Кибла» приложения для телефона.
 *
 * Настройки расписания хранятся так же, как у табло (NamazStore), поэтому
 * город, метод, икама, джума и «Читается в мечетях» считаются одним движком.
 * Оформление телефона (тема, цвет, размер текста) — отдельно, только здесь.
 */
(function () {
  'use strict';
  var App = window.NamazPhoneApp;
  var PT = window.PrayerTimes;
  var Store = window.NamazStore;
  var NC = window.NamazCities;
  var CITIES = window.CITIES || [];
  if (!App) return;
  var Native = App.native;

  var $ = function (s) { return document.getElementById(s); };
  var NAMES = { fajr: 'Фаджр', sunrise: 'Восход', dhuhr: 'Зухр', asr: 'Аср', maghrib: 'Магриб', isha: 'Иша' };
  var IQ_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var ADJ_IDS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function num(v, d) { var x = parseFloat(v); return isFinite(x) ? x : d; }

  /* изменить настройки расписания: fn получает копию и правит её */
  function edit(fn) {
    var c = clone(App.cfg());
    fn(c);
    App.save(c);
    render();
  }

  /* ================= оформление (только телефон) ================= */
  var UKEY = 'namazPhone.ui.v1';
  /* Темы. Контраст проверен по WCAG: основной текст ≥ 14:1, второстепенный и акцент ≥ 5.7:1.
     t — фон, b2 — фон полей, x — текст, m — второстепенный текст, a — акцент, g — свечение сверху. */
  var THEMES = [
    { id: 'night',    name: 'Ночь',            dark: true,  t: '#05070f', b2: '#11141f', x: '#f5f3ee', m: '#8e93a6', a: '#e3bd62', g: 'rgba(227,189,98,.16)', card: .055 },
    { id: 'mosque',   name: 'Мечеть',          dark: true,  t: '#071029', b2: '#0b1a45', x: '#f4f1e8', m: '#a9b2cc', a: '#e3bd62', g: '#1b2f72' },
    { id: 'emerald',  name: 'Изумруд',         dark: true,  t: '#031510', b2: '#0b2e23', x: '#f1f5ef', m: '#9fb8ac', a: '#e0bb63', g: '#145c45' },
    { id: 'indigo',   name: 'Индиго',          dark: true,  t: '#0a0920', b2: '#1b1852', x: '#f3f2fb', m: '#a7a6cf', a: '#e6c27a', g: '#2d2a8a' },
    { id: 'darkgold', name: 'Тёмное золото',   dark: true,  t: '#0f0b05', b2: '#261c0c', x: '#f7eedb', m: '#b8a98a', a: '#eac36b', g: 'rgba(234,195,107,.24)' },
    { id: 'graphite', name: 'Графит',          dark: true,  t: '#101113', b2: '#1d1f24', x: '#f2f2f3', m: '#a0a3ab', a: '#e3bd62', g: '#2a2d35' },
    { id: 'burgundy', name: 'Бордо',           dark: true,  t: '#14060a', b2: '#33101a', x: '#f8eeee', m: '#c2a4a9', a: '#ebbf74', g: '#5a1a2a' },
    { id: 'ivory',    name: 'Слоновая кость',  dark: false, t: '#f7f3ea', b2: '#ffffff', x: '#14161c', m: '#555a66', a: '#7d5a0f', g: 'rgba(125,90,15,.10)' },
    { id: 'white',    name: 'Белая',           dark: false, t: '#f2f2f7', b2: '#ffffff', x: '#111216', m: '#55565e', a: '#0b3d91', g: 'rgba(11,61,145,.08)' },
    { id: 'mint',     name: 'Мята',            dark: false, t: '#ecf5f0', b2: '#ffffff', x: '#0e1d16', m: '#46584f', a: '#0a6047', g: 'rgba(10,96,71,.10)' },
    { id: 'sky',      name: 'Небо',            dark: false, t: '#edf2fa', b2: '#ffffff', x: '#0d1830', m: '#46526b', a: '#1a46b8', g: 'rgba(26,70,184,.10)' }
  ];
  var ACCENTS = [
    { id: 'gold', c: '#e3bd62' }, { id: 'emerald', c: '#2fbf8f' }, { id: 'teal', c: '#2ab7c9' },
    { id: 'sky', c: '#4aa3ff' }, { id: 'violet', c: '#a78bfa' }, { id: 'rose', c: '#f07193' }, { id: 'amber', c: '#f59e0b' }
  ];
  var IOS = document.documentElement.classList.contains('ios');
  function theme(id) { return THEMES.filter(function (t) { return t.id === id; })[0]; }
  function loadUi() {
    var u = null;
    try { u = JSON.parse(localStorage.getItem(UKEY) || 'null'); } catch (e) { u = null; }
    u = u || {};
    var dark = theme(u.dark), light = theme(u.light);
    return {
      theme: ['auto', 'dark', 'light'].indexOf(u.theme) !== -1 ? u.theme : (IOS ? 'auto' : 'dark'),
      dark: dark && dark.dark ? dark.id : (IOS ? 'night' : 'mosque'),
      light: light && !light.dark ? light.id : 'ivory',
      /* 'theme' — цвет акцента из темы; раньше по умолчанию было золото — это то же самое */
      accent: u.accent && u.accent !== 'gold' && ACCENTS.some(function (a) { return a.id === u.accent; }) ? u.accent : 'theme',
      size: [1, 1.12, 1.25].indexOf(+u.size) !== -1 ? +u.size : 1
    };
  }
  var ui = loadUi();
  var darkMq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function current() {
    var mode = ui.theme === 'auto' ? (darkMq && !darkMq.matches ? 'light' : 'dark') : ui.theme;
    return theme(mode === 'light' ? ui.light : ui.dark);
  }
  function applyUi() {
    var t = current(), root = document.documentElement, st = root.style;
    root.dataset.theme = t.dark ? 'dark' : 'light';
    root.dataset.pal = t.id;
    var acc = t.a;
    if (ui.accent !== 'theme') {
      var pick = ACCENTS.filter(function (a) { return a.id === ui.accent; })[0];
      /* на светлом фоне светлый акцент не читается — берём тот же цвет темнее */
      if (pick) acc = t.dark ? pick.c : darker(pick.c, 0.62);
    }
    var vars = t.dark ? {
      '--bg': t.t, '--bg-2': t.b2, '--card': 'rgba(255,255,255,' + (t.card || .06) + ')',
      '--card-border': 'rgba(255,255,255,.10)', '--hair': 'rgba(255,255,255,.10)',
      '--next-bg': '#fbf7ec', '--next-ink': '#0b1533', '--next-sub': '#3a4566', '--next-ar': darker(acc, 0.72),
      '--on-gold': '#1b1606', '--switch-off': 'rgba(255,255,255,.22)'
    } : {
      '--bg': t.t, '--bg-2': t.b2, '--card': '#ffffff',
      '--card-border': 'rgba(0,0,0,.09)', '--hair': 'rgba(0,0,0,.12)',
      '--next-bg': t.x, '--next-ink': '#ffffff', '--next-sub': 'rgba(255,255,255,.78)', '--next-ar': '#f0d28a',
      '--on-gold': '#ffffff', '--switch-off': 'rgba(0,0,0,.2)'
    };
    vars['--text'] = t.x;
    vars['--muted'] = t.m;
    vars['--gold'] = acc;
    vars['--gold-soft'] = hexA(acc, t.dark ? 0.16 : 0.12);
    vars['--glow'] = t.g;
    vars['--tabs-bg'] = hexA(t.t, 0.94);
    for (var k in vars) st.setProperty(k, vars[k]);
    st.colorScheme = t.dark ? 'dark' : 'light';
    document.body.style.zoom = ui.size === 1 ? '' : String(ui.size);
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', t.t);
  }
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function darker(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round((n >> 16) * k), g = Math.round((n >> 8 & 255) * k), b = Math.round((n & 255) * k);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function saveUi() {
    try { localStorage.setItem(UKEY, JSON.stringify(ui)); } catch (e) { /* не критично */ }
    applyUi();
    renderUi();
  }
  if (darkMq && darkMq.addEventListener) darkMq.addEventListener('change', function () { if (ui.theme === 'auto') { applyUi(); renderUi(); } });

  function setSeg(id, value) {
    var b = $(id).querySelectorAll('button');
    for (var i = 0; i < b.length; i++) b[i].classList.toggle('on', b[i].dataset.v === String(value));
  }
  /* плитка темы — маленькое превью: фон, акцентная полоска и строки текста */
  function tile(t, on) {
    return '<button type="button" class="ph-theme' + (on ? ' on' : '') + '" data-v="' + t.id + '" aria-label="' + t.name + '">' +
      '<span class="sw" style="background:radial-gradient(120% 70% at 50% -20%,' + t.g + ',transparent 70%),' + t.t + '">' +
      '<i style="background:' + t.a + '"></i><i style="background:' + t.x + '"></i><i style="background:' + t.m + '"></i></span>' +
      '<span class="nm">' + t.name + '</span></button>';
  }
  function renderUi() {
    setSeg('themeSeg', ui.theme);
    setSeg('sizeSeg', ui.size);
    $('darkThemes').innerHTML = THEMES.filter(function (t) { return t.dark; }).map(function (t) { return tile(t, t.id === ui.dark); }).join('');
    $('lightThemes').innerHTML = THEMES.filter(function (t) { return !t.dark; }).map(function (t) { return tile(t, t.id === ui.light); }).join('');
    var th = current();
    $('accentSeg').innerHTML = '<button type="button" data-v="theme" class="' + (ui.accent === 'theme' ? 'on' : '') +
      '" style="background:' + th.a + '" aria-label="Как в теме" title="Как в теме"></button>' +
      ACCENTS.map(function (a) {
        return '<button type="button" data-v="' + a.id + '" class="' + (a.id === ui.accent ? 'on' : '') +
          '" style="background:' + (th.dark ? a.c : darker(a.c, 0.62)) + '" aria-label="' + a.id + '"></button>';
      }).join('');
  }
  $('themeSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { ui.theme = b.dataset.v; saveUi(); } });
  $('darkThemes').addEventListener('click', function (e) {
    var b = e.target.closest('.ph-theme'); if (!b) return;
    ui.dark = b.dataset.v;
    if (ui.theme === 'light') ui.theme = 'dark'; // выбрали тёмную — показываем её
    saveUi();
  });
  $('lightThemes').addEventListener('click', function (e) {
    var b = e.target.closest('.ph-theme'); if (!b) return;
    ui.light = b.dataset.v;
    if (ui.theme === 'dark') ui.theme = 'light';
    saveUi();
  });
  $('sizeSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { ui.size = +b.dataset.v; saveUi(); } });
  $('accentSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { ui.accent = b.dataset.v; saveUi(); } });

  /* ================= город ================= */
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е'); }
  function renderCities() {
    var cfg = App.cfg();
    var q = norm($('citySearch').value.trim());
    var list = CITIES.filter(function (c) { return !q || norm(c.name).indexOf(q) !== -1 || norm(c.region).indexOf(q) !== -1; });
    if (!q) list = list.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'ru'); });
    $('cityList').innerHTML = list.slice(0, q ? 60 : 200).map(function (c) {
      return '<button type="button" class="ph-city' + (c.id === cfg.location.cityId ? ' on' : '') + '" data-id="' + c.id + '">' +
        '<span>' + esc(c.name) + '</span><small>' + esc(c.region) + '</small></button>';
    }).join('') || '<p class="ph-hint">Не нашли — определите место по GPS или введите координаты.</p>';
  }

  /* город выбран: координаты + метод и мазхаб местного муфтията */
  function chooseCity(c, lat, lng, name) {
    var d = NC ? NC.defaultsFor(c) : null;
    edit(function (x) {
      x.location.cityId = (c && lat == null) ? c.id : '__custom';
      x.location.cityName = name || (c && c.name) || 'Моё место';
      x.location.lat = lat != null ? lat : c.lat;
      x.location.lng = lng != null ? lng : c.lng;
      if (d) { x.calc.method = d.method; x.calc.asr = d.asr; }
      /* «Читается в мечетях» — правило мечетей Тюмени; в других городах выключаем (можно включить) */
      x.reading.show = x.location.cityId === 'tyumen';
      if (x.location.cityId === 'tyumen') x.tyumen.useData = true;
    });
    $('citySearch').value = '';
    renderCities();
    if (d) {
      $('gpsStatus').textContent = 'Метод: ' + PT.METHODS[d.method].name + '; Аср: ' + (d.asr === 'hanafi' ? 'Ханафи' : 'Шафии') +
        ' — как принято (' + d.authority + ').' + (d.verified ? '' : ' Опубликованных углов муфтията нет — сверьте с местным расписанием и при необходимости задайте поправки.');
    }
  }
  $('citySearch').addEventListener('input', renderCities);
  $('cityList').addEventListener('click', function (e) {
    var b = e.target.closest('.ph-city');
    if (b && NC) chooseCity(NC.find(b.dataset.id));
  });
  $('cApply').addEventListener('click', function () {
    var lat = num($('cLat').value, NaN), lng = num($('cLng').value, NaN);
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      $('gpsStatus').textContent = 'Проверьте координаты: широта от −90 до 90, долгота от −180 до 180.';
      return;
    }
    var near = NC ? NC.nearest(lat, lng) : null;
    chooseCity(near && near.city, lat, lng, $('cName').value.trim() || 'Моё место');
  });

  /* GPS — через приложение (в браузере — navigator.geolocation) */
  function onLocation(lat, lng) {
    lat = +(+lat).toFixed(4); lng = +(+lng).toFixed(4);
    var near = NC ? NC.nearest(lat, lng) : null;
    if (near && near.km < 40) chooseCity(near.city);
    else chooseCity(near && near.city, lat, lng, 'Моё место');
    $('gpsStatus').textContent = 'Определено: ' + lat + ', ' + lng +
      (near && near.km < 40 ? ' (' + near.city.name + ')' : '') + '. ' + $('gpsStatus').textContent;
  }
  window.NamazPhoneLocation = onLocation;
  window.NamazPhoneLocationError = function (msg) { $('gpsStatus').textContent = msg || 'Не удалось определить место.'; };
  $('gpsBtn').addEventListener('click', function () {
    $('gpsStatus').textContent = 'Определяем…';
    if (Native && Native.requestLocation) { Native.requestLocation(); return; }
    if (!navigator.geolocation) { window.NamazPhoneLocationError('Геолокация недоступна — выберите город из списка.'); return; }
    navigator.geolocation.getCurrentPosition(function (p) { onLocation(p.coords.latitude, p.coords.longitude); },
      function () { window.NamazPhoneLocationError('Не удалось определить — выберите город из списка.'); },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  });
  $('tyumenData').addEventListener('change', function (e) { var v = e.target.checked; edit(function (x) { x.tyumen.useData = v; }); });

  /* ================= расчёт ================= */
  var sel = $('method');
  Object.keys(PT.METHODS).forEach(function (k) {
    if (k === 'custom') return;
    var o = document.createElement('option');
    o.value = k; o.textContent = PT.METHODS[k].name;
    sel.appendChild(o);
  });
  sel.addEventListener('change', function () { var v = sel.value; edit(function (x) { x.calc.method = v; }); });
  $('asrSeg').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    edit(function (x) { x.calc.asr = b.dataset.v; });
  });
  $('highLats').addEventListener('change', function (e) { var v = e.target.value; edit(function (x) { x.calc.highLats = v; }); });
  $('hijriOff').addEventListener('change', function (e) { var v = +e.target.value; edit(function (x) { x.calc.hijriOffset = v; }); });
  $('adjGrid').innerHTML = ADJ_IDS.map(function (id) {
    return '<label>' + NAMES[id] + '<input class="ph-input" type="number" min="-60" max="60" step="1" data-adj="' + id + '"></label>';
  }).join('');
  $('adjGrid').addEventListener('change', function (e) {
    var id = e.target.dataset.adj; if (!id) return;
    var v = Math.max(-60, Math.min(60, Math.round(num(e.target.value, 0))));
    edit(function (x) { x.calc.adjustments[id] = v; });
  });

  /* ================= мечеть, икама, джума ================= */
  $('mName').addEventListener('change', function (e) {
    var v = e.target.value.trim().slice(0, 120);
    edit(function (x) { x.mosque.name = v || 'Мечеть'; });
  });
  $('iqGrid').innerHTML = IQ_IDS.map(function (id) {
    return '<label>' + NAMES[id] + '<input class="ph-input" type="number" min="0" max="180" step="1" data-iq="' + id + '"></label>';
  }).join('');
  $('iqGrid').addEventListener('change', function (e) {
    var id = e.target.dataset.iq; if (!id) return;
    var v = Math.max(0, Math.min(180, Math.round(num(e.target.value, 0))));
    edit(function (x) { x.iqama[id].mode = 'after'; x.iqama[id].offset = v; });
  });
  $('jOn').addEventListener('change', function (e) { var v = e.target.checked; edit(function (x) { x.jumuah.enabled = v; }); });
  function renderJumuah() {
    var j = App.cfg().jumuah;
    $('jList').innerHTML = j.times.map(function (t, i) {
      return '<div class="ph-jrow"><label class="ph-small">Название<input class="ph-input" data-j="' + i + '" data-f="label" value="' + esc(t.label) + '" maxlength="60"></label>' +
        '<label class="ph-small">Время<input class="ph-input" type="time" data-j="' + i + '" data-f="time" value="' + esc(t.time) + '"></label>' +
        '<button type="button" class="ph-x" data-jdel="' + i + '" aria-label="Удалить">×</button></div>';
    }).join('');
    $('jAdd').hidden = j.times.length >= 6;
  }
  $('jList').addEventListener('change', function (e) {
    var i = e.target.dataset.j, f = e.target.dataset.f; if (i == null) return;
    var v = e.target.value.trim();
    if (f === 'time' && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(v)) return;
    edit(function (x) { x.jumuah.times[+i][f] = v || (f === 'label' ? 'Хутба' : x.jumuah.times[+i][f]); });
  });
  $('jList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-jdel]'); if (!b) return;
    edit(function (x) { x.jumuah.times.splice(+b.dataset.jdel, 1); });
  });
  $('jAdd').addEventListener('click', function () {
    edit(function (x) { x.jumuah.times.push({ label: (x.jumuah.times.length + 1) + '-я хутба', time: '14:00' }); });
  });

  /* ================= «Читается в мечетях» ================= */
  function bindCheck(id, fn) { $(id).addEventListener('change', function (e) { var v = e.target.checked; edit(function (x) { fn(x, v); }); }); }
  bindCheck('rShow', function (x, v) { x.reading.show = v; });
  bindCheck('rByRead', function (x, v) { x.reading.fajrByRead = v; });
  bindCheck('rRamadan', function (x, v) { x.reading.hideInRamadan = v; });
  $('rMode').addEventListener('change', function (e) { var v = e.target.value; edit(function (x) { x.reading.mode = v; }); });
  $('rN').addEventListener('change', function (e) { var v = Math.max(1, Math.min(240, Math.round(num(e.target.value, 90)))); edit(function (x) { x.reading.nmins = v; }); });
  $('rFixed').addEventListener('change', function (e) { var v = e.target.value; if (v) edit(function (x) { x.reading.fixed = v; }); });
  $('rIq').addEventListener('change', function (e) { var v = Math.max(1, Math.min(60, Math.round(num(e.target.value, 10)))); edit(function (x) { x.reading.iqamaAfter = v; }); });

  /* ================= показ ================= */
  bindCheck('dHijri', function (x, v) { x.display.showHijri = v; });
  bindCheck('dSunrise', function (x, v) { x.display.showSunrise = v; });
  bindCheck('dZenith', function (x, v) { x.display.showZenith = v; });
  bindCheck('dSeconds', function (x, v) { x.display.showSeconds = v; });

  $('resetAll').addEventListener('click', function () {
    if (!window.confirm('Вернуть настройки мечети «Сабыр»? Город, метод, икама и джума будут как в мечети.')) return;
    App.save(Store.defaults());
    render();
  });

  /* ================= вывод значений ================= */
  function render() {
    var c = App.cfg();
    $('curCity').textContent = c.location.cityName || '—';
    $('curCoords').textContent = c.location.lat.toFixed(4) + ', ' + c.location.lng.toFixed(4);
    $('cName').value = c.location.cityId === '__custom' ? c.location.cityName : '';
    $('cLat').value = c.location.lat;
    $('cLng').value = c.location.lng;
    var tyumen = c.location.cityId === 'tyumen';
    $('tyumenLine').hidden = !tyumen;
    $('tyumenData').checked = c.tyumen.useData !== false;
    sel.value = PT.METHODS[c.calc.method] ? c.calc.method : 'mwl';
    var calcOff = tyumen && c.tyumen.useData !== false;
    sel.disabled = calcOff;
    $('methodHint').textContent = calcOff
      ? 'Для Тюмени действует официальное расписание (таблицы ДУМ); метод и Аср применяются, если его выключить.'
      : '';
    setSeg('asrSeg', c.calc.asr);
    $('highLats').value = c.calc.highLats;
    $('hijriOff').value = String(c.calc.hijriOffset || 0);
    ADJ_IDS.forEach(function (id) { document.querySelector('[data-adj="' + id + '"]').value = c.calc.adjustments[id] || 0; });
    $('mName').value = c.mosque.name;
    IQ_IDS.forEach(function (id) {
      var q = c.iqama[id];
      var inp = document.querySelector('[data-iq="' + id + '"]');
      inp.value = q.mode === 'after' ? q.offset : '';
      inp.placeholder = q.mode === 'fixed' ? q.fixed : '';
    });
    $('jOn').checked = c.jumuah.enabled;
    renderJumuah();
    $('rShow').checked = c.reading.show;
    $('rBox').hidden = !c.reading.show;
    $('rMode').value = c.reading.mode;
    $('rN').value = c.reading.nmins;
    $('rNBox').hidden = c.reading.mode === 'fixed';
    $('rFixed').value = c.reading.fixed;
    $('rFixedBox').hidden = c.reading.mode !== 'fixed';
    $('rByRead').checked = c.reading.fajrByRead;
    $('rIq').value = c.reading.iqamaAfter;
    $('rRamadan').checked = c.reading.hideInRamadan;
    $('dHijri').checked = c.display.showHijri;
    $('dSunrise').checked = c.display.showSunrise !== false;
    $('dZenith').checked = c.display.showZenith !== false;
    $('dSeconds').checked = c.display.showSeconds !== false;
    renderCities();
    renderQibla();
  }
  window.addEventListener('namaz-config', function () { setTimeout(render, 0); });

  /* ================= кибла ================= */
  var KAABA = { lat: 21.422487, lng: 39.826206 };
  var RAD = Math.PI / 180;
  function qiblaBearing(lat, lng) {
    var p1 = lat * RAD, p2 = KAABA.lat * RAD, dl = (KAABA.lng - lng) * RAD;
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(y, x) / RAD + 360) % 360;
  }
  function distanceKm(lat, lng) {
    var p1 = lat * RAD, p2 = KAABA.lat * RAD, dp = p2 - p1, dl = (KAABA.lng - lng) * RAD;
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  var SIDES = ['север', 'северо-восток', 'восток', 'юго-восток', 'юг', 'юго-запад', 'запад', 'северо-запад'];
  var bearing = 0, heading = null, gotSensor = false;
  function renderQibla() {
    var c = App.cfg();
    bearing = qiblaBearing(c.location.lat, c.location.lng);
    $('kaabaArrow').style.transform = 'rotate(' + bearing + 'deg)';
    $('qiblaDeg').textContent = Math.round(bearing) + '°';
    $('qiblaText').textContent = c.location.cityName + ': Кибла на ' + SIDES[Math.round(bearing / 45) % 8] +
      ' — ' + Math.round(bearing) + '° от севера по часовой стрелке. До Каабы ≈ ' +
      Math.round(distanceKm(c.location.lat, c.location.lng)).toLocaleString('ru-RU') + ' км.';
    turnDial();
  }
  function turnDial() {
    if (heading == null) return;
    $('dial').style.transform = 'rotate(' + (-heading) + 'deg)';
    var diff = Math.abs(((bearing - heading) % 360 + 540) % 360 - 180);
    var ok = diff < 4;
    var comp = $('compass');
    if (ok && !comp.classList.contains('aligned') && navigator.vibrate) { try { navigator.vibrate(60); } catch (e) { /* нет */ } }
    comp.classList.toggle('aligned', ok);
    $('qiblaDeg').textContent = ok ? 'Вы смотрите на Киблу' : Math.round(bearing) + '°';
  }
  function onOrient(e) {
    var h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
    else if ((e.absolute || e.type === 'deviceorientationabsolute') && e.alpha != null) h = (360 - e.alpha) % 360;
    if (h == null) return;
    gotSensor = true;
    heading = h;
    turnDial();
  }
  var listening = false;
  /* iPhone: компас — только после разрешения, по нажатию */
  var needsPerm = window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function';
  var permBtn = $('compassBtn');
  if (permBtn) {
    permBtn.hidden = !needsPerm;
    permBtn.addEventListener('click', function () {
      DeviceOrientationEvent.requestPermission().then(function (r) {
        if (r === 'granted') { permBtn.hidden = true; needsPerm = false; listening = false; startCompass(); }
        else $('qiblaHint').textContent = 'Без доступа к датчикам компас не работает. Разрешить можно в Настройках → Safari → «Движение и ориентация».';
      }).catch(function () { /* отказ */ });
    });
  }
  function startCompass() {
    if (listening || needsPerm) return;
    listening = true;
    gotSensor = false;
    if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', onOrient);
    else window.addEventListener('deviceorientation', onOrient);
    setTimeout(function () {
      if (!gotSensor && listening) {
        $('qiblaHint').textContent = 'Компас на этом устройстве недоступен. Ориентируйтесь по градусам: 0° — север, 90° — восток, 180° — юг, 270° — запад.';
      }
    }, 2500);
  }
  function stopCompass() {
    if (!listening) return;
    listening = false;
    window.removeEventListener('deviceorientationabsolute', onOrient);
    window.removeEventListener('deviceorientation', onOrient);
  }
  window.addEventListener('ph-view', function (e) {
    if (e.detail === 'viewQibla') startCompass(); else stopCompass();
    if (e.detail === 'viewSettings') render();
  });

  applyUi();
  renderUi();
  render();
})();

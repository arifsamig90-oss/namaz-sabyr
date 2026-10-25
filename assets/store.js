/*!
 * store.js — хранение и перенос настроек «Намаз-табло».
 *
 * Настройки живут в localStorage браузера на устройстве, где открыто табло.
 * Перенос на другое устройство: экспорт/импорт JSON-файла или ссылка
 * вида index.html#cfg=... (откройте её на устройстве с табло — настройки
 * применятся и сохранятся автоматически).
 */
(function (global) {
  'use strict';

  var KEY = 'namazTablo.config.v1';

  var DEFAULTS = {
    version: 2,
    mosque: {
      name: 'Мечеть «Сабыр»',
      subtitle: '',
      logoEmoji: '🕌',
      logoData: ''
    },
    location: {
      cityId: 'tyumen',
      cityName: 'Тюмень',
      lat: 57.1522,
      lng: 65.5272
    },
    calc: {
      method: 'russia',
      fajrAngle: 16,
      ishaAngle: 15,
      asr: 'hanafi',
      highLats: 'angle',
      adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      hijriOffset: 0
    },
    manual: {
      enabled: false,
      times: { fajr: '05:00', sunrise: '07:00', dhuhr: '12:45', asr: '16:10', maghrib: '18:35', isha: '20:25' }
    },
    iqama: {
      fajr:    { mode: 'after', offset: 10, fixed: '05:30' },
      dhuhr:   { mode: 'after', offset: 8,  fixed: '13:15' },
      asr:     { mode: 'after', offset: 3,  fixed: '16:30' },
      maghrib: { mode: 'after', offset: 3,  fixed: '18:40' },
      isha:    { mode: 'after', offset: 3,  fixed: '20:45' }
    },
    jumuah: {
      enabled: true,
      times: [
        { label: '1-я хутба', time: '13:15' },
        { label: '2-я хутба', time: '13:35' }
      ]
    },
    display: {
      theme: 'dark',
      palette: 'emerald-dark',
      accent: 'emerald',
      boardStyle: 'mosque',
      showSeconds: true,
      showHijri: true,
      showSunrise: true,
      showZenith: true,
      weather: true,
      tickerSpeed: 'normal',
      announcements: [
        'Добро пожаловать в нашу мечеть!',
        'Выключайте телефоны и надевайте носки, пожалуйста.'
      ],
      footerNote: '',
      bg: { mode: 'theme', image: '', dim: 45, blur: 0 },
      autoTheme: {
        enabled: false,
        mode: 'clock',
        dayPalette: 'cream',
        nightPalette: 'emerald-dark',
        dayStart: '07:00',
        nightStart: '20:00'
      }
    },
    reading: {
      show: true,
      mode: 'sunrise',
      nmins: 90,
      fixed: '07:00',
      hideInRamadan: true,
      winterPrint: false,
      fajrByRead: true,
      iqamaAfter: 10
    },
    tyumen: {
      useData: true,
      zuhr: 'fixed'
    },
    cloud: {
      enabled: false,
      dbUrl: '',
      apiKey: '',
      mosqueId: 'sabyr'
    },
    screens: {
      adhan: true,
      adhanSec: 120,
      iqama: true,
      prayer: true,
      prayerMin: 10,
      read: true,
      readSec: 180,
      readWarn: 15
    }
  };

  var THEMES = ['dark', 'light'];
  var PALETTES = ['emerald-dark', 'midnight', 'graphite', 'ocean', 'wine', 'cream', 'sand', 'mint'];
  var LIGHT_PALETTES = ['cream', 'sand', 'mint'];
  var PALETTE_MAP = { dark: 'emerald-dark', light: 'cream' };
  var ACCENTS = ['emerald', 'teal', 'sky', 'indigo', 'violet', 'rose', 'gold', 'amber', 'burgundy'];
  var BG_MODES = ['theme', 'image', 'stars', 'sea', 'sunset', 'aurora', 'ornament'];
  var SPEEDS = ['slow', 'normal', 'fast'];
  var HIGHLATS = ['angle', 'midNight', 'seventh', 'none'];
  var IQAMA_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var HM_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function defaults() { return clone(DEFAULTS); }
  function str(v, d) { return typeof v === 'string' ? v : d; }
  function bool(v, d) { return typeof v === 'boolean' ? v : d; }
  function num(v, d) { var x = parseFloat(v); return isFinite(x) ? x : d; }
  function pick(v, list, d) { return list.indexOf(v) !== -1 ? v : d; }
  function hm(v, d) { return (typeof v === 'string' && HM_RE.test(v.trim())) ? v.trim() : d; }

  /* Версия 2: новые икама и время джумы мечети «Сабыр». Меняем только
     нетронутые старые значения по умолчанию — ручные настройки остаются. */
  var V1_IQAMA = { fajr: 25, dhuhr: 15, asr: 15, maghrib: 5, isha: 15 };
  function migrateV2(cfg) {
    IQAMA_IDS.forEach(function (id) {
      var q = cfg.iqama[id];
      if (q.mode === 'after' && q.offset === V1_IQAMA[id]) q.offset = DEFAULTS.iqama[id].offset;
    });
    var t = cfg.jumuah.times;
    if (t.length === 2 && t[0].time === '12:30' && t[1].time === '13:30') {
      t[0].time = DEFAULTS.jumuah.times[0].time;
      t[1].time = DEFAULTS.jumuah.times[1].time;
    }
  }

  function normalize(raw) {
    var cfg = defaults();
    if (!raw || typeof raw !== 'object') return cfg;

    if (raw.mosque && typeof raw.mosque === 'object') {
      cfg.mosque.name = str(raw.mosque.name, cfg.mosque.name).slice(0, 120);
      cfg.mosque.subtitle = str(raw.mosque.subtitle, '').slice(0, 160);
      cfg.mosque.logoEmoji = str(raw.mosque.logoEmoji, cfg.mosque.logoEmoji).slice(0, 8);
      cfg.mosque.logoData = typeof raw.mosque.logoData === 'string' && raw.mosque.logoData.length < 500000
        ? raw.mosque.logoData : '';
    }
    if (raw.location && typeof raw.location === 'object') {
      cfg.location.cityId = str(raw.location.cityId, '');
      cfg.location.cityName = str(raw.location.cityName, cfg.location.cityName).slice(0, 80);
      cfg.location.lat = num(raw.location.lat, cfg.location.lat);
      cfg.location.lng = num(raw.location.lng, cfg.location.lng);
    }
    if (raw.calc && typeof raw.calc === 'object') {
      var ids = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
      cfg.calc.method = str(raw.calc.method, cfg.calc.method);
      cfg.calc.fajrAngle = Math.min(30, Math.max(0, num(raw.calc.fajrAngle, cfg.calc.fajrAngle)));
      cfg.calc.ishaAngle = Math.min(30, Math.max(0, num(raw.calc.ishaAngle, cfg.calc.ishaAngle)));
      cfg.calc.asr = raw.calc.asr === 'hanafi' ? 'hanafi' : 'standard';
      cfg.calc.highLats = pick(raw.calc.highLats, HIGHLATS, cfg.calc.highLats);
      cfg.calc.hijriOffset = Math.min(3, Math.max(-3, num(raw.calc.hijriOffset, 0)));
      if (raw.calc.adjustments && typeof raw.calc.adjustments === 'object') {
        for (var i = 0; i < ids.length; i++) {
          cfg.calc.adjustments[ids[i]] = Math.min(60, Math.max(-60, num(raw.calc.adjustments[ids[i]], 0)));
        }
      }
    }
    if (raw.manual && typeof raw.manual === 'object') {
      cfg.manual.enabled = bool(raw.manual.enabled, false);
      if (raw.manual.times && typeof raw.manual.times === 'object') {
        for (var j = 0; j < IQAMA_IDS.length; j++) {
          var id1 = IQAMA_IDS[j];
          cfg.manual.times[id1] = hm(raw.manual.times[id1], cfg.manual.times[id1]);
        }
        cfg.manual.times.sunrise = hm(raw.manual.times.sunrise, cfg.manual.times.sunrise);
      }
    }
    if (raw.iqama && typeof raw.iqama === 'object') {
      for (var k = 0; k < IQAMA_IDS.length; k++) {
        var id = IQAMA_IDS[k];
        var r = raw.iqama[id];
        if (r && typeof r === 'object') {
          cfg.iqama[id].mode = r.mode === 'fixed' ? 'fixed' : 'after';
          cfg.iqama[id].offset = Math.min(180, Math.max(0, num(r.offset, cfg.iqama[id].offset)));
          cfg.iqama[id].fixed = hm(r.fixed, cfg.iqama[id].fixed);
        }
      }
    }
    if (raw.jumuah && typeof raw.jumuah === 'object') {
      cfg.jumuah.enabled = bool(raw.jumuah.enabled, cfg.jumuah.enabled);
      if (Array.isArray(raw.jumuah.times)) {
        var list = [];
        for (var t = 0; t < raw.jumuah.times.length && list.length < 6; t++) {
          var item = raw.jumuah.times[t];
          if (item && HM_RE.test(String(item.time || '').trim())) {
            list.push({
              label: str(item.label, 'Джума').slice(0, 60),
              time: String(item.time).trim()
            });
          }
        }
        cfg.jumuah.times = list;
      }
    }
    if (!(num(raw.version, 1) >= 2)) migrateV2(cfg);
    if (raw.display && typeof raw.display === 'object') {
      var pal = PALETTE_MAP[raw.display.palette] || raw.display.palette;
      if (PALETTES.indexOf(pal) === -1) pal = PALETTE_MAP[raw.display.theme] || 'emerald-dark';
      if (PALETTES.indexOf(pal) === -1) pal = 'emerald-dark';
      cfg.display.palette = pal;
      cfg.display.theme = LIGHT_PALETTES.indexOf(pal) !== -1 ? 'light' : 'dark';
      cfg.display.accent = pick(raw.display.accent, ACCENTS, cfg.display.accent);
      cfg.display.boardStyle = raw.display.boardStyle === 'accent' ? 'accent' : 'mosque';
      cfg.display.showSeconds = bool(raw.display.showSeconds, cfg.display.showSeconds);
      cfg.display.showHijri = bool(raw.display.showHijri, cfg.display.showHijri);
      cfg.display.showSunrise = bool(raw.display.showSunrise, cfg.display.showSunrise);
      cfg.display.showZenith = bool(raw.display.showZenith, cfg.display.showZenith);
      cfg.display.weather = bool(raw.display.weather, cfg.display.weather);
      cfg.display.tickerSpeed = pick(raw.display.tickerSpeed, SPEEDS, cfg.display.tickerSpeed);
      if (Array.isArray(raw.display.announcements)) {
        var ann = [];
        for (var a = 0; a < raw.display.announcements.length && ann.length < 40; a++) {
          var line = String(raw.display.announcements[a] || '').trim().slice(0, 300);
          if (line) ann.push(line);
        }
        cfg.display.announcements = ann;
      }
      cfg.display.footerNote = str(raw.display.footerNote, '').slice(0, 200);
      if (raw.display.bg && typeof raw.display.bg === 'object') {
        cfg.display.bg.mode = pick(raw.display.bg.mode, BG_MODES, 'theme');
        var bgimg = typeof raw.display.bg.image === 'string' ? raw.display.bg.image : '';
        cfg.display.bg.image = (bgimg.indexOf('data:image') === 0 && bgimg.length < 1200000) ? bgimg : '';
        cfg.display.bg.dim = Math.min(90, Math.max(0, num(raw.display.bg.dim, 45)));
        cfg.display.bg.blur = Math.min(20, Math.max(0, num(raw.display.bg.blur, 0)));
        if (cfg.display.bg.mode === 'image' && !cfg.display.bg.image) cfg.display.bg.mode = 'theme';
      }
      if (raw.display.autoTheme && typeof raw.display.autoTheme === 'object') {
        var at = raw.display.autoTheme;
        cfg.display.autoTheme.enabled = bool(at.enabled, false);
        cfg.display.autoTheme.mode = at.mode === 'sun' ? 'sun' : 'clock';
        cfg.display.autoTheme.dayPalette = pick(at.dayPalette, PALETTES, 'cream');
        cfg.display.autoTheme.nightPalette = pick(at.nightPalette, PALETTES, 'emerald-dark');
        cfg.display.autoTheme.dayStart = hm(at.dayStart, '07:00');
        cfg.display.autoTheme.nightStart = hm(at.nightStart, '20:00');
      }
    }
    if (raw.reading && typeof raw.reading === 'object') {
      cfg.reading.show = bool(raw.reading.show, cfg.reading.show);
      cfg.reading.mode = pick(raw.reading.mode, ['sunrise', 'suhoor', 'fixed'], cfg.reading.mode);
      cfg.reading.nmins = Math.min(240, Math.max(1, num(raw.reading.nmins, cfg.reading.nmins)));
      cfg.reading.fixed = hm(raw.reading.fixed, cfg.reading.fixed);
      cfg.reading.hideInRamadan = bool(raw.reading.hideInRamadan, cfg.reading.hideInRamadan);
      cfg.reading.winterPrint = bool(raw.reading.winterPrint, cfg.reading.winterPrint);
      cfg.reading.fajrByRead = bool(raw.reading.fajrByRead, cfg.reading.fajrByRead);
      cfg.reading.iqamaAfter = Math.min(60, Math.max(1, num(raw.reading.iqamaAfter, cfg.reading.iqamaAfter)));
    }
    if (raw.tyumen && typeof raw.tyumen === 'object') {
      cfg.tyumen.useData = bool(raw.tyumen.useData, cfg.tyumen.useData);
      cfg.tyumen.zuhr = raw.tyumen.zuhr === 'zenith4' ? 'zenith4' : 'fixed';
    }
    if (raw.cloud && typeof raw.cloud === 'object') {
      cfg.cloud.enabled = bool(raw.cloud.enabled, false);
      cfg.cloud.dbUrl = str(raw.cloud.dbUrl, '').trim().slice(0, 300);
      cfg.cloud.apiKey = str(raw.cloud.apiKey, '').trim().slice(0, 120);
      cfg.cloud.mosqueId = (str(raw.cloud.mosqueId, 'sabyr').trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'sabyr').slice(0, 40);
    }
    if (raw.screens && typeof raw.screens === 'object') {
      var sc = raw.screens;
      cfg.screens.adhan = bool(sc.adhan, cfg.screens.adhan);
      cfg.screens.adhanSec = Math.min(600, Math.max(10, num(sc.adhanSec, cfg.screens.adhanSec)));
      cfg.screens.iqama = bool(sc.iqama, cfg.screens.iqama);
      cfg.screens.prayer = bool(sc.prayer, cfg.screens.prayer);
      cfg.screens.prayerMin = Math.min(60, Math.max(1, num(sc.prayerMin, cfg.screens.prayerMin)));
      cfg.screens.read = bool(sc.read, cfg.screens.read);
      cfg.screens.readSec = Math.min(1800, Math.max(10, num(sc.readSec, cfg.screens.readSec)));
      cfg.screens.readWarn = Math.min(120, Math.max(0, num(sc.readWarn, cfg.screens.readWarn)));
    }
    return cfg;
  }

  /* ---------- база64 (UTF-8) ---------- */

  function encodeB64(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function decodeB64(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* ---------- чтение/запись ---------- */

  var memStore = null;

  function readStorage() {
    try { return global.localStorage.getItem(KEY); } catch (e) { return memStore; }
  }

  function writeStorage(val) {
    memStore = val;
    try { global.localStorage.setItem(KEY, val); return true; } catch (e) { return false; }
  }

  function readHash() {
    try {
      if (!global.location || !global.location.hash) return null;
      var m = global.location.hash.match(/cfg=([^&]+)/);
      if (!m) return null;
      return JSON.parse(decodeB64(decodeURIComponent(m[1])));
    } catch (e) { return null; }
  }

  function clearHash() {
    try {
      global.history.replaceState(null, '', global.location.pathname + global.location.search);
    } catch (e) {
      try { global.location.hash = ''; } catch (e2) { /* не критично */ }
    }
  }

  /* ---------- приставка Android TV ----------
     TABLO_REMOTE — страница открыта с телефона по Wi‑Fi с сервера приставки:
     настройки берём с приставки и сохраняем на неё (нужен PIN с экрана табло).
     TabloNative — страница открыта в самом приложении на приставке. */

  var REMOTE = !!global.TABLO_REMOTE;
  var PIN_KEY = 'namazTablo.pin';
  var remoteListener = null;

  function remotePin() {
    try { return global.localStorage.getItem(PIN_KEY) || ''; } catch (e) { return ''; }
  }
  function setRemotePin(pin) {
    try { global.localStorage.setItem(PIN_KEY, String(pin || '').trim()); } catch (e) { /* не критично */ }
  }

  var pushTimer = null, pushPending = null;
  function pushRemote(text) {
    pushPending = text;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      var body = pushPending;
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/config');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('X-Pin', remotePin());
      xhr.onload = function () {
        var ok = xhr.status === 200;
        if (remoteListener) remoteListener(ok, ok ? '' : (xhr.status === 403 ? 'pin' : 'http ' + xhr.status));
      };
      xhr.onerror = function () { if (remoteListener) remoteListener(false, 'net'); };
      xhr.send(body);
    }, 600);
  }

  function notifyNative(text) {
    try { if (global.TabloNative && global.TabloNative.saveConfig) global.TabloNative.saveConfig(text); } catch (e) { /* нет моста */ }
  }

  /* Настройки пришли извне (телефон по Wi‑Fi, облако) — сохраняем и сообщаем странице */
  function applyExternal(raw) {
    var c = normalize(typeof raw === 'string' ? JSON.parse(raw) : raw);
    var text = JSON.stringify(c);
    writeStorage(text);
    notifyNative(text);
    try { global.dispatchEvent(new CustomEvent('namaz-config', { detail: c })); } catch (e) { /* старый браузер */ }
    return c;
  }
  global.NamazApplyConfig = function (json) {
    try { applyExternal(json); } catch (e) { if (global.console) console.error(e); }
  };

  function load() {
    if (REMOTE) return normalize(global.TABLO_CONFIG || null);
    var fromHash = readHash();
    if (fromHash) {
      try {
        var c = normalize(fromHash);
        writeStorage(JSON.stringify(c));
        clearHash();
        return c;
      } catch (e) { /* упадём в обычную загрузку */ }
    }
    try {
      var raw = readStorage();
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* используем значения по умолчанию */ }
    return defaults();
  }

  function save(cfg) {
    var text = JSON.stringify(cfg);
    if (REMOTE) {
      global.TABLO_CONFIG = cfg;
      pushRemote(text);
      return true;
    }
    notifyNative(text);
    return writeStorage(text);
  }

  /* Ссылка с настройками (без картинки-логотипа, чтобы URL не разрастался). */
  function makeShareUrl(cfg) {
    var copy = JSON.parse(JSON.stringify(cfg));
    copy.mosque.logoData = '';
    var base = global.location.href.split('#')[0].split('?')[0]
      .replace(/admin\.html$/, 'index.html')
      .replace(/calendar\.html$/, 'index.html');
    return base + '#cfg=' + encodeURIComponent(encodeB64(JSON.stringify(copy)));
  }

  global.NamazStore = {
    KEY: KEY,
    DEFAULTS: DEFAULTS,
    defaults: defaults,
    normalize: normalize,
    load: load,
    save: save,
    applyExternal: applyExternal,
    remote: REMOTE,
    remotePin: remotePin,
    setRemotePin: setRemotePin,
    onRemoteResult: function (fn) { remoteListener = fn; },
    makeShareUrl: makeShareUrl
  };
})(typeof self !== 'undefined' ? self : this);

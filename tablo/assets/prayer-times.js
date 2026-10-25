/*!
 * prayer-times.js — «Намаз-табло», движок расчёта времён намаза
 *
 * Использует стандартные астрономические формулы (склонение Солнца, уравнение
 * времени, сумеречные углы) и общепринятые методы расчёта: MWL, Умм аль-Кура,
 * Карачи, Диянет и др. Правила для высоких широт: «середина ночи»,
 * «одна седьмая ночи», «по углу сумерек».
 *
 * Без внешних зависимостей. В браузере создаёт window.PrayerTimes,
 * в Node.js экспортирует объект (используется только для тестов).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PrayerTimes = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEG = Math.PI / 180;
  function sin(d) { return Math.sin(d * DEG); }
  function cos(d) { return Math.cos(d * DEG); }
  function tan(d) { return Math.tan(d * DEG); }
  function asin(x) { return Math.asin(x) / DEG; }
  function acos(x) { return Math.acos(x) / DEG; }
  function atan(x) { return Math.atan(x) / DEG; }
  function atan2(y, x) { return Math.atan2(y, x) / DEG; }
  function fixAngle(a) { return ((a % 360) + 360) % 360; }
  function wrapHour(h) { return ((h % 24) + 24) % 24; }

  var MS_MIN = 60000;
  var MS_HOUR = 3600000;
  var MS_DAY = 86400000;
  var HM_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

  /* ---------- Методы расчёта ---------- */
  var METHODS = {
    mwl:       { name: 'Всемирная мусульманская лига (MWL)',     fajrAngle: 18,   ishaAngle: 17 },
    russia:    { name: 'Россия (16°/15°, как у ДУМ и на российских сайтах)', fajrAngle: 16, ishaAngle: 15 },
    egypt:     { name: 'Египетское управление (EGAS)',           fajrAngle: 19.5, ishaAngle: 17.5 },
    karachi:   { name: 'Карачи (Университет исламских наук)',    fajrAngle: 18,   ishaAngle: 18 },
    ummAlQura: { name: 'Умм аль-Кура (Мекка)',                   fajrAngle: 18.5, ishaInterval: 90 },
    qatar:     { name: 'Катар',                                  fajrAngle: 18,   ishaInterval: 90 },
    kuwait:    { name: 'Кувейт',                                 fajrAngle: 18,   ishaAngle: 17.5 },
    turkey:    { name: 'Диянет (Турция)',                        fajrAngle: 18,   ishaAngle: 17 },
    isna:      { name: 'ISNA (Северная Америка)',                fajrAngle: 15,   ishaAngle: 15 },
    france:    { name: 'Франция (UOIF)',                         fajrAngle: 12,   ishaAngle: 12 },
    gulf:      { name: 'Страны Залива (ОАЭ, Бахрейн, Оман)',     fajrAngle: 19.5, ishaInterval: 90 },
    jordan:    { name: 'Иордания (Министерство вакуфов)',        fajrAngle: 18,   ishaAngle: 18 },
    tunisia:   { name: 'Тунис',                                  fajrAngle: 18,   ishaAngle: 18 },
    algeria:   { name: 'Алжир',                                  fajrAngle: 18,   ishaAngle: 17 },
    morocco:   { name: 'Марокко',                                fajrAngle: 19,   ishaAngle: 17 },
    jakim:     { name: 'Малайзия (JAKIM)',                       fajrAngle: 20,   ishaAngle: 18 },
    kemenag:   { name: 'Индонезия (KEMENAG)',                    fajrAngle: 20,   ishaAngle: 18 },
    singapore: { name: 'Сингапур (MUIS)',                        fajrAngle: 20,   ishaAngle: 18 },
    portugal:  { name: 'Португалия (Исламская община Лиссабона)', fajrAngle: 18,  ishaInterval: 80 },
    custom:    { name: 'Свой расчёт (ручные углы)',              fajrAngle: 18,   ishaAngle: 17 }
  };

  var PRAYER_IDS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var PRAYER_NAMES = {
    fajr: 'Фаджр', sunrise: 'Восход', dhuhr: 'Зухр',
    asr: 'Аср', maghrib: 'Магриб', isha: 'Иша'
  };
  var HIJRI_MONTHS_RU = ['Мухаррам', 'Сафар', 'Раби I', 'Раби II', 'Джумада I', 'Джумада II',
    'Раджаб', 'Шаабан', 'Рамадан', 'Шавваль', 'Зуль-Кида', 'Зуль-Хиджа'];

  function num(x, d) { var v = parseFloat(x); return isFinite(v) ? v : d; }

  /* ---------- Астрономия ---------- */

  function julianDay(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
    var e = 23.439 - 0.00000036 * D;
    var RA = wrapHour(atan2(cos(e) * sin(L), cos(L)) / 15);
    var eqt = q / 15 - RA;
    eqt = ((eqt + 12) % 24 + 24) % 24 - 12; /* часы, диапазон (-12; 12] */
    var decl = asin(sin(e) * sin(L));       /* градусы */
    return { decl: decl, eqt: eqt };
  }

  function solarNoon(y, m, d, lng) {
    var jd = julianDay(y, m, d) - lng / 360;
    var pos = sunPosition(jd);
    var noonMs = Date.UTC(y, m - 1, d, 12, 0, 0) - (pos.eqt + lng / 15) * MS_HOUR;
    return { noonMs: noonMs, decl: pos.decl, eqt: pos.eqt };
  }

  /* Угол: для сумерек — положительный (напр. 18); для восхода/заката — высота (-0.833). */
  function hourAngleFor(lat, decl, angle) {
    var c = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
    if (c > 1 || c < -1) return NaN;
    return acos(c) / 15;
  }

  function rawDay(y, m, d, lat, lng, p) {
    var noon = solarNoon(y, m, d, lng);
    var tSun = hourAngleFor(lat, noon.decl, 0.833);
    var tFajr = hourAngleFor(lat, noon.decl, p.fajrAngle);
    var tIsha = p.ishaInterval ? null : hourAngleFor(lat, noon.decl, p.ishaAngle);
    var asrAngle = -atan(1 / (p.asrFactor + tan(Math.abs(lat - noon.decl))));
    var tAsr = hourAngleFor(lat, noon.decl, asrAngle);
    return {
      noon: noon.noonMs,
      sunrise: isNaN(tSun) ? NaN : noon.noonMs - tSun * MS_HOUR,
      sunset:  isNaN(tSun) ? NaN : noon.noonMs + tSun * MS_HOUR,
      fajr:    isNaN(tFajr) ? NaN : noon.noonMs - tFajr * MS_HOUR,
      isha:    tIsha === null ? null : (isNaN(tIsha) ? NaN : noon.noonMs + tIsha * MS_HOUR),
      asr:     isNaN(tAsr) ? NaN : noon.noonMs + tAsr * MS_HOUR
    };
  }

  function resolveParams(config) {
    var calc = (config && config.calc) || {};
    var method = (calc.method && METHODS[calc.method]) ? calc.method : 'mwl';
    var M = METHODS[method];
    var custom = method === 'custom';
    return {
      fajrAngle: custom ? num(calc.fajrAngle, M.fajrAngle) : M.fajrAngle,
      ishaAngle: custom ? num(calc.ishaAngle, M.ishaAngle) : (M.ishaAngle || 17),
      ishaInterval: M.ishaInterval || 0,
      asrFactor: calc.asr === 'hanafi' ? 2 : 1,
      highLats: calc.highLats || 'angle'
    };
  }

  function computeAuto(date, lat, lng, p) {
    var y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
    function rawAt(delta) {
      var t = new Date(y, m - 1, d + delta);
      return rawDay(t.getFullYear(), t.getMonth() + 1, t.getDate(), lat, lng, p);
    }
    var day = rawAt(0), prev = rawAt(-1), next = rawAt(1);
    var times = {
      fajr: day.fajr,
      sunrise: day.sunrise,
      dhuhr: day.noon,
      asr: day.asr,
      maghrib: day.sunset,
      isha: p.ishaInterval
        ? (isFinite(day.sunset) ? day.sunset + p.ishaInterval * MS_MIN : NaN)
        : day.isha
    };
    var meta = { fajrAdjusted: false, ishaAdjusted: false, polar: false };

    if (p.highLats && p.highLats !== 'none') {
      if (isFinite(times.sunrise) && isFinite(prev.sunset)) {
        var nightF = times.sunrise - prev.sunset;
        var pf = p.highLats === 'midNight' ? 0.5 : (p.highLats === 'seventh' ? 1 / 7 : p.fajrAngle / 60);
        var limitF = times.sunrise - pf * nightF;
        if (!isFinite(times.fajr) || times.fajr < limitF) { times.fajr = limitF; meta.fajrAdjusted = true; }
      }
      if (!p.ishaInterval && isFinite(times.maghrib) && isFinite(next.sunrise)) {
        var nightI = next.sunrise - times.maghrib;
        var pi = p.highLats === 'midNight' ? 0.5 : (p.highLats === 'seventh' ? 1 / 7 : p.ishaAngle / 60);
        var limitI = times.maghrib + pi * nightI;
        if (!isFinite(times.isha) || times.isha > limitI) { times.isha = limitI; meta.ishaAdjusted = true; }
      }
    }
    if (!isFinite(times.fajr) || !isFinite(times.isha)) meta.polar = true;
    return { times: times, meta: meta };
  }

  /* ---------- Икама ---------- */

  function parseHM(str) {
    if (typeof str !== 'string') return null;
    var m = str.trim().match(HM_RE);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function dateAtHM(date, hm) {
    var mins = parseHM(hm);
    if (mins === null) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
      Math.floor(mins / 60), mins % 60, 0, 0);
  }

  function computeIqama(adhan, rule) {
    if (!rule) return null;
    if (rule.mode === 'fixed') {
      var mins = parseHM(rule.fixed);
      if (mins === null) return null;
      var t = new Date(adhan.getFullYear(), adhan.getMonth(), adhan.getDate(),
        Math.floor(mins / 60), mins % 60, 0, 0);
      if (t.getTime() < adhan.getTime()) t.setTime(t.getTime() + MS_DAY);
      return t;
    }
    return new Date(adhan.getTime() + num(rule.offset, 15) * MS_MIN);
  }

  /* ---------- Полное расписание дня ---------- */

  function buildSchedule(date, config) {
    config = config || {};
    var calc = config.calc || {};
    var method = calc.method || 'mwl';
    var meta = {
      methodName: (METHODS[method] || {}).name || method,
      asrName: calc.asr === 'hanafi' ? 'Ханафи' : 'Шафии (стандартный)',
      manual: false, polar: false, hiLatFajr: false, hiLatIsha: false,
      warnings: []
    };
    var result = { ok: true, error: null, date: date, prayers: [], jumuah: [], meta: meta };
    var rawMs = null;

    if (config.manual && config.manual.enabled) {
      meta.manual = true;
      meta.methodName = 'Ручное расписание';
      rawMs = {};
      for (var i = 0; i < PRAYER_IDS.length; i++) {
        var id0 = PRAYER_IDS[i];
        var t = dateAtHM(date, config.manual.times ? config.manual.times[id0] : null);
        rawMs[id0] = t ? t.getTime() : null;
      }
    } else {
      var loc = config.location || {};
      var lat = num(loc.lat, NaN), lng = num(loc.lng, NaN);
      if (!isFinite(lat) || !isFinite(lng)) {
        result.ok = false;
        result.error = 'no_location';
        meta.warnings.push('Не заданы координаты — откройте «Настройки» и укажите город.');
        return result;
      }
      var p = resolveParams(config);
      var auto = computeAuto(date, lat, lng, p);
      meta.polar = auto.meta.polar;
      meta.hiLatFajr = auto.meta.fajrAdjusted;
      meta.hiLatIsha = auto.meta.ishaAdjusted;
      if (meta.polar) {
        meta.warnings.push('Полярный день/ночь: Фаджр и Иша не рассчитываются — включите ручное расписание.');
      } else if (meta.hiLatFajr || meta.hiLatIsha) {
        meta.warnings.push('Сумерки рассчитаны по правилу высоких широт.');
      }
      var adj = calc.adjustments || {};
      rawMs = {};
      for (var j = 0; j < PRAYER_IDS.length; j++) {
        var id = PRAYER_IDS[j];
        var ms = auto.times[id];
        var add = num(adj[id], 0);
        if (isFinite(ms) && add) ms += add * MS_MIN;
        rawMs[id] = isFinite(ms) ? ms : null;
      }
    }

    var iqamaCfg = config.iqama || {};
    for (var k = 0; k < PRAYER_IDS.length; k++) {
      var pid = PRAYER_IDS[k];
      var ms2 = rawMs[pid];
      var adhan = ms2 == null ? null : new Date(ms2);
      var iqama = null;
      if (adhan && pid !== 'sunrise' && iqamaCfg[pid]) iqama = computeIqama(adhan, iqamaCfg[pid]);
      result.prayers.push({ id: pid, name: PRAYER_NAMES[pid], adhan: adhan, iqama: iqama });
    }

    if (config.jumuah && config.jumuah.enabled && Array.isArray(config.jumuah.times)) {
      result.jumuah = config.jumuah.times
        .filter(function (x) { return x && parseHM(x.time) !== null; })
        .map(function (x) {
          return { label: String(x.label || 'Джума'), time: dateAtHM(date, x.time) };
        });
    }
    return result;
  }

  /* ---------- События дня (азан/икама/джума) ---------- */

  function collectEvents(schedule, tomorrowSchedule) {
    var out = [];
    if (schedule && schedule.ok) {
      schedule.prayers.forEach(function (p) {
        if (p.adhan) out.push({ at: p.adhan.getTime(), kind: 'adhan', id: p.id, name: p.name });
        if (p.iqama) out.push({ at: p.iqama.getTime(), kind: 'iqama', id: p.id, name: p.name });
      });
      schedule.jumuah.forEach(function (j) {
        out.push({ at: j.time.getTime(), kind: 'jumuah', id: 'jumuah', name: j.label });
      });
    }
    if (tomorrowSchedule && tomorrowSchedule.ok) {
      var f = null;
      tomorrowSchedule.prayers.forEach(function (p) { if (p.id === 'fajr') f = p; });
      if (f && f.adhan) out.push({ at: f.adhan.getTime(), kind: 'adhan', id: 'fajr', name: 'Фаджр', tomorrow: true });
      if (f && f.iqama) out.push({ at: f.iqama.getTime(), kind: 'iqama', id: 'fajr', name: 'Фаджр', tomorrow: true });
    }
    out.sort(function (a, b) { return a.at - b.at; });
    return out;
  }

  function nextEvent(events, nowMs) {
    for (var i = 0; i < events.length; i++) { if (events[i].at > nowMs) return events[i]; }
    return null;
  }

  function prevEvent(events, nowMs) {
    var prev = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i].at <= nowMs) prev = events[i]; else break;
    }
    return prev;
  }

  /* ---------- Форматирование ---------- */

  function toDate(x) { return x instanceof Date ? x : new Date(x); }

  function p2(n) { return (n < 10 ? '0' : '') + n; }

  function fmtHM(x) {
    if (x == null) return '--:--';
    var d = toDate(x);
    if (isNaN(d.getTime())) return '--:--';
    return p2(d.getHours()) + ':' + p2(d.getMinutes());
  }

  function fmtDuration(ms) {
    if (!isFinite(ms) || ms < 0) ms = 0;
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); var sec = s - m * 60;
    return p2(h) + ':' + p2(m) + ':' + p2(sec);
  }

  function dateKey(x) {
    var d = toDate(x);
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }

  function addDays(x, n) {
    var d = toDate(x);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  /* ---------- Хиджра ---------- */

  function islamicToJd(y, m, d) {
    return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 +
      Math.floor((3 + 11 * y) / 30) + 1948439.5 - 1;
  }

  function hijriPartsTabular(d) {
    var jd = Math.floor(julianDay(d.getFullYear(), d.getMonth() + 1, d.getDate())) + 0.5;
    var epoch = 1948439.5;
    var year = Math.floor((30 * (jd - epoch) + 10646) / 10631);
    var month = Math.min(12, Math.ceil((jd - (29 + islamicToJd(year, 1, 1))) / 29.5) + 1);
    var day = Math.round(jd - islamicToJd(year, month, 1)) + 1;
    if (day < 1) { month -= 1; day = Math.round(jd - islamicToJd(year, month, 1)) + 1; }
    return { day: day, month: month, year: year, name: HIJRI_MONTHS_RU[(month - 1 + 12) % 12] };
  }

  function hijriParts(date, offsetDays) {
    var d = new Date(toDate(date).getTime() + num(offsetDays, 0) * MS_DAY);
    try {
      var fmt = new Intl.DateTimeFormat('ru-RU-u-ca-islamic-umalqura',
        { day: 'numeric', month: 'numeric', year: 'numeric' });
      var parts = fmt.formatToParts(d);
      var get = function (t) {
        for (var i = 0; i < parts.length; i++) { if (parts[i].type === t) return parts[i].value; }
        return '';
      };
      var day = parseInt(get('day'), 10);
      var month = parseInt(get('month'), 10);
      var year = parseInt(get('year'), 10);
      if (day >= 1 && month >= 1 && month <= 12 && year > 1000) {
        return { day: day, month: month, year: year, name: HIJRI_MONTHS_RU[(month - 1 + 12) % 12] };
      }
    } catch (e) { /* нет поддержки — считаем вручную */ }
    return hijriPartsTabular(d);
  }

  function hijriText(date, offsetDays) {
    var hp = hijriParts(date, offsetDays);
    if (!hp) return '';
    return hp.day + ' ' + hp.name + ' ' + hp.year;
  }

  return {
    METHODS: METHODS,
    PRAYER_IDS: PRAYER_IDS,
    PRAYER_NAMES: PRAYER_NAMES,
    HIJRI_MONTHS_RU: HIJRI_MONTHS_RU,
    buildSchedule: buildSchedule,
    computeAuto: computeAuto,
    resolveParams: resolveParams,
    computeIqama: computeIqama,
    collectEvents: collectEvents,
    nextEvent: nextEvent,
    prevEvent: prevEvent,
    hijriParts: hijriParts,
    hijriPartsTabular: hijriPartsTabular,
    hijriText: hijriText,
    fmtHM: fmtHM,
    fmtDuration: fmtDuration,
    parseHM: parseHM,
    dateKey: dateKey,
    addDays: addDays,
    julianDay: julianDay,
    sunPosition: sunPosition,
    solarNoon: solarNoon,
    hourAngleFor: hourAngleFor,
    rawDay: rawDay,
    MS_MIN: MS_MIN,
    MS_HOUR: MS_HOUR,
    MS_DAY: MS_DAY
  };
});

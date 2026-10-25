/*!
 * schedule.js — общий модуль: выбор источника расписания (тюменское/расчётное)
 * и время «Читается в мечетях».
 */
(function (global) {
  'use strict';
  var PT = global.PrayerTimes;
  var TS = global.TyumenSchedule;

  function num(x, d) { var v = parseFloat(x); return isFinite(v) ? v : d; }

  function tyumenActive(cfg) {
    return !!(cfg && cfg.location && cfg.location.cityId === 'tyumen' &&
      (!cfg.tyumen || cfg.tyumen.useData !== false) && TS);
  }

  function dateAt(date, sec) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    d.setTime(d.getTime() + sec * 1000);
    return d;
  }

  /* Расписание из тюменского модуля в форме, как у PT.buildSchedule */
  function tyumenDay(cfg, date) {
    var t = TS.get(PT.dateKey(date));
    if (!t) return null;
    var y = date.getFullYear(), mo = date.getMonth(), dd = date.getDate();
    var zuhrSec = (cfg.tyumen && cfg.tyumen.zuhr === 'zenith4') ? t.zuhrZenith4 : t.zuhr13;
    var secs = { fajr: t.suhoor, sunrise: t.sunrise, dhuhr: zuhrSec, asr: t.asr, maghrib: t.maghrib, isha: t.isha };
    var prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].map(function (id) {
      return { id: id, name: PT.PRAYER_NAMES[id], adhan: dateAt(date, secs[id]), iqama: null };
    });
    var iqamaCfg = cfg.iqama || {};
    prayers.forEach(function (p) {
      if (p.id !== 'sunrise' && iqamaCfg[p.id]) p.iqama = PT.computeIqama(p.adhan, iqamaCfg[p.id]);
    });
    var jumuah = [];
    if (cfg.jumuah && cfg.jumuah.enabled && Array.isArray(cfg.jumuah.times)) {
      cfg.jumuah.times.forEach(function (x) {
        var mins = PT.parseHM(x.time);
        if (mins === null) return;
        jumuah.push({ label: x.label || 'Джума', time: new Date(y, mo, dd, Math.floor(mins / 60), mins % 60, 0, 0) });
      });
    }
    return {
      ok: true, error: null, date: date, prayers: prayers, jumuah: jumuah,
      zenith: dateAt(date, t.zenith), sunriseVal: t.sunrise, readVal: t.read,
      meta: {
        methodName: 'Тюменское расписание' + (t.exact ? ' (официальные таблицы)' : ' (продолжение расчёта)'),
        asrName: 'Ханафи', manual: false, tyumen: true, exact: !!t.exact,
        polar: false, hiLatFajr: false, hiLatIsha: false, warnings: []
      }
    };
  }

  /* Время «Читается в мечетях»: { time, hidden, note } */
  function readingInfo(cfg, sched, date) {
    var r = (cfg && cfg.reading) || {};
    var out = { time: null, hidden: false, note: '' };
    if (!r.show || !sched || !sched.ok) return out;

    var hp = PT.hijriParts(date, num(cfg.calc && cfg.calc.hijriOffset, 0));
    var ramadan = !!(hp && hp.month === 9);
    var t = null;

    if (r.mode === 'fixed') {
      var mins = PT.parseHM(r.fixed);
      if (mins !== null) {
        t = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(mins / 60), mins % 60, 0, 0);
        out.note = 'фиксированное время ' + r.fixed;
      }
    } else if (r.mode === 'suhoor') {
      var base = sched.prayers[0] && sched.prayers[0].adhan;
      if (base) {
        t = new Date(base.getTime() + num(r.nmins, 30) * 60000);
        out.note = 'сухур + ' + num(r.nmins, 30) + ' мин';
      }
    } else {
      var sr = null;
      if (sched.sunriseVal != null) sr = dateAt(date, sched.sunriseVal);
      else if (sched.prayers[1] && sched.prayers[1].adhan) sr = sched.prayers[1].adhan;
      if (sr) {
        t = new Date(sr.getTime() - num(r.nmins, 90) * 60000);
        out.note = 'восход − ' + num(r.nmins, 90) + ' мин';
      }
    }

    if (t && r.winterPrint && tyumenActive(cfg) && (date.getMonth() === 11 || date.getMonth() === 0)) {
      t = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7, 0, 0, 0);
      out.note = 'декабрь–январь: 07:00 (печатный вариант)';
    }
    if (t && r.hideInRamadan !== false && ramadan) {
      out.hidden = true;
      out.note = 'Рамадан — не показывается (как в печатном календаре)';
      return out;
    }
    out.time = t;
    return out;
  }

  /* Полный день: расписание + время чтения */
  function buildDay(cfg, date) {
    var sched = null;
    if (tyumenActive(cfg)) sched = tyumenDay(cfg, date);
    if (!sched) sched = PT.buildSchedule(date, cfg);
    if (sched && sched.ok) {
      if (!sched.zenith) {
        var raw = PT.rawDay(date.getFullYear(), date.getMonth() + 1, date.getDate(),
          num(cfg.location && cfg.location.lat, NaN), num(cfg.location && cfg.location.lng, NaN), PT.resolveParams(cfg));
        if (raw && isFinite(raw.noon)) sched.zenith = new Date(raw.noon);
      }
      var ri = readingInfo(cfg, sched, date);
      sched.read = ri.time;
      sched.readHidden = ri.hidden;
      sched.readNote = ri.note;
      /* Когда «Читается в мечетях» действует, азан Фаджра в мечети звучит
         в это время, затем 5–10 мин на сунну и икама. Когда чтение
         выключено или скрыто (Рамадан) — обычный Фаджр и его икама. */
      var r = cfg.reading || {};
      var fajr = sched.prayers[0];
      /* азан Фаджра не может быть раньше начала времени Фаджра */
      if (r.fajrByRead !== false && ri.time && !ri.hidden && fajr && fajr.id === 'fajr' &&
          fajr.adhan && ri.time >= fajr.adhan) {
        fajr.mosqueAdhan = ri.time;
        fajr.iqama = new Date(ri.time.getTime() + num(r.iqamaAfter, 10) * 60000);
        sched.fajrByRead = true;
      }
    }
    return sched;
  }

  var LIGHT_PALETTES = ['cream', 'sand', 'mint'];

  function isLightPalette(id) { return LIGHT_PALETTES.indexOf(id) !== -1; }

  /* Состояние авто-темы: { day: bool, palette: id } или null, если авто выключено */
  function autoThemeState(cfg, now, schedule) {
    var a = cfg && cfg.display && cfg.display.autoTheme;
    if (!a || !a.enabled) return null;
    var isDay = null;
    if (a.mode === 'sun' && schedule && schedule.ok) {
      var sr = schedule.prayers[1] && schedule.prayers[1].adhan;
      var ss = schedule.prayers[4] && schedule.prayers[4].adhan;
      if (sr && ss) isDay = (now >= sr && now < ss);
    }
    if (isDay === null) {
      var mins = now.getHours() * 60 + now.getMinutes();
      var ds = PT.parseHM(a.dayStart); if (ds === null) ds = 420;
      var ns = PT.parseHM(a.nightStart); if (ns === null) ns = 1200;
      isDay = (ds <= ns) ? (mins >= ds && mins < ns) : (mins >= ds || mins < ns);
    }
    return { day: isDay, palette: isDay ? (a.dayPalette || 'cream') : (a.nightPalette || 'emerald-dark') };
  }

  global.NamazSchedule = {
    tyumenActive: tyumenActive,
    tyumenDay: tyumenDay,
    readingInfo: readingInfo,
    buildDay: buildDay,
    dateAt: dateAt,
    isLightPalette: isLightPalette,
    autoThemeState: autoThemeState
  };
})(typeof self !== 'undefined' ? self : this);

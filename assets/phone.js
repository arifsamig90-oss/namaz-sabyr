/*!
 * phone.js — приложение «Намаз» для телефона (phone.html).
 *
 * Расписание считается тем же движком, что и табло мечети (schedule.js,
 * tyumen.js), поэтому времена совпадают с табло. Если у мечети подключено
 * облако, настройки (икама, джума, «Читается в мечетях») приходят оттуда.
 *
 * В приложении для Android страница отдаёт список уведомлений на 120 дней
 * вперёд в window.NamazPhone (PhoneActivity.java), а будильники ставит
 * уже сам телефон — уведомления приходят и при закрытом приложении.
 */
(function () {
  'use strict';
  var PT = window.PrayerTimes;
  var Store = window.NamazStore;
  var Sched = window.NamazSchedule;
  var Native = window.NamazPhone || null;

  var $ = function (s) { return document.getElementById(s); };
  var MAIN_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var NAMES = { fajr: 'Фаджр', sunrise: 'Восход', dhuhr: 'Зухр', asr: 'Аср', maghrib: 'Магриб', isha: 'Иша', read: 'Читается в мечетях', jumuah: 'Джума', zenith: 'Зенит' };
  var ARABIC = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء', zenith: 'الزوال' };
  var WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  var WD_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var NOTIFY_DAYS = 120;

  function now() { return new Date(window.NamazTime ? NamazTime.now() : Date.now()); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function hm(d) { return d ? p2(d.getHours()) + ':' + p2(d.getMinutes()) : '--:--'; }
  function fmtLeft(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    if (cfg.display.showSeconds === false) {
      m = Math.ceil(s % 3600 / 60);
      if (m === 60) { h += 1; m = 0; }
      return h ? h + ' ч ' + p2(m) + ' мин' : m + ' мин';
    }
    return (h ? h + ':' + p2(m) : p2(m)) + ':' + p2(sec);
  }
  function sameDay(a, b) { return PT.dateKey(a) === PT.dateKey(b); }
  function prayerOf(day, id) {
    if (!day || !day.ok) return null;
    for (var i = 0; i < day.prayers.length; i++) if (day.prayers[i].id === id) return day.prayers[i];
    return null;
  }

  var cfg = Store.load();
  var viewDate = now();
  var monthDate = now();
  var today = null, tomorrow = null, todayKey = '';

  /* ---------- настройки уведомлений (только на этом телефоне) ---------- */
  var NKEY = 'namazPhone.notify.v1';
  var NDEFAULTS = {
    fajr:    { on: true,  sound: true,  before: 0 },
    sunrise: { on: false, sound: false, before: 0 },
    read:    { on: true,  sound: false, before: 0 },
    dhuhr:   { on: true,  sound: true,  before: 0 },
    asr:     { on: true,  sound: true,  before: 0 },
    maghrib: { on: true,  sound: true,  before: 0 },
    isha:    { on: true,  sound: true,  before: 0 },
    jumuah:  { on: true,  sound: false, before: 60 }
  };
  var NORDER = ['fajr', 'sunrise', 'read', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah'];
  function loadNotify() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(NKEY) || 'null'); } catch (e) { raw = null; }
    var out = {};
    NORDER.forEach(function (k) {
      var d = NDEFAULTS[k], r = (raw && raw[k]) || {};
      out[k] = {
        on: typeof r.on === 'boolean' ? r.on : d.on,
        sound: typeof r.sound === 'boolean' ? r.sound : d.sound,
        before: [0, 5, 10, 15, 20, 30, 45, 60, 90].indexOf(+r.before) !== -1 ? +r.before : d.before
      };
    });
    return out;
  }
  var notify = loadNotify();
  function saveNotify() {
    try { localStorage.setItem(NKEY, JSON.stringify(notify)); } catch (e) { /* не критично */ }
    scheduleNative();
  }

  /* ---------- шапка ---------- */
  function renderHead() {
    $('mosqueName').textContent = cfg.mosque.name || 'Мечеть';
    $('mosqueSub').textContent = [cfg.location.cityName ? 'г. ' + cfg.location.cityName : '', cfg.mosque.subtitle].filter(Boolean).join(' · ');
    document.title = 'Намаз — ' + (cfg.mosque.name || 'мечеть');
    var logo = $('logo');
    if (cfg.mosque.logoData) { logo.innerHTML = '<img alt="" src="' + esc(cfg.mosque.logoData) + '">'; return; }
    logo.textContent = cfg.mosque.logoEmoji || '🕌';
    var img = new Image();
    img.alt = '';
    img.onload = function () { logo.innerHTML = ''; logo.appendChild(img); };
    img.src = 'assets/logo.png';
  }

  /* ---------- «Сегодня» ---------- */
  function recompute() {
    var n = now();
    today = Sched.buildDay(cfg, n);
    tomorrow = Sched.buildDay(cfg, PT.addDays(n, 1));
    todayKey = PT.dateKey(n);
  }

  /* ближайшее событие: азан, икама или «Читается в мечетях» (сегодня и завтра) */
  function upcoming(n) {
    var list = [];
    [today, tomorrow].forEach(function (day) {
      if (!day || !day.ok) return;
      MAIN_IDS.forEach(function (id) {
        var p = prayerOf(day, id);
        if (!p) return;
        if (p.adhan) list.push({ at: p.adhan, kind: 'adhan', id: id, p: p, day: day });
        if (p.iqama) list.push({ at: p.iqama, kind: 'iqama', id: id, p: p, day: day });
      });
      if (day.read && !day.readHidden) list.push({ at: day.read, kind: 'read', id: 'read', day: day });
    });
    list.sort(function (a, b) { return a.at - b.at; });
    for (var i = 0; i < list.length; i++) if (list[i].at > n) return list[i];
    return null;
  }

  function renderHero(n) {
    var ev = upcoming(n);
    var hero = $('hero');
    hero.classList.toggle('iqama', !!(ev && ev.kind === 'iqama'));
    if (!ev) {
      $('nextLabel').textContent = 'Расписание';
      $('nextName').textContent = 'не построено';
      $('nextTime').textContent = '--:--';
      $('nextCount').textContent = '--:--';
      $('nextNote').textContent = '';
      return null;
    }
    var p = ev.p;
    if (ev.kind === 'iqama') {
      $('nextLabel').textContent = 'Икама';
      $('nextName').textContent = NAMES[ev.id];
      $('nextNote').textContent = 'азан был в ' + hm(p.adhan);
    } else if (ev.kind === 'read') {
      var f = prayerOf(ev.day, 'fajr');
      $('nextLabel').textContent = 'Скоро в мечетях';
      $('nextName').textContent = NAMES.read;
      $('nextNote').textContent = 'азан Фаджра в мечети' + (f && f.iqama ? ' · икама ' + hm(f.iqama) : '');
    } else {
      $('nextLabel').textContent = 'Следующий намаз';
      $('nextName').textContent = NAMES[ev.id] + (ev.day === tomorrow ? ' (завтра)' : '');
      var note = [];
      if (p.iqama && !(ev.id === 'fajr' && ev.day.fajrByRead)) note.push('икама ' + hm(p.iqama));
      if (ev.id === 'fajr' && ev.day.fajrByRead && ev.day.read) note.push('в мечетях читается в ' + hm(ev.day.read));
      if (ev.id === 'dhuhr' && ev.at.getDay() === 5 && cfg.jumuah.enabled && ev.day.jumuah.length) note.push('сегодня джума');
      $('nextNote').textContent = note.join(' · ');
    }
    $('nextTime').textContent = hm(ev.at);
    $('nextCount').textContent = fmtLeft(ev.at - n);
    return ev;
  }

  function rowHtml(cls, id, name, time, left, right) {
    return '<article class="ph-row ' + cls + '" data-id="' + id + '">' +
      '<div class="ph-row-name">' + esc(name) + (ARABIC[id] ? '<span class="ar">' + ARABIC[id] + '</span>' : '') + '</div>' +
      '<div class="ph-row-time">' + time + '</div>' +
      (left || right ? '<div class="ph-row-sub"><span>' + (left || '') + '</span><span class="iq">' + (right || '') + '</span></div>' : '') +
      '</article>';
  }

  function renderDay() {
    var d = viewDate;
    var isToday = sameDay(d, now());
    var day = isToday ? today : Sched.buildDay(cfg, d);
    $('gDate').textContent = (isToday ? 'Сегодня, ' : '') + d.getDate() + ' ' + MONTHS[d.getMonth()] + ', ' + WEEKDAYS[d.getDay()];
    $('hDate').textContent = cfg.display.showHijri ? PT.hijriText(d, cfg.calc.hijriOffset) : '';
    $('dayToday').hidden = isToday;

    var list = $('list');
    if (!day || !day.ok) {
      list.innerHTML = '<div class="ph-card">Расписание на этот день не построено.</div>';
      $('jumuahCard').hidden = true;
      return;
    }
    var html = '';
    var fajr = prayerOf(day, 'fajr');
    html += rowHtml('', 'fajr', NAMES.fajr, hm(fajr.adhan),
      day.fajrByRead ? 'начало времени' : '', fajr.iqama && !day.fajrByRead ? 'икама <b>' + hm(fajr.iqama) + '</b>' : '');
    if (day.read && !day.readHidden) {
      html += rowHtml('read', 'read', NAMES.read, hm(day.read),
        day.fajrByRead ? 'азан Фаджра в мечети' : esc(day.readNote || ''),
        day.fajrByRead && fajr.iqama ? 'икама <b>' + hm(fajr.iqama) + '</b>' : '');
    }
    var sr = prayerOf(day, 'sunrise');
    if (sr && cfg.display.showSunrise !== false) html += rowHtml('minor', 'sunrise', NAMES.sunrise, hm(sr.adhan));
    if (day.zenith && cfg.display.showZenith !== false) html += rowHtml('minor', 'zenith', NAMES.zenith, hm(day.zenith), 'солнечный полдень');
    ['dhuhr', 'asr', 'maghrib', 'isha'].forEach(function (id) {
      var p = prayerOf(day, id);
      if (!p) return;
      html += rowHtml('', id, NAMES[id], hm(p.adhan), '', p.iqama ? 'икама <b>' + hm(p.iqama) + '</b>' : '');
    });
    list.innerHTML = html;

    var jc = $('jumuahCard');
    var showJ = cfg.jumuah.enabled && day.jumuah.length && (d.getDay() === 5 || isToday);
    jc.hidden = !showJ;
    if (showJ) {
      $('jumuahList').innerHTML = day.jumuah.map(function (j) {
        return '<div>' + esc(j.label) + '<b>' + hm(j.time) + '</b></div>';
      }).join('') + (d.getDay() === 5 ? '' : '<div style="width:100%;font-size:13px">по пятницам</div>');
    }
    markRows();
  }

  /* подсветка: прошедшие — бледнее, ближайший — белая плитка (как на табло) */
  function markRows() {
    var rows = document.querySelectorAll('#list .ph-row');
    var n = now();
    var isToday = sameDay(viewDate, n);
    var ev = isToday ? upcoming(n) : null;
    var nextId = ev && ev.day === today ? ev.id : null;
    if (ev && ev.kind === 'read') nextId = 'read';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i], id = r.dataset.id;
      r.classList.remove('next', 'past');
      if (!isToday) continue;
      if (id === nextId) { r.classList.add('next'); continue; }
      var at = null;
      if (id === 'read') at = today.read;
      else if (id === 'zenith') at = today.zenith;
      else { var p = prayerOf(today, id); at = p && (p.iqama || p.adhan); }
      if (at && at < n) r.classList.add('past');
    }
  }

  /* ---------- «Месяц» ---------- */
  function renderMonth() {
    var y = monthDate.getFullYear(), m = monthDate.getMonth();
    $('monTitle').textContent = MONTHS_NOM[m] + ' ' + y;
    var days = new Date(y, m + 1, 0).getDate();
    var showRead = !!(cfg.reading && cfg.reading.show);
    var head = '<thead><tr><th></th><th>Фаджр</th>' + (showRead ? '<th>Ч</th>' : '') +
      '<th>Восх.</th><th>Зухр</th><th>Аср</th><th>Магр.</th><th>Иша</th></tr></thead>';
    var body = '<tbody>';
    var tk = PT.dateKey(now());
    for (var dd = 1; dd <= days; dd++) {
      var date = new Date(y, m, dd, 12, 0, 0, 0);
      var day = Sched.buildDay(cfg, date);
      var cls = (date.getDay() === 5 ? 'fri ' : '') + (PT.dateKey(date) === tk ? 'today' : '');
      body += '<tr class="' + cls + '"><td>' + dd + '<small>' + WD_SHORT[date.getDay()] + '</small></td>';
      if (!day || !day.ok) { body += '<td colspan="7">—</td></tr>'; continue; }
      body += '<td>' + hm(prayerOf(day, 'fajr').adhan) + '</td>';
      if (showRead) body += '<td>' + (day.read && !day.readHidden ? hm(day.read) : '–') + '</td>';
      ['sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(function (id) {
        var p = prayerOf(day, id);
        body += '<td>' + (p ? hm(p.adhan) : '') + '</td>';
      });
      body += '</tr>';
    }
    $('monthTable').innerHTML = head + body + '</tbody>';
  }

  /* ---------- уведомления ---------- */
  function events() {
    var out = [];
    var n = now(), nowMs = n.getTime();
    function add(at, id, kind, title, text, sound) {
      if (!at || at.getTime() <= nowMs) return;
      out.push({ at: at.getTime(), id: id, kind: kind, title: title, text: text, sound: !!sound });
    }
    function before(at, mins) { return at ? new Date(at.getTime() - mins * 60000) : null; }
    for (var i = 0; i < NOTIFY_DAYS; i++) {
      var date = PT.addDays(n, i);
      var day = Sched.buildDay(cfg, date);
      if (!day || !day.ok) continue;
      MAIN_IDS.forEach(function (id) {
        var s = notify[id], p = prayerOf(day, id);
        if (!s.on || !p || !p.adhan) return;
        var iq = p.iqama && !(id === 'fajr' && day.fajrByRead) ? ' · икама ' + hm(p.iqama) : '';
        add(p.adhan, id, 'adhan', 'Время намаза: ' + NAMES[id], 'Азан ' + hm(p.adhan) + iq, s.sound);
        if (s.before) add(before(p.adhan, s.before), id, 'before', 'Через ' + s.before + ' мин — ' + NAMES[id], 'Азан в ' + hm(p.adhan) + iq, false);
      });
      var sr = prayerOf(day, 'sunrise');
      if (notify.sunrise.on && sr && sr.adhan) {
        add(sr.adhan, 'sunrise', 'adhan', 'Восход солнца', 'Время Фаджра закончилось', notify.sunrise.sound);
        if (notify.sunrise.before) add(before(sr.adhan, notify.sunrise.before), 'sunrise', 'before',
          'Через ' + notify.sunrise.before + ' мин — восход', 'Успейте совершить Фаджр (восход в ' + hm(sr.adhan) + ')', false);
      }
      if (notify.read.on && day.read && !day.readHidden) {
        var f = prayerOf(day, 'fajr');
        var txt = day.fajrByRead ? 'Азан Фаджра в мечети' + (f && f.iqama ? ' · икама ' + hm(f.iqama) : '') : hm(day.read);
        add(day.read, 'read', 'adhan', NAMES.read, txt, notify.read.sound);
        if (notify.read.before) add(before(day.read, notify.read.before), 'read', 'before',
          'Через ' + notify.read.before + ' мин — ' + NAMES.read, txt, false);
      }
      if (notify.jumuah.on && date.getDay() === 5 && cfg.jumuah.enabled && day.jumuah.length) {
        var first = day.jumuah[0];
        var list = day.jumuah.map(function (j) { return j.label + ' ' + hm(j.time); }).join(' · ');
        add(before(first.time, notify.jumuah.before || 0), 'jumuah', 'jumuah', 'Сегодня джума', list, notify.jumuah.sound);
      }
    }
    /* проверка: phone.html?testIn=60 — пробный азан через 60 секунд */
    var t = /[?&]testIn=(\d+)/.exec(location.search);
    if (t) add(new Date(nowMs + t[1] * 1000), 'test', 'adhan', 'Проверка: время намаза', 'Пробное уведомление', true);
    out.sort(function (a, b) { return a.at - b.at; });
    return out;
  }

  var scheduleTimer = null;
  function scheduleNative() {
    if (!Native) return;
    clearTimeout(scheduleTimer);
    scheduleTimer = setTimeout(function () {
      try { Native.setEvents(JSON.stringify(events())); } catch (e) { if (window.console) console.error(e); }
    }, 300);
  }

  /* ---------- напоминания через Календарь (веб-версия, iPhone) ---------- */
  function icsTime(d) {
    return d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()) + 'T' +
      p2(d.getUTCHours()) + p2(d.getUTCMinutes()) + p2(d.getUTCSeconds()) + 'Z';
  }
  function icsText(t) { return String(t).replace(/[\\;,]/g, function (c) { return '\\' + c; }).replace(/\n/g, '\\n'); }
  function exportCalendar() {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sabyr//Namaz//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:' + icsText('Намаз — ' + (cfg.location.cityName || '')), 'X-APPLE-CALENDAR-COLOR:#E3BD62'];
    var stamp = icsTime(new Date()), count = 0, n = now();
    function ev(id, start, end, title, text, before) {
      if (!start || start <= n) return;
      lines.push('BEGIN:VEVENT', 'UID:' + id + '-' + PT.dateKey(start) + '@namaz-sabyr', 'DTSTAMP:' + stamp,
        'DTSTART:' + icsTime(start), 'DTEND:' + icsTime(end || new Date(start.getTime() + 10 * 60000)),
        'SUMMARY:' + icsText(title), 'DESCRIPTION:' + icsText(text), 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(title), 'TRIGGER:PT0M', 'END:VALARM');
      if (before) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText('Через ' + before + ' мин — ' + title), 'TRIGGER:-PT' + before + 'M', 'END:VALARM');
      lines.push('END:VEVENT');
      count++;
    }
    for (var i = 0; i < 30; i++) {
      var day = Sched.buildDay(cfg, PT.addDays(n, i));
      if (!day || !day.ok) continue;
      MAIN_IDS.forEach(function (id) {
        var st = notify[id], p = prayerOf(day, id);
        if (!st.on || !p || !p.adhan) return;
        var iq = p.iqama && !(id === 'fajr' && day.fajrByRead) ? p.iqama : null;
        ev(id, p.adhan, iq, NAMES[id], 'Азан ' + hm(p.adhan) + (iq ? ' · икама ' + hm(iq) : ''), st.before);
      });
      var sr = prayerOf(day, 'sunrise');
      if (notify.sunrise.on && sr) ev('sunrise', sr.adhan, null, 'Восход', 'Время Фаджра закончилось', notify.sunrise.before);
      if (notify.read.on && day.read && !day.readHidden) {
        var f = prayerOf(day, 'fajr');
        ev('read', day.read, f && f.iqama, NAMES.read, day.fajrByRead && f && f.iqama ? 'Азан Фаджра в мечети · икама ' + hm(f.iqama) : '', notify.read.before);
      }
      if (notify.jumuah.on && day.date.getDay() === 5 && cfg.jumuah.enabled && day.jumuah.length) {
        ev('jumuah', day.jumuah[0].time, null, 'Джума', day.jumuah.map(function (j) { return j.label + ' ' + hm(j.time); }).join(' · '), notify.jumuah.before);
      }
    }
    lines.push('END:VCALENDAR');
    var text = lines.join('\r\n');
    if (!count) { window.alert('Нет событий: включите хотя бы один намаз в списке ниже.'); return; }
    /* iPhone открывает календарный файл сразу с кнопкой «Добавить все» */
    var a = document.createElement('a');
    a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text);
    a.download = 'namaz.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  var BEFORE_OPTS = [0, 5, 10, 15, 20, 30, 45, 60, 90];
  function renderNotify() {
    var rows = '';
    NORDER.forEach(function (k) {
      var s = notify[k];
      var title = k === 'jumuah' ? 'Джума (по пятницам)' : NAMES[k];
      var opts = '';
      if (k === 'jumuah') {
        opts += '<label>напомнить за <select data-k="' + k + '" data-f="before">' +
          [0, 30, 60, 90].map(function (v) { return '<option value="' + v + '"' + (v === s.before ? ' selected' : '') + '>' + (v ? v + ' мин' : 'к хутбе') + '</option>'; }).join('') +
          '</select> до 1‑й хутбы</label>';
      } else {
        if (Native) opts += '<label><input type="checkbox" class="ph-check" data-k="' + k + '" data-f="sound"' + (s.sound ? ' checked' : '') + '> азан со звуком</label>';
        opts += '<label>напомнить заранее <select data-k="' + k + '" data-f="before">' +
          BEFORE_OPTS.map(function (v) { return '<option value="' + v + '"' + (v === s.before ? ' selected' : '') + '>' + (v ? 'за ' + v + ' мин' : 'нет') + '</option>'; }).join('') +
          '</select></label>';
      }
      rows += '<div class="ph-set' + (s.on ? '' : ' off') + '">' +
        '<div class="ph-set-head"><span class="ph-set-name">' + esc(title) + '</span>' +
        '<label class="ph-switch"><input type="checkbox" data-k="' + k + '" data-f="on"' + (s.on ? ' checked' : '') + ' aria-label="' + esc(title) + '"><span></span></label></div>' +
        '<div class="ph-set-opts">' + opts + '</div></div>';
    });
    $('notifyRows').innerHTML = rows;
    renderPerms();
    renderAdhanName();
  }

  function renderPerms() {
    var box = $('permBox');
    if (!Native) {
      box.innerHTML = '<p class="ph-text">Веб-страница не может сама присылать уведомления. Добавьте намазы в Календарь — ' +
        'телефон (и Apple Watch) напомнит о каждом, даже когда приложение закрыто. Ниже выберите, о чём напоминать.</p>' +
        '<div class="ph-btns"><button type="button" class="ph-btn" id="icsBtn">Добавить в Календарь на 30 дней</button></div>' +
        '<p class="ph-hint">Раз в месяц добавляйте снова (повторное добавление обновит события). На Android в приложении уведомления и азан работают сами.</p>';
      $('icsBtn').onclick = exportCalendar;
      $('soundCard').hidden = true;
      return;
    }
    var st = {};
    try { st = JSON.parse(Native.status()); } catch (e) { st = {}; }
    var html = '';
    if (st.notif === false) html += '<div class="ph-perm"><span>Уведомления выключены для приложения</span><button type="button" class="ph-btn small" data-perm="notif">Разрешить</button></div>';
    if (st.exact === false) html += '<div class="ph-perm"><span>Нужно разрешение «Будильники и напоминания», иначе уведомления опаздывают</span><button type="button" class="ph-btn small" data-perm="exact">Открыть</button></div>';
    if (st.battery === false) html += '<div class="ph-perm"><span>Экономия батареи может глушить уведомления</span><button type="button" class="ph-btn small" data-perm="battery">Отключить</button></div>';
    box.innerHTML = html;
  }

  /* выбор азана: встроенные записи (Wikimedia Commons) или свой файл с телефона */
  function renderAdhanName() {
    if (!Native) return;
    var list = [], choice = '', own = '';
    try { list = JSON.parse(Native.adhanList()); } catch (e) { list = []; }
    try { choice = Native.adhanChoice(); } catch (e) { choice = ''; }
    try { own = Native.adhanName(); } catch (e) { own = ''; }
    var items = list.map(function (a) { return { id: a.id, name: a.name, note: '' }; });
    if (own) items.push({ id: 'own', name: 'Свой файл', note: own });
    $('adhanList').innerHTML = items.map(function (a) {
      return '<label class="ph-choice"><input type="radio" name="adhan" value="' + esc(a.id) + '"' +
        (a.id === choice ? ' checked' : '') + '><span>' + esc(a.name) +
        (a.note ? '<small>' + esc(a.note) + '</small>' : '') + '</span></label>';
    }).join('');
    var cr = $('credits');
    cr.hidden = !list.length;
    cr.textContent = 'Записи азана — Wikimedia Commons: ' + list.map(function (a) { return a.credit; }).join('; ') + '.';
  }

  function renderAbout() {
    var meta = today && today.meta ? today.meta.methodName + ', Аср: ' + today.meta.asrName : '';
    var parts = [meta || 'Расчёт по настройкам мечети'];
    if (cfg.reading && cfg.reading.show) parts.push('«Читается в мечетях» — ' + (today && today.readNote ? today.readNote : 'по настройкам мечети'));
    parts.push(window.NamazCloud && NamazCloud.ready(cfg.cloud) ? 'Настройки мечети обновляются через интернет.' : 'Время совпадает с табло мечети.');
    $('aboutText').textContent = parts.join('. ').replace(/\.\./g, '.');
  }

  /* ---------- общее ---------- */
  function renderAll() {
    recompute();
    renderHead();
    renderDay();
    renderHero(now());
    if (!$('viewMonth').hidden) renderMonth();
    renderNotify();
    renderAbout();
  }

  var VIEWS = ['viewToday', 'viewMonth', 'viewQibla', 'viewNotify', 'viewSettings'];
  function showView(id) {
    VIEWS.forEach(function (v) { $(v).hidden = v !== id; });
    var tabs = document.querySelectorAll('.ph-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].dataset.view === id);
    if (id === 'viewMonth') renderMonth();
    if (id === 'viewNotify') renderPerms();
    window.scrollTo(0, 0);
    try { window.dispatchEvent(new CustomEvent('ph-view', { detail: id })); } catch (e) { /* старый браузер */ }
  }

  document.querySelector('.ph-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('.ph-tab');
    if (b) showView(b.dataset.view);
  });
  $('dayPrev').addEventListener('click', function () { viewDate = PT.addDays(viewDate, -1); renderDay(); });
  $('dayNext').addEventListener('click', function () { viewDate = PT.addDays(viewDate, 1); renderDay(); });
  $('dayToday').addEventListener('click', function () { viewDate = now(); renderDay(); });
  $('monPrev').addEventListener('click', function () { monthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1); renderMonth(); });
  $('monNext').addEventListener('click', function () { monthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1); renderMonth(); });

  $('notifyRows').addEventListener('change', function (e) {
    var t = e.target, k = t.dataset.k, f = t.dataset.f;
    if (!k || !f) return;
    notify[k][f] = f === 'before' ? +t.value : t.checked;
    if (f === 'on') t.closest('.ph-set').classList.toggle('off', !t.checked);
    saveNotify();
  });
  $('permBox').addEventListener('click', function (e) {
    var b = e.target.closest('[data-perm]');
    if (!b || !Native) return;
    if (b.dataset.perm === 'notif') Native.requestNotif();
    if (b.dataset.perm === 'exact') Native.openExact();
    if (b.dataset.perm === 'battery') Native.openBattery();
  });
  $('pickAdhan').addEventListener('click', function () { if (Native) Native.pickAdhan(); });
  $('testAdhan').addEventListener('click', function () { if (Native) Native.testAdhan(); });
  $('stopAdhan').addEventListener('click', function () { if (Native) Native.stopAdhan(); });
  $('adhanList').addEventListener('change', function (e) {
    if (Native && e.target.name === 'adhan') Native.setAdhanChoice(e.target.value);
  });

  /* вызовы из приложения */
  window.NamazPhoneAdhanPicked = function () { renderAdhanName(); };
  window.NamazPhoneResume = function () {
    if (!sameDay(viewDate, now()) && $('dayToday').hidden) viewDate = now();
    renderAll();
    scheduleNative();
  };

  /* настройки мечети изменились (облако) — пересчитываем и переставляем уведомления */
  window.addEventListener('namaz-config', function () { cfg = Store.load(); renderAll(); scheduleNative(); });
  if (window.NamazCloud && NamazCloud.ready(cfg.cloud)) {
    NamazCloud.watch(cfg, function (json) { Store.applyExternal(json); });
  }

  /* для phone-settings.js: настройки, кибла */
  window.NamazPhoneApp = {
    cfg: function () { return cfg; },
    native: Native,
    showView: showView,
    save: function (next) {
      Store.save(next);
      cfg = Store.load();
      renderAll();
      scheduleNative();
    }
  };

  if (!Native) {
    var nt = document.querySelector('[data-view="viewNotify"]');
    if (nt && nt.lastChild) nt.lastChild.nodeValue = 'Напоминания';
  }

  renderAll();
  scheduleNative();

  window.NamazTick(function () {
    var n = now();
    if (PT.dateKey(n) !== todayKey) {
      if (sameDay(viewDate, PT.addDays(n, -1))) viewDate = n;
      renderAll();
      scheduleNative();
      return;
    }
    renderHero(n);
    if (n.getSeconds() === 0) markRows();
  });
})();

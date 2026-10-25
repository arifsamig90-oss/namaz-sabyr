/*!
 * calendar.js — страница «Расписание на месяц» (печатный формат, как в книжках мечетей).
 */
(function () {
  'use strict';
  var PT = window.PrayerTimes;
  var Store = window.NamazStore;
  var Sched = window.NamazSchedule;
  var $ = function (s) { return document.querySelector(s); };

  var cfg = Store.load();
  document.documentElement.dataset.theme = cfg.display.theme || 'dark';
  document.documentElement.dataset.palette = cfg.display.palette || 'emerald-dark';
  document.documentElement.dataset.accent = cfg.display.accent || 'emerald';
  var now = new Date();
  var state = {
    y: now.getFullYear(),
    m: now.getMonth(),
    showIqama: false,
    showRead: !!(cfg.reading && cfg.reading.show),
    showZenith: !(cfg.display && cfg.display.showZenith === false)
  };

  var params = new URLSearchParams(window.location.search);
  var mm = (params.get('month') || '').match(/^(\d{4})-(\d{2})$/);
  if (mm) {
    var y = parseInt(mm[1], 10), mo = parseInt(mm[2], 10);
    if (y >= 1900 && y <= 2200 && mo >= 1 && mo <= 12) { state.y = y; state.m = mo - 1; }
  }

  function monthTitle() {
    var d = new Date(state.y, state.m, 1);
    var s = '';
    try {
      s = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(d);
    } catch (e) { s = (state.m + 1) + '.' + state.y; }
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function syncUrl() {
    try {
      window.history.replaceState(null, '', '?month=' + state.y + '-' + ('0' + (state.m + 1)).slice(-2));
    } catch (e) { /* не критично */ }
  }

  function render() {
    var title = monthTitle();
    var city = (cfg.location && cfg.location.cityName) || '';
    var tyStyle = Sched.tyumenActive(cfg);

    document.title = 'Расписание намаза — ' + title;

    var first = new Date(state.y, state.m, 1);
    var last = new Date(state.y, state.m + 1, 0);
    var h1 = PT.hijriParts(first, cfg.calc.hijriOffset || 0);
    var h2 = PT.hijriParts(last, cfg.calc.hijriOffset || 0);
    var hijriTxt = '';
    if (h1 && h2) {
      hijriTxt = (h1.month === h2.month && h1.year === h2.year)
        ? (h1.name + ' ' + h1.year)
        : (h1.name + '—' + h2.name + ' ' + h2.year);
    }
    $('#calTitle').textContent = 'ВРЕМЯ НАМАЗА ДЛЯ Г. ' + String(city).toUpperCase() + ' НА ' + title.toUpperCase();
    $('#calSub').textContent = hijriTxt ? '(' + hijriTxt.toUpperCase() + ')' : '';
    $('#monthInput').value = state.y + '-' + ('0' + (state.m + 1)).slice(-2);

    /* столбцы */
    var cols = [];
    cols.push({ id: 'day', title: 'Дата' });
    cols.push({ id: 'hijri', title: 'Хиджра' });
    cols.push({ id: 'suhoor', title: tyStyle ? 'Завершение сухура' : 'Фаджр' });
    if (state.showRead) cols.push({ id: 'read', title: 'Читается в мечетях' });
    cols.push({ id: 'sunrise', title: tyStyle ? 'Восход солнца' : 'Восход' });
    if (state.showZenith) cols.push({ id: 'zenith', title: 'Зенит' });
    ['dhuhr', 'asr', 'maghrib', 'isha'].forEach(function (id) {
      cols.push({ id: id, title: PT.PRAYER_NAMES[id] });
    });
    var jEnabled = cfg.jumuah && cfg.jumuah.enabled;
    if (jEnabled) cols.push({ id: 'jumuah', title: 'Джума' });

    $('#calHead').innerHTML = cols.map(function (c) { return '<th>' + c.title + '</th>'; }).join('');

    var tbody = $('#calBody');
    tbody.innerHTML = '';
    var days = last.getDate();
    var todayKey = PT.dateKey(now);
    var wdFmt = null;
    try { wdFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }); } catch (e) { wdFmt = null; }

    function cellFor(s, id) {
      if (!s.ok) return '—';
      var p = null;
      s.prayers.forEach(function (x) { if (x.id === id) p = x; });
      if (!p || !p.adhan) return '—';
      var t = PT.fmtHM(p.adhan);
      if (state.showIqama && p.iqama) t += ' / ' + PT.fmtHM(p.iqama);
      return t;
    }

    for (var d = 1; d <= days; d++) {
      var date = new Date(state.y, state.m, d);
      var s = Sched.buildDay(cfg, date);
      var tr = document.createElement('tr');
      var cls = [];
      if (PT.dateKey(date) === todayKey) cls.push('today');
      if (date.getDay() === 5) cls.push('fri');
      if (cls.length) tr.className = cls.join(' ');

      var cells = [];
      var wd = wdFmt ? wdFmt.format(date) : '';
      cells.push('<td class="day">' + d + (wd ? ' <span class="wd">' + wd + '</span>' : '') + '</td>');
      var hj = PT.hijriParts(date, cfg.calc.hijriOffset || 0);
      cells.push('<td>' + (hj ? '<span class="hj">' + hj.day + ' ' + hj.name + '</span>' : '') + '</td>');
      cells.push('<td>' + cellFor(s, 'fajr') + '</td>');
      if (state.showRead) {
        var rtxt = '—';
        if (s.ok && !s.readHidden && s.read) rtxt = PT.fmtHM(s.read);
        cells.push('<td>' + rtxt + '</td>');
      }
      cells.push('<td>' + cellFor(s, 'sunrise') + '</td>');
      if (state.showZenith) {
        cells.push('<td>' + (s.ok && s.zenith ? PT.fmtHM(s.zenith) : '—') + '</td>');
      }
      cells.push('<td>' + cellFor(s, 'dhuhr') + '</td>');
      cells.push('<td>' + cellFor(s, 'asr') + '</td>');
      cells.push('<td>' + cellFor(s, 'maghrib') + '</td>');
      cells.push('<td>' + cellFor(s, 'isha') + '</td>');
      if (jEnabled) {
        var jt = '';
        if (date.getDay() === 5 && s.ok && s.jumuah.length) {
          jt = s.jumuah.map(function (j) { return PT.fmtHM(j.time); }).join(', ');
        }
        cells.push('<td>' + jt + '</td>');
      }
      tr.innerHTML = cells.join('');
      tbody.appendChild(tr);
    }

    var sample = Sched.buildDay(cfg, new Date(state.y, state.m, 1));
    var meta = (cfg.mosque.name || 'Мечеть');
    if (city) meta += ' · ' + city;
    if (sample.ok) {
      meta += ' · ' + sample.meta.methodName;
      if (sample.meta.tyumen) meta += sample.meta.exact ? '' : ' (2029+ — продолжение расчёта)';
    }
    if (state.showRead && cfg.reading && cfg.reading.mode === 'sunrise' && !tyStyle) {
      meta += ' · «Читается»: восход − ' + cfg.reading.nmins + ' мин';
    }
    if (state.showIqama) meta += ' · формат «азан / икама»';
    meta += ' · время по часовому поясу устройства';
    $('#calMeta').textContent = meta;
  }

  $('#prevBtn').addEventListener('click', function () {
    state.m -= 1;
    if (state.m < 0) { state.m = 11; state.y -= 1; }
    syncUrl(); render();
  });
  $('#nextBtn').addEventListener('click', function () {
    state.m += 1;
    if (state.m > 11) { state.m = 0; state.y += 1; }
    syncUrl(); render();
  });
  $('#monthInput').addEventListener('change', function () {
    var v = this.value.match(/^(\d{4})-(\d{2})$/);
    if (!v) return;
    state.y = parseInt(v[1], 10);
    state.m = parseInt(v[2], 10) - 1;
    syncUrl(); render();
  });
  $('#iqamaCheck').addEventListener('change', function () {
    state.showIqama = this.checked;
    render();
  });
  $('#readCheck').addEventListener('change', function () {
    state.showRead = this.checked;
    render();
  });
  $('#zenithCheck').addEventListener('change', function () {
    state.showZenith = this.checked;
    render();
  });
  $('#printBtn').addEventListener('click', function () { window.print(); });

  $('#iqamaCheck').checked = state.showIqama;
  $('#readCheck').checked = state.showRead;
  $('#zenithCheck').checked = state.showZenith;

  render();
})();

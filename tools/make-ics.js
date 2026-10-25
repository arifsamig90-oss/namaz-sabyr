#!/usr/bin/env node
/*!
 * make-ics.js — календарь намазов мечети «Сабыр» для подписки на iPhone.
 *
 *   TZ=Asia/Yekaterinburg node tools/make-ics.js
 *
 * Считает расписание тем же движком, что табло и приложение (assets/*.js),
 * с настройками мечети по умолчанию, на 120 дней вперёд, и пишет
 * calendar/sabyr.ics. iPhone подписывается на него (webcal://…) и сам
 * обновляет раз в сутки. Файл пересобирается раз в месяц (GitHub Actions).
 */
'use strict';
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
global.self = global;
global.window = global;
global.localStorage = { getItem: function () { return null; }, setItem: function () {} };
require(path.join(root, 'assets/store.js'));
global.PrayerTimes = require(path.join(root, 'assets/prayer-times.js'));
var ts = require(path.join(root, 'assets/tyumen.js'));
if (ts && !global.TyumenSchedule) global.TyumenSchedule = ts;
require(path.join(root, 'assets/schedule.js'));

var PT = global.PrayerTimes, Sched = global.NamazSchedule, cfg = global.NamazStore.defaults();
var DAYS = 120;
var NAMES = { fajr: 'Фаджр', dhuhr: 'Зухр', asr: 'Аср', maghrib: 'Магриб', isha: 'Иша' };

function p2(n) { return (n < 10 ? '0' : '') + n; }
function hm(d) { return p2(d.getHours()) + ':' + p2(d.getMinutes()); }
function utc(d) {
  return d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()) + 'T' +
    p2(d.getUTCHours()) + p2(d.getUTCMinutes()) + p2(d.getUTCSeconds()) + 'Z';
}
function text(t) { return String(t).replace(/[\\;,]/g, function (c) { return '\\' + c; }).replace(/\n/g, '\\n'); }
/* строки длиннее 75 байт по правилам iCalendar переносятся */
function fold(line) {
  var out = [], buf = Buffer.from(line, 'utf8'), start = 0, limit = 75;
  while (buf.length - start > limit) {
    var end = start + limit;
    while (end > start && (buf[end] & 0xC0) === 0x80) end--; // не рвём букву пополам
    out.push(buf.slice(start, end).toString('utf8'));
    start = end;
    limit = 74;
  }
  out.push(buf.slice(start).toString('utf8'));
  return out.join('\r\n ');
}

var now = new Date();
var stamp = utc(now);
var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sabyr//Namaz//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
  'X-WR-CALNAME:Намаз — мечеть «Сабыр»', 'X-WR-CALDESC:Время намаза\\, икама и джума мечети «Сабыр»\\, Тюмень',
  'X-WR-TIMEZONE:Asia/Yekaterinburg', 'X-APPLE-CALENDAR-COLOR:#E3BD62',
  'REFRESH-INTERVAL;VALUE=DURATION:P1D', 'X-PUBLISHED-TTL:P1D'];
var count = 0;
function ev(id, start, end, title, desc, alarmBefore) {
  L.push('BEGIN:VEVENT', 'UID:' + id + '-' + PT.dateKey(start) + '@namaz-sabyr', 'DTSTAMP:' + stamp,
    'DTSTART:' + utc(start), 'DTEND:' + utc(end || new Date(start.getTime() + 10 * 60000)),
    'SUMMARY:' + text(title), 'DESCRIPTION:' + text(desc), 'TRANSP:TRANSPARENT',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + text(title),
    'TRIGGER:' + (alarmBefore ? '-PT' + alarmBefore + 'M' : 'PT0M'), 'END:VALARM', 'END:VEVENT');
  count++;
}

var today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
for (var i = -1; i < DAYS; i++) {
  var date = PT.addDays(today, i);
  var day = Sched.buildDay(cfg, date);
  if (!day || !day.ok) continue;
  day.prayers.forEach(function (p) {
    if (!NAMES[p.id] || !p.adhan) return;
    var byRead = p.id === 'fajr' && day.fajrByRead;
    var iq = p.iqama && !byRead ? p.iqama : null;
    ev(p.id, p.adhan, iq, NAMES[p.id], 'Азан ' + hm(p.adhan) + (iq ? ' · икама ' + hm(iq) : ''));
  });
  if (day.read && !day.readHidden) {
    var f = day.prayers[0];
    ev('read', day.read, f.iqama, 'Читается в мечетях',
      day.fajrByRead ? 'Азан Фаджра в мечети · икама ' + hm(f.iqama) : '');
  }
  if (date.getDay() === 5 && cfg.jumuah.enabled && day.jumuah.length) {
    ev('jumuah', day.jumuah[0].time, null, 'Джума',
      day.jumuah.map(function (j) { return j.label + ' ' + hm(j.time); }).join(' · '), 60);
  }
}
L.push('END:VCALENDAR');

var out = path.join(root, 'calendar', 'sabyr.ics');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, L.map(fold).join('\r\n') + '\r\n');
console.log('calendar/sabyr.ics: ' + count + ' событий, ' + DAYS + ' дней, TZ=' + (process.env.TZ || 'системный'));

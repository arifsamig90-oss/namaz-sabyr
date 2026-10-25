/*!
 * weather.js — погода на табло (Open-Meteo: бесплатно, без ключей и регистрации).
 * Обновляется раз в 20 минут; без интернета показывает последнее значение
 * (не старше 3 часов), иначе блок скрывается.
 */
(function (global) {
  'use strict';
  var CACHE_KEY = 'namazTablo.weather.v1';
  var REFRESH_MS = 20 * 60000;
  var MAX_AGE_MS = 3 * 3600000;

  var G = "fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'";
  var SUN = "<circle cx='12' cy='12' r='4.2'/><path d='M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6'/>";
  var MOON = "<path d='M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'/>";
  var CLOUD = "<path d='M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.4 11.1 3.7 3.7 0 0 0 7 18.5z'/>";
  var ICONS = {
    clear: function (day) { return day ? SUN : MOON; },
    partly: function (day) {
      return (day ? "<g transform='translate(-3 -4) scale(.75)'>" + SUN + "</g>" : "<g transform='translate(-2 -4) scale(.7)'>" + MOON + "</g>") +
        "<path d='M9 20h9a3.4 3.4 0 0 0 .5-6.75A5 5 0 0 0 9 13.5 3.25 3.25 0 0 0 9 20z'/>";
    },
    cloudy: function () { return CLOUD; },
    fog: function () { return "<path d='M4 9h16M3 13h18M5 17h14M8 21h8'/>"; },
    rain: function () { return "<g transform='translate(0 -3)'>" + CLOUD + "</g><path d='M8 19l-1 2.5M12 19l-1 2.5M16 19l-1 2.5'/>"; },
    snow: function () { return "<g transform='translate(0 -3)'>" + CLOUD + "</g><path d='M8 20.5h.01M12 19.5h.01M16 20.5h.01M10 22.5h.01M14 22.5h.01' stroke-width='2.6'/>"; },
    storm: function () { return "<g transform='translate(0 -3)'>" + CLOUD + "</g><path d='M12.5 16l-2.5 3.5h3l-2 3.5'/>"; }
  };

  function kind(code) {
    if (code === 0) return ['clear', 'Ясно'];
    if (code === 1) return ['partly', 'Малооблачно'];
    if (code === 2) return ['partly', 'Переменная облачность'];
    if (code === 3) return ['cloudy', 'Пасмурно'];
    if (code === 45 || code === 48) return ['fog', 'Туман'];
    if (code >= 51 && code <= 57) return ['rain', 'Морось'];
    if (code >= 61 && code <= 67) return ['rain', 'Дождь'];
    if (code >= 80 && code <= 82) return ['rain', 'Ливень'];
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['snow', 'Снег'];
    if (code >= 95) return ['storm', 'Гроза'];
    return ['cloudy', ''];
  }

  function readCache() {
    try { return JSON.parse(global.localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; }
  }
  function writeCache(v) {
    try { global.localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch (e) { /* не критично */ }
  }

  function signed(t) {
    var r = Math.round(t);
    return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + '°';
  }

  function render(el, w) {
    if (!w || Date.now() - w.at > MAX_AGE_MS) { el.hidden = true; return; }
    var k = kind(w.code);
    el.hidden = false;
    el.innerHTML =
      "<svg class='wx-ico' viewBox='0 0 24 24' aria-hidden='true'><g " + G + ">" + ICONS[k[0]](w.day) + "</g></svg>" +
      "<span class='wx-t'>" + signed(w.temp) + "</span>" +
      "<span class='wx-d'>" + k[1].toLowerCase() + "</span>";
    el.title = 'Погода: ' + k[1] + ', ' + signed(w.temp);
  }

  function load(lat, lng, done) {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) + '&longitude=' + lng.toFixed(4) +
      '&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.timeout = 15000;
    xhr.onload = function () {
      try {
        var j = JSON.parse(xhr.responseText);
        done({
          at: Date.now(), lat: lat, lng: lng,
          temp: j.current.temperature_2m, code: j.current.weather_code, day: j.current.is_day === 1,
          min: j.daily && j.daily.temperature_2m_min ? j.daily.temperature_2m_min[0] : null,
          max: j.daily && j.daily.temperature_2m_max ? j.daily.temperature_2m_max[0] : null
        });
      } catch (e) { done(null); }
    };
    xhr.onerror = xhr.ontimeout = function () { done(null); };
    xhr.send();
  }

  var timer = null;
  /* start(el, cfg) — показать погоду для координат из настроек (или спрятать, если выключено) */
  function start(el, cfg) {
    if (timer) { clearInterval(timer); timer = null; }
    var on = cfg && cfg.display && cfg.display.weather !== false;
    var lat = cfg && cfg.location && +cfg.location.lat, lng = cfg && cfg.location && +cfg.location.lng;
    if (!on || !isFinite(lat) || !isFinite(lng)) { el.hidden = true; return; }
    var cached = readCache();
    if (cached && Math.abs(cached.lat - lat) < 0.01 && Math.abs(cached.lng - lng) < 0.01) render(el, cached);
    else el.hidden = true;
    function refresh() {
      load(lat, lng, function (w) {
        if (w) { writeCache(w); render(el, w); } else render(el, readCache());
      });
    }
    refresh();
    timer = setInterval(refresh, REFRESH_MS);
  }

  global.NamazWeather = { start: start };
})(typeof self !== 'undefined' ? self : this);

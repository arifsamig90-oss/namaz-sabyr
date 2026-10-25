/*!
 * admin.js — логика страницы настроек (admin.html).
 */
(function () {
  'use strict';
  var PT = window.PrayerTimes;
  var Store = window.NamazStore;
  var Sched = window.NamazSchedule;
  var CITIES = window.CITIES || [];
  var $ = function (s) { return document.querySelector(s); };

  var cfg = Store.load();
  var PRAYER_IDS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var IQAMA_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  /* ---------- статус и сохранение ---------- */

  var statusEl = $('#saveStatus');
  var statusTimer = null;

  function flashSaved() {
    statusEl.textContent = 'Сохранено ✓';
    statusEl.classList.add('ok');
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(function () {
      statusEl.textContent = 'Автосохранение включено';
      statusEl.classList.remove('ok');
    }, 2500);
  }

  function persist() {
    Store.save(cfg);
    if (Store.remote) {
      statusEl.textContent = 'Отправка на табло…';
      statusEl.classList.remove('ok');
    } else {
      flashSaved();
    }
    schedulePreview();
    cloudAutoPush();
  }

  var persistTimer = null;
  function persistSoon() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(persist, 350);
  }

  function bind(el, fn, soon) {
    var handler = function () { fn(); (soon ? persistSoon : persist)(); };
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  }

  function clampInt(v, min, max, def) {
    var x = parseInt(v, 10);
    if (!isFinite(x)) return def;
    return Math.min(max, Math.max(min, x));
  }

  function clampFloat(v, min, max, def) {
    var x = parseFloat(v);
    if (!isFinite(x)) return def;
    return Math.min(max, Math.max(min, x));
  }

  /* ---------- тема ---------- */

  function applyTheme() {
    document.documentElement.dataset.theme = cfg.display.theme;
    document.documentElement.dataset.palette = cfg.display.palette || 'emerald-dark';
    document.documentElement.dataset.accent = cfg.display.accent;
  }

  var LIGHT_PALETTES = ['cream', 'sand', 'mint'];

  function setPalette(id) {
    cfg.display.palette = id;
    cfg.display.theme = LIGHT_PALETTES.indexOf(id) !== -1 ? 'light' : 'dark';
    applyTheme();
  }

  function syncSwatches() {
    Array.prototype.forEach.call(document.querySelectorAll('.swatch'), function (s) {
      s.classList.toggle('active', s.dataset.accent === cfg.display.accent);
    });
  }

  function syncBgFields() {
    var on = cfg.display.bg.mode !== 'theme';
    $('#bgDim').disabled = !on;
    $('#bgBlur').disabled = !on;
  }

  function syncAutoFields() {
    var a = cfg.display.autoTheme;
    var on = a.enabled;
    $('#atDay').disabled = !on;
    $('#atNight').disabled = !on;
    $('#atMode').disabled = !on;
    $('#atDayStart').disabled = !on;
    $('#atNightStart').disabled = !on;
    Array.prototype.forEach.call(document.querySelectorAll('.at-clock'), function (el) {
      el.hidden = a.mode === 'sun';
    });
  }

  function paletteName(id) {
    var sel = $('#palette');
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === id) return sel.options[i].textContent;
    }
    return id;
  }

  function updateAtStatus(now, s) {
    var el = $('#atStatus');
    if (!el) return;
    var a = cfg.display.autoTheme;
    if (!a.enabled) {
      el.textContent = 'Авто‑смена выключена — тема всегда «' + paletteName(cfg.display.palette) + '».';
      return;
    }
    var st = Sched.autoThemeState(cfg, now, s);
    if (!st) return;
    var txt = 'Сейчас: ' + (st.day ? 'дневная' : 'ночная') + ' тема («' + paletteName(st.palette) + '»)';
    txt += a.mode === 'clock'
      ? ' · переключение в ' + (st.day ? a.nightStart : a.dayStart)
      : ' · переключение по восходу/закату';
    el.textContent = txt;
  }

  function updateBgPreview() {
    var p = $('#bgPreview');
    var bg = cfg.display.bg;
    var uri = window.NamazBackgrounds ? window.NamazBackgrounds.uriFor(bg.mode, bg.image) : (bg.mode === 'image' ? bg.image : null);
    if (uri) {
      p.hidden = false;
      p.style.backgroundImage = 'url("' + uri + '")';
      p.style.setProperty('--bg-preview-dim', (bg.dim / 100).toFixed(2));
    } else {
      p.hidden = true;
      p.style.backgroundImage = '';
    }
  }

  /* ---------- заполнение формы ---------- */

  function buildCityOptions() {
    var sel = $('#citySelect');
    sel.innerHTML = '';
    var groups = {};
    CITIES.forEach(function (c) { (groups[c.region] = groups[c.region] || []).push(c); });
    Object.keys(groups).forEach(function (region) {
      var og = document.createElement('optgroup');
      og.label = region;
      groups[region].forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.name;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    var custom = document.createElement('option');
    custom.value = '__custom';
    custom.textContent = '— Другое место (координаты вручную) —';
    sel.appendChild(custom);
  }

  function buildMethodOptions() {
    var sel = $('#method');
    sel.innerHTML = '';
    Object.keys(PT.METHODS).forEach(function (id) {
      var o = document.createElement('option');
      o.value = id;
      o.textContent = PT.METHODS[id].name;
      sel.appendChild(o);
    });
  }

  function buildAdjustRows() {
    var wrap = $('#adjustRows');
    wrap.innerHTML = '';
    PRAYER_IDS.forEach(function (id) {
      var d = document.createElement('div');
      d.className = 'field mini';
      d.innerHTML = '<label>' + PT.PRAYER_NAMES[id] + ', мин</label>' +
        '<input type="number" min="-60" max="60" step="1" data-adj="' + id + '">';
      wrap.appendChild(d);
      var input = d.querySelector('input');
      input.value = cfg.calc.adjustments[id] || 0;
      bind(input, function () {
        cfg.calc.adjustments[id] = clampInt(input.value, -60, 60, 0);
        input.value = cfg.calc.adjustments[id];
      });
    });
  }

  function buildManualTimes() {
    var wrap = $('#manualTimes');
    wrap.innerHTML = '';
    PRAYER_IDS.forEach(function (id) {
      var d = document.createElement('div');
      d.className = 'field mini';
      d.innerHTML = '<label>' + PT.PRAYER_NAMES[id] + '</label>' +
        '<input type="time" data-manual="' + id + '">';
      wrap.appendChild(d);
      var input = d.querySelector('input');
      input.value = cfg.manual.times[id] || '';
      bind(input, function () {
        if (input.value) cfg.manual.times[id] = input.value;
      });
    });
  }

  function buildIqamaRows() {
    var wrap = $('#iqamaRows');
    wrap.innerHTML = '';
    IQAMA_IDS.forEach(function (id) {
      var r = cfg.iqama[id];
      var row = document.createElement('div');
      row.className = 'iqama-row';
      row.innerHTML =
        '<div class="row-name">' + PT.PRAYER_NAMES[id] + '</div>' +
        '<select class="iqMode">' +
          '<option value="after">После азана</option>' +
          '<option value="fixed">Точное время</option>' +
        '</select>' +
        '<div class="iq-value">' +
          '<div class="inline iq-after"><input type="number" class="iqOffset" min="0" max="180" step="1">' +
            '<span class="hint">мин после азана</span></div>' +
          '<div class="inline iq-fixed"><input type="time" class="iqFixedTime"><span class="hint">точное время</span></div>' +
        '</div>';
      wrap.appendChild(row);

      var modeSel = row.querySelector('.iqMode');
      var offInput = row.querySelector('.iqOffset');
      var fixedInput = row.querySelector('.iqFixedTime');
      var afterBox = row.querySelector('.iq-after');
      var fixedBox = row.querySelector('.iq-fixed');

      modeSel.value = r.mode;
      offInput.value = r.offset;
      fixedInput.value = r.fixed;

      function sync() {
        r.mode = modeSel.value;
        afterBox.hidden = r.mode !== 'after';
        fixedBox.hidden = r.mode !== 'fixed';
      }
      sync();

      modeSel.addEventListener('change', function () { sync(); persist(); });
      bind(offInput, function () {
        r.offset = clampInt(offInput.value, 0, 180, 15);
        offInput.value = r.offset;
      });
      bind(fixedInput, function () {
        if (fixedInput.value) r.fixed = fixedInput.value;
      });
    });
  }

  function buildJumuahRows() {
    var wrap = $('#jumuahRows');
    wrap.innerHTML = '';
    (cfg.jumuah.times || []).forEach(function (item, idx) {
      var row = document.createElement('div');
      row.className = 'jumuah-row';
      row.innerHTML =
        '<input type="text" class="jLabel" maxlength="60" placeholder="Название (напр. 1-я хутба)">' +
        '<input type="time" class="jTime">' +
        '<button class="btn rowbtn jRemove" type="button" title="Удалить" aria-label="Удалить">✕</button>';
      wrap.appendChild(row);
      var label = row.querySelector('.jLabel');
      var time = row.querySelector('.jTime');
      label.value = item.label || '';
      time.value = item.time || '';
      bind(label, function () { cfg.jumuah.times[idx].label = label.value.slice(0, 60); });
      bind(time, function () {
        if (time.value) cfg.jumuah.times[idx].time = time.value;
        else cfg.jumuah.times[idx].time = '';
      });
      row.querySelector('.jRemove').addEventListener('click', function () {
        cfg.jumuah.times.splice(idx, 1);
        buildJumuahRows();
        persist();
      });
    });
  }

  function updateLogoPreview() {
    var p = $('#logoPreview');
    if (cfg.mosque.logoData) {
      p.innerHTML = '<img alt="Логотип" src="' + cfg.mosque.logoData + '">';
    } else {
      p.textContent = cfg.mosque.logoEmoji || '🕌';
    }
  }

  function syncCustomAngles() {
    $('#customAngles').hidden = cfg.calc.method !== 'custom';
  }

  function fillForm() {
    $('#mosqueName').value = cfg.mosque.name;
    $('#mosqueSubtitle').value = cfg.mosque.subtitle;
    $('#logoEmoji').value = cfg.mosque.logoEmoji;
    updateLogoPreview();

    buildCityOptions();
    var known = CITIES.some(function (c) { return c.id === cfg.location.cityId; });
    $('#citySelect').value = known ? cfg.location.cityId : '__custom';
    $('#cityName').value = cfg.location.cityName;
    $('#lat').value = cfg.location.lat;
    $('#lng').value = cfg.location.lng;

    buildMethodOptions();
    $('#method').value = PT.METHODS[cfg.calc.method] ? cfg.calc.method : 'russia';
    $('#asr').value = cfg.calc.asr;
    $('#highLats').value = cfg.calc.highLats;
    $('#fajrAngle').value = cfg.calc.fajrAngle;
    $('#ishaAngle').value = cfg.calc.ishaAngle;
    syncCustomAngles();

    var hsel = $('#hijriOffset');
    hsel.innerHTML = '';
    for (var h = -3; h <= 3; h++) {
      var o = document.createElement('option');
      o.value = String(h);
      o.textContent = h === 0 ? '0 (по умолчанию)' : (h > 0 ? '+' + h : String(h));
      hsel.appendChild(o);
    }
    hsel.value = String(cfg.calc.hijriOffset);

    buildAdjustRows();
    $('#manualEnabled').checked = cfg.manual.enabled;
    buildManualTimes();
    buildIqamaRows();
    $('#jumuahEnabled').checked = cfg.jumuah.enabled;
    buildJumuahRows();

    $('#announcements').value = (cfg.display.announcements || []).join('\n');
    $('#tickerSpeed').value = cfg.display.tickerSpeed;
    $('#footerNote').value = cfg.display.footerNote;

    $('#palette').value = cfg.display.palette || 'emerald-dark';
    $('#bgMode').value = cfg.display.bg.mode;
    $('#bgDim').value = cfg.display.bg.dim;
    $('#bgBlur').value = cfg.display.bg.blur;
    syncBgFields();
    updateBgPreview();
    $('#atEnabled').checked = cfg.display.autoTheme.enabled;
    $('#atDay').value = cfg.display.autoTheme.dayPalette;
    $('#atNight').value = cfg.display.autoTheme.nightPalette;
    $('#atMode').value = cfg.display.autoTheme.mode;
    $('#atDayStart').value = cfg.display.autoTheme.dayStart;
    $('#atNightStart').value = cfg.display.autoTheme.nightStart;
    syncAutoFields();
    $('#boardStyle').value = cfg.display.boardStyle || 'mosque';
    $('#scAdhan').checked = cfg.screens.adhan;
    $('#scIqama').checked = cfg.screens.iqama;
    $('#scPrayer').checked = cfg.screens.prayer;
    $('#scRead').checked = cfg.screens.read;
    $('#scAdhanSec').value = cfg.screens.adhanSec;
    $('#scPrayerMin').value = cfg.screens.prayerMin;
    $('#scReadSec').value = cfg.screens.readSec;
    $('#scReadWarn').value = cfg.screens.readWarn;
    $('#showSeconds').checked = cfg.display.showSeconds;
    $('#showHijri').checked = cfg.display.showHijri;
    $('#showSunrise').checked = cfg.display.showSunrise;
    $('#showZenith').checked = cfg.display.showZenith;
    $('#showWeather').checked = cfg.display.weather;
    syncSwatches();
    applyTheme();
    $('#tyUse').checked = cfg.tyumen.useData;
    $('#tyZuhr').value = cfg.tyumen.zuhr === 'zenith4' ? 'zenith4' : 'fixed';
    $('#rdShow').checked = cfg.reading.show;
    $('#rdMode').value = cfg.reading.mode;
    $('#rdN').value = cfg.reading.nmins;
    $('#rdFixed').value = cfg.reading.fixed;
    $('#rdRamadan').checked = cfg.reading.hideInRamadan;
    $('#rdWinter').checked = cfg.reading.winterPrint;
    $('#rdFajr').checked = cfg.reading.fajrByRead;
    $('#rdIqama').value = cfg.reading.iqamaAfter;
    $('#rdIqama').disabled = !cfg.reading.fajrByRead;
    syncReadingFields();
  }

  function syncReadingFields() {
    var mode = $('#rdMode').value;
    var on = $('#rdShow').checked;
    $('#rdN').disabled = !on || mode === 'fixed';
    $('#rdFixed').disabled = !on || mode !== 'fixed';
  }

  /* ---------- обработчики полей ---------- */

  function bindStatic() {
    bind($('#mosqueName'), function () { cfg.mosque.name = $('#mosqueName').value; }, true);
    bind($('#mosqueSubtitle'), function () { cfg.mosque.subtitle = $('#mosqueSubtitle').value; }, true);
    bind($('#logoEmoji'), function () {
      cfg.mosque.logoEmoji = $('#logoEmoji').value.slice(0, 4);
      updateLogoPreview();
    }, true);

    $('#logoFile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var data = String(reader.result || '');
        if (data.length > 420000) {
          alert('Файл слишком большой (более ~300 КБ). Выберите изображение поменьше.');
          return;
        }
        cfg.mosque.logoData = data;
        updateLogoPreview();
        persist();
      };
      reader.readAsDataURL(f);
    });

    $('#logoRemove').addEventListener('click', function () {
      cfg.mosque.logoData = '';
      $('#logoFile').value = '';
      updateLogoPreview();
      persist();
    });

    bind($('#citySelect'), function () {
      var v = $('#citySelect').value;
      if (v === '__custom') {
        cfg.location.cityId = '__custom';
      } else {
        var c = null;
        CITIES.forEach(function (x) { if (x.id === v) c = x; });
        if (c) {
          cfg.location.cityId = c.id;
          cfg.location.cityName = c.name;
          cfg.location.lat = c.lat;
          cfg.location.lng = c.lng;
          $('#cityName').value = c.name;
          $('#lat').value = c.lat;
          $('#lng').value = c.lng;
          applyCityMethod(c);
        }
      }
    });

    /* город выбран — метод и мазхаб как у местного муфтията (можно поменять ниже) */
    function applyCityMethod(c) {
      if (!window.NamazCities) return;
      var d = NamazCities.defaultsFor(c);
      cfg.calc.method = d.method;
      cfg.calc.asr = d.asr;
      $('#method').value = d.method;
      $('#asr').value = d.asr;
      $('#customAngles').hidden = cfg.calc.method !== 'custom';
      /* «Читается в мечетях» — правило мечетей Тюмени; для других городов выключаем */
      cfg.reading.show = c.id === 'tyumen';
      $('#rdShow').checked = cfg.reading.show;
      if (typeof syncReadingFields === 'function') syncReadingFields();
      $('#geoStatus').textContent = 'Метод: ' + PT.METHODS[d.method].name + ', Аср: ' +
        (d.asr === 'hanafi' ? 'Ханафи' : 'Шафии') + ' — как принято (' + d.authority + ').' +
        (d.verified ? '' : ' Углы муфтията не опубликованы — сверьте с местным расписанием.');
    }

    bind($('#cityName'), function () { cfg.location.cityName = $('#cityName').value.slice(0, 80); }, true);

    function onCoords() {
      cfg.location.lat = clampFloat($('#lat').value, -90, 90, cfg.location.lat);
      cfg.location.lng = clampFloat($('#lng').value, -180, 180, cfg.location.lng);
      var cur = null;
      CITIES.forEach(function (x) { if (x.id === cfg.location.cityId) cur = x; });
      if (!cur || Math.abs(cur.lat - cfg.location.lat) > 0.001 || Math.abs(cur.lng - cfg.location.lng) > 0.001) {
        cfg.location.cityId = '__custom';
        if ($('#citySelect').value !== '__custom') $('#citySelect').value = '__custom';
      }
    }
    bind($('#lat'), onCoords, true);
    bind($('#lng'), onCoords, true);

    $('#geoBtn').addEventListener('click', function () {
      var st = $('#geoStatus');
      if (!navigator.geolocation) { st.textContent = 'Геолокация недоступна — введите координаты вручную.'; return; }
      st.textContent = 'Определяем…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = +pos.coords.latitude.toFixed(4);
        var lng = +pos.coords.longitude.toFixed(4);
        cfg.location.lat = lat;
        cfg.location.lng = lng;
        $('#lat').value = lat;
        $('#lng').value = lng;
        var best = null, bestD = Infinity;
        CITIES.forEach(function (c) {
          var dy = (c.lat - lat) * 111, dx = (c.lng - lng) * 111 * Math.cos(lat * Math.PI / 180);
          var d = Math.sqrt(dy * dy + dx * dx);
          if (d < bestD) { bestD = d; best = c; }
        });
        if (best && bestD < 60) {
          cfg.location.cityId = best.id;
          cfg.location.cityName = best.name;
          $('#citySelect').value = best.id;
          $('#cityName').value = best.name;
          applyCityMethod(best);
          st.textContent = 'Определено: ' + best.name + ' (' + lat + ', ' + lng + '). ' + st.textContent;
        } else {
          cfg.location.cityId = '__custom';
          $('#citySelect').value = '__custom';
          st.textContent = 'Координаты обновлены: ' + lat + ', ' + lng;
        }
        persist();
      }, function () {
        st.textContent = 'Не удалось определить — введите координаты вручную.';
      }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
    });

    bind($('#method'), function () {
      cfg.calc.method = $('#method').value;
      syncCustomAngles();
    });
    bind($('#asr'), function () { cfg.calc.asr = $('#asr').value; });
    bind($('#highLats'), function () { cfg.calc.highLats = $('#highLats').value; });
    bind($('#fajrAngle'), function () {
      cfg.calc.fajrAngle = clampFloat($('#fajrAngle').value, 0, 30, 18);
    });
    bind($('#ishaAngle'), function () {
      cfg.calc.ishaAngle = clampFloat($('#ishaAngle').value, 0, 30, 17);
    });
    bind($('#hijriOffset'), function () { cfg.calc.hijriOffset = clampInt($('#hijriOffset').value, -3, 3, 0); });

    bind($('#manualEnabled'), function () { cfg.manual.enabled = $('#manualEnabled').checked; });

    bind($('#jumuahEnabled'), function () { cfg.jumuah.enabled = $('#jumuahEnabled').checked; });

    $('#jumuahAdd').addEventListener('click', function () {
      if (cfg.jumuah.times.length >= 6) return;
      cfg.jumuah.times.push({ label: 'Хутба ' + (cfg.jumuah.times.length + 1), time: '13:00' });
      buildJumuahRows();
      persist();
    });

    bind($('#announcements'), function () {
      cfg.display.announcements = $('#announcements').value
        .split('\n')
        .map(function (s) { return s.trim(); })
        .filter(Boolean)
        .slice(0, 40);
    }, true);
    bind($('#tickerSpeed'), function () { cfg.display.tickerSpeed = $('#tickerSpeed').value; });
    bind($('#footerNote'), function () { cfg.display.footerNote = $('#footerNote').value; }, true);

    bind($('#palette'), function () { setPalette($('#palette').value); });
    bind($('#bgMode'), function () {
      var v = $('#bgMode').value;
      var valid = ['theme', 'image', 'stars', 'sea', 'sunset', 'aurora', 'ornament'];
      cfg.display.bg.mode = valid.indexOf(v) !== -1 ? v : 'theme';
      syncBgFields();
      updateBgPreview();
    });
    bind($('#atEnabled'), function () {
      cfg.display.autoTheme.enabled = $('#atEnabled').checked;
      syncAutoFields();
    });
    bind($('#atDay'), function () { cfg.display.autoTheme.dayPalette = $('#atDay').value; });
    bind($('#atNight'), function () { cfg.display.autoTheme.nightPalette = $('#atNight').value; });
    bind($('#atMode'), function () {
      cfg.display.autoTheme.mode = $('#atMode').value === 'sun' ? 'sun' : 'clock';
      syncAutoFields();
    });
    bind($('#atDayStart'), function () { if ($('#atDayStart').value) cfg.display.autoTheme.dayStart = $('#atDayStart').value; });
    bind($('#atNightStart'), function () { if ($('#atNightStart').value) cfg.display.autoTheme.nightStart = $('#atNightStart').value; });
    bind($('#bgDim'), function () {
      cfg.display.bg.dim = clampInt($('#bgDim').value, 0, 90, 45);
      updateBgPreview();
    }, true);
    bind($('#bgBlur'), function () {
      cfg.display.bg.blur = clampInt($('#bgBlur').value, 0, 20, 0);
      updateBgPreview();
    }, true);
    $('#bgFile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var data = String(reader.result || '');
        if (data.length > 950000) {
          alert('Файл слишком большой (более ~600 КБ). Выберите картинку поменьше.');
          return;
        }
        cfg.display.bg.image = data;
        cfg.display.bg.mode = 'image';
        $('#bgMode').value = 'image';
        syncBgFields();
        updateBgPreview();
        persist();
      };
      reader.readAsDataURL(f);
      this.value = '';
    });
    $('#bgRemove').addEventListener('click', function () {
      cfg.display.bg.image = '';
      cfg.display.bg.mode = 'theme';
      $('#bgMode').value = 'theme';
      syncBgFields();
      updateBgPreview();
      persist();
    });
    bind($('#boardStyle'), function () { cfg.display.boardStyle = $('#boardStyle').value === 'accent' ? 'accent' : 'mosque'; });
    bind($('#scAdhan'), function () { cfg.screens.adhan = $('#scAdhan').checked; });
    bind($('#scIqama'), function () { cfg.screens.iqama = $('#scIqama').checked; });
    bind($('#scPrayer'), function () { cfg.screens.prayer = $('#scPrayer').checked; });
    bind($('#scRead'), function () { cfg.screens.read = $('#scRead').checked; });
    bind($('#scAdhanSec'), function () { cfg.screens.adhanSec = clampInt($('#scAdhanSec').value, 10, 600, 120); }, true);
    bind($('#scPrayerMin'), function () { cfg.screens.prayerMin = clampInt($('#scPrayerMin').value, 1, 60, 10); }, true);
    bind($('#scReadSec'), function () { cfg.screens.readSec = clampInt($('#scReadSec').value, 10, 1800, 180); }, true);
    bind($('#scReadWarn'), function () { cfg.screens.readWarn = clampInt($('#scReadWarn').value, 0, 120, 15); }, true);
    bind($('#showSeconds'), function () { cfg.display.showSeconds = $('#showSeconds').checked; });
    bind($('#showHijri'), function () { cfg.display.showHijri = $('#showHijri').checked; });
    bind($('#showSunrise'), function () { cfg.display.showSunrise = $('#showSunrise').checked; });
    bind($('#showZenith'), function () { cfg.display.showZenith = $('#showZenith').checked; });
    bind($('#showWeather'), function () { cfg.display.weather = $('#showWeather').checked; });

    bind($('#tyUse'), function () { cfg.tyumen.useData = $('#tyUse').checked; });
    bind($('#tyZuhr'), function () { cfg.tyumen.zuhr = $('#tyZuhr').value === 'zenith4' ? 'zenith4' : 'fixed'; });
    bind($('#rdShow'), function () { cfg.reading.show = $('#rdShow').checked; syncReadingFields(); });
    bind($('#rdMode'), function () { cfg.reading.mode = $('#rdMode').value; syncReadingFields(); });
    bind($('#rdN'), function () { cfg.reading.nmins = clampInt($('#rdN').value, 1, 240, 90); $('#rdN').value = cfg.reading.nmins; });
    bind($('#rdFixed'), function () { if ($('#rdFixed').value) cfg.reading.fixed = $('#rdFixed').value; });
    bind($('#rdRamadan'), function () { cfg.reading.hideInRamadan = $('#rdRamadan').checked; });
    bind($('#rdWinter'), function () { cfg.reading.winterPrint = $('#rdWinter').checked; });
    bind($('#rdFajr'), function () { cfg.reading.fajrByRead = $('#rdFajr').checked; $('#rdIqama').disabled = !cfg.reading.fajrByRead; });
    bind($('#rdIqama'), function () { cfg.reading.iqamaAfter = clampInt($('#rdIqama').value, 1, 60, 10); }, true);

    Array.prototype.forEach.call(document.querySelectorAll('.swatch'), function (s) {
      function pick() {
        cfg.display.accent = s.dataset.accent;
        syncSwatches();
        applyTheme();
        persist();
      }
      s.addEventListener('click', pick);
      s.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
      });
    });

    /* ---------- данные и перенос ---------- */

    $('#shareBtn').addEventListener('click', function () {
      var url = Store.makeShareUrl(cfg);
      var st = $('#dataStatus');
      function ok() { st.textContent = 'Ссылка скопирована. Откройте её на устройстве с табло.'; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(ok, function () { window.prompt('Скопируйте ссылку:', url); });
      } else {
        window.prompt('Скопируйте ссылку:', url);
      }
    });

    $('#exportBtn').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'namaz-tablo-nastroyki.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      $('#dataStatus').textContent = 'Файл настроек сохранён.';
    });

    $('#importBtn').addEventListener('click', function () { $('#importFile').click(); });

    $('#importFile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(String(reader.result || ''));
          cfg = Store.normalize(parsed);
          Store.save(cfg);
          fillForm();
          updatePreviewNow();
          $('#dataStatus').textContent = 'Настройки импортированы и сохранены.';
        } catch (e) {
          $('#dataStatus').textContent = 'Не удалось прочитать файл настроек.';
        }
      };
      reader.readAsText(f);
      this.value = '';
    });

    $('#resetBtn').addEventListener('click', function () {
      if (!window.confirm('Сбросить все настройки и вернуть значения по умолчанию?')) return;
      cfg = Store.defaults();
      Store.save(cfg);
      fillForm();
      updatePreviewNow();
      $('#dataStatus').textContent = 'Настройки сброшены к значениям по умолчанию.';
    });
  }

  /* ---------- предпросмотр ---------- */

  var previewTimer = null;
  function schedulePreview() {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreviewNow, 250);
  }

  function updatePreviewNow() {
    var s = Sched.buildDay(cfg, new Date());
    var tbody = $('#previewBody');
    tbody.innerHTML = '';
    if (!s.ok) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="3">Расписание не построено: укажите координаты места.</td>';
      tbody.appendChild(tr);
    } else {
      s.prayers.forEach(function (p) {
        var row = document.createElement('tr');
        row.innerHTML = '<td>' + PT.PRAYER_NAMES[p.id] + '</td>' +
          '<td>' + PT.fmtHM(p.adhan) + '</td>' +
          '<td>' + (p.iqama ? PT.fmtHM(p.iqama) : '—') + '</td>';
        tbody.appendChild(row);
        if (p.id === 'sunrise') {
          var zr = document.createElement('tr');
          zr.innerHTML = '<td>Зенит</td><td>' + (s.zenith ? PT.fmtHM(s.zenith) : '—') + '</td>' +
            '<td><span class="hint">солнечный полдень</span></td>';
          tbody.appendChild(zr);
        }
      });
      var rr = document.createElement('tr');
      var rtxt = s.readHidden ? '—' : (s.read ? PT.fmtHM(s.read) : '—');
      rr.innerHTML = '<td>Читается в мечетях</td><td>' + rtxt + '</td>' +
        '<td><span class="hint">' + (s.readNote || '') + '</span></td>';
      tbody.appendChild(rr);
    }
    var meta = 'Метод: ' + s.meta.methodName + ' · Аср: ' + s.meta.asrName;
    if (cfg.manual.enabled) meta += ' · ручное расписание';
    if (s.meta.warnings.length) meta += ' · ' + s.meta.warnings.join(' · ');
    $('#previewMeta').textContent = meta;

    var rd = $('#rdPreview');
    if (rd) {
      if (!cfg.reading.show) rd.textContent = '«Читается в мечетях» выключено.';
      else if (s.readHidden) rd.textContent = 'Сегодня: — (' + s.readNote + ')';
      else if (s.read) rd.textContent = 'Сегодня: Читается в мечетях — ' + PT.fmtHM(s.read) + ' (' + s.readNote + ')';
      else rd.textContent = '';
    }
  }

  function tickPreviewNext() {
    var now = new Date();
    var s = Sched.buildDay(cfg, now);
    if (!s.ok) { $('#previewNext').textContent = ''; return; }
    var tomorrow = Sched.buildDay(cfg, PT.addDays(now, 1));
    var events = PT.collectEvents(s, tomorrow);
    if (s.read && !s.readHidden) {
      events.push({ at: s.read.getTime(), kind: 'read', id: 'read', name: '', note: s.readNote });
      events.sort(function (a, b) { return a.at - b.at; });
    }
    var next = PT.nextEvent(events, now.getTime());
    if (!next) { $('#previewNext').textContent = ''; return; }
    var label;
    if (next.kind === 'jumuah') label = next.name;
    else if (next.kind === 'read') label = 'чтение в мечетях';
    else label = (next.kind === 'iqama' ? 'икама ' : 'азан ') + next.name.toLowerCase();
    $('#previewNext').textContent = 'Следующее событие: ' + label + ' — через ' + PT.fmtDuration(next.at - now.getTime());
    updateAtStatus(now, s);
  }

  /* ---------- управление табло: телефон (Wi‑Fi) и облако ---------- */

  var Cloud = window.NamazCloud;
  var AUTO_KEY = 'namazTablo.cloud.autopush';

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderSyncLocal() {
    var box = $('#syncLocal');
    if (window.TabloNative) {
      var info = {}, t = null;
      try { info = JSON.parse(window.TabloNative.remoteInfo()); } catch (e) { /* нет данных */ }
      try { t = JSON.parse(window.TabloNative.timeInfo()); } catch (e) { /* нет данных */ }
      var urls = (info.urls || []).map(function (u) { return '<b>' + esc(u) + '</b>'; }).join(' или ');
      box.innerHTML = 'Это приставка с табло. Настраивать её удобнее с телефона: подключите телефон к той же Wi‑Fi сети и откройте ' +
        (urls || 'адрес приставки') + ', PIN‑код: <b>' + esc(info.pin || '—') + '</b>.<br>' +
        (t && t.synced
          ? 'Часы сверены с интернетом (' + esc(t.server) + '), поправка ' + (t.offsetMs > 0 ? '+' : '') + Math.round(t.offsetMs) + ' мс.'
          : 'Часы ещё не сверены с интернетом — табло идёт по часам приставки.');
    } else if (Store.remote) {
      var top = document.querySelector('.admin-shell > .infobox');
      if (top) top.textContent = 'Это настройки табло на приставке. Изменения сохраняются на приставке и сразу появляются на экране (нужен PIN с экрана табло).';
      box.innerHTML = 'Вы настраиваете <b>табло на приставке</b> с этого телефона. Изменения сразу уходят на табло. ' +
        'Для сохранения нужен PIN‑код с экрана табло.';
      $('#pinRow').hidden = false;
      $('#remotePin').value = Store.remotePin();
    } else {
      box.innerHTML = 'Это табло в браузере этого устройства: настройки хранятся здесь. ' +
        'Чтобы настроить <b>приставку</b> с телефона, откройте на телефоне адрес, который табло показывает внизу экрана при запуске приставки (та же Wi‑Fi сеть).';
    }
  }

  function setCloudStatus(text, ok) {
    var el = $('#cloudStatus');
    el.textContent = text;
    el.style.color = ok === false ? '#e07a6a' : ok ? 'var(--accent)' : '';
  }

  function fillCloud() {
    $('#cloudOn').checked = cfg.cloud.enabled;
    $('#cloudDb').value = cfg.cloud.dbUrl;
    $('#cloudKey').value = cfg.cloud.apiKey;
    $('#cloudId').value = cfg.cloud.mosqueId;
    var auto = null;
    try { auto = localStorage.getItem(AUTO_KEY); } catch (e) { /* нет хранилища */ }
    $('#cloudAuto').checked = auto !== '0';
    var sess = Cloud && Cloud.session();
    setCloudStatus(sess ? 'Вы вошли как ' + sess.email + '.' : 'Вход в облако не выполнен (нужен, чтобы отправлять настройки).');
  }

  var autoTimer = null;
  function cloudAutoPush() {
    if (!Cloud || !Cloud.ready(cfg.cloud) || !Cloud.session() || !$('#cloudAuto').checked) return;
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      setCloudStatus('Отправка в облако…');
      Cloud.push(cfg.cloud, cfg, function (err) {
        setCloudStatus(err ? err : 'Отправлено в облако ✓ ' + new Date().toLocaleTimeString('ru-RU') + ' — табло обновится в течение минуты.', !err);
      });
    }, 1500);
  }

  function bindSync() {
    if (Store.remote) {
      Store.onRemoteResult(function (ok, err) {
        statusEl.classList.toggle('ok', ok);
        statusEl.textContent = ok ? 'Отправлено на табло ✓' : (err === 'pin' ? 'Неверный PIN — введите PIN с экрана табло' : 'Табло не отвечает (Wi‑Fi?)');
        if (!ok && err === 'pin') { $('#remotePin').focus(); location.hash = '#sec-sync'; }
      });
      $('#remotePinSave').addEventListener('click', function () {
        Store.setRemotePin($('#remotePin').value);
        persist();
      });
    }
    if (!Cloud) return;
    bind($('#cloudOn'), function () { cfg.cloud.enabled = $('#cloudOn').checked; });
    bind($('#cloudDb'), function () { cfg.cloud.dbUrl = $('#cloudDb').value.trim(); }, true);
    bind($('#cloudKey'), function () { cfg.cloud.apiKey = $('#cloudKey').value.trim(); }, true);
    bind($('#cloudId'), function () { cfg.cloud.mosqueId = $('#cloudId').value.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'sabyr'; }, true);
    $('#cloudAuto').addEventListener('change', function () {
      try { localStorage.setItem(AUTO_KEY, $('#cloudAuto').checked ? '1' : '0'); } catch (e) { /* нет хранилища */ }
    });
    $('#cloudLogin').addEventListener('click', function () {
      setCloudStatus('Вход…');
      Cloud.signIn(cfg.cloud, $('#cloudEmail').value.trim(), $('#cloudPass').value, function (err, sess) {
        $('#cloudPass').value = '';
        setCloudStatus(err ? err : 'Вы вошли как ' + sess.email + '. Теперь изменения можно отправлять в облако.', !err);
      });
    });
    $('#cloudLogout').addEventListener('click', function () {
      Cloud.signOut();
      setCloudStatus('Вы вышли из облака.');
    });
    $('#cloudPush').addEventListener('click', function () {
      setCloudStatus('Отправка в облако…');
      Cloud.push(cfg.cloud, cfg, function (err) {
        setCloudStatus(err ? err : 'Отправлено в облако ✓ — табло обновится в течение минуты.', !err);
      });
    });
    $('#cloudPull').addEventListener('click', function () {
      setCloudStatus('Загрузка из облака…');
      Cloud.pull(cfg.cloud, function (err, json) {
        if (err) { setCloudStatus(err, false); return; }
        try {
          var raw = JSON.parse(json);
          raw.cloud = cfg.cloud;
          cfg = Store.normalize(raw);
          Store.save(cfg);
          fillForm();
          fillCloud();
          updatePreviewNow();
          setCloudStatus('Настройки загружены из облака ✓', true);
        } catch (e) { setCloudStatus('Не удалось прочитать настройки из облака', false); }
      });
    });
  }

  /* ---------- запуск ---------- */

  renderSyncLocal();
  fillCloud();
  bindSync();
  fillForm();
  bindStatic();
  updatePreviewNow();
  setInterval(tickPreviewNext, 1000);
  tickPreviewNext();
})();

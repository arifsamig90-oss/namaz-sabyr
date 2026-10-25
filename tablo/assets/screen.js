/*!
 * screen.js — логика экрана табло (index.html).
 */
(function () {
  'use strict';
  var PT = window.PrayerTimes;
  var Store = window.NamazStore;
  var Sched = window.NamazSchedule;

  var $ = function (s) { return document.querySelector(s); };

  var els = {
    logo: $('#logo'),
    mosqueName: $('#mosqueName'),
    mosqueSub: $('#mosqueSub'),
    clock: $('#clock'),
    gregDate: $('#gregDate'),
    hijriWrap: $('#hijriWrap'),
    hijriDate: $('#hijriDate'),
    btnFull: $('#btnFull'),
    heroLabel: $('#heroLabel'),
    heroName: $('#heroName'),
    heroCount: $('#heroCount'),
    heroNote: $('#heroNote'),
    progress: $('#progress'),
    jumuahChip: $('#jumuahChip'),
    cards: $('#cards'),
    warnRow: $('#warnRow'),
    ticker: $('#ticker'),
    tickerTrack: $('#tickerTrack'),
    footNote: $('#footNote')
  };

  var cfg = Store.load();
  var schedule = null;
  var tomorrow = null;
  var events = [];
  var currentDayKey = '';
  var cards = [];
  var appliedPalette = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function applyPalette() {
    var d = cfg.display;
    var target = d.palette || 'emerald-dark';
    var st = Sched.autoThemeState(cfg, new Date(), schedule);
    if (st) target = st.palette;
    if (target !== appliedPalette) {
      appliedPalette = target;
      document.documentElement.dataset.palette = target;
      document.documentElement.dataset.theme = Sched.isLightPalette(target) ? 'light' : 'dark';
    }
  }

  function applyTheme() {
    var d = cfg.display;
    document.documentElement.dataset.accent = d.accent;
    var bg = d.bg || {};
    var bgUri = window.NamazBackgrounds ? window.NamazBackgrounds.uriFor(bg.mode, bg.image) : (bg.mode === 'image' ? bg.image : null);
    document.body.dataset.bg = bgUri ? 'image' : '';
    var root = document.documentElement.style;
    if (bgUri) {
      root.setProperty('--board-bg-image', 'url("' + bgUri + '")');
      root.setProperty('--board-dim', ((bg.dim != null ? bg.dim : 45) / 100).toFixed(2));
      root.setProperty('--board-blur', (bg.blur || 0) + 'px');
    } else {
      root.removeProperty('--board-bg-image');
      root.removeProperty('--board-dim');
      root.removeProperty('--board-blur');
    }
    appliedPalette = null;
    applyPalette();
  }

  function buildCards() {
    els.cards.innerHTML = '';
    cards = [];
    if (!schedule || !schedule.ok) {
      var div = document.createElement('div');
      div.className = 'placeholder-card';
      div.innerHTML = 'Расписание пока не построено.<br>' +
        '<a href="admin.html">Откройте «Настройки»</a>, укажите город и метод расчёта.';
      els.cards.appendChild(div);
      return;
    }
    schedule.prayers.forEach(function (p) {
      if (p.id === 'sunrise' && !cfg.display.showSunrise) return;
      var card = document.createElement('article');
      card.className = 'prayer-card' + (p.id === 'sunrise' ? ' sunrise' : '');
      card.dataset.id = p.id;
      var sub = '';
      if (p.iqama) sub = 'Икама ' + PT.fmtHM(p.iqama);
      else if (p.id === 'sunrise') sub = 'Конец времени Фаджра';
      card.innerHTML =
        '<div class="p-name">' + esc(p.name) + '</div>' +
        '<div class="p-adhan">' + PT.fmtHM(p.adhan) + '</div>' +
        '<div class="p-iqama">' + esc(sub) + '</div>';
      els.cards.appendChild(card);
      cards.push(card);
      if (p.id === 'fajr') {
        var rc = buildReadingCard();
        if (rc) { els.cards.appendChild(rc); cards.push(rc); }
      }
      if (p.id === 'sunrise') {
        var zc = buildZenithCard();
        if (zc) { els.cards.appendChild(zc); cards.push(zc); }
      }
    });
  }

  function buildZenithCard() {
    if (!cfg.display.showZenith || !schedule || !schedule.ok || !schedule.zenith) return null;
    var card = document.createElement('article');
    card.className = 'prayer-card zenith-card';
    card.dataset.id = 'zenith';
    card.innerHTML =
      '<div class="p-name">Зенит</div>' +
      '<div class="p-adhan">' + PT.fmtHM(schedule.zenith) + '</div>' +
      '<div class="p-iqama">солнечный полдень</div>';
    return card;
  }

  function buildReadingCard() {
    if (!cfg.reading || !cfg.reading.show || !schedule || !schedule.ok) return null;
    var card = document.createElement('article');
    card.className = 'prayer-card reading-card';
    card.dataset.id = 'read';
    var timeText = '—';
    var sub = '';
    if (schedule.readHidden) {
      sub = 'Рамадан';
    } else if (cfg.reading.mode === 'sunrise') {
      sub = 'восход − ' + cfg.reading.nmins + ' мин';
    } else if (cfg.reading.mode === 'suhoor') {
      sub = 'сухур + ' + cfg.reading.nmins + ' мин';
    } else {
      sub = 'в мечетях';
    }
    if (!schedule.readHidden && schedule.read) {
      timeText = PT.fmtHM(schedule.read);
    }
    card.innerHTML =
      '<div class="p-name">Читается в мечетях</div>' +
      '<div class="p-adhan">' + timeText + '</div>' +
      '<div class="p-iqama">' + esc(sub) + '</div>';
    return card;
  }

  function buildTicker() {
    var items = (cfg.display.announcements || []).slice();
    if (!items.length) {
      els.ticker.hidden = true;
      els.tickerTrack.innerHTML = '';
      return;
    }
    els.ticker.hidden = false;
    var speed = { slow: '70s', normal: '45s', fast: '28s' }[cfg.display.tickerSpeed] || '45s';
    els.ticker.style.setProperty('--ticker-dur', speed);
    var inner = items.map(function (t) {
      return '<span class="ticker-item">' + esc(t) + '</span>';
    }).join('');
    els.tickerTrack.innerHTML =
      '<div class="ticker-half">' + inner + '</div>' +
      '<div class="ticker-half" aria-hidden="true">' + inner + '</div>';
  }

  function buildWarnings() {
    els.warnRow.innerHTML = '';
    if (!schedule || !schedule.ok) return;
    var chips = [];
    if (schedule.meta.manual) chips.push({ cls: 'info-chip', text: 'Ручное расписание' });
    schedule.meta.warnings.forEach(function (w) {
      chips.push({ cls: 'warn-chip', text: w });
    });
    chips.forEach(function (c) {
      var span = document.createElement('span');
      span.className = c.cls;
      span.textContent = c.text;
      els.warnRow.appendChild(span);
    });
  }

  function buildJumuah() {
    if (!cfg.jumuah.enabled || !schedule || !schedule.ok || !schedule.jumuah.length) {
      els.jumuahChip.hidden = true;
      return;
    }
    els.jumuahChip.hidden = false;
    var isFriday = new Date().getDay() === 5;
    els.jumuahChip.className = 'jumuah-chip' + (isFriday ? ' today' : '');
    els.jumuahChip.innerHTML = 'Джума: ' + schedule.jumuah.map(function (j) {
      return esc(j.label) + ' — ' + PT.fmtHM(j.time);
    }).join(' · ');
  }

  function renderStatic() {
    els.mosqueName.textContent = cfg.mosque.name || 'Мечеть';
    els.mosqueSub.textContent = [cfg.location.cityName, cfg.mosque.subtitle].filter(Boolean).join(' · ');
    if (cfg.mosque.logoData) {
      els.logo.innerHTML = '<img alt="Логотип мечети" src="' + esc(cfg.mosque.logoData) + '">';
    } else {
      els.logo.textContent = cfg.mosque.logoEmoji || '🕌';
    }
    els.hijriWrap.style.display = cfg.display.showHijri ? '' : 'none';
    els.footNote.hidden = !cfg.display.footerNote;
    els.footNote.textContent = cfg.display.footerNote || '';
    document.title = (cfg.mosque.name || 'Табло намаза') + ' — табло намаза';
  }

  function recompute() {
    var now = new Date();
    schedule = Sched.buildDay(cfg, now);
    tomorrow = Sched.buildDay(cfg, PT.addDays(now, 1));
    events = PT.collectEvents(schedule, tomorrow);
    if (schedule.read && !schedule.readHidden) {
      events.push({ at: schedule.read.getTime(), kind: 'read', id: 'read', name: '', note: schedule.readNote });
      events.sort(function (a, b) { return a.at - b.at; });
    }
    currentDayKey = PT.dateKey(now);
    updateDates(now);
  }

  var gregCache = { key: '', text: '' };
  function updateDates(now) {
    var key = PT.dateKey(now);
    if (gregCache.key !== key) {
      var g = '';
      try {
        g = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
        g = g.charAt(0).toUpperCase() + g.slice(1);
      } catch (e) { g = key; }
      gregCache = { key: key, text: g };
    }
    els.gregDate.textContent = gregCache.text;
    els.hijriDate.textContent = PT.hijriText(now, cfg.calc.hijriOffset);
  }

  function describeEvent(e) {
    if (!e) return { label: 'Следующее событие', name: '—' };
    if (e.kind === 'iqama') return { label: 'До икамы', name: e.name };
    if (e.kind === 'jumuah') return { label: 'Джума', name: e.name };
    if (e.kind === 'read') return { label: 'До чтения в мечетях', name: '' };
    if (e.id === 'sunrise') return { label: 'До восхода', name: 'Восход солнца' };
    return { label: 'До азана', name: e.name };
  }

  function eventNote(e) {
    if (!e) return '';
    if (e.note) return e.note;
    if (e.kind === 'jumuah') return '';
    var list = e.tomorrow ? tomorrow : schedule;
    if (!list || !list.ok) return '';
    var p = null;
    list.prayers.forEach(function (x) { if (x.id === e.id) p = x; });
    if (!p || !p.adhan) return '';
    var parts = ['Азан ' + PT.fmtHM(p.adhan)];
    if (p.iqama) parts.push('Икама ' + PT.fmtHM(p.iqama));
    return parts.join(' · ');
  }

  function updateCardStates(nowMs) {
    if (!schedule || !schedule.ok) return;
    var ps = schedule.prayers;
    var activeId = null;
    var fajrMs = ps[0] && ps[0].adhan ? ps[0].adhan.getTime() : Infinity;
    if (nowMs < fajrMs) activeId = 'isha'; /* после полуночи действует период Иши */
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (!p.adhan || p.id === 'sunrise') continue;
      var start = p.adhan.getTime();
      var end = start;
      if (p.id === 'fajr') {
        end = ps[1] && ps[1].adhan ? ps[1].adhan.getTime() : start;
      } else if (p.id === 'isha') {
        end = tomorrow && tomorrow.ok && tomorrow.prayers[0] && tomorrow.prayers[0].adhan
          ? tomorrow.prayers[0].adhan.getTime() : start;
      } else if (ps[i + 1] && ps[i + 1].adhan) {
        end = ps[i + 1].adhan.getTime();
      }
      if (nowMs >= start && nowMs < end) activeId = p.id;
    }
    cards.forEach(function (card) {
      var id = card.dataset.id;
      if (id === 'read') {
        card.classList.remove('active', 'passed', 'iqama-soon');
        if (schedule.read && !schedule.readHidden && nowMs >= schedule.read.getTime()) card.classList.add('passed');
        return;
      }
      if (id === 'zenith') {
        card.classList.remove('active', 'passed', 'iqama-soon');
        if (schedule.zenith && nowMs >= schedule.zenith.getTime()) card.classList.add('passed');
        return;
      }
      var p = null;
      ps.forEach(function (x) { if (x.id === id) p = x; });
      card.classList.remove('active', 'passed', 'iqama-soon');
      if (!p || !p.adhan) return;
      if (id === activeId) {
        card.classList.add('active');
        if (p.iqama && nowMs >= p.adhan.getTime() && nowMs < p.iqama.getTime()) card.classList.add('iqama-soon');
      } else if (nowMs >= p.adhan.getTime()) {
        card.classList.add('passed');
      }
    });
  }

  function tick() {
    var now = new Date();
    var nowMs = now.getTime();

    var hhmm = PT.fmtHM(now);
    var ss = ('0' + now.getSeconds()).slice(-2);
    els.clock.textContent = cfg.display.showSeconds ? hhmm + ':' + ss : hhmm;
    applyPalette();

    if (PT.dateKey(now) !== currentDayKey) {
      recompute();
      buildCards();
      buildJumuah();
      buildWarnings();
      updateCardStates(nowMs);
      return;
    }

    var next = PT.nextEvent(events, nowMs);
    if (next) {
      var d = describeEvent(next);
      els.heroLabel.textContent = d.label;
      els.heroName.textContent = d.name;
      els.heroCount.textContent = PT.fmtDuration(next.at - nowMs);
      var note = eventNote(next);
      if (next.tomorrow) note = 'Завтра. ' + note;
      els.heroNote.textContent = note;
      var prev = PT.prevEvent(events, nowMs);
      var from = prev ? prev.at : next.at - 6 * 3600000;
      var span = next.at - from;
      var frac = span > 0 ? (nowMs - from) / span : 0;
      els.progress.style.width = Math.max(0, Math.min(100, frac * 100)).toFixed(2) + '%';
    } else {
      els.heroLabel.textContent = 'Следующее событие';
      els.heroName.textContent = '—';
      els.heroCount.textContent = '--:--:--';
      els.heroNote.textContent = '';
      els.progress.style.width = '0%';
    }

    updateCardStates(nowMs);
  }

  function rebuild() {
    applyTheme();
    renderStatic();
    recompute();
    buildCards();
    buildTicker();
    buildJumuah();
    buildWarnings();
    tick();
  }

  function toggleFull() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function () {});
    }
  }

  els.btnFull.addEventListener('click', toggleFull);
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (k === 'f' || k === 'а') toggleFull();
  });

  window.addEventListener('storage', function (e) {
    if (e.key === Store.KEY) {
      cfg = Store.load();
      rebuild();
    }
  });
  window.addEventListener('namaz-config', function () { cfg = Store.load(); rebuild(); });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      recompute();
      updateCardStates(Date.now());
    }
  });

  rebuild();
  window.NamazTick(tick);
})();

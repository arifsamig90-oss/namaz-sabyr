/*!
 * cloud.js — настройки табло через интернет, как в Mawaqit.
 *
 * Хранилище — Firebase Realtime Database (бесплатный план), работа через REST,
 * без сторонних библиотек:
 *   /mosques/<код мечети> = { config: "<JSON настроек>", updatedAt: <время сервера>, name }
 * Читать может любой (табло, будущие приложения для прихожан),
 * записывать — только вошедший администратор (правила базы, см. «Облако.html»).
 *
 * Табло раз в минуту проверяет updatedAt и, если в облаке новее, применяет настройки.
 */
(function (global) {
  'use strict';
  var SESSION_KEY = 'namazTablo.cloud.session';
  var APPLIED_KEY = 'namazTablo.cloud.applied';
  var POLL_MS = 60000;

  function ls(k, v) {
    try {
      if (v === undefined) return global.localStorage.getItem(k);
      if (v === null) global.localStorage.removeItem(k);
      else global.localStorage.setItem(k, v);
    } catch (e) { /* хранилище недоступно */ }
    return null;
  }

  function ready(c) { return !!(c && c.enabled && c.dbUrl && c.mosqueId); }

  /* адрес в базе: dbUrl может содержать ?ns=… (локальный эмулятор Firebase) */
  function dbUrl(c, path, params) {
    var raw = c.dbUrl.trim();
    var q = '';
    var i = raw.indexOf('?');
    if (i >= 0) { q = raw.slice(i + 1); raw = raw.slice(0, i); }
    raw = raw.replace(/\/+$/, '');
    var query = [q, params || ''].filter(Boolean).join('&');
    return raw + '/mosques/' + encodeURIComponent(c.mosqueId) + (path || '') + '.json' + (query ? '?' + query : '');
  }

  /* вход по почте и паролю — Firebase Authentication (или его локальный эмулятор) */
  function authBase(c) {
    var m = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.exec(c.dbUrl || '');
    if (m) return { id: 'http://' + m[1] + ':9099/identitytoolkit.googleapis.com/v1', st: 'http://' + m[1] + ':9099/securetoken.googleapis.com/v1' };
    return { id: 'https://identitytoolkit.googleapis.com/v1', st: 'https://securetoken.googleapis.com/v1' };
  }

  function request(method, url, body, cb, contentType) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = 20000;
    if (body != null) xhr.setRequestHeader('Content-Type', contentType || 'application/json');
    xhr.onload = function () {
      var data = null;
      try { data = JSON.parse(xhr.responseText); } catch (e) { /* не JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) cb(null, data);
      else cb(errorText(xhr.status, data), data);
    };
    xhr.onerror = function () { cb('Нет связи с облаком (интернет?)'); };
    xhr.ontimeout = function () { cb('Облако не ответило вовремя'); };
    xhr.send(body == null ? null : body);
  }

  function errorText(status, data) {
    var msg = data && (data.error && (data.error.message || data.error)) || '';
    if (/INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS|EMAIL_NOT_FOUND|INVALID_EMAIL/.test(msg)) return 'Неверная почта или пароль';
    if (/TOO_MANY_ATTEMPTS/.test(msg)) return 'Слишком много попыток, подождите немного';
    if (/API key not valid|API_KEY_INVALID/.test(msg)) return 'Неверный «Ключ Web API»';
    if (status === 401 || /Permission denied/i.test(msg)) return 'Нет прав на запись (проверьте вход и правила базы)';
    if (status === 404) return 'База не найдена — проверьте адрес базы';
    return 'Ошибка облака: ' + (msg || status);
  }

  /* ---------- вход администратора ---------- */

  function session() {
    try { return JSON.parse(ls(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }

  function signIn(c, email, password, cb) {
    if (!c.apiKey) { cb('Укажите «Ключ Web API»'); return; }
    var url = authBase(c).id + '/accounts:signInWithPassword?key=' + encodeURIComponent(c.apiKey);
    request('POST', url, JSON.stringify({ email: email, password: password, returnSecureToken: true }), function (err, d) {
      if (err) { cb(err); return; }
      var s = { email: d.email, idToken: d.idToken, refreshToken: d.refreshToken, expiresAt: Date.now() + (+d.expiresIn - 60) * 1000 };
      ls(SESSION_KEY, JSON.stringify(s));
      cb(null, s);
    });
  }

  function signOut() { ls(SESSION_KEY, null); }

  /* действующий токен; при необходимости обновляем по refreshToken */
  function token(c, cb) {
    var s = session();
    if (!s) { cb('Войдите в облако'); return; }
    if (Date.now() < s.expiresAt) { cb(null, s.idToken); return; }
    var url = authBase(c).st + '/token?key=' + encodeURIComponent(c.apiKey);
    request('POST', url, 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(s.refreshToken), function (err, d) {
      if (err) { cb('Вход устарел — войдите снова'); return; }
      s.idToken = d.id_token;
      s.refreshToken = d.refresh_token;
      s.expiresAt = Date.now() + (+d.expires_in - 60) * 1000;
      ls(SESSION_KEY, JSON.stringify(s));
      cb(null, s.idToken);
    }, 'application/x-www-form-urlencoded');
  }

  /* ---------- запись и чтение ---------- */

  function push(c, cfg, cb) {
    if (!ready(c)) { cb('Облако не настроено'); return; }
    token(c, function (err, idToken) {
      if (err) { cb(err); return; }
      var body = JSON.stringify({
        config: JSON.stringify(cfg),
        name: (cfg.mosque && cfg.mosque.name) || '',
        updatedAt: { '.sv': 'timestamp' }
      });
      request('PUT', dbUrl(c, '', 'auth=' + encodeURIComponent(idToken)), body, function (e2) { cb(e2 || null); });
    });
  }

  function pull(c, cb) {
    if (!ready(c)) { cb('Облако не настроено'); return; }
    request('GET', dbUrl(c, ''), null, function (err, d) {
      if (err) { cb(err); return; }
      if (!d || !d.config) { cb('В облаке ещё нет настроек этой мечети'); return; }
      cb(null, d.config, d.updatedAt || 0);
    });
  }

  /* ---------- табло: следим за облаком ---------- */

  var pollTimer = null;
  function watch(cfg, onConfig) {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    var c = cfg && cfg.cloud;
    if (!ready(c)) return;
    function check() {
      request('GET', dbUrl(c, '/updatedAt'), null, function (err, at) {
        if (err || !at) return;
        var applied = +(ls(APPLIED_KEY) || 0);
        if (+at <= applied) return;
        pull(c, function (e2, json, updatedAt) {
          if (e2) return;
          ls(APPLIED_KEY, String(updatedAt));
          onConfig(json, updatedAt);
        });
      });
    }
    check();
    pollTimer = setInterval(check, POLL_MS);
  }

  global.NamazCloud = {
    ready: ready, signIn: signIn, signOut: signOut, session: session,
    push: push, pull: pull, watch: watch
  };
})(typeof self !== 'undefined' ? self : this);

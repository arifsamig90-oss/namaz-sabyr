/*!
 * clock-tick.js — точный «метроном» для часов табло.
 *
 * NamazTick(fn) вызывает fn в начале каждой секунды.
 *  - Каждый тик заново выравнивается по часам устройства, поэтому
 *    ошибка не накапливается (setInterval со временем «уплывает»).
 *  - Отсчёт идёт в фоновом потоке (Web Worker): Chrome притормаживает
 *    таймеры страницы, когда окно не на переднем плане (табло на втором
 *    экране, Mac заблокирован) — до одного тика в минуту, и часы отстают.
 *    Сообщения из фонового потока так не притормаживаются.
 *  - При возврате на страницу (вкладка, окно, сон) — сразу тик.
 *
 * NamazTime.now() — точное время, мс. В приложении для Android TV к часам
 * приставки прибавляется поправка по интернету (NTP, см. TimeSync.java).
 */
(function (global) {
  'use strict';

  /* поправка часов по интернету (мс) — только в приложении для Android TV */
  var offset = 0;
  function readOffset() {
    try {
      var n = global.TabloNative ? parseFloat(global.TabloNative.timeOffset()) : 0;
      offset = isFinite(n) && Math.abs(n) < 7 * 86400000 ? n : 0;
    } catch (e) { offset = 0; }
    return offset;
  }
  readOffset();
  var NamazTime = {
    now: function () { return Date.now() + offset; },
    offset: function () { return offset; },
    info: function () {
      try { return global.TabloNative ? JSON.parse(global.TabloNative.timeInfo()) : null; } catch (e) { return null; }
    }
  };

  /* мс до начала следующей секунды по точному времени (+15 мс запаса) */
  var DELAY = 'var off=0;onmessage=function(e){off=e.data;};function d(){return 1015-((Date.now()+off)%1000+1000)%1000;}';

  function NamazTick(fn) {
    var last = 0;
    function run() {
      var now = Date.now();
      if (now - last < 200) return; /* защита от двойного вызова */
      last = now;
      try { fn(); } catch (e) { if (global.console) console.error(e); }
      heartbeat();
    }

    /* «пульс» для сторожа в приложении Android TV: отмечаемся только после того,
       как кадр реально отрисован (requestAnimationFrame) — если страница
       зависла или перестала рисоваться, приложение её перезагрузит */
    function heartbeat() {
      var nat = global.TabloNative;
      if (!nat || !nat.heartbeat) return;
      var send = function () { try { nat.heartbeat(); } catch (e) { /* нет моста */ } };
      if (global.requestAnimationFrame) global.requestAnimationFrame(send); else send();
    }

    var worker = null;
    try {
      var src = DELAY + 'function t(){postMessage(0);setTimeout(t,d());}setTimeout(t,d());';
      var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.postMessage(offset);
      worker.onmessage = run;
      worker.onerror = function () { worker = null; fallback(); };
    } catch (e) {
      worker = null;
    }

    var timer = null;
    function fallback() {
      if (timer) return;
      (function loop() {
        run();
        timer = setTimeout(loop, 1015 - (NamazTime.now() % 1000 + 1000) % 1000);
      })();
    }
    if (!worker) fallback();

    /* страховка: если фоновый поток вдруг замолчал — переходим на обычный таймер */
    setInterval(function () {
      if (Date.now() - last > 3000) { worker = null; fallback(); }
    }, 5000);

    function wake() { last = 0; run(); }
    /* приложение сверило часы с интернетом — подхватываем новую поправку */
    function resync() {
      readOffset();
      if (worker) worker.postMessage(offset);
      wake();
    }
    global.NamazTimeSynced = resync;
    setInterval(resync, 10 * 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
    global.addEventListener('focus', wake);
    global.addEventListener('pageshow', wake);
  }

  global.NamazTick = NamazTick;
  global.NamazTime = NamazTime;
})(typeof self !== 'undefined' ? self : this);

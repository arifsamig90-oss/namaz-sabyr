/*!
 * backgrounds.js — встроенные фоны «Намаз-Табло»:
 * звёздное небо, море, закат, северное сияние, орнамент.
 * Все фоны — самодостаточные SVG (внешние файлы не нужны).
 */
(function (global) {
  'use strict';

  var W = 1600, H = 900;

  function b64(s) { return btoa(s); }
  function uri(svg) { return 'data:image/svg+xml;base64,' + b64(svg); }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- звёздное небо ---------- */
  function stars() {
    var rnd = mulberry32(20260930);
    var out = [];
    var i;
    for (i = 0; i < 230; i++) {
      var x = (rnd() * W).toFixed(0), y = (rnd() * H).toFixed(0);
      var r = (0.6 + rnd() * 1.7).toFixed(2);
      var o = (0.2 + rnd() * 0.6).toFixed(2);
      out.push("<circle cx='" + x + "' cy='" + y + "' r='" + r + "' fill='#dfe9ff' fill-opacity='" + o + "'/>");
    }
    for (i = 0; i < 7; i++) {
      var bx = (60 + rnd() * (W - 120)).toFixed(0), by = (40 + rnd() * (H - 260)).toFixed(0);
      out.push("<circle cx='" + bx + "' cy='" + by + "' r='7' fill='#9ec2ff' fill-opacity='0.16'/>" +
        "<circle cx='" + bx + "' cy='" + by + "' r='2.4' fill='#ffffff' fill-opacity='0.92'/>");
    }
    return "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "'>" +
      "<defs>" +
      "<linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0' stop-color='#04081a'/><stop offset='0.55' stop-color='#0a1530'/><stop offset='1' stop-color='#13234c'/>" +
      "</linearGradient>" +
      "<radialGradient id='mw' cx='0.5' cy='0.5' r='0.5'>" +
      "<stop offset='0' stop-color='#7d92d6' stop-opacity='0.22'/><stop offset='1' stop-color='#7d92d6' stop-opacity='0'/>" +
      "</radialGradient>" +
      "<radialGradient id='glow' cx='0.82' cy='0.08' r='0.6'>" +
      "<stop offset='0' stop-color='#2b4a8a' stop-opacity='0.5'/><stop offset='1' stop-color='#2b4a8a' stop-opacity='0'/>" +
      "</radialGradient>" +
      "</defs>" +
      "<rect width='" + W + "' height='" + H + "' fill='url(#sky)'/>" +
      "<ellipse cx='820' cy='430' rx='980' ry='190' fill='url(#mw)' transform='rotate(-17 820 430)'/>" +
      "<rect width='" + W + "' height='" + H + "' fill='url(#glow)'/>" +
      out.join('') +
      "</svg>";
  }

  /* ---------- море ---------- */
  function sea() {
    function band(y0, amp, waves, color, opacity) {
      var step = W / 56, d = 'M 0 ' + y0.toFixed(1), x, y;
      for (x = step; x <= W + step; x += step) {
        y = y0 + Math.sin((x / W) * Math.PI * 2 * waves) * amp;
        d += ' L ' + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      d += ' L ' + W + ' ' + H + ' L 0 ' + H + ' Z';
      return "<path d='" + d + "' fill='" + color + "' fill-opacity='" + opacity + "'/>";
    }
    return "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "'>" +
      "<defs>" +
      "<linearGradient id='sk' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0' stop-color='#0a2331'/><stop offset='0.6' stop-color='#0d3140'/><stop offset='1' stop-color='#0e3a4a'/>" +
      "</linearGradient>" +
      "<radialGradient id='gl' cx='0.5' cy='0.42' r='0.5'>" +
      "<stop offset='0' stop-color='#63d8d8' stop-opacity='0.28'/><stop offset='1' stop-color='#63d8d8' stop-opacity='0'/>" +
      "</radialGradient>" +
      "</defs>" +
      "<rect width='" + W + "' height='" + H + "' fill='url(#sk)'/>" +
      "<ellipse cx='800' cy='380' rx='620' ry='170' fill='url(#gl)'/>" +
      band(392, 10, 3.0, '#17505f', 0.55) +
      band(462, 14, 2.5, '#114352', 0.6) +
      band(546, 18, 2.0, '#0d3644', 0.65) +
      band(642, 22, 1.6, '#092a36', 0.7) +
      band(750, 26, 1.2, '#061d27', 0.8) +
      "</svg>";
  }

  /* ---------- закат ---------- */
  function sunset() {
    return "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "'>" +
      "<defs>" +
      "<linearGradient id='ss' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0' stop-color='#171030'/><stop offset='0.32' stop-color='#3b1e4e'/>" +
      "<stop offset='0.58' stop-color='#8a3a58'/><stop offset='0.78' stop-color='#d96e4a'/>" +
      "<stop offset='1' stop-color='#f2ae66'/>" +
      "</linearGradient>" +
      "<radialGradient id='sglow' cx='0.5' cy='0.72' r='0.45'>" +
      "<stop offset='0' stop-color='#ffc077' stop-opacity='0.75'/><stop offset='1' stop-color='#ffc077' stop-opacity='0'/>" +
      "</radialGradient>" +
      "</defs>" +
      "<rect width='" + W + "' height='" + H + "' fill='url(#ss)'/>" +
      "<ellipse cx='800' cy='650' rx='620' ry='300' fill='url(#sglow)'/>" +
      "<circle cx='800' cy='636' r='64' fill='#ffe2b0' fill-opacity='0.98'/>" +
      "<path d='M0 736 C 260 700 470 716 700 748 C 980 788 1250 760 1600 712 L1600 900 L0 900 Z' fill='#2a1533' fill-opacity='0.86'/>" +
      "<path d='M0 806 C 340 768 560 800 860 822 C 1160 844 1400 820 1600 796 L1600 900 L0 900 Z' fill='#190c20' fill-opacity='0.92'/>" +
      "</svg>";
  }

  /* ---------- северное сияние ---------- */
  function aurora() {
    var rnd = mulberry32(777);
    var out = [];
    for (var i = 0; i < 110; i++) {
      var x = (rnd() * W).toFixed(0), y = (rnd() * 520).toFixed(0);
      out.push("<circle cx='" + x + "' cy='" + y + "' r='" + (0.6 + rnd() * 1.4).toFixed(2) + "' fill='#dfe9ff' fill-opacity='" + (0.15 + rnd() * 0.5).toFixed(2) + "'/>");
    }
    return "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "'>" +
      "<defs>" +
      "<linearGradient id='ag' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0' stop-color='#050b1c'/><stop offset='1' stop-color='#0b1a38'/>" +
      "</linearGradient>" +
      "<linearGradient id='r1' x1='0' y1='0' x2='1' y2='0'>" +
      "<stop offset='0' stop-color='#3ee6a8' stop-opacity='0'/><stop offset='0.3' stop-color='#3ee6a8' stop-opacity='0.9'/>" +
      "<stop offset='0.65' stop-color='#59c8e8' stop-opacity='0.85'/><stop offset='1' stop-color='#8f7df0' stop-opacity='0'/>" +
      "</linearGradient>" +
      "<linearGradient id='r2' x1='0' y1='0' x2='1' y2='0'>" +
      "<stop offset='0' stop-color='#8f7df0' stop-opacity='0'/><stop offset='0.4' stop-color='#7fe0c0' stop-opacity='0.75'/>" +
      "<stop offset='1' stop-color='#59c8e8' stop-opacity='0'/>" +
      "</linearGradient>" +
      "<filter id='bl' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='26'/></filter>" +
      "</defs>" +
      "<rect width='" + W + "' height='" + H + "' fill='url(#ag)'/>" +
      out.join('') +
      "<g filter='url(#bl)'>" +
      "<path d='M-120 500 C 260 320 520 400 820 290 C 1120 190 1420 310 1720 220' stroke='url(#r1)' stroke-width='120' fill='none' stroke-opacity='0.42'/>" +
      "<path d='M-120 590 C 320 440 620 520 920 420 C 1220 330 1520 440 1720 350' stroke='url(#r2)' stroke-width='80' fill='none' stroke-opacity='0.36'/>" +
      "</g>" +
      "<path d='M0 806 C 360 770 640 806 980 792 C 1260 780 1460 796 1600 782 L1600 900 L0 900 Z' fill='#04070f'/>" +
      "</svg>";
  }

  /* ---------- орнамент ---------- */
  function ornament() {
    return "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "'>" +
      "<defs>" +
      "<radialGradient id='og' cx='0.5' cy='0.35' r='1'>" +
      "<stop offset='0' stop-color='#123a2c'/><stop offset='0.6' stop-color='#0d281f'/><stop offset='1' stop-color='#081b15'/>" +
      "</radialGradient>" +
      "<pattern id='op' width='120' height='120' patternUnits='userSpaceOnUse' patternTransform='rotate(15)'>" +
      "<path d='M60 6 L114 60 L60 114 L6 60 Z' fill='none' stroke='#74d8ba' stroke-opacity='0.16' stroke-width='1.4'/>" +
      "<path d='M25 25 L95 25 L95 95 L25 95 Z' fill='none' stroke='#74d8ba' stroke-opacity='0.10' stroke-width='1.2'/>" +
      "<circle cx='60' cy='60' r='5.5' fill='#74d8ba' fill-opacity='0.22'/>" +
      "<circle cx='0' cy='0' r='2.4' fill='#74d8ba' fill-opacity='0.18'/>" +
      "</pattern>" +
      "<radialGradient id='ov' cx='0.5' cy='0.5' r='0.75'>" +
      "<stop offset='0.55' stop-color='#000000' stop-opacity='0'/><stop offset='1' stop-color='#000000' stop-opacity='0.35'/>" +
      "</radialGradient>" +
      "</defs>" +
      "<rect width='" + W + "' height='" + H + "' fill='url(#og)'/>" +
      "<rect width='" + W + "' height='" + H + "' fill='url(#op)'/>" +
      "<rect width='" + W + "' height='" + H + "' fill='url(#ov)'/>" +
      "</svg>";
  }

  /* Цвета табло под каждый фон: плитки, рамки, панели, экраны азана.
     accent* — золото/акцент для «Стиля нашей мечети» (в стиле «по акценту»
     остаётся цвет, выбранный в настройках). */
  function pal(tile, border, panelA, panelB, solidA, solidB, glow, base, accent, accent2, ink) {
    return {
      tile: tile, border: border, panelA: panelA, panelB: panelB, solidA: solidA, solidB: solidB,
      glow: glow, base: base, accent: accent, accent2: accent2, ink: ink
    };
  }
  var GOLD = ['#d6b15e', '#f1d792'];

  var defs = {
    stars: { name: 'Звёздное небо', make: stars,
      palette: pal('rgba(9, 17, 44, 0.70)', 'rgba(158, 194, 255, 0.32)', 'rgba(22, 38, 92, 0.92)', 'rgba(5, 9, 28, 0.92)',
        '#16265c', '#05091c', 'rgba(60, 90, 170, 0.55)', '#04081a', GOLD[0], GOLD[1], '#0b1533') },
    sea: { name: 'Море', make: sea,
      palette: pal('rgba(5, 40, 52, 0.70)', 'rgba(99, 216, 216, 0.36)', 'rgba(16, 70, 86, 0.92)', 'rgba(4, 26, 34, 0.92)',
        '#0f4656', '#041a22', 'rgba(40, 140, 150, 0.55)', '#04161d', '#5fd4d4', '#b2efec', '#03252b') },
    sunset: { name: 'Закат', make: sunset,
      palette: pal('rgba(40, 16, 48, 0.66)', 'rgba(242, 174, 102, 0.42)', 'rgba(92, 38, 78, 0.92)', 'rgba(26, 10, 32, 0.92)',
        '#5c264e', '#1a0a20', 'rgba(170, 70, 90, 0.55)', '#150a1c', '#f0a85e', '#ffd6a0', '#2a1206') },
    aurora: { name: 'Северное сияние', make: aurora,
      palette: pal('rgba(5, 22, 36, 0.68)', 'rgba(62, 230, 168, 0.34)', 'rgba(12, 64, 70, 0.92)', 'rgba(5, 12, 28, 0.92)',
        '#0c4046', '#050c1c', 'rgba(40, 160, 130, 0.45)', '#050b1c', '#45e0aa', '#a8f3d6', '#03261a') },
    ornament: { name: 'Орнамент', make: ornament,
      palette: pal('rgba(7, 34, 26, 0.72)', 'rgba(214, 177, 94, 0.38)', 'rgba(20, 70, 52, 0.92)', 'rgba(6, 24, 18, 0.92)',
        '#144634', '#061812', 'rgba(30, 110, 80, 0.5)', '#06140f', GOLD[0], GOLD[1], '#0b1f17') }
  };

  var list = ['stars', 'sea', 'sunset', 'aurora', 'ornament'];
  var names = {};
  list.forEach(function (id) { names[id] = defs[id].name; });

  var cache = {};

  function get(id) {
    if (list.indexOf(id) === -1) return null;
    if (!cache[id]) cache[id] = uri(defs[id].make());
    return cache[id];
  }

  /* URI для режима фона: 'image' (загруженная), предустановка, либо null */
  function uriFor(mode, customImage) {
    if (mode === 'image') {
      return (typeof customImage === 'string' && customImage.indexOf('data:image') === 0) ? customImage : null;
    }
    if (list.indexOf(mode) !== -1) return get(mode);
    return null;
  }

  /* ---------- цвета под загруженную картинку ---------- */
  function hsl(h, s, l, a) {
    return 'hsla(' + Math.round(h) + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%, ' + a + ')';
  }
  function paletteFromRgb(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    var l = (max + min) / 2, s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), h = 0;
    if (d) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    var sat = Math.min(0.5, s);
    var p = pal(hsl(h, sat, 0.10, 0.70), hsl(h, sat, 0.65, 0.36), hsl(h, sat, 0.22, 0.92), hsl(h, sat, 0.07, 0.92),
      hsl(h, sat, 0.22, 1), hsl(h, sat, 0.07, 1), hsl(h, sat, 0.35, 0.55), hsl(h, sat, 0.05, 1), GOLD[0], GOLD[1], '#0b1533');
    /* у цветной картинки акцент берём из неё, у серой — оставляем золото */
    if (s >= 0.18) {
      p.accent = hsl(h, 0.6, 0.64, 1); p.accent2 = hsl(h, 0.7, 0.82, 1); p.ink = hsl(h, 0.6, 0.08, 1);
    }
    return p;
  }
  var imgPalCache = { src: null, pal: null };
  /* средний цвет картинки (уменьшаем до 32×18 и усредняем) */
  function imagePalette(src, done) {
    if (imgPalCache.src === src) { done(imgPalCache.pal); return; }
    var img = new Image();
    img.onload = function () {
      try {
        var c = document.createElement('canvas');
        c.width = 32; c.height = 18;
        var x = c.getContext('2d');
        x.drawImage(img, 0, 0, 32, 18);
        var px = x.getImageData(0, 0, 32, 18).data, r = 0, g = 0, b = 0, n = px.length / 4;
        for (var i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; b += px[i + 2]; }
        imgPalCache = { src: src, pal: paletteFromRgb(r / n, g / n, b / n) };
        done(imgPalCache.pal);
      } catch (e) { done(null); }
    };
    img.onerror = function () { done(null); };
    img.src = src;
  }

  /* палитра для режима фона: сразу для встроенных, асинхронно для картинки */
  function paletteFor(mode, customImage, done) {
    if (list.indexOf(mode) !== -1) { done(defs[mode].palette); return; }
    var uri = uriFor(mode, customImage);
    if (uri) imagePalette(uri, done); else done(null);
  }

  global.NamazBackgrounds = { list: list, names: names, get: get, uriFor: uriFor, paletteFor: paletteFor };
})(typeof self !== 'undefined' ? self : this);

/* SlimDash - JavaScript ES5 uniquement (Android 4.x, vieux WebKit). */
(function () {
  var SD = window.SD;
  var conn = SD.c, errs = 0;
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  function $(id) { return document.getElementById(id); }
  function qs(extra) {
    var s = 'cv=' + encodeURIComponent(SD.cv) + '&cl=' + SD.cl;
    if (SD.key) { s += '&k=' + encodeURIComponent(SD.key); }
    return extra ? s + '&' + extra : s;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* ---- horloge : formats de la carte digital-clock (HH:mm, cccc d LLLL yyyy...) ---- */
  var JOURS3 = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  var MOIS3 = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function fmtDate(f, d) {
    return f.replace(/'([^']*)'|cccc|EEEE|ccc|EEE|LLLL|MMMM|LLL|MMM|LL|MM|dd|d|yyyy|yy|HH|H|hh|h|mm|ss|a/g, function (t, q) {
      var h12 = d.getHours() % 12 || 12;
      switch (t) {
        case 'cccc': case 'EEEE': return JOURS[d.getDay()];
        case 'ccc': case 'EEE': return JOURS3[d.getDay()];
        case 'LLLL': case 'MMMM': return MOIS[d.getMonth()];
        case 'LLL': case 'MMM': return MOIS3[d.getMonth()];
        case 'LL': case 'MM': return pad(d.getMonth() + 1);
        case 'dd': return pad(d.getDate());
        case 'd': return '' + d.getDate();
        case 'yyyy': return '' + d.getFullYear();
        case 'yy': return ('' + d.getFullYear()).slice(2);
        case 'HH': return pad(d.getHours());
        case 'H': return '' + d.getHours();
        case 'hh': return pad(h12);
        case 'h': return '' + h12;
        case 'mm': return pad(d.getMinutes());
        case 'ss': return pad(d.getSeconds());
        case 'a': return d.getHours() < 12 ? 'AM' : 'PM';
      }
      return q || '';
    });
  }
  /* Temps écoulé, comme HA en français (même calcul que rel_fr() côté serveur). */
  var TOT = [[45, 1, 'seconde'], [2700, 60, 'minute'], [79200, 3600, 'heure'], [432000, 86400, 'jour'],
    [2419200, 604800, 'semaine'], [31536000, 2592000, 'mois'], [1e12, 31536000, 'an']];
  function relFr(t, tot) {
    var s = Math.max(0, Math.floor(new Date().getTime() / 1000 - t)), n, x, i;
    if (tot) {
      for (i = 0; i < TOT.length; i++) {
        if (s < TOT[i][0]) {
          n = i ? Math.max(1, Math.round(s / TOT[i][1])) : s;
          return n + ' ' + TOT[i][2] + (n > 1 && TOT[i][2] !== 'mois' ? 's' : '');
        }
      }
    }
    if (s < 45) { x = s < 1 ? 'maintenant' : 'il y a ' + s + ' seconde' + (s > 1 ? 's' : ''); }
    else if (s < 2700) { n = Math.max(1, Math.round(s / 60)); x = 'il y a ' + n + ' minute' + (n > 1 ? 's' : ''); }
    else if (s < 79200) { n = Math.max(1, Math.round(s / 3600)); x = 'il y a ' + n + ' heure' + (n > 1 ? 's' : ''); }
    else if (s < 432000) { n = Math.max(1, Math.round(s / 86400)); x = n === 1 ? 'hier' : (n === 2 ? 'avant-hier' : 'il y a ' + n + ' jours'); }
    else if (s < 2419200) { n = Math.max(1, Math.round(s / 604800)); x = n === 1 ? 'la semaine dernière' : 'il y a ' + n + ' semaines'; }
    else if (s < 31536000) { n = Math.max(1, Math.round(s / 2592000)); x = n === 1 ? 'le mois dernier' : 'il y a ' + n + ' mois'; }
    else { n = Math.max(1, Math.round(s / 31536000)); x = n === 1 ? 'l’année dernière' : 'il y a ' + n + ' ans'; }
    return x.charAt(0).toUpperCase() + x.slice(1);
  }

  function clock() {
    var d = new Date();
    var i, els, t;
    els = document.querySelectorAll('.ago');
    for (i = 0; i < els.length; i++) {
      t = relFr(+els[i].getAttribute('data-t'), els[i].getAttribute('data-m') === 't');
      if (els[i].innerHTML !== t) { els[i].innerHTML = t; }
    }
    els = document.querySelectorAll('.cl');
    for (i = 0; i < els.length; i++) {
      t = fmtDate(els[i].getAttribute('data-f') || 'HH:mm', d);
      if (els[i].innerHTML !== t) { els[i].innerHTML = t; }
    }
  }

  /* ---- état de la connexion : vert = OK, orange = HA perdu, rouge = SlimDash injoignable ---- */
  function setDot(cls) { var d = $('dot'); if (d) { d.className = cls; } }

  /* ---- mises à jour (long polling) ---- */
  function apply(u) {
    var id, el, x;
    for (id in u) {
      if (!u.hasOwnProperty(id)) { continue; }
      el = $(id);
      if (!el) { continue; }
      x = u[id];
      if (x[0] !== null && !editing(el)) { el.innerHTML = x[0]; }
      if (x[1] !== null) { el.className = (el.getAttribute('data-b') || '') + ' ' + x[1]; }
      if (x.length > 2) { paint(el, x[2]); }
    }
  }

  /* un champ en cours de modification n'est pas remplacé par la mise à jour */
  function editing(el) {
    var a = document.activeElement;
    return a && a !== document.body && /^(INPUT|SELECT)$/.test(a.tagName) && el.contains(a);
  }
  /* ---- champs modifiables (nombre, liste, heure, texte) : envoyés au changement ---- */
  function edSend(el) {
    var x = new XMLHttpRequest();
    x.onreadystatechange = function () {
      var r = null;
      if (x.readyState !== 4) { return; }
      try { r = JSON.parse(x.responseText); } catch (e) { r = null; }
      if (r && r.r) { location.reload(); return; }
      if (x.status !== 200) { flash(el, 'err', 1500); } else if (SD.iv) { schedule(1000); }
    };
    x.open('POST', SD.base + 'a?' + qs(), true);
    x.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    x.send('a=' + el.getAttribute('data-e') + '&v=' + encodeURIComponent(el.value));
  }
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-e') !== null) { edSend(t); }
  }, false);
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.keyCode === 13 && t && t.tagName === 'INPUT' && t.getAttribute('data-e') !== null) { t.blur(); }
  }, false);
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t && t.type === 'range' && t.nextSibling) { t.nextSibling.innerHTML = t.value.replace('.', ','); }
  }, false);

  /* ---- couleur réelle d'une lampe : "#icône|#fond" ; "" = couleur du thème ---- */
  function paint(el, v) {
    var p = v ? v.split('|') : ['', ''], t = el, k, i, s;
    if (SD.cl !== 't1') {
      if (p[0]) { el.style.setProperty('--c', p[0]); } else { el.style.removeProperty('--c'); }
      return;
    }
    k = el.getElementsByTagName('*');
    for (i = 0; i < k.length; i++) {
      s = ' ' + (k[i].getAttribute('class') || '') + ' ';
      if (s.indexOf(' ti ') >= 0 || s.indexOf(' gic ') >= 0) { t = k[i]; break; }
    }
    s = t.getElementsByTagName('svg')[0];
    if (s) { s.style.color = p[0]; }
    if ((' ' + (t.getAttribute('class') || '') + ' ').indexOf(' ti ') >= 0) { t.style.backgroundColor = p[1]; }
  }
  (function () {
    var l = document.querySelectorAll('[data-c]'), i;
    for (i = 0; i < l.length; i++) { paint(l[i], l[i].getAttribute('data-c')); }
  })();

  /* SD.iv = 0 : temps réel (requête en attente côté serveur).
     SD.iv > 0 : une petite requête toutes les SD.iv secondes (Kindle...). */
  var nextTimer = null, busy = false;
  function schedule(ms) {
    if (nextTimer) { clearTimeout(nextTimer); }
    nextTimer = setTimeout(function () { nextTimer = null; poll(); }, ms);
  }
  function poll() {
    if (busy) { return; }
    busy = true;
    var x = new XMLHttpRequest(), done = false;
    var timer = setTimeout(function () { if (!done) { x.abort(); } }, (SD.tmo + 15) * 1000);
    x.onreadystatechange = function () {
      var r = null;
      if (x.readyState !== 4 || done) { return; }
      done = true;
      busy = false;
      clearTimeout(timer);
      if (x.status === 200) {
        try { r = JSON.parse(x.responseText); } catch (e) { r = null; }
      }
      if (r) {
        if (r.r) { location.reload(); return; }
        if (r.u) { apply(r.u); }
        SD.v = r.v;
        conn = r.c;
        setDot(conn ? 'ok' : 'ha');
        errs = 0;
        schedule(SD.iv ? SD.iv * 1000 : 100);
      } else {
        errs++;
        setDot('off');
        schedule(Math.max(SD.iv * 1000, Math.min(30000, 2000 * errs)));
      }
    };
    x.open('GET', SD.base + 'u?' + qs('v=' + SD.v + '&c=' + conn + (SD.iv ? '&w=0' : '') + '&_=' + new Date().getTime()), true);
    x.send(null);
  }

  /* ---- actions ---- */
  function swap(el) {
    var c = ' ' + el.className + ' ';
    if (c.indexOf(' on ') >= 0) { c = c.replace(' on ', ' off '); }
    else if (c.indexOf(' off ') >= 0) { c = c.replace(' off ', ' on '); }
    el.className = c.replace(/^\s+|\s+$/g, '');
  }
  function flash(el, cls, ms) {
    el.className += ' ' + cls;
    setTimeout(function () {
      el.className = (' ' + el.className + ' ').replace(' ' + cls + ' ', ' ').replace(/^\s+|\s+$/g, '');
    }, ms);
  }
  /* vieux WebKit (Android 4.4) : un toucher sur une icône <use> a pour cible un
     SVGElementInstance (sans getAttribute) -> on remonte à l'élément <use> */
  function real(el) {
    return el && !el.getAttribute && el.correspondingUseElement ? el.correspondingUseElement : el;
  }
  function target(el) {
    el = real(el);
    while (el && el.getAttribute) {
      /* champ modifiable : le navigateur gère le toucher (clavier, liste) */
      if (/^(INPUT|SELECT|OPTION)$/.test(el.tagName || '')) { return null; }
      /* un curseur gère lui-même le toucher : pas d'action de la carte en dessous */
      if (el.getAttribute('data-s') !== null) { return null; }
      if (el.getAttribute('data-a') !== null || el.getAttribute('data-n') !== null ||
          el.getAttribute('data-p') !== null) { return el; }
      el = el.parentNode;
    }
    return null;
  }
  function act(el) {
    var n = el.getAttribute('data-n'), list, i, x, p = el.getAttribute('data-p');
    if (p !== null) {
      /* couleurs d'une lampe : m = ouvrir la barre de teintes, v = valider (refermer) */
      x = el.parentNode.parentNode.childNodes;
      x[0].style.display = p === 'm' ? 'none' : 'block';
      x[1].style.display = p === 'm' ? 'block' : 'none';
      return;
    }
    if (n !== null) {
      location.href = SD.base + '?view=' + encodeURIComponent(n) + (SD.key ? '&k=' + encodeURIComponent(SD.key) : '');
      return;
    }
    /* mise à jour optimiste immédiate */
    list = el.getAttribute('data-o') !== null ? [el] : el.querySelectorAll('[data-o]');
    for (i = 0; i < list.length; i++) { swap(list[i]); }
    flash(el, 'prs', 300);
    x = new XMLHttpRequest();
    x.onreadystatechange = function () {
      var r = null;
      if (x.readyState !== 4) { return; }
      try { r = JSON.parse(x.responseText); } catch (e) { r = null; }
      if (r && r.r) { location.reload(); return; }
      if (x.status !== 200) {
        for (i = 0; i < list.length; i++) { swap(list[i]); }
        flash(el, 'err', 1500);
      } else if (SD.iv) {
        /* mode périodique : on récupère tout de suite le vrai état */
        schedule(1000);
      }
    };
    x.open('POST', SD.base + 'a?' + qs(), true);
    x.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    x.send('a=' + el.getAttribute('data-a'));
  }

  /* Tap rapide : évite le délai de 300 ms des vieux navigateurs tactiles. */
  var sx = 0, sy = 0, st = 0, touched = false;
  document.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    sx = t.clientX; sy = t.clientY; st = new Date().getTime(); touched = true;
  }, false);
  document.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0], el;
    if (!touched) { return; }
    touched = false;
    if (Math.abs(t.clientX - sx) > 12 || Math.abs(t.clientY - sy) > 12) { return; }
    if (new Date().getTime() - st > 800) { return; }
    el = target(e.target);
    if (el) { e.preventDefault(); lastTap = new Date().getTime(); act(el); }
  }, false);
  /* ---- curseurs des lampes (luminosité, température) : glissés, envoyés au relâcher ---- */
  var drag = null, lastTouch = 0;
  function slider(el) {
    el = real(el);
    while (el && el.getAttribute) {
      if (el.getAttribute('data-s') !== null) { return el; }
      el = el.parentNode;
    }
    return null;
  }
  /* cadran rond (carte light) : seul l'anneau réagit, pas le centre (ampoule) */
  function slHit(el, x, y) {
    var r;
    if (el.getAttribute('data-r') === null) { return true; }
    r = el.getBoundingClientRect();
    x -= r.left + r.width / 2; y -= r.top + r.height / 2;
    return Math.sqrt(x * x + y * y) > r.width * 0.3;
  }
  function slRound(el, x, y) {
    var r = el.getBoundingClientRect(), a, f, p;
    a = Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2)) * 180 / Math.PI;
    a = (a - 135 + 720) % 360;
    if (a > 270) { a = a > 315 ? 0 : 270; }
    f = a / 270;
    p = el.getElementsByTagName('path');
    if (p.length > 1) {
      p[1].setAttribute('stroke-dasharray', (f * parseFloat(el.getAttribute('data-f'))).toFixed(1) + ' 1000');
    }
    el.setAttribute('data-v', Math.round(f * 1000));
  }
  function slSet(el, x, y) {
    var r = el.getBoundingClientRect(), f, k, i, c;
    if (el.getAttribute('data-r') !== null) { slRound(el, x, y); return; }
    if (el.getAttribute('data-h') !== null) {     /* barre de teintes : le repère reste dans la barre */
      r = { left: r.left + 7, width: r.width - 14 };
    }
    f = (x - r.left) / r.width;
    f = f < 0 ? 0 : (f > 1 ? 1 : f);
    k = el.getElementsByTagName('span');
    for (i = 0; i < k.length; i++) {
      c = k[i].getAttribute('class');
      if (c === 'lb') { k[i].style.width = (f * 100) + '%'; }
      if (c === 'lc') { k[i].style.left = (f * 100) + '%'; k[i].style.display = 'block'; }
    }
    el.setAttribute('data-v', Math.round(f * 1000));
    if (el.getAttribute('data-h') !== null) { hueSet(el, f); }
  }
  /* barre de teintes : la case de validation prend la teinte, la lampe suit.
     Un seul envoi à la fois, toujours avec la dernière position : sinon un envoi plus
     ancien peut arriver après et laisser la lampe sur une teinte précédente. */
  var hueBusy = false, hueNext = null, hueLast = null;
  function hueSend(el) {
    var v = el.getAttribute('data-v');
    if (hueBusy) { hueNext = el; return; }
    if (v === hueLast) { return; }
    hueBusy = true; hueLast = v;
    slSend(el, function () {
      setTimeout(function () {
        var n = hueNext;
        hueBusy = false; hueNext = null;
        if (n) { hueSend(n); }
      }, 250);
    });
  }
  function hueSet(el, f) {
    var h = f * 6, i = Math.floor(h) % 6, t = h - Math.floor(h), c;
    c = [[1, t, 0], [1 - t, 1, 0], [0, 1, t], [0, 1 - t, 1], [t, 0, 1], [1, 0, 1 - t]][i];
    el.nextSibling.style.background = 'rgb(' + Math.round(c[0] * 255) + ',' +
      Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')';
    hueSend(el);
  }
  function slEnd(el) {
    if (el.getAttribute('data-h') !== null) { hueSend(el); } else { slSend(el); }
  }
  function slSend(el, done) {
    var x = new XMLHttpRequest();
    x.onreadystatechange = function () {
      var r = null;
      if (x.readyState !== 4) { return; }
      if (done) { done(); }
      try { r = JSON.parse(x.responseText); } catch (e) { r = null; }
      if (r && r.r) { location.reload(); return; }
      if (x.status !== 200) { flash(el, 'err', 1500); } else if (SD.iv) { schedule(1000); }
    };
    x.open('POST', SD.base + 'a?' + qs(), true);
    x.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    x.send('a=' + el.getAttribute('data-s') + '&v=' + el.getAttribute('data-v'));
  }
  function touchRecent() { return new Date().getTime() - lastTouch < 1000; }
  document.addEventListener('touchstart', function (e) {
    var s = slider(e.target);
    lastTouch = new Date().getTime();
    if (s && slHit(s, e.touches[0].clientX, e.touches[0].clientY)) {
      drag = s; slSet(s, e.touches[0].clientX, e.touches[0].clientY); e.preventDefault();
    }
  }, false);
  document.addEventListener('touchmove', function (e) {
    if (drag) { slSet(drag, e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }
  }, false);
  document.addEventListener('touchend', function () {
    lastTouch = new Date().getTime();
    if (drag) { slEnd(drag); drag = null; }
  }, false);
  document.addEventListener('mousedown', function (e) {
    var s = slider(e.target);
    if (s && !touchRecent() && slHit(s, e.clientX, e.clientY)) { drag = s; slSet(s, e.clientX, e.clientY); e.preventDefault(); }
  }, false);
  document.addEventListener('mousemove', function (e) {
    if (drag && !touchRecent()) { slSet(drag, e.clientX, e.clientY); }
  }, false);
  document.addEventListener('mouseup', function () {
    if (drag && !touchRecent()) { slEnd(drag); drag = null; }
  }, false);

  /* Les vieux navigateurs Android envoient quand même un « clic » après le toucher :
     on l'ignore pendant 1 s, sinon l'action part deux fois (allumé puis éteint). */
  var lastTap = 0;
  document.addEventListener('click', function (e) {
    var el = target(e.target);
    if (!el) { return; }
    e.preventDefault();
    if (new Date().getTime() - lastTap < 1000) { return; }
    act(el);
  }, false);

  /* ---- caméras ----
     Images : nouvelle image toutes les data-iv secondes ; l'image chargée remplace l'ancienne
     (pas de second téléchargement), en pause quand la page est cachée ou que la vidéo tourne.
     Vidéo (caméras Frigate, data-live) : flux MSE de go2rtc relayé par SlimDash. Par défaut en
     type 3 ; &live=1 la force, &live=0 la coupe. Sans MediaSource/H.264 : images. */
  function hidden() { return document.hidden || document.webkitHidden; }
  var LIVE = (function () {
    var m = /[?&]live=([01])/.exec(location.search);
    return m ? m[1] === '1' : SD.cl === 't3';
  })();
  var MSE = window.MediaSource || window.WebKitMediaSource;
  var CODECS = (function () {
    var all = ['avc1.640029', 'avc1.64002A', 'avc1.640033', 'avc1.4D001F', 'avc1.4D0029',
               'avc1.42E01E', 'avc1.42E01F'], ok = [], i;
    if (!LIVE || !MSE || !MSE.isTypeSupported || !window.WebSocket || !window.URL) { return ''; }
    for (i = 0; i < all.length; i++) {
      try { if (MSE.isTypeSupported('video/mp4; codecs="' + all[i] + '"')) { ok.push(all[i]); } } catch (e) {}
    }
    return ok.join(',');
  })();
  var lives = [];
  /* &info=1 : mode de chaque caméra entre parenthèses après son titre (live ou rafraîchissement) */
  var CAMINFO = /[?&]info=1/.test(location.search);
  function camInfo(card) {
    var ct = card.querySelector('.ct'), img = card.querySelector('img.ci'), f;
    if (!CAMINFO || !img) { return; }
    if (!ct) {      /* carte sans titre : bandeau avec le nom de la caméra */
      f = card.querySelector('.cf');
      if (!f) { f = document.createElement('div'); f.className = 'cf'; card.appendChild(f); }
      ct = document.createElement('span');
      ct.className = 'ct';
      ct.setAttribute('data-t', card.getAttribute('data-cn') || '');
      f.insertBefore(ct, f.firstChild);
    }
    if (ct.getAttribute('data-t') === null) { ct.setAttribute('data-t', ct.textContent); }
    ct.textContent = ct.getAttribute('data-t') + ' (' + (card.getAttribute('data-on') ? 'live' :
      (card.getAttribute('data-fps') || '…') + ' fps') + ')';
  }

  function camLive(card, eid) {
    var ws, v, ms, sb, q = [], on = false, retry = null, last = 0, dog = null;
    var url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + SD.base +
              'live?e=' + encodeURIComponent(eid) + (SD.key ? '&k=' + encodeURIComponent(SD.key) : '');
    function stop(again) {
      if (retry) { clearTimeout(retry); retry = null; }
      if (on) {
        on = false;
        clearInterval(dog);
        if (ws) { ws.onclose = ws.onmessage = ws.onerror = null; try { ws.close(); } catch (e) {} }
        if (v) {
          if (v.parentNode) { v.parentNode.removeChild(v); }
          try { v.removeAttribute('src'); v.load(); } catch (e) {}
        }
        ws = v = ms = sb = null; q = [];
        card.removeAttribute('data-on');
        camInfo(card);
      }
      if (again && !hidden()) { retry = setTimeout(start, 30000); }
    }
    function feed() {
      if (!sb || sb.updating || !q.length) { return; }
      try {
        var b = sb.buffered;
        if (b.length && v.currentTime - b.start(0) > 30) { sb.remove(b.start(0), v.currentTime - 10); return; }
        sb.appendBuffer(q.shift());
      } catch (e) { stop(true); }
    }
    function near() {   /* rester au plus près du direct */
      var b = sb && sb.buffered;
      if (b && b.length && b.end(b.length - 1) - v.currentTime > 3) { v.currentTime = b.end(b.length - 1) - 0.5; }
    }
    function start() {
      retry = null;
      if (on || hidden()) { return; }
      on = true;
      last = new Date().getTime();
      v = document.createElement('video');
      v.className = 'cv';
      v.muted = true;
      v.autoplay = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.addEventListener('playing', function () {
        if (v) { v.className = 'cv on'; card.setAttribute('data-on', 'live'); camInfo(card); }
      }, false);
      ms = new MSE();
      ms.addEventListener('sourceopen', function () {
        if (!on) { return; }
        ws = new WebSocket(url);
        ws.binaryType = 'arraybuffer';
        ws.onopen = function () { ws.send(JSON.stringify({type: 'mse', value: CODECS})); };
        ws.onmessage = function (e) {
          last = new Date().getTime();
          if (typeof e.data === 'string') {
            var m;
            try { m = JSON.parse(e.data); } catch (x) { return; }
            if (m.type === 'mse') {
              try {
                sb = ms.addSourceBuffer(m.value);
                sb.mode = 'segments';
                sb.addEventListener('updateend', function () { near(); feed(); }, false);
              } catch (x) { stop(true); }
            } else if (m.type === 'error') { stop(true); }
            return;
          }
          if (q.length > 30) { q = []; }
          q.push(e.data);
          feed();
        };
        ws.onclose = ws.onerror = function () { stop(true); };
      }, false);
      v.src = URL.createObjectURL(ms);
      card.insertBefore(v, card.querySelector('.cf'));
      /* plus rien depuis 20 s : on retombe sur les images et on réessaie plus tard */
      dog = setInterval(function () { if (new Date().getTime() - last > 20000) { stop(true); } }, 5000);
    }
    lives.push({start: start, stop: stop});
    start();
  }

  /* Une image n'est demandée qu'une fois la précédente affichée, au plus vite toutes les
     data-iv ms : un appareil lent ralentit de lui-même. data-fps : images/s obtenues (5 s).
     Une seule image par caméra : on change son adresse (unique, &t=), l'ancienne reste
     affichée jusqu'à l'arrivée de la nouvelle. Pas d'image de préchargement : chaque image
     décodée en plus (≈ 0,9 Mo) fait monter la mémoire du vieux WebKit jusqu'au plantage. */
  function now() { return new Date().getTime(); }
  /* Plafond : 1 image/s en type 1 (au-delà, le vieux WebKit sature sa mémoire et plante),
     3 en type 2 (iPad Air iOS 12 : tient 5 mais chauffe).
     &fps=N dans l'adresse : essai d'un autre plafond (caméras Frigate seulement). */
  var FPS = (function () {
    var m = /[?&]fps=(\d+(?:[.,]\d+)?)/.exec(location.search);
    return m ? parseFloat(m[1].replace(',', '.')) : ({t1: 1, t2: 3}[SD.cl] || 0);
  })();
  function camLoop(img) {
    var iv = parseInt(img.getAttribute('data-iv'), 10) || 1000;
    if (FPS > 0 && img.getAttribute('data-live')) { iv = Math.max(iv, Math.round(1000 / FPS)); }
    var base = img.getAttribute('src'), card = img.parentNode, seen = [], flip = 0;
    function next() {
      if (hidden() || card.getAttribute('data-on')) { seen = []; setTimeout(next, Math.max(iv, 1000)); return; }
      var t0 = now();
      img.onload = function () {
        var t = now();
        img.onload = img.onerror = null;
        seen.push(t);
        while (seen.length > 2 && t - seen[0] > 5000) { seen.shift(); }
        if (seen.length > 1) {
          card.setAttribute('data-fps', Math.round((seen.length - 1) * 1000 / (t - seen[0])));
          camInfo(card);
        }
        setTimeout(next, Math.max(0, iv - (t - t0)));
      };
      img.onerror = function () {
        img.onload = img.onerror = null;
        seen = [];
        setTimeout(next, Math.max(iv * 2, 5000));
      };
      img.src = base + '&t=' + (flip = 1 - flip);   // 2 adresses fixes : le navigateur Android 4.4 plante après ~850 adresses uniques
    }
    setTimeout(next, iv);
    camInfo(card);
    if (img.getAttribute('data-live') && CODECS) { camLive(card, img.getAttribute('data-live')); }
  }
  var cams = document.querySelectorAll('img.ci');
  (function () {
    for (var i = 0; i < cams.length; i++) { camLoop(cams[i]); }
  })();
  if (lives.length) {
    document.addEventListener('visibilitychange', function () {
      for (var i = 0; i < lives.length; i++) {
        if (hidden()) { lives[i].stop(false); } else { lives[i].start(); }
      }
    }, false);
  }

  /* Certains navigateurs Android 4.4 ignorent calc() : les largeurs « 50 % - 8 px » des cartes
     et des rangées horizontales retombent alors sur des pourcentages approchés. On les pose en px. */
  var noCalc = (function () {
    var t = document.createElement('div');
    t.style.width = '-webkit-calc(10px + 1px)';
    if (!t.style.width) { t.style.width = 'calc(10px + 1px)'; }
    return !t.style.width;
  })();
  var FR = { w3: 0.25, w4: 1 / 3, w6: 0.5, w9: 0.75 };
  function fixWidths() {
    var s = document.querySelectorAll('.sect'), i, j, c, k, m, W;
    for (i = 0; i < s.length; i++) {
      W = s[i].clientWidth;
      c = s[i].children;
      for (j = 0; j < c.length; j++) {
        m = / (w[3469])( |$)/.exec(' ' + c[j].className);
        if (m) { c[j].style.width = Math.floor(W * FR[m[1]] - 8) + 'px'; }
      }
    }
    var h = document.querySelectorAll('.hs');
    for (k = 0; k < h.length; k++) {
      h[k].style.width = '';
      W = h[k].parentNode.clientWidth;
      h[k].style.width = (W + (/(^| )sect( |$)/.test(h[k].parentNode.className) ? 4 : 12)) + 'px';
    }
  }
  if (noCalc) {
    fixWidths();
    window.addEventListener('resize', function () { setTimeout(fixWidths, 100); });
  }

  clock();
  setInterval(clock, 10000);
  if (SD.cv) { schedule(300); } else { setDot(SD.c ? 'ok' : 'ha'); }
  /* Rechargement complet de temps en temps : évite les fuites mémoire des vieux navigateurs
     (toutes les heures quand la page montre des caméras). */
  setTimeout(function () { location.reload(); }, (cams.length ? 1 : 6) * 3600 * 1000);
})();

/* Plein écran au premier toucher (le navigateur l'exige après un geste) ; repris après une sortie. */
(function () {
  var d = document.documentElement;
  var req = d.requestFullscreen || d.webkitRequestFullscreen;
  if (!req) { return; }
  function fs() {
    if (document.fullscreenElement || document.webkitFullscreenElement) { return; }
    try {
      var p = req.call(d, { navigationUI: 'hide' });
      if (p && p['catch']) { p['catch'](function () {}); }
    } catch (e) {}
  }
  document.addEventListener('click', fs, true);
  document.addEventListener('touchend', fs, true);
})();


/* Garder l'écran allumé avec l'API Wake Lock (navigateurs compatibles).
   L'activation se fait au premier toucher/clic ; le verrou est repris au retour
   dans l'onglet après une mise en arrière-plan. */
(function () {
  var lock = null, pending = false;
  function requestWakeLock() {
    if (!navigator.wakeLock || document.visibilityState === 'hidden' || lock || pending) { return; }
    pending = true;
    try {
      navigator.wakeLock.request('screen').then(function (l) {
        pending = false;
        lock = l;
        lock.addEventListener('release', function () {
          lock = null;
        });
      }, function () {
        pending = false;
      });
    } catch (e) {
      pending = false;
    }
  }
  document.addEventListener('click', requestWakeLock, true);
  document.addEventListener('touchend', requestWakeLock, true);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { requestWakeLock(); }
    else if (lock) {
      try { lock.release(); } catch (e) {}
      lock = null;
    }
  }, false);
})();

/* Small enhancements only. The page works with JS off. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Floor plan: show one zone card at a time ---- */
  var triggers = document.querySelectorAll('[data-zone]');
  var cards = document.querySelectorAll('.zone-card');
  var panel = document.querySelector('.floor__panel');
  var wide = window.matchMedia('(min-width: 1200px)');

  function showZone(key) {
    cards.forEach(function (c) { c.classList.toggle('is-active', c.id === 'zone-' + key); });
    triggers.forEach(function (t) {
      var on = t.getAttribute('data-zone') === key;
      t.classList.toggle('is-active', on);
      if (on) { t.setAttribute('aria-current', 'true'); } else { t.removeAttribute('aria-current'); }
    });
  }

  function zoneFromHash() {
    var m = /^#zone-([a-z]+)$/.exec(location.hash);
    return m && document.getElementById('zone-' + m[1]) ? m[1] : null;
  }

  if (triggers.length && cards.length) {
    triggers.forEach(function (t) {
      var key = t.getAttribute('data-zone');
      t.addEventListener('click', function (e) {
        e.preventDefault();
        showZone(key);
        // Stacked layout (below 1200px): bring the photo and details into view. Three-column layout shows them already.
        if (panel && !wide.matches) { panel.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' }); }
      });
      t.addEventListener('focus', function () { showZone(key); });
      t.addEventListener('mouseenter', function () { showZone(key); });
    });
    // No scrolling and no focus() on load: only pick the starting card.
    showZone(zoneFromHash() || 'racks');
    window.addEventListener('hashchange', function () {
      var k = zoneFromHash();
      if (k) { showZone(k); }
    });
  }

  /* ---- Re-align to the #section once fonts have loaded, unless the visitor already scrolled ---- */
  // Late font swaps change heights above the target and can leave the page far below the heading.
  var userScrolled = false;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
    window.addEventListener(ev, function () { userScrolled = true; }, { passive: true, once: true });
  });
  function realign() {
    if (userScrolled || !location.hash || zoneFromHash()) { return; }
    var target;
    try { target = document.querySelector(location.hash); } catch (e) { return; }
    if (target) { target.scrollIntoView({ block: 'start', behavior: 'instant' }); }
  }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(realign); }
  window.addEventListener('load', realign);

  /* ---- Close the mobile menu after picking a link ---- */
  var menu = document.querySelector('.menu');
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) { menu.removeAttribute('open'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.open) { menu.removeAttribute('open'); menu.querySelector('summary').focus(); }
    });
  }

  /* ---- Open now / Closed now, Asia/Kolkata ---- */
  // Minutes from midnight. 0 = Sunday. Shortcut: hours are hard-coded, keep in sync with the table.
  var HOURS = { 0: [[420, 660]] };
  for (var d = 1; d <= 6; d++) { HOURS[d] = [[330, 690], [990, 1320]]; }
  var WOMEN = { 1: [690, 780], 3: [690, 780], 5: [690, 780] }; // proposal: 11:30 am to 1:00 pm
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function fmt(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    var ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return h + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ' ' + ap;
  }

  function nowInPune() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
    return { day: day, mins: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
  }

  function status(t) {
    var today = HOURS[t.day], w = WOMEN[t.day], i, j;
    if (w && t.mins >= w[0] && t.mins < w[1]) {
      return { open: true, text: 'Women’s batch now, till ' + fmt(w[1]).replace(':00', '') + '. Open to all again at ' + fmt(990) };
    }
    for (i = 0; i < today.length; i++) {
      if (t.mins >= today[i][0] && t.mins < today[i][1]) {
        return { open: true, text: 'Open now. Closes ' + fmt(today[i][1]) };
      }
    }
    // Next general opening (the women's batch is not "open to all").
    for (i = 0; i < 8; i++) {
      var day = (t.day + i) % 7, slots = HOURS[day];
      for (j = 0; j < slots.length; j++) {
        if (i > 0 || slots[j][0] > t.mins) {
          var when = i === 0 ? fmt(slots[j][0]) : (day === 0 ? 'Sunday at ' : i === 1 ? 'tomorrow at ' : DAYS[day] + ' at ') + fmt(slots[j][0]);
          return { open: false, text: 'Closed now. Opens ' + when };
        }
      }
    }
    return { open: false, text: 'Closed now' };
  }

  function refresh() {
    try {
      var t = nowInPune();
      var s = status(t);
      ['open-badge', 'open-badge-2'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) { return; }
        el.textContent = s.text;
        el.classList.toggle('is-open', s.open);
        el.hidden = false;
      });
      document.querySelectorAll('#hours tr.is-today').forEach(function (r) {
        r.classList.remove('is-today');
        r.removeAttribute('aria-current');
        var old = r.querySelector('.today-tag');
        if (old) { old.remove(); }
      });
      var row = document.querySelector('#hours tr[data-day="' + t.day + '"]');
      if (row) {
        row.classList.add('is-today');
        row.setAttribute('aria-current', 'date');
        var th = row.querySelector('th');
        if (th) {
          var tag = document.createElement('span');
          tag.className = 'today-tag';
          tag.textContent = 'today';
          th.appendChild(tag);
        }
      }
    } catch (err) {
      /* Intl missing: leave badges hidden, the table still shows hours. */
    }
  }

  refresh();
  setInterval(refresh, 60000);
})();

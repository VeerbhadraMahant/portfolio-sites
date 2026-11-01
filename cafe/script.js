/* Progressive enhancements only. The page works fully without this file. */
(function () {
  'use strict';

  // CLIENT: replace (minutes after midnight, IST). A range may cross midnight, e.g. [1200, 120].
  var CAFE = [[390, 1350]];                 // 6:30 am to 10:30 pm
  var KITCHEN = [[420, 900], [1080, 1320]]; // 7 am to 3 pm, 6 to 10 pm

  function within(ranges, m) {
    return ranges.some(function (r) {
      return r[0] <= r[1] ? (m >= r[0] && m < r[1]) : (m >= r[0] || m < r[1]);
    });
  }

  function istMinutes() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    var h = 0, m = 0;
    parts.forEach(function (p) {
      if (p.type === 'hour') h = parseInt(p.value, 10);
      if (p.type === 'minute') m = parseInt(p.value, 10);
    });
    return h * 60 + m;
  }

  function updateStatus() {
    var badges = document.querySelectorAll('[data-status]');
    if (!badges.length) return;
    var now;
    try { now = istMinutes(); } catch (e) { return; } // keep the static text
    var open = within(CAFE, now);
    var text;
    if (!open) {
      // before opening today, or after closing: next opening is today or tomorrow
      text = 'Closed now. Opens ' + (now < CAFE[0][0] ? 'today' : 'tomorrow') + ' at 6:30 am';
    } else if (within(KITCHEN, now)) {
      text = 'Open now, till 10:30 pm. Hot kitchen is on';
    } else {
      text = 'Open now, till 10:30 pm. Hot kitchen is resting';
    }
    badges.forEach(function (b) {
      b.classList.toggle('is-open', open);
      b.classList.toggle('is-closed', !open);
      var t = b.querySelector('[data-status-text]');
      if (t) t.textContent = text;
    });
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  // Close the compact menu after choosing a link, or on Escape.
  var fold = document.querySelector('.nav-fold');
  if (fold) {
    fold.addEventListener('click', function (e) {
      if (e.target.closest('.nav-fold-panel a')) fold.removeAttribute('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && fold.hasAttribute('open')) {
        fold.removeAttribute('open');
        var s = fold.querySelector('summary');
        if (s) s.focus();
      }
    });
  }

  // Menu chips: highlight the category heading that most recently crossed the top.
  var box = document.querySelector('.chips');
  var card = document.querySelector('#menu .card');
  var cats = document.querySelectorAll('.mcat[id^="m-"]');
  if (box && card && cats.length) {
    var links = box.querySelectorAll('a');
    var ticking = false;
    var update = function () {
      ticking = false;
      var line = box.getBoundingClientRect().bottom + 24;
      var best = null, bestTop = -Infinity;
      cats.forEach(function (c) {
        var top = c.getBoundingClientRect().top;
        if (top <= line && top > bestTop) { best = c; bestTop = top; }
      });
      if (card.getBoundingClientRect().bottom < line) best = null;
      links.forEach(function (a) {
        if (best && a.getAttribute('href') === '#' + best.id) {
          a.setAttribute('aria-current', 'true');
          if (box.scrollWidth > box.clientWidth) box.scrollLeft = a.offsetLeft - 16;
        } else {
          a.removeAttribute('aria-current');
        }
      });
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }
})();

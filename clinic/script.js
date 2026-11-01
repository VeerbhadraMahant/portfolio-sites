/* Small enhancements only. The page works fully without this file. */
(function () {
  "use strict";

  var WHATSAPP = "919876543210"; // CLIENT: replace
  var CLINIC = "Kulkarni Ayurved Chikitsalaya"; // CLIENT: replace

  /* ---- Mobile menu: close after choosing a link, or on Escape ---- */
  var menu = document.querySelector(".menu-m");
  if (menu) {
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) menu.removeAttribute("open");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.open) {
        menu.removeAttribute("open");
        menu.querySelector("summary").focus();
      }
    });
  }

  /* ---- Open now / Closed now, in Indian Standard Time ---- */
  // Sessions in minutes after midnight: 9:30-13:30 and 17:00-20:30. Sunday (0) closed. CLIENT: replace
  var SESSIONS = [[570, 810], [1020, 1230]];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function clock(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return (h % 12 || 12) + ":" + (m < 10 ? "0" : "") + m + (h < 12 ? " am" : " pm");
  }

  function istNow() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23"
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return {
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday),
      mins: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10)
    };
  }

  function openStatus(day, mins) {
    if (day > 0) {
      for (var i = 0; i < SESSIONS.length; i++) {
        var s = SESSIONS[i];
        if (mins >= s[0] && mins < s[1]) return { open: true, text: "Open now, closes " + clock(s[1]) };
      }
      for (var j = 0; j < SESSIONS.length; j++) {
        if (mins < SESSIONS[j][0]) return { open: false, text: "Closed now, opens " + clock(SESSIONS[j][0]) + " today" };
      }
    }
    // After the last session today, or Sunday: next opening is tomorrow (Saturday night -> Monday).
    var when = day === 6 ? "Monday" : "tomorrow";
    return { open: false, text: "Closed now, opens " + when + " at " + clock(SESSIONS[0][0]) };
  }

  try {
    var now = istNow();
    var st = openStatus(now.day, now.mins);
    document.querySelectorAll("[data-open-badge]").forEach(function (el) {
      el.textContent = st.text;
      el.classList.toggle("badge--closed", !st.open);
      el.hidden = false;
    });
    var row = document.querySelector('.hours tr[data-day="' + now.day + '"]');
    if (row) {
      row.classList.add("today");
      row.querySelector("th").setAttribute("aria-current", "date");
    }
  } catch (err) { /* Intl timeZone unsupported: badge stays hidden, hours table still shown */ }

  /* ---- Booking form -> prefilled WhatsApp message ---- */
  var form = document.getElementById("book-form");
  if (!form) return;
  form.noValidate = true; // we show our own messages

  var nameEl = document.getElementById("f-name");
  var phoneEl = document.getElementById("f-phone");
  var statusEl = document.getElementById("form-status");

  function checkName() {
    return nameEl.value.trim() ? "" : "Please enter your name.";
  }
  function checkPhone() {
    var v = phoneEl.value.replace(/[\s().-]/g, "");
    if (!v) return "Please enter your phone number so we can confirm your slot.";
    // Indian mobile (optional +91 / 91 / 0), or an 8-11 digit landline with area code.
    if (!/^(\+?91|0)?[6-9]\d{9}$/.test(v) && !/^\d{8,11}$/.test(v)) {
      return "Enter a mobile number like 98765 43210, or a landline with its area code.";
    }
    return "";
  }

  function show(input, msg) {
    var err = document.getElementById(input.id + "-err");
    err.textContent = msg;
    err.hidden = !msg;
    if (msg) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
    return !msg;
  }

  [[nameEl, checkName], [phoneEl, checkPhone]].forEach(function (pair) {
    pair[0].addEventListener("blur", function () { show(pair[0], pair[1]()); });
    pair[0].addEventListener("input", function () {
      if (pair[0].getAttribute("aria-invalid")) show(pair[0], pair[1]());
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    statusEl.textContent = "";
    var okName = show(nameEl, checkName());
    var okPhone = show(phoneEl, checkPhone());
    if (!okName || !okPhone) {
      (okName ? phoneEl : nameEl).focus();
      statusEl.textContent = "Please fix the highlighted field and send again.";
      return;
    }

    var day = document.getElementById("f-day");
    var time = document.getElementById("f-time");
    var reason = document.getElementById("f-reason").value.trim();
    var lines = [
      "Namaste. I would like to book a consultation at " + CLINIC + ".",
      "",
      "Name: " + nameEl.value.trim(),
      "Phone: " + phoneEl.value.trim(),
      "Preferred day: " + day.options[day.selectedIndex].text,
      "Preferred time: " + time.options[time.selectedIndex].text
    ];
    if (reason) lines.push("Reason: " + reason);

    var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(lines.join("\n"));
    window.open(url, "_blank", "noopener");

    // noopener makes window.open return null, so we cannot tell if a popup was blocked: always offer the link.
    statusEl.textContent = "WhatsApp should open with your request written out. Nothing is sent until you press send there. ";
    var a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "If it did not open, tap here.";
    statusEl.appendChild(a);
  });
})();

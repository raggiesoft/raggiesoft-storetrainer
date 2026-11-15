/**
 * @license MIT
 * netscape-ui.js — Client Progressive Enhancement for storetrainer.raggiesoft.com
 * Implements Modern Web Guidance dark-mode-toggle (Win98 Light vs. Win2000 Dark)
 * plus automatic Quantum OS 98 Holiday Desktop Edition chrome & taskbar clock.
 */
(function () {
  var meta = document.querySelector('meta[name="color-scheme"]');
  var toggleBtn = document.getElementById('theme-toggle');
  var toggleLabel = document.getElementById('theme-toggle-label');
  var titleCaption = document.getElementById('win-titlebar-caption');
  var startIcon = document.getElementById('win98-start-icon');
  var holidayTray = document.getElementById('win98-holiday-tray');
  var clockEl = document.getElementById('win98-clock');

  function isHolidayActive() {
    return document.documentElement.classList.contains('rs-holiday-season');
  }

  function getSystemScheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function getRenderedScheme() {
    var stored = null;
    try {
      stored = localStorage.getItem('color-scheme');
    } catch (e) {}
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return getSystemScheme();
  }

  function syncQuantumHolidayChrome() {
    var holiday = isHolidayActive();
    if (titleCaption) {
      var baseTitle = titleCaption.getAttribute('data-base-title') || 'RaggieSoft StoreTrainer';
      titleCaption.textContent = holiday
        ? baseTitle + ' - Netscape Communicator 4.78 [Quantum OS 98 — Holiday Desktop]'
        : baseTitle + ' - Netscape Communicator 4.78 [Windows 2000 Professional SP4]';
    }
    if (startIcon) {
      startIcon.textContent = holiday ? '🎄' : '🪟';
    }
    if (holidayTray) {
      holidayTray.hidden = !holiday;
    }
  }

  function updateLabel() {
    var current = getRenderedScheme();
    var holiday = isHolidayActive();
    document.documentElement.setAttribute('data-theme', current);
    syncQuantumHolidayChrome();
    if (!toggleLabel) return;
    var stored = null;
    try {
      stored = localStorage.getItem('color-scheme');
    } catch (e) {}
    if (holiday) {
      if (stored === 'light' || stored === 'dark') {
        toggleLabel.textContent = current === 'dark' ? '🎄 Holiday Dark (Pinned)' : '🎄 Holiday Pine (Pinned)';
      } else {
        toggleLabel.textContent = current === 'dark' ? '🎄 Quantum Holiday Dark' : '🎄 Quantum Holiday Pine';
      }
      return;
    }
    if (stored === 'light' || stored === 'dark') {
      toggleLabel.textContent = current === 'dark' ? '🖥️ Win2000 Dark (Pinned)' : '🖥️ Win98 Classic (Pinned)';
    } else {
      toggleLabel.textContent = current === 'dark' ? '🖥️ System (Win2000 Dark)' : '🖥️ System (Win98 Classic)';
    }
  }

  function updateTaskbarClock() {
    if (!clockEl) return;
    try {
      var now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) {}
  }

  updateLabel();
  updateTaskbarClock();
  setInterval(updateTaskbarClock, 30000);

  window.addEventListener('raggiesoft:holidaychange', updateLabel);
  window.addEventListener('load', updateLabel);

  if (toggleBtn && meta) {
    toggleBtn.addEventListener('click', function () {
      var current = getRenderedScheme();
      var target = current === 'dark' ? 'light' : 'dark';
      var sys = getSystemScheme();
      try {
        if (target === sys) {
          localStorage.removeItem('color-scheme');
          meta.content = 'light dark';
        } else {
          localStorage.setItem('color-scheme', target);
          meta.content = target;
        }
      } catch (e) {
        meta.content = target;
      }
      updateLabel();
    });
  }
})();

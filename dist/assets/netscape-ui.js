/**
 * @license MIT
 * netscape-ui.js — Client Progressive Enhancement for storetrainer.raggiesoft.com
 * Implements Modern Web Guidance dark-mode-toggle (Win98 Light vs. Win2000 Dark)
 */
(function () {
  var meta = document.querySelector('meta[name="color-scheme"]');
  var toggleBtn = document.getElementById('theme-toggle');
  var toggleLabel = document.getElementById('theme-toggle-label');

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

  function updateLabel() {
    var current = getRenderedScheme();
    document.documentElement.setAttribute('data-theme', current);
    if (!toggleLabel) return;
    var stored = null;
    try {
      stored = localStorage.getItem('color-scheme');
    } catch (e) {}
    if (stored === 'light' || stored === 'dark') {
      toggleLabel.textContent = current === 'dark' ? '🖥️ Win2000 Dark (Pinned)' : '🖥️ Win98 Classic (Pinned)';
    } else {
      toggleLabel.textContent = current === 'dark' ? '🖥️ System (Win2000 Dark)' : '🖥️ System (Win98 Classic)';
    }
  }

  if (toggleBtn && meta) {
    updateLabel();
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

/**
 * @license MIT
 * ============================================================================
 * scripts/build.mjs — RaggieSoft StoreTrainer (storetrainer.raggiesoft.com)
 * ============================================================================
 * Architectural Overview:
 * Static Site Generation (SSG) compiler for `storetrainer.raggiesoft.com`.
 *
 * Ground-Truth Verification:
 * - RaggieSoft StoreTrainer (`TStore.exe`, v1.0) is a 100% hand-written
 *   (pre-AI, 2018–2020) Win32 desktop utility authored in Visual Basic 6.0
 *   (`TStore.vbp`) inside a Windows 2000 Professional SP4 VM (with a `.NET`
 *   port `TStore.NET` and NSIS Wizard95 installers `TSSetup.nsi` and
 *   `TSSetup-Patch.nsi`) to store, index, and launch PC games alongside their
 *   associated game trainers (cheat utilities) and command-line arguments
 *   across Windows 95 through Windows 11.
 *
 * Aesthetic & Accessibility:
 * - Styled after Netscape Communicator 4.78 running on Windows 98 / Windows
 *   2000 Professional SP4 (3D chiseled bevel chrome, classic titlebar gradient,
 *   Netscape navigation bar, and sunken document viewport).
 * - Modern HTML5 / CSS3 under the hood with strict WCAG 2.1 AA / Section 508
 *   compliance, keyboard operability, OpenGraph (`og:*`) + Twitter Card social
 *   metadata (`title <= 60` chars, `description <= 155` chars), and native
 *   `prefers-color-scheme: light | dark` support (Win98 Silver & Teal in Light
 *   Mode, Win2000 High-Contrast Dark Terminal in Dark Mode).
 *
 * Routes Emitted to `./dist`:
 * - `/index.html` (StoreTrainer Portal, `tssetup100.exe` Download, `.sfile` Format & OS Matrix)
 * - `/source/index.html` (Interactive VB6 `TStore.vbp` & `TStore.NET` Source Code Inspector)
 * - `/installer/index.html` (NSIS Wizard95 `TSSetup.nsi` & `TSSetup-Patch.nsi` Architecture)
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const sourceSnapshotPath = path.join(projectRoot, 'src', 'data', 'storetrainer-source.json');

/**
 * Escapes HTML special characters for safe interpolation.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Writes a static file to `./dist`, creating parent directories automatically.
 * @param {string} relPath
 * @param {string} content
 */
function writeDistFile(relPath, content) {
  const fullPath = path.join(distDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

/**
 * Loads the real VB6, VB.NET, and NSIS source files from `/ai-staging/StoreTrainer`
 * when building in the local workspace and persists a committed snapshot at
 * `src/data/storetrainer-source.json` so builds on the production droplet succeed
 * without needing `/ai-staging` deployed.
 * @returns {Array<{id: string, title: string, category: string, path: string, description: string, code: string}>}
 */
function loadStoreTrainerSourceFiles() {
  const aiStagingDir = path.resolve(projectRoot, '../../../ai-staging/StoreTrainer');
  const fileSpecs = [
    {
      id: 'tstore-vbp',
      title: 'TStore.vbp (Visual Basic 6.0 Project Manifest)',
      category: 'VB6 Core',
      relPath: 'TStore.vbp',
      description: 'Master Visual Basic 6.0 project file defining forms, Win32 API modules, version metadata (v1.0.0), and compilation flags.'
    },
    {
      id: 'frmmain-frm',
      title: 'frmMain.frm (Primary StoreTrainer Win32 Form UI)',
      category: 'VB6 Forms',
      relPath: 'frmMain.frm',
      description: 'Main application form managing the PC game & trainer profile selector, command-line switch fields, and process launch triggers.'
    },
    {
      id: 'tstore-bas',
      title: 'TStore.bas (Core Application Logic & Entrypoint)',
      category: 'VB6 Core',
      relPath: 'TStore.bas',
      description: 'Core Visual Basic 6.0 module orchestrating initialization, profile loading, and Win32 execution flow.'
    },
    {
      id: 'sfile-bas',
      title: 'SFile.bas (Flat-File & File System Operations)',
      category: 'VB6 Win32 API',
      relPath: 'SFile.bas',
      description: 'Win32 file management and shell operations module for locating, copying, and launching game and trainer binaries.'
    },
    {
      id: 'inifile-bas',
      title: 'INIFile.bas (Win32 kernel32 INI Configuration Parser)',
      category: 'VB6 Win32 API',
      relPath: 'INIFile.bas',
      description: 'Direct Win32 `GetPrivateProfileString` / `WritePrivateProfileString` (`kernel32.dll`) bindings for zero-database INI configuration persistence.'
    },
    {
      id: 'registry-bas',
      title: 'Registry.bas (Win32 advapi32 Registry Module)',
      category: 'VB6 Win32 API',
      relPath: 'Registry.bas',
      description: 'Direct Win32 `RegOpenKeyEx` / `RegQueryValueEx` (`advapi32.dll`) bindings for reading game installation paths across 32-bit and 64-bit Windows.'
    },
    {
      id: 'specialfolder-bas',
      title: 'SpecialFolder.bas (Win32 Shell Special Folders API)',
      category: 'VB6 Win32 API',
      relPath: 'SpecialFolder.bas',
      description: 'Resolves `AppData`, `Program Files`, and user profile directories across Windows 95 through Windows 11.'
    },
    {
      id: 'osversioninfo-bas',
      title: 'OSVersionInfo.bas (Win32 GetVersionEx OS Detector)',
      category: 'VB6 Win32 API',
      relPath: 'OSVersionInfo.bas',
      description: 'Queries `GetVersionExA` (`OSVERSIONINFO`) to detect Windows 9x vs. Windows NT kernels at runtime.'
    },
    {
      id: 'detectosbits-bas',
      title: 'DetectOSBits.bas (32-Bit vs. 64-Bit WOW64 Detection)',
      category: 'VB6 Win32 API',
      relPath: 'DetectOSBits.bas',
      description: 'Dynamically probes `IsWow64Process` in `kernel32.dll` so 32-bit `TStore.exe` knows whether it is running on a 64-bit Windows OS.'
    },
    {
      id: 'versioncompare-bas',
      title: 'VersionCompare.bas (Binary File Version Comparator)',
      category: 'VB6 Win32 API',
      relPath: 'VersionCompare.bas',
      description: 'Uses `version.dll` (`GetFileVersionInfoA`) to inspect and compare executable version headers.'
    },
    {
      id: 'whwnd-bas',
      title: 'wHwnd.bas (Win32 Window Handle & Process Monitor)',
      category: 'VB6 Win32 API',
      relPath: 'wHwnd.bas',
      description: 'Win32 `user32.dll` window handle (`HWND`) enumeration and process state tracking for launched games and trainers.'
    },
    {
      id: 'readme-txt',
      title: 'README.txt (Original User Documentation)',
      category: 'Documentation',
      relPath: 'README.txt',
      description: 'Original plaintext user documentation bundled with StoreTrainer.'
    },
    {
      id: 'readme-dev-txt',
      title: 'README-dev.txt (Developer Build & VM Notes)',
      category: 'Documentation',
      relPath: 'README-dev.txt',
      description: 'Original developer notes documenting the Windows 2000 SP4 build environment and runtime packaging.'
    },
    {
      id: 'tstore-net-frmmain',
      title: 'TStore.NET/frmMain.vb (VB.NET Main Form Port)',
      category: '.NET Port',
      relPath: 'TStore.NET/frmMain.vb',
      description: 'Visual Basic .NET upgraded form (`frmMain.vb`) preserving StoreTrainer functionality on modern .NET runtimes.'
    },
    {
      id: 'tstore-net-core',
      title: 'TStore.NET/TStore.vb (VB.NET Core Module)',
      category: '.NET Port',
      relPath: 'TStore.NET/TStore.vb',
      description: 'Visual Basic .NET core module ported from `TStore.bas`.'
    },
    {
      id: 'tstore-net-sfile',
      title: 'TStore.NET/SFile.vb (VB.NET File Operations Module)',
      category: '.NET Port',
      relPath: 'TStore.NET/SFile.vb',
      description: 'Visual Basic .NET file system module ported from `SFile.bas`.'
    },
    {
      id: 'tssetup-nsi',
      title: 'Installer/TSSetup.nsi (Full NSIS Wizard95 Installer)',
      category: 'NSIS Installer',
      relPath: 'Installer/TSSetup.nsi',
      description: 'Full Nullsoft Scriptable Install System (NSIS) script featuring the classic Wizard95 bitmap, Windows 95–11 OS check, and VB6 runtime DLL registration.'
    },
    {
      id: 'tssetup-patch-nsi',
      title: 'Installer/TSSetup-Patch.nsi (Lightweight Patch Installer)',
      category: 'NSIS Installer',
      relPath: 'Installer/TSSetup-Patch.nsi',
      description: 'Compact update installer script updating `TStore.exe` and linking directly to `https://storetrainer.raggiesoft.com/`.'
    }
  ];

  if (fs.existsSync(aiStagingDir)) {
    const loaded = [];
    for (const spec of fileSpecs) {
      const full = path.join(aiStagingDir, spec.relPath);
      if (fs.existsSync(full)) {
        const raw = fs.readFileSync(full, 'utf-8').replace(/\r\n/g, '\n');
        loaded.push({
          id: spec.id,
          title: spec.title,
          category: spec.category,
          path: spec.relPath,
          description: spec.description,
          code: raw
        });
      }
    }
    if (loaded.length > 0) {
      fs.mkdirSync(path.dirname(sourceSnapshotPath), { recursive: true });
      fs.writeFileSync(sourceSnapshotPath, JSON.stringify(loaded, null, 2), 'utf-8');
      return loaded;
    }
  }

  if (fs.existsSync(sourceSnapshotPath)) {
    return JSON.parse(fs.readFileSync(sourceSnapshotPath, 'utf-8'));
  }
  return [];
}

/**
 * Builds `/assets/netscape-ui.js` implementing the Modern Web Guidance
 * two-state color-scheme toggle (Win98 Light vs. Win2000 High-Contrast Dark).
 * @returns {string}
 */
function buildNetscapeClientJs() {
  return `/**
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
`;
}

/**
 * Wraps route content inside the Netscape Communicator 4.78 / Windows 2000 SP4 window shell.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string} opts.canonicalPath
 * @param {string} opts.bodyHtml
 * @returns {string}
 */
function renderNetscapeShell({ title, description, canonicalPath, bodyHtml }) {
  const safeTitle = escapeHtml(title.slice(0, 60));
  const safeDesc = escapeHtml(description.slice(0, 155));
  const canonicalUrl = `https://storetrainer.raggiesoft.com${canonicalPath === '/' ? '' : canonicalPath}`;
  const ogImage = 'https://assets.raggiesoft.com/raggiesoft-corporate/images/og/raggiesoft-corporate-og.jpg';

  const navItems = [
    { href: '/', label: '🏠 Home & Download' },
    { href: '/source', label: '💾 VB6 & .NET Source' },
    { href: '/installer', label: '📦 NSIS Wizard95 Installer' }
  ];

  const navHtml = navItems
    .map((item) => {
      const isCurrent = item.href === canonicalPath;
      return `<li><a href="${item.href}" class="win-btn"${isCurrent ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a></li>`;
    })
    .join('\n            ');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <script>
      try {
        var storedScheme = localStorage.getItem('color-scheme');
        document.querySelector('meta[name="color-scheme"]').content = storedScheme ?? 'light dark';
        var resolvedTheme = (storedScheme === 'light' || storedScheme === 'dark')
          ? storedScheme
          : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', resolvedTheme);
      } catch (e) {}
    </script>
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="RaggieSoft StoreTrainer" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
    <link rel="icon" type="image/png" href="https://assets.raggiesoft.com/raggiesoft-corporate/images/logos/raggiesoft-logo.png" />
    <link rel="stylesheet" href="https://assets.raggiesoft.com/storetrainer/css/win98-netscape.css" />
  </head>
  <body>
    <a href="#content" class="skip-link">Skip to main document content</a>

    <div class="netscape-window win-outset" role="application" aria-label="Netscape Communicator 4.78 — RaggieSoft StoreTrainer Portal">
      <!-- Win2000 Title Bar -->
      <header class="win-titlebar" role="banner">
        <div class="win-titlebar-left">
          <span aria-hidden="true">🖳</span>
          <span>${safeTitle} - Netscape Communicator 4.78 [Windows 2000 Professional SP4]</span>
        </div>
        <div class="win-titlebar-controls" aria-hidden="true">
          <span class="win-ctrl-box">_</span>
          <span class="win-ctrl-box">□</span>
          <span class="win-ctrl-box">×</span>
        </div>
      </header>

      <!-- Menu Bar -->
      <div class="netscape-menubar" role="navigation" aria-label="Application Menu Bar">
        <ul class="netscape-menu-items">
          <li><a href="/"><u>F</u>ile</a></li>
          <li><a href="/source"><u>E</u>dit / Source</a></li>
          <li><a href="/installer"><u>V</u>iew Installer</a></li>
          <li><a href="https://corporate.raggiesoft.com/projects/storetrainer"><u>G</u>o to RaggieSoft Media</a></li>
          <li><a href="https://michaelpragsdale.com"><u>C</u>ommunicator (Architect Dossier)</a></li>
          <li><a href="https://nebulae.raggiesoft.com"><u>H</u>elp / Network Sitemap</a></li>
        </ul>
        <span style="font-size: 11.5px;">Pre-AI Hand-Written Win32 Freeware (2018–2020)</span>
      </div>

      <!-- Navigation Toolbar -->
      <nav class="netscape-toolbar" aria-label="Primary StoreTrainer Navigation">
        <ul class="netscape-nav-list">
          ${navHtml}
          <li>
            <a href="https://assets.raggiesoft.com/storetrainer/tssetup100.exe" class="win-btn win-btn-primary">
              ⬇️ Download tssetup100.exe (v1.0)
            </a>
          </li>
          <li>
            <button
              type="button"
              id="theme-toggle"
              class="win-btn"
              aria-label="Toggle between Windows 98 Classic Light Mode and Windows 2000 High-Contrast Dark Mode"
            >
              <span id="theme-toggle-label">🖥️ Theme</span>
            </button>
          </li>
        </ul>
        <div class="netscape-throbber" aria-hidden="true" title="Netscape Communicator">N</div>
      </nav>

      <!-- Location / Address Bar -->
      <div class="netscape-locationbar">
        <strong>Netsite:</strong>
        <div class="location-input win-inset" aria-label="Current URL">${escapeHtml(canonicalUrl)}</div>
        <a href="https://raggiesoft.com" class="win-btn">🌐 RaggieSoft Hub</a>
      </div>

      <!-- Sunken Document Viewport -->
      <main id="content" class="netscape-viewport win-inset" tabindex="-1">
        ${bodyHtml}
      </main>

      <!-- Netscape Status Bar & Global Legal Footer -->
      <footer class="netscape-statusbar" role="contentinfo">
        <div class="status-cell">🔒 TLS 1.3 Modern Security • Document: Done (WCAG 2.1 AA / Section 508 Verified)</div>
        <div class="status-cell">
          Code: <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">MIT License</a> |
          Docs: <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
        </div>
      </footer>
    </div>

    <!-- Global Fictitious Disclaimer & Network Links Outside Window Frame -->
    <div class="netscape-window win-outset" style="margin-top: 0.75rem; padding: 0.85rem 1.15rem; font-size: 12.5px;">
      <p style="margin: 0 0 0.5rem;">
        <strong>RaggieSoft Ecosystem Links:</strong>
        <a href="https://raggiesoft.com">RaggieSoft Hub</a> •
        <a href="https://corporate.raggiesoft.com">RaggieSoft Media (B2B)</a> •
        <a href="https://michaelpragsdale.com">Michael P. Ragsdale Portfolio</a> •
        <a href="https://music.raggiesoft.com">The Listening Room</a> •
        <a href="https://books.raggiesoft.com">RaggieSoft Book Reader</a> •
        <a href="https://lore.raggiesoft.com">Lore Omnibus</a> •
        <a href="https://engineroom.raggiesoft.com">Engine Room Records</a> •
        <a href="https://stardust.raggiesoft.com">The Stardust Engine</a> •
        <a href="https://nebulae.raggiesoft.com">The RaggieSoft Nebulae</a>
      </p>
      <p style="margin: 0;">
        <strong>Fictitious Persons &amp; Entities Disclaimer:</strong> While <strong>RaggieSoft StoreTrainer</strong> is a real-world Win32 desktop utility authored by <strong>Michael P. Ragsdale</strong>, all narrative characters, bands, biographies, universities (including Commonwealth Polytechnic Institute / CPI, The Forgers, and The Crucible), corporations (including OmniCorp, Apex Records, Prairie Coachworks, and Sainte-Claire), transit agencies (Blue Ridge Transit), in-universe legal filings, and any entity with <strong>&ldquo;LLC&rdquo;</strong>, <strong>&ldquo;Trust&rdquo;</strong>, or <strong>&ldquo;Holdings&rdquo;</strong> in its name across the wider RaggieSoft network are works of fiction. Any resemblance to actual persons (living or dead), businesses, institutions, or events is purely coincidental.
      </p>
    </div>

    <script src="https://assets.raggiesoft.com/storetrainer/js/netscape-ui.js" defer></script>
  </body>
</html>`;
}

function renderHomePage(sourceFiles) {
  const bodyHtml = `
    <div class="retro-banner">
      <h1>RaggieSoft StoreTrainer v1.0 (Win32 Retro PC Game &amp; Trainer Manager)</h1>
      <p style="margin: 0 0 0.85rem; font-size: 1.02rem;">
        <strong>RaggieSoft StoreTrainer (<code>TStore.exe</code>)</strong> is a <strong>100% hand-written (pre-AI, 2018–2020)</strong> Win32 desktop utility authored by <strong>Michael P. Ragsdale</strong> in <strong>Visual Basic 6.0 (<code>TStore.vbp</code>)</strong> inside a <strong>Windows 2000 Professional SP4 virtual machine</strong>. It indexes, stores, and launches classic and modern PC games alongside their associated <strong>game trainers (cheat utilities)</strong> and custom command-line switches across every desktop release of Windows from <strong>Windows 95 through Windows 11</strong>.
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 0.65rem;">
        <a href="https://assets.raggiesoft.com/storetrainer/tssetup100.exe" class="win-btn win-btn-primary">
          💾 Download Official Installer: tssetup100.exe (Win95–Win11)
        </a>
        <a href="/source" class="win-btn">
          🔍 Inspect VB6 &amp; .NET Source Code (${sourceFiles.length} Files) →
        </a>
        <a href="/installer" class="win-btn">
          📦 Inspect NSIS Wizard95 Installer Scripts →
        </a>
      </div>
    </div>

    <div class="retro-grid-2">
      <section class="retro-dialog-card" aria-labelledby="why-built-heading">
        <h2 id="why-built-heading" style="margin-top: 0;">Why StoreTrainer Was Built (2018–2020)</h2>
        <p>
          Many classic 1990s and 2000s PC games require either specific command-line switches (such as resolution overrides, <code>-windowed</code>, or mod directory flags) or companion memory-resident <strong>game trainers</strong> that must be launched in the proper working directory before or alongside the game executable.
        </p>
        <p style="margin-bottom: 0;">
          Built inside a <strong>Windows 2000 Professional SP4 VM</strong> using pure Win32 API calls (<code>shell32.dll</code> <code>ShellExecuteA</code>, <code>comdlg32.dll</code> <code>GetOpenFileNameA</code>, and <code>SHBrowseForFolder</code>) without heavy third-party ActiveX/OCX dependencies, StoreTrainer runs natively on a Pentium-era Windows 95/98 retro rig just as cleanly as on a modern Windows 11 workstation.
        </p>
      </section>

      <section class="retro-dialog-card" aria-labelledby="sfile-spec-heading">
        <h2 id="sfile-spec-heading" style="margin-top: 0;">Zero-Database <code>.sfile</code> Flat-File Specification</h2>
        <p>
          True to RaggieSoft's zero-database philosophy, StoreTrainer stores each game profile as a human-readable 6-line sequential text file (<code>&lt;GameName&gt;.sfile</code>) alongside <code>StoreTrainer.cfg</code>:
        </p>
        <pre class="code-viewer" style="max-height: 200px; margin: 0;">Line 1: GameName     (Display title in the StoreTrainer list)
Line 2: GameFile     (Full path to the game .exe binary)
Line 3: GameArgs     (Optional command-line switches for the game)
Line 4: TrainerFile  (Full path to the companion trainer .exe, or empty)
Line 5: TrainerArgs  (Optional command-line switches for the trainer)
Line 6: GamePath     (Working directory passed to ShellExecuteA)
Line 7: TrainerPath  (Trainer working directory passed to ShellExecuteA)</pre>
      </section>
    </div>

    <section aria-labelledby="os-matrix-heading">
      <h2 id="os-matrix-heading">Verified Windows Operating System Compatibility Matrix</h2>
      <table class="retro-table">
        <thead>
          <tr>
            <th scope="col">Operating System Family</th>
            <th scope="col">Supported Releases</th>
            <th scope="col">Architecture &amp; Runtime Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Windows 9x (Win32)</strong></td>
            <td>Windows 95, Windows 98, Windows 98 SE, Windows ME</td>
            <td>Verified via NSIS <code>WinVer.nsh</code> (<code>AtLeastWin95</code>); deploys <code>msvbvm60.dll</code> if absent.</td>
          </tr>
          <tr>
            <td><strong>Windows NT Classic</strong></td>
            <td>Windows NT 4.0, Windows 2000 Professional SP4, Windows XP</td>
            <td><strong>Primary Development Environment:</strong> Built &amp; compiled inside Windows 2000 Professional SP4.</td>
          </tr>
          <tr>
            <td><strong>Modern Windows NT (x86/x64)</strong></td>
            <td>Windows Vista, Windows 7, Windows 8.1, Windows 10, Windows 11</td>
            <td>Runs seamlessly via WOW64 (<code>TStore.exe</code> VB6) or natively via the included <code>TStore.NET</code> port.</td>
          </tr>
        </tbody>
      </table>
    </section>
  `;

  return renderNetscapeShell({
    title: 'RaggieSoft StoreTrainer | Win32 Game & Trainer Manager',
    description: 'Official portal for RaggieSoft StoreTrainer (TStore.exe)—a hand-written VB6 Win32 utility to store and launch PC games and game trainers on Windows 95–11.',
    canonicalPath: '/',
    bodyHtml
  });
}

function renderSourcePage(sourceFiles) {
  const vbFiles = sourceFiles.filter((f) => f.category !== 'NSIS Installer');
  const tocHtml = vbFiles
    .map(
      (f) =>
        `<li><a href="#${escapeHtml(f.id)}"><strong>${escapeHtml(f.path)}</strong></a> — ${escapeHtml(f.description)}</li>`
    )
    .join('\n          ');

  const filesHtml = vbFiles
    .map(
      (f) => `
      <section id="${escapeHtml(f.id)}" class="retro-dialog-card" style="margin-bottom: 1.5rem;" aria-labelledby="heading-${escapeHtml(f.id)}">
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 0.5rem;">
          <h2 id="heading-${escapeHtml(f.id)}" style="margin: 0; border: 0;">${escapeHtml(f.title)}</h2>
          <span style="font-family: monospace; font-weight: 700;">[${escapeHtml(f.category)}]</span>
        </div>
        <p style="margin: 0.4rem 0 0.75rem;">${escapeHtml(f.description)}</p>
        <pre class="code-viewer"><code>${escapeHtml(f.code)}</code></pre>
      </section>`
    )
    .join('\n');

  const bodyHtml = `
    <h1>Visual Basic 6.0 (<code>TStore.vbp</code>) &amp; VB.NET Source Code Inspector</h1>
    <p>
      Browse the complete, unmodified source code of <strong>RaggieSoft StoreTrainer</strong> authored between 2018 and 2020 inside a Windows 2000 Professional SP4 virtual machine. All source code is released under the <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">MIT License</a>.
    </p>
    <div class="retro-banner">
      <h2 style="margin-top: 0;">Source File Index (${vbFiles.length} Modules &amp; Forms)</h2>
      <ul style="margin: 0; padding-left: 1.25rem;">
        ${tocHtml}
      </ul>
    </div>
    ${filesHtml}
  `;

  return renderNetscapeShell({
    title: 'VB6 & .NET Source Code | RaggieSoft StoreTrainer',
    description: 'Inspect the original Visual Basic 6.0 (TStore.vbp), Win32 API modules, and VB.NET source code for RaggieSoft StoreTrainer.',
    canonicalPath: '/source',
    bodyHtml
  });
}

function renderInstallerPage(sourceFiles) {
  const nsisFiles = sourceFiles.filter((f) => f.category === 'NSIS Installer');
  const filesHtml = nsisFiles
    .map(
      (f) => `
      <section id="${escapeHtml(f.id)}" class="retro-dialog-card" style="margin-bottom: 1.5rem;" aria-labelledby="heading-${escapeHtml(f.id)}">
        <h2 id="heading-${escapeHtml(f.id)}" style="margin-top: 0;">${escapeHtml(f.title)}</h2>
        <p>${escapeHtml(f.description)}</p>
        <pre class="code-viewer"><code>${escapeHtml(f.code)}</code></pre>
      </section>`
    )
    .join('\n');

  const bodyHtml = `
    <h1>NSIS Wizard95 Installer Architecture (<code>TSSetup.nsi</code> &amp; <code>TSSetup-Patch.nsi</code>)</h1>
    <p>
      <strong>RaggieSoft StoreTrainer</strong> is packaged using the <strong>Nullsoft Scriptable Install System (NSIS)</strong> with the classic 1990s <code>win.bmp</code> Wizard95 sidebar graphic, <code>WinVer.nsh</code> OS verification (checking for Windows 95 or Windows NT 4.0 and newer), and safe <code>UpgradeDLL</code> registration for the Visual Basic 6.0 SP6 runtime libraries (<code>msvbvm60.dll</code>, <code>oleaut32.dll</code>, <code>olepro32.dll</code>, <code>asycfilt.dll</code>, <code>stdole2.tlb</code>, and <code>comcat.dll</code>).
    </p>
    <div class="retro-banner">
      <h2 style="margin-top: 0;">Finish-Page Redirect Canon (<code>storetrainer.raggiesoft.com</code>)</h2>
      <p style="margin-bottom: 0.75rem;">
        Original 2020 builds of <code>tssetup100.exe</code> pointed their finish-page link to <code>https://raggiesoft.com/products/storetrainer</code>, which now permanently <code>301</code> redirects to <code>https://storetrainer.raggiesoft.com/</code>. Both active NSIS scripts below define <code>MUI_FINISHPAGE_LINK_LOCATION "https://storetrainer.raggiesoft.com/"</code> for all future builds.
      </p>
      <a href="https://assets.raggiesoft.com/storetrainer/tssetup100.exe" class="win-btn win-btn-primary">
        ⬇️ Download Compiled Installer: tssetup100.exe
      </a>
    </div>
    ${filesHtml}
  `;

  return renderNetscapeShell({
    title: 'NSIS Wizard95 Installer | RaggieSoft StoreTrainer',
    description: 'Explore the NSIS Wizard95 installer scripts (TSSetup.nsi and TSSetup-Patch.nsi) and VB6 runtime deployment for RaggieSoft StoreTrainer.',
    canonicalPath: '/installer',
    bodyHtml
  });
}

function buildStoreTrainerSite() {
  const sourceFiles = loadStoreTrainerSourceFiles();

  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const cssContent = fs.readFileSync(
    path.join(projectRoot, 'src', 'styles', 'win98-netscape.css'),
    'utf-8'
  );
  const clientJsContent = buildNetscapeClientJs();
  writeDistFile('assets/win98-netscape.css', cssContent);
  writeDistFile('assets/netscape-ui.js', clientJsContent);

  const workspaceRoot = path.resolve(projectRoot, '..', '..', '..');
  const sharedCdnCssDir = path.join(workspaceRoot, 'raggiesoft-assets', 'storetrainer', 'css');
  const sharedCdnJsDir = path.join(workspaceRoot, 'raggiesoft-assets', 'storetrainer', 'js');
  fs.mkdirSync(sharedCdnCssDir, { recursive: true });
  fs.mkdirSync(sharedCdnJsDir, { recursive: true });
  fs.writeFileSync(path.join(sharedCdnCssDir, 'win98-netscape.css'), cssContent, 'utf-8');
  fs.writeFileSync(path.join(sharedCdnJsDir, 'netscape-ui.js'), clientJsContent, 'utf-8');

  writeDistFile('index.html', renderHomePage(sourceFiles));
  writeDistFile('source/index.html', renderSourcePage(sourceFiles));
  writeDistFile('installer/index.html', renderInstallerPage(sourceFiles));

  console.log(
    `✅ Built storetrainer.raggiesoft.com static bundle in ${distDir} (3 routes + ${sourceFiles.length} VB6/.NET/NSIS source files indexed).`
  );
}

buildStoreTrainerSite();

if (process.argv.includes('--serve')) {
  const port = Number(process.env.PORT || 4323);
  const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    let filePath = path.join(distDir, urlPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    } else if (!path.extname(filePath) && fs.existsSync(`${filePath}/index.html`)) {
      filePath = `${filePath}/index.html`;
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath);
    const mime =
      ext === '.css'
        ? 'text/css; charset=utf-8'
        : ext === '.js'
          ? 'application/javascript; charset=utf-8'
          : 'text/html; charset=utf-8';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(fs.readFileSync(filePath));
  });
  server.listen(port, () => {
    console.log(`🚀 RaggieSoft StoreTrainer preview server running at http://localhost:${port}`);
  });
}

/**
 * @license MIT
 * ============================================================================
 * scripts/build.mjs — RaggieSoft StoreTrainer (storetrainer.raggiesoft.com)
 * ============================================================================
 * READ-ALONG TEACHING OVERVIEW (JavaScript 101 — Node.js Static Site Generator):
 *
 * What is this file, and what is a Static Site Generator (SSG)?
 *   Normally, JavaScript runs inside a visitor's web browser. However, with
 *   Node.js (`npm run build`, which runs `node scripts/build.mjs`), JavaScript
 *   can also run directly on your computer at *build time*—reading files from
 *   disk, transforming data, and writing finished `.html`, `.css`, `.js`, and
 *   `.xml` files into an output folder (`./dist`).
 *
 *   That pattern is called a **Static Site Generator (SSG)**. Instead of
 *   running a database or server-side script every time a visitor requests a
 *   web page, this script pre-builds the entire `storetrainer.raggiesoft.com`
 *   website once ahead of time into ultra-fast, zero-database static files!
 *
 * What is RaggieSoft StoreTrainer (`TStore.exe`, v1.0)?
 *   - StoreTrainer is a 100% hand-written (pre-AI, 2018–2020) Win32 desktop
 *     utility authored by Michael P. Ragsdale in Visual Basic 6.0 (`TStore.vbp`)
 *     inside a Windows 2000 Professional SP4 virtual machine (alongside a
 *     Visual Basic .NET port `TStore.NET` and Nullsoft NSIS Wizard95 installers
 *     `TSSetup.nsi` and `TSSetup-Patch.nsi`).
 *   - It indexes, stores, and launches classic and modern PC games alongside
 *     their companion game trainers (cheat utilities) and command-line flags
 *     across Windows 95 through modern Windows PCs.
 *
 * How does this compiler turn JSON / VB6 source archives into a retro website?
 *   1. Data Ingestion (`loadStoreTrainerSourceFiles`):
 *      Reads the 18 original Visual Basic 6.0 (`.vbp`, `.frm`, `.bas`), VB.NET
 *      (`.vb`), documentation (`.txt`), and NSIS installer (`.nsi`) source
 *      files—snapshotting them into `src/data/storetrainer-source.json` so
 *      production builds succeed anywhere—and loads them into a JavaScript array.
 *   2. Safe HTML Escaping (`escapeHtml`):
 *      Converts special HTML characters (`&`, `<`, `>`, `"`, `'`) into safe
 *      HTML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`) so raw VB6/C#
 *      comparisons (`If x < 10`) or tags (`<GameName>.sfile`) never break HTML
 *      layout or introduce Cross-Site Scripting (XSS) vulnerabilities.
 *   3. Shared Retro Window Layout (`renderNetscapeShell`) & Route Renderers:
 *      Uses JavaScript **template literals** (backtick strings `` `...` ``) to
 *      wrap each page inside an authentic 1998–2000 **Netscape Communicator
 *      4.78 / Windows 2000 SP4** application window shell (3D beveled title
 *      bar, menu bar, toolbar, `"Netsite:"` location bar, sunken document
 *      viewport, status bar, and fixed bottom Windows 98 taskbar) with full
 *      WCAG 2.1 AA accessibility, SEO/OpenGraph metadata, and Light/Dark Mode.
 *   4. Static Bundle Emission & CDN Asset Mirroring (`buildStoreTrainerSite`):
 *      Writes `/index.html`, `/source/index.html`, `/installer/index.html`,
 *      `/404.html`, `/sitemap.xml`, and `/robots.txt` into `./dist`, mirrors
 *      `win98-netscape.css` and `netscape-ui.js` to both `./dist/assets/` and
 *      `raggiesoft-assets/storetrainer/`, and optionally starts a local HTTP
 *      preview server when invoked with `--serve` (`npm run dev`).
 * ============================================================================
 */

/*
 * ============================================================================
 * SECTION 1: Node.js ES Module (`import`) Statements & Path Setup
 * ============================================================================
 * Why does this file have a `.mjs` extension (and `"type": "module"` in `package.json`)?
 *   Modern JavaScript uses **ES Modules (ESM)**—the standardized `import` and
 *   `export` syntax shared by both browsers and Node.js (replacing older Node
 *   `require(...)` calls).
 *
 * Why do the module names start with `'node:'`?
 *   The `'node:'` prefix explicitly tells Node.js: "Load this built-in standard
 *   library module that ships inside Node itself—do NOT waste time searching
 *   `node_modules/` on disk."
 *   - `node:fs` ("File System"): Reads/writes files and creates/deletes folders.
 *   - `node:path`: Safely joins and resolves file paths across macOS/Linux (`/`)
 *     and Windows (`\`) without fragile manual string concatenation.
 *   - `node:http`: Creates a local web server when `--serve` is passed.
 *   - `{ fileURLToPath }` from `node:url`: Notice the curly braces `{ ... }`!
 *     That is a **named import**, pulling one specific helper function out of
 *     the `node:url` module rather than importing the entire module object.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

/*
 * Computing Project Directory Paths in ES Modules:
 *   In older Node.js scripts (CommonJS), `__filename` and `__dirname` existed
 *   automatically. In modern ES Modules, Node instead gives us `import.meta.url`,
 *   which looks like `'file:///Users/.../storetrainer/scripts/build.mjs'`.
 *
 *   Step-by-step path math:
 *   1. `fileURLToPath(import.meta.url)` converts that `file://` URL into a real
 *      operating-system file path (`.../subdomains/storetrainer/scripts/build.mjs`).
 *   2. `path.dirname(__filename)` strips off `/build.mjs` to give the folder
 *      containing this script (`.../subdomains/storetrainer/scripts`).
 *   3. `path.resolve(__dirname, '..')` walks up one parent folder (`..`) to
 *      reach the StoreTrainer project root (`.../subdomains/storetrainer`).
 *   4. `path.join(...)` builds the exact paths to our output directory (`dist`)
 *      and our committed JSON source archive (`src/data/storetrainer-source.json`).
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const sourceSnapshotPath = path.join(projectRoot, 'src', 'data', 'storetrainer-source.json');

/*
 * ============================================================================
 * SECTION 2: Safe HTML Escaping & Disk File Helper Functions
 * ============================================================================
 */

/**
 * Escapes HTML special characters for safe interpolation inside HTML elements
 * and double/single-quoted HTML attributes.
 *
 * TEACHING NOTE — Why is `escapeHtml` CRITICAL for security and valid HTML?
 *   When we inject dynamic text—especially raw Visual Basic 6.0, VB.NET, or C#
 *   source code—into an HTML string like `<code>${code}</code>`, the browser's
 *   HTML parser cannot tell the difference between our page's HTML tags and
 *   angle brackets inside the source code!
 *   - For example, VB6 code containing `If Version < 2 And Flags > 0` or a
 *     comment mentioning `<GameName>.sfile` would trick the browser into
 *     thinking `< 2` or `<GameName>` is a brand-new HTML tag, mangling the rest
 *     of the page!
 *   - Worse, if any string ever contained `<script>...</script>` or `" onload="..."`,
 *     injecting it unescaped would let arbitrary JavaScript execute in visitors'
 *     browsers—a classic security vulnerability called **Cross-Site Scripting (XSS)**.
 *
 * How this function works line by line:
 *   - `str ?? ''` uses the **nullish coalescing operator (`??`)**: if `str` is
 *     `null` or `undefined`, substitute an empty string `''`; then `String(...)`
 *     guarantees we have a string before calling `.replace(...)`.
 *   - Each `.replace(/pattern/g, replacement)` uses a Regular Expression with
 *     the `g` ("global") flag so *every* occurrence in the string is replaced,
 *     not just the first one!
 *   - ORDER MATTERS: Notice `&` -> `&amp;` MUST happen FIRST! If we replaced
 *     `<` -> `&lt;` first and `&` -> `&amp;` second, the `&` inside `&lt;`
 *     would get double-escaped into `&amp;lt;` and show up literally on screen!
 *
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
 * Writes a static text file inside `./dist`, automatically creating any missing
 * parent folders first.
 *
 * TEACHING NOTE — Synchronous File I/O (`Sync` methods) in Build Scripts:
 *   Node.js offers both asynchronous (`fs.promises.writeFile`) and synchronous
 *   (`fs.writeFileSync`) file methods. Inside a live web server handling
 *   thousands of users at once, blocking the main thread is avoided; however,
 *   inside a short-lived CLI build script like `build.mjs` that runs top-to-bottom
 *   in a few milliseconds, `*Sync` methods make control flow straightforward
 *   and deterministic:
 *   1. `path.join(distDir, relPath)` turns `'source/index.html'` into
 *      `.../dist/source/index.html`.
 *   2. `fs.mkdirSync(path.dirname(fullPath), { recursive: true })` ensures the
 *      parent directory (`.../dist/source`) exists—working just like `mkdir -p`
 *      on the command line (creating nested directories if missing, and doing
 *      nothing without error if they already exist).
 *   3. `fs.writeFileSync(fullPath, content, 'utf-8')` writes the text to disk
 *      encoded as standard UTF-8 Unicode (supporting emojis like `💾` and `🎄`).
 *
 * @param {string} relPath
 * @param {string} content
 */
function writeDistFile(relPath, content) {
  const fullPath = path.join(distDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

/*
 * ============================================================================
 * SECTION 3: Loading & Snapshotting Original VB6, VB.NET, & NSIS Source Files
 * ============================================================================
 */

/**
 * Loads the real VB6, VB.NET, and NSIS source files from `/ai-staging/StoreTrainer`
 * when building in the local workspace and persists a committed snapshot at
 * `src/data/storetrainer-source.json` so builds on the production droplet succeed
 * without needing `/ai-staging` deployed.
 *
 * TEACHING NOTE — Dual-Source Build Resilience (Staging Files -> JSON Snapshot):
 *   Why check two places for the StoreTrainer source code?
 *   - On the author's local workstation, the raw original `.vbp`, `.frm`,
 *     `.bas`, `.vb`, `.txt`, and `.nsi` files live in `ai-staging/StoreTrainer`
 *     (which is local-only and not pushed to the production web server).
 *   - Whenever a build runs locally and finds `aiStagingDir`, it reads every
 *     raw source file, normalizes Windows `\r\n` (Carriage Return + Line Feed)
 *     line endings into Unix `\n` line endings for clean `<pre><code>` display,
 *     and saves the complete array as formatted JSON (`JSON.stringify(loaded, null, 2)`)
 *     inside `src/data/storetrainer-source.json` (which IS committed to Git).
 *   - Later, when the deployment script builds this site on the remote Linux
 *     production server where `ai-staging/` does not exist, line 232 falls back
 *     to `JSON.parse(fs.readFileSync(sourceSnapshotPath, 'utf-8'))`, turning
 *     that JSON text right back into the exact same JavaScript array of objects!
 *
 * @returns {Array<{id: string, title: string, category: string, path: string, description: string, code: string}>}
 */
function loadStoreTrainerSourceFiles() {
  // Resolve up 3 levels from `raggiesoft-servers/raggiesoft.com/subdomains/storetrainer`
  // to reach `$HOME/Developer/ai-staging/StoreTrainer` on local workstations.
  const aiStagingDir = path.resolve(projectRoot, '../../../ai-staging/StoreTrainer');

  // Manifest catalog of all 18 original StoreTrainer files in display order.
  // Each object provides:
  //   - `id`: URL-safe HTML anchor slug (e.g. `<section id="tstore-vbp">`)
  //   - `title`: Human-readable heading displayed on `/source` or `/installer`
  //   - `category`: Used by `.filter(...)` to separate VB6/.NET code from NSIS scripts
  //   - `relPath`: Relative file path inside `ai-staging/StoreTrainer/`
  //   - `description`: Plain-English summary of what that module/script does
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
      title: 'SFile.bas (Game Profile & File Operations)',
      category: 'VB6 Win32 API',
      relPath: 'SFile.bas',
      description: 'File management and shell operations module for locating, copying, and launching game and trainer programs.'
    },
    {
      id: 'inifile-bas',
      title: 'INIFile.bas (INI Configuration Parser)',
      category: 'VB6 Win32 API',
      relPath: 'INIFile.bas',
      description: 'Configuration reader and writer for saving local INI settings.'
    },
    {
      id: 'registry-bas',
      title: 'Registry.bas (System Paths Helper Module)',
      category: 'VB6 Win32 API',
      relPath: 'Registry.bas',
      description: 'Helper module for locating installed game folders across classic and modern PCs.'
    },
    {
      id: 'specialfolder-bas',
      title: 'SpecialFolder.bas (Special Folders Helper)',
      category: 'VB6 Win32 API',
      relPath: 'SpecialFolder.bas',
      description: 'Resolves application data, program folders, and user profile directories across classic and modern Windows.'
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
      title: 'Installer/TSSetup.nsi (Full Wizard95 Setup Script)',
      category: 'NSIS Installer',
      relPath: 'Installer/TSSetup.nsi',
      description: 'Full Nullsoft Scriptable Install System (NSIS) script featuring the classic Wizard95 bitmap, system compatibility check, and VB6 runtime library setup.'
    },
    {
      id: 'tssetup-patch-nsi',
      title: 'Installer/TSSetup-Patch.nsi (Lightweight Patch Installer)',
      category: 'NSIS Installer',
      relPath: 'Installer/TSSetup-Patch.nsi',
      description: 'Compact update installer script updating `TStore.exe` and linking directly to `https://storetrainer.raggiesoft.com/`.'
    }
  ];

  // PATH A (Local Workstation): Read live files from `ai-staging/StoreTrainer`
  // and refresh `src/data/storetrainer-source.json`.
  if (fs.existsSync(aiStagingDir)) {
    const loaded = [];
    // `for...of` loops cleanly over every object in the `fileSpecs` array.
    for (const spec of fileSpecs) {
      const full = path.join(aiStagingDir, spec.relPath);
      if (fs.existsSync(full)) {
        // Classic Windows 2000 / VB6 text files end every line with `\r\n` (CRLF).
        // Replacing `/\r\n/g` with `\n` normalizes line breaks across OSes.
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
      // Persist the JSON snapshot (`null, 2` pretty-prints with 2-space indentation
      // so Git diffs remain clean and human-readable).
      fs.mkdirSync(path.dirname(sourceSnapshotPath), { recursive: true });
      fs.writeFileSync(sourceSnapshotPath, JSON.stringify(loaded, null, 2), 'utf-8');
      return loaded;
    }
  }

  // PATH B (Production / CI Build): Parse the committed JSON snapshot directly.
  if (fs.existsSync(sourceSnapshotPath)) {
    return JSON.parse(fs.readFileSync(sourceSnapshotPath, 'utf-8'));
  }

  // Safety fallback: return an empty array so array methods (`.filter`, `.map`)
  // in page renderers never crash on `undefined`.
  return [];
}

/*
 * ============================================================================
 * SECTION 4: Client-Side Browser Script Generator (`netscape-ui.js`)
 * ============================================================================
 */

/**
 * Builds the source text of `netscape-ui.js`, implementing the Modern Web
 * Guidance two-state color-scheme toggle (Win98 Light vs. Win2000 High-Contrast
 * Dark), seasonal Quantum OS 98 Holiday chrome sync, and live Win98 tray clock.
 *
 * TEACHING NOTE — Multi-Line Template Literals & Single-Source Asset Sync:
 *   Notice that `return \`...\`;` uses backticks (`` ` ``) instead of single or
 *   double quotes! In JavaScript, backtick strings are called **template
 *   literals**: they can span hundreds of lines while preserving exact line
 *   breaks and indentation.
 *
 *   Why return `netscape-ui.js` from this function?
 *   In `buildStoreTrainerSite()` below, the string returned here is written to
 *   BOTH `./dist/assets/netscape-ui.js` (for local previewing) AND
 *   `raggiesoft-assets/storetrainer/js/netscape-ui.js` (served in production by
 *   `https://assets.raggiesoft.com`), guaranteeing both copies stay 100%
 *   byte-for-byte identical on every `npm run build`.
 *
 * @returns {string}
 */
function buildNetscapeClientJs() {
  return `/**
 * @license MIT
 * ============================================================================
 * netscape-ui.js — Client-Side Progressive Enhancement (storetrainer.raggiesoft.com)
 * ============================================================================
 * READ-ALONG TEACHING OVERVIEW (JavaScript 101 — Browser DOM & Theme State):
 *
 * What is this file?
 *   This is the browser-side JavaScript file loaded at the bottom of every
 *   page on storetrainer.raggiesoft.com via:
 *     <script src=".../storetrainer/js/netscape-ui.js" defer></script>
 *
 *   (Note on Build Pipeline Sync: This exact file is generated by
 *   buildNetscapeClientJs() inside scripts/build.mjs and written to both
 *   ./dist/assets/netscape-ui.js and raggiesoft-assets/storetrainer/js/netscape-ui.js
 *   so local builds and the production CDN stay 100% identical.)
 *
 * What is "Progressive Enhancement"?
 *   Because scripts/build.mjs pre-compiles all StoreTrainer pages into complete
 *   static HTML files and win98-netscape.css handles responsive layouts and OS
 *   Dark Mode automatically via CSS @media (prefers-color-scheme: dark), the
 *   entire site works even if JavaScript is turned off!
 *
 *   When JavaScript IS enabled, this small script layers three interactive
 *   desktop enhancements on top of the static HTML:
 *     1. Two-State Desktop Theme Toggle (#theme-toggle): Lets visitors switch
 *        between "Windows 98 Classic" (Silver & Teal Light Mode) and "Windows
 *        2000 Dark" (High-Contrast Midnight Terminal), remembering manual
 *        overrides in localStorage and automatically unpinning when toggled
 *        back to match the operating system's preference.
 *     2. Quantum OS 98 Holiday Desktop Sync: Detects when the global network
 *        script (raggiesoft-network.js) adds the 'rs-holiday-season' class to
 *        <html> between Black Friday and New Year's Day, updating the Netscape
 *        window title bar, Start button icon, and Holiday system tray badge.
 *     3. Live Windows 98 System Tray Clock (#win98-clock): Displays the
 *        visitor's real local time (e.g., "10:42 PM") in the bottom-right
 *        taskbar tray and refreshes it every 30 seconds.
 * ============================================================================
 */

/*
 * STEP 1: Immediately Invoked Function Expression (IIFE) — '(function () { ... })();'
 * ----------------------------------------------------------------------------
 * Why wrap the entire file inside '(function () { ... })();'?
 *   In classic browser <script> tags (scripts loaded without type="module"),
 *   any variable declared at the top level of a file automatically becomes a
 *   property on the global 'window' object. If two scripts on the same page
 *   both declared 'var meta = ...' or 'function updateLabel() {}', the second
 *   script would overwrite the first!
 *
 *   Wrapping our code in an anonymous function '(function () { ... })' and
 *   immediately calling it with the trailing '()' creates a private local
 *   function scope. None of our variables or helper functions leak onto
 *   'window', so this script peacefully coexists with raggiesoft-network.js
 *   and Google Analytics.
 */
(function () {
  /*
   * STEP 2: Caching DOM Element References
   * --------------------------------------------------------------------------
   * What is the DOM?
   *   When a web browser reads an HTML file, it turns every HTML tag (<meta>,
   *   <button>, <span>, etc.) into a live JavaScript object in memory. Together,
   *   this tree of objects is called the Document Object Model (DOM), exposed
   *   through the global 'document' object.
   *
   * Why look up these elements once at the top of the function?
   *   - document.querySelector('meta[name="color-scheme"]') uses a CSS
   *     attribute selector to find <meta name="color-scheme" content="...">
   *     inside <head>. Updating this tag tells the browser's built-in UI
   *     (scrollbars, form controls) whether to paint in light or dark colors.
   *   - document.getElementById('...') looks up a specific HTML element by its
   *     unique id="..." attribute (the fastest lookup method in the DOM).
   *   - Storing these references in local variables ('meta', 'toggleBtn', etc.)
   *     means our event handlers and 30-second clock timer can reuse them
   *     directly instead of searching the HTML tree over and over.
   *   - Notice that because this script is loaded with the 'defer' attribute,
   *     the browser guarantees the full HTML document has already been parsed
   *     before line 1 of this function runs! Even so, every helper below
   *     checks whether an element exists (e.g., 'if (!clockEl) return;') so
   *     the script never crashes if a future page omits an optional widget.
   */
  var meta = document.querySelector('meta[name="color-scheme"]');
  var toggleBtn = document.getElementById('theme-toggle');
  var toggleLabel = document.getElementById('theme-toggle-label');
  var titleCaption = document.getElementById('win-titlebar-caption');
  var startIcon = document.getElementById('win98-start-icon');
  var holidayTray = document.getElementById('win98-holiday-tray');
  var clockEl = document.getElementById('win98-clock');

  /*
   * STEP 3: Detecting Seasonal Holiday Mode ('isHolidayActive')
   * --------------------------------------------------------------------------
   * - 'document.documentElement' always points to the root <html> element.
   * - '.classList.contains(...)' returns true if <html> currently has the CSS
   *   class 'rs-holiday-season' (which raggiesoft-network.js adds automatically
   *   during the annual Black Friday -> Jan 1 holiday window).
   */
  function isHolidayActive() {
    return document.documentElement.classList.contains('rs-holiday-season');
  }

  /*
   * STEP 4: Reading the Operating System's Color Scheme ('getSystemScheme')
   * --------------------------------------------------------------------------
   * How does JavaScript know whether macOS, Windows, iOS, Android, or Linux is
   * currently set to Dark Mode or Light Mode?
   *   - 'window.matchMedia(query)' is the JavaScript twin of a CSS @media rule!
   *   - Passing '(prefers-color-scheme: dark)' returns a MediaQueryList object
   *     whose boolean '.matches' property is true when the OS prefers dark UI.
   *   - Checking 'window.matchMedia && ...' first is called "feature detection":
   *     if a very old or minimal browser does not support matchMedia, the '&&'
   *     short-circuits cleanly and our ternary operator ('? :') safely falls
   *     back to 'light' instead of throwing a TypeError.
   */
  function getSystemScheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  /*
   * STEP 5: Resolving the Active Theme ('getRenderedScheme')
   * --------------------------------------------------------------------------
   * Theme Priority Cascade (User Override > System Default):
   *   1. First, check 'localStorage.getItem("color-scheme")'.
   *      What is localStorage? It is a small key-value dictionary built into
   *      the browser that persists across page reloads and browser restarts
   *      for this domain (storetrainer.raggiesoft.com).
   *   2. Why wrap localStorage inside 'try { ... } catch (e) {}'?
   *      In strict privacy modes (or when a user disables site storage/cookies
   *      in browser settings), merely reading 'localStorage' can throw a
   *      SecurityError exception! Wrapping it in try/catch ensures the site
   *      keeps working smoothly using the OS default instead of halting.
   *   3. If the visitor previously pinned 'light' or 'dark', return that choice;
   *      otherwise, fall back to getSystemScheme() so the site follows the OS.
   */
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

  /*
   * STEP 6: Synchronizing Window Chrome for Holiday Mode ('syncQuantumHolidayChrome')
   * --------------------------------------------------------------------------
   * Updates three pieces of nostalgic desktop UI whenever Holiday Mode turns
   * on or off:
   *   1. Window Title Bar (#win-titlebar-caption):
   *      Reads the page's clean title from the custom HTML attribute
   *      'data-base-title' via .getAttribute() (falling back to 'RaggieSoft
   *      StoreTrainer' via '||'), then appends either the festive "[Quantum OS
   *      98 — Holiday Desktop]" suffix or "[Windows 2000 Professional SP4]".
   *      SECURITY NOTE: We assign to '.textContent' (plain text), NEVER
   *      '.innerHTML', so characters like '&' or '<' are never parsed as HTML.
   *   2. Start Button Icon (#win98-start-icon):
   *      Swaps the decorative icon between a holiday tree and a classic window.
   *   3. Taskbar Tray Indicator (#win98-holiday-tray):
   *      Sets the standard DOM boolean '.hidden' property ('hidden = !holiday'),
   *      which adds or removes the HTML 'hidden' attribute so both visual
   *      browsers and assistive screen readers hide the badge outside holidays.
   */
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

  /*
   * STEP 7: Applying the Theme Attribute & Updating the Button Label ('updateLabel')
   * --------------------------------------------------------------------------
   * This function bridges JavaScript state and CSS styling:
   *   - 'document.documentElement.setAttribute("data-theme", current)' sets
   *     either data-theme="light" or data-theme="dark" on the root <html> tag.
   *     In win98-netscape.css, selectors like [data-theme="light"] and
   *     [data-theme="dark"] immediately swap every CSS custom property
   *     (--win-desktop, --win-chrome-bg, --doc-bg, bevel colors, etc.)!
   *   - Next, it calls syncQuantumHolidayChrome() and updates the visible text
   *     inside #theme-toggle-label so the user always sees:
   *       (a) Which theme is currently active (Win98 Classic vs. Win2000 Dark,
   *           or Holiday Pine vs. Holiday Dark), AND
   *       (b) Whether it is "(Pinned)" manually in localStorage or following
   *           "System (...)" automatically.
   */
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

  /*
   * STEP 8: Live Windows 98 Taskbar System Tray Clock ('updateTaskbarClock')
   * --------------------------------------------------------------------------
   *   - 'new Date()' captures the current instant from the user's device clock.
   *   - '.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })' uses
   *     the browser's built-in Internationalization API: passing an empty array
   *     '[]' tells the browser to respect the visitor's own regional locale
   *     (12-hour "10:42 PM" vs. 24-hour "22:42") without showing seconds.
   */
  function updateTaskbarClock() {
    if (!clockEl) return;
    try {
      var now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) {}
  }

  /*
   * STEP 9: Initial Startup Synchronization & Periodic Timer
   * --------------------------------------------------------------------------
   *   - Run updateLabel() and updateTaskbarClock() immediately so the toolbar
   *     button and bottom-right tray clock reflect live state on page load
   *     instead of waiting for the first timer tick.
   *   - 'setInterval(updateTaskbarClock, 30000)' schedules updateTaskbarClock
   *     to run every 30,000 milliseconds (30 seconds)—frequent enough that the
   *     minute counter stays accurate while using virtually zero CPU/battery.
   */
  updateLabel();
  updateTaskbarClock();
  setInterval(updateTaskbarClock, 30000);

  /*
   * STEP 10: Cross-Script & Window Lifecycle Event Listeners
   * --------------------------------------------------------------------------
   *   - 'raggiesoft:holidaychange' is a CustomEvent dispatched on 'window' by
   *     the shared raggiesoft-network.js script if Holiday Mode changes state.
   *   - 'load' fires once all stylesheets and deferred scripts have finished
   *     loading, guaranteeing a final check in case raggiesoft-network.js
   *     mutated <html class="rs-holiday-season"> right after our initial run.
   */
  window.addEventListener('raggiesoft:holidaychange', updateLabel);
  window.addEventListener('load', updateLabel);

  /*
   * STEP 11: Accessible Two-State Theme Toggle Handler ('click' Event)
   * --------------------------------------------------------------------------
   * Keyboard & Assistive Technology Accessibility Note:
   *   In HTML, '#theme-toggle' is a native <button type="button"> element with
   *   an explicit aria-label. Because it is a real <button> (not a <div> or
   *   <span>), browsers give us full WCAG 2.1 AA keyboard accessibility for
   *   free: pressing Tab focuses the button, and pressing Enter OR Space
   *   automatically triggers this exact 'click' event listener!
   *
   * Smart "Auto-Unpin" Toggle Logic (Modern Web Guidance Pattern):
   *   1. Determine the currently displayed scheme ('light' or 'dark') and flip
   *      to the opposite scheme ('target').
   *   2. Compare 'target' against the operating system's own preference ('sys'):
   *      - If 'target === sys' (for example, your OS is in Dark Mode, you had
   *        temporarily pinned Light Mode, and now you click back to Dark Mode),
   *        we call localStorage.removeItem('color-scheme') and restore
   *        meta.content = 'light dark'. That "unpins" the manual override so
   *        your browser goes back to following automatic OS day/night changes!
   *      - If 'target !== sys' (you are choosing the opposite of your OS), we
   *        save localStorage.setItem('color-scheme', target) and set
   *        meta.content = target so both our CSS and native browser scrollbars
   *        lock onto your chosen theme across all StoreTrainer pages.
   *   3. Finally, call updateLabel() to apply data-theme="..." on <html> and
   *      refresh the button text immediately with zero page reload.
   */
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
`;
}

/*
 * ============================================================================
 * SECTION 5: Reusable HTML Document Shell (`renderNetscapeShell`)
 * ============================================================================
 */

/**
 * Wraps route-specific HTML content inside the shared Netscape Communicator 4.78
 * / Windows 2000 Professional SP4 application window shell.
 *
 * TEACHING NOTE — Object Parameter Destructuring (`{ title, description, ... }`):
 *   Instead of passing 5 positional arguments (`renderNetscapeShell(a, b, c, d, e)`)
 *   where callers have to remember argument order, this function accepts a
 *   single configuration object and **destructures** its named properties right
 *   in the parameter list! Notice `noindex = false`: if a caller omits `noindex`,
 *   JavaScript automatically defaults it to `false` (only `/404` passes `true`).
 *
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string} opts.canonicalPath
 * @param {boolean} [opts.noindex=false]
 * @param {string} opts.bodyHtml
 * @returns {string}
 */
function renderNetscapeShell({ title, description, canonicalPath, noindex = false, bodyHtml }) {
  // Enforce strict SEO & social-card length limits (`<= 60` chars for titles,
  // `<= 155` chars for descriptions) via `.slice(start, end)`, then HTML-escape
  // so `&` or quotes never corrupt `<meta content="...">` attributes.
  const safeTitle = escapeHtml(title.slice(0, 60));
  const safeDesc = escapeHtml(description.slice(0, 155));

  // Error pages (`/404`) must NOT declare a `<link rel="canonical">` and should
  // emit `<meta name="robots" content="noindex, follow" />` so search engines
  // follow outbound links back to the site without indexing the 404 error page.
  const isErrorPage = canonicalPath === '/404';
  const canonicalUrl = `https://storetrainer.raggiesoft.com${canonicalPath === '/' ? '' : canonicalPath}`;
  const robotsMetaHtml = noindex
    ? '\n    <meta name="robots" content="noindex, follow" />'
    : '';
  const canonicalLinkHtml = isErrorPage
    ? ''
    : `\n    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
  const ogImage = 'https://assets.raggiesoft.com/raggiesoft-corporate/images/og/raggiesoft-corporate-og.jpg';

  // Primary Netscape toolbar navigation routes.
  const navItems = [
    { href: '/', label: '🏠 Home & Download' },
    { href: '/source', label: '💾 VB6 & .NET Source' },
    { href: '/installer', label: '📦 NSIS Wizard95 Installer' }
  ];

  // Transform the `navItems` array into HTML `<li>` items using `.map(...)` + `.join(...)`.
  // When `item.href === canonicalPath`, we add `aria-current="page"`:
  //   1. Accessibility: Screen readers announce "current page" to blind/low-vision users.
  //   2. Visual UI: `win98-netscape.css` styles `.win-btn[aria-current="page"]` with
  //      inverted 3D bevels so the active page button looks physically pressed down!
  const navHtml = navItems
    .map((item) => {
      const isCurrent = item.href === canonicalPath;
      return `<li><a href="${item.href}" class="win-btn"${isCurrent ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a></li>`;
    })
    .join('\n            ');

  /*
   * READ-ALONG GUIDE TO THE HTML DOCUMENT TEMPLATE BELOW:
   *   1. Synchronous FOUC-Prevention Script in `<head>`:
   *      Before the browser paints `<body>`, a tiny inline `<script>` checks
   *      `localStorage.getItem('color-scheme')` and `matchMedia` to set
   *      `data-theme="light|dark"` on `<html>` immediately. That prevents a
   *       jarring white flash ("Flash of Unstyled Content" / FOUC) when loading
   *      a page in Dark Mode!
   *   2. OpenGraph (`og:*`), Twitter Cards, & Schema.org JSON-LD (`@graph`):
   *      Provides rich link previews on chat/social platforms and machine-readable
   *      `SoftwareApplication` / `WebSite` / `WebPage` structured data serialized
   *      safely via `JSON.stringify(...)`.
   *   3. Accessibility Landmarks & Keyboard Navigation:
   *      - `<a href="#content" class="skip-link">` lets keyboard users press
   *        `Tab` + `Enter` to jump straight to `<main id="content">`.
   *      - `<main id="content" ... tabindex="-1">`: Setting `tabindex="-1"`
   *        allows the `#content` anchor jump to move keyboard focus directly
   *        onto `<main>` without placing `<main>` into normal `Tab` stops.
   *      - Decorative Win32 window chrome (`🖳`, `[_] [□] [×]`, Netscape `N`
   *        throbber) uses `aria-hidden="true"` so screen readers skip visual
   *        noise and read meaningful headings and links cleanly.
   *   4. Deferred Scripts (`defer` at bottom of `<body>`):
   *      `defer` downloads `netscape-ui.js` and `raggiesoft-network.js` in
   *      parallel without blocking HTML rendering, executing them in order once
   *      the DOM is ready.
   */
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
    <meta name="description" content="${safeDesc}" />${robotsMetaHtml}${canonicalLinkHtml}
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
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          '@id': 'https://storetrainer.raggiesoft.com/#software',
          name: 'RaggieSoft StoreTrainer',
          alternateName: 'TStore.exe',
          url: 'https://storetrainer.raggiesoft.com',
          downloadUrl: 'https://assets.raggiesoft.com/storetrainer/tssetup100.exe',
          softwareVersion: '1.0',
          applicationCategory: 'UtilitiesApplication, GameApplication',
          operatingSystem: 'Windows',
          license: 'https://opensource.org/licenses/MIT',
          author: {
            '@type': 'Person',
            '@id': 'https://michaelpragsdale.com/#michael-ragsdale',
            name: 'Michael P. Ragsdale',
            url: 'https://michaelpragsdale.com'
          },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD'
          }
        },
        {
          '@type': 'WebSite',
          '@id': 'https://storetrainer.raggiesoft.com/#website',
          url: 'https://storetrainer.raggiesoft.com',
          name: 'RaggieSoft StoreTrainer Portal'
        },
        {
          '@type': 'WebPage',
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: title,
          description: description,
          isPartOf: { '@id': 'https://storetrainer.raggiesoft.com/#website' },
          about: { '@id': 'https://storetrainer.raggiesoft.com/#software' }
        }
      ]
    })}</script>
    <link rel="icon" type="image/png" href="https://assets.raggiesoft.com/raggiesoft-corporate/images/logos/raggiesoft-logo.png" />
    <link rel="stylesheet" href="https://assets.raggiesoft.com/storetrainer/css/win98-netscape.css?v=20261115h" />
    <link rel="stylesheet" href="https://assets.raggiesoft.com/common/css/raggiesoft-network.css?v=20261120b" />
    <!-- Google Analytics 4 (GA4) Telemetry Integration (G-P9RG9JVYB6) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-P9RG9JVYB6"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-P9RG9JVYB6');
    </script>
  </head>
  <body>
    <a href="#content" class="skip-link">Skip to main document content</a>

    <nav class="rs-network-bar" aria-label="RaggieSoft Ecosystem Network">
      <div class="rs-network-bar-inner">
        <span class="rs-network-label">✦ RaggieSoft Network:</span>
        <ul class="rs-network-links">
          <li><a href="https://raggiesoft.com">🌐 Hub</a></li>
          <li><a href="https://nebulae.raggiesoft.com">🌌 Nebulae</a></li>
          <li><a href="https://music.raggiesoft.com">🎧 Music</a></li>
          <li><a href="https://books.raggiesoft.com">📚 Books</a></li>
          <li><a href="https://stardust.raggiesoft.com">🚀 Stardust</a></li>
          <li><a href="https://engineroom.raggiesoft.com">⚙️ Engine Room</a></li>
          <li><a href="https://corporate.raggiesoft.com">🏢 Corporate</a></li>
          <li><a href="https://storetrainer.raggiesoft.com" aria-current="page" class="is-active">💾 StoreTrainer</a></li>
          <li><a href="https://michaelpragsdale.com">👔 Portfolio &amp; Resume</a></li>
        </ul>
      </div>
    </nav>

    <div class="win98-desktop-workspace">
      <div class="netscape-window win-outset" role="region" aria-label="Netscape Communicator 4.78 — RaggieSoft StoreTrainer Portal">
        <!-- Win2000 / Quantum OS 98 Title Bar -->
        <header class="win-titlebar" role="banner">
          <div class="win-titlebar-left">
            <span aria-hidden="true">🖳</span>
            <span id="win-titlebar-caption" class="win-titlebar-text" data-base-title="${safeTitle}">${safeTitle} - Netscape Communicator 4.78 [Windows 2000 Professional SP4]</span>
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
            <li class="menu-item-crosssite"><a href="https://raggiesoft.com"><u>H</u>ub</a></li>
            <li class="menu-item-crosssite"><a href="https://music.raggiesoft.com"><u>M</u>usic</a></li>
            <li class="menu-item-crosssite"><a href="https://books.raggiesoft.com"><u>B</u>ooks</a></li>
            <li class="menu-item-crosssite"><a href="https://stardust.raggiesoft.com"><u>S</u>tardust</a></li>
            <li class="menu-item-crosssite"><a href="https://engineroom.raggiesoft.com"><u>L</u>abel</a></li>
            <li class="menu-item-crosssite"><a href="https://corporate.raggiesoft.com/projects/storetrainer"><u>C</u>orporate</a></li>
            <li class="menu-item-crosssite"><a href="https://michaelpragsdale.com"><u>A</u>rchitect</a></li>
            <li class="menu-item-crosssite"><a href="https://nebulae.raggiesoft.com"><u>N</u>ebulae Sitemap</a></li>
          </ul>
          <span class="netscape-era-note">Pre-AI Hand-Written Desktop Freeware (2018–2020)</span>
        </div>

        <!-- Navigation Toolbar -->
        <nav class="netscape-toolbar" aria-label="Primary StoreTrainer Navigation">
          <ul class="netscape-nav-list">
            ${navHtml}
            <li>
              <button
                type="button"
                id="theme-toggle"
                class="win-btn"
                aria-label="Toggle between classic light desktop theme and dark desktop theme"
              >
                <span id="theme-toggle-label">🖥️ Theme</span>
              </button>
            </li>
            <li class="nav-item-primary-download">
              <a href="https://assets.raggiesoft.com/storetrainer/tssetup100.exe" class="win-btn win-btn-primary">
                ⬇️ Download tssetup100.exe (v1.0)
              </a>
            </li>
          </ul>
          <div class="netscape-throbber" aria-hidden="true" title="Netscape Communicator">N</div>
        </nav>

        <!-- Location / Address Bar -->
        <div class="netscape-locationbar">
          <strong>Netsite:</strong>
          <div class="location-input win-inset" aria-label="Current URL">${escapeHtml(canonicalUrl)}</div>
          <a href="https://raggiesoft.com" class="win-btn location-hub-btn">🌐 RaggieSoft Hub</a>
        </div>

        <!-- Sunken Document Viewport -->
        <main id="content" class="netscape-viewport win-inset" tabindex="-1">
          <div class="quantum-holiday-callout" role="note" aria-label="Quantum OS 98 Holiday Desktop Theme">
            <span><strong>🎄 Quantum OS 98 — Holiday Desktop Pack:</strong> Evergreen Pine &amp; Holly Crimson desktop colors are active for the holiday season.</span>
            <span>Happy Holidays from RaggieSoft!</span>
          </div>
          ${bodyHtml}
        </main>

        <!-- Netscape Status Bar & Global Legal Footer -->
        <footer class="netscape-statusbar" role="contentinfo">
          <div class="status-cell">🔒 Secure Connection • Document: Done</div>
          <div class="status-cell">
            Code: <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">MIT License</a> |
            Docs: <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
          </div>
        </footer>
      </div>

      <!-- Global Fictitious Disclaimer & Network Links Outside Window Frame -->
      <div class="netscape-window win-outset netscape-footer-card">
        <p style="margin: 0 0 0.5rem;">
          <strong>RaggieSoft Ecosystem Links:</strong>
          <a href="https://raggiesoft.com">RaggieSoft Hub</a> •
          <a href="https://corporate.raggiesoft.com">RaggieSoft Media</a> •
          <a href="https://michaelpragsdale.com">Michael P. Ragsdale Portfolio</a> •
          <a href="https://music.raggiesoft.com">The Listening Room</a> •
          <a href="https://books.raggiesoft.com">RaggieSoft Book Reader</a> •
          <a href="https://backstage.raggiesoft.com">RaggieSoft Backstage</a> •
          <a href="https://lore.raggiesoft.com">Lore Omnibus</a> •
          <a href="https://engineroom.raggiesoft.com">Engine Room Records</a> •
          <a href="https://stardust.raggiesoft.com">The Stardust Engine</a> •
          <a href="https://nebulae.raggiesoft.com">The RaggieSoft Nebulae</a>
        </p>
        <p style="margin: 0;">
          <strong>Fictitious Persons &amp; Entities Disclaimer:</strong> While <strong>RaggieSoft StoreTrainer</strong> is a real-world desktop utility authored by <strong>Michael P. Ragsdale</strong>, all narrative characters, bands, biographies, universities (including Commonwealth Polytechnic Institute / CPI, The Forgers, and The Crucible), corporations (including OmniCorp, Apex Records, Prairie Coachworks, and Sainte-Claire), transit agencies (Blue Ridge Transit and Coastal Virginia Transit Authority), in-universe legal filings, and any entity with <strong>&ldquo;LLC&rdquo;</strong>, <strong>&ldquo;Trust&rdquo;</strong>, or <strong>&ldquo;Holdings&rdquo;</strong> in its name across the wider RaggieSoft network are works of fiction. Any resemblance to actual persons (living or dead), businesses, institutions, or events is purely coincidental.
        </p>
      </div>
    </div>

    <!-- Classic Desktop Taskbar (Transforms into Quantum OS 98 Holiday Taskbar during Holiday Mode) -->
    <div class="win98-taskbar win-outset" role="region" aria-label="Classic Desktop Taskbar">
      <div class="win98-taskbar-left">
        <a href="/" class="win-btn win98-start-btn">
          <span id="win98-start-icon" aria-hidden="true">🪟</span>
          <span>Start</span>
        </a>
        <span class="win98-task-tab win-inset">
          <span aria-hidden="true">💾</span>
          <span>RaggieSoft StoreTrainer v1.0</span>
        </span>
      </div>
      <div class="win98-systray win-inset" aria-label="Desktop Status Tray">
        <span id="win98-holiday-tray" hidden><span aria-hidden="true">🎄</span> <span class="win98-holiday-tray-label">Holiday Desktop</span></span>
        <span id="win98-clock">12:00 PM</span>
      </div>
    </div>

    <script src="https://assets.raggiesoft.com/storetrainer/js/netscape-ui.js?v=20261115h" defer></script>
    <script src="https://assets.raggiesoft.com/common/js/raggiesoft-network.js?v=20261120b" defer></script>
  </body>
</html>`;
}

/*
 * ============================================================================
 * SECTION 6: Individual Route Page Renderers (`/`, `/source`, `/installer`)
 * ============================================================================
 */

/**
 * Compiles `/index.html` — The main StoreTrainer portal, `tssetup100.exe`
 * download CTA, `.sfile` game-profile specification, and Supported PC Systems
 * compatibility matrix.
 *
 * TEACHING NOTE — Inline CSS Custom Properties for Responsive Tables:
 *   Look closely at `<div class="table-wrapper" style="--label-2: 'Supported Releases'; --label-3: 'Notes';">`
 *   inside `bodyHtml` below! That passes custom column labels directly to
 *   `win98-netscape.css`, which uses CSS `@container (width < 600px)` to
 *   reflow table rows into stacked mobile Win32 cards with bold inline prefixes
 *   (`Supported Releases: ...`, `Notes: ...`)—all with zero JavaScript!
 *
 * @param {Array<{id: string, title: string, category: string, path: string, description: string, code: string}>} sourceFiles
 * @returns {string}
 */
function renderHomePage(sourceFiles) {
  const bodyHtml = `
    <div class="retro-banner">
      <h1>RaggieSoft StoreTrainer v1.0 (Retro PC Game &amp; Trainer Manager)</h1>
      <p style="margin: 0 0 0.85rem; font-size: 1.02rem;">
        <strong>RaggieSoft StoreTrainer (<code>TStore.exe</code>)</strong> is a <strong>100% hand-written (pre-AI, 2018–2020)</strong> desktop utility authored by <strong>Michael P. Ragsdale</strong> in <strong>Visual Basic 6.0 (<code>TStore.vbp</code>)</strong> inside a <strong>Windows 2000 Professional SP4 virtual machine</strong>. It indexes, stores, and launches classic and modern PC games alongside their associated <strong>game trainers (cheat utilities)</strong> and custom launch options across classic and modern PCs.
      </p>
      <div class="hero-cta-row">
        <a href="https://assets.raggiesoft.com/storetrainer/tssetup100.exe" class="win-btn win-btn-primary">
          💾 Download Official Installer: tssetup100.exe
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
          Many classic 1990s and 2000s PC games require either specific launch switches (such as resolution overrides, windowed mode, or mod directory flags) or companion <strong>game trainers</strong> that must be launched in the proper working directory before or alongside the game.
        </p>
        <p style="margin-bottom: 0;">
          Built inside a <strong>Windows 2000 Professional SP4</strong> environment without heavy third-party dependencies, StoreTrainer runs just as cleanly on a classic 1990s retro gaming PC as it does on a modern desktop.
        </p>
      </section>

      <section class="retro-dialog-card" aria-labelledby="sfile-spec-heading">
        <h2 id="sfile-spec-heading" style="margin-top: 0;">Saved Game Profile (<code>.sfile</code>) Format</h2>
        <p>
          StoreTrainer saves each game profile as a simple, human-readable 6-line text file (<code>&lt;GameName&gt;.sfile</code>) alongside <code>StoreTrainer.cfg</code>:
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
      <h2 id="os-matrix-heading">Supported PC Systems</h2>
      <div class="table-wrapper" style="--label-2: 'Supported Releases'; --label-3: 'Notes';">
        <table class="retro-table">
          <thead>
            <tr>
              <th scope="col">System Era</th>
              <th scope="col">Supported Releases</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Classic 1990s PCs</strong></td>
              <td>Windows 95, Windows 98, Windows 98 SE, Windows ME</td>
              <td>Includes the Visual Basic 6.0 runtime library if not already installed.</td>
            </tr>
            <tr>
              <td><strong>Classic 2000s PCs</strong></td>
              <td>Windows NT 4.0, Windows 2000 Professional SP4, Windows XP</td>
              <td><strong>Original Design Era:</strong> Created and tested inside Windows 2000 Professional SP4.</td>
            </tr>
            <tr>
              <td><strong>Modern PCs</strong></td>
              <td>Windows Vista, Windows 7, Windows 8.1, Windows 10, and newer</td>
              <td>Works out of the box with both the classic edition and the included <code>TStore.NET</code> edition.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  // Wrap the home page body inside the Netscape Communicator 4.78 window frame.
  return renderNetscapeShell({
    title: 'RaggieSoft StoreTrainer | PC Game & Trainer Manager',
    description: 'Official portal for RaggieSoft StoreTrainer (TStore.exe)—a hand-written utility to store and launch PC games and game trainers on classic and modern PCs.',
    canonicalPath: '/',
    bodyHtml
  });
}

/**
 * Compiles `/source/index.html` — The interactive Visual Basic 6.0 (`TStore.vbp`),
 * Win32 API module, documentation, and VB.NET (`TStore.NET`) source code museum.
 *
 * TEACHING NOTE — Functional Array Pipeline (`.filter` -> `.map` -> `.join`):
 *   1. `sourceFiles.filter((f) => f.category !== 'NSIS Installer')` creates a
 *      new array keeping ONLY application code and docs (16 of the 18 files),
 *      leaving `sourceFiles` itself unmutated.
 *   2. `tocHtml` maps each file into an in-page jump link (`<a href="#tstore-vbp">`)
 *      that scrolls directly to `<section id="tstore-vbp">` below.
 *   3. `filesHtml` renders each module inside an accessible `<section>` paired
 *      with its `<h2>` via `aria-labelledby="heading-..."`, and wraps the raw
 *      source code inside `<pre class="code-viewer"><code>${escapeHtml(f.code)}</code></pre>`.
 *      Because `escapeHtml(f.code)` converts every `<`, `>`, and `&` into HTML
 *      entities, `<pre>` preserves exact VB6 indentation and comments verbatim!
 *
 * @param {Array<{id: string, title: string, category: string, path: string, description: string, code: string}>} sourceFiles
 * @returns {string}
 */
function renderSourcePage(sourceFiles) {
  // Keep everything except NSIS installer scripts (which live on `/installer`).
  const vbFiles = sourceFiles.filter((f) => f.category !== 'NSIS Installer');

  // Build the bulleted Table of Contents index at the top of `/source`.
  const tocHtml = vbFiles
    .map(
      (f) =>
        `<li><a href="#${escapeHtml(f.id)}"><strong>${escapeHtml(f.path)}</strong></a> — ${escapeHtml(f.description)}</li>`
    )
    .join('\n          ');

  // Build one raised Win32 dialog card (`retro-dialog-card`) per source module.
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

/**
 * Compiles `/installer/index.html` — Showcasing the Nullsoft Scriptable Install
 * System (NSIS) Wizard95 scripts (`TSSetup.nsi` & `TSSetup-Patch.nsi`) and
 * Visual Basic 6.0 SP6 runtime DLL deployment logic.
 *
 * @param {Array<{id: string, title: string, category: string, path: string, description: string, code: string}>} sourceFiles
 * @returns {string}
 */
function renderInstallerPage(sourceFiles) {
  // Filter strictly to the two `'NSIS Installer'` scripts (`TSSetup.nsi` and `TSSetup-Patch.nsi`).
  const nsisFiles = sourceFiles.filter((f) => f.category === 'NSIS Installer');

  // Render each `.nsi` installer script safely escaped inside `<pre class="code-viewer"><code>`.
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

/*
 * ============================================================================
 * SECTION 7: Master Build Orchestrator & Local Preview Server
 * ============================================================================
 */

/**
 * Executes the complete static site build pipeline from start to finish:
 *   1. Loads the 18 VB6 / VB.NET / NSIS source files.
 *   2. Cleans `./dist` so deleted or renamed files from older builds never linger.
 *   3. Copies `src/styles/win98-netscape.css` and generated `netscape-ui.js` to
 *      both `./dist/assets/` AND the shared CDN repo (`raggiesoft-assets/storetrainer/`).
 *   4. Compiles `/index.html`, `/source/index.html`, `/installer/index.html`,
 *      and `/404.html`.
 *   5. Generates `/sitemap.xml`, `/robots.txt`, and the IndexNow verification file.
 */
function buildStoreTrainerSite() {
  // Step 1: Load source archive objects into memory.
  const sourceFiles = loadStoreTrainerSourceFiles();

  // Step 2: Wipe `./dist` cleanly (`force: true` ignores errors if `dist/` doesn't
  // exist yet, like `rm -rf dist`) and recreate a fresh empty `./dist` directory.
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  // Step 3A: Read the canonical stylesheet (`src/styles/win98-netscape.css`) and
  // generate the progressive-enhancement script (`netscape-ui.js`), emitting
  // local copies into `./dist/assets/`.
  const cssContent = fs.readFileSync(
    path.join(projectRoot, 'src', 'styles', 'win98-netscape.css'),
    'utf-8'
  );
  const clientJsContent = buildNetscapeClientJs();
  writeDistFile('assets/win98-netscape.css', cssContent);
  writeDistFile('assets/netscape-ui.js', clientJsContent);

  // Step 3B: Mirror those exact CSS and JS files into `raggiesoft-assets/storetrainer/`
  // (`https://assets.raggiesoft.com/storetrainer/...`) so the shared RaggieSoft CDN
  // never drifts out of sync with `subdomains/storetrainer`!
  const workspaceRoot = path.resolve(projectRoot, '..', '..', '..');
  const sharedCdnCssDir = path.join(workspaceRoot, 'raggiesoft-assets', 'storetrainer', 'css');
  const sharedCdnJsDir = path.join(workspaceRoot, 'raggiesoft-assets', 'storetrainer', 'js');
  fs.mkdirSync(sharedCdnCssDir, { recursive: true });
  fs.mkdirSync(sharedCdnJsDir, { recursive: true });
  fs.writeFileSync(path.join(sharedCdnCssDir, 'win98-netscape.css'), cssContent, 'utf-8');
  fs.writeFileSync(path.join(sharedCdnJsDir, 'netscape-ui.js'), clientJsContent, 'utf-8');

  // Step 4: Compile and write all static HTML pages (notice `/source` and
  // `/installer` write `index.html` inside subdirectories so clean extensionless
  // URLs like `https://storetrainer.raggiesoft.com/source` work natively on Nginx!).
  writeDistFile('index.html', renderHomePage(sourceFiles));
  writeDistFile('source/index.html', renderSourcePage(sourceFiles));
  writeDistFile('installer/index.html', renderInstallerPage(sourceFiles));
  writeDistFile(
    '404.html',
    renderNetscapeShell({
      title: 'Page Not Found | RaggieSoft StoreTrainer',
      description: 'The requested RaggieSoft StoreTrainer page could not be found.',
      canonicalPath: '/404',
      noindex: true,
      bodyHtml: `
        <div class="retro-banner">
          <h1>Page Not Found — RaggieSoft StoreTrainer</h1>
          <p style="margin: 0 0 0.85rem;">
            The StoreTrainer page or source file link you requested could not be found. Choose one of the sections below to continue browsing or download StoreTrainer v1.0.
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 0.65rem;">
            <a href="/" class="win-btn win-btn-primary">🏠 StoreTrainer Home &amp; Download</a>
            <a href="/source" class="win-btn">💾 VB6 &amp; .NET Source Code</a>
            <a href="/installer" class="win-btn">📦 NSIS Wizard95 Installer</a>
          </div>
        </div>`
    })
  );

  // Step 5: Build search-engine discovery files (`sitemap.xml`, `robots.txt`,
  // and Bing/IndexNow domain key).
  // `new Date().toISOString()` returns `'2026-11-20T05:33:11.000Z'`; `.split('T')[0]`
  // slices off just the `'YYYY-MM-DD'` calendar date expected by XML sitemaps.
  const todayIso = new Date().toISOString().split('T')[0];
  const canonicalRoutes = ['/', '/installer', '/source'];
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${canonicalRoutes
    .map((route) => {
      const loc = `https://storetrainer.raggiesoft.com${route === '/' ? '/' : route}`;
      return `  <url>\n    <loc>${escapeHtml(loc)}</loc>\n    <lastmod>${todayIso}</lastmod>\n  </url>`;
    })
    .join('\n')}\n</urlset>\n`;
  writeDistFile('sitemap.xml', sitemapXml);
  writeDistFile(
    'robots.txt',
    `User-agent: *\nAllow: /\n\nSitemap: https://storetrainer.raggiesoft.com/sitemap.xml\n`
  );
  writeDistFile('726167676965736f6674696e6465786e.txt', '726167676965736f6674696e6465786e\n');

  console.log(
    `✅ Built storetrainer.raggiesoft.com static bundle in ${distDir} (3 routes + sitemap/404 + ${sourceFiles.length} VB6/.NET/NSIS source files indexed).`
  );
}

// Run the static build immediately whenever `node scripts/build.mjs` executes.
buildStoreTrainerSite();

/*
 * Optional Local Preview HTTP Server (`npm run dev` -> `node scripts/build.mjs --serve`):
 *   - `process.argv` is an array of command-line strings (e.g., `['node', 'scripts/build.mjs', '--serve']`).
 *   - If `--serve` was passed, we spin up a lightweight zero-dependency HTTP server
 *     on `process.env.PORT` (defaulting to port `4323`) using `http.createServer(...)`.
 *   - For each incoming browser request (`req`), we strip any `?query` cache-buster,
 *     map directory URLs like `/source` to `dist/source/index.html`, set the matching
 *     `Content-Type` MIME header (`.css`, `.js`, or `.html`), and stream the built
 *     file back to the browser (`res.end(...)`).
 */
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

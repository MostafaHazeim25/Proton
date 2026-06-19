# Building Proton on a fresh Windows machine

This guide takes you from a clean Windows PC to a finished `Proton Setup.exe`
installer and a `Proton Portable.exe`. No previous setup is assumed.

---

## 1. Install Node.js (one time)

1. Go to **https://nodejs.org** and download the **LTS** installer (Windows .msi, 64‑bit).
2. Run it and click through with the defaults. (Leaving "Add to PATH" checked is enough —
   you do **not** need the optional "native build tools" checkbox, because Proton's
   SQLite engine ships ready‑made binaries for Windows.)
3. Open a new **Command Prompt** (or PowerShell) and confirm it works:

   ```bat
   node -v
   npm -v
   ```

   Both should print version numbers.

---

## 2. Get the project

Unzip the delivered `proton.zip` somewhere simple, e.g. `C:\proton`.
Then open a Command Prompt **inside that folder**:

```bat
cd C:\proton
```

(You should see `package.json` when you type `dir`.)

---

## 3. Install dependencies

```bat
npm install
```

What this does:

- Downloads Electron and electron‑builder.
- Downloads **better‑sqlite3**, which automatically fetches the correct **prebuilt
  Windows binary** — so there is nothing to compile.
- The `postinstall` step (`electron-builder install-app-deps`) rebuilds the SQLite
  binary against the exact Electron version, so the database works inside the app.

This step needs internet **once**. After it finishes, the app itself runs 100% offline.

> If `npm install` is ever interrupted, just run it again.

---

## 4. (Optional) Run it first to check

```bat
npm start
```

Proton opens. On first launch it creates `%APPDATA%\Proton\` with an example
"Network Security Engineer" path so the app isn't empty. Close the window when done.

---

## 5. Build the Windows app

```bat
npm run dist
```

This produces both targets. When it finishes, look in the new **`dist\`** folder:

| File | What it is |
|------|------------|
| `dist\Proton Setup.exe` | One‑click installer (Start‑menu + desktop shortcut) |
| `dist\Proton Portable.exe` | Single portable executable, no install needed |

You can also build just one:

```bat
npm run dist:installer   :: only Proton Setup.exe
npm run dist:portable    :: only Proton Portable.exe
```

---

## 6. Install / share

- **To use it yourself:** double‑click `Proton Setup.exe` and follow the wizard, or
  just run `Proton Portable.exe` directly.
- **To share it:** send someone the single `Proton Setup.exe` (or the portable one).
  They do **not** need Node.js or anything else installed — it's a self‑contained app.

---

## Troubleshooting

- **"node is not recognized"** → close and reopen the Command Prompt after installing
  Node (so it picks up the PATH), or reinstall Node with "Add to PATH" checked.
- **`npm install` fails on better‑sqlite3** → make sure you have internet for this step,
  then run `npm install` again. If it still fails, run:
  ```bat
  npm install --build-from-source
  ```
  (This needs the "Desktop development with C++" workload from Visual Studio Build
  Tools, but is normally unnecessary because of the prebuilt binary.)
- **Antivirus flags the unsigned .exe** → the build is unsigned (no code‑signing
  certificate). This is expected for a self‑built app; choose "keep / run anyway", or
  add a code‑signing certificate later if you distribute it widely.
- **Where is my data?** → `%APPDATA%\Proton\` (paste that into the Explorer address bar).

---

## Project layout (for reference)

```
proton/
├─ package.json            electron-builder config + scripts
├─ build/                  app icon (icon.ico / icon.png)
└─ src/
   ├─ main/                main process: window, SQLite, files, backups, IPC
   ├─ preload/             secure bridge (window.proton.*)
   └─ renderer/            the UI (HTML/CSS/JS), fonts, and the notes system
```

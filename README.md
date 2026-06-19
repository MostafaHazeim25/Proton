# Proton — Offline Learning Tracker

**Proton** is a professional, fully‑offline Windows desktop app for tracking learning
paths, courses, tasks, and a rich knowledge base of notes. It is built with
**Electron + SQLite** — no internet, no cloud, no accounts. Everything lives on your
own machine.

> Publisher: **Mostafa Hazem** · Version **1.0.0**

---

## What it does

- **Dashboard** — overall progress across every learning path at a glance.
- **Paths** — each path holds courses; each course holds parts (sections) and tasks.
- **Board** — a Trello‑style To Do / In Progress / Done board; drag cards to change status.
- **Today** — pin tasks to focus on today and keep a daily streak.
- **Notes (knowledge system)** — a Notion/Obsidian/XMind‑style workspace:
  - Each note is a full page bound to a Path → Course → Part.
  - A block editor: headings, bold/italic/underline, bullet/numbered/checklists,
    quotes, code blocks, callouts, tables, internal note links, and
    drag‑/paste‑/resizable images and file attachments.
  - A **knowledge tree** on the left to browse and create notes.
  - An interactive **mind map** of each course (expand/collapse, open, add, and
    drag a note onto another part to move it; pan & zoom).
  - Global search across titles **and** note bodies — opens the note directly.

## Your data is safe

- **SQLite** database with safe transactions and WAL journaling.
- **Auto‑save** — there is no save button; every change is written instantly.
- **Automatic daily backup** (keeps the latest 30) plus manual **Export / Import**.
- **Corruption recovery** — a damaged database is detected on launch, set aside, and
  replaced with a fresh one so the app always opens.
- A safety snapshot is taken automatically before any backup import.

## Where your data lives

```
%APPDATA%\Proton\
├─ pathboard.db        ← your database
├─ settings.json       ← window size/position + preferences
├─ backups\            ← automatic + manual backups (latest 30 kept)
└─ notes\<noteId>\     ← images and attachments for each note
```

Uninstalling does **not** delete this folder, so your data survives reinstalls.

---

## Building / running it

See **BUILD.md** for full step‑by‑step instructions on a fresh Windows machine.
Quick version:

```bat
npm install
npm run dist
```

The installer and portable build appear in the `dist\` folder:

- `dist\Proton Setup.exe` — one‑click installer
- `dist\Proton Portable.exe` — portable (no install)

To just run it in development:

```bat
npm install
npm start
```

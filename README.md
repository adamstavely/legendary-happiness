# Unlocked – Access Management prototype

A low-fidelity, clickable prototype of a user-centered access management system, built for user testing. It's intentionally grayscale and square-cornered, so testers react to the flow and not the polish.

**Live prototype:** https://comstocktylerj12.github.io/unlocked/ (once GitHub Pages is on, see below)

## What's in it

One working app with a role switch in the avatar menu (top right):

| Role | Persona | Try |
|---|---|---|
| Requestor | Maya Chen, UI Developer, Denver | My access (current, trainings, history), Find & request access (multi-select, ongoing or temporary, per-access justification), My requests |
| Approver | Daniel Ortiz, Engineering Manager, Columbus | Approvals with AI confidence and bulk actions, escalation, requesting on someone's behalf, the "Who has it" heat map |
| Admin | Priya Natarajan, Engineering Manager, Arlington | My team: members, slots (stepper to create, fill, clone, handovers with gap alerts), access policies, settings |

Test data: 15 offices, 51 people, 30 accesses across 9 types, 22 slots, 5 trainings with yearly or two-yearly retakes, and seeded requests. Everything resets when you reload.

## Repo layout

```
index.html               Standalone prototype (generated; this is what GitHub Pages serves)
runtime/dc-runtime.js    Small dependency-free renderer for the canvas format
design/project/          Source, in Claude Design canvas format
  Main.dc.html           The whole prototype: markup, styles and logic
  canvas.json            Canvas index
scripts/build.mjs        Regenerates index.html from design/project/Main.dc.html
```

## Run locally

Open `index.html` in a browser. No install or server needed.

## Update after design changes

1. Replace `design/project/Main.dc.html` with the latest version from the canvas.
2. Run `node scripts/build.mjs` (Node 18+).
3. Commit both files.

## Turn on GitHub Pages

Settings → Pages → Build and deployment → Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → Save. The site appears at the URL above within a minute or two.

# Design decisions

The principles Ricochet is built on, and the decisions taken while extracting it from SweetHome. New code follows
them; changing one of them is a decision of its own, recorded here with its date and its reason.

## Principles

### 1. Everything is an event

A component communicates with the application and with its environment through events only: it receives events,
does its own work (including changes to the DOM nodes it owns), and emits events. It never calls another component
and never knows who listens. Sources of events: mouse, keyboard, window, attributes, configuration items, data
records (local or remote), the event bus, the frame loop, microtasks and scheduled tasks. *(2026-10-16)*

### 2. Three moments for one event

An event is emitted **now** (synchronous call of the listeners), **in the spare time of the current frame** (a
microtask, run within a time budget) or **later** (a scheduled task, in game time or real time). The listener does
not know which moment was used. Handlers stay short and defer long work themselves. *(2026-10-16)*

- Microtasks and scheduled tasks carry an event name and a payload, never a function reference.
- The priority and the cost of a microtask are declared once, in a table, by the module that does the work.
- Microtasks and scheduled tasks created by a component are cancelled when it is detached, like its subscriptions.
- Tasks due at the same time run in the order they were created.

### 3. One synchronous bus

All events go through one synchronous bus (a map from event name to listeners). DOM events (mouse, keyboard,
attributes, window) stay at the edges, as inputs. The former bus, built on `CustomEvent` and a hidden element, is
replaced: `dispatchEvent` was already synchronous, so behaviour does not change. Emitting an event allocates nothing.
*(2026-10-16)*

### 4. Reactions, not renders

No virtual DOM, no re-rendering: a component keeps references to its nodes and writes only what changed. *(origin)*

### 5. A frame loop that runs only when needed

The frame loop runs four phases: clock and scheduled tasks, `update` (application), `render` (application),
microtasks with the remaining budget. It runs while a game holds it, or until the microtask and scheduled-task queues
are empty; otherwise it sleeps. The budget is a fraction of the measured frame duration, not a fixed value, so that
120 Hz screens are handled. Office-style views and a real-time canvas can share the same page. *(2026-10-16)*

### 6. Zero dependencies, zero build

Plain ES modules, run as written. When a feature needs a library (HTML sanitizing, for instance), Ricochet defines
the hook and the application provides the library (`setSanitizer()`). *(2026-10-16)*

## Decisions

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-10-15 | Native Custom Elements in light DOM, no Shadow DOM, no customized built-ins (`is="…"`) | Global palettes and utility classes must keep working; Safari does not support `is="…"`. |
| 2026-10-15 | Element prefix `rc-` (formerly `mui-`) | `mui` evokes Material UI. |
| 2026-10-15 | Kernel written in English: code, comments, documentation | Ricochet is public; the application may stay in French. |
| 2026-10-16 | Relative imports inside the kernel; applications use the `ricochet/` prefix through an import map | The kernel must work wherever it is hosted. |
| 2026-10-16 | Applications copy Ricochet (submodule, copy, or pinned CDN), never load it from Ricochet's GitHub Pages site | Pages serves unreleased code and is not a CDN. |
| 2026-10-16 | Documentation generated from `/** … */` blocks by `tools/doc.mjs`, in restricted Markdown, at each commit | One source for VSCode tooltips, GitHub pages and the application. |
| 2026-10-16 | Stimuli documented in one *Interface* table; no automatic detection from the code for now | Readable at a glance; detection can come later. |
| 2026-10-16 | Restricted Markdown, converted in one pass, readable by any Markdown reader | No dependency; same files everywhere. |
| 2026-10-16 | Unit tests for kernel modules (Node, no dependency); application tests only for specific algorithms | The kernel is shared; the application changes fast. |
| 2026-10-16 | During migration, old names stay as facades marked `@deprecated`, then are removed | The application keeps running at every step. |
| 2026-10-16 | Target browsers: Safari first, Chrome and Edge; Firefox when possible | Safari is the main browser of the author. |
| 2026-10-16 | Sixty-Below stays independent from Ricochet | Its kernel inspires Ricochet's real-time part, without API compatibility. |

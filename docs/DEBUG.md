# Debugging an application

This guide lists what Ricochet offers to see what an application does: switches that show messages in the console,
logs of the last events, error counters, a leak detector. It explains how to turn each one on and off, and how an
application adds its own.

## 1. One global object: `$global`

Ricochet puts one thing on `window`: `$global`, the debugging state. Type `$global` in the console of the browser to
see it.

| Key | Content | Section |
| --- | --- | --- |
| `$global.debug` | the switches, `true` or `false` | 2 |
| `$global.logs` | the last 100 events, item changes, and a timeline mixing them | 3 |
| `$global.errors` | the number of errors since the page was loaded | 4 |
| `$global.memoryLeak` | counters of live components and subscriptions | 5 |

**`$global` is for debugging only.** No code may depend on it to work: the application would run the same with an
empty `$global`. The state of an application (its current route, its data) does not belong there: it lives in
configuration items, in the route of the router, or in the modules that own it. The other objects of the kernel (the
bus, the configuration store, the keyboard, the scheduler…) are exports of their modules, never properties of
`window`.

## 2. Switches

| Switch | When it is `true` |
| --- | --- |
| `lifecycle` | each attach and detach of a component is shown in the console: `LIFECYCLE - ATTACH NoteEditor to note-editor` |
| `eventbus` | each event emitted on the bus is shown, with its payload: `EVENT - noteSave {…}` |
| `deprecated` | the first use of a deprecated method is shown, once per class |
| `tasks` | a microtask whose event is not declared (`declareTasks()`), and a frame that takes longer than its budget, are shown |
| `strict` | an error of the application throws instead of being reported: a custom element that no module defines |

The messages are written with `console.warn`: the filter of the console shows them apart from the ordinary logs.

**In the console**, a switch changes at once:

```javascript
$global.debug.eventbus = true
```

**At startup**, an application sets its switches before loading Ricochet, in a script of its page; the kernel only
adds the switches that are missing:

```html
<script>
  window.$global = {debug: {lifecycle: true, deprecated: true}}
</script>
<script type="module" src="./app.mjs"></script>
```

Turn the switches off in production: `deprecated` and `strict` are meant for development.

## 3. Logs

| Log | Entries |
| --- | --- |
| `$global.logs.events` | `{event, time, detail}`: each event emitted on the bus, its payload as text |
| `$global.logs.items` | `{item, current, previous, time}`: each change of a configuration item |
| `$global.logs.timeline` | the entries of every log, in the order they came |

Each log keeps its last 100 entries, the newest first. They are always recorded, whatever the switches: when
something went wrong, the timeline tells what happened just before.

```javascript
console.table($global.logs.timeline.slice(0, 20))
```

Events that come too often to be useful in a log (a tick every second) are left out by adding their name to
`quietEvents`:

```javascript
import {quietEvents} from 'ricochet/ricochet.mjs'

quietEvents.add('clockTicked')
```

## 4. Errors

`$global.errors.error` counts the calls of `console.error` and the errors that nobody caught (`error` and
`unhandledrejection` events of the window); `$global.errors.assert` counts the failed `console.assert`. Ricochet
wraps `console.error` and `console.assert` to count them: it is the only change it makes to an object of the browser.

An application may show the count in its interface, so that an error never goes unnoticed, and set the counters back
to 0 when the user has seen them:

```javascript
const {error, assert} = $global.errors
badge.textContent = error + assert
$global.errors.error = 0
$global.errors.assert = 0
```

The kernel reports the mistakes of the application with `console.error` (an invalid `data-param`, an unknown option
source, a custom element not defined…): a counter above 0 always deserves a look at the console.

## 5. Leaks

A component subscribes to events, items, timers; the kernel releases all of it when the component is detached. The
counters of `$global.memoryLeak` follow these subscriptions: after a view is opened and closed, each counter must come
back to its level. A counter that grows each time is a leak.

| Counter | Live… |
| --- | --- |
| `attached` | components attached to the page |
| `eventHandlers` | subscriptions to events of the bus (`listen()`) |
| `windowEventHandlers` | subscriptions to events of the window (`observeWindowEvents()`) |
| `domEventHandlers` | subscriptions to events of DOM elements (`observeDom()`) |
| `configObserver` | observers of configuration items (`observeItems()`) |
| `setInterval` | repeated actions (`setInterval()`) |
| `animationframe` | animations in the frame loop (`setAnimationFrame()`) |
| `microtasks` | waiting microtasks that belong to a component |
| `scheduledTasks` | waiting scheduled tasks that belong to a component |

To look for a leak, take a snapshot, use the interface, and compare:

```javascript
const {leakSnapshot, leakChanges} = await import('/ricochet/src/ricochet.mjs')
const before = leakSnapshot()
// open a view, then go back
leakChanges(before) // {} when nothing leaks; {eventHandlers: 3} otherwise
```

The path of the `import()` is the one of the files on the server (the console does not know the import map). Load the
module from the same URL as the application, or it would be a second copy of the kernel.

## 6. Other tools of the kernel

Some objects of the kernel describe their state; read them from the console with an `import()` of their module:

| Call | Result |
| --- | --- |
| `bus.stats()` (`core/bus.mjs`) | the events that have listeners, with the names of the listeners |
| `microtasker.list()`, `microtasker.stats()` (`core/microtasker.mjs`) | the waiting microtasks; the measured durations of each event, to tune their declared cost |
| `scheduler.list()` (`core/scheduler.mjs`) | the waiting scheduled tasks and the time left |
| `loop.stats()` (`core/loop.mjs`) | the refresh rate, the budget of a frame and the duration of its phases |
| `keyboard.layers` (`core/keyboard.mjs`) | the number of windows open above the page |

## 7. Debugging tools of the application

An application adds its own switches, logs and counters, next to those of the kernel, with the functions of the
`debug` module (exported by `ricochet/ricochet.mjs`). Their names must differ from those of the kernel listed above.

**A switch and its messages.** `addDebugSwitches()` declares the switch with its default value (a value set at startup
or in the console is kept); `trace()` writes only while the switch is on:

```javascript
import {addDebugSwitches, trace} from 'ricochet/ricochet.mjs'

addDebugSwitches({ajax: false})

trace('ajax', url, status) // AJAX - config/load 200, when $global.debug.ajax is true
```

**A log.** `addLog()` adds an entry, with its time, to `$global.logs[name]` (created at the first entry) and to the
timeline. The timeline may receive a shorter entry; its first key names the log, so that the timeline tells the logs
apart:

```javascript
import {addLog} from 'ricochet/ricochet.mjs'

addLog('ajax', {url, status, duration, body}, {ajax: `${url} (${status} - ${duration} ms)`})
```

**A leak counter.** `countLeak()` moves a counter of `$global.memoryLeak` (created at the first call): +1 when the
application makes a subscription that the kernel does not know, -1 when it releases it. `leakChanges()` then watches
it as the others:

```javascript
import {countLeak} from 'ricochet/ricochet.mjs'

observe (target, recall) {
  this.subscriptions.push({target, recall})
  countLeak('dataObserver', 1)
}

unobserve (target, recall) {
  // … removes the subscription
  countLeak('dataObserver', -1)
}
```

These tools cost almost nothing when their switch is off: a test of a property. The logs are always recorded, 100
entries at most.

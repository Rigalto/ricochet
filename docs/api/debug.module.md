# debug

Module `debug` · group `core` · source [`src/core/debug.mjs`](../../src/core/debug.mjs)

Debugging tools of the kernel, installed when the module is imported, and the functions an application uses to add
its own. The guide `docs/DEBUG.md` explains them; the state is `window.$global` (see the `global` module).

Installed by the kernel:

- every event emitted on the bus is recorded in `$global.logs.events` and `$global.logs.timeline`, and shown in the
  console when `$global.debug.eventbus` is true (except the events of `quietEvents`);
- the attach and detach of components are shown when `$global.debug.lifecycle` is true;
- `console.error`, failed `console.assert` and uncaught errors are counted in `$global.errors`: `console.error` and
  `console.assert` are wrapped, the only change Ricochet makes to an object of the browser.

For the application:

| Function | Role |
| --- | --- |
| `addDebugSwitches({name: value})` | declares switches of the application in `$global.debug` (a switch already set is kept) |
| `trace(switch, …values)` | writes in the console when the switch is on |
| `addLog(name, entry, timelineEntry)` | records an entry in `$global.logs[name]` and in the timeline (100 entries each) |
| `countLeak(name, delta)` | moves a counter of `$global.memoryLeak`: +1 when a subscription is made, -1 when it is released |
| `leakSnapshot()`, `leakChanges(snapshot)` | the counters now, and those that changed since a snapshot |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `logTime` | const | Current time as `hh:mm:ss.mmm`, the format of the logs. |
| `pushLog` | function | Adds an entry at the head of a log, keeping at most 100 entries. |
| `addDebugSwitches` | function | Declares switches of the application in `$global.debug`, with their default value. A switch already set (by the application before loading Ricochet, or in the console) keeps its value. |
| `trace` | function | Writes in the console when a switch of `$global.debug` is on: `trace('ajax', url, status)` shows `AJAX - url status` while `$global.debug.ajax` is true. |
| `addLog` | function | Records an entry in a log of `$global.logs` (created if it does not exist) and in the timeline, with the time. Each log keeps the last 100 entries. |
| `countLeak` | function | Moves a leak counter of `$global.memoryLeak` (created if it does not exist): +1 when the application makes a subscription, a timer, an observer; -1 when it releases it. |
| `leakSnapshot` | function | The leak counters now, to compare them later with `leakChanges()`. |
| `leakChanges` | function | The leak counters that changed since a snapshot: after a view is opened and closed, they should all be back. |
| `quietEvents` | const | Events that are not recorded in the logs: frequent kernel events, such as the calls of `setInterval()`. |

## Details

### logTime

Current time as `hh:mm:ss.mmm`, the format of the logs.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | Date | Default: now. |

**Returns** `string` The formatted time.

### pushLog()

Adds an entry at the head of a log, keeping at most 100 entries.

| Parameter | Type | Description |
| --- | --- | --- |
| `log` | Array | One of the arrays of `$global.logs`. |
| `entry` | object | The entry to add. |

### addDebugSwitches()

Declares switches of the application in `$global.debug`, with their default value. A switch already set (by the
application before loading Ricochet, or in the console) keeps its value.

| Parameter | Type | Description |
| --- | --- | --- |
| `switches` | Object<string, boolean> | Name → default value. |

### trace()

Writes in the console when a switch of `$global.debug` is on: `trace('ajax', url, status)` shows
`AJAX - url status` while `$global.debug.ajax` is true.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the switch. |
| `values` | ...* | What to write. |

### addLog()

Records an entry in a log of `$global.logs` (created if it does not exist) and in the timeline, with the time.
Each log keeps the last 100 entries.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the log: `ajax`, `mqtt`… |
| `entry` | object | The entry, as it is kept in its log. |
| `timelineEntry` | object | The entry as it is kept in the timeline, if it must be shorter; its first key should be the name of the log in the singular (`{ajax: url, detail}`), so that the timeline tells the logs apart. |

### countLeak()

Moves a leak counter of `$global.memoryLeak` (created if it does not exist): +1 when the application makes a
subscription, a timer, an observer; -1 when it releases it.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the counter. |
| `delta` | number | +1 or -1. |

### leakSnapshot()

The leak counters now, to compare them later with `leakChanges()`.

**Returns** `Object<string, number>` A copy of `$global.memoryLeak`.

### leakChanges()

The leak counters that changed since a snapshot: after a view is opened and closed, they should all be back.

| Parameter | Type | Description |
| --- | --- | --- |
| `snapshot` | Object<string, number> | Given by `leakSnapshot()`. |

**Returns** `Object<string, number>` Name → change; empty if nothing changed.

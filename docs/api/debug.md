# debug

Module `debug` · group `core` · source [`src/core/debug.mjs`](../../src/core/debug.mjs)

Debugging tools of the kernel, installed when the module is imported:

- every event emitted on the bus is recorded in `$global.logs.events` and `$global.logs.timeline` (100 entries
  each), and shown in the console when `$global.debug.eventbus` is true;
- `console.lifecycle(…)` writes attach/detach messages when `$global.debug.lifecycle` is true;
- `console.error`, failed `console.assert` and uncaught errors are counted in `$global.memoryLeak`.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `logTime` | const | Current time as `hh:mm:ss.mmm`, the format of the logs. |
| `pushLog` | function | Adds an entry at the head of a log, keeping at most 100 entries. |
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

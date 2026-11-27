# GoogleTasks

Class `GoogleTasks` · group `adapters` · source [`src/adapters/google-tasks.mjs`](../../src/adapters/google-tasks.mjs)

The tasks of the user in Google Tasks.

## Methods

### constructor({account})

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | {account: {request: Function}} | The Google account (`googleAccount`, or a fake in the tests). |

### async lists()

The lists of tasks of the user (the tabs of the applications of Google).

**Returns** `Promise<{id: string, title: string, updated: string}[]>` 

### async tasks(list)

The tasks to do of a list (not completed, not deleted), in the order of the applications of Google
(`orderTasks`).

| Parameter | Type | Description |
| --- | --- | --- |
| `list` | string | The identifier of the list. |

**Returns** `Promise<object[]>` 

### async completed(list, from, to)

The tasks of a list completed between two moments (wherever they were completed: here or in an application of
Google, hidden or not).

| Parameter | Type | Description |
| --- | --- | --- |
| `list` | string | The identifier of the list. |
| `from` | string | The first moment (RFC 3339, included); none: since the first task. |
| `to` | string | The last moment (RFC 3339, excluded); none: until now. |

**Returns** `Promise<object[]>` 

### insert(list, task, {parent, previous} = {})

Creates a task.

| Parameter | Type | Description |
| --- | --- | --- |
| `list` | string | The identifier of the list. |
| `task` | {title: string, notes?: string, due?: string} | The task; `due`: `YYYY-MM-DD`. |
| `place` | {parent?: string, previous?: string} | Under this task (a subtask), after this one (default: first). |

**Returns** `Promise<object>` The task created.

### update(list, id, fields)

Changes fields of a task (the others are kept).

| Parameter | Type | Description |
| --- | --- | --- |
| `list` | string | The identifier of the list. |
| `id` | string | The identifier of the task. |
| `fields` | object | The fields changed (`title`, `notes`, `due`: `YYYY-MM-DD` or `null`, `status`). |

**Returns** `Promise<object>` The task changed.

### complete(list, id)

Completes a task (Google notes the moment).

| Parameter | Type | Description |
| --- | --- | --- |
| `list` | string | The identifier of the list. |
| `id` | string | The identifier of the task. |

**Returns** `Promise<object>` The task changed.

### async remove(list, id)

Deletes a task (with its subtasks, as Google does).

| Parameter | Type | Description |
| --- | --- | --- |
| `list` | string | The identifier of the list. |
| `id` | string | The identifier of the task. |

**Returns** `Promise<void>` 

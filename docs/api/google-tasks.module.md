# google-tasks

Module `google-tasks` · group `adapters` · source [`src/adapters/google-tasks.mjs`](../../src/adapters/google-tasks.mjs)

The tasks of the user in Google Tasks: the lists, the tasks of a list, and the changes (create, change, complete,
delete). Google Tasks stays the reference: nothing is kept here, the application reads again when it wants.

```javascript
import {googleAccount, GOOGLE_TASKS} from 'ricochet/adapters/google.mjs'
import {GoogleTasks} from 'ricochet/adapters/google-tasks.mjs'

const tasks = new GoogleTasks({account: googleAccount})
if (!googleAccount.hasScopes([GOOGLE_TASKS])) { button.onclick = () => googleAccount.signIn({scopes: [GOOGLE_TASKS]}) }
const lists = await tasks.lists() // [{id, title, updated}]
const todo = await tasks.tasks(lists[0].id) // the tasks to do, in the order of Google
await tasks.complete(lists[0].id, todo[0].id)
```

- **Scope**: `GOOGLE_TASKS` (`https://www.googleapis.com/auth/tasks`), asked when the view needs it
  (`googleAccount.signIn({scopes: [GOOGLE_TASKS]})`, in a click).
- **A task**: `{id, title, notes, due, status, parent, position, completed, updated, links}` as Google gives it;
  `parent`: the task it is indented under (one level in the applications of Google); `due`: a date (`YYYY-MM-DD`,
  Google keeps no time); `completed`: the date and time it was completed.
- **Order**: `tasks()` gives the tasks as the applications of Google show them: the tasks of the first level by their
  `position`, each followed by its subtasks by their `position`.
- **Completed tasks**: completed in the applications of Google, they become « hidden » for the API: `showHidden` is
  needed to read them (`completed()`).

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `orderTasks` | function | Orders tasks as the applications of Google show them: the tasks of the first level by their `position`, each one followed by its subtasks by their `position`. A subtask whose parent is not among the tasks comes at the first level. |
| `GoogleTasks` | class | The tasks of the user in Google Tasks. |
| `dueDay` | function | The date of a task to do (`YYYY-MM-DD`), from its `due` (Google gives midnight UTC of the day); `''` without date. |

## Details

### orderTasks()

Orders tasks as the applications of Google show them: the tasks of the first level by their `position`, each one
followed by its subtasks by their `position`. A subtask whose parent is not among the tasks comes at the first level.

| Parameter | Type | Description |
| --- | --- | --- |
| `tasks` | object[] | The tasks (`parent`, `position`). |

**Returns** `object[]` A new array.

### dueDay()

The date of a task to do (`YYYY-MM-DD`), from its `due` (Google gives midnight UTC of the day); `''` without date.

| Parameter | Type | Description |
| --- | --- | --- |
| `task` | {due?: string} | The task. |

**Returns** `string` 

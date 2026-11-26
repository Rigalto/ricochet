// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The tasks of the user in Google Tasks: the lists, the tasks of a list, and the changes (create, change, complete,
 * delete). Google Tasks stays the reference: nothing is kept here, the application reads again when it wants.
 *
 * ```javascript
 * import {googleAccount, GOOGLE_TASKS} from 'ricochet/adapters/google.mjs'
 * import {GoogleTasks} from 'ricochet/adapters/google-tasks.mjs'
 *
 * const tasks = new GoogleTasks({account: googleAccount})
 * if (!googleAccount.hasScopes([GOOGLE_TASKS])) { button.onclick = () => googleAccount.signIn({scopes: [GOOGLE_TASKS]}) }
 * const lists = await tasks.lists() // [{id, title, updated}]
 * const todo = await tasks.tasks(lists[0].id) // the tasks to do, in the order of Google
 * await tasks.complete(lists[0].id, todo[0].id)
 * ```
 *
 * - **Scope**: `GOOGLE_TASKS` (`https://www.googleapis.com/auth/tasks`), asked when the view needs it
 *   (`googleAccount.signIn({scopes: [GOOGLE_TASKS]})`, in a click).
 * - **A task**: `{id, title, notes, due, status, parent, position, completed, updated, links}` as Google gives it;
 *   `parent`: the task it is indented under (one level in the applications of Google); `due`: a date (`YYYY-MM-DD`,
 *   Google keeps no time); `completed`: the date and time it was completed.
 * - **Order**: `tasks()` gives the tasks as the applications of Google show them: the tasks of the first level by their
 *   `position`, each followed by its subtasks by their `position`.
 * - **Completed tasks**: completed in the applications of Google, they become « hidden » for the API: `showHidden` is
 *   needed to read them (`completed()`).
 *
 * @module google-tasks
 */

const API = 'https://tasks.googleapis.com/tasks/v1'
const PAGE = 100 // the most the API gives at once

/**
 * Orders tasks as the applications of Google show them: the tasks of the first level by their `position`, each one
 * followed by its subtasks by their `position`. A subtask whose parent is not among the tasks comes at the first level.
 * @param {object[]} tasks - The tasks (`parent`, `position`).
 * @returns {object[]} A new array.
 */
export const orderTasks = tasks => {
  const ids = new Set(tasks.map(task => task.id))
  const byPosition = (a, b) => String(a.position ?? '').localeCompare(String(b.position ?? ''))
  const children = new Map()
  for (const task of tasks) {
    if (task.parent && ids.has(task.parent)) {
      if (!children.has(task.parent)) { children.set(task.parent, []) }
      children.get(task.parent).push(task)
    }
  }
  return tasks.filter(task => !task.parent || !ids.has(task.parent)).sort(byPosition)
    .flatMap(task => [task, ...(children.get(task.id) ?? []).sort(byPosition)])
}

/**
 * The tasks of the user in Google Tasks.
 */
export class GoogleTasks {
  #account

  /**
   * @param {{account: {request: Function}}} options - The Google account (`googleAccount`, or a fake in the tests).
   */
  constructor ({account}) {
    this.#account = account
  }

  // all the pages of a list request
  async #all (url, query) {
    const items = []
    let pageToken
    do {
      const answer = await this.#account.request(url, {query: {...query, maxResults: PAGE, ...(pageToken ? {pageToken} : {})}, source: 'tasks'})
      items.push(...(answer?.items ?? []))
      pageToken = answer?.nextPageToken
    } while (pageToken)
    return items
  }

  /**
   * The lists of tasks of the user (the tabs of the applications of Google).
   * @returns {Promise<{id: string, title: string, updated: string}[]>}
   */
  async lists () {
    return (await this.#all(`${API}/users/@me/lists`, {})).map(({id, title, updated}) => ({id, title, updated}))
  }

  /**
   * The tasks to do of a list (not completed, not deleted), in the order of the applications of Google
   * (`orderTasks`).
   * @param {string} list - The identifier of the list.
   * @returns {Promise<object[]>}
   */
  async tasks (list) {
    return orderTasks(await this.#all(`${API}/lists/${encodeURIComponent(list)}/tasks`, {showCompleted: false, showHidden: false, showDeleted: false}))
  }

  /**
   * The tasks of a list completed between two moments (wherever they were completed: here or in an application of
   * Google, hidden or not).
   * @param {string} list - The identifier of the list.
   * @param {string} from - The first moment (RFC 3339, included).
   * @param {string} to - The last moment (RFC 3339, excluded).
   * @returns {Promise<object[]>}
   */
  async completed (list, from, to) {
    const tasks = await this.#all(`${API}/lists/${encodeURIComponent(list)}/tasks`,
      {showCompleted: true, showHidden: true, showDeleted: false, completedMin: from, completedMax: to})
    return tasks.filter(task => task.status === 'completed')
  }

  /**
   * Creates a task.
   * @param {string} list - The identifier of the list.
   * @param {{title: string, notes?: string, due?: string}} task - The task; `due`: `YYYY-MM-DD`.
   * @param {{parent?: string, previous?: string}} [place] - Under this task (a subtask), after this one (default: first).
   * @returns {Promise<object>} The task created.
   */
  insert (list, task, {parent, previous} = {}) {
    return this.#account.request(`${API}/lists/${encodeURIComponent(list)}/tasks`, {
      method: 'POST',
      query: {...(parent ? {parent} : {}), ...(previous ? {previous} : {})},
      body: GoogleTasks.#body(task),
      source: 'tasks'
    })
  }

  /**
   * Changes fields of a task (the others are kept).
   * @param {string} list - The identifier of the list.
   * @param {string} id - The identifier of the task.
   * @param {object} fields - The fields changed (`title`, `notes`, `due`: `YYYY-MM-DD` or `null`, `status`).
   * @returns {Promise<object>} The task changed.
   */
  update (list, id, fields) {
    return this.#account.request(`${API}/lists/${encodeURIComponent(list)}/tasks/${encodeURIComponent(id)}`,
      {method: 'PATCH', body: GoogleTasks.#body(fields), source: 'tasks'})
  }

  /**
   * Completes a task (Google notes the moment).
   * @param {string} list - The identifier of the list.
   * @param {string} id - The identifier of the task.
   * @returns {Promise<object>} The task changed.
   */
  complete (list, id) { return this.update(list, id, {status: 'completed'}) }

  /**
   * Deletes a task (with its subtasks, as Google does).
   * @param {string} list - The identifier of the list.
   * @param {string} id - The identifier of the task.
   * @returns {Promise<void>}
   */
  async remove (list, id) {
    await this.#account.request(`${API}/lists/${encodeURIComponent(list)}/tasks/${encodeURIComponent(id)}`, {method: 'DELETE', source: 'tasks'})
  }

  // the body sent to Google: a date `YYYY-MM-DD` becomes the moment Google expects (midnight UTC)
  static #body (fields) {
    const body = {...fields}
    if (typeof body.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.due)) { body.due = `${body.due}T00:00:00.000Z` }
    return body
  }
}

/**
 * The date of a task to do (`YYYY-MM-DD`), from its `due` (Google gives midnight UTC of the day); `''` without date.
 * @param {{due?: string}} task - The task.
 * @returns {string}
 */
export const dueDay = task => String(task?.due ?? '').slice(0, 10)

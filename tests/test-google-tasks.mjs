// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-google-tasks.mjs — node tests/run.mjs GoogleTasks
// The adapter of Google Tasks: the lists, the tasks to do in the order of Google (pages), the completed tasks, the
// changes; a fake account answers like the API.

import {describe, assert} from './kernel.mjs'
import {GoogleTasks, dueDay, orderTasks} from '../src/adapters/google-tasks.mjs'

// a fake account: the requests are noted; the answers come from `pages` (by address), page by page
const fake = (pages = {}) => {
  const calls = []
  return {
    calls,
    async request (url, {method = 'GET', query = {}, body} = {}) {
      calls.push({url, method, query, body})
      if (method !== 'GET') { return method === 'DELETE' ? null : {id: 'new', ...body} }
      const list = pages[url] ?? []
      const index = query.pageToken ? Number(query.pageToken) : 0
      return {items: list[index] ?? [], ...(index + 1 < list.length ? {nextPageToken: String(index + 1)} : {})}
    }
  }
}

const API = 'https://tasks.googleapis.com/tasks/v1'

await describe('GoogleTasks — reading', async () => {
  const account = fake({
    [`${API}/users/@me/lists`]: [[{id: 'L1', title: 'Maison', updated: 'u', etag: 'x'}], [{id: 'L2', title: 'Travail', updated: 'v'}]],
    [`${API}/lists/L1/tasks`]: [[
      {id: 'c2', parent: 'a', position: '002', title: 'sous 2'},
      {id: 'b', position: '001', title: 'B'},
      {id: 'c1', parent: 'a', position: '001', title: 'sous 1'}
    ], [
      {id: 'a', position: '000', title: 'A'},
      {id: 'orphan', parent: 'gone', position: '003', title: 'orpheline'}
    ]]
  })
  const tasks = new GoogleTasks({account})
  const lists = await tasks.lists()
  assert('the lists, on all the pages, reduced to id, title, updated', JSON.stringify(lists) === '[{"id":"L1","title":"Maison","updated":"u"},{"id":"L2","title":"Travail","updated":"v"}]')
  const todo = await tasks.tasks('L1')
  assert('the tasks in the order of Google: first level by position, each followed by its subtasks', todo.map(t => t.id).join() === 'a,c1,c2,b,orphan')
  const asked = account.calls.find(call => call.url === `${API}/lists/L1/tasks`)
  assert('… only the tasks to do; 100 by page', asked.query.showCompleted === false && asked.query.showHidden === false && asked.query.maxResults === 100)
  assert('… a subtask whose parent is absent: at the first level', orderTasks([{id: 'x', parent: 'nope', position: '1'}]).length === 1)
  await tasks.completed('L2', '2026-11-26T00:00:00Z', '2026-11-27T00:00:00Z')
  const done = account.calls.at(-1)
  assert('the completed tasks of a period: hidden included (completed in the applications of Google)', done.query.showHidden === true &&
    done.query.showCompleted === true && done.query.completedMin === '2026-11-26T00:00:00Z' && done.query.completedMax === '2026-11-27T00:00:00Z')
  await tasks.completed('L2')
  assert('… without bounds: since the first task, until now', !('completedMin' in account.calls.at(-1).query) && !('completedMax' in account.calls.at(-1).query))
  assert('the date of a task: YYYY-MM-DD, or empty', dueDay({due: '2026-12-01T00:00:00.000Z'}) === '2026-12-01' && dueDay({}) === '')
})

await describe('GoogleTasks — changes', async () => {
  const account = fake()
  const tasks = new GoogleTasks({account})
  await tasks.insert('L1', {title: 'Copie', notes: 'n\n↻ 7 j', due: '2026-12-03'}, {parent: 'a'})
  const insert = account.calls.at(-1)
  assert('a task created: under its parent, the date sent as midnight UTC', insert.method === 'POST' && insert.url === `${API}/lists/L1/tasks` &&
    insert.query.parent === 'a' && insert.body.due === '2026-12-03T00:00:00.000Z' && insert.body.title === 'Copie')
  await tasks.insert('L1', {title: 'Haut'})
  assert('… at the first level: no parent', account.calls.at(-1).query.parent === undefined)
  await tasks.complete('L1', 'a/b')
  const complete = account.calls.at(-1)
  assert('a task completed: PATCH of its status (identifier encoded)', complete.method === 'PATCH' && complete.url === `${API}/lists/L1/tasks/a%2Fb` &&
    complete.body.status === 'completed')
  await tasks.update('L1', 'a', {notes: 'x', due: null})
  assert('a task changed: only the fields given; a date removed', JSON.stringify(account.calls.at(-1).body) === '{"notes":"x","due":null}')
  await tasks.remove('L1', 'a')
  assert('a task deleted', account.calls.at(-1).method === 'DELETE')
})

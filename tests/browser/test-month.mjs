// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/browser/test-month.mjs — the grid of a month, rc-month

import {describe, assert} from '../kernel.mjs'
import {WComponent} from '../../src/core/w-component.mjs'
import {bus} from '../../src/core/bus.mjs'
import '../../src/core/actions.mjs'
import '../../src/core/keyboard.mjs'
import '../../src/ui/rc-month.mjs'

const sandbox = document.getElementById('sandbox')
const tick = () => new Promise(resolve => setTimeout(resolve, 0))

await describe('rc-month', async () => {
  sandbox.innerHTML = '<rc-month id="m" month="2026-10-29" value="2026-10-29" today="2026-10-05" event="tmDate" labels="Lu, Ma|Me,Je, Ve, Sa, Di"></rc-month>'
  WComponent.render(sandbox)
  await tick()
  const grid = document.getElementById('m')
  const cells = [...grid.querySelectorAll('.rc-month-day')]
  const text = () => cells.map(c => c.textContent)
  const index = date => cells.findIndex(c => c.dataset.param === `{"date": "${date}"}`)
  assert('a grid of 7 names and 42 days', grid.getAttribute('role') === 'grid' && grid.querySelectorAll('.rc-month-label').length === 7 &&
    cells.length === 42)
  assert('the names, any separator', [...grid.querySelectorAll('.rc-month-label')].map(l => l.textContent).join('') === 'LuMaMeJeVeSaDi')
  // October 2026 starts on a Thursday: the grid starts on Monday 28 September
  assert('Monday first, the days of the previous month', text().slice(0, 4).join(' ') === '28 29 30 1' && index('2026-09-28') === 0)
  assert('the days outside the month are faint', cells[0].hasAttribute('outside') && !cells[3].hasAttribute('outside') &&
    cells[34].hasAttribute('outside') && !cells[33].hasAttribute('outside'))
  assert('the chosen date', cells[index('2026-10-29')].getAttribute('aria-selected') === 'true' &&
    grid.querySelectorAll('[aria-selected]').length === 1)
  assert('today', cells[index('2026-10-05')].hasAttribute('today') && grid.querySelectorAll('[today]').length === 1)
  assert('one day reached by Tab: the chosen one', cells.filter(c => c.tabIndex === 0).length === 1 && cells[index('2026-10-29')].tabIndex === 0)
  assert('the full date as name', /2026/.test(cells[0].getAttribute('aria-label')))

  // a click emits the event with the date
  const got = []
  const listener = payload => got.push(payload)
  bus.on('tmDate', listener)
  cells[index('2026-10-14')].click()
  cells[0].click() // a faint day can be clicked
  assert('a click: the event, the date as payload', JSON.stringify(got) === '[{"date":"2026-10-14"},{"date":"2026-09-28"}]')

  // another chosen date in the month: the mark moves, nothing else is written
  const records = []
  const observer = new MutationObserver(list => records.push(...list))
  observer.observe(grid, {childList: true, subtree: true, characterData: true, attributes: true})
  grid.setAttribute('value', '2026-10-14')
  await tick()
  records.push(...observer.takeRecords())
  const changes = records.filter(r => r.target !== grid)
  assert('another value: the mark moves', cells[index('2026-10-14')].getAttribute('aria-selected') === 'true' &&
    !cells[index('2026-10-29')].hasAttribute('aria-selected'))
  assert('… only the attributes of the two days (and Tab)', changes.length > 0 && changes.every(r => r.type === 'attributes') &&
    new Set(changes.map(r => r.target)).size === 2)

  // another month: the same buttons, rewritten
  const first = cells[0]
  grid.setAttribute('month', '2027-02')
  await tick()
  assert('another month: the same buttons', grid.querySelector('.rc-month-day') === first)
  assert('February 2027 starts on Monday 1', text().slice(0, 3).join(' ') === '1 2 3' && !cells[0].hasAttribute('outside') &&
    cells[28].hasAttribute('outside'))
  assert('the chosen date is not shown: no mark', grid.querySelectorAll('[aria-selected]').length === 0 &&
    grid.querySelectorAll('[today]').length === 0)
  assert('Tab: the first day of the month', cells[0].tabIndex === 0)
  assert('weeks="6": six weeks shown', cells.every(c => !c.hidden && !c.hasAttribute('blank')))
  grid.setAttribute('weeks', 'auto')
  await tick()
  assert('weeks="auto": the weeks outside the month kept blank', cells.slice(28).every(c => c.hasAttribute('blank')) &&
    cells.slice(0, 28).every(c => !c.hasAttribute('blank')) && cells.every(c => !c.hidden))
  grid.setAttribute('weeks', 'compact')
  await tick()
  assert('weeks="compact": four weeks only', cells.slice(28).every(c => c.hidden) && grid.getBoundingClientRect().height > 0)
  const compactHeight = grid.getBoundingClientRect().height
  grid.setAttribute('month', '2026-08') // August 2026: six weeks
  await tick()
  assert('compact: six weeks for August 2026', cells.every(c => !c.hidden) && grid.getBoundingClientRect().height > compactHeight)
  grid.setAttribute('today', 'none')
  grid.setAttribute('month', '2026-10')
  await tick()
  assert('today="none": no circle', grid.querySelectorAll('[today]').length === 0)
  assert('the chosen date is back in October', cells[index('2026-10-14')].getAttribute('aria-selected') === 'true')

  // the arrows move the focus
  const chosen = cells[index('2026-10-14')]
  chosen.focus()
  const key = k => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: k, code: k, bubbles: true, cancelable: true}))
  key('ArrowRight')
  const afterRight = document.activeElement
  key('ArrowDown')
  const afterDown = document.activeElement
  key('Home')
  assert('arrows: one day, one week, the start of the week', afterRight === cells[index('2026-10-15')] &&
    afterDown === cells[index('2026-10-22')] && document.activeElement === cells[index('2026-10-19')])
  assert('the day reached by Tab follows the focus', cells.filter(c => c.tabIndex === 0).length === 1 &&
    document.activeElement.tabIndex === 0)

  // without month: the month of the chosen date
  sandbox.innerHTML = '<rc-month id="n" value="2027-02-10"></rc-month>'
  WComponent.render(sandbox)
  await tick()
  const other = document.getElementById('n')
  assert('without month: the month of value, default names', other.querySelector('.rc-month-day').textContent === '1' &&
    other.querySelector('.rc-month-label').textContent === 'Mo' && !other.querySelector('.rc-month-day').hasAttribute('data-event'))
  bus.off('tmDate', listener)
  observer.disconnect()
  sandbox.innerHTML = ''
})

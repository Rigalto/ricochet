// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-requests.mjs — node tests/run.mjs Requests
// The log of the requests: the masked address, the entry of the log and of the timeline.

import {describe, assert} from './kernel.mjs'
import {$global} from '../src/core/global.mjs'
import {logRequest, maskSecrets} from '../src/core/requests.mjs'

describe('Requests — maskSecrets()', () => {
  assert('a key in the query', maskSecrets('https://a.b/feed/?token=abc&city=paris') === 'https://a.b/feed/?token=***&city=paris')
  assert('several keys, any case', maskSecrets('https://a.b/?KEY=1&x=2&api_key=3') === 'https://a.b/?KEY=***&x=2&api_key=***')
  assert('the tokens of OAuth, also in the fragment', maskSecrets('https://a.b/#access_token=ya29.x&expires_in=3599') ===
    'https://a.b/#access_token=***&expires_in=3599')
  assert('refresh_token, client_secret, code', maskSecrets('/o?code=4/0A&client_secret=s&refresh_token=r') ===
    '/o?code=***&client_secret=***&refresh_token=***')
  assert('a name that only ends like a key is kept', maskSecrets('/a?monkey=1&token2=3') === '/a?monkey=1&token2=3')
  assert('an address without parameters', maskSecrets('config/load') === 'config/load')
  assert('not a string', maskSecrets(undefined) === 'undefined')
})

describe('Requests — logRequest()', () => {
  const before = $global.logs.timeline.length
  logRequest({source: 'drive', url: 'https://www.googleapis.com/drive/v3/files?key=k', status: 200, duration: 12, body: {name: 'a', size: 2}})
  const entry = $global.logs.ajax[0]
  assert('the entry of the log', entry.source === 'drive' && entry.url === 'https://www.googleapis.com/drive/v3/files?key=***' &&
    entry.status === 200 && entry.duration === 12 && entry.body === '{"name": "a", "size": 2}' && typeof entry.time === 'string')
  const line = $global.logs.timeline[0]
  assert('the entry of the timeline', $global.logs.timeline.length === Math.min(before + 1, 100) &&
    line.ajax === 'https://www.googleapis.com/drive/v3/files?key=*** (200 - 12 ms)' && line.detail === entry.body)
  logRequest({source: 'server', url: 'config/load', status: 'error', duration: 3})
  assert('without data: an empty body', $global.logs.ajax[0].body === '' && $global.logs.ajax[0].status === 'error')
  logRequest({source: 'server', url: 'x', status: 200, duration: 1, body: 'raw'})
  assert('a string as it is', $global.logs.ajax[0].body === 'raw')
})

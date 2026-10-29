// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The air quality demo: the air quality measured by the station nearest to a place, from the World Air Quality Index
 * Project (aqicn.org). A small application without any server: its settings are configuration items kept in the local
 * database of the browser (`IndexedDBAdapter`), its API key is a secret given by the user (`secrets`).
 *
 * @module air-quality
 */

import {WComponent, css, escapeHtml, secrets} from 'ricochet/ricochet.mjs'

const SECRET = 'aqicn' // the name of the key in the store of secrets
const LOCATION_ITEM = 'air-quality-location' // the place: 'here', 'city:<name>' or 'latlon:<lat> <lon>'
const TOKEN_URL = 'https://aqicn.org/data-platform/token/'
const API_URL = 'https://api.waqi.info/feed'

// the scale of the air quality index (US EPA): the colours are those of the scale, not to be changed; 'text' is the
// colour of a text written on that colour
const AQI_SCALE = [
  {max: 50, color: 'green', text: 'white', icon: 'smile', status: 'Good'},
  {max: 100, color: 'yellow', text: 'black', icon: 'meh', status: 'Moderate'},
  {max: 150, color: 'orange', text: 'black', icon: 'frown', status: 'Unhealthy for sensitive groups'},
  {max: 200, color: 'red', text: 'white', icon: 'nervous', status: 'Unhealthy'},
  {max: 300, color: 'purple', text: 'white', icon: 'surgicalmask', status: 'Very unhealthy'},
  {max: 500, color: 'maroon', text: 'white', icon: 'pirat', status: 'Hazardous'}
]
const AQI_MAX = 500

// the detailed measures of a station (field 'iaqi'): the pollutants (indexes on the scale above) and the weather
const POLLUTANTS = {pm25: 'PM2.5', pm10: 'PM10', o3: 'Ozone (O₃)', no2: 'Nitrogen dioxide (NO₂)', so2: 'Sulphur dioxide (SO₂)', co: 'Carbon monoxide (CO)'}
const WEATHER = {t: ['Temperature', '°C'], h: ['Humidity', '%'], p: ['Pressure', 'hPa'], w: ['Wind', 'm/s'], wg: ['Gusts', 'm/s'], dew: ['Dew point', '°C']}

// the level of the scale of an index
const levelOf = index => AQI_SCALE.find(level => index <= level.max) ?? AQI_SCALE.at(-1)

// a place typed by the user: two numbers (latitude, longitude) or the name of a city
const parseLocation = text => {
  const value = text.trim()
  if (value === '') { return null }
  const match = /^(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)$/.exec(value)
  if (match !== null) {
    const [lat, lon] = [match[1], match[2]].map(n => Number(n.replace(',', '.')))
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) { return `latlon:${lat} ${lon}` }
  }
  return `city:${value}`
}

// the text of the search field for a stored place
const locationText = location => location.startsWith('city:')
  ? location.slice(5)
  : location.startsWith('latlon:') ? location.slice(7).replace(' ', ', ') : ''

// the path of the API for a stored place
const feedOf = location => location === 'here'
  ? 'here'
  : location.startsWith('city:')
    ? encodeURIComponent(location.slice(5))
    : location.startsWith('latlon:') ? `geo:${location.slice(7).replace(' ', ';')}` : null

css(`
air-quality { display: grid; gap: 1rem; }
air-quality [name="content"] { display: grid; gap: 1rem; }
air-quality .aq-search { display: flex; gap: .5rem; align-items: center; }
air-quality .aq-search > rc-input { flex: 1 1 auto; min-width: 0; }
air-quality .aq-message { padding: .75rem 1rem; border-radius: .5rem; background: var(--rc-surface-raised); }
air-quality .aq-message[state="error"] { background: var(--rc-danger-surface); color: var(--rc-text-strong); }
air-quality .aq-index {
  display: flex; gap: 1rem; align-items: center; padding: 1rem; border-radius: .5rem;
  background: color-mix(in oklch, var(--aq-color) 30%, var(--rc-surface-raised));
}
air-quality .aq-badge {
  flex: none; display: grid; justify-items: center; gap: .1rem; min-width: 5.5rem; padding: .5rem .75rem;
  border-radius: .5rem; background: var(--aq-color); color: var(--aq-text);
}
air-quality .aq-value { font-size: 2rem; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
air-quality .aq-status { font-size: 1.15rem; font-weight: 600; color: var(--rc-text-strong); }
air-quality a { color: var(--rc-link); }
air-quality .aq-detail { color: var(--rc-text-muted); font-size: .9em; }
air-quality .aq-scale { position: relative; padding-top: 1.6rem; }
air-quality .aq-bar { display: flex; height: .75rem; border-radius: .375rem; overflow: hidden; }
air-quality .aq-bar > span { flex: 1 1 0; }
air-quality .aq-bar > span + span { border-left: 2px solid var(--rc-surface); }
air-quality .aq-pointer { position: absolute; top: 0; transform: translateX(-50%); color: var(--rc-text-strong); }
air-quality .aq-ticks { position: relative; height: 1.2em; font-size: .8em; color: var(--rc-text-muted); }
air-quality .aq-ticks > span { position: absolute; top: .2em; transform: translateX(-50%); }
air-quality .aq-ticks > span:first-child { transform: none; }
air-quality .aq-ticks > span:last-child { transform: translateX(-100%); }
air-quality .aq-tables { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); align-items: start; }
air-quality .aq-dot { display: inline-block; width: .7em; height: .7em; border-radius: 50%; margin-right: .4em; }
air-quality .aq-credit { font-size: .8em; color: var(--rc-text-muted); }
`, {name: 'air-quality'})

/**
 * The air quality of a place, with the search field.
 *
 * The place is typed in the search field: the name of a city (`Paris`, `Tokyo`) or a latitude and a longitude
 * (`48.85, 2.35`); the event `airQualityHere` takes the place given by the IP address. It is kept in the configuration
 * item `air-quality-location`, and the measures are asked for when the page is shown, then on `airQualityRefresh`.
 *
 * The component shows the index (US EPA, from 0 to 500) on the colour of its level, the level, the station and the time
 * of the measure, the scale with a marker, then the pollutants (indexes) and the weather of the station.
 *
 * The service asks for a personal key: it is kept by `secrets`, never in the code nor in the configuration items.
 * Without a key, or with a refused one, the component shows how to get one and the field to give it
 * (`<air-quality-key>`).
 *
 * ```html
 * <air-quality></air-quality>
 * ```
 *
 * @item {in,out} air-quality-location - The place.
 * @listens airQualitySearch - `Enter` in the field, or a click on the magnifier: the place typed.
 * @listens airQualityHere - The place given by the IP address.
 * @listens airQualityRefresh - Asks for the measures again.
 * @listens secretChanged - The key is given or removed.
 */
export class AirQuality extends WComponent {
  attach () {
    this.innerHTML(/* html */ `
      <div class="aq-search">
        <rc-input type="search" commit="enter" data-event="airQualitySearch" label="Place"
          placeholder="City, or latitude, longitude"></rc-input>
        <rc-icon-button icon="search" title="Search" data-event="airQualitySearch"></rc-icon-button>
      </div>
      <div name="content"></div>
      <div class="aq-credit">Data from the
        <a href="https://aqicn.org/" target="_blank" rel="noopener">World Air Quality Index Project</a><span name="attributions"></span>.</div>`)
    this.elInput = this.element.querySelector('rc-input')
    this.elContent = this.element.querySelector('[name="content"]')
    this.elAttributions = this.element.querySelector('[name="attributions"]')
    this.location = null
    this.request = 0 // number of the last request: an older answer is ignored
    this.listen(['airQualitySearch', 'airQualityHere', 'airQualityRefresh', 'secretChanged'])
    this.observeItems([LOCATION_ITEM])
  }

  itemsChanged (items) {
    const location = items[LOCATION_ITEM] ?? ''
    if (location === this.location) { return }
    this.location = location
    this.elInput.setAttribute('value', locationText(location))
    this.refresh()
  }

  airQualitySearchDispatched ({value} = {}) {
    const location = parseLocation(value ?? this.elInput._component?.value ?? '')
    if (location === null) { return }
    if (location === this.location) { this.refresh() } else { this.setItem(LOCATION_ITEM, location) }
  }

  airQualityHereDispatched () {
    if (this.location === 'here') { this.refresh() } else { this.setItem(LOCATION_ITEM, 'here') }
  }

  airQualityRefreshDispatched () { this.refresh() }

  secretChangedDispatched ({name}) { if (name === SECRET) { this.refresh() } }

  /** Asks for the measures of the place, or shows what is missing (the key, the place). */
  async refresh () {
    const request = ++this.request
    const token = secrets.get(SECRET)
    if (token === null) {
      this.#show(this.#keyMessage('The air quality service asks for a personal key, free of charge.'))
      return
    }
    const feed = feedOf(this.location ?? '')
    if (feed === null) {
      this.#show('<div class="aq-message">Type a city, or a latitude and a longitude, or use the place given by the IP address.</div>')
      return
    }
    this.#show('<div class="aq-message">Loading…</div>', false)
    let status = 0
    let json = null
    try {
      const response = await fetch(`${API_URL}/${feed}/?token=${encodeURIComponent(token)}`)
      status = response.status
      json = response.ok ? await response.json() : null
    } catch {
      json = null
    }
    if (request !== this.request || !this.element?.isConnected) { return } // an answer overtaken by another request
    this.#answer(status, json)
  }

  // the answer of the API
  #answer (status, json) {
    if (json === null) {
      this.#show(this.#error(`The service does not answer (${status === 0 ? 'no connection' : status}).`))
    } else if (json.status !== 'ok') {
      const reason = String(json.data ?? '')
      if (/invalid key/i.test(reason)) {
        this.#show(this.#keyMessage('The key is refused by the service.', true))
      } else if (/unknown station/i.test(reason)) {
        this.#show(this.#error('No station found for this place: try another name, or the list of the stations.'))
      } else {
        this.#show(this.#error(`Error of the service: ${escapeHtml(reason)}`))
      }
    } else if (typeof json.data?.aqi !== 'number') {
      this.#show(this.#error('The station gives no index at the moment.'), true, json.data)
    } else {
      this.#show(this.#measure(json.data), true, json.data)
    }
  }

  #show (html, final = true, data = null) {
    this.elContent.innerHTML = html
    if (!final) { return }
    const attributions = (data?.attributions ?? []).filter(a => typeof a.url === 'string' && /^https?:/.test(a.url))
    this.elAttributions.innerHTML = attributions.length === 0
      ? ''
      : ', with ' + attributions.map(a =>
        `<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${escapeHtml(a.name ?? a.url)}</a>`).join(', ')
  }

  #error (text) { return `<div class="aq-message" state="error">${text}</div>` }

  #keyMessage (text, refused = false) {
    return `<div class="aq-message"${refused ? ' state="error"' : ''}>${escapeHtml(text)}</div>
      <div class="aq-message"><air-quality-key></air-quality-key></div>`
  }

  // the measures of a station
  #measure (data) {
    const index = data.aqi
    const level = levelOf(index)
    const city = data.city ?? {}
    const name = escapeHtml(city.name ?? 'Unknown station')
    const station = typeof city.url === 'string' && /^https?:/.test(city.url)
      ? `<a href="${escapeHtml(city.url)}" target="_blank" rel="noopener">${name}</a>`
      : name
    const geo = Array.isArray(city.geo) ? ` · ${city.geo.map(n => Number(n).toFixed(3)).join(', ')}` : ''
    const time = data.time?.iso ? new Date(data.time.iso) : null
    const when = time !== null && !Number.isNaN(time.getTime())
      ? `Measured on ${time.toLocaleString(undefined, {day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'})}`
      : ''
    const main = POLLUTANTS[data.dominentpol] ? `main pollutant: ${POLLUTANTS[data.dominentpol]}` : ''
    const detail = [when, main].filter(t => t !== '').join(' · ')
    const position = Math.min(index, AQI_MAX) / AQI_MAX * 100
    return /* html */ `
      <section class="aq-index" style="--aq-color: ${level.color}; --aq-text: ${level.text}">
        <div class="aq-badge" title="Air quality index (US EPA)">
          <rc-icon icon="${level.icon}" size="32"></rc-icon><span class="aq-value">${index}</span>
        </div>
        <div>
          <div class="aq-status">${escapeHtml(level.status)}</div>
          <div>${station}<span class="aq-detail">${geo}</span></div>
          <div class="aq-detail">${escapeHtml(detail)}</div>
        </div>
      </section>
      <div class="aq-scale" aria-hidden="true">
        <rc-icon class="aq-pointer" icon="mapmarkeralt" size="22" style="left: ${position}%"></rc-icon>
        <div class="aq-bar">${AQI_SCALE.map((l, i) => `<span style="background: ${l.color}; flex-grow: ${
          (l.max - (i === 0 ? 0 : AQI_SCALE[i - 1].max)) / 50}"></span>`).join('')}</div>
        <div class="aq-ticks"><span style="left: 0">0</span>${AQI_SCALE.map(l =>
          `<span style="left: ${l.max / AQI_MAX * 100}%">${l.max}</span>`).join('')}</div>
      </div>
      <div class="aq-tables">${this.#pollutants(data.iaqi ?? {})}${this.#weather(data.iaqi ?? {})}</div>`
  }

  #pollutants (iaqi) {
    const rows = Object.entries(POLLUTANTS).filter(([key]) => typeof iaqi[key]?.v === 'number').map(([key, label]) => {
      const value = iaqi[key].v
      return `<tr><td><span class="aq-dot" style="background: ${levelOf(value).color}"></span>${escapeHtml(label)}</td>` +
        `<td class="rc-num">${Math.round(value)}</td></tr>`
    })
    return rows.length === 0
      ? ''
      : `<table class="rc-table rc-table-striped">
      <thead><tr><th>Pollutant</th><th class="rc-right">Index</th></tr></thead><tbody>${rows.join('')}</tbody></table>`
  }

  #weather (iaqi) {
    const rows = Object.entries(WEATHER).filter(([key]) => typeof iaqi[key]?.v === 'number').map(([key, [label, unit]]) =>
      `<tr><td>${escapeHtml(label)}</td><td class="rc-num">${Math.round(iaqi[key].v * 10) / 10} ${unit}</td></tr>`)
    return rows.length === 0
      ? ''
      : `<table class="rc-table rc-table-striped">
      <thead><tr><th>Weather at the station</th><th class="rc-right">Value</th></tr></thead><tbody>${rows.join('')}</tbody></table>`
  }
}
WComponent.define('air-quality', AirQuality)

css(`
air-quality-key { display: grid; gap: .6rem; max-width: 28rem; }
air-quality-key ol { margin: 0; padding-left: 1.4em; }
air-quality-key a { color: var(--rc-link); }
air-quality-key .aq-key-field { display: flex; gap: .5rem; align-items: center; }
air-quality-key .aq-key-field > rc-input { flex: 1 1 auto; min-width: 0; }
air-quality-key .aq-key-state { display: flex; gap: .5rem; align-items: center; justify-content: space-between; }
air-quality-key .aq-key-note { font-size: .85em; color: var(--rc-text-muted); }
`, {name: 'air-quality-key'})

/**
 * The key of the air quality service: how to get it (a link to aqicn.org, in a new tab), the field to give it, its
 * state (stored or not) and its removal. Shown in the page when the key is missing, and in the menu of the key button.
 *
 * The key is kept by `secrets`: in this browser, on this computer only; it is given again in another browser or on
 * another computer. It is never shown in full (only its last 4 characters).
 *
 * The typed key does not go through the events of Ricochet, whose log would show it: `Enter` in the field and the
 * « Save » button are DOM events, handled by the component itself.
 *
 * ```html
 * <air-quality-key></air-quality-key>
 * ```
 *
 * @listens airQualityKeyRemove - Click on « Remove the key ».
 * @listens secretChanged - The state shown follows the key.
 * @fires dropdownClose - The key is saved: the menu closes.
 */
export class AirQualityKey extends WComponent {
  attach () {
    this.innerHTML(/* html */ `
      <ol>
        <li>Open the <a href="${TOKEN_URL}" target="_blank" rel="noopener">page to ask for a key</a> on aqicn.org, and
          give an e-mail address.</li>
        <li>Confirm the address: the key (token) comes by e-mail.</li>
        <li>Paste it below, then <kbd>Enter</kbd>.</li>
      </ol>
      <div class="aq-key-field">
        <rc-input type="password" label="Key" placeholder="Key (token)"></rc-input>
        <rc-text-button name="save">Save</rc-text-button>
      </div>
      <div class="aq-key-state">
        <span name="state"></span>
        <rc-text-button link data-event="airQualityKeyRemove" name="remove">Remove the key</rc-text-button>
      </div>
      <div class="aq-key-note">The key is kept in this browser, on this computer only: give it again in another
        browser or on another computer.</div>`)
    this.elInput = this.element.querySelector('rc-input')
    this.elState = this.element.querySelector('[name="state"]')
    this.elRemove = this.element.querySelector('[name="remove"]')
    this.observeDom(this.elInput, 'keydown', 'keyTyped')
    this.observeDom(this.element.querySelector('[name="save"]'), 'click', 'saveClicked')
    this.listen(['airQualityKeyRemove', 'secretChanged'])
    this.#state()
  }

  keyTyped (e) { if (e.key === 'Enter') { this.saveClicked() } }

  // saves the typed key
  saveClicked () {
    const token = (this.elInput._component?.value ?? '').trim()
    if (token === '') { return }
    secrets.set(SECRET, token)
    if (this.elInput._component !== undefined) { this.elInput._component.value = '' }
    this.emit('dropdownClose', {})
  }

  airQualityKeyRemoveDispatched () { secrets.remove(SECRET) }

  secretChangedDispatched ({name}) { if (name === SECRET) { this.#state() } }

  #state () {
    const token = secrets.get(SECRET)
    this.elState.textContent = token === null ? 'No key stored.' : `Key stored: ••••${token.slice(-4)}`
    if (token === null) { this.elRemove.setAttribute('disabled', '') } else { this.elRemove.removeAttribute('disabled') }
  }
}
WComponent.define('air-quality-key', AirQualityKey)

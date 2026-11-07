# SoundBank

Class `SoundBank` · group `utils` · source [`src/utils/sound.mjs`](../../src/utils/sound.mjs)

Sounds that can be played by name.

## Methods

### constructor(sources, {context, cache = buffers} = {})

| Parameter | Type | Description |
| --- | --- | --- |
| `sources` | Object<string, string> | `{name: address}`. |
| `options` | object |  |
| `options.context` | AudioContext | The audio context (default: the one of the page); for the tests. |
| `options.cache` | Map | The decoded sounds, shared by address (default: the cache of the page); for the tests. |

### get loaded

The names of the sounds ready to be played.

### async load()

Loads and decodes every sound (once for the page).

**Returns** `Promise<void>` Resolved when every sound is loaded, or could not be (a warning in the console).

### unlock()

Allows the sound: to call in the handler of a click (the browser plays nothing before a gesture of the user).

### play(name, {volume = 1} = {})

Plays a sound (nothing when muted, or when the sound is not loaded).

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | The name of the sound. |
| `options` | {volume: number} | The volume, from 0 to 1 (default 1). |

### stop()

Stops the sounds being played by this bank.

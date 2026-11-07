# sound

Module `sound` · group `utils` · source [`src/utils/sound.mjs`](../../src/utils/sound.mjs)

The sounds of a game, with the Web Audio API: each file is loaded and decoded once for the page, then played as
often as needed, several at the same time, without any pool of `<audio>` elements to size.

```javascript
import {SoundBank} from 'ricochet/ricochet-utils.mjs'

const sounds = new SoundBank({shot: '/assets/game/shot.wav', boom: '/assets/game/boom.mp3'})
sounds.load()                    // at once: the sounds are ready when the game needs them
startButton.onclick = () => {
  sounds.unlock()                // in a click: the browser allows the sound from now on
  …
}
sounds.play('shot', {volume: 0.8})
sounds.muted = true              // the sound setting of the game
```

- **Loading.** `load()` fetches and decodes every file; a file shared by several banks, or a bank created again
  (the view of the game mounted again), is not fetched twice. A sound not loaded yet, or that could not be loaded,
  is silent: the game never waits for its sounds.
- **The first click.** A browser plays no sound before a gesture of the user: `unlock()`, called in a click (the
  one that starts the game), allows them for the whole page.
- **One audio context** for the page, created at the first need.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `SoundBank` | class | Sounds that can be played by name. |

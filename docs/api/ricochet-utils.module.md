# ricochet-utils

Module `ricochet-utils` · group `entry` · source [`src/ricochet-utils.mjs`](../../src/ricochet-utils.mjs)

The entry point of the utilities: dates, texts, numbers, random numbers, noise, complex numbers, identifiers,
debounce and throttle. They are apart from the kernel (`ricochet.mjs`): an application may use its own utilities,
or a library it knows, and never load these.

```javascript
import {today, addMonths, clamp, random, debounce} from 'ricochet/ricochet-utils.mjs'
```

Their names follow the libraries most developers know: lodash and es-toolkit (`clamp`, `deburr`, `upperFirst`,
`uniqueId`, `debounce`), `MathUtils` of Three.js (`lerp`, `damp`, `mapLinear`, `degToRad`), date-fns and
`Temporal` for the dates (`addMonths`, `parseDate`, ISO dates). Where the language already does the work, the
pages say which native function to use (`structuredClone`, `Intl.NumberFormat`…).

Each module stays importable alone (`ricochet/utils/date.mjs`…), and its page of the [API reference](README.md)
is the reference.

| Export | Module |
| --- | --- |
| `today`, `isValidDate`, `parseDate`, `formatDate`, `toIsoDate`, `fromDate`, `toDate`, `compareDates`, `addDays`, `addMonths`, `addYears`, `differenceInDays`, `dateDifference`, `dayOfWeek`, `startOfWeek`, `startOfMonth`, `isLeapYear`, `getDaysInMonth`, `splitDuration`, `formatDuration`, `convertDate` | [date](date.module.md) |
| `deburr`, `foldCase`, `upperFirst`, `truncateMiddle`, `countWords`, `indexesOf`, `urlHost`, `formatNumber` | [string](string.module.md) |
| `clamp`, `isBetween`, `approxEqual`, `lerp`, `inverseLerp`, `mapLinear`, `damp`, `smoothstep`, `smootherstep`, `cosineInterpolate`, `sigmoid`, `degToRad`, `radToDeg`, `euclideanModulo`, `roundTo`, `splitNumber`, `isPowerOfTwo`, `isNumber`, `toNumber` | [math](math.module.md) |
| `Random`, `random`, `entropy` | [random](random.module.md) |
| `PerlinNoise`, `ValueNoise` | [noise](noise.module.md) |
| `Complex` | [complex](complex.module.md) |
| `djb2`, `djb2String`, `sha256` | [hash](hash.module.md) |
| `clearObject`, `removeWhere`, `removeUnordered`, `firstOf` | [collection](collection.module.md) |
| `IdGenerator`, `createIdGenerator`, `uniqueId` | [id](id.module.md) |
| `debounce`, `throttle`, `promiseState` | [timing](timing.module.md) |

The utilities for the DOM and the Markdown (`escapeHtml`, `unescapeHtml`, `sanitizeHtml`, `markdownToHtml`…) are
part of the kernel: the components use them. They are exported by `ricochet.mjs`.

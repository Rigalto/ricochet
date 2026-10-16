# Refonte SweetHome — décisions retenues

Référence pour les sessions de travail. La version faisant foi pour le kernel est `docs/DESIGN.md` du dépôt
`Rigalto/ricochet` ; ce document la résume et ajoute les décisions propres à SweetHome.

## Ricochet (kernel public, https://github.com/Rigalto/ricochet)

**Principe fondateur : tout est un événement.** Un composant ne communique avec l'application et son environnement
que par des événements : il les reçoit, fait son travail (y compris sur ses propres nœuds du DOM), en émet d'autres.
Il n'appelle jamais un autre composant et ne sait pas qui écoute. Sources : souris, clavier, window, attributs,
items de configuration, enregistrements de données (locaux ou distants), bus, boucle de frames, micro-tâches,
tâches programmées.

- **Trois moments pour un événement** : maintenant (synchrone), dans le temps libre de la frame (micro-tâche, dans un
  budget), plus tard (tâche programmée, en temps de jeu ou temps réel). L'écouteur ne sait pas lequel a servi ; un
  traitement long est différé par l'écouteur lui-même.
- Micro-tâches et tâches programmées portent un **nom d'événement + payload**, jamais une référence de fonction.
  Priorité et coût sont déclarés une fois, dans une table, par le module qui fait le travail.
- Elles sont annulées au détachement du composant qui les a créées. À échéance égale : ordre de création.
- **Un seul bus synchrone** (Map nom → écouteurs), sans allocation par envoi ; remplace le bus à base de
  `CustomEvent` (qui était déjà synchrone). Les événements du DOM restent en périphérie.
- **Boucle de frames** : horloge + tâches programmées, `update`, `render` (application), micro-tâches avec le budget
  restant. Elle ne tourne que si un jeu la retient ou si des files ne sont pas vides. Budget = fraction de la durée
  de frame mesurée (écrans 120 Hz). Bureautique et canvas temps réel coexistent dans la même page.
- Modules prévus : `core/bus.mjs`, `core/microtasker.mjs`, `core/scheduler.mjs`, `core/clock.mjs`, `core/loop.mjs`,
  inspirés de Sixty-Below (EventBus, MicroTasker, TaskScheduler, TimeManager) mais avec l'API de Ricochet.
- Pas de Virtual DOM ; Custom Elements natifs en light DOM, sans Shadow DOM ni `is="…"` ; préfixe `rc-` (ex-`mui-`).
- Zéro dépendance, zéro compilation ; un besoin de librairie passe par un point d'injection (`setSanitizer()`).
- Kernel entièrement en anglais (code, commentaires, doc).
- Imports relatifs dans le kernel ; préfixe `ricochet/` via import map dans les applications ; un module = une URL.
- Distribution : sous-module, copie ou CDN épinglé ; jamais via le site Pages de Ricochet.
- Documentation générée depuis les blocs `/** */` (`tools/doc.mjs`, hook pre-commit), en Markdown restreint
  (`docs/MARKDOWN.md`) ; stimuli dans une table *Interface* ; pas de détection automatique pour l'instant.
- Tests unitaires pour les modules du kernel (Node, outil de test repris de Sixty-Below).
- Migration : anciens noms conservés en façades `@deprecated`, retirées en fin de migration. Un garde-fou (façade,
  redirection d'import map) est retiré quand : plus aucune référence (recherche sur un fragment du nom), test local
  sans lui, une mise en production sans incident.
- Navigateurs : Safari d'abord, Chrome et Edge ; Firefox si possible.

## SweetHome (application)

- Code sur GitHub (Pages), données dans Google Drive : tableurs (`cnf`, `grp`, `lnk`, attributs des fiches, un
  onglet par cible), un fichier `.md` par fiche pour le champ texte. Drive est la référence ; IndexedDB sert de cache
  et d'index (recherche plein texte locale). Synchronisation entre ordinateurs via l'API *Changes* de Drive.
- Jusqu'à la bascule : déploiement manuel chez l'hébergeur (`www/server/` pour le serveur Express, `www/sweethome/`
  pour l'application) ; développement local avec `dev-server.mjs` (relais de l'API, pas de CORS).
- Tests unitaires seulement pour des algorithmes précis.
- Sixty-Below reste indépendant de Ricochet.

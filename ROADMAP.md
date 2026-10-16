# Les dépendances à couper avant d’extraire

| Fichier du kernel | Importe depuis l’application | Solution |
| --- | --- | --- |
| web-ajax.mjs | credentials (/credential.mjs) | le chemin AJAX devient un paramètre de configuration du kernel (ricochet.configure({ajaxPath})) |
|web-util.mjs | Range (com-vector.mjs) | déplacer Range dans utils/, ou retirer de web-util ce qui l’utilise |
| mui-input.mjs, mui-textarea.mjs | validationPattern (config/com-param-misc.mjs) | un registre de motifs dans le kernel, que l’application remplit au démarrage |
| mui-select.mjs | ajaxCardController, ajaxGroupController (com-data.mjs) | garder dans le kernel un mui-select générique (options statiques, yesno, enumere) ; les variantes group et cards vont dans l’application, en sous-classe |

---

# importmap

Pour la transition sans toucher aux 114 modules de SweetHome : une import map peut aussi remapper des chemins absolus. Dans index.html de SweetHome :

```html
<script type="importmap">
{
  "imports": {
    "/components/web-components/web-wcomponent.mjs": "/ricochet/src/core/w-component.mjs",
    "/components/mui-components/": "/ricochet/src/ui/"
  }
}
</script>
```
---

# Corrections à apporter

* Faire de credential.js une entrée explicite du .gitignore.

* messages d'erreur de iconset.mjs à traduire en anglais.
* Le détachement repose sur un MutationObserver global et asynchrone : un élément déplacé dans le DOM perd son composant, et les écouteurs DOM ne sont jamais retirés. C'est la cause probable du double clickDatasetHandler sur mui-icon-button. Comment: _je pense que la fonction 'detach' est faite pour cela, elle est sensée détacher automatiquement les handlers. A tester avant d'agir._
* _detach : remplacer this._webKeyboardController… par component._webKeyboardController….
* #eventDebug : ne sérialiser le détail que si debug.eventbus est actif ; passer debug.eventbus à false par défaut.
* observeAttributes : ajouter attributeFilter: observedAttributes ; rendre observeAttributes et observeWindowEvents sûrs en cas de double appel.
* Retirer les écouteurs DOM au détachement (un AbortController par composant), ce qui devrait éliminer le double clickDatasetHandler.
* Échapper les valeurs dans mui-select (htmlEscape) et observer exclude.
* Passer les imports du kernel en chemins relatifs par import map (préalable aux deux dépôts).

* doubleClickHandler retarde tout simple clic de 400 ms ; l'événement natif dblclick (ou event.detail === 2) évite cette latence quand le double clic est rare.
* data-param est stocké en JSON dans un attribut et reparsé à chaque clic ; sans gravité, mais une propriété JavaScript sur l'élément serait plus directe.
* Observation de class — mui-select observe l'attribut class pour recopier disabled et text-xxx sur le select interne : chaque bascule de classe sur l'hôte déclenche un traitement. Une propriété disabled explicite serait plus nette.
* Chargements par instance — chaque mui-select avec group ou cards appelle ajaxGroupController._load / ajaxCardController._load ; à vérifier que le cache du proxy évite bien les requêtes dupliquées quand une vue en affiche plusieurs.
* La logique de WController (bus, items, timers, animation) peut passer dans un mixin partagé par WController et WElement, pour ne l'écrire qu'une fois. Comment: pourquoi un mixim et non un héritage comme dans le kernel de départ ?

Défauts dans web-wcomponent.mjs
* Clavier jamais libéré — _detach() est statique et teste this._webKeyboardControllerModule et this._webKeyboardControllerView : this y désigne la classe WComponent, pas le composant détaché. Les touches d'un module ou d'une vue restent donc enregistrées jusqu'à ce qu'un autre composant les remplace.
* Appels non idempotents — observeWindowEvents re-lie this[handler] à chaque appel : un second appel perd la référence du premier écouteur, qui ne sera jamais retiré. Même chose pour observeAttributes, qui crée un nouveau MutationObserver sans déconnecter le précédent.
* Détachement différé — le MutationObserver traite les retraits en microtâche : un élément retiré puis réinséré (déplacement, tri) est détaché alors qu'il est de nouveau dans la page, sans être remonté automatiquement.

---

# Corrections faites

* Ajout d'un fichier `.nojekyll` à la racine de chaque dépôt : sans lui, Pages ignore les fichiers et dossiers commençant par _.
* Ajout d'un fichier `.gitattributes` garde au hook des fins de ligne Unix.
* Création d'un serveur de test en local :
`node C:\Users\dcabu\Documents\alwaysdata\www\sweethome\dev-server.mjs`
* Environnement de création automatique de la documentation :
`git config core.hooksPath .githooks`

---

# Points à noter

* Déterminer comment sera réalisée la documentation automatique
* Pages exige des dépôts publics (offre gratuite) et limite un site à 1 Go : img/ (1,1 Go) doit partir vers Drive avant la publication.
* L'identifiant OAuth Google devra autoriser l'origine https://rigalto.github.io (et http://localhost pour le développement).

---

# Aborescence cible

```
ricochet/
├── README.md
├── LICENSE
├── ricochet.svg
├── .gitignore
├── .nojekyll              ← sans lui, Pages ignore les fichiers commençant par « _ »
├── index.html             ← page d'accueil Pages : présentation + démonstration
│
├── src/                   ← tout ce qu'une application importe
│   ├── ricochet.mjs       ← point d'entrée unique, qui ré-exporte l'API publique
│   ├── core/
│   │   ├── w-controller.mjs   ← bus, items, timers, animation (extrait de web-wcomponent)
│   │   ├── w-component.mjs    ← liaison as="…", render, détachement
│   │   ├── w-element.mjs      ← plus tard : le pont Custom Elements
│   │   ├── keyboard.mjs       ← WebKeyboardController
│   │   ├── config.mjs         ← WebConfigController + WebConfigTriggered
│   │   ├── debug.mjs          ← logs, compteurs memoryLeak, surcharges de console
│   │   └── global.mjs         ← crée window.$global s'il n'existe pas
│   ├── storage/
│   │   ├── http.mjs           ← l'actuel web-ajax + WebConfigAjax
│   │   └── (drive.mjs, indexeddb.mjs plus tard)
│   ├── ui/                ← les mui-*.mjs et mui-styled.mjs
│   ├── icons/
│   │   └── iconset.mjs        ← l'actuel com-iconset
│   ├── utils/             ← web-util découpé : dates, strings, random, objects…
│   └── css/
│       ├── base.css
│       └── palette.css
│
├── demo/                  ← petits exemples autonomes (le compteur du README, etc.)
└── docs/                  ← la documentation extraite des commentaires par votre utilitaire
```

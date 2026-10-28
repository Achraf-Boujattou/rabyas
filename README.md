# RABYAS

Application de gestion de stock et de suivi des équipements télécoms, composée
d’une API Express/MySQL et d’une interface React.

## Organisation du dépôt

```text
rabyas/
├── backend/
│   ├── src/
│   │   ├── app.js                 # Configuration Express, middleware et routes
│   │   ├── server.js              # Connexion MySQL et démarrage HTTP
│   │   ├── config/                # Configuration des dépendances externes
│   │   ├── controllers/           # Traitement des requêtes et réponses API
│   │   ├── middleware/            # Authentification et autorisations
│   │   ├── models/                # Utilisateurs, inventaire et fournisseurs
│   │   ├── routes/                # Endpoints d’authentification, inventaire et fournisseurs
│   │   └── seed.js                # Initialisation du compte administrateur
│   ├── .env.example               # Modèle de configuration local
│   └── package.json
├── frontend/
│   ├── public/                    # Fichiers statiques, dont le favicon RABYAS
│   ├── src/
│   │   ├── api/                   # Client HTTP Axios
│   │   ├── components/            # Composants réutilisables et mise en page
│   │   ├── context/               # État partagé (authentification)
│   │   ├── pages/                 # Écrans associés aux routes
│   │   ├── App.jsx                # Routes de l’application
│   │   ├── index.css              # Styles globaux et Tailwind
│   │   └── main.jsx               # Point d’entrée React
│   ├── .env.example
│   └── package.json
├── .gitignore                     # Règles communes aux deux applications
└── README.md
```

## Prérequis

- Node.js et npm
- MySQL

## Installation et lancement

### API

Depuis la racine du dépôt :

```powershell
Set-Location .\backend
Copy-Item .env.example .env
npm install
```

Renseignez dans `backend/.env` les paramètres MySQL, une clé JWT longue et
unique, et les identifiants de l’administrateur initial. Créez la base de
données indiquée par `DB_NAME`, puis initialisez le compte et démarrez l’API :

```powershell
npm run seed
npm run dev
```

L’API utilise `PORT` (5001 dans l’exemple) et expose `/api/health`.

L’interface propose un mode clair et un mode sombre, accessibles depuis la
barre supérieure et l’écran de connexion. Le choix est enregistré localement
dans le navigateur.

### Inventaire

Le module est accessible aux rôles `admin` et `magasinier` depuis le menu
**Articles**. Les techniciens sont refusés côté interface et côté API.

- `GET/POST /api/articles` : catalogue paginé, recherche, filtre catégorie et CRUD.
- `GET /api/articles/stock` : stock courant calculé à partir du journal.
- `GET /api/articles/stock/low-stock` : articles sous le seuil minimum.
- `GET/POST /api/equipements`, `PUT/DELETE /api/equipements/:id` : équipements
  sérialisés, recherche, pagination et filtres de catégorie/état.
- `GET/POST /api/mouvements` : historique paginé et filtrable (type, article,
  dépôt, jour choisi) et enregistrement immuable des entrées, sorties et transferts.
- `POST /api/mouvements/:id/annulation` : annule un mouvement en créant un
  mouvement inverse ; un mouvement déjà annulé ne peut pas l’être à nouveau.
- Les transferts exigent un dépôt source et un dépôt destination différents ;
  les quantités sont vérifiées avant de déplacer le stock. Pour les articles
  sérialisés, le mouvement cible un numéro de série et met à jour son dépôt.
- Les mouvements ne peuvent pas être modifiés ni supprimés. Au démarrage,
  l’API ajoute aux tables de mouvements existantes les colonnes nécessaires aux
  dépôts, à l’utilisateur et aux annulations inverses.

Une sortie ne peut pas rendre le stock négatif. La création d’un équipement
sérialisé enregistre son entrée initiale. Les suppressions d’équipements sont
archivées pour préserver l’historique ; les articles associés à des mouvements
ne sont pas supprimables.

Les nouvelles tables utilisent les noms `catalogue_articles`,
`equipements_serialises` et `mouvements_articles` afin de ne pas modifier les
anciennes tables éventuellement présentes dans la base.
Au prochain démarrage de l’API, le `sequelize.sync()` existant crée les tables
manquantes ; les données d’anciennes tables ne sont pas migrées automatiquement.

### Fournisseurs et commandes

Le module **Fournisseurs** est réservé aux rôles `admin` et `magasinier`.
Il permet de gérer les fournisseurs, les commandes d’approvisionnement et les
réceptions partielles ou complètes. Une réception crée ses mouvements d’entrée
et ses équipements sérialisés dans la même transaction MySQL.

- `GET/POST /api/fournisseurs` : liste paginée, recherche et création.
- `GET/PUT/DELETE /api/fournisseurs/:id` : consultation, modification et suppression.
- `GET/POST /api/fournisseurs/commandes` : liste paginée, recherche, filtre par
  statut et création de commandes en brouillon.
- `GET/PUT/DELETE /api/fournisseurs/commandes/:id` : consultation, modification
  et suppression (seuls les brouillons sont modifiables/supprimables).
- `POST /api/fournisseurs/commandes/:id/reception` : réception partielle ou
  complète, avec numéros de série obligatoires pour les articles concernés.

### Affectations

Le module **Affectations** permet aux administrateurs et magasiniers d’attribuer
des articles à un technicien, un client ou un site, puis d’enregistrer leur
retour complet. Les clients et sites sont identifiés par un nom libre ; les
techniciens sont liés à leur compte utilisateur.

- `GET /api/affectations` : historique paginé et filtrable par bénéficiaire,
  statut et numéro de série. Un technicien ne reçoit que ses propres affectations.
- `GET /api/affectations/techniciens` : liste des techniciens actifs pour le
  formulaire d’attribution (admin et magasinier).
- `POST /api/affectations` : crée une affectation et les mouvements de sortie
  correspondants dans une transaction. Le stock est vérifié par dépôt et les
  numéros de série sont requis pour les articles sérialisés.
- `POST /api/affectations/:id/retour` : enregistre le retour complet, crée les
  mouvements d’entrée de type retour et met à jour l’état/emplacement des
  équipements sérialisés dans une transaction.

Les administrateurs et magasiniers peuvent créer et retourner les affectations.
Les techniciens disposent d’une vue en lecture seule **Mes affectations**.

### Interface web

Dans un deuxième terminal :

```powershell
Set-Location .\frontend
Copy-Item .env.example .env
npm install
npm run dev
```

`VITE_API_URL` doit pointer vers l’API, par défaut
`http://localhost:5001/api`. En développement, les origines HTTP `localhost`
et `127.0.0.1` sont acceptées sur les ports locaux. En production, renseignez
`CLIENT_URL` avec l’origine exacte du frontend.

## Vérifications

Dans `frontend/` :

```powershell
npm run lint
npm run build
```

Dans `backend/`, vérifiez la syntaxe des fichiers JavaScript avec
`npm run check`. Une suite de tests automatisés backend n’est pas encore
configurée.

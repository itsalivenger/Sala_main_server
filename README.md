# SALA Main Server - Operations Layer

Serveur backend central pour la plateforme SALA, gérant les applications Client et Livreur.

## Modules Core

### 1. Système Financier (Wallet Service)
- **Architecture de Ledger :** Système de comptabilité basé sur des transactions immuables pour une traçabilité totale.
- **Conformité ACID :** Utilisation des sessions MongoDB/Mongoose pour garantir l'intégrité des données financières lors des virements et ajustements.
- **Settings Dynamiques :** Gestion des marges plateforme et des seuils de retrait via l'endpoint Admin.

### 2. Authentification & Sécurité
- Authentification basée sur les numéros de téléphone avec vérification OTP.
- Sécurisation des routes via JWT (JSON Web Tokens).
- Middleware de protection (`protect`) pour valider les identités Livreur et Admin.

### 3. Service des Livrateurs
- Gestion complète du cycle de vie des livreurs (Inscription, Vérification, Suspension).
- Système de gestion de documents (Stockage des URLs).
- Suivi des informations de véhicule.

### 4. Support & Réclamations
- Gestion des tickets de support client et livreur.
- Historique des messages entre l'utilisateur et l'équipe opérationnelle.

### 5. Configuration & Paramètres SALA
- Gestion des constantes opérationnelles (Frais, Marges, Limites véhicules).
- **Documentation technique :** Voir [SETTINGS_README.md](./SETTINGS_README.md).

## Stack Technique
- **Runtime :** Node.js
- **Framework :** Express.js
- **Base de données :** MongoDB avec Mongoose.
- **Langage :** TypeScript.

## Installation & Lancement

```bash
# Installation des dépendances
npm install

# Lancement en mode développement
npm run dev
```

## Variables d'Environnement (.env)
```env
PORT=5000
MONGO_URI=mongodb://...
JWT_SECRET=votre_secret
```

## Structure du Dossier `src`
- `controllers/` : Logique métier divisée par domaine (livreur, admin, client).
- `models/` : Schémas Mongoose (Livreur, Wallet, Transaction, PlatformSettings, Admin).
- `middleware/` : Auth, Error handling.
- `routes/` : Définition des endpoints API.
- `services/` : Logique complexe (ex: walletService.ts).
- `app.ts` : Configuration Express.
- `server.ts` : Point d'entrée du serveur.

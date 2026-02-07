# Logique de Gestion des Modèles de Véhicules

Cette fonctionnalité permet aux administrateurs de gérer une liste prédéfinie de modèles de véhicules que les livreurs peuvent sélectionner lors de leur inscription ou de la mise à jour de leur profil.

## Architecture Technique

### 1. Modèle de Données (Backend)
Un nouveau schéma Mongoose `VehicleModel` a été créé pour stocker les modèles.
- **name**: Nom du modèle (unique, ex: "Yamaha T-Max").
- **type**: Catégorie du véhicule, limitée à trois types :
  - `moto`
  - `petite_vehicule` (Petits véhicules/voitures)
  - `grande_vehicule` (Grands véhicules/camions)

### 2. API REST (Backend)
Les points de terminaison suivants ont été implémentés sous `/api/admin/vehicle-models` :
- `GET /` : Récupère la liste de tous les modèles, triés par date de création.
- `POST /` : Ajoute un nouveau modèle (vérifie l'unicité du nom).
- `DELETE /:id` : Supprime un modèle existant.

### 3. Interface Utilisateur (Frontend)
L'onglet **"Autres"** a été ajouté dans la section Configuration de l'administration.
- **Composant `OtherSettings`** : Gère l'état local des modèles, les formulaires d'ajout et les actions de suppression.
- **Design System** : Utilise des icônes dynamiques (`Bike`, `Car`, `Truck`) selon le type de véhicule pour une meilleure reconnaissance visuelle.
- **Animations** : Intégration de `framer-motion` pour des transitions fluides lors de l'ajout ou de la suppression de modèles.

## Utilisation Futures
Ces modèles servent de source de vérité pour les applications mobiles (Client et Livreur). Lors de l'inscription d'un livreur, au lieu de saisir manuellement le modèle, il pourra choisir parmi cette liste filtrée par type de véhicule, assurant ainsi la cohérence des données dans toute la plateforme SALA.

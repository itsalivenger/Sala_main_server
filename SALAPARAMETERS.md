# Paramètres de la Plateforme SALA

Ce document répertorie tous les paramètres de configuration globaux de la plateforme SALA, stockés dans la collection `PlatformSettings`. Ils sont divisés par domaine d'impact.

---

## 🚚 Tarification & Logistique
Ces variables déterminent le calcul des prix de livraison et les marges de la plateforme.

| Paramètre | Description | Unité |
|-----------|-------------|-------|
| `delivery_base_price` | Frais de livraison forfaitaires minimum. | Cents (MAD * 100) |
| `delivery_price_per_km` | Frais additionnels par kilomètre parcouru. | Cents (MAD * 100) |
| `delivery_price_per_weight_unit` | Frais additionnels par unité de poids. | Cents (MAD * 100) |
| `weight_unit_kg` | La référence pour l'unité de poids (défaut: 1kg). | Kg |
| `platform_margin_percentage` | La commission de SALA sur chaque commande. | % |
| `minimum_payout_amount` | Seuil minimum pour que le livreur puisse demander un versement. | Cents (MAD * 100) |

---

## 👤 Espace Client
Configuration de l'expérience utilisateur et des promotions pour les clients.

| Paramètre | Description | Unité |
|-----------|-------------|-------|
| `min_order_value` | Valeur minimale du panier pour passer une commande. | Cents (MAD * 100) |
| `first_order_discount` | Remise appliquée automatiquement à la 1ère commande. | Cents (MAD * 100) |
| `referral_bonus_amount` | Bonus accordé pour le parrainage d'un nouvel utilisateur. | Cents (MAD * 100) |
| `free_delivery_threshold` | Montant du panier à partir duquel la livraison est offerte. | Cents (MAD * 100) |
| `support_target_minutes` | Temps de réponse cible pour le support client. | Minutes |

---

## 🛵 Espace Livreur
Configuration opérationnelle et limites pour la flotte de livreurs.

| Paramètre | Description | Unité |
|-----------|-------------|-------|
| `min_funds_withdrawal` | Solde minimum requis dans le wallet pour un retrait. | Cents (MAD * 100) |
| `radius_max_km` | Rayon maximal autour du point de vente pour l'affichage des commandes. | Km |
| `min_rating_to_work` | Note minimale qu'un livreur doit maintenir pour être actif. | 0.0 - 5.0 |
| `max_active_orders` | Nombre maximal de commandes simultanées pour un livreur. | Entier |

### 📦 Limites Physiques & Tarifs (Vehicle Limits)
Capacités maximales au-delà desquelles le véhicule ne peut plus prendre la commande. Ces valeurs sont aussi utilisées pour la **logique de matching** : si une commande dépasse les limites d'une Moto, elle est automatiquement assignée à une Voiture.

- **Moto (Bike)**: 
  - `max_weight`: Poids total maximal des articles (Kg). 
  - `max_volume`: Volume total maximal (m³). Idéal pour petits colis/sacs.
  - `base_price`: Frais de base spécifiques pour la moto (MAD).
- **Voiture (Car)**: 
  - `max_weight`: Poids total maximal (Kg). 
  - `max_volume`: Volume total maximal (m³). Convient pour les courses moyennes ou fragiles.
  - `base_price`: Frais de base spécifiques pour la voiture (MAD).
- **Camionnette (Truck)**: 
  - `max_weight`: Poids total maximal (Kg). 
  - `max_volume`: Volume total maximal (m³). Pour les articles encombrants ou lourds.
  - `base_price`: Frais de base spécifiques pour le camion (MAD).

---

## 🔗 Intégration & Récupération (Fetching)

To use these values in other applications or services of the SALA ecosystem:

### 📡 API Endpoints
- **Admin App**: The parameters are retrieved via `GET /api/admin/wallet/settings`.
- **Livreur App**: The limits and base rates are sent upon login or via order details if necessary.

### 💻 Code Backend (Node.js/Mongoose)
To retrieve the parameters directly from the main server:
```typescript
import PlatformSettings from './models/PlatformSettings';

const settings = await PlatformSettings.findOne();
const bikeLimit = settings.livreur.vehicle_limits.bike.max_weight; // Used for matching logic
const bikeBasePrice = settings.livreur.vehicle_limits.bike.base_price;
```

### 🛠️ Structure de Données (JSON)
The `PlatformSettings` document follows this tree structure for vehicle limits and rates:
```json
{
  "livreur": {
    "vehicle_limits": {
      "bike": { "max_weight": 10, "max_volume": 0.1, "base_price": 15 },
      "car": { "max_weight": 100, "max_volume": 1, "base_price": 30 },
      "truck": { "max_weight": 1000, "max_volume": 10, "base_price": 100 }
    },
    "max_active_orders": 3
  }
}
```

---

*Dernière mise à jour : 02 Février 2026*


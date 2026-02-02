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

### ⚖️ Seuils de Matching (Logique de Sélection de Véhicule)
Ces seuils déterminent quand le système doit proposer un véhicule de catégorie supérieure, même si le poids/volume n'atteint pas encore la limite physique stricte. Cela permet d'assurer une marge de sécurité et d'optimiser le confort du livreur.

| Paramètre | Description | Unité |
|-----------|-------------|-------|
| `bike_weight_threshold` | Si poids > seuil, la commande est orientée vers une Voiture. | Kg |
| `bike_volume_threshold` | Si volume > seuil, la commande est orientée vers une Voiture. | m³ |
| `car_weight_threshold` | Si poids > seuil, la commande est orientée vers un Camion. | Kg |
| `car_volume_threshold` | Si volume > seuil, la commande est orientée vers un Camion. | m³ |

### 📦 Limites Physiques Strictes (Vehicle Limits)
Capacités maximales réelles au-delà desquelles le véhicule ne peut plus prendre la commande. Ces valeurs sont utilisées pour le filtrage dur dans les algorithmes de matching.

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

Pour utiliser ces valeurs dans d'autres applications ou services de l'écosystème SALA :

### 📡 API Endpoints
- **Admin App**: Les paramètres sont récupérés via `GET /api/admin/wallet/settings`.
- **Livreur App**: Les limites et tarifs de base sont envoyés lors de la connexion ou via les détails de la commande si nécessaire.

### 💻 Code Backend (Node.js/Mongoose)
Pour récupérer les paramètres directement depuis le serveur principal :
```typescript
import PlatformSettings from './models/PlatformSettings';

const settings = await PlatformSettings.findOne();
const bikeLimit = settings.livreur.vehicle_limits.bike.max_weight;
const bikeBasePrice = settings.livreur.vehicle_limits.bike.base_price;
```

### 🛠️ Structure de Données (JSON)
Le document `PlatformSettings` suit cette arborescence pour les limites et tarifs par véhicule :
```json
{
  "livreur": {
    "vehicle_limits": {
      "bike": { "max_weight": 10, "max_volume": 0.1, "base_price": 15 },
      "car": { "max_weight": 100, "max_volume": 1, "base_price": 30 },
      "truck": { "max_weight": 1000, "max_volume": 10, "base_price": 100 }
    },
    "bike_weight_threshold": 10,
    "bike_volume_threshold": 0.1,
    "car_weight_threshold": 100,
    "car_volume_threshold": 1
  }
}
```

---

*Dernière mise à jour : 02 Février 2026*


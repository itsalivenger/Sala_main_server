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
Détermine quel type de véhicule peut voir quelle commande en fonction de la charge.

| Paramètre | Description | Unité |
|-----------|-------------|-------|
| `bike_weight_threshold` | Si poids > seuil, la commande passe en catégorie supérieure (Voiture). | Kg |
| `bike_volume_threshold` | Si volume > seuil, la commande passe en catégorie supérieure (Voiture). | m³ |
| `car_weight_threshold` | Si poids > seuil, la commande passe en catégorie supérieure (Camion). | Kg |
| `car_volume_threshold` | Si volume > seuil, la commande passe en catégorie supérieure (Camion). | m³ |

### 📦 Limites Physiques (Vehicle Limits)
Capacités maximales strictes par type de véhicule.
- **Moto (Bike)**: `max_weight` (Kg), `max_volume` (m³)
- **Voiture (Car)**: `max_weight` (Kg), `max_volume` (m³)
- **Camionnette (Truck)**: `max_weight` (Kg), `max_volume` (m³)

---

## ⚙️ Limites de la Plateforme
| Paramètre | Description | Unité |
|-----------|-------------|-------|
| `max_categories` | Nombre maximal de catégories de produits actives autorisées. | Entier |

---

*Dernière mise à jour : 22 Janvier 2026*

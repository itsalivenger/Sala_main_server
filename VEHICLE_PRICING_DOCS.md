# Vehicle-Specific Pricing Documentation

## Overview
We have transitioned from global pricing settings to **vehicle-specific pricing** for distance (KM) and weight. This allows fine-grained control over delivery costs based on the vehicle type (Moto, Voiture, Camionnette).

## Data Structure
The `PlatformSettings` schema has been updated. Global fields `delivery_price_per_km` and `delivery_price_per_weight_unit` have been **removed**.

Pricing is now located within `livreur.vehicle_limits[vehicleType]`.

### Schema Example
```typescript
interface VehicleLimit {
    max_weight: number;
    max_volume: number;
    base_price: number;
    price_per_km: number;       // New Field
    price_per_weight: number;   // New Field
}

interface PlatformSettings {
    // ...
    livreur: {
        vehicle_limits: {
            bike: VehicleLimit;
            car: VehicleLimit;
            truck: VehicleLimit;
        }
    }
}
```

## How to Fetch Pricing

When calculating delivery fees in other apps or services, you must:
1.  **Fetch Platform Settings**: Retrieve the settings document.
2.  **Determine Vehicle Type**: Logic based on order weight/volume (e.g., if weight > 10kg, use Car).
3.  **Access Specific Rates**:

```typescript
// Example: Calculating price for a specific vehicle type
const settings = await PlatformSettings.findOne(); // Fetch from DB
const { livreur } = settings;

const vehicleType = 'bike'; // or 'car', 'truck' based on logic

const pricePerKm = livreur.vehicle_limits[vehicleType].price_per_km || 5;
const pricePerWeight = livreur.vehicle_limits[vehicleType].price_per_weight || 5;
const basePrice = livreur.vehicle_limits[vehicleType].base_price || 15;

// Calculation
const distanceFee = distanceInKm * pricePerKm;
const weightFee = totalWeight * pricePerWeight;
const totalDeliveryFee = basePrice + distanceFee + weightFee;
```

## Default Values
If `price_per_km` or `price_per_weight` are missing (e.g., immediately after migration before admin update), you should fallback to reasonable defaults (e.g., 5 MAD).

## Admin Configuration
These values are configurable in the **Admin Dashboard > Settings > Sala Settings** under the "Limites par Véhicule" section.

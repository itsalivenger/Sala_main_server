# Vehicle-Specific Pricing Documentation

## Overview
We have transitioned from global pricing settings to **vehicle-specific pricing** for distance (KM) and weight (KG). This allows fine-grained control over delivery costs based on the vehicle type (Moto, Voiture, Camionnette).

## Data Structure
The `PlatformSettings` schema has been updated.
- **Removed Global Fields**: `delivery_price_per_km`, `delivery_price_per_weight_unit`, `delivery_base_price`, and `weight_unit_kg`.
- **New Structure**: Pricing is now located within `livreur.vehicle_limits[vehicleType]`.

### Schema Example
```typescript
interface VehicleLimit {
    max_weight: number;      // Maximum weight allowed for this vehicle
    max_volume: number;      // Maximum volume allowed for this vehicle
    base_price: number;      // Starting price for delivery
    price_per_km: number;    // Price per Kilometer
    price_per_weight: number;// Price per KG
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
const pricePerWeight = livreur.vehicle_limits[vehicleType].price_per_weight || 5; // Price per KG
const basePrice = livreur.vehicle_limits[vehicleType].base_price || 15;

// Calculation
const distanceFee = distanceInKm * pricePerKm;
const weightFee = totalWeightInKg * pricePerWeight;
const totalDeliveryFee = basePrice + distanceFee + weightFee;
```

## Validation & Defaults
- Ensure you handle cases where `vehicle_limits` might be missing specific fields during migration by using defaults (e.g., `|| 0`).
- The system assumes weight is in **KG** and volume in **m³**.

## Admin Configuration
These values are configurable in the **Admin Dashboard > Settings > Sala Settings** under the "Limites par Véhicule" section.

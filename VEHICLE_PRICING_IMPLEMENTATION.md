# Backend Implementation: Vehicle-Specific Base Prices

This document describes how the vehicle-specific base pricing and volume calculation are implemented in the SALA backend.

## 1. Database Schema (`PlatformSettings.ts`)

The `PlatformSettings` model has been updated to include a `base_price` field for each vehicle type within the `vehicle_limits` object.

```typescript
vehicle_limits: {
    bike: { max_weight: number; max_volume: number; base_price: number };
    car: { max_weight: number; max_volume: number; base_price: number };
    truck: { max_weight: number; max_volume: number; base_price: number };
}
```

## 2. Pricing Logic (`orderController.ts`)

The `calculateOrderPricing` function now performs the following steps:

### A. Total Weight and Volume Calculation
The system iterates through all items in the order. Volume is calculated for each item using its dimensions (stored in the Product model) converted to cubic meters (m³).

```typescript
const itemVol = (item.dimensions.length * item.dimensions.width * item.dimensions.height) / 1000000;
totalVolume += itemVol * item.quantity;
```

### B. Vehicle Type Determination
Based on the `totalWeight` and `totalVolume`, the system determines the required vehicle type by comparing them against the platform's logic thresholds (`bike_weight_threshold`, `car_weight_threshold`, etc.).

```typescript
let vehicleType: 'bike' | 'car' | 'truck' = 'bike';
if (totalWeight > l.car_weight_threshold || totalVolume > l.car_volume_threshold) {
    vehicleType = 'truck';
} else if (totalWeight > l.bike_weight_threshold || totalVolume > l.bike_volume_threshold) {
    vehicleType = 'car';
}
```

### C. Base Price Application
The `baseFee` is then selected based on the determined `vehicleType`.

```typescript
const baseFee = l.vehicle_limits[vehicleType].base_price || settings.delivery_base_price;
```

## 3. Configuration via Admin UI

Admins can configure these base prices through the "Limites par Véhicule" section in the SALA Parameters page of the Admin Dashboard. These values are saved directly into the `PlatformSettings` collection in MongoDB.

## 4. Summary of Data flow

1. **Client** requests a price preview or creates an order.
2. **Backend** fetches `PlatformSettings`.
3. **Backend** calculates order `totalWeight` and `totalVolume`.
4. **Backend** determines `vehicleType` and applies its `base_price`.
5. **Backend** adds distance fees and weight fees to calculate the final `deliveryFee`.

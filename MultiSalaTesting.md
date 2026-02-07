# Multi-SALA (SSU) Logistics Guide

This document explains the new "Standard Shipping Unit" (SSU) logic for Sala, which simplifies delivery pricing and efforts for both the platform and the Livreurs.

## 1. What is an Logistics Unit?
An **Logistics Unit** is a logical container that represents a manageable delivery load for a single vehicle (usually a bike).

Instead of guessing vehicle types, the system now splits an order into multiple units if it exceeds:
- **Max Weight**: ~5kg (`max_weight_per_unit`)
- **Max Volume**: ~0.03 m³ (30L) (`max_volume_per_unit`)

## 2. Calculation Logic
When a client creates an order:
1. The total weight and total volume of all items are calculated.
2. The system determines how many units are needed:
   - `weightUnits = totalWeight / max_weight_per_unit`
   - `volumeUnits = totalVolume / max_volume_per_unit`
   - `unitCount = max(1, weightUnits, volumeUnits)`

## 3. Livreur Payment & Effort
- **1 Unit**: Standard delivery effort.
- **2 Units**: Equivalent to carrying two full bags. The delivery fee is increased based on a multiplier (`pricing_multiplier`).
- **LivreurNet**: The entire delivery fee (calculated per unit) is currently passed to the Livreur.

## 4. Testing for Livreurs
- Large orders (e.g., 20kg of flour) will now show as `ssuCount: 4`.
- Bulky orders (e.g., multiple packs of water/paper towels) will trigger higher SSU counts.
- You can verify the `ssuCount` field in the `Order` object returned by the API.

## 5. Visual Indicators (Debug Mode)
During development/testing, the Client App checkout will show a debug modal with:
- **Weight SSUs**: How many bags based on weight.
- **Volume SSUs**: How many bags based on space.
- **Pricing Multiplier**: The extra cost factor applied.
- **Base Fee**: The cost per unit.

---
*Generated for Livreur App Development & Integration Testing.*

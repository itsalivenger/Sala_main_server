# Simplified Checkout Process Documentation

This document outlines the changes made to the Sala Client App checkout process to simplify the user experience and implement full localization.

## 1. Pickup Point Removal
The "Point de retrait" (Pickup Point) logic has been completely removed from the checkout flow to simplify the UX.

### How it was removed (For Livreur App Developer):
To mirror these changes in the Livreur app or any other service:
1. **Component Props**: Removed `pickupLocation` from `MainContainer` and `CheckoutScreen` component interfaces.
2. **State Management**: Deleted any state variables that stored the selected pickup point.
3. **Price Calculation**: In `cartService.calculatePricing`, the `pickupLocation` is now passed as `null`. The backend logic should handle `null` by treating it as a "freedom" order (where the picker determines the pickup location dynamically).
4. **Order Submission**: In `handlePlaceOrder`, the `orderData` object now sets `pickupLocation: null` explicitly before sending to the API.
5. **UI Cleanup**: Removed the entire mapping and selection section for "Point de retrait". The "Itinerary" now only contains the "Point de livraison".

## 2. Localization (i18next)
The entire checkout and order flow are now fully localized using `react-i18next`. Supported languages: **French (FR), English (EN), Arabic (AR)**.

### Sub-screens Updated:
- **Checkout Screen**: Labels, vehicle types, alerts, and summaries.
- **Order Tracking**: Real-time status, timeline, map labels, and confirmation modals.
- **History/Orders Screen**: Status badges, date/time formatting, and empty states.
- **Order Details**: Full financial breakdown and order history timeline.

## 3. Delivery Format Update
The "Format de livraison" (Delivery Format) now displays only the vehicle type, translated into the active language:
- **Moto** (Motorcycle/Bike)
- **Voiture** (Car)
- **Camion** (Truck)

## 4. Technical Changes
- **Modified**: `src/screens/CheckoutScreen.tsx`
- **Modified**: `src/screens/MainContainer.tsx` (Prop management simplified)
- **Modified**: `src/screens/OrderTrackingScreen.tsx`
- **Modified**: `src/screens/HistoryScreen.tsx`
- **Modified**: `src/screens/OrderDetailView.tsx`
- **Updated**: `src/i18n/translations/*.json` with exhaustive keys for orders/tracking.

## 5. Deployment Notes
Ensure that the backend is notified if it still expects a `pickupLocation` object. In the current implementation, `pickupLocation` is sent as `null` to indicate a "Freedom Buy" or direct delivery order where the picker is not tied to a specific pre-defined store.

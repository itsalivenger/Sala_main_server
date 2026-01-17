# SALA Platform Settings - Developer Guide

This document explains the implementation of the global platform parameters (Paramètres SALA) to ensure future developers can maintain and expand the system.

## 🏗️ Architecture

The system follows a standard Mongoose-Express-React flow but uses a "Single Document" pattern for global configuration.

### 1. Backend Layer

-   **Model**: [`PlatformSettings.ts`](file:///c:/Users/aliho/Desktop/projects/sala_project/Sala_site/salla/Sala_main_server/src/models/PlatformSettings.ts)
    -   Stores all operational constants (fees, margins, limits).
    -   Organized into `livreur` and `client` sub-objects.
    -   **Important**: Currency values (like `min_order_value`) are stored in **Cents** (Integers) to avoid floating-point precision issues. Multiply by 100 on save, divide by 100 on display.
-   **Service**: [`walletService.ts`](file:///c:/Users/aliho/Desktop/projects/sala_project/Sala_site/salla/Sala_main_server/src/services/walletService.ts)
    -   The `getPlatformSettings()` method ensures a default document is created if the collection is empty.
    -   This service should be injected whenever an operation needs to know a limit (e.g., checking if a livreur can withdraw).
-   **Controller**: [`admin/walletController.ts`](file:///c:/Users/aliho/Desktop/projects/sala_project/Sala_site/salla/Sala_main_server/src/controllers/admin/walletController.ts)
    -   The `updateSettings` method uses `Object.assign(settings, req.body)`. Because Mongoose supports nested updates, sending a partial or full nested object from the frontend correctly updates the specific fields.

### 2. Frontend Layer

-   **Page**: [`settings/page.tsx`](file:///c:/Users/aliho/Desktop/projects/sala_project/Sala_site/salla/app/admin/%28dashboard%29/settings/page.tsx)
    -   Manages the "Paramètres SALA" tab.
-   **Component**: [`SalaSettings.tsx`](file:///c:/Users/aliho/Desktop/projects/sala_project/Sala_site/salla/app/admin/%28dashboard%29/settings/_components/SalaSettings.tsx)
    -   Fetches data from `GET /api/admin/wallet/settings`.
    -   Uses local state to track deep nesting.
    -   Handles the MAD/Cents conversion for financial fields.

## 🚀 How to add a new parameter

1.  **Backend**: Add the field to the `IPlatformSettings` interface and the `PlatformSettingsSchema` in [`PlatformSettings.ts`](file:///c:/Users/aliho/Desktop/projects/sala_project/Sala_site/salla/Sala_main_server/src/models/PlatformSettings.ts).
2.  **Backend (Optional)**: If you want a default value for new installations, update [`walletService.ts`](file:///c:/Users/aliho/Desktop/projects/sala_project/Sala_site/salla/Sala_main_server/src/services/walletService.ts).
3.  **Frontend**: Add an input field (using the `InputField` helper) in [`SalaSettings.tsx`](file:///c:/Users/aliho/Desktop/projects/sala_project/Sala_site/salla/app/admin/%28dashboard%29/settings/_components/SalaSettings.tsx).
4.  **Frontend**: Link the input to the `settings` state using the `setSettings` updater.

## 🛡️ Database Verification
To verify that values are saved:
- Values are stored in the `PlatformSettings` collection in MongoDB.
- Every `save()` call updates the `updatedAt` timestamp.
- The backend `express.json()` middleware allows the controller to receive the nested JSON correctly.

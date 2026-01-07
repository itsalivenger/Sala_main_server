# SALA Product Catalog & Category System

This document outlines the structure, logic, and development guidelines for the SALA catalog system.

## 1. Data Models

### Products (`Admins` collection in MongoDB)
The product model is designed for a centralized catalog where inventory and pricing are decoupled from basic product info.

- **Weight Class**: enum `['NORMAL', 'HEAVY', 'FRAGILE', 'LIQUID']`. This is used by the pricing engine to calculate delivery fees.
- **Dimensions**: Stores `length`, `width`, and `height` in cm.
- **Images**: An array of full URLs pointing to the server's uploads directory.
- **Status**: `isActive` is used for visibility. `isAvailable` is for legacy client support.

### Categories (`Categories` collection)
- **Slug**: Automatically generated from the name via a pre-save hook.
- **Strict Management**: Products only reference category names. To ensure data integrity, categories should be managed via the dedicated `/api/admin/categories` routes.

## 2. Image Storage
Images are stored locally on the server:
- **Directory**: `Sala_main_server/public/uploads`
- **Access**: Served via static middleware at `/uploads`.
- **Naming**: Original names are sanitized or timestamped during upload.

## 3. Business Rules
1. **No Manual Pricing**: Product prices are not edited directly in the admin. They are calculated dynamically by weight-based rules during order placement.
2. **Audit Logging**: Every create, update, or delete action MUST be logged in the `AuditLog` collection.
3. **Identity**: Admin controllers must use `req.user.id` (extracted from JWT) to identify the person performing the action.

## 4. API Reference
- `GET /api/admin/catalog/products`: Paginated list with search and filters.
- `POST /api/admin/catalog/products`: Create product.
- `DELETE /api/admin/catalog/products/:id`: Permanent removal.
- `GET /api/admin/categories`: Fetch all categories for selection.

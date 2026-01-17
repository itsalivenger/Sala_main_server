# Livreur Location Tracking API - Mobile Developer Guide

This document explains how to integrate real-time GPS tracking for livreurs in the SALA mobile application.

## 📍 Endpoint Details

- **URL**: `POST /api/livreur/profile/location`
- **Authentication**: Required (Bearer Token)
- **Content-Type**: `application/json`

### Request Body Format

```json
{
  "lat": 33.5731,
  "lng": -7.5898
}
```

- `lat` (Number): Latitude of the device.
- `lng` (Number): Longitude of the device.

## 🛠️ Implementation Requirements

### 1. Update Frequency
To balance battery consumption and tracking accuracy, we recommend the following frequencies:
- **Active Order**: Every **30 seconds**.
- **Online (No Order)**: Every **2 minutes**.
- **Offline**: Do not send updates.

### 2. Error Handling
- **401 Unauthorized**: User session has expired. Redirect to login.
- **500 Server Error**: Log internally, do not show to the user, retry on the next interval.

### 3. Background Execution
The app should continue to send these updates when in the background if the livreur is "Online", as the admin needs to see their position for order dispatching.

## 🚀 Example (React Native / Axios)

```javascript
const updateLivreurLocation = async (latitude, longitude) => {
  try {
    const token = await AsyncStorage.getItem('user_token');
    await axios.post(`${BASE_URL}/api/livreur/profile/location`, {
      lat: latitude,
      lng: longitude
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    console.error('Location sync failed', error);
  }
};
```

---
**Note for Backend Integration**: Ensure the `lastLocation.timestamp` is updated on the server to detect "stale" drivers in the dashboard.

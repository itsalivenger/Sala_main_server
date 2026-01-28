/**
 * Routing Utilities using OSRM (Open Source Routing Machine)
 * Replicates the logic from the client app for server-side use.
 */

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

export interface RouteInfo {
    distance: number; // in meters
    duration: number; // in seconds
}

/**
 * Fetches the shortest road distance between two points using OSRM.
 * @param start { lat: number, lng: number }
 * @param end { lat: number, lng: number }
 * @returns Promise<RouteInfo>
 */
export const getRoadDistance = async (
    start: { lat: number, lng: number },
    end: { lat: number, lng: number }
): Promise<RouteInfo> => {
    if (!start || !end || !start.lat || !start.lng || !end.lat || !end.lng) {
        return { distance: 0, duration: 0 };
    }

    try {
        // OSRM expects {longitude},{latitude}
        const url = `${OSRM_BASE_URL}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'SALA-Server/1.0'
            }
        });

        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            return {
                distance: route.distance || 0,
                duration: route.duration || 0
            };
        } else {
            console.warn('[Routing] No road route found or OSRM error:', data.code);
            // Return 0 if not found, caller should handle fallback if needed
            return { distance: 0, duration: 0 };
        }
    } catch (error) {
        console.error('[Routing] Error calling OSRM API:', error);
        return { distance: 0, duration: 0 };
    }
};

/**
 * Fallback Haversine formula (straight line) in case OSRM fails or is unavailable.
 */
export const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

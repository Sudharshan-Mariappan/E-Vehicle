import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useGeolocation hook
 * Uses navigator.geolocation.watchPosition for the most accurate reading.
 * Also exposes setManualLocation() so the user can click on the map to correct it.
 */

const FALLBACK_LAT = 11.101667;
const FALLBACK_LNG = 76.965556;
const FALLBACK_ADDRESS = 'Sri Ramakrishna Engineering College, Vattamalaipalayam, Coimbatore, Tamil Nadu';

const reverseGeocode = async (lat, lng) => {
    try {
        const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!key || key === 'your_google_maps_api_key_here') return null;

        const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results.length > 0) {
            const locality = data.results.find(r =>
                r.types.includes('sublocality_level_1') ||
                r.types.includes('locality') ||
                r.types.includes('neighborhood')
            );
            return (locality || data.results[0]).formatted_address;
        }
    } catch (err) {
        console.warn('Reverse geocoding failed:', err);
    }
    return null;
};

const useGeolocation = () => {
    const [location, setLocation] = useState({
        lat: FALLBACK_LAT,
        lng: FALLBACK_LNG,
        address: FALLBACK_ADDRESS,
        accuracy: null,
        loading: true,
        error: null,
        isManual: false,
    });

    const watchIdRef = useRef(null);
    const bestAccuracyRef = useRef(Infinity);
    const manualRef = useRef(false); // If true, stop GPS overriding

    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocation(prev => ({
                ...prev,
                loading: false,
                error: 'Geolocation not supported.',
            }));
            return;
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        manualRef.current = false;
        bestAccuracyRef.current = Infinity;

        setLocation(prev => ({ ...prev, loading: true, error: null, isManual: false }));

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (manualRef.current) return;

                const { latitude, longitude, accuracy } = position.coords;
                bestAccuracyRef.current = accuracy;

                // Set location immediately so the map loads fast
                setLocation({
                    lat: latitude,
                    lng: longitude,
                    address: `${latitude.toFixed(5)}°N, ${longitude.toFixed(5)}°E`,
                    accuracy: Math.round(accuracy),
                    loading: false,
                    error: null,
                    isManual: false,
                });

                // Fetch address in background
                reverseGeocode(latitude, longitude).then(address => {
                    if (address && !manualRef.current) {
                        setLocation(prev => ({ ...prev, address }));
                    }
                });

                // Optional: watch for updates
                watchIdRef.current = navigator.geolocation.watchPosition(
                    (newPos) => {
                        if (manualRef.current) return;
                        const newAcc = newPos.coords.accuracy;
                        if (newAcc < bestAccuracyRef.current) {
                            bestAccuracyRef.current = newAcc;
                            
                            setLocation(prev => ({
                                ...prev,
                                lat: newPos.coords.latitude,
                                lng: newPos.coords.longitude,
                                address: `${newPos.coords.latitude.toFixed(5)}°N, ${newPos.coords.longitude.toFixed(5)}°E`,
                                accuracy: Math.round(newAcc)
                            }));

                            reverseGeocode(newPos.coords.latitude, newPos.coords.longitude).then(newAddr => {
                                if (newAddr && !manualRef.current) {
                                    setLocation(prev => ({ ...prev, address: newAddr }));
                                }
                            });
                        }
                    },
                    () => {},
                    { enableHighAccuracy: true, maximumAge: 10000 }
                );
            },
            (err) => {
                if (manualRef.current) return;
                console.warn('Geolocation error:', err.message);
                setLocation({
                    lat: FALLBACK_LAT,
                    lng: FALLBACK_LNG,
                    address: FALLBACK_ADDRESS,
                    accuracy: null,
                    loading: false,
                    error: 'Location access denied. Using default. Click on the map to set your location.',
                    isManual: false,
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, []);

    // Allow the user to manually set their location (e.g., by clicking the map)
    const setManualLocation = useCallback((lat, lng) => {
        manualRef.current = true;

        // Stop watching GPS since user set location manually
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        setLocation({
            lat,
            lng,
            address: `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`,
            accuracy: 0, // Manual = exact
            loading: false,
            error: null,
            isManual: true,
        });

        reverseGeocode(lat, lng).then(address => {
            if (address) setLocation(prev => ({ ...prev, address }));
        });
    }, []);

    useEffect(() => {
        getLocation();
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [getLocation]);

    return { ...location, refresh: getLocation, setManualLocation };
};

export default useGeolocation;

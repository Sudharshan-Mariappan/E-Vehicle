import { useEffect, useRef, useState } from 'react';

// Google Maps API key — set in .env as VITE_GOOGLE_MAPS_API_KEY
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

/**
 * MapView component
 * Renders an interactive Google Map with station markers.
 */
const MapView = ({ userLocation, stations, selectedStation, onSelectStation, onSetLocation, directionTarget, onRouteCalculated }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const userMarkerRef = useRef(null);
    const accuracyCircleRef = useRef(null);
    const directionsRendererRef = useRef(null);
    const [isReady, setIsReady] = useState(false);

    // Initialize map
    useEffect(() => {
        // If no key, don't even try to initialize
        if (!MAPS_API_KEY || MAPS_API_KEY === 'your_google_maps_api_key_here') return;

        const init = () => {
            if (!window.google || !mapRef.current || mapInstanceRef.current) return;

            try {
                mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
                    center: { lat: userLocation.lat, lng: userLocation.lng },
                    zoom: 12,
                    styles: [
                        { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
                        { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1117' }] },
                        { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
                        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3748' }] },
                        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
                        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                    ],
                    disableDefaultUI: false,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                    mapId: 'DEMO_MAP_ID', // Required for advanced markers if used
                });

                // Click on map to set your exact location
                mapInstanceRef.current.addListener('click', (e) => {
                    if (onSetLocation && e.latLng) {
                        onSetLocation(e.latLng.lat(), e.latLng.lng());
                    }
                });

                // Initialize DirectionsRenderer
                directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                    map: mapInstanceRef.current,
                    suppressMarkers: true,
                    polylineOptions: {
                        strokeColor: '#60a5fa',
                        strokeWeight: 5,
                        strokeOpacity: 0.8,
                    },
                });

                setIsReady(true);
            } catch (err) {
                console.error('Map initialization error:', err);
            }
        };

        if (window.google) {
            init();
        } else {
            // Check periodically if google is loaded (fallback if loadGoogleMaps promise isn't enough)
            const interval = setInterval(() => {
                if (window.google) {
                    init();
                    clearInterval(interval);
                }
            }, 500);
            return () => clearInterval(interval);
        }
    }, [userLocation.lat, userLocation.lng]); // Re-init center if location changes and map not yet created

    // Update user location marker + accuracy circle
    useEffect(() => {
        if (!isReady || !mapInstanceRef.current || !window.google) return;

        try {
            if (userMarkerRef.current) {
                userMarkerRef.current.setMap(null);
            }
            if (accuracyCircleRef.current) {
                accuracyCircleRef.current.setMap(null);
            }

            const pos = { lat: userLocation.lat, lng: userLocation.lng };

            userMarkerRef.current = new window.google.maps.Marker({
                position: pos,
                map: mapInstanceRef.current,
                title: userLocation.isManual
                    ? '📍 Your Location (set by you)'
                    : `📍 Your Location (accuracy: ~${userLocation.accuracy || '?'}m)`,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: userLocation.isManual ? '#22c55e' : '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                },
                zIndex: 1000,
                draggable: true,
            });

            // Allow dragging the marker to set exact location
            userMarkerRef.current.addListener('dragend', (e) => {
                if (onSetLocation) {
                    onSetLocation(e.latLng.lat(), e.latLng.lng());
                }
            });

            // Show accuracy circle if GPS (not manual)
            if (userLocation.accuracy && userLocation.accuracy > 0 && !userLocation.isManual) {
                accuracyCircleRef.current = new window.google.maps.Circle({
                    center: pos,
                    radius: userLocation.accuracy,
                    map: mapInstanceRef.current,
                    strokeColor: '#4285F4',
                    strokeOpacity: 0.3,
                    strokeWeight: 1,
                    fillColor: '#4285F4',
                    fillOpacity: 0.1,
                });
            }

            mapInstanceRef.current.panTo(pos);
        } catch (err) {
            console.error('Error updating user marker:', err);
        }

        return () => {
            if (userMarkerRef.current) {
                userMarkerRef.current.setMap(null);
                userMarkerRef.current = null;
            }
            if (accuracyCircleRef.current) {
                accuracyCircleRef.current.setMap(null);
                accuracyCircleRef.current = null;
            }
        };
    }, [isReady, userLocation.lat, userLocation.lng, userLocation.accuracy, userLocation.isManual]);

    // Update station markers
    useEffect(() => {
        if (!isReady || !mapInstanceRef.current || !window.google) return;

        // Clear old markers
        markersRef.current.forEach((m) => {
            try { m.setMap(null); } catch (e) { }
        });
        markersRef.current = [];

        stations.forEach((station) => {
            try {
                const available = parseInt(station.available_slots) || 0;
                const total = parseInt(station.total_slots) || 0;
                const ratio = total > 0 ? available / total : 0;
                const color = ratio === 0 ? '#ef4444' : ratio < 0.5 ? '#f59e0b' : '#22c55e';

                const marker = new window.google.maps.Marker({
                    position: { lat: parseFloat(station.latitude), lng: parseFloat(station.longitude) },
                    map: mapInstanceRef.current,
                    title: station.name,
                    icon: {
                        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                        fillColor: color,
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 1.5,
                        scale: selectedStation?.id === station.id ? 2.2 : 1.8,
                        anchor: new window.google.maps.Point(12, 22),
                    },
                });

                const infoWindow = new window.google.maps.InfoWindow({
                    content: `
            <div style="background:#1a1f2e;color:#e2e8f0;padding:12px;border-radius:8px;min-width:200px;font-family:Inter,sans-serif">
              <div style="font-weight:700;margin-bottom:6px">${station.name}</div>
              <div style="font-size:12px;color:#94a3b8;margin-bottom:8px">${station.address}</div>
              <div style="display:flex;gap:8px;font-size:12px">
                <span style="color:${color};font-weight:600">${available}/${total} slots</span>
                <span style="color:#00d4aa">₹${station.price_per_kwh}/kWh</span>
              </div>
            </div>
          `,
                });

                marker.addListener('click', () => {
                    infoWindow.open(mapInstanceRef.current, marker);
                    onSelectStation(station);
                });

                markersRef.current.push(marker);
            } catch (err) {
                console.error('Error adding station marker:', err);
            }
        });

        return () => {
            markersRef.current.forEach((m) => {
                try { m.setMap(null); } catch (e) { }
            });
        };
    }, [isReady, stations, selectedStation?.id, onSelectStation]);

    // Pan to selected station
    useEffect(() => {
        if (!isReady || !mapInstanceRef.current || !selectedStation) return;
        try {
            mapInstanceRef.current.panTo({
                lat: parseFloat(selectedStation.latitude),
                lng: parseFloat(selectedStation.longitude),
            });
            mapInstanceRef.current.setZoom(15);
        } catch (e) { }
    }, [isReady, selectedStation?.id]);

    // Handle Route Directions
    useEffect(() => {
        if (!isReady || !window.google || !directionsRendererRef.current) return;

        if (!directionTarget) {
            directionsRendererRef.current.setDirections({ routes: [] });
            return;
        }

        const directionsService = new window.google.maps.DirectionsService();

        directionsService.route(
            {
                origin: { lat: userLocation.lat, lng: userLocation.lng },
                destination: { lat: parseFloat(directionTarget.latitude), lng: parseFloat(directionTarget.longitude) },
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (response, status) => {
                if (status === 'OK' && response) {
                    directionsRendererRef.current.setDirections(response);

                    const leg = response.routes[0].legs[0];
                    if (onRouteCalculated) {
                        onRouteCalculated({
                            distance: leg.distance.text,
                            duration: leg.duration.text
                        });
                    }
                } else {
                    console.error('Directions request failed due to ' + status);
                    if (onRouteCalculated) {
                        onRouteCalculated(null);
                    }
                }
            }
        );
    }, [isReady, directionTarget, userLocation.lat, userLocation.lng, onRouteCalculated]);

    // Show placeholder if no API key or not configured
    if (!MAPS_API_KEY || MAPS_API_KEY === 'your_google_maps_api_key_here') {
        return (
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg)', color: 'var(--text-muted)',
                gap: '1rem',
                padding: '2rem'
            }}>
                <i className="fas fa-map-marked-alt" style={{ fontSize: '4rem', opacity: 0.3 }} />
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 600, color: '#f59e0b' }}>Maps API Key Required</p>
                    <p style={{ fontSize: '0.85rem', maxWidth: '300px', margin: '0.5rem auto' }}>
                        Please add your <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>client/.env</code> and restart the app.
                    </p>
                    <div style={{
                        marginTop: '1.5rem',
                        fontSize: '0.8rem',
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        textAlign: 'left'
                    }}>
                        <strong>Steps:</strong>
                        <ol style={{ marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
                            <li>Get key from Google Cloud Console</li>
                            <li>Open <code>client/.env</code></li>
                            <li>Update <code>VITE_GOOGLE_MAPS_API_KEY</code></li>
                            <li>Save and the map will load</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }} />
            {isReady && !userLocation.isManual && (
                <div style={{
                    position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '8px 16px',
                    borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                    pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
                    backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)',
                }}>
                    📍 Click on the map or drag the blue marker to set your exact location
                </div>
            )}
        </div>
    );
};

// Load Google Maps script dynamically
export const loadGoogleMaps = () => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key || key === 'your_google_maps_api_key_here' || window.google) return Promise.resolve();

    return new Promise((resolve, reject) => {
        // Prevent multiple script loads
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = () => {
            console.error('Failed to load Google Maps script');
            reject();
        };
        document.head.appendChild(script);
    });
};

export default MapView;

// Global variables
let chargingStations = [];
let map;
let markers = [];
let currentSession = null;
let districts = [];
let localAreas = [];
let landmarks = [];
let currentFilter = {
    state: '',
    district: '',
    local_area: '',
    search_query: ''
};
let searchTimeout;

let userLocation = {
    lat: 11.0168, // Default to Coimbatore
    lng: 76.9558,
    address: "Coimbatore, Tamil Nadu"
};

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const RAZORPAY_KEY_ID = 'your_razorpay_key_id'; // Replace with your actual Razorpay Key ID

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();
    initializeMap();
});

// DOM Elements
const locationInput = document.getElementById('locationInput');
const searchBtn = document.getElementById('searchBtn');
const recommendedStationDiv = document.getElementById('recommendedStation');
const alternativeStationsDiv = document.getElementById('alternativeStations');
const modal = document.getElementById('stationModal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.querySelector('.close');

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Set default location
    locationInput.value = userLocation.address;

    // Load districts and stations from database
    loadDistricts();
    loadStationsFromDatabase();
}

// Load districts from database
async function loadDistricts() {
    try {
        const response = await fetch(`${API_BASE_URL}/districts`);
        if (response.ok) {
            districts = await response.json();
            populateStateFilter();
        } else {
            console.error('Failed to load districts from database');
            // Fallback to sample districts
            loadSampleDistricts();
        }
    } catch (error) {
        console.error('Error loading districts:', error);
        loadSampleDistricts();
    }
}

// Load stations from database
async function loadStationsFromDatabase() {
    try {
        const response = await fetch(`${API_BASE_URL}/stations`);
        if (response.ok) {
            chargingStations = await response.json();
            findRecommendedStation();
            displayAlternativeStations();
            updateMapMarkers();
        } else {
            console.error('Failed to load stations from database');
            // Fallback to sample data
            loadSampleData();
        }
    } catch (error) {
        console.error('Error loading stations:', error);
        // Fallback to sample data
        loadSampleData();
    }
}

// Load stations by district
async function loadStationsByDistrict(district) {
    try {
        const response = await fetch(`${API_BASE_URL}/stations/district/${encodeURIComponent(district)}`);
        if (response.ok) {
            chargingStations = await response.json();
            findRecommendedStation();
            displayAlternativeStations();
            updateMapMarkers();
        } else {
            console.error('Failed to load stations by district');
            loadStationsFromDatabase();
        }
    } catch (error) {
        console.error('Error loading stations by district:', error);
        loadStationsFromDatabase();
    }
}

// Load stations by state
async function loadStationsByState(state) {
    try {
        const response = await fetch(`${API_BASE_URL}/stations/state/${encodeURIComponent(state)}`);
        if (response.ok) {
            chargingStations = await response.json();
            findRecommendedStation();
            displayAlternativeStations();
            updateMapMarkers();
        } else {
            console.error('Failed to load stations by state');
            loadStationsFromDatabase();
        }
    } catch (error) {
        console.error('Error loading stations by state:', error);
        loadStationsFromDatabase();
    }
}

// Fallback sample districts
function loadSampleDistricts() {
    districts = [
        { district: 'Chennai', state: 'Tamil Nadu', station_count: 2 },
        { district: 'Coimbatore', state: 'Tamil Nadu', station_count: 5 },
        { district: 'Madurai', state: 'Tamil Nadu', station_count: 3 },
        { district: 'Trichy', state: 'Tamil Nadu', station_count: 2 }
    ];
    populateStateFilter();
}

// Fallback sample data
function loadSampleData() {
    chargingStations = [
        {
            station_id: 1,
            station_name: "Kovai Power Hub",
            distance: 1.2,
            available_chargers: 4,
            total_chargers: 6,
            status: "Active",
            address: "Avinashi Road, Peelamedu, Coimbatore",
            city: "Coimbatore",
            district: "Coimbatore",
            state: "Tamil Nadu",
            local_area: "Peelamedu",
            landmark: "PSG Tech",
            pincode: "641004",
            phone: "+91 98765 43210",
            rating: 4.8,
            price_per_kwh: 12.50,
            amenities: ["WiFi", "Restrooms", "Coffee Shop"],
            latitude: 11.0247,
            longitude: 77.0101,
            operating_hours: "24/7",
            connector_types: ["Type 2", "CCS", "CHAdeMO"]
        },
        {
            station_id: 2,
            station_name: "Marina Eco-Charge",
            distance: 5.5,
            available_chargers: 3,
            total_chargers: 5,
            status: "Active",
            address: "Beach Road, Santhome, Chennai",
            city: "Chennai",
            district: "Chennai",
            state: "Tamil Nadu",
            local_area: "Santhome",
            landmark: "Marina Beach",
            pincode: "600004",
            phone: "+91 98765 43211",
            rating: 4.6,
            price_per_kwh: 11.80,
            amenities: ["WiFi", "Restrooms", "Food Court"],
            latitude: 13.0418,
            longitude: 80.2762,
            operating_hours: "24/7",
            connector_types: ["Type 2", "CCS"]
        },
        {
            station_id: 3,
            station_name: "Madurai Temple City Charge",
            distance: 2.1,
            available_chargers: 2,
            total_chargers: 4,
            status: "Active",
            address: "Meenakshi Amman Temple St, Madurai",
            city: "Madurai",
            district: "Madurai",
            state: "Tamil Nadu",
            local_area: "Madurai Central",
            landmark: "Meenakshi Temple",
            pincode: "625001",
            phone: "+91 98765 43212",
            rating: 4.4,
            price_per_kwh: 13.20,
            amenities: ["WiFi", "Restrooms"],
            latitude: 9.9195,
            longitude: 78.1193,
            operating_hours: "7:00 AM - 10:00 PM",
            connector_types: ["Type 2", "CHAdeMO"]
        }
    ];

    findRecommendedStation();
    displayAlternativeStations();
    updateMapMarkers();
}

// Populate state filter dropdown
function populateStateFilter() {
    const stateFilter = document.getElementById('stateFilter');
    if (!stateFilter) return;

    // Get unique states
    const uniqueStates = [...new Set(districts.map(d => d.state))];

    // Clear existing options except the first one
    stateFilter.innerHTML = '<option value="">Select State</option>';

    // Add state options
    uniqueStates.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateFilter.appendChild(option);
    });
}

// Populate district filter dropdown based on selected state
function populateDistrictFilter(selectedState) {
    const districtFilter = document.getElementById('districtFilter');
    if (!districtFilter) return;

    // Clear existing options except the first one
    districtFilter.innerHTML = '<option value="">Select District</option>';

    if (selectedState) {
        // Filter districts by state
        const stateDistricts = districts.filter(d => d.state === selectedState);

        // Add district options
        stateDistricts.forEach(district => {
            const option = document.createElement('option');
            option.value = district.district;
            option.textContent = `${district.district} (${district.station_count} stations)`;
            districtFilter.appendChild(option);
        });
    }
}

// Initialize Google Maps
function initializeMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    if (typeof google !== 'undefined' && google.maps) {
        try {
            map = new google.maps.Map(mapElement, {
                center: { lat: userLocation.lat, lng: userLocation.lng },
                zoom: 12,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ],
                mapId: 'DEMO_MAP_ID'
            });

            // Add user location marker
            addUserLocationMarker();

            // Add station markers
            updateMapMarkers();

            // Add click listener for map
            map.addListener('click', function (event) {
                // You can add functionality here if needed
            });
        } catch (err) {
            console.error('Google Maps initialization error:', err);
            showMapError(mapElement);
        }
    } else {
        console.error('Google Maps API not loaded');
        showMapError(mapElement);
    }
}

function showMapError(element) {
    element.innerHTML = `
        <div class="map-placeholder" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #1a1f2e; color: #94a3b8; text-align: center; padding: 20px;">
            <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
            <p style="font-weight: 600; color: #f59e0b; margin-bottom: 5px;">Google Maps API Required</p>
            <p style="font-size: 0.9rem;">Please check your API key and billing settings.</p>
        </div>
    `;
}

// Add user location marker
function addUserLocationMarker() {
    if (map && typeof google !== 'undefined') {
        const userMarker = new google.maps.Marker({
            position: { lat: userLocation.lat, lng: userLocation.lng },
            map: map,
            title: 'Your Location',
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="8" fill="#4285F4" stroke="white" stroke-width="2"/>
                        <circle cx="12" cy="12" r="3" fill="white"/>
                    </svg>
                `),
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 12)
            }
        });

        const userInfoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 10px;">
                    <h3 style="margin: 0 0 5px 0; color: #4285F4;">Your Location</h3>
                    <p style="margin: 0; font-size: 14px;">${userLocation.address}</p>
                </div>
            `
        });

        userMarker.addListener('click', function () {
            userInfoWindow.open(map, userMarker);
        });
    }
}

// Update map markers for charging stations
function updateMapMarkers() {
    if (!map || typeof google === 'undefined') return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    chargingStations.forEach(station => {
        const marker = new google.maps.Marker({
            position: { lat: parseFloat(station.latitude), lng: parseFloat(station.longitude) },
            map: map,
            title: station.station_name,
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="16" cy="16" r="12" fill="${station.available_chargers > 0 ? '#28a745' : '#dc3545'}" stroke="white" stroke-width="2"/>
                        <path d="M12 10h8v12h-8z" fill="white"/>
                        <path d="M14 12h4v2h-4z" fill="${station.available_chargers > 0 ? '#28a745' : '#dc3545'}"/>
                        <path d="M14 16h4v2h-4z" fill="${station.available_chargers > 0 ? '#28a745' : '#dc3545'}"/>
                        <path d="M14 20h4v2h-4z" fill="${station.available_chargers > 0 ? '#28a745' : '#dc3545'}"/>
                    </svg>
                `),
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 16)
            }
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 15px; max-width: 300px;">
                    <h3 style="margin: 0 0 10px 0; color: #2c3e50;">${station.station_name}</h3>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6c757d;">${station.address}</p>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                        <span style="color: ${station.available_chargers > 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">
                            ${station.available_chargers}/${station.total_chargers} Available
                        </span>
                        <span style="color: #28a745; font-weight: bold;">₹${station.price_per_kwh}/kWh</span>
                    </div>
                    <div style="margin: 8px 0;">
                        <span style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">
                            ⭐ ${station.rating}
                        </span>
                        <span style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 12px;">
                            📍 ${station.distance ? station.distance.toFixed(1) : 'N/A'} km
                        </span>
                    </div>
                    <button onclick="navigateToStation(${station.station_id})" 
                            style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; width: 100%; margin-top: 8px;">
                        Navigate
                    </button>
                </div>
            `
        });

        marker.addListener('click', function () {
            infoWindow.open(map, marker);
        });

        markers.push(marker);
    });
}

// Calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    locationInput.addEventListener('input', handleSearchInput);
    locationInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Add current location button event listener
    const currentLocationBtn = document.getElementById('currentLocationBtn');
    if (currentLocationBtn) {
        currentLocationBtn.addEventListener('click', getCurrentLocation);
    }

    // District filter event listeners
    const stateFilter = document.getElementById('stateFilter');
    const districtFilter = document.getElementById('districtFilter');
    const localAreaInput = document.getElementById('localAreaInput');
    const smartSearchBtn = document.getElementById('smartSearchBtn');
    const clearFilterBtn = document.getElementById('clearFilterBtn');

    if (stateFilter) {
        stateFilter.addEventListener('change', function () {
            currentFilter.state = this.value;
            populateDistrictFilter(this.value);
            loadLandmarks(this.value);
            // Reset district and local area filters when state changes
            if (districtFilter) {
                districtFilter.value = '';
                currentFilter.district = '';
            }
            if (localAreaInput) {
                localAreaInput.value = '';
                currentFilter.local_area = '';
            }
            hideSuggestions();
        });
    }

    if (districtFilter) {
        districtFilter.addEventListener('change', function () {
            currentFilter.district = this.value;
            loadLocalAreas(this.value);
            // Reset local area filter when district changes
            if (localAreaInput) {
                localAreaInput.value = '';
                currentFilter.local_area = '';
            }
            hideSuggestions();
        });
    }

    if (localAreaInput) {
        localAreaInput.addEventListener('input', handleLocalAreaInput);
        localAreaInput.addEventListener('focus', showLocalAreaSuggestions);
    }

    if (smartSearchBtn) {
        smartSearchBtn.addEventListener('click', handleSmartSearch);
    }

    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', clearAllFilters);
    }

    // Payment event listeners
    const payNowBtn = document.getElementById('payNowBtn');
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');

    if (payNowBtn) {
        payNowBtn.addEventListener('click', initiatePayment);
    }

    if (cancelPaymentBtn) {
        cancelPaymentBtn.addEventListener('click', cancelPayment);
    }

    closeModal.addEventListener('click', closeModalFunction);
    window.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeModalFunction();
        }
        // Hide suggestions when clicking outside
        if (!e.target.closest('.filter-section')) {
            hideSuggestions();
        }
    });
}

// Handle search input with debouncing
function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const query = locationInput.value.trim();
        if (query.length >= 2) {
            showSearchSuggestions(query);
        } else {
            hideSuggestions();
        }
    }, 300);
}

// Handle local area input
function handleLocalAreaInput() {
    const query = document.getElementById('localAreaInput').value.trim();
    if (query.length >= 2) {
        showLocalAreaSuggestions();
    } else {
        hideSuggestions();
    }
}

// Smart search function
async function handleSmartSearch() {
    const searchQuery = locationInput.value.trim();
    const localArea = document.getElementById('localAreaInput').value.trim();

    if (!searchQuery && !currentFilter.state && !currentFilter.district && !localArea) {
        alert('Please enter a search term or select filters to find stations.');
        return;
    }

    try {
        const params = new URLSearchParams();

        if (searchQuery) params.append('query', searchQuery);
        if (currentFilter.state) params.append('state', currentFilter.state);
        if (currentFilter.district) params.append('district', currentFilter.district);
        if (localArea) params.append('local_area', localArea);

        const response = await fetch(`${API_BASE_URL}/stations/search?${params}`);
        if (response.ok) {
            chargingStations = await response.json();
            findRecommendedStation();
            displayAlternativeStations();
            updateMapMarkers();

            // Update page title based on search
            let title = 'Search Results';
            if (currentFilter.district && localArea) {
                title = `Stations near ${localArea}, ${currentFilter.district}`;
            } else if (currentFilter.district) {
                title = `Stations in ${currentFilter.district}`;
            } else if (searchQuery) {
                title = `Stations matching "${searchQuery}"`;
            }
            updatePageTitle(title);

        } else {
            console.error('Failed to search stations');
            loadStationsFromDatabase();
        }
    } catch (error) {
        console.error('Error searching stations:', error);
        loadStationsFromDatabase();
    }
}

// Load local areas for a district
async function loadLocalAreas(district) {
    try {
        const response = await fetch(`${API_BASE_URL}/local-areas/${encodeURIComponent(district)}`);
        if (response.ok) {
            localAreas = await response.json();
        } else {
            console.error('Failed to load local areas');
            localAreas = [];
        }
    } catch (error) {
        console.error('Error loading local areas:', error);
        localAreas = [];
    }
}

// Load landmarks for a state/district
async function loadLandmarks(state, district = null) {
    try {
        const params = new URLSearchParams();
        if (state) params.append('state', state);
        if (district) params.append('district', district);

        const response = await fetch(`${API_BASE_URL}/landmarks?${params}`);
        if (response.ok) {
            landmarks = await response.json();
        } else {
            console.error('Failed to load landmarks');
            landmarks = [];
        }
    } catch (error) {
        console.error('Error loading landmarks:', error);
        landmarks = [];
    }
}

// Show search suggestions
function showSearchSuggestions(query) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;

    const suggestions = [];

    // Add landmark suggestions
    landmarks.forEach(landmark => {
        if (landmark.landmark.toLowerCase().includes(query.toLowerCase())) {
            suggestions.push({
                type: 'landmark',
                title: landmark.landmark,
                subtitle: `${landmark.local_area}, ${landmark.district}`,
                count: landmark.station_count,
                icon: 'fas fa-map-marker-alt'
            });
        }
    });

    // Add local area suggestions
    localAreas.forEach(area => {
        if (area.local_area.toLowerCase().includes(query.toLowerCase())) {
            suggestions.push({
                type: 'area',
                title: area.local_area,
                subtitle: area.landmark || 'Local Area',
                count: area.station_count,
                icon: 'fas fa-building'
            });
        }
    });

    // Add district suggestions
    districts.forEach(district => {
        if (district.district.toLowerCase().includes(query.toLowerCase())) {
            suggestions.push({
                type: 'district',
                title: district.district,
                subtitle: `${district.state} (${district.station_count} stations)`,
                count: district.station_count,
                icon: 'fas fa-map'
            });
        }
    });

    // Limit to top 5 suggestions
    const topSuggestions = suggestions.slice(0, 5);

    if (topSuggestions.length > 0) {
        suggestionsContainer.innerHTML = topSuggestions.map(suggestion => `
            <div class="suggestion-item" onclick="selectSuggestion('${suggestion.type}', '${suggestion.title}')">
                <i class="suggestion-icon ${suggestion.icon}"></i>
                <div class="suggestion-text">
                    <div class="suggestion-title">${suggestion.title}</div>
                    <div class="suggestion-subtitle">${suggestion.subtitle}</div>
                </div>
                <div class="suggestion-count">${suggestion.count}</div>
            </div>
        `).join('');

        suggestionsContainer.style.display = 'block';
    } else {
        hideSuggestions();
    }
}

// Show local area suggestions
function showLocalAreaSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer || localAreas.length === 0) return;

    const suggestions = localAreas.slice(0, 5).map(area => `
        <div class="suggestion-item" onclick="selectLocalArea('${area.local_area}')">
            <i class="suggestion-icon fas fa-building"></i>
            <div class="suggestion-text">
                <div class="suggestion-title">${area.local_area}</div>
                <div class="suggestion-subtitle">${area.landmark || 'Local Area'}</div>
            </div>
            <div class="suggestion-count">${area.station_count}</div>
        </div>
    `).join('');

    suggestionsContainer.innerHTML = suggestions;
    suggestionsContainer.style.display = 'block';
}

// Hide suggestions
function hideSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

// Select suggestion
function selectSuggestion(type, value) {
    if (type === 'district') {
        const districtFilter = document.getElementById('districtFilter');
        if (districtFilter) {
            districtFilter.value = value;
            currentFilter.district = value;
            loadLocalAreas(value);
        }
    } else if (type === 'landmark' || type === 'area') {
        const localAreaInput = document.getElementById('localAreaInput');
        if (localAreaInput) {
            localAreaInput.value = value;
            currentFilter.local_area = value;
        }
    }

    hideSuggestions();
    handleSmartSearch();
}

// Select local area
function selectLocalArea(area) {
    const localAreaInput = document.getElementById('localAreaInput');
    if (localAreaInput) {
        localAreaInput.value = area;
        currentFilter.local_area = area;
    }
    hideSuggestions();
    handleSmartSearch();
}

// Clear all filters
function clearAllFilters() {
    currentFilter.state = '';
    currentFilter.district = '';
    currentFilter.local_area = '';
    currentFilter.search_query = '';

    const stateFilter = document.getElementById('stateFilter');
    const districtFilter = document.getElementById('districtFilter');
    const localAreaInput = document.getElementById('localAreaInput');
    const locationInput = document.getElementById('locationInput');

    if (stateFilter) stateFilter.value = '';
    if (districtFilter) districtFilter.value = '';
    if (localAreaInput) localAreaInput.value = '';
    if (locationInput) locationInput.value = '';

    hideSuggestions();

    // Load all stations
    loadStationsFromDatabase();
    updatePageTitle('All Charging Stations');
}

// Update page title based on current filter
function updatePageTitle(title) {
    const recommendedSection = document.querySelector('.recommended-section h2');
    if (recommendedSection) {
        recommendedSection.innerHTML = `<i class="fas fa-star"></i> ${title}`;
    }
}

async function handleSearch() {
    const searchLocation = locationInput.value.trim();
    if (!searchLocation) {
        alert('Please enter a location to search for charging stations.');
        return;
    }

    // Simulate search loading
    searchBtn.innerHTML = '<span class="loading"></span> Searching...';
    searchBtn.disabled = true;

    try {
        // Use Google Places API to get coordinates
        if (typeof google !== 'undefined' && google.maps) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: searchLocation }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    userLocation.lat = location.lat();
                    userLocation.lng = location.lng();
                    userLocation.address = searchLocation;

                    // Update map center
                    if (map) {
                        map.setCenter(location);
                        addUserLocationMarker();
                    }

                    // Load nearby stations
                    loadNearbyStations();
                } else {
                    console.error('Geocoding failed:', status);
                    loadStationsFromDatabase();
                }

                // Reset search button
                searchBtn.innerHTML = '<i class="fas fa-search"></i> Find Stations';
                searchBtn.disabled = false;
            });
        } else {
            // Fallback to database search
            userLocation.address = searchLocation;
            loadStationsFromDatabase();

            // Reset search button
            searchBtn.innerHTML = '<i class="fas fa-search"></i> Find Stations';
            searchBtn.disabled = false;
        }
    } catch (error) {
        console.error('Search error:', error);
        searchBtn.innerHTML = '<i class="fas fa-search"></i> Find Stations';
        searchBtn.disabled = false;
    }
}

// Load nearby stations from database
async function loadNearbyStations() {
    try {
        const response = await fetch(`${API_BASE_URL}/stations/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=20`);
        if (response.ok) {
            chargingStations = await response.json();
            findRecommendedStation();
            displayAlternativeStations();
            updateMapMarkers();
        } else {
            console.error('Failed to load nearby stations');
            loadStationsFromDatabase();
        }
    } catch (error) {
        console.error('Error loading nearby stations:', error);
        loadStationsFromDatabase();
    }
}

function findRecommendedStation() {
    // Calculate distances for all stations
    chargingStations.forEach(station => {
        station.distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            parseFloat(station.latitude), parseFloat(station.longitude)
        );
    });

    // Find the closest open station with available chargers
    const openStations = chargingStations.filter(station =>
        station.status === 'Active' && station.available_chargers > 0
    );

    if (openStations.length === 0) {
        displayNoStationsMessage();
        return;
    }

    // Sort by distance and availability
    const recommended = openStations.sort((a, b) => {
        // Prioritize stations with more available chargers
        if (a.available_chargers !== b.available_chargers) {
            return b.available_chargers - a.available_chargers;
        }
        // Then by distance
        return a.distance - b.distance;
    })[0];

    displayRecommendedStation(recommended);
}

function displayRecommendedStation(station) {
    const stationCard = createStationCard(station, true);
    recommendedStationDiv.innerHTML = stationCard;

    // Add click event for navigation
    addStationEventListeners(station);
}

function displayAlternativeStations() {
    const alternatives = chargingStations
        .filter(station => station.status === 'Active')
        .sort((a, b) => a.distance - b.distance)
        .slice(1, 4); // Show top 3 alternatives

    if (alternatives.length === 0) {
        alternativeStationsDiv.innerHTML = '<p class="text-center">No alternative stations available.</p>';
        return;
    }

    const alternativesHTML = alternatives.map(station =>
        createStationCard(station, false)
    ).join('');

    alternativeStationsDiv.innerHTML = alternativesHTML;

    // Add click events for alternative stations
    alternatives.forEach(station => {
        addStationEventListeners(station);
    });
}

function createStationCard(station, isRecommended) {
    const statusClass = station.status === 'Active' ? 'status-open' : 'status-closed';
    const availabilityColor = station.available_chargers > 0 ? '#28a745' : '#dc3545';

    return `
        <div class="station-card ${isRecommended ? 'recommended' : ''}" data-station-id="${station.station_id}">
            <div class="district-info">
                <i class="fas fa-map-marker-alt"></i>
                <span>${station.district}, ${station.state}</span>
            </div>
            
            <div class="station-header">
                <h3 class="station-name">${station.station_name}</h3>
                <span class="station-status ${statusClass}">${station.status}</span>
            </div>
            
            <div class="station-details">
                <div class="detail-item">
                    <div class="detail-icon">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <div class="detail-text">
                        <span class="detail-label">Distance</span>
                        <span class="detail-value">${station.distance ? station.distance.toFixed(1) : 'N/A'} km</span>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon">
                        <i class="fas fa-bolt"></i>
                    </div>
                    <div class="detail-text">
                        <span class="detail-label">Available Chargers</span>
                        <span class="detail-value" style="color: ${availabilityColor}">
                            ${station.available_chargers}/${station.total_chargers}
                        </span>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="detail-text">
                        <span class="detail-label">Rating</span>
                        <span class="detail-value">${station.rating}/5.0</span>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon">
                        <i class="fas fa-rupee-sign"></i>
                    </div>
                    <div class="detail-text">
                        <span class="detail-label">Price per kWh</span>
                        <span class="detail-value inr">₹${station.price_per_kwh}</span>
                    </div>
                </div>
            </div>
            
            <div class="station-actions">
                <button class="action-btn btn-primary" onclick="navigateToStation(${station.station_id})">
                    <i class="fas fa-route"></i> Navigate
                </button>
                <button class="action-btn btn-secondary" onclick="viewStationDetails(${station.station_id})">
                    <i class="fas fa-info-circle"></i> View Details
                </button>
                ${station.available_chargers > 0 ? `
                    <button class="action-btn btn-success" onclick="startChargingSession(${station.station_id})">
                        <i class="fas fa-play"></i> Start Charging
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function addStationEventListeners(station) {
    // This function can be used to add additional event listeners if needed
}

function navigateToStation(stationId) {
    const station = chargingStations.find(s => s.station_id === stationId);
    if (station) {
        // Open Google Maps navigation
        const destination = `${station.latitude},${station.longitude}`;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

        // Open in new tab
        window.open(mapsUrl, '_blank');

        // Also center the map on the station
        if (map && typeof google !== 'undefined') {
            const stationPosition = new google.maps.LatLng(station.latitude, station.longitude);
            map.setCenter(stationPosition);
            map.setZoom(15);
        }

        console.log(`Navigating to station: ${station.station_name} at coordinates: ${station.latitude}, ${station.longitude}`);
    }
}

function viewStationDetails(stationId) {
    const station = chargingStations.find(s => s.station_id === stationId);
    if (station) {
        const modalHTML = `
            <h2>${station.station_name}</h2>
            <div class="station-details">
                <div class="detail-item">
                    <div class="detail-icon">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <div class="detail-text">
                        <span class="detail-label">Address</span>
                        <span class="detail-value">${station.address}</span>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon">
                        <i class="fas fa-phone"></i>
                    </div>
                    <div class="detail-text">
                        <span class="detail-label">Phone</span>
                        <span class="detail-value">${station.phone}</span>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="detail-text">
                        <span class="detail-label">Hours</span>
                        <span class="detail-value">${station.operating_hours}</span>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon">
                        <i class="fas fa-plug"></i>
                    </div>
                    <div class="detail-text">
                        <span class="detail-label">Connector Types</span>
                        <span class="detail-value">${Array.isArray(station.connector_types) ? station.connector_types.join(', ') : station.connector_types}</span>
                    </div>
                </div>
            </div>
            
            <div class="mt-20">
                <h3>Amenities</h3>
                <div class="amenities">
                    ${Array.isArray(station.amenities) ? station.amenities.map(amenity => `
                        <span class="amenity-tag">
                            <i class="fas fa-check"></i> ${amenity}
                        </span>
                    `).join('') : ''}
                </div>
            </div>
            
            <div class="station-actions mt-20">
                <button class="action-btn btn-primary" onclick="navigateToStation(${station.station_id})">
                    <i class="fas fa-route"></i> Navigate
                </button>
                ${station.available_chargers > 0 ? `
                    <button class="action-btn btn-success" onclick="startChargingSession(${station.station_id})">
                        <i class="fas fa-play"></i> Start Charging
                    </button>
                ` : ''}
            </div>
        `;

        modalContent.innerHTML = modalHTML;
        modal.style.display = 'block';
    }
}

// Start charging session
async function startChargingSession(stationId) {
    const station = chargingStations.find(s => s.station_id === stationId);
    if (!station) return;

    // Simulate starting a charging session
    const estimatedDuration = 60; // minutes
    const estimatedEnergy = 25; // kWh

    try {
        const response = await fetch(`${API_BASE_URL}/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: 1, // In a real app, this would be the logged-in user's ID
                station_id: stationId,
                charger_id: 1, // In a real app, you'd select a specific charger
                estimated_duration: estimatedDuration
            })
        });

        if (response.ok) {
            const sessionData = await response.json();
            currentSession = {
                session_id: sessionData.session_id,
                station: station,
                start_time: new Date(),
                estimated_duration: estimatedDuration,
                estimated_energy: estimatedEnergy,
                total_cost: estimatedEnergy * station.price_per_kwh
            };

            // Show payment section
            showPaymentSection();

            alert(`Charging session started!\n\nSession ID: ${sessionData.session_id}\nEstimated Duration: ${estimatedDuration} minutes\nEstimated Cost: ₹${currentSession.total_cost.toFixed(2)}`);
        } else {
            alert('Failed to start charging session. Please try again.');
        }
    } catch (error) {
        console.error('Error starting session:', error);
        alert('Error starting charging session. Please try again.');
    }
}

// Show payment section
function showPaymentSection() {
    if (!currentSession) return;

    const paymentSection = document.getElementById('paymentSection');
    const paymentStationName = document.getElementById('paymentStationName');
    const paymentDuration = document.getElementById('paymentDuration');
    const paymentEnergy = document.getElementById('paymentEnergy');
    const paymentAmount = document.getElementById('paymentAmount');

    paymentStationName.textContent = currentSession.station.station_name;
    paymentDuration.textContent = `${currentSession.estimated_duration} minutes`;
    paymentEnergy.textContent = `${currentSession.estimated_energy} kWh`;
    paymentAmount.textContent = `₹${currentSession.total_cost.toFixed(2)}`;

    paymentSection.style.display = 'block';
    paymentSection.scrollIntoView({ behavior: 'smooth' });
}

// Initiate payment with Razorpay
async function initiatePayment() {
    if (!currentSession) return;

    try {
        // Create Razorpay order
        const orderResponse = await fetch(`${API_BASE_URL}/payments/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: currentSession.session_id,
                amount: currentSession.total_cost
            })
        });

        if (orderResponse.ok) {
            const orderData = await orderResponse.json();

            // Configure Razorpay options
            const options = {
                key: RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'E-Vehicle Charging',
                description: `Charging session at ${currentSession.station.station_name}`,
                order_id: orderData.order_id,
                handler: function (response) {
                    verifyPayment(response);
                },
                prefill: {
                    name: 'User Name', // In a real app, get from user profile
                    email: 'user@example.com',
                    contact: '+91 98765 43210'
                },
                theme: {
                    color: '#667eea'
                },
                modal: {
                    ondismiss: function () {
                        console.log('Payment modal dismissed');
                    }
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();

        } else {
            alert('Failed to create payment order. Please try again.');
        }
    } catch (error) {
        console.error('Payment initiation error:', error);
        alert('Error initiating payment. Please try again.');
    }
}

// Verify payment
async function verifyPayment(paymentResponse) {
    try {
        const verifyResponse = await fetch(`${API_BASE_URL}/payments/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature
            })
        });

        if (verifyResponse.ok) {
            alert('Payment successful! Your charging session is now active.');

            // Hide payment section
            document.getElementById('paymentSection').style.display = 'none';

            // Reset current session
            currentSession = null;

            // Refresh station data
            loadStationsFromDatabase();

        } else {
            alert('Payment verification failed. Please contact support.');
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        alert('Error verifying payment. Please contact support.');
    }
}

// Cancel payment
function cancelPayment() {
    if (confirm('Are you sure you want to cancel the charging session?')) {
        document.getElementById('paymentSection').style.display = 'none';
        currentSession = null;
        alert('Charging session cancelled.');
    }
}

// Get current location using GPS
function getCurrentLocation() {
    if (navigator.geolocation) {
        const currentLocationBtn = document.getElementById('currentLocationBtn');
        if (currentLocationBtn) {
            currentLocationBtn.innerHTML = '<span class="loading"></span>';
            currentLocationBtn.disabled = true;
        }

        navigator.geolocation.getCurrentPosition(
            function (position) {
                userLocation.lat = position.coords.latitude;
                userLocation.lng = position.coords.longitude;

                // Reverse geocoding to get address
                if (typeof google !== 'undefined' && google.maps) {
                    const geocoder = new google.maps.Geocoder();
                    const latlng = new google.maps.LatLng(userLocation.lat, userLocation.lng);

                    geocoder.geocode({ location: latlng }, (results, status) => {
                        if (status === 'OK' && results[0]) {
                            userLocation.address = results[0].formatted_address;
                            locationInput.value = userLocation.address;
                        } else {
                            userLocation.address = `Lat: ${userLocation.lat.toFixed(6)}, Lng: ${userLocation.lng.toFixed(6)}`;
                            locationInput.value = userLocation.address;
                        }

                        // Update map center
                        if (map) {
                            map.setCenter(latlng);
                            addUserLocationMarker();
                        }

                        // Load nearby stations
                        loadNearbyStations();

                        // Reset button
                        if (currentLocationBtn) {
                            currentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                            currentLocationBtn.disabled = false;
                        }
                    });
                } else {
                    userLocation.address = `Lat: ${userLocation.lat.toFixed(6)}, Lng: ${userLocation.lng.toFixed(6)}`;
                    locationInput.value = userLocation.address;
                    loadNearbyStations();

                    // Reset button
                    if (currentLocationBtn) {
                        currentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                        currentLocationBtn.disabled = false;
                    }
                }
            },
            function (error) {
                console.log("Geolocation error:", error);
                let errorMessage = "Unable to get your current location. ";

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += "Please allow location access and try again.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMessage += "Location request timed out.";
                        break;
                    default:
                        errorMessage += "An unknown error occurred.";
                        break;
                }

                alert(errorMessage);

                // Reset button
                const currentLocationBtn = document.getElementById('currentLocationBtn');
                if (currentLocationBtn) {
                    currentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                    currentLocationBtn.disabled = false;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function closeModalFunction() {
    modal.style.display = 'none';
}

function displayNoStationsMessage() {
    recommendedStationDiv.innerHTML = `
        <div class="station-card">
            <div class="text-center">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ffc107; margin-bottom: 20px;"></i>
                <h3>No Available Stations</h3>
                <p>No charging stations with available chargers were found in your area.</p>
                <p>Try searching in a different location or check back later.</p>
            </div>
        </div>
    `;
}

// Add amenity tag styling
const amenityStyles = `
    .amenity-tag {
        display: inline-block;
        background: #e9ecef;
        color: #495057;
        padding: 4px 8px;
        margin: 2px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .amenity-tag i {
        color: #28a745;
        margin-right: 4px;
    }
`;

// Add styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = amenityStyles;
document.head.appendChild(styleSheet);


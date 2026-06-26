const express = require('express');
const router = express.Router();
const {
    getAllStations,
    getNearbyStations,
    getStationById,
    searchStations,
    getDistricts,
    createStation,
    updateStation,
    deleteStation,
    addSlot,
    deleteSlot,
    updateSlotStatus,
    toggleStationStatus
} = require('../controllers/stationController');
const { validate, schemas } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

// GET /api/stations (all active stations)
router.get('/', getAllStations);

// GET /api/stations/nearby?lat=&lng=&radius=
router.get('/nearby', validate(schemas.nearbyQuery, 'query'), getNearbyStations);

// GET /api/stations/districts
router.get('/districts', getDistricts);

// GET /api/stations/search?query=&state=&district=&local_area=
router.get('/search', validate(schemas.stationSearch, 'query'), searchStations);

// GET /api/stations/:id
router.get('/:id', getStationById);

// Admin Routes
router.post('/', authenticate, adminOnly, createStation);
router.put('/:id', authenticate, adminOnly, updateStation);
router.put('/:id/status', authenticate, adminOnly, toggleStationStatus);
router.delete('/:id', authenticate, adminOnly, deleteStation);
router.post('/:id/slots', authenticate, adminOnly, addSlot);
router.delete('/:id/slots/:slotId', authenticate, adminOnly, deleteSlot);
router.put('/:id/slots/:slotId', authenticate, adminOnly, updateSlotStatus);

module.exports = router;

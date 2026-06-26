# EV Charging Station Queue Management System

A production-ready full-stack web application for finding, booking, and managing EV charging station slots in real-time.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Real-time | Socket.io |
| Auth | JWT + bcrypt |
| Maps | Google Maps JS API |
| Validation | Joi |

## Project Structure

```
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/          # Login/Register page
│   │   │   ├── Station/       # StationList, StationDetail
│   │   │   ├── Booking/       # ActiveSession
│   │   │   └── Map/           # Google Maps component
│   │   ├── context/           # AuthContext (JWT + Socket)
│   │   ├── hooks/             # useGeolocation, useSocket
│   │   ├── services/          # api.js (Axios), socket.js
│   │   ├── App.jsx
│   │   └── index.css
│   ├── .env.example
│   └── vite.config.js
│
├── server/                    # Node.js backend
│   ├── config/db.js           # PostgreSQL pool
│   ├── controllers/           # authController, stationController, bookingController, queueController
│   ├── middleware/            # auth.js, errorHandler.js, validate.js
│   ├── routes/                # auth, stations, bookings, queue, sessions
│   ├── services/              # bookingService (transactions), queueService (auto-assign), notificationService
│   ├── socket/socketHandler.js
│   ├── server.js
│   └── .env                   # ← Fill in your credentials
│
└── database_schema.sql        # PostgreSQL schema with sample data
```

## Quick Start

### 1. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE ev_charging_db;"

# Run schema
psql -U postgres -d ev_charging_db -f database_schema.sql
```

### 2. Backend Setup

```bash
cd server
# Edit .env with your PostgreSQL credentials
npm run dev
# Server starts on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd client
# Copy .env.example to .env and add your Google Maps API key
cp .env.example .env
npm run dev
# App opens at http://localhost:5173
```

## Key Features

- 🗺️ **Real-time map** with nearby EV stations (Haversine distance)
- ⚡ **Instant booking** with race-condition-safe transactions (SELECT FOR UPDATE)
- 🔄 **Queue system** — join queue when full, auto-assigned when slot opens
- 📡 **Socket.io** — live slot status, queue position, and assignment notifications
- 🔐 **JWT auth** with bcrypt password hashing
- 📱 **Responsive** dark-themed UI

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Get profile |
| GET | `/api/stations/nearby` | No | Nearby stations |
| GET | `/api/stations/:id` | No | Station details + slots |
| POST | `/api/bookings` | Yes | Create booking |
| PUT | `/api/bookings/:id/complete` | Yes | Complete session |
| PUT | `/api/bookings/:id/cancel` | Yes | Cancel booking |
| POST | `/api/queue` | Yes | Join queue |
| GET | `/api/queue/:stationId/status` | Yes | Queue position |
| DELETE | `/api/queue/:id` | Yes | Leave queue |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_station_room` | Client→Server | Subscribe to station updates |
| `slot_status_changed` | Server→Client | Slot occupied/available |
| `availability_updated` | Server→Client | Slot count changed |
| `queue_updated` | Server→Client | Queue length changed |
| `queue_position_updated` | Server→Client | User's position changed |
| `slot_assigned` | Server→Client | Auto-assigned from queue |

import { useState } from 'react';
import ManageStations from './ManageStations';
import ManageUsers from './ManageUsers';
import ManageBookings from './ManageBookings';
import ManageReviews from './ManageReviews';
import ManageQueue from './ManageQueue';
import AnalyticsDashboard from './AnalyticsDashboard';
import DashboardOverview from './DashboardOverview';

const AdminDashboard = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div style={{ padding: '0 1rem 1rem 1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', paddingTop: '1rem' }}>
                <button className="btn btn-ghost btn-circle" onClick={onBack} style={{ marginRight: '0.5rem' }}>
                    <i className="fas fa-arrow-left" />
                </button>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Admin Dashboard</h2>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                <button
                    className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <i className="fas fa-tachometer-alt" style={{ marginRight: '0.4rem' }} />
                    Overview
                </button>
                <button
                    className={`tab ${activeTab === 'stations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stations')}
                >
                    <i className="fas fa-charging-station" style={{ marginRight: '0.4rem' }} />
                    Stations
                </button>
                <button
                    className={`tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <i className="fas fa-users" style={{ marginRight: '0.4rem' }} />
                    Users
                </button>
                <button
                    className={`tab ${activeTab === 'bookings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bookings')}
                >
                    <i className="fas fa-calendar-check" style={{ marginRight: '0.4rem' }} />
                    Bookings
                </button>
                <button
                    className={`tab ${activeTab === 'reviews' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reviews')}
                >
                    <i className="fas fa-star" style={{ marginRight: '0.4rem' }} />
                    Reviews
                </button>
                <button
                    className={`tab ${activeTab === 'queue' ? 'active' : ''}`}
                    onClick={() => setActiveTab('queue')}
                >
                    <i className="fas fa-users" style={{ marginRight: '0.4rem' }} />
                    Queue
                </button>
                <button
                    className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    <i className="fas fa-chart-pie" style={{ marginRight: '0.4rem' }} />
                    Analytics
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {activeTab === 'overview' && <DashboardOverview />}
                {activeTab === 'stations' && <ManageStations />}
                {activeTab === 'users' && <ManageUsers />}
                {activeTab === 'bookings' && <ManageBookings />}
                {activeTab === 'reviews' && <ManageReviews />}
                {activeTab === 'queue' && <ManageQueue />}
                {activeTab === 'analytics' && <AnalyticsDashboard />}
            </div>
        </div>
    );
};

export default AdminDashboard;

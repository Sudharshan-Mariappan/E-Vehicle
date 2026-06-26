/**
 * AvailabilityBanner — Real-time summary of station availability.
 * Shows at the top of the sidebar as a color-coded banner.
 */
const AvailabilityBanner = ({ stations }) => {
    if (!stations || stations.length === 0) return null;

    const totalStations = stations.length;
    const stationsWithSlots = stations.filter(s => parseInt(s.available_slots) > 0);
    const availableCount = stationsWithSlots.length;

    const totalSlots = stations.reduce((sum, s) => sum + (parseInt(s.total_slots) || 0), 0);
    const freeSlots = stations.reduce((sum, s) => sum + (parseInt(s.available_slots) || 0), 0);

    const ratio = totalStations > 0 ? availableCount / totalStations : 0;
    const color = ratio > 0.5 ? 'var(--success)' : ratio > 0.25 ? 'var(--warning)' : 'var(--danger)';
    const bgColor = ratio > 0.5
        ? 'rgba(34,197,94,0.08)'
        : ratio > 0.25
            ? 'rgba(245,158,11,0.08)'
            : 'rgba(239,68,68,0.08)';
    const borderColor = ratio > 0.5
        ? 'rgba(34,197,94,0.2)'
        : ratio > 0.25
            ? 'rgba(245,158,11,0.2)'
            : 'rgba(239,68,68,0.2)';

    return (
        <div style={{
            padding: '0.6rem 1rem',
            background: bgColor,
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.78rem',
            animation: 'fadeIn 0.3s ease',
        }}>
            <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                animation: 'pulse 2s infinite',
            }} />
            <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, color }}>
                    {availableCount}/{totalStations}
                </span>
                <span style={{ color: 'var(--text-muted)' }}> stations available</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.72rem' }}>
                    · {freeSlots}/{totalSlots} slots free
                </span>
            </div>
            <i className="fas fa-bolt" style={{ color, fontSize: '0.7rem' }} />
        </div>
    );
};

export default AvailabilityBanner;

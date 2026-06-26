import { useState, useMemo } from 'react';

/**
 * CostEstimator — Pre-booking cost calculator shown in StationDetail.
 * Lets users estimate charging cost before booking a slot.
 */
const CostEstimator = ({ slot, pricePerKwh }) => {
    const [durationMin, setDurationMin] = useState(60); // default 1 hour

    const powerKw = parseFloat(slot?.power_kw) || 7.4;
    const price = parseFloat(pricePerKwh) || 0;

    const estimate = useMemo(() => {
        const hours = durationMin / 60;
        const energy = powerKw * hours;
        const cost = energy * price;
        return { hours, energy, cost };
    }, [durationMin, powerKw, price]);

    const formatDuration = (min) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        if (h === 0) return `${m}min`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    };

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(0,212,170,0.06), rgba(96,165,250,0.06))',
            border: '1px solid rgba(0,212,170,0.15)',
            borderRadius: '12px',
            padding: '1rem',
            marginTop: '0.75rem',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <i className="fas fa-calculator" style={{ color: 'var(--primary)', fontSize: '0.85rem' }} />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Cost Estimator</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {slot?.slot_name} · {powerKw} kW
                </span>
            </div>

            {/* Duration Slider */}
            <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Charging Duration</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {formatDuration(durationMin)}
                    </span>
                </div>
                <input
                    type="range"
                    min={15}
                    max={240}
                    step={15}
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    style={{
                        width: '100%',
                        accentColor: 'var(--primary)',
                        cursor: 'pointer',
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    <span>15min</span>
                    <span>4hrs</span>
                </div>
            </div>

            {/* Estimate breakdown */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
            }}>
                <div style={{
                    textAlign: 'center',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Energy
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                        {estimate.energy.toFixed(1)} kWh
                    </div>
                </div>
                <div style={{
                    textAlign: 'center',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Rate
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '2px' }}>
                        ₹{price}/kWh
                    </div>
                </div>
                <div style={{
                    textAlign: 'center',
                    padding: '0.5rem',
                    background: 'rgba(34,197,94,0.08)',
                    borderRadius: '8px',
                    border: '1px solid rgba(34,197,94,0.15)',
                }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Est. Cost
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--success)', marginTop: '2px' }}>
                        ₹{estimate.cost.toFixed(0)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CostEstimator;

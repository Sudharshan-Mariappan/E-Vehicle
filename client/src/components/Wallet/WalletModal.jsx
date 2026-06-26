import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const QUICK_AMOUNTS = [100, 200, 500, 1000];

const WalletModal = ({ onClose }) => {
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [amountToAdd, setAmountToAdd] = useState('');
    const [addingMoney, setAddingMoney] = useState(false);
    const [activeTab, setActiveTab] = useState('wallet'); // 'wallet' | 'history'
    const [txFilter, setTxFilter] = useState('all'); // 'all' | 'CREDIT' | 'DEBIT'

    const fetchWallet = async () => {
        try {
            const { data } = await api.get('/wallet');
            setBalance(data.balance);
            setTransactions(data.transactions);
        } catch (err) {
            toast.error('Failed to load wallet');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallet();
    }, []);

    const handleAddMoney = async (e) => {
        e.preventDefault();
        const amount = parseFloat(amountToAdd);
        if (!amount || amount <= 0) return;

        setAddingMoney(true);
        try {
            await api.post('/wallet/add-money', { amount });
            toast.success(`₹${amount} added to wallet!`);
            setAmountToAdd('');
            fetchWallet();
        } catch (err) {
            toast.error('Failed to add funds');
        } finally {
            setAddingMoney(false);
        }
    };

    const handleQuickAdd = async (amount) => {
        setAddingMoney(true);
        try {
            await api.post('/wallet/add-money', { amount });
            toast.success(`₹${amount} added to wallet!`);
            fetchWallet();
        } catch (err) {
            toast.error('Failed to add funds');
        } finally {
            setAddingMoney(false);
        }
    };

    const totalCredits = transactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalDebits = transactions.filter(t => t.type === 'DEBIT').reduce((s, t) => s + parseFloat(t.amount), 0);
    const filteredTx = txFilter === 'all' ? transactions : transactions.filter(t => t.type === txFilter);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', width: '90%' }}>
                <div className="modal-header">
                    <h3><i className="fas fa-wallet" style={{ marginRight: '0.5rem', color: 'var(--success)' }} />My Wallet</h3>
                    <button className="btn btn-ghost btn-circle" onClick={onClose}>
                        <i className="fas fa-times" />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Balance Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, #059669, #0d9488)',
                        padding: '1.5rem',
                        borderRadius: '14px',
                        textAlign: 'center',
                        marginBottom: '1.25rem',
                        boxShadow: '0 8px 24px rgba(5,150,105,0.25)'
                    }}>
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Current Balance</div>
                        <div style={{ fontSize: '2.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>
                            ₹{loading ? '...' : balance.toFixed(2)}
                        </div>
                        {!loading && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                                    <i className="fas fa-arrow-down" style={{ marginRight: '4px', color: '#86efac' }} />
                                    ₹{totalCredits.toFixed(0)} in
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                                    <i className="fas fa-arrow-up" style={{ marginRight: '4px', color: '#fca5a5' }} />
                                    ₹{totalDebits.toFixed(0)} out
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Add Buttons */}
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Quick Add</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {QUICK_AMOUNTS.map(amt => (
                                <button
                                    key={amt}
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleQuickAdd(amt)}
                                    disabled={addingMoney}
                                    style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem' }}
                                >
                                    +₹{amt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Add Money Form */}
                    <form onSubmit={handleAddMoney} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        <input
                            type="number"
                            className="input-field"
                            placeholder="Custom amount (₹)"
                            value={amountToAdd}
                            onChange={(e) => setAmountToAdd(e.target.value)}
                            min="1"
                            step="1"
                            required
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={addingMoney}
                            style={{ flexShrink: 0 }}
                        >
                            {addingMoney ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : 'Add'}
                        </button>
                    </form>

                    {/* Transactions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Recent Transactions</h4>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                            {['all', 'CREDIT', 'DEBIT'].map(f => (
                                <button
                                    key={f}
                                    className={`btn btn-xs ${txFilter === f ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setTxFilter(f)}
                                    style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                                >
                                    {f === 'all' ? 'All' : f === 'CREDIT' ? '↓ In' : '↑ Out'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {loading ? (
                            <div className="spinner" style={{ margin: '1rem auto' }} />
                        ) : transactions.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem', fontSize: '0.85rem' }}>
                                <i className="fas fa-receipt" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem', opacity: 0.3 }} />
                                No transactions yet
                            </div>
                        ) : (
                            <div>
                                {filteredTx.map(tx => (
                                    <div key={tx.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.6rem 0',
                                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <div style={{
                                                width: '28px', height: '28px', borderRadius: '50%',
                                                background: tx.type === 'CREDIT' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                            }}>
                                                <i className={`fas fa-arrow-${tx.type === 'CREDIT' ? 'down' : 'up'}`}
                                                    style={{ fontSize: '0.7rem', color: tx.type === 'CREDIT' ? 'var(--success)' : 'var(--danger)' }} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.85rem' }}>{tx.description || tx.type}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{
                                            fontWeight: 700,
                                            color: tx.type === 'CREDIT' ? 'var(--success)' : 'var(--danger)',
                                            fontSize: '0.95rem'
                                        }}>
                                            {tx.type === 'CREDIT' ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WalletModal;

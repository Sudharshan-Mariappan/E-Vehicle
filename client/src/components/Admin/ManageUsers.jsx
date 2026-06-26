import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/auth/users');
            setUsers(data.users);
        } catch (err) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/auth/users/${id}`);
            toast.success('User deleted');
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err) {
            toast.error('Failed to delete user');
        }
    };

    const handleRoleUpdate = async (id, newRole) => {
        try {
            await api.put(`/auth/users/${id}/role`, { role: newRole });
            toast.success('User role updated');
            setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
        } catch (err) {
            toast.error('Failed to update role');
        }
    };

    const handleExportCSV = () => {
        const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Joined'];
        const rows = filteredUsers.map(u => [
            u.id,
            `"${u.name}"`,
            u.email,
            u.phone || '-',
            u.role,
            new Date(u.created_at).toLocaleDateString()
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Users exported!');
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = !search ||
                u.name.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase()) ||
                (u.phone && u.phone.includes(search));
            const matchesRole = roleFilter === 'all' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, search, roleFilter]);

    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = users.filter(u => u.role === 'user').length;

    return (
        <div>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="card" style={{ flex: 1, padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Users</div>
                    <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>{users.length}</div>
                </div>
                <div className="card" style={{ flex: 1, padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Regular</div>
                    <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary)' }}>{userCount}</div>
                </div>
                <div className="card" style={{ flex: 1, padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Admins</div>
                    <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#a78bfa' }}>{adminCount}</div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }} />
                    <input
                        className="input-field"
                        placeholder="Search name, email, phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: '2rem' }}
                    />
                </div>
                <select
                    className="input-field"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    style={{ width: 'auto', minWidth: '100px' }}
                >
                    <option value="all">All Roles</option>
                    <option value="user">Users</option>
                    <option value="admin">Admins</option>
                </select>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleExportCSV}
                    title="Export CSV"
                    style={{ color: 'var(--success)', flexShrink: 0 }}
                >
                    <i className="fas fa-download" />
                </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Showing {filteredUsers.length} of {users.length} users
            </div>

            {loading ? (
                <div className="spinner" />
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem' }}>Name</th>
                                <th style={{ padding: '0.75rem' }}>Email</th>
                                <th style={{ padding: '0.75rem' }}>Phone</th>
                                <th style={{ padding: '0.75rem' }}>Role</th>
                                <th style={{ padding: '0.75rem' }}>Joined</th>
                                <th style={{ padding: '0.75rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No users match your search
                                    </td>
                                </tr>
                            ) : filteredUsers.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{user.name}</td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user.email}</td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user.phone || '—'}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <span className={`badge ${user.role === 'admin' ? 'badge-primary' : ''}`}
                                            style={user.role !== 'admin' ? { background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' } : {}}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn btn-xs btn-ghost"
                                                title={user.role === 'user' ? 'Make Admin' : 'Remove Admin'}
                                                onClick={() => handleRoleUpdate(user.id, user.role === 'user' ? 'admin' : 'user')}
                                            >
                                                <i className={`fas ${user.role === 'user' ? 'fa-user-shield' : 'fa-user'}`} />
                                            </button>
                                            <button
                                                className="btn btn-xs btn-ghost"
                                                style={{ color: 'var(--danger)' }}
                                                onClick={() => handleDelete(user.id)}
                                            >
                                                <i className="fas fa-trash" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ManageUsers;

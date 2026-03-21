import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import toast from 'react-hot-toast';
import { Shield, User, Store, Loader2 } from 'lucide-react';

export const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const ROLES = [
        { id: 'client', label: 'Cliente' },
        { id: 'local', label: 'Local' },
        { id: 'admin', label: 'Admin' }
    ];

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await databases.listDocuments(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users', [Query.limit(100), Query.orderDesc('$createdAt')]);
            setUsers(res.documents);
        } catch { toast.error('Error al cargar usuarios.'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleRoleChange = async (userId, newRole) => {
        try {
            setUpdatingId(userId);
            await databases.updateDocument(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users', userId, { user_type: newRole });
            setUsers(users.map(u => u.$id === userId ? { ...u, user_type: newRole } : u));
            toast.success('Rol actualizado.');
        } catch { toast.error('Error al actualizar.'); }
        finally { setUpdatingId(null); }
    };

    const roleStyle = (t) => {
        if (t === 'admin') return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
        if (t === 'local') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    };
    const RoleIcon = ({ t }) => t === 'admin' ? <Shield size={10} /> : t === 'local' ? <Store size={10} /> : <User size={10} />;

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Gestión de Usuarios</h1>
                <p className="text-gray-400 mt-2">Administra los roles y accesos del sistema.</p>
            </div>
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glow">
                {loading ? (
                    <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                    <div>
                        {/* Mobile: cards */}
                        <div className="sm:hidden divide-y divide-white/5">
                            {users.map(u => (
                                <div key={u.$id} className="p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-white truncate">{u.full_name || 'Desconocido'}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{u.email}</p>
                                        </div>
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border shrink-0 ${roleStyle(u.user_type)}`}>
                                            <RoleIcon t={u.user_type} />
                                            {(u.user_type || 'client').toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select disabled={updatingId === u.$id} value={u.user_type || 'client'} onChange={(e) => handleRoleChange(u.$id, e.target.value)}
                                            className="flex-1 bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-primary disabled:opacity-50">
                                            {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                        </select>
                                        {updatingId === u.$id && <Loader2 size={16} className="animate-spin text-primary shrink-0" />}
                                    </div>
                                </div>
                            ))}
                            {users.length === 0 && <div className="py-8 text-center text-gray-400">No se encontraron usuarios</div>}
                        </div>
                        {/* Desktop: tabla */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/10 text-gray-400 text-sm">
                                        <th className="py-4 px-4 font-medium">Nombre</th>
                                        <th className="py-4 px-4 font-medium hidden md:table-cell">Email</th>
                                        <th className="py-4 px-4 font-medium hidden lg:table-cell">Registro</th>
                                        <th className="py-4 px-4 font-medium">Rol</th>
                                        <th className="py-4 px-4 font-medium text-right">Cambiar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {users.map(u => (
                                        <tr key={u.$id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4 font-medium text-white">{u.full_name || 'Desconocido'}</td>
                                            <td className="py-4 px-4 text-gray-300 hidden md:table-cell">{u.email}</td>
                                            <td className="py-4 px-4 text-gray-400 text-sm hidden lg:table-cell">{new Date(u.$createdAt).toLocaleDateString()}</td>
                                            <td className="py-4 px-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleStyle(u.user_type)}`}>
                                                    <RoleIcon t={u.user_type} />
                                                    {(u.user_type || 'client').toUpperCase()}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <select disabled={updatingId === u.$id} value={u.user_type || 'client'} onChange={(e) => handleRoleChange(u.$id, e.target.value)}
                                                        className="bg-background border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-primary appearance-none disabled:opacity-50">
                                                        {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                                    </select>
                                                    {updatingId === u.$id && <Loader2 size={16} className="animate-spin text-primary" />}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-gray-400">No se encontraron usuarios</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

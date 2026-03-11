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
        { id: 'client', label: 'Cliente', icon: User },
        { id: 'local', label: 'Local', icon: Store },
        { id: 'admin', label: 'Admin', icon: Shield }
    ];

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            // Limit to 100 users for now, handle pagination if needed later
            const usersRes = await databases.listDocuments(dbId, 'users', [
                Query.limit(100),
                Query.orderDesc('$createdAt')
            ]);
            
            setUsers(usersRes.documents);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Error al cargar la lista de usuarios.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId, newRole) => {
        try {
            setUpdatingId(userId);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            await databases.updateDocument(dbId, 'users', userId, {
                user_type: newRole
            });
            
            // Update local state
            setUsers(users.map(u => u.$id === userId ? { ...u, user_type: newRole } : u));
            toast.success("Rol actualizado correctamente.");
        } catch (error) {
            console.error("Error updating role:", error);
            toast.error("Hubo un error al actualizar el rol.");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Gestión de Usuarios</h1>
                <p className="text-gray-400 mt-2">Administra los roles y accesos del sistema.</p>
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden p-6 shadow-glow">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/10 text-gray-400 text-sm">
                                    <th className="pb-4 pt-2 px-4 font-medium">Nombre</th>
                                    <th className="pb-4 pt-2 px-4 font-medium">Email</th>
                                    <th className="pb-4 pt-2 px-4 font-medium">Fecha de Registro</th>
                                    <th className="pb-4 pt-2 px-4 font-medium">Rol Actual</th>
                                    <th className="pb-4 pt-2 px-4 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.map(u => (
                                    <tr key={u.$id} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="font-medium text-white">{u.full_name || 'Desconocido'}</div>
                                            {u.auth_id && <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {u.auth_id.substring(0,8)}...</div>}
                                        </td>
                                        <td className="py-4 px-4 text-gray-300">{u.email}</td>
                                        <td className="py-4 px-4 text-gray-400 text-sm">
                                            {new Date(u.$createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                u.user_type === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                                u.user_type === 'local' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                                            }`}>
                                                {u.user_type === 'admin' && <Shield size={12} />}
                                                {u.user_type === 'local' && <Store size={12} />}
                                                {(!u.user_type || u.user_type === 'client') && <User size={12} />}
                                                {(u.user_type || 'client').toUpperCase()}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <select
                                                    disabled={updatingId === u.$id}
                                                    value={u.user_type || 'client'}
                                                    onChange={(e) => handleRoleChange(u.$id, e.target.value)}
                                                    className="bg-background border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none hover:border-white/20 transition-colors disabled:opacity-50"
                                                >
                                                    {ROLES.map(role => (
                                                        <option key={role.id} value={role.id}>{role.label}</option>
                                                    ))}
                                                </select>
                                                {updatingId === u.$id && <Loader2 size={16} className="animate-spin text-primary" />}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="py-8 text-center text-gray-400">
                                            No se encontraron usuarios
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

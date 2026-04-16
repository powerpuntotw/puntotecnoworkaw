import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import toast from 'react-hot-toast';
import {
    Shield, User, Store, Loader2, Trash2, Printer,
    ChevronDown, ChevronUp, AlertCircle, X, Clock,
    CheckCircle2, Ban, Package
} from 'lucide-react';
import { AccessService } from '../../services/AccessService';

// ─── Helpers ────────────────────────────────────────────────
const roleStyle = (t) => {
    const userObj = { user_type: t };
    if (AccessService.isAdmin(userObj)) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    if (AccessService.isLocal(userObj)) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
};

const statusPackStyle = (s) => {
    if (s === 'activo')   return 'bg-success/10 text-success border-success/20';
    if (s === 'agotado')  return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    if (s === 'expirado') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (s === 'revocado') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-white/5 text-gray-500 border-white/10';
};

const packRemaining = (p) =>
    (p.bw_a4_remaining||0) + (p.color_a4_remaining||0) +
    (p.foto_remaining||0)  + (p.bw_a3_remaining||0);

const packTotal = (p) =>
    (p.bw_a4_total||0) + (p.color_a4_total||0) +
    (p.foto_total||0)  + (p.bw_a3_total||0);

const daysLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const RoleIcon = ({ t }) => {
    const userObj = { user_type: t };
    if (AccessService.isAdmin(userObj)) return <Shield size={10} />;
    if (AccessService.isLocal(userObj)) return <Store size={10} />;
    return <User size={10} />;
};

// ─── Sub-componente: sección PrintPass de un usuario ────────
const UserPrintPacks = ({ userId, userName }) => {
    const [packs, setPacks]         = useState([]);
    const [loading, setLoading]     = useState(false);
    const [open, setOpen]           = useState(false);
    const [fetched, setFetched]     = useState(false);

    // Modal de revocación
    const [showRevokeModal, setShowRevokeModal]   = useState(false);
    const [revokingPack, setRevokingPack]         = useState(null);
    const [revokeReason, setRevokeReason]         = useState('');
    const [revoking, setRevoking]                 = useState(false);

    const fetchPacks = async () => {
        if (fetched) return;
        try {
            setLoading(true);
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'print_packs', [
                    Query.equal('client_id', userId),
                    Query.orderDesc('activated_at'),
                    Query.limit(20),
                ]
            );
            setPacks(res.documents);
            setFetched(true);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleToggle = () => {
        setOpen(o => !o);
        if (!fetched) fetchPacks();
    };

    const openRevokeModal = (pack) => {
        setRevokingPack(pack);
        setRevokeReason('');
        setShowRevokeModal(true);
    };

    const handleRevoke = async () => {
        if (!revokingPack) return;
        if (revokeReason.trim().length < 20) {
            toast.error('El motivo debe tener al menos 20 caracteres.');
            return;
        }
        try {
            setRevoking(true);
            await databases.updateDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'print_packs', revokingPack.$id,
                { status: 'revocado', revoked_reason: revokeReason.trim() }
            );
            setPacks(prev => prev.map(p =>
                p.$id === revokingPack.$id
                    ? { ...p, status: 'revocado', revoked_reason: revokeReason.trim() }
                    : p
            ));
            toast.success(`Pack de ${userName} revocado.`);
            setShowRevokeModal(false);
            setRevokingPack(null);
        } catch (e) {
            console.error(e);
            toast.error('Error al revocar el pack.');
        } finally { setRevoking(false); }
    };

    const activePacks = packs.filter(p => p.status === 'activo');

    return (
        <>
            {/* Toggle PrintPass™ */}
            <button
                onClick={handleToggle}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase border transition ${
                    open
                        ? 'bg-primary/20 text-primary border-primary/30'
                        : activePacks.length > 0
                            ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                            : 'bg-white/5 text-gray-500 border-white/10 hover:bg-white/10'
                }`}>
                <Printer size={9} />
                PrintPass™
                {activePacks.length > 0 && (
                    <span className="bg-primary text-white px-1 rounded-full">{activePacks.length}</span>
                )}
                {open ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
            </button>

            {/* Panel de packs */}
            {open && (
                <div className="mt-2 bg-black/30 border border-primary/15 rounded-xl p-3 space-y-2">
                    {loading ? (
                        <div className="flex items-center gap-2 text-gray-500 text-xs py-2">
                            <Loader2 size={12} className="animate-spin" /> Cargando packs...
                        </div>
                    ) : packs.length === 0 ? (
                        <p className="text-[11px] text-gray-600 text-center py-2">Sin packs registrados.</p>
                    ) : (
                        packs.map(pack => {
                            const rem   = packRemaining(pack);
                            const tot   = packTotal(pack);
                            const days  = daysLeft(pack.expires_at);
                            const isActive = pack.status === 'activo';

                            return (
                                <div key={pack.$id}
                                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border ${statusPackStyle(pack.status)}`}>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                            <span className="text-[9px] font-black uppercase tracking-wide">
                                                {pack.reward_name}
                                            </span>
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase ${statusPackStyle(pack.status)}`}>
                                                {pack.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-[9px] text-gray-500">
                                            <span className="flex items-center gap-0.5">
                                                <Package size={8} /> {rem}/{tot} ud.
                                            </span>
                                            {pack.expires_at && (
                                                <span className="flex items-center gap-0.5">
                                                    <Clock size={8} />
                                                    {isActive ? `${days}d restantes` : new Date(pack.expires_at).toLocaleDateString('es-AR')}
                                                </span>
                                            )}
                                            {pack.location_name && (
                                                <span className="truncate max-w-[100px]">{pack.location_name}</span>
                                            )}
                                        </div>
                                        {pack.status === 'revocado' && pack.revoked_reason && (
                                            <p className="text-[9px] text-red-400 mt-1 line-clamp-2">
                                                Motivo: {pack.revoked_reason}
                                            </p>
                                        )}
                                    </div>
                                    {isActive && (
                                        <button
                                            onClick={() => openRevokeModal(pack)}
                                            className="shrink-0 flex items-center gap-1 text-[9px] font-black text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2 py-1 rounded-lg transition uppercase">
                                            <Ban size={10} /> Revocar
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Modal de revocación */}
            {showRevokeModal && revokingPack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <div style={{ backgroundColor: '#0a0a0f' }}
                        className="border border-red-500/30 w-full max-w-md rounded-[2rem] p-7 shadow-2xl space-y-5">

                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                                    <Ban size={20} className="text-red-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">Revocar Pack</h2>
                                    <p className="text-gray-500 text-xs">{userName}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowRevokeModal(false)} className="p-2 text-gray-500 hover:text-white transition">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Resumen del pack */}
                        <div className="bg-white/3 border border-white/8 rounded-xl p-3 space-y-1 text-[11px]">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Pack</span>
                                <span className="text-white font-bold">{revokingPack.reward_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Saldo restante</span>
                                <span className="text-white font-bold">{packRemaining(revokingPack)} unidades</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Vence</span>
                                <span className="text-white font-bold">
                                    {revokingPack.expires_at ? new Date(revokingPack.expires_at).toLocaleDateString('es-AR') : '—'}
                                </span>
                            </div>
                        </div>

                        {/* Aviso */}
                        <div className="flex items-start gap-2 bg-red-500/8 border border-red-500/15 rounded-xl p-3">
                            <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                            <p className="text-red-400/80 text-[10px] leading-relaxed">
                                Esta acción revoca el pack inmediatamente. El cliente verá el motivo en su dashboard y podrá apelar por ticket en 7 días. No se reintegran los puntos canjeados.
                            </p>
                        </div>

                        {/* Motivo */}
                        <div>
                            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">
                                Motivo de revocación <span className="text-red-400">*</span>
                                <span className="text-gray-600 font-normal normal-case ml-1">(mín. 20 caracteres)</span>
                            </label>
                            <textarea
                                rows={4}
                                value={revokeReason}
                                onChange={e => setRevokeReason(e.target.value)}
                                placeholder="Describí claramente el motivo de la revocación..."
                                style={{
                                    backgroundColor: '#111118',
                                    color: '#d1d5db',
                                    border: `1px solid ${revokeReason.trim().length >= 20 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: '14px',
                                    padding: '12px 16px',
                                    width: '100%',
                                    fontSize: '13px',
                                    outline: 'none',
                                    resize: 'none',
                                    boxSizing: 'border-box',
                                    lineHeight: '1.6',
                                }}
                            />
                            <div className="flex justify-between items-center mt-1">
                                <p className={`text-[10px] ${revokeReason.trim().length >= 20 ? 'text-success' : 'text-gray-600'}`}>
                                    {revokeReason.trim().length}/20 caracteres mínimos
                                </p>
                                {revokeReason.trim().length >= 20 && (
                                    <CheckCircle2 size={12} className="text-success" />
                                )}
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={() => setShowRevokeModal(false)}
                                className="flex-1 py-3 rounded-2xl font-black uppercase text-sm transition"
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleRevoke}
                                disabled={revoking || revokeReason.trim().length < 20}
                                className="flex-[2] py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black transition disabled:opacity-40 uppercase text-sm flex items-center justify-center gap-2">
                                {revoking
                                    ? <><Loader2 size={15} className="animate-spin" /> Revocando...</>
                                    : <><Ban size={15} /> Confirmar Revocación</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ─── Componente principal ────────────────────────────────────
export const AdminUsers = () => {
    const [users, setUsers]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [ppEnabled, setPpEnabled] = useState(false);

    const ROLES = [
        { id: 'client', label: 'Cliente' },
        { id: 'local',  label: 'Local'   },
        { id: 'admin',  label: 'Admin'   },
    ];

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const [usersRes, ppRes] = await Promise.all([
                databases.listDocuments(dbId, 'users', [Query.limit(100), Query.orderDesc('$createdAt')]),
                databases.listDocuments(dbId, 'system_config', [Query.equal('type', 'printpass_config')]),
            ]);
            setUsers(usersRes.documents);
            if (ppRes.documents.length > 0) {
                const data = JSON.parse(ppRes.documents[0].data);
                setPpEnabled(data.enabled === true);
            }
        } catch { toast.error('Error al cargar usuarios.'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleRoleChange = async (userId, newRole) => {
        try {
            setUpdatingId(userId);
            await databases.updateDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users', userId,
                { user_type: newRole }
            );
            setUsers(users.map(u => u.$id === userId ? { ...u, user_type: newRole } : u));
            toast.success('Rol actualizado.');
        } catch { toast.error('Error al actualizar.'); }
        finally { setUpdatingId(null); }
    };

    const handleDelete = async (userId, name) => {
        if (!window.confirm(
            `¿Eliminar a "${name}" completamente del sistema?\n\nEsta acción borrará al usuario de la base de datos y su cuenta de acceso.`
        )) return;
        try {
            setDeletingId(userId);
            const response = await fetch(`${import.meta.env.VITE_APPWRITE_ENDPOINT}/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Appwrite-Project': import.meta.env.VITE_APPWRITE_PROJECT_ID,
                    'X-Appwrite-Key': import.meta.env.VITE_APPWRITE_API_KEY,
                }
            });
            if (!response.ok && response.status !== 404) throw new Error('Error en Auth API');
            try {
                await databases.deleteDocument(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users', userId);
            } catch (e) { if (e.code !== 404) throw e; }
            setUsers(users.filter(u => u.$id !== userId));
            toast.success('Usuario eliminado.');
        } catch (e) {
            console.error(e);
            toast.error('Error al eliminar.');
        } finally { setDeletingId(null); }
    };

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                    Gestión de Usuarios
                </h1>
                <p className="text-gray-400 mt-2">
                    Administrá roles, accesos{ppEnabled ? ' y PrintPass™ de cada usuario' : ''}.
                </p>
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glow">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div>
                        {/* ── Mobile: cards ── */}
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
                                        <select
                                            disabled={updatingId === u.$id}
                                            value={u.user_type || 'client'}
                                            onChange={(e) => handleRoleChange(u.$id, e.target.value)}
                                            style={{ backgroundColor: '#1a1a1a', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', outline: 'none' }}
                                            className="flex-1 disabled:opacity-50">
                                            {ROLES.map(r => (
                                                <option key={r.id} value={r.id} style={{ backgroundColor: '#1a1a1a' }}>{r.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleDelete(u.$id, u.full_name || u.email)}
                                            disabled={deletingId === u.$id}
                                            className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition disabled:opacity-50 shrink-0">
                                            {deletingId === u.$id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                        </button>
                                    </div>
                                    {/* PrintPass™ por usuario (mobile) */}
                                    {ppEnabled && !AccessService.isAdmin(u) && (
                                        <UserPrintPacks userId={u.$id} userName={u.full_name || u.email} />
                                    )}
                                </div>
                            ))}
                            {users.length === 0 && (
                                <div className="py-8 text-center text-gray-400">No se encontraron usuarios</div>
                            )}
                        </div>

                        {/* ── Desktop: tabla ── */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/10 text-gray-400 text-sm">
                                        <th className="py-4 px-4 font-medium">Nombre</th>
                                        <th className="py-4 px-4 font-medium hidden md:table-cell">Email</th>
                                        <th className="py-4 px-4 font-medium hidden lg:table-cell">Registro</th>
                                        <th className="py-4 px-4 font-medium">Rol</th>
                                        <th className="py-4 px-4 font-medium text-center">Cambiar Rol</th>
                                        {ppEnabled && (
                                            <th className="py-4 px-4 font-medium text-center">
                                                <span className="flex items-center gap-1 justify-center">
                                                    <Printer size={12} className="text-primary" /> PrintPass™
                                                </span>
                                            </th>
                                        )}
                                        <th className="py-4 px-4 font-medium text-right">Eliminar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {users.map(u => (
                                        <tr key={u.$id} className="hover:bg-white/3 transition-colors align-top">
                                            <td className="py-4 px-4 font-medium text-white">
                                                {u.full_name || 'Desconocido'}
                                            </td>
                                            <td className="py-4 px-4 text-gray-300 hidden md:table-cell text-sm">
                                                {u.email}
                                            </td>
                                            <td className="py-4 px-4 text-gray-400 text-sm hidden lg:table-cell">
                                                {new Date(u.$createdAt).toLocaleDateString('es-AR')}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleStyle(u.user_type)}`}>
                                                    <RoleIcon t={u.user_type} />
                                                    {(u.user_type || 'client').toUpperCase()}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <select
                                                        disabled={updatingId === u.$id}
                                                        value={u.user_type || 'client'}
                                                        onChange={(e) => handleRoleChange(u.$id, e.target.value)}
                                                        style={{ backgroundColor: '#1a1a1a', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '6px 10px', fontSize: '13px', outline: 'none' }}
                                                        className="disabled:opacity-50">
                                                        {ROLES.map(r => (
                                                            <option key={r.id} value={r.id} style={{ backgroundColor: '#1a1a1a' }}>{r.label}</option>
                                                        ))}
                                                    </select>
                                                    {updatingId === u.$id && (
                                                        <Loader2 size={14} className="animate-spin text-primary" />
                                                    )}
                                                </div>
                                            </td>
                                            {/* Columna PrintPass™ */}
                                            {ppEnabled && (
                                                <td className="py-4 px-4 text-center">
                                                    {!AccessService.isAdmin(u) ? (
                                                        <UserPrintPacks
                                                            userId={u.$id}
                                                            userName={u.full_name || u.email}
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] text-gray-700">—</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="py-4 px-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(u.$id, u.full_name || u.email)}
                                                    disabled={deletingId === u.$id}
                                                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition disabled:opacity-50">
                                                    {deletingId === u.$id
                                                        ? <Loader2 size={16} className="animate-spin" />
                                                        : <Trash2 size={16} />
                                                    }
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={ppEnabled ? 7 : 6} className="py-8 text-center text-gray-400">
                                                No se encontraron usuarios
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

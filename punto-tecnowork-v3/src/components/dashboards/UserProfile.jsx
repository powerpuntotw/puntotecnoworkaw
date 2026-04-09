import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { avatars } from '../../lib/appwrite';
import { TierCalculator } from '../../lib/constants';
import { User, Mail, Phone, MapPin, CreditCard, Save, Loader2, LogOut, CheckCircle, Star, Trophy, Zap, Target, Shield, Store } from 'lucide-react';

// ── Field definido FUERA del componente ────────────────────────────────────
// Si se define adentro, React recrea el nodo en cada keystroke → pierde foco.
const Field = ({ label, icon: Icon, accent, children }) => (
    <div className="space-y-2">
        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${accent || 'text-gray-500'}`}>
            {label}
        </label>
        <div className="relative">
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            {children}
        </div>
    </div>
);

export const UserProfile = () => {
    const { user, dbUser, updateProfile, logout, isProfileComplete } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const profileComplete = isProfileComplete();
    const [formData, setFormData] = useState({ full_name: '', phone: '', dni: '', address: '' });

    useEffect(() => {
        if (dbUser) {
            setFormData({
                full_name: dbUser.full_name || '',
                phone: dbUser.phone || '',
                dni: dbUser.dni || '',
                address: dbUser.address || '',
            });
        }
    }, [dbUser]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try { await updateProfile(formData); }
        catch (err) { console.error(err); }
        finally { setIsSaving(false); }
    };

    const points           = dbUser?.points ?? 0;
    const historicalPoints = dbUser?.historical_points ?? 0;

    // TierCalculator POO — umbrales correctos desde constants.js
    const tierCalc = new TierCalculator(historicalPoints);
    const tierInfo = tierCalc.toInfo();
    const TIER_ICONS = { Diamond: Trophy, Gold: Star, Silver: Target, Bronze: Zap };
    // Compatibilidad con el JSX existente que usa tier.name, tier.bg, etc.
    const tier = {
        name:     tierInfo.name,
        color:    tierInfo.color,
        bg:       `${tierInfo.gradient} opacity-20`,
        next:     tierInfo.next,
        progress: tierInfo.progress,
        icon:     TIER_ICONS[tierInfo.name] || Zap,
    };
    const TierIcon = tier.icon;
    const roleLabel = { admin: 'Administrador', local: 'Local', client: 'Cliente' }[dbUser?.user_type] || 'Cliente';
    const RoleIcon = dbUser?.user_type === 'admin' ? Shield : dbUser?.user_type === 'local' ? Store : User;

    const googleAvatar = user?.prefs?.avatar;
    const fallbackAvatar = avatars.getInitials(user?.name || user?.email || 'U', 96, 96).toString();
    const avatarUrl = googleAvatar || fallbackAvatar;

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-24 lg:pb-10">
            {/* Hero Card */}
            <div className={`relative bg-gradient-to-br ${tier.bg} border border-white/10 rounded-3xl overflow-hidden shadow-2xl`}>
                <div className="absolute inset-0 bg-gradient-hero opacity-10" />
                <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20" style={{ backgroundColor: tier.color }} />
                <div className="relative z-10 p-6 sm:p-8">
                    <div className="flex items-start gap-5">
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl shadow-2xl border-4 border-white/10 overflow-hidden">
                                <img src={avatarUrl} alt={user?.name || 'Avatar'} className="w-full h-full object-cover"
                                    onError={(e) => { e.target.src = fallbackAvatar; }} />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border-2 border-background" style={{ backgroundColor: tier.color }}>
                                <TierIcon size={14} className="text-white" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                            <h1 className="text-xl sm:text-2xl font-black text-white truncate">{user?.name || 'Usuario'}</h1>
                            <p className="text-gray-400 text-sm truncate mt-0.5">{dbUser?.email || user?.email}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border"
                                    style={{ color: tier.color, borderColor: `${tier.color}40`, backgroundColor: `${tier.color}15` }}>
                                    <TierIcon size={10} /> {tier.name}
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-gray-400">
                                    <RoleIcon size={10} /> {roleLabel}
                                </span>
                                {profileComplete && (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                                        <CheckCircle size={10} /> Completo
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 bg-black/20 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Puntos disponibles</p>
                                <p className="text-3xl font-black text-white italic tracking-tighter leading-none mt-1">
                                    {points.toLocaleString('es-AR', { hour12: false })}
                                    <span className="text-xs font-normal text-gray-500 not-italic ml-1">pts</span>
                                </p>
                            </div>
                            {tier.next && (
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-600 uppercase tracking-widest">Próximo nivel</p>
                                    <p className="text-xs font-bold mt-0.5" style={{ color: tier.color }}>{tier.next}</p>
                                </div>
                            )}
                        </div>
                        {tier.next && (
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${tier.progress}%`, backgroundColor: tier.color }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleUpdate} className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-glow">
                <div className="px-6 sm:px-8 py-5 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-base font-black text-white italic uppercase tracking-tight">Información Personal</h2>
                    {!profileComplete && (
                        <span className="text-[10px] text-warning bg-warning/10 border border-warning/20 px-3 py-1 rounded-full font-bold">
                            Completá para desbloquear
                        </span>
                    )}
                </div>
                <div className="p-6 sm:p-8 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field label="Nombre Completo *" icon={User}>
                            <input type="text" required value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                placeholder="Juan Pérez"
                                className="w-full bg-background/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:border-primary outline-none transition text-sm" />
                        </Field>
                        <Field label="Email (no editable)" icon={Mail}>
                            <input type="email" readOnly value={dbUser?.email || ''}
                                className="w-full bg-background/20 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-gray-500 cursor-not-allowed outline-none text-sm" />
                        </Field>
                        <Field label="Teléfono *" icon={Phone} accent="text-secondary">
                            <input type="tel" required value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+54 9 3704 000000"
                                className="w-full bg-background/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:border-secondary outline-none transition text-sm" />
                        </Field>
                        <Field label="DNI *" icon={CreditCard} accent="text-accent">
                            <input type="text" required maxLength={8} value={formData.dni}
                                onChange={e => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })}
                                placeholder="35123456"
                                className="w-full bg-background/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:border-accent outline-none transition text-sm" />
                        </Field>
                    </div>
                    <Field label="Dirección *" icon={MapPin} accent="text-success">
                        <input type="text" required value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Av. 25 de Mayo 123, Formosa"
                            className="w-full bg-background/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:border-success outline-none transition text-sm" />
                    </Field>
                </div>
                <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-2">
                    <button type="submit" disabled={isSaving}
                        className="w-full bg-primary hover:bg-primary-glow text-white font-black py-4 rounded-2xl shadow-glow flex items-center justify-center gap-3 transition disabled:opacity-50 text-sm uppercase tracking-wider">
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={18} /> Guardar Perfil</>}
                    </button>
                </div>
            </form>

            {/* Cerrar sesión */}
            <button onClick={logout}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-4 rounded-2xl border border-red-500/20 flex items-center justify-center gap-3 transition text-sm">
                <LogOut size={18} /> Cerrar Sesión
            </button>
        </div>
    );
};

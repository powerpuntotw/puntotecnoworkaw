import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, MapPin, CreditCard, Save, Loader2, LogOut, CheckCircle } from 'lucide-react';

export const UserProfile = () => {
    const { user, dbUser, updateProfile, logout, isProfileComplete } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const profileComplete = isProfileComplete();

    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        dni: '',
        address: '',
    });

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
        if (!formData.full_name || !formData.phone || !formData.dni || !formData.address) {
            return;
        }
        setIsSaving(true);
        try {
            await updateProfile(formData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-10">

            {/* Header */}
            <div className="relative h-36 bg-gradient-hero rounded-3xl overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
                <div className="absolute -bottom-10 left-10 flex items-end gap-5">
                    <div className="w-24 h-24 rounded-3xl bg-card border-4 border-background flex items-center justify-center shadow-2xl">
                        <span className="text-4xl font-black text-primary-glow select-none">
                            {user?.name?.[0]?.toUpperCase()}
                        </span>
                    </div>
                    <div className="mb-3">
                        <h1 className="text-2xl font-black text-white">{user?.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-300 uppercase tracking-widest text-[10px] bg-white/10 px-2 py-0.5 rounded-full">
                                {dbUser?.user_type || 'Cliente'}
                            </span>
                            {profileComplete && (
                                <span className="flex items-center gap-1 text-success text-[10px] font-bold bg-success/10 px-2 py-0.5 rounded-full">
                                    <CheckCircle size={10} /> Perfil completo
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-10">
                <form onSubmit={handleUpdate} className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-glow space-y-6">
                    <h3 className="text-lg font-bold text-white italic">Información Personal</h3>

                    {!profileComplete && (
                        <div className="bg-warning/10 border border-warning/30 rounded-2xl px-5 py-3 text-warning text-sm font-medium">
                            Completá todos los campos para desbloquear la aplicación.
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase tracking-widest font-bold ml-1">Nombre Completo *</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-primary outline-none transition"
                                    placeholder="Juan Pérez"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase tracking-widest font-bold ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="email"
                                    readOnly
                                    value={dbUser?.email || ''}
                                    className="w-full bg-background/20 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-gray-500 cursor-not-allowed outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase tracking-widest font-bold ml-1">Teléfono *</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-secondary outline-none transition"
                                    placeholder="+54 9 3704 000000"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase tracking-widest font-bold ml-1">DNI *</label>
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    required
                                    maxLength={8}
                                    value={formData.dni}
                                    onChange={e => setFormData({...formData, dni: e.target.value.replace(/\D/g, '')})}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-accent outline-none transition"
                                    placeholder="35123456"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase tracking-widest font-bold ml-1">Dirección *</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                required
                                value={formData.address}
                                onChange={e => setFormData({...formData, address: e.target.value})}
                                className="w-full bg-background/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-success outline-none transition"
                                placeholder="Av. 25 de Mayo 123, Formosa"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-primary hover:bg-primary-glow text-white font-bold py-4 rounded-2xl shadow-glow flex items-center justify-center gap-3 transition disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Guardar Perfil</>}
                    </button>
                </form>

                <button
                    onClick={logout}
                    className="w-full mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 rounded-3xl border border-red-500/20 flex items-center justify-center gap-3 transition"
                >
                    <LogOut size={20} /> Cerrar Sesión
                </button>
            </div>
        </div>
    );
};

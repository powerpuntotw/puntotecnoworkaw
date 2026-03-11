import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Shield, Smartphone, Camera, Save, Loader2, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export const UserProfile = () => {
    const { user, dbUser, logout } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulación de guardado para ahora
        setTimeout(() => {
            toast.success("Perfil actualizado correctamente");
            setIsSaving(false);
        }, 1000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div className="relative h-48 bg-gradient-hero rounded-3xl overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
                <div className="absolute -bottom-12 left-10 flex items-end gap-6">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-3xl bg-card border-4 border-background flex items-center justify-center shadow-2xl relative overflow-hidden">
                            <span className="text-5xl font-black text-primary-glow select-none">{user?.name?.[0]?.toUpperCase()}</span>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                <Camera size={24} className="text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="mb-4">
                        <h1 className="text-3xl font-black text-white">{user?.name}</h1>
                        <p className="text-gray-300 font-medium opacity-80 uppercase tracking-widest text-[10px] bg-white/10 px-2 py-0.5 rounded-full inline-block mt-1">
                            {dbUser?.user_type || 'Cliente'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10">
                <div className="md:col-span-2 space-y-6">
                    <form onSubmit={handleUpdate} className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-glow space-y-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 italic">
                            Información Personal
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold ml-1">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input 
                                        type="text" 
                                        defaultValue={user?.name} 
                                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-primary outline-none transition"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold ml-1">Correo Electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input 
                                        type="email" 
                                        readOnly 
                                        defaultValue={user?.email} 
                                        className="w-full bg-background/20 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-gray-500 cursor-not-allowed outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="w-full bg-primary hover:bg-primary-glow text-white font-bold py-4 rounded-2xl shadow-glow flex items-center justify-center gap-3 transition disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Actualizar Perfil</>}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="space-y-6">
                    <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-glow space-y-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Seguridad</h3>
                        <div className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-3">
                                <Smartphone size={18} className="text-gray-500 group-hover:text-primary transition" />
                                <span className="text-sm text-gray-300">Autenticación 2FA</span>
                            </div>
                            <div className="w-8 h-4 bg-white/10 rounded-full relative">
                                <div className="absolute left-1 top-1 w-2 h-2 bg-gray-600 rounded-full"></div>
                            </div>
                        </div>
                        <div className="h-[1px] bg-white/5"></div>
                        <div className="flex items-center gap-3 text-gray-500 hover:text-white transition cursor-pointer">
                            <Shield size={18} />
                            <span className="text-sm">Cambiar Contraseña</span>
                        </div>
                    </div>

                    <button 
                        onClick={logout}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 rounded-3xl border border-red-500/20 flex items-center justify-center gap-3 transition"
                    >
                        <LogOut size={20} /> Cerrar Sesión Segura
                    </button>
                </div>
            </div>
        </div>
    );
};

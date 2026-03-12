import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { User, Phone, Mail, ArrowRight, Loader2, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export const CompleteProfile = () => {
    const { dbUser, updateProfile, logout, isProfileComplete } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: dbUser?.full_name || '',
        phone: dbUser?.phone || '',
        email: dbUser?.email || '',
        dni: dbUser?.dni || ''
    });

    // Sincronizar formData cuando dbUser cargue
    useEffect(() => {
        if (dbUser) {
            setFormData({
                full_name: dbUser.full_name || '',
                phone: dbUser.phone || '',
                email: dbUser.email || '',
                dni: dbUser.dni || ''
            });
        }
    }, [dbUser]);

    // Redirigir si el perfil ya está completo
    useEffect(() => {
        if (dbUser && isProfileComplete()) {
            navigate('/dashboard');
        }
    }, [dbUser, navigate, isProfileComplete]);

    // Guard DESPUÉS de todos los hooks
    if (!dbUser) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.full_name || !formData.phone || !formData.email) {
            toast.error("Por favor completa todos los campos");
            return;
        }

        try {
            setLoading(true);
            await updateProfile(formData);
            toast.success("Perfil completado. ¡Bienvenido!");
            navigate('/dashboard');
        } catch (error) {
            console.error("Profile update error:", error);
            toast.error("Ocurrió un error al actualizar el perfil.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(235,28,36,0.1),transparent_50%)] z-0" />
            <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(0,147,216,0.1),transparent_50%)] z-0" />
            
            <div className="bg-card/40 backdrop-blur-3xl border border-white/10 w-full max-w-xl rounded-[3rem] p-12 shadow-3xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/30 shadow-glow shadow-primary/20">
                        <User className="text-primary" size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">Completar Perfil</h1>
                    <p className="text-gray-400 font-medium">Necesitamos estos datos para procesar tus pedidos correctamente.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">Nombre Completo</label>
                        <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-primary" size={20} />
                            <input 
                                required
                                type="text"
                                placeholder="Ej: Juan Pérez"
                                value={formData.full_name}
                                onChange={e => setFormData({...formData, full_name: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-white font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition placeholder:text-gray-700"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">Teléfono de Contacto</label>
                        <div className="relative">
                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary" size={20} />
                            <input 
                                required
                                type="tel"
                                placeholder="Ej: +54 9 11 1234 5678"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-white font-bold focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition placeholder:text-gray-700"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-accent" size={20} />
                            <input 
                                required
                                type="email"
                                placeholder="tu@email.com"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-white font-bold focus:border-accent focus:ring-1 focus:ring-accent outline-none transition placeholder:text-gray-700"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="group w-full bg-primary hover:bg-primary-glow text-white py-6 rounded-3xl font-black text-xl italic tracking-tighter uppercase transition shadow-glow shadow-primary/30 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>Configurar Mi Cuenta <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" /></>}
                    </button>

                    <button 
                        type="button" 
                        onClick={logout}
                        className="w-full text-gray-600 hover:text-white transition font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 pt-4"
                    >
                        <LogOut size={14} /> Cerrar Sesión
                    </button>
                </form>
            </div>
        </div>
    );
};

import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { Layers, Shield } from 'lucide-react';

export const Landing = () => {
    const { loginWithGoogle, user } = useAuth();
    const { platformName, logoMain, logoLight, logoDark, getLogoUrl } = useBranding();

    if (user) {
        window.location.href = '/dashboard';
        return null;
    }

    const displayName = platformName || 'Punto Tecnowork';
    const navLogoUrl = logoMain ? getLogoUrl(logoMain) : null;
    const footerLogo1Url = logoLight ? getLogoUrl(logoLight) : null;
    const footerLogo2Url = logoDark ? getLogoUrl(logoDark) : null;

    return (
        <div className="min-h-screen bg-background text-foreground overflow-hidden font-['Space_Grotesk',sans-serif]">
            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 bg-background/50 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {navLogoUrl ? (
                            <img src={navLogoUrl} alt={displayName} className="w-10 h-10 object-contain rounded-xl" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center font-bold text-xl shadow-[0_0_15px_rgba(235,28,36,0.5)] text-white">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="font-bold text-xl tracking-wide bg-gradient-to-r from-primary-glow to-secondary text-transparent bg-clip-text">
                            {displayName}
                        </span>
                    </div>
                    <div className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
                        <a href="#ventajas" className="hover:text-primary-glow transition">Ventajas</a>
                        <a href="#niveles" className="hover:text-secondary transition">Gamificación</a>
                        <a href="#locales" className="hover:text-success transition">Locales</a>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
                <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 mix-blend-screen transform -translate-x-1/2"></div>
                <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[120px] -z-10 mix-blend-screen transform translate-x-1/3"></div>

                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary-glow text-sm font-medium mb-4">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-glow opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            v3.0 Plataforma Global
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight text-white drop-shadow-lg">
                            Revoluciona tu <br />forma de <span className="bg-gradient-hero bg-clip-text text-transparent">imprimir.</span>
                        </h1>
                        <p className="text-lg text-gray-400 max-w-lg leading-relaxed">
                            Envía archivos desde tu móvil, págalos online y retíralos sin filas. Cada impresión suma puntos para canjear por premios físicos y digitales.
                        </p>
                        <div className="flex gap-4 pt-4">
                            <div className="flex items-center gap-2 text-sm text-gray-300 font-medium">
                                <Shield className="text-success" size={20} /> Producción Segura
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-300 font-medium">
                                <Layers className="text-secondary" size={20} /> Múltiples Calidades
                            </div>
                        </div>
                    </div>

                    {/* Card de login — solo Google */}
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-br from-primary via-secondary to-success opacity-30 blur-2xl rounded-[3rem]"></div>
                        <div className="relative bg-card/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 lg:p-14 shadow-2xl flex flex-col items-center text-center">
                            <h2 className="text-3xl font-bold text-white mb-2">Ingresa a tu cuenta</h2>
                            <p className="text-gray-400 mb-10 text-sm">Gestiona órdenes y acumula puntos instantáneamente.</p>
                            <button
                                type="button"
                                onClick={loginWithGoogle}
                                className="w-full relative group overflow-hidden rounded-xl bg-white/5 border border-white/10 p-[1px] transition-all hover:bg-white/10"
                            >
                                <div className="relative flex items-center justify-center gap-3 px-8 py-4 rounded-xl transition-all text-white font-semibold text-base">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Continuar con Google
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Gamification Section */}
            <section id="niveles" className="py-24 border-t border-white/5 bg-background relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl font-bold text-white mb-4">Sube de Nivel, Gana Premios</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto mb-16 text-lg">El primer ecosistema de impresión gamificado. El 10% de lo que gastas vuelve en puntos a tu billetera virtual.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { title: 'Bronce', pts: '0 Pts', color: 'from-[#cd7f32]/20 to-[#cd7f32]/5', text: 'text-[#cd7f32]' },
                            { title: 'Plata', pts: '1,000 Pts', color: 'from-gray-300/20 to-gray-300/5', text: 'text-gray-300' },
                            { title: 'Oro', pts: '2,000 Pts', color: 'from-warning/20 to-warning/5', text: 'text-warning' },
                            { title: 'Diamante', pts: '3,000 Pts', color: 'from-secondary/20 to-secondary/5', text: 'text-secondary' },
                        ].map((tier, i) => (
                            <div key={i} className={`p-8 rounded-3xl bg-gradient-to-br ${tier.color} border border-white/5 glass hover:-translate-y-2 transition-transform duration-300`}>
                                <div className={`text-4xl font-black ${tier.text} mb-2 drop-shadow-md`}>{tier.title}</div>
                                <div className="text-white font-mono text-sm bg-black/30 px-3 py-1 rounded-full inline-block">{tier.pts}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-xs text-gray-600">
                        © {new Date().getFullYear()} {displayName} · Plataforma de impresión inteligente
                    </p>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-700 mr-1">Powered by</span>
                        {footerLogo1Url && <img src={footerLogo1Url} alt="" className="h-7 w-auto object-contain opacity-60 hover:opacity-100 transition" />}
                        {footerLogo2Url && <img src={footerLogo2Url} alt="" className="h-7 w-auto object-contain opacity-60 hover:opacity-100 transition" />}
                        {!footerLogo1Url && !footerLogo2Url && <span className="text-xs text-gray-700">{displayName} v3</span>}
                    </div>
                </div>
            </footer>
        </div>
    );
};

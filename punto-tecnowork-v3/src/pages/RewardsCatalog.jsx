import { Gift, Lock } from 'lucide-react';

export const RewardsCatalog = () => {
    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card border border-white/5 p-8 rounded-3xl glass shadow-[0_0_30px_rgba(6,182,212,0.05)]">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Canjea tus puntos, disfruta tus premios</h1>
                    <p className="text-gray-400">Imprime inteligentemente. Obtienes el 10% de cada compra en puntos.</p>
                </div>
                <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-6 text-center min-w-[200px] shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]">
                    <p className="text-secondary text-sm font-semibold uppercase font-mono">Saldo Actual</p>
                    <p className="text-4xl font-bold flex items-center justify-center gap-2 bg-gradient-hero bg-clip-text text-transparent drop-shadow-sm mt-1">1,500 <Gift size={28} className="text-secondary opacity-80" /></p>
                </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <button className="px-6 py-2 rounded-full bg-primary text-white font-medium border border-primary-glow/50 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition">Todos</button>
                <button className="px-6 py-2 rounded-full bg-white/5 text-gray-400 font-medium border border-white/10 hover:bg-white/10 hover:text-white transition whitespace-nowrap">Merchandising</button>
                <button className="px-6 py-2 rounded-full bg-white/5 text-gray-400 font-medium border border-white/10 hover:bg-white/10 hover:text-white transition whitespace-nowrap">Descuentos</button>
                <button className="px-6 py-2 rounded-full bg-white/5 text-gray-400 font-medium border border-white/10 hover:bg-white/10 hover:text-white transition whitespace-nowrap">Servicios Digitales</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Reward Card: Available */}
                <div className="bg-card border border-white/10 rounded-3xl overflow-hidden glass hover:border-primary/50 transition-all group">
                    <div className="h-48 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=500')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
                    </div>
                    <div className="p-6 relative z-10 -mt-10">
                        <h3 className="text-xl font-bold text-white mb-1">Camiseta Exclusiva v3</h3>
                        <p className="text-sm text-gray-400 mb-6">Camiseta térmica 100% algodón con logo brilla en la oscuridad.</p>
                        <button className="w-full py-3 bg-primary/20 hover:bg-primary border border-primary rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)]">
                            Canjear por 500 Pts
                        </button>
                    </div>
                </div>

                {/* Reward Card: Unavailable (Locked) */}
                <div className="bg-card border border-white/5 rounded-3xl overflow-hidden glass opacity-80">
                    <div className="h-48 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center relative overflow-hidden grayscale">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=500')] bg-cover bg-center opacity-30"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
                    </div>
                    <div className="p-6 relative z-10 -mt-10">
                        <h3 className="text-xl font-bold text-gray-300 mb-1">Monitor Pro 27&quot;</h3>
                        <p className="text-sm text-gray-500 mb-6">Sorteo exclusivo trimestral para creadores nivel Oro.</p>
                        <div className="flex flex-col items-center">
                            <button disabled className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-gray-500 font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                                <Lock size={16} /> Canjear por 2,500 Pts
                            </button>
                            <span className="text-xs text-secondary mt-2 font-medium bg-secondary/10 px-3 py-1 rounded-full"><Lock size={10} className="inline mr-1" />Te faltan 1,000 Pts</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

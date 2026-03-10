import { Send, Search, CheckCircle } from 'lucide-react';

export const TicketsSystem = () => {
    return (
        <div className="flex h-[calc(100vh-120px)] gap-6">
            {/* Sidebar de Tickets */}
            <div className="w-1/3 bg-card border border-white/5 rounded-3xl glass flex flex-col overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/10 bg-white/5">
                    <h2 className="text-xl font-bold text-white mb-4">Soporte y Mensajes</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input type="text" placeholder="Buscar ticket..." className="w-full bg-background border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-primary outline-none transition" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Active Ticket Item */}
                    <div className="p-4 border-b border-white/5 bg-primary/10 border-l-4 border-l-primary cursor-pointer hover:bg-primary/20 transition">
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-white">#TK-4092</span>
                            <span className="text-xs text-primary-glow font-medium">10:45 AM</span>
                        </div>
                        <p className="text-sm text-gray-300 font-medium">Error al imprimir PDF a color</p>
                        <p className="text-xs text-gray-500 mt-1 truncate">Cliente: Alejandro G. (Sucursal Centro)</p>
                    </div>

                    {/* Closed Ticket Item */}
                    <div className="p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition opacity-60">
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-gray-400">#TK-4021</span>
                            <span className="text-xs text-gray-500 font-medium">Ayer</span>
                        </div>
                        <p className="text-sm text-gray-400 font-medium flex items-center gap-1"><CheckCircle size={14} className="text-success" /> Devolución de puntos aprobada</p>
                        <p className="text-xs text-gray-600 mt-1 truncate">Admin: Sistema Global</p>
                    </div>
                </div>
            </div>

            {/* Ventana de Chat (Main) */}
            <div className="flex-1 bg-card border border-white/5 rounded-3xl glass flex flex-col overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">#TK-4092: Error al imprimir PDF a color</h3>
                        <p className="text-sm text-secondary flex items-center gap-1 mt-1"><div className="w-2 h-2 rounded-full bg-secondary"></div> Abierto - Sucursal Centro</p>
                    </div>
                    <button className="px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition">Cerrar Ticket</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Chat Bubble (Recibido) */}
                    <div className="flex justify-start">
                        <div className="bg-white/5 border border-white/10 text-white rounded-2xl rounded-tl-sm p-4 max-w-[70%]">
                            <p className="text-xs font-semibold text-gray-400 mb-1">Cliente (Alejandro G.)</p>
                            <p className="text-sm">Hola, mandé a imprimir a la sucursal Centro pero llegó cortado el margen. ¿Me reintegran los puntos o me lo re-imprimen?</p>
                            <span className="text-xs text-gray-500 mt-2 block text-right">10:45 AM</span>
                        </div>
                    </div>

                    {/* Chat Bubble (Enviado) */}
                    <div className="flex justify-end">
                        <div className="bg-primary/20 border border-primary/30 text-white rounded-2xl rounded-tr-sm p-4 max-w-[70%] shadow-[0_5px_15px_rgba(99,102,241,0.1)]">
                            <p className="text-xs font-semibold text-primary-glow mb-1">Emisor (Tú)</p>
                            <p className="text-sm">Hola Alejandro. Ya revisamos el PDF y efectivamente tuvimos un problema de sangría en la máquina 2. Paso a reintegrarte los puntos automáticamente a tu cuenta. Disculpa las molestias.</p>
                            <span className="text-xs text-primary/50 mt-2 block text-right">10:48 AM</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-background border-t border-white/10">
                    <div className="relative flex items-center">
                        <input type="text" placeholder="Escribe una respuesta para #TK-4092..." className="w-full bg-card border border-white/10 rounded-full py-3 pl-6 pr-14 text-white placeholder:text-gray-500 focus:border-primary outline-none transition" />
                        <button className="absolute right-2 p-2 bg-primary text-white rounded-full hover:bg-primary-glow transition shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

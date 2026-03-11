import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, client } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { MessageSquare, Send, User, ChevronRight, Loader2, Sparkles, AlertCircle, Phone } from 'lucide-react';

export const TicketsSystem = () => {
    const { user, dbUser } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [activeTicket, setActiveTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            let queries = [Query.orderDesc('$createdAt')];
            
            // Only admins see all tickets
            if (dbUser?.user_type !== 'admin') {
                queries.push(Query.equal('client_id', user.$id));
            }

            const res = await databases.listDocuments(dbId, 'tickets', queries);
            setTickets(res.documents);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
        
        // Realtime subscription for NEW TICKETS
        const unsubscribe = client.subscribe(
            `databases.${import.meta.env.VITE_APPWRITE_DATABASE_ID}.collections.tickets.documents`,
            response => {
                if (response.events.includes('databases.*.collections.*.documents.*.create')) {
                    setTickets(prev => [response.payload, ...prev]);
                    toast.success("Nuevo ticket recibido", { 
                        icon: '🎫',
                        style: { background: '#1a1a1a', color: '#fff', borderRadius: '15px' }
                    });
                }
            }
        );

        return () => unsubscribe();
    }, []);

    const selectTicket = async (ticket) => {
        setActiveTicket(ticket);
        try {
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const res = await databases.listDocuments(dbId, 'messages', [
                Query.equal('ticket_id', ticket.$id),
                Query.orderAsc('$createdAt')
            ]);
            setMessages(res.documents);

            // Subscribe to messages for THIS ticket
            client.subscribe(
                `databases.${dbId}.collections.messages.documents`,
                response => {
                    if (response.payload.ticket_id === ticket.$id) {
                        setMessages(prev => {
                            if (prev.find(m => m.$id === response.payload.$id)) return prev;
                            return [...prev, response.payload];
                        });
                        if (response.payload.sender_id !== user.$id) {
                            new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3').play().catch(() => {});
                        }
                    }
                }
            );
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeTicket) return;

        try {
            setSending(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const msg = {
                ticket_id: activeTicket.$id,
                sender_id: user.$id,
                sender_name: user.name,
                content: newMessage,
                role: dbUser?.user_type || 'client'
            };
            
            await databases.createDocument(dbId, 'messages', ID.unique(), msg);
            setNewMessage('');
            
            // Update ticket status if admin is replying
            if (dbUser?.user_type === 'admin' && activeTicket.status === 'open') {
                await databases.updateDocument(dbId, 'tickets', activeTicket.$id, { status: 'answered' });
            }
        } catch (error) {
            toast.error("Error al enviar mensaje");
        } finally {
            setSending(false);
        }
    };

    const createTicket = async () => {
        const subject = prompt("¿Cuál es el motivo de tu consulta?");
        if (!subject) return;

        try {
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const ticket = await databases.createDocument(dbId, 'tickets', ID.unique(), {
                client_id: user.$id,
                client_name: user.name,
                subject: subject,
                status: 'open'
            });
            toast.success("Ticket abierto correctamente");
            selectTicket(ticket);
        } catch (error) {
            toast.error("Error al crear ticket");
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex gap-6 overflow-hidden pb-4">
            {/* Sidebar de Tickets */}
            <div className="w-80 flex flex-col bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                
                <div className="p-8 border-b border-white/5 flex justify-between items-center relative z-10">
                    <div>
                        <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Soporte</h2>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Centro de Ayuda</p>
                    </div>
                    {dbUser?.user_type === 'client' && (
                        <button onClick={createTicket} className="p-3 bg-primary hover:bg-primary-glow text-white rounded-2xl transition shadow-glow">
                            <Plus size={18} />
                        </button>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative z-10">
                    {loading ? (
                        <div className="flex justify-center py-20 text-primary"><Loader2 className="animate-spin" /></div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-10 opacity-20 flex flex-col items-center gap-3">
                            <MessageSquare size={32} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Sin casos activos</p>
                        </div>
                    ) : (
                        tickets.map(t => (
                            <div 
                                key={t.$id} 
                                onClick={() => selectTicket(t)}
                                className={`group p-5 rounded-[1.8rem] cursor-pointer transition-all duration-300 flex items-center gap-4 border relative overflow-hidden ${activeTicket?.$id === t.$id ? 'bg-primary/10 border-primary/30 shadow-glow shadow-primary/5' : 'bg-white/3 border-white/5 hover:border-white/10'}`}
                            >
                                <div className={`w-2.5 h-2.5 rounded-full ${t.status === 'open' ? 'bg-primary shadow-[0_0_12px_rgba(235,28,36,0.5)] animate-pulse' : 'bg-gray-700'}`}></div>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="text-sm font-black text-white truncate italic uppercase tracking-tight group-hover:text-primary transition">{t.subject}</h4>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">{t.client_name}</p>
                                </div>
                                <ChevronRight size={14} className={`transition-transform duration-300 ${activeTicket?.$id === t.$id ? 'translate-x-1 text-primary' : 'text-gray-700'}`} />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Area de Chat */}
            <div className="flex-1 flex flex-col bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
                
                {activeTicket ? (
                    <>
                        <div className="p-8 border-b border-white/5 bg-white/3 flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary-glow font-black text-2xl border border-primary/20 italic shadow-glow">
                                    #
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{activeTicket.subject}</h3>
                                    <p className="text-xs text-gray-500 font-medium">Chat interactivo con {activeTicket.client_name}</p>
                                </div>
                            </div>
                            <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border italic ${activeTicket.status === 'open' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-success/10 text-success border-success/20'}`}>
                                {activeTicket.status === 'open' ? 'En espera' : 'Resuelto'}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar relative z-10">
                            {messages.map((m, idx) => (
                                <div key={idx} className={`flex ${m.sender_id === user.$id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                                    <div className={`max-w-[65%] p-6 rounded-[2rem] relative shadow-2xl transition hover:scale-[1.02] duration-300 ${m.sender_id === user.$id ? 'bg-primary text-white rounded-tr-none ring-4 ring-primary/10' : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none ring-4 ring-white/5'}`}>
                                        <div className="flex justify-between items-center mb-2 gap-4">
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 italic">{m.sender_name}</span>
                                            <span className="text-[9px] font-bold opacity-30 italic">{new Date(m.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-sm font-medium leading-relaxed tracking-tight">{m.content}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-8 bg-black/30 border-t border-white/5 flex gap-4 relative z-10">
                            <input 
                                type="text"
                                placeholder="Redactar mensaje..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-primary transition shadow-inner"
                            />
                            <button 
                                type="submit" 
                                disabled={sending || !newMessage.trim()}
                                className="bg-primary hover:bg-primary-glow text-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-glow transition disabled:opacity-50 group ring-4 ring-primary/20"
                            >
                                {sending ? <Loader2 className="animate-spin" /> : <Send size={28} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-20 relative z-10">
                        <div className="w-28 h-28 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mb-8 border border-primary/20 shadow-glow">
                            <MessageSquare size={48} className="text-primary opacity-60 animate-pulse" />
                        </div>
                        <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Terminal de Mensajería</h3>
                        <p className="text-gray-500 max-w-sm mt-6 font-medium text-lg leading-snug">
                            Selecciona una conversación del panel lateral o inicia un nuevo caso de soporte.
                        </p>
                        <div className="mt-12 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-6 py-3 rounded-full border border-primary/10">
                            <AlertCircle size={16} /> Enlace de Soporte en Tiempo Real Activo
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Plus = ({ size = 20, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, client } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { MessageSquare, Send, User, ChevronRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';

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
                    toast.success("Nuevo ticket recibido", { icon: '🎫' });
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
            toast.success("Ticket creado correctamente");
            selectTicket(ticket);
        } catch (error) {
            toast.error("Error al crear ticket");
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex gap-6 overflow-hidden">
            {/* Sidebar de Tickets */}
            <div className="w-80 flex flex-col bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-glow">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="font-bold text-white flex items-center gap-2">
                        <MessageSquare size={18} className="text-primary" /> Soporte
                    </h2>
                    {dbUser?.user_type === 'client' && (
                        <button onClick={createTicket} className="p-2 bg-primary/20 text-primary-glow rounded-lg hover:bg-primary/30 transition">
                            <Sparkles size={16} />
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-600" /></div>
                    ) : tickets.length === 0 ? (
                        <p className="text-center text-gray-500 text-sm mt-10">No hay hilos activos.</p>
                    ) : (
                        tickets.map(t => (
                            <div 
                                key={t.$id} 
                                onClick={() => selectTicket(t)}
                                className={`p-4 rounded-2xl cursor-pointer transition flex items-center gap-3 border ${activeTicket?.$id === t.$id ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-transparent hover:border-white/10'}`}
                            >
                                <div className={`w-2 h-2 rounded-full ${t.status === 'open' ? 'bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-gray-600'}`}></div>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="text-sm font-bold text-white truncate">{t.subject}</h4>
                                    <p className="text-[10px] text-gray-500 truncate">{t.client_name}</p>
                                </div>
                                <ChevronRight size={14} className="text-gray-700" />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Area de Chat */}
            <div className="flex-1 flex flex-col bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-glow relative">
                {activeTicket ? (
                    <>
                        <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/20 rounded-xl text-primary-glow font-bold">#</div>
                                <div>
                                    <h3 className="font-bold text-white">{activeTicket.subject}</h3>
                                    <p className="text-xs text-gray-500">Ticket de {activeTicket.client_name}</p>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${activeTicket.status === 'open' ? 'bg-primary/20 text-primary-glow' : 'bg-gray-500/20 text-gray-400'}`}>
                                {activeTicket.status === 'open' ? 'En espera' : 'Respondido'}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            {messages.map((m, idx) => (
                                <div key={idx} className={`flex ${m.sender_id === user.$id ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] p-4 rounded-2xl relative shadow-lg ${m.sender_id === user.$id ? 'bg-primary text-white rounded-tr-none' : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none'}`}>
                                        <p className="text-sm leading-relaxed">{m.content}</p>
                                        <span className="text-[10px] opacity-40 mt-2 block text-right italic">
                                            {new Date(m.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-6 bg-black/20 flex gap-4">
                            <input 
                                type="text"
                                placeholder="Escribe tu mensaje aquí..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                className="flex-1 bg-background/50 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-primary transition"
                            />
                            <button 
                                type="submit" 
                                disabled={sending || !newMessage.trim()}
                                className="bg-primary hover:bg-primary-glow text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-glow transition disabled:opacity-50"
                            >
                                {sending ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <MessageSquare size={40} className="text-primary-glow opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-white italic">Centro de Soporte Realtime</h3>
                        <p className="text-gray-500 max-w-sm mt-4">
                            Selecciona un ticket de la izquierda para ver la conversación o crea uno nuevo para recibir asistencia técnica.
                        </p>
                        <div className="mt-8 flex items-center gap-2 text-xs text-primary-glow bg-primary/5 px-4 py-2 rounded-full border border-primary/20 animate-pulse">
                            <AlertCircle size={14} /> Sistema de mensajería cifrado activo
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

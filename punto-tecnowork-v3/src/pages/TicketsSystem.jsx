import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, client } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { MessageSquare, Send, Loader2, AlertCircle, ChevronRight, Plus, CheckCircle, X } from 'lucide-react';

export const TicketsSystem = () => {
    const { user, dbUser } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [activeTicket, setActiveTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [closingId, setClosingId] = useState(null);
    const messagesEndRef = useRef(null);
    const unsubMessagesRef = useRef(null);

    const isAdmin = dbUser?.user_type === 'admin';

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const queries = [Query.orderDesc('$createdAt')];
            if (!isAdmin) queries.push(Query.equal('client_id', user.$id));
            const res = await databases.listDocuments(dbId, 'tickets', queries);
            setTickets(res.documents);
        } catch (error) { console.error('Error fetching tickets:', error); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchTickets();
        const unsub = client.subscribe(
            `databases.${import.meta.env.VITE_APPWRITE_DATABASE_ID}.collections.tickets.documents`,
            response => {
                if (response.events.some(e => e.includes('.create'))) {
                    setTickets(prev => [response.payload, ...prev]);
                    if (isAdmin) toast.success('Nuevo ticket recibido', { icon: '🎫', style: { background: '#1a1a1a', color: '#fff', borderRadius: '15px' } });
                }
                if (response.events.some(e => e.includes('.update'))) {
                    setTickets(prev => prev.map(t => t.$id === response.payload.$id ? response.payload : t));
                    setActiveTicket(prev => prev?.$id === response.payload.$id ? response.payload : prev);
                }
            }
        );
        return () => unsub();
    }, [isAdmin]);

    const selectTicket = async (ticket) => {
        setActiveTicket(ticket);
        if (unsubMessagesRef.current) unsubMessagesRef.current();
        try {
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const res = await databases.listDocuments(dbId, 'messages', [
                Query.equal('ticket_id', ticket.$id), Query.orderAsc('$createdAt')
            ]);
            setMessages(res.documents);
            unsubMessagesRef.current = client.subscribe(
                `databases.${dbId}.collections.messages.documents`,
                response => {
                    if (response.payload.ticket_id === ticket.$id) {
                        setMessages(prev => prev.find(m => m.$id === response.payload.$id) ? prev : [...prev, response.payload]);
                    }
                }
            );
        } catch (error) { console.error('Error fetching messages:', error); }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeTicket || activeTicket.status === 'closed') return;
        try {
            setSending(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            await databases.createDocument(dbId, 'messages', ID.unique(), {
                ticket_id: activeTicket.$id,
                sender_id: user.$id,
                sender_name: dbUser?.full_name || user.name,
                content: newMessage,
                role: dbUser?.user_type || 'client'
            });
            setNewMessage('');
            if (isAdmin && activeTicket.status === 'open') {
                await databases.updateDocument(dbId, 'tickets', activeTicket.$id, { status: 'answered' });
            }
        } catch { toast.error('Error al enviar mensaje'); }
        finally { setSending(false); }
    };

    const handleCloseTicket = async (ticketId) => {
        if (!window.confirm('¿Cerrar este ticket? El cliente no podrá responder más.')) return;
        try {
            setClosingId(ticketId);
            await databases.updateDocument(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'tickets', ticketId, { status: 'closed' });
            toast.success('Ticket cerrado');
        } catch { toast.error('Error al cerrar ticket'); }
        finally { setClosingId(null); }
    };

    const createTicket = async () => {
        const subject = prompt('¿Cuál es el motivo de tu consulta?');
        if (!subject?.trim()) return;
        try {
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const ticket = await databases.createDocument(dbId, 'tickets', ID.unique(), {
                client_id: user.$id,
                client_name: dbUser?.full_name || user.name,
                subject: subject.trim(),
                status: 'open'
            });
            toast.success('Ticket abierto');
            selectTicket(ticket);
        } catch { toast.error('Error al crear ticket'); }
    };

    const statusStyle = (s) => ({
        open:     'bg-primary/10 text-primary border-primary/20',
        answered: 'bg-secondary/10 text-secondary border-secondary/20',
        closed:   'bg-gray-500/10 text-gray-400 border-gray-500/20',
    }[s] || 'bg-white/5 text-gray-500 border-white/10');

    const statusLabel = (s) => ({ open: 'Abierto', answered: 'Respondido', closed: 'Cerrado' }[s] || s);
    const openCount = tickets.filter(t => t.status === 'open').length;

    return (
        <div className="h-[calc(100vh-140px)] flex gap-6 overflow-hidden pb-4">
            {/* Sidebar */}
            <div className="w-80 flex flex-col bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                            Soporte
                            {isAdmin && openCount > 0 && (
                                <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full">{openCount}</span>
                            )}
                        </h2>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Centro de Ayuda</p>
                    </div>
                    {!isAdmin && (
                        <button onClick={createTicket} className="p-3 bg-primary hover:bg-primary-glow text-white rounded-2xl transition shadow-glow">
                            <Plus size={18} />
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-20 text-primary"><Loader2 className="animate-spin" /></div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-10 opacity-20 flex flex-col items-center gap-3">
                            <MessageSquare size={32} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Sin casos activos</p>
                        </div>
                    ) : tickets.map(t => (
                        <div key={t.$id} onClick={() => selectTicket(t)}
                            className={`group p-4 rounded-2xl cursor-pointer transition-all flex items-start gap-3 border ${activeTicket?.$id === t.$id ? 'bg-primary/10 border-primary/30' : 'bg-white/3 border-white/5 hover:border-white/10'}`}>
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${t.status === 'open' ? 'bg-primary animate-pulse' : t.status === 'answered' ? 'bg-secondary' : 'bg-gray-600'}`} />
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-white truncate italic uppercase tracking-tight">{t.subject}</h4>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-[9px] text-gray-500 font-bold uppercase truncate">{t.client_name}</p>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${statusStyle(t.status)}`}>{statusLabel(t.status)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat */}
            <div className="flex-1 flex flex-col bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                {activeTicket ? (
                    <>
                        <div className="p-6 border-b border-white/5 bg-white/3 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-xl border border-primary/20">#</div>
                                <div>
                                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{activeTicket.subject}</h3>
                                    <p className="text-xs text-gray-500">con {activeTicket.client_name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusStyle(activeTicket.status)}`}>
                                    {statusLabel(activeTicket.status)}
                                </span>
                                {isAdmin && activeTicket.status !== 'closed' && (
                                    <button onClick={() => handleCloseTicket(activeTicket.$id)}
                                        disabled={closingId === activeTicket.$id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition">
                                        {closingId === activeTicket.$id ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle size={12} /> Cerrar</>}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            {messages.length === 0 && (
                                <div className="text-center py-10 text-gray-600">
                                    <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No hay mensajes aún. Iniciá la conversación.</p>
                                </div>
                            )}
                            {messages.map((m, idx) => (
                                <div key={idx} className={`flex ${m.sender_id === user.$id ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[65%] p-5 rounded-[1.8rem] shadow-lg ${m.sender_id === user.$id ? 'bg-primary text-white rounded-tr-none' : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none'}`}>
                                        <div className="flex justify-between items-center mb-1.5 gap-4">
                                            <span className="text-[9px] font-black uppercase opacity-60">{m.sender_name}</span>
                                            <span className="text-[9px] opacity-30">{new Date(m.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-6 bg-black/30 border-t border-white/5 flex gap-3">
                            {activeTicket.status === 'closed' ? (
                                <div className="flex-1 flex items-center justify-center gap-2 text-gray-600 text-sm py-3">
                                    <X size={16} /> Este ticket está cerrado
                                </div>
                            ) : (
                                <>
                                    <input type="text" placeholder="Redactar mensaje..." value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-primary transition" />
                                    <button type="submit" disabled={sending || !newMessage.trim()}
                                        className="bg-primary hover:bg-primary-glow text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-glow transition disabled:opacity-50">
                                        {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                    </button>
                                </>
                            )}
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-16">
                        <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 border border-primary/20">
                            <MessageSquare size={40} className="text-primary opacity-60 animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Soporte en Tiempo Real</h3>
                        <p className="text-gray-500 max-w-xs mt-4 text-sm">
                            {isAdmin ? 'Seleccioná un ticket del panel para responder.' : 'Seleccioná una conversación o abrí un nuevo caso.'}
                        </p>
                        {!isAdmin && (
                            <button onClick={createTicket}
                                className="mt-8 flex items-center gap-2 bg-primary hover:bg-primary-glow text-white px-6 py-3 rounded-2xl font-black shadow-glow transition">
                                <Plus size={18} /> Nuevo Ticket
                            </button>
                        )}
                        <div className="mt-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-6 py-3 rounded-full border border-primary/10">
                            <AlertCircle size={16} /> Soporte Realtime Activo
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

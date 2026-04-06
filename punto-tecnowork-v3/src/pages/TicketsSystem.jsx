import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, client } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { MessageSquare, Send, Loader2, AlertCircle, Plus, CheckCircle, X, ClipboardList, FileText } from 'lucide-react';

// Sonido de notificación usando Web Audio API (sin dependencias externas)
const playNotificationSound = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch { }
};

export const TicketsSystem = () => {
    const { user, dbUser } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [activeTicket, setActiveTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const unsubMessagesRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Modal de creación de ticket
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSubject, setNewSubject] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [creating, setCreating] = useState(false);

    // Modal de cierre de ticket (requiere resolución obligatoria)
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closingTicket, setClosingTicket] = useState(null);
    const [resolution, setResolution] = useState('');
    const [closing, setClosing] = useState(false);

    const isAdmin = dbUser?.user_type === 'admin';

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const queries = [Query.orderDesc('$createdAt')];
            if (!isAdmin) queries.push(Query.equal('client_id', user.$id));
            const res = await databases.listDocuments(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'tickets', queries);
            setTickets(res.documents);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchTickets();
        const unsub = client.subscribe(
            `databases.${import.meta.env.VITE_APPWRITE_DATABASE_ID}.collections.tickets.documents`,
            response => {
                if (response.events.some(e => e.includes('.create'))) {
                    setTickets(prev => [response.payload, ...prev]);
                    if (isAdmin) {
                        playNotificationSound();
                        toast.success('Nuevo ticket recibido', { icon: '🎫', style: { background: '#1a1a1a', color: '#fff', borderRadius: '15px' } });
                    }
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
                        // Alerta sonora si el mensaje es de otro usuario
                        if (response.payload.sender_id !== user.$id) playNotificationSound();
                    }
                }
            );
        } catch (err) { console.error(err); }
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

    // Crear ticket con modal propio (no prompt nativo)
    const handleCreateTicket = async () => {
        if (!newSubject.trim()) return;
        try {
            setCreating(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const ticket = await databases.createDocument(dbId, 'tickets', ID.unique(), {
                client_id: user.$id,
                client_name: dbUser?.full_name || user.name,
                subject: newSubject.trim(),
                status: 'open'
            });
            // Si hay descripción, enviarla como primer mensaje
            if (newDescription.trim()) {
                await databases.createDocument(dbId, 'messages', ID.unique(), {
                    ticket_id: ticket.$id,
                    sender_id: user.$id,
                    sender_name: dbUser?.full_name || user.name,
                    content: newDescription.trim(),
                    role: 'client'
                });
            }
            toast.success('Ticket abierto');
            setShowCreateModal(false);
            setNewSubject('');
            setNewDescription('');
            selectTicket(ticket);
        } catch { toast.error('Error al crear ticket'); }
        finally { setCreating(false); }
    };

    // Cerrar ticket — requiere resolución obligatoria
    const openCloseModal = (ticket) => {
        setClosingTicket(ticket);
        setResolution('');
        setShowCloseModal(true);
    };

    const handleCloseTicket = async () => {
        if (!resolution.trim() || resolution.trim().length < 10) {
            toast.error('Describí la resolución (mínimo 10 caracteres)');
            return;
        }
        try {
            setClosing(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            // Guardar resolución como mensaje del sistema
            await databases.createDocument(dbId, 'messages', ID.unique(), {
                ticket_id: closingTicket.$id,
                sender_id: user.$id,
                sender_name: `${dbUser?.full_name || 'Admin'} (resolución)`,
                content: `✅ Ticket cerrado: ${resolution.trim()}`,
                role: 'admin'
            });
            await databases.updateDocument(dbId, 'tickets', closingTicket.$id, { status: 'closed' });
            toast.success('Ticket cerrado con resolución registrada');
            setShowCloseModal(false);
            setResolution('');
            setClosingTicket(null);
        } catch { toast.error('Error al cerrar ticket'); }
        finally { setClosing(false); }
    };

    const statusStyle = (s) => ({
        open:     'bg-primary/10 text-primary border-primary/20',
        answered: 'bg-secondary/10 text-secondary border-secondary/20',
        closed:   'bg-gray-500/10 text-gray-400 border-gray-500/20',
    }[s] || 'bg-white/5 text-gray-500 border-white/10');

    const statusLabel = (s) => ({ open: 'Abierto', answered: 'Respondido', closed: 'Cerrado' }[s] || s);
    const openCount = tickets.filter(t => t.status === 'open').length;
    const unansweredCount = tickets.filter(t => t.status === 'open').length;

    return (
        <div className="h-[calc(100vh-140px)] flex gap-6 overflow-hidden pb-4">

            {/* ── Sidebar ── */}
            <div className="w-80 flex flex-col bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                                Soporte
                                {openCount > 0 && (
                                    <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full animate-pulse">{openCount}</span>
                                )}
                            </h2>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Centro de Ayuda</p>
                        </div>
                    </div>
                    {/* Botón prominente de nuevo ticket para clientes */}
                    {!isAdmin && (
                        <button onClick={() => setShowCreateModal(true)}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-glow text-white py-3 px-4 rounded-2xl font-black transition shadow-glow text-sm uppercase tracking-wider">
                            <Plus size={18} /> Abrir Nuevo Ticket
                        </button>
                    )}
                    {/* Para admin: botón de gestión */}
                    {isAdmin && (
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                                {unansweredCount > 0 ? `${unansweredCount} sin responder` : 'Todo respondido'}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${unansweredCount > 0 ? 'bg-primary animate-pulse' : 'bg-success'}`} />
                        </div>
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
                            className={`group p-4 rounded-2xl cursor-pointer transition-all flex items-start gap-3 border ${activeTicket?.$id === t.$id ? 'bg-primary/10 border-primary/30' : 'bg-white/3 border-white/5 hover:border-white/15'}`}>
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

            {/* ── Chat ── */}
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
                                    <button onClick={() => openCloseModal(activeTicket)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-success/10 border border-success/20 text-success hover:bg-success/20 transition">
                                        <CheckCircle size={12} /> Cerrar Ticket
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
                            {messages.map((m, idx) => {
                                const isMine = m.sender_id === user.$id;
                                const isResolution = m.content?.startsWith('✅ Ticket cerrado:');
                                if (isResolution) return (
                                    <div key={idx} className="flex justify-center">
                                        <div className="px-5 py-3 bg-success/10 border border-success/20 rounded-2xl text-success text-xs font-bold max-w-[80%] text-center">
                                            {m.content}
                                        </div>
                                    </div>
                                );
                                return (
                                    <div key={idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[65%] p-5 rounded-[1.8rem] shadow-lg ${isMine ? 'bg-primary text-white rounded-tr-none' : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none'}`}>
                                            <div className="flex justify-between items-center mb-1.5 gap-4">
                                                <span className="text-[9px] font-black uppercase opacity-60">{m.sender_name}</span>
                                                <span className="text-[9px] opacity-30">{new Date(m.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                                        </div>
                                    </div>
                                );
                            })}
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
                            {isAdmin ? 'Seleccioná un ticket del panel para responder.' : 'Abrí un ticket y nuestro equipo te responderá a la brevedad.'}
                        </p>
                        {!isAdmin && (
                            <button onClick={() => setShowCreateModal(true)}
                                className="mt-8 flex items-center gap-2 bg-primary hover:bg-primary-glow text-white px-8 py-4 rounded-2xl font-black shadow-glow transition text-lg">
                                <Plus size={22} /> Abrir Ticket de Soporte
                            </button>
                        )}
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-6 py-3 rounded-full border border-primary/10">
                            <AlertCircle size={14} /> Soporte Realtime Activo
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal crear ticket ── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <div style={{ backgroundColor: '#0a0a0f' }} className="border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                                    <ClipboardList className="text-primary" size={24} /> Nuevo Ticket
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">Describí tu consulta y te responderemos pronto.</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 text-gray-500 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">Asunto *</label>
                                <input type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)}
                                    placeholder="Ej: Problema con mi pedido #PT..."
                                    style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '14px 18px', width: '100%', fontSize: '14px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">
                                    Descripción <span className="text-gray-600 font-normal normal-case">(opcional pero recomendada)</span>
                                </label>
                                <textarea rows={4} value={newDescription} onChange={e => setNewDescription(e.target.value)}
                                    placeholder="Contanos con más detalle qué pasó..."
                                    style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '14px 18px', width: '100%', fontSize: '14px', fontWeight: '600', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setShowCreateModal(false)}
                                className="flex-1 py-3 rounded-2xl font-black uppercase text-sm transition"
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}>
                                Cancelar
                            </button>
                            <button onClick={handleCreateTicket} disabled={creating || !newSubject.trim()}
                                className="flex-[2] py-3 rounded-2xl bg-primary hover:bg-primary-glow text-white font-black shadow-glow transition disabled:opacity-40 uppercase text-sm flex items-center justify-center gap-2">
                                {creating ? <Loader2 size={16} className="animate-spin" /> : <><FileText size={16} /> Abrir Ticket</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal cerrar ticket (resolución obligatoria) ── */}
            {showCloseModal && closingTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <div style={{ backgroundColor: '#0a0a0f' }} className="border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                                    <CheckCircle className="text-success" size={22} /> Cerrar Ticket
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    Ticket: <span className="text-white font-bold">{closingTicket.subject}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowCloseModal(false)} className="p-2 text-gray-500 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl mb-5 flex gap-3">
                            <AlertCircle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
                            <p className="text-yellow-400/80 text-sm">
                                Debés explicar cómo se resolvió el problema. El cliente verá esta resolución en el chat.
                            </p>
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">
                                Resolución * <span className="text-gray-600 font-normal normal-case">(mínimo 10 caracteres)</span>
                            </label>
                            <textarea rows={5} value={resolution} onChange={e => setResolution(e.target.value)}
                                placeholder="Ej: Se procesó el reembolso / Se corrigió el pedido / El cliente fue informado de los tiempos de demora..."
                                style={{ backgroundColor: '#1a1a1a', color: '#fff', border: `1px solid ${resolution.trim().length >= 10 ? 'rgba(164,204,57,0.4)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '16px', padding: '14px 18px', width: '100%', fontSize: '14px', fontWeight: '600', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                            <p className={`text-[10px] mt-1 text-right ${resolution.trim().length >= 10 ? 'text-success' : 'text-gray-600'}`}>
                                {resolution.trim().length} / 10 caracteres mínimos
                            </p>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button type="button" onClick={() => setShowCloseModal(false)}
                                className="flex-1 py-3 rounded-2xl font-black uppercase text-sm transition"
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}>
                                Cancelar
                            </button>
                            <button onClick={handleCloseTicket} disabled={closing || resolution.trim().length < 10}
                                className="flex-[2] py-3 rounded-2xl bg-success hover:bg-success/80 text-white font-black transition disabled:opacity-40 uppercase text-sm flex items-center justify-center gap-2">
                                {closing ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Confirmar Cierre</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

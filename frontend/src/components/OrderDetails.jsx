import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ArrowLeft,
    CreditCard,
    Truck,
    FileText,
    User,
    History,
    CheckCircle2,
    AlertCircle,
    Clock,
    Plus,
    Calendar,
    MessageSquare,
    Check,
    X,
    Loader2,
    Phone,
    Mail,
    Package,
    Send,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    XCircle,
    Calculator
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

const TabButton = ({ active, onClick, label, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${active
            ? 'bg-premium-gold text-black shadow-lg shadow-premium-gold/20 scale-[1.02]'
            : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white border border-white/5'
            } ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
    >
        {label}
    </button>
);

const CollapsibleCard = ({ id, title, icon: Icon, children, preview, expandedSection, setExpandedSection }) => {
    const isExpanded = expandedSection === id;
    return (
        <div className={`bg-premium-slate/30 border ${isExpanded ? 'border-premium-gold/30' : 'border-white/5'} rounded-[32px] overflow-hidden transition-all duration-500`}>
            <button
                onClick={() => setExpandedSection(isExpanded ? null : id)}
                className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-2xl ${isExpanded ? 'bg-premium-gold/20 text-premium-gold' : 'bg-white/5 text-slate-400'}`}>
                        <Icon size={24} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-1">{title}</h3>
                        <div className="flex items-center space-x-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isExpanded ? 'bg-premium-gold' : 'bg-slate-700'}`}></span>
                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{preview}</span>
                        </div>
                    </div>
                </div>
                <div className={`text-slate-600 transition-transform duration-500 ${isExpanded ? 'rotate-180 text-premium-gold' : ''}`}>
                    <ChevronDown size={24} />
                </div>
            </button>
            {isExpanded && (
                <div className="p-6 pt-0 border-t border-white/5 bg-black/20 animate-in slide-in-from-top-4 duration-500">
                    {children}
                </div>
            )}
        </div>
    );
};

function OrderDetails({ orderId, role, isSuperadmin, onBack }) {
    const [order, setOrder] = useState(null);
    const [payments, setPayments] = useState([]);
    const [lines, setLines] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [noteInput, setNoteInput] = useState('');

    // Cancel Payment States
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelPaymentId, setCancelPaymentId] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    // Accordion State
    const [expandedSection, setExpandedSection] = useState('abonos'); // abonos, estado, bitacora

    // Status & Dates form
    const [editForm, setEditForm] = useState({
        estatus: '',
        entrega_estimada: '',
        entrega_promesa: ''
    });

    const [payForm, setPayForm] = useState({ metodo: 'efectivo', monto: 0, referencia: '', efectivo_recibido: 0 });
    const [paying, setPaying] = useState(false);

    const [error, setError] = useState(null);

    const isAdmin = isSuperadmin || role === 'admin';

    useEffect(() => {
        fetchDetails();
    }, [orderId]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get(`${API_URL}/orders/${orderId}`);
            const nres = await axios.get(`${API_URL}/orders/${orderId}/notes`);
            const o = res.data.order;
            
            if (!o) {
                setError("No se pudo cargar la información del pedido.");
                return;
            }

            setOrder(o);
            setPayments(res.data.payments || []);
            setLines(res.data.lines || []);
            setNotes(nres.data || []);
            setEditForm({
                estatus: o.estatus || '',
                entrega_estimada: o.entrega_estimada || '',
                entrega_promesa: o.entrega_promesa || ''
            });
            setPayForm(prev => ({ ...prev, monto: o.saldo || 0 }));
        } catch (err) {
            console.error("Error fetching order details:", err);
            setError(err.response?.data?.detail || "Ocurrió un error al cargar el pedido.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (editForm.estatus === 'ENTREGADO' && order.saldo > 0) {
            alert("No se puede marcar como ENTREGADO porque el pedido aún no está liquidado.");
            return;
        }
        setUpdating(true);
        try {
            await axios.patch(`${API_URL}/orders/${orderId}`, editForm, {
                headers: { 'X-Role': role }
            });
            fetchDetails();
            alert(isAdmin ? "Configuración actualizada" : "Solicitud enviada");
        } catch (err) {
            alert("Error al actualizar");
        } finally {
            setUpdating(false);
        }
    };

    const handleAddNote = async () => {
        if (!noteInput.trim()) return;
        setUpdating(true);
        try {
            await axios.post(`${API_URL}/orders/${orderId}/notes`, {
                author: isAdmin ? 'Admin' : 'Vendedor',
                content: noteInput
            });
            setNoteInput('');
            await fetchDetails();
            alert("¡Nota guardada en el historial!");
        } catch (err) {
            alert("Error al guardar nota");
        } finally {
            setUpdating(false);
        }
    };

    const handleAuthorize = async () => {
        setUpdating(true);
        try {
            await axios.post(`${API_URL}/orders/${orderId}/authorize`);
            fetchDetails();
            alert("Cambio de estatus autorizado");
        } catch (err) {
            alert("Error al autorizar");
        } finally {
            setUpdating(false);
        }
    };

    const handlePayment = async () => {
        if (payForm.monto <= 0) return;
        setPaying(true);
        try {
            const res = await axios.post(`${API_URL}/payments`, {
                order_id: orderId,
                ...payForm
            });
            await fetchDetails();
            if (window.confirm("¡Pago registrado correctamente! ¿Deseas imprimir el recibo de este abono?")) {
                window.open(`${API_URL}/payments/${res.data.payment_id}/pdf`, '_blank');
            }
        } catch (err) {
            alert("Error al procesar pago");
        } finally {
            setPaying(false);
        }
    };

    const handleCancelPayment = async () => {
        if (!cancelReason.trim()) {
            alert("El motivo de cancelación es obligatorio.");
            return;
        }
        setIsCancelling(true);
        try {
            await axios.post(`${API_URL}/payments/${cancelPaymentId}/cancel`, {
                motivo_anulacion: cancelReason
            });
            setShowCancelModal(false);
            setCancelReason('');
            setCancelPaymentId(null);
            fetchDetails();
            alert("Pago anulado exitosamente.");
        } catch (err) {
            alert(err.response?.data?.detail || "Error al anular pago");
        } finally {
            setIsCancelling(false);
        }
    };

    if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-premium-gold" size={40} /></div>;

    if (error || !order) return (
        <div className="h-64 flex flex-col items-center justify-center space-y-6">
            <div className="p-6 bg-red-500/10 rounded-full">
                <AlertTriangle className="text-red-500" size={48} />
            </div>
            <div className="text-center">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Error al Cargar</h3>
                <p className="text-slate-500 mt-2 font-medium italic">{error || "No se encontró el pedido o la sesión expiró."}</p>
            </div>
            <button 
                onClick={onBack}
                className="bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-white/5"
            >
                VOLVER A LA LISTA
            </button>
        </div>
    );


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-700 pb-20">
            {/* Notes Modal */}
            {showNotesModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowNotesModal(false)} />
                    <div className="bg-premium-slate w-full max-w-2xl rounded-[3rem] border border-white/10 shadow-2xl relative z-10 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-premium-gold/10 rounded-2xl border border-premium-gold/20">
                                    <MessageSquare className="text-premium-gold" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Historial de Notas</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Seguimiento del pedido: {order.folio}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowNotesModal(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-slate-500 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-black/20">
                            {notes.map((n, idx) => (
                                <div key={n.id} className={`flex flex-col ${n.author === 'Admin' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-5 rounded-3xl border shadow-xl ${n.author === 'Admin'
                                        ? 'bg-premium-gold/10 border-premium-gold/20 rounded-tr-none'
                                        : 'bg-white/5 border-white/10 rounded-tl-none text-slate-200'
                                        }`}>
                                        <div className="flex items-center justify-between mb-2 gap-8">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-premium-gold">{n.author}</span>
                                            <span className="text-[9px] text-slate-500 font-bold">{new Date(n.created_at).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.content}</p>
                                    </div>
                                </div>
                            ))}
                            {notes.length === 0 && (
                                <div className="text-center py-20">
                                    <MessageSquare size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="text-slate-500 italic text-sm">No hay mensajes en esta conversación aún.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-white/5 bg-premium-slate">
                            <div className="flex items-center space-x-4">
                                <textarea
                                    value={noteInput}
                                    onChange={(e) => setNoteInput(e.target.value)}
                                    placeholder="Escribe una nueva nota aquí..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-premium-gold/50 transition-all resize-none shadow-inner"
                                    rows="2"
                                />
                                <button
                                    onClick={handleAddNote}
                                    disabled={updating || !noteInput.trim()}
                                    className="bg-premium-gold text-black p-5 rounded-2xl hover:bg-yellow-400 transition-all active:scale-95 disabled:opacity-20 shadow-xl shadow-premium-gold/20"
                                >
                                    {updating ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 hover:text-white transition-all group">
                    <div className="p-2 rounded-xl group-hover:bg-white/5 transition-colors">
                        <ArrowLeft size={20} />
                    </div>
                    <span className="font-bold uppercase text-xs tracking-widest">Volver a Pedidos</span>
                </button>

                {order.estatus_solicitado && isAdmin && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 px-6 py-3 rounded-2xl flex items-center space-x-4 animate-pulse">
                        <AlertCircle className="text-yellow-500" size={20} />
                        <div>
                            <p className="text-[10px] font-black text-yellow-500/70 uppercase">Cambio Solicitado</p>
                            <p className="text-sm font-black text-white">{order.estatus} → <span className="text-yellow-500">{order.estatus_solicitado}</span></p>
                        </div>
                        <button
                            onClick={handleAuthorize}
                            disabled={updating}
                            className="bg-yellow-500 text-black px-4 py-2 rounded-xl text-[10px] font-black hover:bg-yellow-400 transition-all active:scale-95"
                        >
                            AUTORIZAR
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Fixed Order Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header Info Card */}
                    <section className="bg-premium-slate/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                            <div className="space-y-2">
                                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter flex flex-wrap items-center gap-4">
                                    {order.folio}
                                    <span className="text-[10px] px-3 py-1 bg-white/5 rounded-full text-slate-600 font-black tracking-[0.3em] mt-1 md:mt-0">{order.tipo}</span>
                                </h2>
                                <p className="text-slate-500 text-sm font-medium mt-2">Vendedor: <span className="text-white font-bold">{order.vendedor}</span> | {new Date(order.created_at).toLocaleDateString()}</p>
                            </div>

                            <div className="flex items-center space-x-4 shrink-0">
                                <button
                                    onClick={() => window.open(`${API_URL}/quotes/${orderId}/pdf?is_order=true`, '_blank')}
                                    className="bg-premium-gold/10 hover:bg-premium-gold/20 text-premium-gold p-3 rounded-2xl transition-all border border-premium-gold/20 shadow-lg flex items-center space-x-2"
                                    title="Reimprimir Nota en PDF"
                                >
                                    <FileText size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Nota</span>
                                </button>
                                <button
                                    onClick={() => window.open(`${API_URL}/orders/${orderId}/delivery-pdf`, '_blank')}
                                    className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 p-3 rounded-2xl transition-all border border-blue-500/20 shadow-lg flex items-center space-x-2"
                                    title="Imprimir Hoja de Entrega"
                                >
                                    <Truck size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Entrega</span>
                                </button>
                                <div className={`px-6 py-3 rounded-2xl text-xs font-black tracking-[0.2em] uppercase border ${order.estatus === 'ENTREGADO' ? 'border-green-500/30 text-green-400 bg-green-500/5' :
                                    order.estatus === 'LIQUIDADO' ? 'border-blue-500/30 text-blue-400 bg-blue-500/5' :
                                        'border-premium-gold/30 text-premium-gold bg-premium-gold/5 shadow-[0_0_20px_rgba(234,179,8,0.1)]'
                                    }`}>
                                    {order.estatus}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5"><User className="text-premium-gold" size={20} /></div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Cliente</p>
                                        <p className="text-xl font-black text-white">{order.cliente_nombre}</p>
                                        {order.cliente_tel && (
                                            <div className="flex items-center space-x-1 text-slate-500 text-xs mt-1">
                                                <Phone size={12} />
                                                <span>{order.cliente_tel}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1 text-center">Entrega Estimada</p>
                                    <p className="text-sm font-black text-white text-center font-mono">{order.entrega_estimada || '---'}</p>
                                </div>
                                <div className="bg-premium-gold/5 p-4 rounded-2xl border border-premium-gold/20">
                                    <p className="text-[9px] text-premium-gold/50 font-black uppercase tracking-widest mb-1 text-center">Entrega Promesa</p>
                                    <p className="text-sm font-black text-white text-center font-mono">{order.entrega_promesa || 'PENDIENTE'}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Items Table */}
                    <section className="bg-premium-slate/30 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                        <div className="flex items-center space-x-3 mb-2">
                            <Package className="text-premium-gold" size={20} />
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Artículos del Pedido</h3>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                        <th className="px-6 py-4">Producto</th>
                                        <th className="px-6 py-4 text-center">Cant.</th>
                                        <th className="px-6 py-4 text-right">Precio</th>
                                        <th className="px-6 py-4 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {lines.map((ln, idx) => (
                                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-5">
                                                <p className="font-bold text-white uppercase">{ln.modelo}</p>
                                                <p className="text-[10px] text-slate-600 font-mono tracking-tighter">{ln.codigo} • {ln.tamano}</p>
                                            </td>
                                            <td className="px-6 py-5 text-center text-sm font-black text-slate-400">{ln.cantidad}</td>
                                            <td className="px-6 py-5 text-right text-xs font-mono text-slate-500">${ln.precio_unit.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-right font-black text-premium-gold font-mono">${ln.total_linea.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Totals Summary */}
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-slate-900/5 -mr-16 -mt-16 rounded-full group-hover:scale-110 transition-transform duration-1000" />
                        <div className="relative z-10 grid grid-cols-2 gap-8 divide-x divide-slate-100">
                            <div className="text-center">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mb-2">Monto por Liquidar</p>
                                <p className={`text-5xl font-black tracking-tighter ${order.saldo > 0 ? 'text-red-500' : 'text-slate-900'}`}>${order.saldo.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mb-2">Inversión Total</p>
                                <p className="text-5xl font-black text-slate-900 tracking-tighter">${order.total.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Simple Payment History (Left for quick scan) */}
                    <section className="bg-premium-slate/30 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                        <div className="flex items-center space-x-3 mb-2">
                            <History size={20} className="text-premium-gold" />
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Movimientos de Caja</h3>
                        </div>
                        <div className="space-y-4">
                            {payments.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/5 rounded-xl text-slate-500 group-hover:text-premium-gold transition-colors"><CreditCard size={18} /></div>
                                        <div>
                                            <p className="text-sm font-black uppercase text-white tracking-tight">{p.metodo}</p>
                                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-0.5">
                                                {new Date(p.created_at).toLocaleDateString()} • {p.referencia || "SIN REF"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-white font-mono tracking-tighter">${p.monto.toLocaleString()}</p>
                                        {p.anulado === 1 ? (
                                            <div className="flex items-center justify-end text-[9px] text-red-500 font-black uppercase mt-1">
                                                <X size={10} className="mr-1" /> Anulado
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-3 mt-1">
                                                <button
                                                    onClick={() => window.open(`${API_URL}/payments/${p.id}/pdf`, '_blank')}
                                                    className="flex items-center text-[9px] text-blue-400 hover:text-blue-300 font-black uppercase transition-colors group/print"
                                                    title="Imprimir Recibo de este pago"
                                                >
                                                    <FileText size={10} className="mr-1 group-hover/print:scale-110 transition-transform" /> Recibo
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setCancelPaymentId(p.id);
                                                        setShowCancelModal(true);
                                                    }}
                                                    className="flex items-center text-[9px] text-slate-500 hover:text-red-400 font-black uppercase transition-colors group/cancel"
                                                    title="Anular este pago"
                                                >
                                                    <XCircle size={10} className="mr-1 group-hover/cancel:scale-110 transition-transform" /> Anular
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {payments.length === 0 && <p className="text-slate-600 italic text-sm text-center py-8">No hay registros de caja.</p>}
                        </div>
                    </section>
                </div>

                {/* Right Column: Accordion Panels */}
                <div className="space-y-4">
                    {/* 0. CONTROL DE APARTADO (Sólo si es APARTADO) */}
                    {order.tipo === 'APARTADO' && (
                        <CollapsibleCard
                            id="tracking"
                            title="Seguimiento de Fabricación"
                            icon={Package}
                            expandedSection={expandedSection}
                            setExpandedSection={setExpandedSection}
                            preview={`Estatus actual: ${order.estatus_logistica}`}
                        >
                            <div className="space-y-4 py-4">
                                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] uppercase text-slate-400 font-black mb-1 tracking-widest">Cuota Quincenal Sugerida</p>
                                        <p className="text-2xl font-black text-white font-mono">${(order.saldo > 0 ? order.saldo / 6 : 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p className="text-[9px] text-slate-500 mt-1">Calculado sobre saldo actual dividido en 6 pagos base.</p>
                                    </div>
                                    <Calculator size={32} className="text-white/10" />
                                </div>

                                <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl">
                                    <p className="text-sm font-black text-red-400 mb-2 flex items-center gap-2"><AlertCircle size={16} /> Penalización por Atraso</p>
                                    <p className="text-xs text-slate-400 mb-4">Si el cliente no ha cubierto su abono después del día 2 o 17, aplica una multa automática de <strong>$200 MXN</strong>.</p>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm("¿Seguro que deseas aplicar $200 de multa por atraso? Esto se sumará a la deuda total.")) {
                                                try {
                                                    setUpdating(true);
                                                    await axios.post(`${API_URL}/orders/${orderId}/penalty`);
                                                    await fetchDetails();
                                                    alert("Multa aplicada correctamente.");
                                                } catch (err) {
                                                    alert(err.response?.data?.detail || "Error al aplicar multa.");
                                                } finally {
                                                    setUpdating(false);
                                                }
                                            }
                                        }}
                                        disabled={updating || order.saldo <= 0}
                                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-black py-3 px-4 rounded-xl transition-all w-full flex justify-center items-center gap-2 disabled:opacity-50"
                                    >
                                        <AlertTriangle size={14} /> APLICAR MULTA DE $200
                                    </button>
                                </div>
                            </div>
                        </CollapsibleCard>
                    )}

                    {/* 1. REGISTRO DE ABONOS */}
                    <CollapsibleCard
                        id="abonos"
                        title="Registro de Abonos"
                        icon={Calculator}
                        expandedSection={expandedSection}
                        setExpandedSection={setExpandedSection}
                        preview={
                            <p className={`text-[10px] font-black uppercase tracking-widest ${order.saldo > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                Pendiente: ${order.saldo.toLocaleString()}
                            </p>
                        }
                    >
                        <div className="space-y-6 py-4">
                            <div>
                                <label className="text-[9px] text-slate-500 uppercase font-black mb-1 block ml-2 tracking-widest">Monto por Liquidar</label>
                                <div className="relative opacity-70">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                                    <input
                                        type="text"
                                        readOnly
                                        value={order.saldo.toLocaleString()}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-8 text-xl font-black text-slate-400 focus:outline-none cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] text-premium-gold uppercase font-black mb-1 block ml-2 tracking-widest">Monto a Pagar</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-premium-gold font-black">$</span>
                                    <input
                                        type="number"
                                        value={payForm.monto}
                                        onChange={(e) => setPayForm({ ...payForm, monto: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-premium-gold/10 border border-premium-gold/30 rounded-2xl p-4 pl-8 text-xl font-black text-premium-gold focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] text-slate-500 uppercase font-black mb-1 block ml-2 tracking-widest">Método de Pago</label>
                                <select
                                    value={payForm.metodo}
                                    onChange={(e) => setPayForm({ ...payForm, metodo: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white font-bold focus:outline-none focus:border-premium-gold transition-all appearance-none cursor-pointer"
                                >
                                    <option value="efectivo">EFECTIVO</option>
                                    <option value="tarjeta de debito">TARJETA DE DÉBITO</option>
                                    <option value="tarjeta de crédito">TARJETA DE CRÉDITO (BÁSICA)</option>
                                    <option value="transferencia">TRANSFERENCIA</option>
                                    {order.tipo !== 'APARTADO' && (
                                        <>
                                            <option value="6 meses sin intereses">6 MESES SIN INTERESES</option>
                                            <option value="9 meses sin intereses">9 MESES SIN INTERESES</option>
                                            <option value="12 meses sin intereses">12 MESES SIN INTERESES</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {payForm.metodo === 'efectivo' ? (
                                <div className="animate-in fade-in duration-300">
                                    <label className="text-[9px] text-slate-400 uppercase font-black mb-1 block ml-2 tracking-widest">Efectivo Recibido (Cálculo de Cambio)</label>
                                    <input
                                        type="number"
                                        value={payForm.efectivo_recibido}
                                        onChange={(e) => setPayForm({ ...payForm, efectivo_recibido: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none font-bold"
                                    />
                                    {payForm.efectivo_recibido > payForm.monto && (
                                        <div className="mt-4 flex justify-between items-center bg-green-400/10 p-3 rounded-xl border border-green-400/20">
                                            <span className="text-[10px] uppercase font-black text-green-400/70">Cambio:</span>
                                            <span className="text-sm font-black text-green-400 font-mono">${(payForm.efectivo_recibido - payForm.monto).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="animate-in fade-in duration-300">
                                    <label className="text-[9px] text-slate-400 uppercase font-black mb-1 block ml-2 tracking-widest">Referencia / Comprobante</label>
                                    <input
                                        type="text"
                                        value={payForm.referencia}
                                        onChange={(e) => setPayForm({ ...payForm, referencia: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none font-bold"
                                        placeholder="Número de operación..."
                                    />
                                </div>
                            )}

                            <button
                                onClick={handlePayment}
                                disabled={paying || order.saldo <= 0 || payForm.monto <= 0}
                                className="w-full bg-premium-gold text-black font-black py-5 rounded-[24px] flex items-center justify-center space-x-3 hover:bg-yellow-400 transition-all disabled:opacity-30 shadow-2xl shadow-premium-gold/20"
                            >
                                {paying ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
                                <span className="tracking-tight uppercase text-sm">PROCESAR PAGO</span>
                            </button>
                        </div>
                    </CollapsibleCard>

                    {/* 2. ESTADOS Y FECHAS */}
                    <CollapsibleCard
                        id="estado"
                        title="Estado y Fechas"
                        icon={FileText}
                        expandedSection={expandedSection}
                        setExpandedSection={setExpandedSection}
                        preview={
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                {order.estatus} • Promesa: {order.entrega_promesa || 'Pendiente'}
                            </p>
                        }
                    >
                        <div className="space-y-6 py-4 text-slate-400">
                            <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase font-black ml-2 tracking-widest">Estatus de Producción</label>
                                <select
                                    value={editForm.estatus}
                                    onChange={(e) => setEditForm({ ...editForm, estatus: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white font-bold focus:outline-none focus:border-premium-gold transition-all appearance-none cursor-pointer"
                                >
                                    <option value="REGISTRADO">REGISTRADO</option>
                                    <option value="EN FABRICACIÓN">EN FABRICACIÓN</option>
                                    <option value="LISTO ENTREGA">LISTO ENTREGA</option>
                                    <option value="ENTREGADO" disabled={order.saldo > 0}>ENTREGADO</option>
                                    <option value="CANCELADO">CANCELADO</option>
                                </select>
                                {order.saldo > 0 && <p className="text-[8px] text-yellow-500/70 italic ml-2 mt-1">* Requiere liquidar para ENTREGADO</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase font-black ml-2 tracking-widest">Fecha Promesa</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                                    <input
                                        type="date"
                                        value={editForm.entrega_promesa}
                                        disabled={!isAdmin}
                                        onChange={(e) => setEditForm({ ...editForm, entrega_promesa: e.target.value })}
                                        className={`w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-11 text-xs text-white focus:outline-none focus:border-premium-gold transition-all ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                {!isAdmin && <p className="text-[8px] text-slate-600 italic ml-2 mt-1">* Solo Administradores autorizados</p>}
                            </div>

                            <button
                                onClick={handleUpdate}
                                disabled={updating}
                                className="w-full bg-white/10 hover:bg-white/15 text-white font-black py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all border border-white/5"
                            >
                                {updating ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                <span>{isAdmin ? "ACTUALIZAR ESTADO" : "SOLICITAR ACTUALIZACIÓN"}</span>
                            </button>
                        </div>
                    </CollapsibleCard>

                    {/* 3. BITÁCORA */}
                    <CollapsibleCard
                        id="bitacora"
                        title="Bitácora"
                        icon={MessageSquare}
                        expandedSection={expandedSection}
                        setExpandedSection={setExpandedSection}
                        preview={
                            <p className="text-[10px] text-slate-500 font-bold italic truncate max-w-[200px]">
                                {notes.length > 0 ? notes[0].content : 'Sin notas registradas'}
                            </p>
                        }
                    >
                        <div className="space-y-6 py-4">
                            {notes.length > 0 && (
                                <div
                                    className="bg-white/5 p-4 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all border-l-2 border-l-premium-gold shadow-lg"
                                    onClick={() => setShowNotesModal(true)}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[8px] font-black text-premium-gold uppercase">{notes[0].author}</span>
                                        <History size={10} className="text-slate-700" />
                                    </div>
                                    <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2 italic">"{notes[0].content}"</p>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase font-black ml-2 tracking-widest">Nueva Entrada</label>
                                <textarea
                                    value={noteInput}
                                    onChange={(e) => setNoteInput(e.target.value)}
                                    placeholder="Escribe el seguimiento con el cliente..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-premium-gold shadow-inner resize-none"
                                    rows="3"
                                />
                                <div className="flex space-x-2 mt-2">
                                    <button
                                        onClick={handleAddNote}
                                        disabled={updating || !noteInput.trim()}
                                        className="flex-1 bg-premium-gold text-black font-black py-4 rounded-xl flex items-center justify-center space-x-2 transition-all hover:bg-yellow-400 disabled:opacity-20"
                                    >
                                        <Send size={16} />
                                        <span className="text-[10px] uppercase">Guardar</span>
                                    </button>
                                    <button
                                        onClick={() => setShowNotesModal(true)}
                                        className="bg-white/5 hover:bg-white/10 text-slate-400 px-4 rounded-xl transition-all"
                                        title="Historial completo"
                                    >
                                        <History size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </CollapsibleCard>

                </div>
            </div>

            {/* Cancel Payment Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isCancelling && setShowCancelModal(false)} />
                    <div className="bg-premium-slate w-full max-w-md rounded-[2.5rem] border border-red-500/20 shadow-2xl relative z-10 p-8 flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                                <AlertTriangle className="text-red-500" size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white hover:text-red-400 uppercase tracking-tighter transition-colors">Anular Pago</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Acción irreversible</p>
                            </div>
                        </div>

                        <p className="text-slate-400 text-sm mb-6">
                            Estás a punto de anular un pago. Este monto se devolverá al saldo pendiente del pedido. Por seguridad, debes justificar por qué se está cancelando.
                        </p>

                        <div className="space-y-4">
                            <label className="text-[9px] text-slate-500 uppercase font-black ml-2 tracking-widest">Motivo de Anulación (Obligatorio)</label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Ej: Error de dedo, cliente canceló..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-red-500/50 shadow-inner resize-none"
                                rows="3"
                            />

                            <div className="flex space-x-4 mt-6">
                                <button
                                    onClick={() => {
                                        setShowCancelModal(false);
                                        setCancelReason('');
                                        setCancelPaymentId(null);
                                    }}
                                    disabled={isCancelling}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-black py-4 rounded-2xl transition-all disabled:opacity-50"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={handleCancelPayment}
                                    disabled={isCancelling || !cancelReason.trim()}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs tracking-wider font-black py-4 rounded-2xl transition-all disabled:opacity-50 flex justify-center items-center"
                                >
                                    {isCancelling ? <Loader2 className="animate-spin" size={20} /> : "CONFIRMAR"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


export default OrderDetails;


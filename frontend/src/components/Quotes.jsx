import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, FileText, ArrowRight, User, Phone, Mail, Calendar, DollarSign, Loader2, CheckCircle2, ChevronRight, X } from 'lucide-react';

const API_URL = 'http://localhost:8000/api';

function Quotes() {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [showConvertModal, setShowConvertModal] = useState(false);

    useEffect(() => { fetchQuotes(); }, []);

    const fetchQuotes = async (query = '') => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/quotes?q=${query}`);
            setQuotes(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchQuotes(searchTerm);
    };

    const openQuote = async (id) => {
        try {
            const res = await axios.get(`${API_URL}/quotes/${id}`);
            setSelectedQuote(res.data);
        } catch (err) { console.error(err); }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                        <FileText className="text-premium-gold" size={36} />
                        COTIZACIONES
                    </h1>
                    <p className="text-slate-400 mt-1">Gestión y seguimiento de propuestas comerciales</p>
                </div>

                <form onSubmit={handleSearch} className="relative group min-w-[320px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-premium-gold transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente o folio..."
                        className="w-full bg-premium-slate border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-premium-gold/50 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </form>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* List Column */}
                <div className="xl:col-span-2 space-y-4">
                    {loading ? (
                        <div className="h-64 flex items-center justify-center bg-premium-slate/30 rounded-3xl border border-white/5">
                            <Loader2 className="animate-spin text-premium-gold" size={40} />
                        </div>
                    ) : quotes.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center bg-premium-slate/30 rounded-3xl border border-white/5 text-slate-500">
                            <FileText size={48} className="mb-4 opacity-20" />
                            <p className="font-bold">No se encontraron cotizaciones</p>
                        </div>
                    ) : (
                        quotes.map((q) => (
                            <div
                                key={q.id}
                                onClick={() => openQuote(q.id)}
                                className={`bg-premium-slate/50 border border-white/5 p-6 rounded-3xl cursor-pointer transition-all hover:bg-white/5 hover:scale-[1.01] active:scale-[0.99] group flex justify-between items-center ${selectedQuote?.quote.id === q.id ? 'border-premium-gold/40 bg-premium-gold/5' : ''}`}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-premium-gold font-mono font-black tracking-widest text-sm">{q.folio}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${q.status === 'PEDIDO' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                            {q.status}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white uppercase">{q.cliente_nombre || 'Cliente sin nombre'}</h3>
                                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium font-mono uppercase">
                                        <span className="flex items-center gap-1"><User size={12} /> {q.vendedor}</span>
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {q.created_at.slice(0, 10)}</span>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-6">
                                    <div className="hidden md:block">
                                        <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Total</p>
                                        <p className="text-2xl font-black text-white">${q.total.toLocaleString()}</p>
                                    </div>
                                    <ChevronRight className="text-slate-600 group-hover:text-premium-gold transition-colors" />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detail Column */}
                <div className="xl:col-span-1">
                    {selectedQuote ? (
                        <div className="bg-premium-slate border border-white/10 rounded-3xl p-8 sticky top-8 shadow-2xl animate-in slide-in-from-right-4 duration-500">
                            <header className="mb-8 border-b border-white/5 pb-6">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-premium-gold font-mono font-black text-xl tracking-tighter">{selectedQuote.quote.folio}</span>
                                    <span className="text-slate-500 font-mono text-sm">{selectedQuote.quote.created_at.slice(0, 10)}</span>
                                </div>
                                <h2 className="text-3xl font-black text-white uppercase mb-2">{selectedQuote.quote.cliente_nombre}</h2>
                                <div className="space-y-1">
                                    {selectedQuote.quote.cliente_tel && (
                                        <p className="text-slate-400 text-sm flex items-center gap-2"><Phone size={14} className="text-premium-gold" /> {selectedQuote.quote.cliente_tel}</p>
                                    )}
                                    <p className="text-slate-400 text-sm flex items-center gap-2"><User size={14} className="text-premium-gold" /> Vendedor: {selectedQuote.quote.vendedor}</p>
                                </div>
                            </header>

                            <div className="space-y-6 mb-8">
                                <h3 className="text-[10px] text-slate-500 font-black uppercase tracking-[3px]">Productos</h3>
                                <div className="space-y-3">
                                    {selectedQuote.lines.map((line, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div>
                                                <p className="text-white font-bold text-sm uppercase">{line.modelo}</p>
                                                <p className="text-[10px] text-slate-500 font-mono">{line.cantidad} x ${line.precio_unit.toLocaleString()}</p>
                                            </div>
                                            <p className="text-premium-gold font-black">${line.total_linea.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-black/20 p-6 rounded-3xl border border-white/5 flex justify-between items-center mb-8">
                                <span className="text-sm font-bold text-slate-400 uppercase">Total Cotizado</span>
                                <span className="text-3xl font-black text-premium-gold">${selectedQuote.quote.total.toLocaleString()}</span>
                            </div>

                            {selectedQuote.quote.status !== 'PEDIDO' && (
                                <button
                                    onClick={() => setShowConvertModal(true)}
                                    className="w-full bg-premium-gold text-black font-black py-4 rounded-2xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 shadow-xl shadow-premium-gold/10 hover:shadow-premium-gold/20 active:scale-95"
                                >
                                    <ArrowRight size={20} />
                                    CONVERTIR A PEDIDO
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-premium-slate/10 rounded-3xl border border-dashed border-white/10 text-slate-500 p-8 text-center italic">
                            <ArrowRight size={32} className="mb-4 opacity-20 rotate-45" />
                            Selecciona una cotización para ver los detalles
                        </div>
                    )}
                </div>
            </div>

            {showConvertModal && selectedQuote && (
                <ConvertModal
                    quote={selectedQuote.quote}
                    onClose={() => setShowConvertModal(false)}
                    onConverted={() => {
                        setShowConvertModal(false);
                        fetchQuotes();
                        openQuote(selectedQuote.quote.id);
                    }}
                />
            )}
        </div>
    );
}

function ConvertModal({ quote, onClose, onConverted }) {
    const [form, setForm] = useState({
        cliente_nombre: quote.cliente_nombre || '',
        cliente_tel: quote.cliente_tel || '',
        cliente_email: quote.cliente_email || '',
        metodo: 'efectivo',
        monto: 0,
        referencia: ''
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.post(`${API_URL}/quotes/${quote.id}/convert`, form);
            onConverted();
        } catch (err) {
            console.error(err);
            alert("Error al convertir a pedido");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-premium-slate w-full max-w-xl rounded-[40px] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-10 space-y-8">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Convertir a Pedido</h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Nombre Cliente</label>
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-premium-gold transition-all"
                                    value={form.cliente_nombre}
                                    onChange={(e) => setForm({ ...form, cliente_nombre: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Teléfono</label>
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-premium-gold transition-all"
                                    value={form.cliente_tel}
                                    onChange={(e) => setForm({ ...form, cliente_tel: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Método Pago</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-premium-gold transition-all appearance-none"
                                    value={form.metodo}
                                    onChange={(e) => setForm({ ...form, metodo: e.target.value })}
                                >
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="debito">Débito</option>
                                    <option value="credito">Crédito</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Anticipo</label>
                                <input
                                    type="number"
                                    className="w-full bg-premium-gold/5 border border-premium-gold/20 rounded-2xl p-4 text-premium-gold font-black focus:outline-none focus:border-premium-gold transition-all"
                                    value={form.monto}
                                    onChange={(e) => setForm({ ...form, monto: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {form.metodo === 'transferencia' && (
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Referencia</label>
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-premium-gold transition-all"
                                    value={form.referencia}
                                    onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="pt-4 border-t border-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-slate-500 font-bold text-sm uppercase">Total Pedido</span>
                                <span className="text-2xl font-black text-white">${quote.total.toLocaleString()}</span>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-premium-gold text-black font-black py-4 rounded-2xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-premium-gold/20"
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                {saving ? 'CONVIRTIENDO...' : 'CONFIRMAR Y CREAR PEDIDO'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Quotes;

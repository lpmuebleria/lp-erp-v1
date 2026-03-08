import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Search, FileText, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://lp-erp-v1.onrender.com/api';

function Payments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/payments`);
            setPayments(res.data);
        } catch (err) {
            console.error("Error fetching payments:", err);
            toast.error("No se pudo cargar el historial de pagos");
        } finally {
            setLoading(false);
        }
    };

    const filteredPayments = payments.filter(p =>
        (p.folio || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.cliente_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.vendedor || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
            {/* Header controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-premium-gold transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por Folio, Cliente o Vendedor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-premium-slate border border-white/5 rounded-[2rem] py-5 pl-14 pr-6 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-premium-gold/30 focus:bg-white/[0.02] shadow-2xl transition-all"
                    />
                </div>
                <button
                    onClick={fetchPayments}
                    className="flex text-[10px] items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-5 rounded-[2rem] font-black uppercase tracking-widest text-white transition-all w-full md:w-auto shrink-0 justify-center group"
                >
                    <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                    <span>Recargar</span>
                </button>
            </div>

            {/* Payments Table Card */}
            <div className="bg-premium-slate rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-premium-gold/10 to-transparent">
                    <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                        <FileText className="text-premium-gold" />
                        Historial Global de Movimientos de Caja
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Supervisión administrativa de todos los cobros y anulaciones registrados en el sistema.</p>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="flex items-center justify-center p-20">
                            <Loader2 className="animate-spin text-premium-gold" size={40} />
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-black/20 text-[10px] uppercase font-black tracking-widest text-slate-500">
                                    <th className="p-6">Fecha y Hora</th>
                                    <th className="p-6">Folio del Pedido</th>
                                    <th className="p-6 shrink-0">Cliente</th>
                                    <th className="p-6">Método / Vendedor</th>
                                    <th className="p-6 text-right">Monto Recibido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm font-medium">
                                {filteredPayments.map((p) => {
                                    const isCancelled = p.anulado === 1;
                                    return (
                                        <tr key={p.id} className={`hover:bg-white/[0.02] transition-colors ${isCancelled ? 'bg-red-500/5 hover:bg-red-500/10' : ''}`}>
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className={`font-mono text-xs ${isCancelled ? 'text-red-400' : 'text-slate-300'}`}>
                                                        {new Date(p.created_at).toLocaleDateString()}
                                                    </span>
                                                    <span className={`text-[10px] mt-0.5 ${isCancelled ? 'text-red-500/70' : 'text-slate-600'}`}>
                                                        {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 font-black text-white tracking-tight">
                                                <span className={isCancelled ? "text-red-100 line-through decoration-red-500/50" : ""}>{p.folio}</span>
                                            </td>
                                            <td className="p-6 truncate max-w-[200px]">
                                                <span className={`font-bold uppercase text-[11px] ${isCancelled ? 'text-red-300' : 'text-slate-300'}`}>
                                                    {p.cliente_nombre || 'Sin cliente logueado'}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className={`text-xs uppercase font-black tracking-widest ${isCancelled ? 'text-red-400' : 'text-premium-gold'}`}>
                                                        {p.metodo}
                                                    </span>
                                                    <span className={`text-[10px] uppercase font-bold tracking-widest mt-0.5 ${isCancelled ? 'text-red-500/70' : 'text-slate-500'}`}>
                                                        Por: {p.vendedor}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-xl font-black font-mono tracking-tighter ${isCancelled ? 'text-red-500 line-through decoration-red-900/50' : 'text-green-400'}`}>
                                                        ${parseFloat(p.monto).toLocaleString()}
                                                    </span>
                                                    {isCancelled && (
                                                        <div className="flex items-center space-x-1 mt-1 text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20" title={p.motivo_anulacion}>
                                                            <XCircle size={10} className="shrink-0" />
                                                            <span className="truncate max-w-[150px]">MOTIVO: {p.motivo_anulacion}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredPayments.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center text-slate-500 italic">No tienes cobros en el registro principal para esta búsqueda.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Payments;


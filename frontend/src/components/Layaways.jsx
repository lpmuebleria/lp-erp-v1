import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Archive, CreditCard, User, Calendar, Wallet, ChevronRight, Loader2, Filter, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

function Layaways() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchLayaways();
    }, [statusFilter]);

    const fetchLayaways = async (query = '') => {
        setLoading(true);
        try {
            // Fetching orders of type 'APARTADO' or just all orders with saldo > 0
            // Based on legacy, we look for all orders but filter by estatus if needed.
            // Let's use the orders endpoint and filter by tipo or state.
            const res = await axios.get(`${API_URL}/orders?q=${query}&estatus=${statusFilter}`);
            setOrders(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchLayaways(searchTerm);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                        <Archive className="text-premium-gold" size={36} />
                        APARTADOS
                    </h1>
                    <p className="text-slate-400 mt-1">Control de artículos reservados y pagos pendientes</p>
                </div>

                <div className="flex gap-4">
                    <form onSubmit={handleSearch} className="relative group min-w-[280px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-premium-gold transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar folio o cliente..."
                            className="w-full bg-premium-slate border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-premium-gold/50 transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </form>

                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-premium-gold" size={16} />
                        <select
                            className="bg-premium-slate border border-white/5 rounded-2xl pl-10 pr-8 py-3 text-white text-sm focus:outline-none focus:border-premium-gold/50 appearance-none cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">TODOS LOS ESTADOS</option>
                            <option value="REGISTRADO">REGISTRADO</option>
                            <option value="LIQUIDADO">LIQUIDADO</option>
                            <option value="ENTREGADO">ENTREGADO</option>
                            <option value="CANCELADO">CANCELADO</option>
                        </select>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full h-64 flex items-center justify-center bg-premium-slate/30 rounded-3xl border border-white/5">
                        <Loader2 className="animate-spin text-premium-gold" size={40} />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="col-span-full h-80 flex flex-col items-center justify-center bg-premium-slate/30 rounded-[40px] border border-dashed border-white/10 text-slate-500">
                        <Archive size={64} className="mb-4 opacity-10" />
                        <p className="text-xl font-bold opacity-30">No se encontraron apartados</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <LayawayCard key={order.id} order={order} />
                    ))
                )}
            </div>
        </div>
    );
}

function LayawayCard({ order }) {
    const isOverdue = false; // Add logic if needed

    return (
        <div className="group relative bg-premium-slate/50 border border-white/5 rounded-[32px] overflow-hidden hover:border-premium-gold/30 transition-all duration-300 hover:shadow-2xl hover:shadow-premium-gold/5 active:scale-[0.98]">
            {/* Header / Status */}
            <div className="p-6 pb-4 flex justify-between items-start">
                <div className="space-y-1">
                    <span className="text-premium-gold font-mono font-black text-xs tracking-widest">{order.folio}</span>
                    <h3 className="text-lg font-black text-white uppercase truncate max-w-[180px]">{order.cliente_nombre || 'S/N'}</h3>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${getStatusStyles(order.estatus)}`}>
                    {order.estatus}
                </div>
            </div>

            {/* Financial Info */}
            <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 group-hover:bg-black/30 transition-colors">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Pagado</span>
                        <div className="flex items-center gap-1 text-green-400">
                            <CreditCard size={14} />
                            <span className="font-bold text-lg font-mono">${order.anticipo_pagado.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 group-hover:bg-black/30 transition-colors">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Restante</span>
                        <div className="flex items-center gap-1 text-premium-gold">
                            <Wallet size={14} />
                            <span className="font-bold text-lg font-mono">${order.saldo.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-slate-500">
                        <span>Progreso de Pago</span>
                        <span className="text-premium-gold">{Math.round((order.anticipo_pagado / order.total) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-gradient-to-r from-premium-gold to-yellow-400 rounded-full transition-all duration-1000"
                            style={{ width: `${(order.anticipo_pagado / order.total) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer / Meta */}
            <div className="p-6 pt-4 border-t border-white/5 flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="flex items-center gap-1 uppercase"><User size={12} className="text-slate-600" /> {order.vendedor}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} className="text-slate-600" /> {order.created_at.slice(0, 10)}</span>
                </div>
                <button className="p-2 bg-white/5 rounded-xl text-slate-400 group-hover:text-premium-gold group-hover:bg-premium-gold/10 transition-all">
                    <ChevronRight size={18} />
                </button>
            </div>

            {order.saldo > 0 && order.estatus !== 'CANCELADO' && (
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertCircle size={14} className="text-premium-gold animate-pulse" />
                </div>
            )}
        </div>
    );
}

function getStatusStyles(status) {
    switch (status) {
        case 'REGISTRADO': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case 'LIQUIDADO': return 'bg-green-500/10 text-green-400 border-green-500/20';
        case 'ENTREGADO': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        case 'CANCELADO': return 'bg-red-500/10 text-red-400 border-red-500/20';
        default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
}

export default Layaways;


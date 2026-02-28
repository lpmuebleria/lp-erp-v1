import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Search,
    Filter,
    ChevronRight,
    LayoutGrid,
    Table as TableIcon,
    FileSpreadsheet,
    Calendar,
    Box,
    User as UserIcon,
    ArrowRightCircle,
    Download,
    Loader2,
    MessageSquare
} from 'lucide-react';

const API_URL = 'http://localhost:8000/api';

const STATUS_COLUMNS = [
    { id: 'REGISTRADO', label: 'Registrado', color: 'yellow' },
    { id: 'EN FABRICACIÓN', label: 'En Fabricación', color: 'blue' },
    { id: 'LISTO ENTREGA', label: 'Listo p/ Entrega', color: 'purple' },
    { id: 'ENTREGADO', label: 'Entregado', color: 'green' }
];

function Orders({ role, onSelectOrder }) {
    const [orders, setOrders] = useState([]);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
    const [loading, setLoading] = useState(true);

    // Filters
    const [filters, setFilters] = useState({
        q: '',
        estatus: '',
        desde: '',
        hasta: '',
        mueble: ''
    });

    useEffect(() => {
        fetchOrders();
    }, [filters]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/orders`, {
                params: filters
            });
            setOrders(response.data);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const params = new URLSearchParams(filters).toString();
        window.open(`${API_URL}/orders/export?${params}`, '_blank');
    };

    const getStatusStyle = (status) => {
        switch (status?.toUpperCase()) {
            case 'ENTREGADO': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'LIQUIDADO': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'REGISTRADO': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'EN FABRICACIÓN': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
            case 'LISTO ENTREGA': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
            case 'CANCELADO': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-slate-400 bg-white/5 border-white/10';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header & Main Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                    <div className="bg-premium-gold/10 p-3 rounded-2xl border border-premium-gold/20">
                        <Box className="text-premium-gold" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Gestión de Pedidos</h2>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[4px]">LP Mueblería V1</p>
                    </div>
                </div>

                <div className="flex items-center bg-premium-slate/50 p-1.5 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${viewMode === 'table' ? 'bg-premium-gold text-black shadow-lg shadow-premium-gold/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <TableIcon size={14} />
                        <span>Lista</span>
                    </button>
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${viewMode === 'kanban' ? 'bg-premium-gold text-black shadow-lg shadow-premium-gold/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <LayoutGrid size={14} />
                        <span>Kanban</span>
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-2" />

                    <button
                        onClick={() => {
                            const params = new URLSearchParams({ ...filters, format: 'pdf' }).toString();
                            window.open(`${API_URL}/orders/export?${params}`, '_blank');
                        }}
                        className="flex items-center space-x-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-red-400 hover:bg-red-400/10 transition-all border border-transparent hover:border-red-400/20"
                        title="Exportar como PDF"
                    >
                        <FileSpreadsheet size={14} />
                        <span>PDF</span>
                    </button>

                    <button
                        onClick={() => {
                            const params = new URLSearchParams({ ...filters, format: 'excel' }).toString();
                            window.open(`${API_URL}/orders/export?${params}`, '_blank');
                        }}
                        className="flex items-center space-x-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-green-400 hover:bg-green-400/10 transition-all border border-transparent hover:border-green-400/20"
                        title="Exportar como Excel"
                    >
                        <FileSpreadsheet size={14} />
                        <span>Excel</span>
                    </button>
                </div>
            </div>

            {/* Advanced Filters Bar */}
            <div className="bg-premium-slate/30 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 shadow-xl">
                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-black ml-2 tracking-widest">Búsqueda General</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                        <input
                            type="text"
                            placeholder="Folio o Cliente..."
                            value={filters.q}
                            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-premium-gold/50 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-black ml-2 tracking-widest">Modelo de Mueble</label>
                    <div className="relative">
                        <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                        <input
                            type="text"
                            placeholder="Ej. Sofá, Comedor..."
                            value={filters.mueble}
                            onChange={(e) => setFilters({ ...filters, mueble: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-premium-gold/50 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-black ml-2 tracking-widest">Desde</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                        <input
                            type="date"
                            value={filters.desde}
                            onChange={(e) => setFilters({ ...filters, desde: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-premium-gold/50 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-black ml-2 tracking-widest">Hasta</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                        <input
                            type="date"
                            value={filters.hasta}
                            onChange={(e) => setFilters({ ...filters, hasta: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-premium-gold/50 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-black ml-2 tracking-widest">Estatus</label>
                    <select
                        value={filters.estatus}
                        onChange={(e) => setFilters({ ...filters, estatus: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none focus:border-premium-gold/50 transition-all appearance-none cursor-pointer"
                    >
                        <option value="">TODOS LOS ESTADOS</option>
                        <option value="REGISTRADO">REGISTRADO</option>
                        <option value="EN FABRICACIÓN">EN FABRICACIÓN</option>
                        <option value="LISTO ENTREGA">LISTO ENTREGA</option>
                        <option value="ENTREGADO">ENTREGADO</option>
                        <option value="CANCELADO">CANCELADO</option>
                    </select>
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'table' ? (
                <div className="bg-premium-slate/40 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                <th className="px-8 py-5">Folio / Fecha</th>
                                <th className="px-8 py-5">Cliente</th>
                                <th className="px-8 py-5 text-center">Estatus</th>
                                <th className="px-8 py-5 text-right">Saldo</th>
                                <th className="px-8 py-5 text-right">Total</th>
                                <th className="px-8 py-5">Nota</th>
                                <th className="px-8 py-5 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {orders.map((o) => (
                                <tr
                                    key={o.id}
                                    onClick={() => onSelectOrder(o.id)}
                                    className="hover:bg-white/[0.03] cursor-pointer transition-all group"
                                >
                                    <td className="px-8 py-6">
                                        <div className="font-black text-white group-hover:text-premium-gold transition-colors text-base tracking-tighter">{o.folio}</div>
                                        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">{new Date(o.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-sm font-bold text-slate-300 uppercase">{o.cliente_nombre || '---'}</div>
                                        <div className="text-[10px] text-slate-600 font-mono mt-1">{o.vendedor}</div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(o.estatus)}`}>
                                            {o.estatus}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right font-mono font-bold">
                                        <span className={o.saldo > 0 ? 'text-red-400 bg-red-400/5 px-2 py-1 rounded-lg' : 'text-slate-500'}>
                                            ${o.saldo.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right font-black text-white text-lg tracking-tighter">
                                        ${o.total.toLocaleString()}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="relative group/note max-w-[120px]">
                                            <div className="text-[10px] text-slate-500 font-medium truncate italic">
                                                {o.ultima_nota || 'Sin notas'}
                                            </div>
                                            {o.ultima_nota && (
                                                <div className="absolute bottom-full left-0 mb-3 w-72 p-4 bg-premium-slate border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-0 group-hover/note:opacity-100 transition-all duration-300 z-50 pointer-events-none translate-y-2 group-hover/note:translate-y-0 translate-x-[-20%]">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-premium-gold animate-pulse" />
                                                        <p className="text-[10px] text-premium-gold font-black uppercase tracking-[0.2em]">Última Actualización</p>
                                                    </div>
                                                    <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{o.ultima_nota}</p>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-700 group-hover:bg-premium-gold group-hover:text-black transition-all">
                                            <ChevronRight size={16} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="px-8 py-32 text-center text-slate-600 italic">
                                        <Box size={48} className="mx-auto mb-4 opacity-10" />
                                        No se encontraron pedidos con estos filtros
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Kanban View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-6">
                    {STATUS_COLUMNS.map(col => {
                        const colOrders = orders.filter(o => o.estatus === col.id);
                        return (
                            <div key={col.id} className="min-w-[300px] flex flex-col space-y-4">
                                <div className="flex items-center justify-between px-4">
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full bg-${col.color}-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]`} />
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{col.label}</h4>
                                    </div>
                                    <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-500">{colOrders.length}</span>
                                </div>

                                <div className="flex-1 space-y-4 min-h-[500px] p-2 bg-premium-slate/20 rounded-3xl border border-dashed border-white/5">
                                    {colOrders.map(o => (
                                        <KanbanCard key={o.id} order={o} onClick={() => onSelectOrder(o.id)} />
                                    ))}
                                    {colOrders.length === 0 && (
                                        <div className="h-full flex items-center justify-center opacity-20 italic text-[10px] text-slate-500 uppercase tracking-widest">
                                            Vacio
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {loading && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-premium-slate p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center space-y-4">
                        <Loader2 className="animate-spin text-premium-gold" size={40} />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando pedidos...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function KanbanCard({ order, onClick }) {
    return (
        <div
            onClick={onClick}
            className="group bg-premium-slate border border-white/5 rounded-2xl p-5 hover:border-premium-gold/30 hover:bg-premium-slate/80 transition-all cursor-pointer shadow-lg active:scale-95"
        >
            <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black text-premium-gold uppercase tracking-widest">{order.folio}</span>
                <span className="text-[10px] text-slate-600 font-bold">{new Date(order.created_at).toLocaleDateString()}</span>
            </div>

            <p className="text-sm font-black text-white uppercase mb-4 leading-tight group-hover:text-premium-gold transition-colors">
                {order.cliente_nombre || 'Cliente sin nombre'}
            </p>

            <div className="space-y-2 mb-4">
                <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase">
                    <Calendar size={10} className="mr-1.5 opacity-50" />
                    Entrega: {order.entrega_estimada || 'Pendiente'}
                </div>
                <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase">
                    <UserIcon size={10} className="mr-1.5 opacity-50" />
                    Vende: {order.vendedor}
                </div>
                {order.ultima_nota && (
                    <div className="mt-3 relative group/kanban-note">
                        <div className="flex items-center text-[10px] text-premium-gold font-black uppercase tracking-widest bg-premium-gold/5 px-2 py-1 rounded-lg border border-premium-gold/10">
                            <MessageSquare className="mr-1" size={10} />
                            <span className="truncate max-w-[150px]">{order.ultima_nota}</span>
                        </div>
                        <div className="absolute bottom-full left-0 mb-3 w-72 p-4 bg-premium-slate border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-0 group-hover/kanban-note:opacity-100 transition-all duration-300 z-50 pointer-events-none translate-y-2 group-hover/kanban-note:translate-y-0">
                            <div className="flex items-center space-x-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-premium-gold animate-pulse" />
                                <p className="text-[10px] text-premium-gold font-black uppercase tracking-[0.2em]">Nota Reciente</p>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{order.ultima_nota}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <div className="text-right">
                    <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Saldo</p>
                    <p className={`text-xs font-black ${order.saldo > 0 ? 'text-red-400' : 'text-slate-500'}`}>${order.saldo.toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Total</p>
                    <p className="text-sm font-black text-white">${order.total.toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}

export default Orders;

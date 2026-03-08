import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart3,
    TrendingUp,
    Users,
    Calendar,
    ArrowUpRight,
    Loader2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://lp-erp-v1.onrender.com/api';

function Dashboard({ onConceptClick }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/metrics`);
            setMetrics(res.data);
        } catch (err) {
            console.error("Error fetching metrics:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="animate-spin text-premium-gold" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard
                    title="Ventas del Mes"
                    value={`$${(metrics?.ventas_mes || 0).toLocaleString()}`}
                    trend="+12.5%"
                    icon={<TrendingUp className="text-green-400" size={24} />}
                    color="green"
                />
                <StatCard
                    title="Utilidad Estimada"
                    value={`$${(metrics?.utilidad_bruta_mes || 0).toLocaleString()}`}
                    trend="+8.2%"
                    icon={<ArrowUpRight className="text-blue-400" size={24} />}
                    color="blue"
                />
                <StatCard
                    title="Ventas de Hoy"
                    value={`$${(metrics?.ventas_hoy || 0).toLocaleString()}`}
                    icon={<Calendar className="text-yellow-400" size={24} />}
                    color="yellow"
                />
                <StatCard
                    title="Cotizaciones Hoy"
                    value={metrics?.cot_hoy || 0}
                    icon={<BarChart3 className="text-purple-400" size={24} />}
                    color="purple"
                />
            </div>

            {/* Main Dashboard Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Orders by Status */}
                <div className="lg:col-span-2 bg-premium-slate/40 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/5 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-black text-white px-2">Pedidos por Estatus</h3>
                        <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Tiempo Real</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {metrics && Object.entries(metrics.pedidos_por_estatus).map(([status, count]) => (
                            <div key={status} className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:border-premium-gold/20 transition-all group">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{status}</p>
                                <div className="flex items-end justify-between">
                                    <span className="text-3xl font-black text-white group-hover:text-premium-gold transition-colors">{count}</span>
                                    <span className="text-xs font-bold text-slate-600 mb-1">Pedidos registrados</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team / Actions */}
                <div className="space-y-6">
                    {metrics?.bolsas_mes && (
                        <div className="bg-premium-slate/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-[4px] mb-6 text-center">Acumulado Mensual</h4>
                            <div className="space-y-4">
                                <BagItem label="Maniobras" value={metrics.bolsas_mes.maniobras} onClick={() => onConceptClick && onConceptClick('maniobras')} />
                                <BagItem label="Empaque" value={metrics.bolsas_mes.empaque} onClick={() => onConceptClick && onConceptClick('empaque')} />
                                <BagItem label="Comisión" value={metrics.bolsas_mes.comision} onClick={() => onConceptClick && onConceptClick('comision')} />
                                <BagItem label="Garantías" value={metrics.bolsas_mes.garantias} onClick={() => onConceptClick && onConceptClick('garantias')} />
                                <BagItem label="Muebles" value={metrics.bolsas_mes.muebles} onClick={() => onConceptClick && onConceptClick('muebles')} />
                                <BagItem label="Fletes" value={metrics.bolsas_mes.fletes} onClick={() => onConceptClick && onConceptClick('fletes')} />
                                <BagItem label="Envíos a Domicilio" value={metrics.bolsas_mes.envios} onClick={() => onConceptClick && onConceptClick('envios')} />
                                <div className="pt-4 mt-4 border-t border-white/10">
                                    <button
                                        onClick={() => onConceptClick && onConceptClick('utilidad_bruta')}
                                        className="w-full flex justify-between items-center text-premium-gold hover:bg-white/5 p-3 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-premium-gold/30"
                                    >
                                        <span className="text-xs font-black uppercase tracking-widest group-hover:pl-2 transition-all flex items-center gap-2">
                                            Utilidad Bruta
                                            <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </span>
                                        <span className="text-xl font-black font-mono">${metrics.bolsas_mes.utilidad_bruta.toLocaleString()}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-premium-slate/40 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/5 shadow-2xl flex flex-col justify-center text-center">
                        <div className="w-16 h-16 bg-premium-gold/10 rounded-2xl mx-auto mb-6 flex items-center justify-center border border-premium-gold/20">
                            <Users className="text-premium-gold" size={28} />
                        </div>
                        <h4 className="text-lg font-black text-white mb-2">Actividad de Equipo</h4>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-8 italic">Rendimiento óptimo detectado</p>
                        <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 transition-all text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white">
                            Generar Reporte PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BagItem({ label, value, onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex justify-between items-center bg-white/[0.02] hover:bg-white/10 p-3 rounded-xl border border-white/5 hover:border-premium-gold/30 transition-all cursor-pointer group"
        >
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-white uppercase tracking-tighter flex items-center gap-2 transition-colors">
                {label}
                <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 text-premium-gold transition-opacity" />
            </span>
            <span className="text-sm font-black text-white font-mono">${value.toLocaleString()}</span>
        </button>
    );
}

function StatCard({ title, value, trend, icon, color }) {
    const colorMap = {
        green: 'bg-green-400/10 border-green-400/20 shadow-green-400/5',
        blue: 'bg-blue-400/10 border-blue-400/20 shadow-blue-400/5',
        yellow: 'bg-yellow-400/10 border-yellow-400/20 shadow-yellow-400/5',
        purple: 'bg-purple-400/10 border-purple-400/20 shadow-purple-400/5',
    };

    return (
        <div className="bg-premium-slate/40 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/5 hover:border-premium-gold/20 transition-all group shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className={`absolute -right-10 -top-10 w-32 h-32 blur-[60px] opacity-20 rounded-full ${colorMap[color]}`}></div>

            <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-3xl group-hover:scale-110 transition-transform duration-500 border ${colorMap[color]}`}>
                    {icon}
                </div>
                {trend && (
                    <span className="text-[10px] font-black text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
            <p className="text-4xl font-black text-white tracking-tighter group-hover:text-premium-gold transition-colors">{value}</p>
        </div>
    );
}

export default Dashboard;


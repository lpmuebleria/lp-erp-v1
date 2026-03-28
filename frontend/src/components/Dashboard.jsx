import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart3,
    TrendingUp,
    Users,
    Calendar,
    ArrowUpRight,
    Loader2,
    X,
    FileSpreadsheet,
    Download,
    Wallet,
    Package
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

const FAMILIAS_OPCIONES = [
    'maniobras',
    'empaque',
    'comision',
    'garantias',
    'muebles',
    'fletes',
    'envios',
    'iva',
    'comision_tarjeta',
    'comision_msi',
    'utilidad_bruta'
];

const FAMILIAS_LABELS = {
    'maniobras': 'Maniobras',
    'empaque': 'Empaque',
    'comision': 'Comisión',
    'garantias': 'Garantías',
    'muebles': 'Muebles (Venta)',
    'fletes': 'Fletes (Traslado)',
    'envios': 'Envíos Domicilio',
    'iva': 'IVA (16% Impuesto)',
    'comision_tarjeta': 'Comisión Tarjeta',
    'comision_msi': 'Costo MSI Banco',
    'utilidad_bruta': 'Utilidad Bruta'
};

function Dashboard({ onConceptClick }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    // Report Modal State
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [showCashFlowModal, setShowCashFlowModal] = useState(false);
    const [cashFlowLoading, setCashFlowLoading] = useState(false);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // First day of current month
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedFamilies, setSelectedFamilies] = useState(FAMILIAS_OPCIONES);
    const [includeExpenses, setIncludeExpenses] = useState(true);

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

    const hasFinancialAccess = () => {
        const auth = JSON.parse(localStorage.getItem('lp_erp_auth'));
        if (!auth) return false;
        if (auth.is_superadmin) return true;

        // Check if dashboard sub_permissions exists and view_financials is true
        return auth.permissions?.dashboard?.sub_permissions?.view_financials === true;
    };

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="animate-spin text-premium-gold" size={48} />
            </div>
        );
    }

    const toggleFamily = (fam) => {
        if (selectedFamilies.includes(fam)) {
            setSelectedFamilies(selectedFamilies.filter(f => f !== fam));
        } else {
            setSelectedFamilies([...selectedFamilies, fam]);
        }
    };

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            alert("Por favor selecciona las fechas de inicio y fin.");
            return;
        }
        if (selectedFamilies.length === 0) {
            alert("Por favor selecciona al menos una familia para el reporte.");
            return;
        }

        setReportLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/reports/team-activity`, {
                start_date: startDate,
                end_date: endDate,
                selected_families: selectedFamilies,
                include_expenses: includeExpenses
            }, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                responseType: 'blob'
            });

            // Fallback for blob detection if backend sends JSON error instead
            if (res.data.type === 'application/json') {
                const text = await res.data.text();
                console.error("Server returned JSON error:", text);
                alert("Ocurrió un error en el servidor. Revisa los logs.");
                setReportLoading(false);
                return;
            }

            // Create download link
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_actividad_${startDate}_al_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 100);

            setShowReportModal(false);
        } catch (err) {
            console.error("Error generating report:", err);
            // More specific error alerting
            if (err.response && err.response.data && err.response.data instanceof Blob) {
                const text = await err.response.data.text();
                alert(`Error del servidor: ${text}`);
            } else if (err.response && err.response.data) {
                alert(`Error del servidor: ${JSON.stringify(err.response.data)}`);
            } else {
                alert(`Ocurrió un error al generar el reporte: ${err.message}. Verifica la consola.`);
            }
        } finally {
            setReportLoading(false);
        }
    };

    const handleGenerateCashFlowReport = async () => {
        if (!startDate || !endDate) {
            alert("Por favor selecciona las fechas de inicio y fin.");
            return;
        }

        setCashFlowLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/reports/cash-flow`, {
                start_date: startDate,
                end_date: endDate,
                selected_families: [], // Ignored by backend
                include_expenses: true // Ignored by backend
            }, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                responseType: 'blob'
            });

            if (res.data.type === 'application/json') {
                const text = await res.data.text();
                console.error("Server returned JSON error:", text);
                alert("Ocurrió un error en el servidor. Revisa los logs.");
                setCashFlowLoading(false);
                return;
            }

            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `flujo_caja_${startDate}_al_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 100);

            setShowCashFlowModal(false);
        } catch (err) {
            console.error("Error generating cash flow report:", err);
            if (err.response && err.response.data && err.response.data instanceof Blob) {
                const text = await err.response.data.text();
                alert(`Error del servidor: ${text}`);
            } else if (err.response && err.response.data) {
                alert(`Error del servidor: ${JSON.stringify(err.response.data)}`);
            } else {
                alert(`Ocurrió un error al generar el reporte: ${err.message}. Verifica la consola.`);
            }
        } finally {
            setCashFlowLoading(false);
        }
    };

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

                {hasFinancialAccess() ? (
                    <StatCard
                        title="Utilidad Estimada"
                        value={`$${(metrics?.utilidad_bruta_mes || 0).toLocaleString()}`}
                        trend="+8.2%"
                        icon={<ArrowUpRight className="text-blue-400" size={24} />}
                        color="blue"
                    />
                ) : (
                    <StatCard
                        title="Artículos Vendidos"
                        value={metrics?.pedidos_por_estatus?.["Aprobado"] || 0}
                        icon={<Package className="text-blue-400" size={24} />}
                        color="blue"
                    />
                )}

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
                    {metrics?.bolsas_mes && hasFinancialAccess() && (
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
                                <BagItem label="IVA" value={metrics.bolsas_mes.iva} onClick={() => onConceptClick && onConceptClick('iva')} />
                                <BagItem label="Comisión Tarjeta" value={metrics.bolsas_mes.comision_tarjeta} onClick={() => onConceptClick && onConceptClick('comision_tarjeta')} />
                                <BagItem label="Costo MSI Banco" value={metrics.bolsas_mes.comision_msi} onClick={() => onConceptClick && onConceptClick('comision_msi')} />
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

                    {hasFinancialAccess() && (
                        <div className="bg-premium-slate/40 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/5 shadow-2xl flex flex-col justify-center text-center">
                            <div className="w-16 h-16 bg-premium-gold/10 rounded-2xl mx-auto mb-6 flex items-center justify-center border border-premium-gold/20">
                                <Users className="text-premium-gold" size={28} />
                            </div>
                            <h4 className="text-lg font-black text-white mb-2">Reportes Financieros</h4>
                            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-8 italic">Desempeño y Flujo de Caja</p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 transition-all text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center justify-center gap-2">
                                    <FileSpreadsheet size={16} />
                                    Actividad de Equipo (Operativo)
                                </button>

                                <button
                                    onClick={() => setShowCashFlowModal(true)}
                                    className="w-full bg-premium-gold/10 hover:bg-premium-gold/20 border border-premium-gold/30 rounded-2xl py-4 transition-all text-[10px] font-black uppercase tracking-widest text-premium-gold hover:text-yellow-400 flex items-center justify-center gap-2">
                                    <Wallet size={16} />
                                    Flujo de Caja (Corte y Bancos)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Report Modal */}
            {showReportModal && hasFinancialAccess() && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-premium-gold/10 rounded-xl border border-premium-gold/20">
                                    <FileSpreadsheet className="text-premium-gold" size={24} />
                                </div>
                                <h2 className="text-xl font-black text-white">Reporte de Actividad</h2>
                            </div>
                            <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-xl border border-white/5 hover:bg-white/10">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-premium-gold/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Fecha Fin</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-premium-gold/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Familias a Incluir</label>
                                    <button
                                        onClick={() => setSelectedFamilies(selectedFamilies.length === FAMILIAS_OPCIONES.length ? [] : FAMILIAS_OPCIONES)}
                                        className="text-[10px] text-premium-gold hover:text-white transition-colors"
                                    >
                                        {selectedFamilies.length === FAMILIAS_OPCIONES.length ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {FAMILIAS_OPCIONES.map(fam => (
                                        <label 
                                            key={fam} 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                toggleFamily(fam);
                                            }}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedFamilies.includes(fam) ? 'bg-premium-gold/10 border-premium-gold/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${selectedFamilies.includes(fam) ? 'bg-premium-gold border-premium-gold' : 'border-slate-500'}`}>
                                                {selectedFamilies.includes(fam) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                            </div>
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">{FAMILIAS_LABELS[fam] || fam}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${includeExpenses ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                                    <input
                                        type="checkbox"
                                        checked={includeExpenses}
                                        onChange={(e) => setIncludeExpenses(e.target.checked)}
                                        className="hidden"
                                    />
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${includeExpenses ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
                                        {includeExpenses && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                    </div>
                                    <span className="text-sm font-black text-white uppercase tracking-wider">Desglosar Gastos (Egresos)</span>
                                </label>
                            </div>

                            <button
                                onClick={handleGenerateReport}
                                disabled={reportLoading}
                                className="w-full bg-gradient-to-r from-premium-gold to-yellow-500 hover:from-yellow-400 hover:to-yellow-300 text-black font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {reportLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Generando...
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        Descargar Excel
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Flow Modal */}
            {showCashFlowModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f172a] border border-premium-gold/30 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-premium-gold/10 rounded-xl border border-premium-gold/20">
                                    <Wallet className="text-premium-gold" size={24} />
                                </div>
                                <h2 className="text-xl font-black text-white">Flujo de Caja</h2>
                            </div>
                            <button onClick={() => setShowCashFlowModal(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-xl border border-white/5 hover:bg-white/10">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-premium-slate/50 border border-white/5 rounded-2xl mb-6">
                                <p className="text-xs text-slate-400 leading-relaxed text-center">
                                    Este reporte estrictamente financiero desglosa el ingreso recibido por su respectivo método de pago (Efectivo y Cuentas Bancarias). Ideal para cortes de caja.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-premium-gold/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Fecha Fin</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-premium-gold/50"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleGenerateCashFlowReport}
                                disabled={cashFlowLoading}
                                className="w-full mt-4 bg-gradient-to-r from-premium-gold to-yellow-500 hover:from-yellow-400 hover:to-yellow-300 text-black font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {cashFlowLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Calculando Cuadre...
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        Descargar Flujo Excel
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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


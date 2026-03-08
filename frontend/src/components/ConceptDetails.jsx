import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ArrowLeft, Loader2, Calendar as CalendarIcon,
    ArrowDownRight, ArrowUpRight, Wallet, Plus, X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

function ConceptDetails({ concepto, onBack }) {
    // Current month by default
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });

    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    });

    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ monto: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], metodo_pago: 'efectivo' });
    const [addingExpense, setAddingExpense] = useState(false);

    // Humanize label
    const formatConceptName = (key) => {
        const names = {
            maniobras: "Maniobras",
            empaque: "Empaque",
            comision: "Comisiones",
            garantias: "Garantías",
            utilidad_bruta: "Utilidad Bruta",
            muebles: "Muebles (Costo Fabricación)",
            fletes: "Fletes",
            envios: "Envíos a Domicilio"
        };
        return names[key] || "Concepto";
    };

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/expenses/details/${concepto}?start_date=${startDate}&end_date=${endDate}`);
            setDetails(res.data);
        } catch (err) {
            console.error("Error fetching concept details:", err);
            alert("No se pudo cargar el desglose.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [concepto, startDate, endDate]);

    const handleAddExpense = async () => {
        if (!expenseForm.monto || !expenseForm.descripcion.trim()) {
            alert("El monto y la descripción son obligatorios"); // ConceptDetails doesn't seem to have react-hot-toast imported
            return;
        }
        setAddingExpense(true);
        try {
            await axios.post(`${API_URL}/expenses`, {
                concepto: concepto,
                monto: parseFloat(expenseForm.monto),
                descripcion: expenseForm.descripcion,
                fecha: expenseForm.fecha,
                metodo_pago: expenseForm.metodo_pago
            });
            setShowExpenseModal(false);
            setExpenseForm({ monto: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], metodo_pago: 'efectivo' });
            fetchDetails();
            alert("Gasto registrado exitosamente.");
        } catch (err) {
            alert(err.response?.data?.detail || "Error al guardar el gasto");
        } finally {
            setAddingExpense(false);
        }
    };

    // Merge incomes and expenses into a single timeline array
    let timeline = [];
    if (details) {
        details.ingresos.forEach(i => {
            timeline.push({ type: 'ingreso', date: i.fecha, order_id: i.order_id, folio: i.folio, detail: `Pedido a: ${i.cliente_nombre || 'Sin nombre'}`, amount: i.monto });
        });
        details.egresos.forEach(e => {
            timeline.push({ type: 'egreso', date: e.fecha, id: e.id, detail: e.descripcion, amount: e.monto });
        });
        // Sort by date DESC
        timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return (
        <div className="min-h-screen bg-premium-bg text-white selection:bg-premium-gold/30 flex flex-col relative w-full items-center">
            {/* Header Strip Full Width */}
            <div className="w-full bg-premium-slate border-b border-white/5 px-8 lg:px-20 py-8 sticky top-0 z-40 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={onBack}
                            className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 text-white transition-all group shadow-lg"
                        >
                            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={24} />
                        </button>
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter text-premium-gold">
                                Desglose de {formatConceptName(concepto)}
                            </h1>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-[4px] mt-1">Acumulados y Gastos</p>
                        </div>
                    </div>

                    <div className="flex bg-white/[0.02] p-2 rounded-2xl border border-white/5 items-center gap-2">
                        <CalendarIcon size={16} className="text-slate-500 ml-2" />
                        <input
                            type="date"
                            className="bg-transparent text-white text-xs font-black uppercase outline-none px-2 cursor-pointer"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-slate-600 font-black">/</span>
                        <input
                            type="date"
                            className="bg-transparent text-white text-xs font-black uppercase outline-none px-2 cursor-pointer"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="w-full max-w-7xl px-8 lg:px-20 py-12 flex-1 animate-in fade-in slide-in-from-bottom-10 duration-700">

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-premium-slate/50 p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-500/10 blur-[40px] rounded-full"></div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Ingreso Acumulado</p>
                        <p className="text-4xl font-black text-white tracking-tighter flex items-center gap-2">
                            <ArrowUpRight className="text-green-400" size={32} />
                            ${loading ? '...' : (details?.totales.ingresos || 0).toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-premium-slate/50 p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-500/10 blur-[40px] rounded-full"></div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Gastos (Egresos)</p>
                        <p className="text-4xl font-black text-white tracking-tighter flex items-center gap-2">
                            <ArrowDownRight className="text-red-400" size={32} />
                            ${loading ? '...' : (details?.totales.egresos || 0).toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-premium-gold/10 p-8 rounded-[2rem] border border-premium-gold/30 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-premium-gold/20 to-transparent"></div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-premium-gold mb-2 relative z-10">Balance Neto Disponible</p>
                        <p className="text-4xl font-black text-premium-gold tracking-tighter flex items-center gap-2 relative z-10">
                            <Wallet className="text-premium-gold" size={32} />
                            ${loading ? '...' : (details?.totales.balance || 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Timeline controls */}
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black uppercase text-white tracking-tighter px-2 border-l-4 border-premium-gold">Historial Logístico</h2>
                    <button
                        onClick={() => setShowExpenseModal(true)}
                        className="bg-premium-gold hover:bg-yellow-400 text-black px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl hover:scale-105 active:scale-95"
                    >
                        <Plus size={18} />
                        Registrar Gasto
                    </button>
                </div>

                {/* Timeline Table */}
                <div className="bg-premium-slate rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl min-h-[400px]">
                    {loading ? (
                        <div className="flex items-center justify-center p-32">
                            <Loader2 className="animate-spin text-premium-gold" size={48} />
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-black/20 text-[10px] uppercase font-black tracking-widest text-slate-500">
                                    <th className="p-8">Fecha</th>
                                    <th className="p-8">Tipo de Movimiento</th>
                                    <th className="p-8">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {timeline.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="p-16 text-center text-slate-500 italic">No hay registros en este rango de fechas.</td>
                                    </tr>
                                )}
                                {timeline.map((item, idx) => (
                                    <tr key={idx} className={`hover:bg-white/[0.02] transition-colors ${item.type === 'egreso' ? 'bg-red-500/[0.02]' : ''}`}>
                                        <td className="p-8 whitespace-nowrap">
                                            <span className={`font-mono text-sm ${item.type === 'ingreso' ? 'text-slate-300' : 'text-red-300'}`}>
                                                {new Date(item.date).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="p-8">
                                            {item.type === 'ingreso' ? (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] bg-green-500/10 text-green-400 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Acumulado</span>
                                                        <span className="text-white font-black tracking-tight">{item.folio}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-bold uppercase">{item.detail}</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] bg-red-500/10 text-red-500 font-black px-2 py-0.5 rounded-md uppercase tracking-wider border border-red-500/20">Gasto Registrado</span>
                                                    </div>
                                                    <p className="text-sm text-slate-300 font-medium italic">{item.detail}</p>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-8 right-align">
                                            <span className={`text-2xl font-black font-mono tracking-tighter ${item.type === 'ingreso' ? 'text-green-400' : 'text-red-500'}`}>
                                                {item.type === 'ingreso' ? '+' : '-'}${parseFloat(item.amount).toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Expense Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => !addingExpense && setShowExpenseModal(false)}></div>
                    <div className="bg-premium-slate border border-white/10 rounded-[3rem] p-10 max-w-md w-full relative z-10 shadow-2xl animate-in zoom-in-90 duration-300">
                        <button
                            className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
                            onClick={() => setShowExpenseModal(false)}
                        >
                            <X size={24} />
                        </button>

                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Registrar Gasto</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase mb-8">Concepto: <span className="text-premium-gold">{formatConceptName(concepto)}</span></p>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black tracking-widest uppercase text-slate-500 block mb-2 ml-2">Monto a descontar ($)</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white font-black">$</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={expenseForm.monto}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, monto: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-10 pr-6 text-xl text-white font-black placeholder:text-slate-700 outline-none focus:border-premium-gold/50 transition-colors shadow-inner"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black tracking-widest uppercase text-slate-500 block mb-2 ml-2">Justificación del gasto</label>
                                <textarea
                                    placeholder="Ej: Pago de flete extra, devoluciones, viáticos..."
                                    value={expenseForm.descripcion}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, descripcion: e.target.value })}
                                    rows="3"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-white placeholder:text-slate-700 outline-none focus:border-premium-gold/50 transition-colors shadow-inner resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black tracking-widest uppercase text-slate-500 block mb-2 ml-2">Fecha del Gasto</label>
                                <input
                                    type="date"
                                    value={expenseForm.fecha}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, fecha: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-premium-gold/50 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black tracking-widest uppercase text-slate-500 block mb-2 ml-2">Método de Pago</label>
                                <select
                                    value={expenseForm.metodo_pago}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, metodo_pago: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-premium-gold/50 transition-colors cursor-pointer"
                                >
                                    <option value="efectivo" className="text-black">Efectivo</option>
                                    <option value="transferencia" className="text-black">Transferencia</option>
                                    <option value="tarjeta_credito" className="text-black">Tarjeta de Crédito</option>
                                    <option value="tarjeta_debito" className="text-black">Tarjeta de Débito</option>
                                </select>
                            </div>

                            <button
                                onClick={handleAddExpense}
                                disabled={addingExpense || !expenseForm.monto || !expenseForm.descripcion.trim()}
                                className="w-full bg-premium-gold hover:bg-yellow-400 text-black py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-30 shadow-xl flex justify-center mt-4"
                            >
                                {addingExpense ? <Loader2 className="animate-spin" size={20} /> : "GUARDAR GASTO"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ConceptDetails;


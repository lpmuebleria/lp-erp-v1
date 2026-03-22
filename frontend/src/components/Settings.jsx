import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Settings as SettingsIcon, TrendingUp, Truck, Package, Percent, Loader2, CheckCircle2, Tag, Plus, Trash2, Users, DollarSign } from 'lucide-react';
import UsersAdmin from './UsersAdmin';
import ShippingCostsAdmin from './ShippingCostsAdmin';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

function Settings() {
    const [activeTab, setActiveTab] = useState('utilidades'); // 'utilidades', 'costos', 'promociones'

    const [utilities, setUtilities] = useState([]);
    const [costs, setCosts] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [globalFlete, setGlobalFlete] = useState(0);
    const [ivaAutomatico, setIvaAutomatico] = useState(false);
    const [interests, setInterests] = useState({
        comision_debito_pct: 2.0,
        interes_msi_pct: 15.0,
        comision_msi_banco_pct: 12.0
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const [uRes, cRes, pRes, fRes, ivaRes, intRes] = await Promise.all([
                axios.get(`${API_URL}/config/utility`, { withCredentials: true }),
                axios.get(`${API_URL}/config/costs`, { withCredentials: true }),
                axios.get(`${API_URL}/promotions`, { withCredentials: true }),
                axios.get(`${API_URL}/config/flete`, { withCredentials: true }),
                axios.get(`${API_URL}/config/iva`, { withCredentials: true }),
                axios.get(`${API_URL}/config/interests`, { withCredentials: true })
            ]);
            setUtilities(uRes.data);
            setCosts(cRes.data);
            setPromotions(pRes.data);
            setGlobalFlete(fRes.data.costo);
            setIvaAutomatico(ivaRes.data.iva_automatico);
            setInterests(intRes.data);
        } catch (err) {
            console.error("Error fetching configs:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (activeTab === 'promociones') return; // Promos saved individually for now
        setSaving(true);
        try {
            if (activeTab === 'utilidades') {
                await Promise.all([
                    axios.put(`${API_URL}/config/utility`, utilities, { withCredentials: true }),
                    axios.put(`${API_URL}/config/flete`, { costo: globalFlete }, { withCredentials: true }),
                    axios.put(`${API_URL}/config/iva`, { iva_automatico: ivaAutomatico }, { withCredentials: true }),
                    axios.put(`${API_URL}/config/interests`, interests, { withCredentials: true })
                ]);
            } else if (activeTab === 'costos') {
                await axios.put(`${API_URL}/config/costs`, costs, { withCredentials: true });
            }
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            console.error("Error saving configs:", err);
            toast.error("Error al guardar la configuración");
        } finally {
            setSaving(false);
        }
    };

    const handlePromoToggle = async (promo) => {
        try {
            const res = await axios.put(`${API_URL}/promotions/${promo.id}`, { ...promo, is_active: promo.is_active ? 0 : 1 }, { withCredentials: true });
            setPromotions(promotions.map(p => p.id === promo.id ? res.data : p));
        } catch (err) {
            console.error(err);
        }
    };

    const handlePromoDelete = async (id) => {
        if (!confirm("¿Eliminar promoción?")) return;
        try {
            await axios.delete(`${API_URL}/promotions/${id}`, { withCredentials: true });
            setPromotions(promotions.filter(p => p.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const handlePromoAdd = async (e) => {
        e.preventDefault();
        const form = e.target;
        const name = form.name.value;
        const discount_pct = parseFloat(form.discount_pct.value);
        if (!name?.trim() || isNaN(discount_pct)) {
            toast.error("Nombre y porcentaje son obligatorios");
            return;
        }

        try {
            const res = await axios.post(`${API_URL}/promotions`, { name, discount_pct, is_active: 1 }, { withCredentials: true });
            setPromotions([...promotions, res.data]);
            form.reset();
        } catch (err) {
            console.error(err);
        }
    };

    const updateUtility = (nivel, value) => {
        setUtilities(utilities.map(u => u.nivel === nivel ? { ...u, multiplicador: parseFloat(value) } : u));
    };

    const updateCost = (tamano, field, value) => {
        setCosts(costs.map(c => c.tamano === tamano ? { ...c, [field]: parseFloat(value) } : c));
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-premium-gold" size={48} />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <SettingsIcon className="text-premium-gold" size={32} />
                        CONFIGURACIÓN
                    </h1>
                    <p className="text-slate-400 mt-1">Control de utilidades y gastos fijos de operación</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-premium-gold text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </header>

            {showSuccess && (
                <div className="mb-6 bg-green-500/20 border border-green-500/50 text-green-400 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4">
                    <CheckCircle2 size={20} />
                    Configuración guardada exitosamente
                </div>
            )}

            <div className="flex space-x-4 mb-8">
                <button
                    onClick={() => setActiveTab('utilidades')}
                    className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'utilidades' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500 hover:text-white'
                        }`}
                >
                    Utilidades
                </button>
                <button
                    onClick={() => setActiveTab('costos')}
                    className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'costos' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500 hover:text-white'
                        }`}
                >
                    Costos Fijos
                </button>
                <button
                    onClick={() => setActiveTab('promociones')}
                    className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'promociones' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500 hover:text-white'
                        }`}
                >
                    Promociones
                </button>
                <button
                    onClick={() => setActiveTab('personal')}
                    className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'personal' ? 'bg-premium-gold text-black shadow-xl shadow-premium-gold/20' : 'text-slate-500 hover:text-white'
                        }`}
                >
                    Personal y Accesos
                </button>
                <button
                    onClick={() => setActiveTab('envios')}
                    className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'envios' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500 hover:text-white'
                        }`}
                >
                    Envíos y CP
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Users and Roles Management Section */}
                {activeTab === 'personal' && (
                    <UsersAdmin />
                )}
                {/* Shipping Costs Section */}
                {activeTab === 'envios' && (
                    <div className="lg:col-span-2">
                        <ShippingCostsAdmin />
                    </div>
                )}
                {/* Profit Margins Section */}
                {activeTab === 'utilidades' && (
                    <section className="bg-premium-slate/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm lg:col-span-2">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <TrendingUp className="text-premium-gold" size={24} />
                            Márgenes de Utilidad
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {utilities.map((u) => (
                                <div key={u.nivel} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="capitalize font-bold text-slate-300">{u.nivel}</div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-xs text-slate-500 font-mono">
                                            {Math.round((u.multiplicador - 1) * 100)}%
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={u.multiplicador}
                                            onChange={(e) => updateUtility(u.nivel, e.target.value)}
                                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 w-24 text-right text-premium-gold font-mono focus:border-premium-gold outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Truck className="text-premium-gold" size={20} />
                                Costo Base Logístico (Flete Global)
                            </h2>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-premium-gold/20 max-w-lg">
                                <div>
                                    <div className="font-bold text-slate-300">Flete Maestros a Fábrica</div>
                                    <div className="text-xs text-slate-500 mt-1">Se sumará automáticamente a todos los cálculos de catálogo de productos</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                        <input
                                            type="number"
                                            value={globalFlete}
                                            onChange={(e) => setGlobalFlete(parseFloat(e.target.value) || 0)}
                                            className="bg-black/40 border border-white/10 rounded-lg pl-6 pr-3 py-2 w-32 text-right text-premium-gold font-mono focus:border-premium-gold outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <DollarSign className="text-premium-gold" size={20} />
                                Intereses y Terminales Bancarias
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-300">Comisión Débito</div>
                                        <div className="text-[10px] text-slate-500">Lo que el banco te quita (se absorbe)</div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={interests.comision_debito_pct}
                                            onChange={(e) => setInterests({ ...interests, comision_debito_pct: parseFloat(e.target.value) || 0 })}
                                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 w-20 text-right text-premium-gold font-mono focus:border-premium-gold outline-none transition-colors"
                                        />
                                        <span className="ml-2 text-slate-500 text-sm">%</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-300">Incremento MSI (Cliente)</div>
                                        <div className="text-[10px] text-slate-500">Lo que se le suma al precio base</div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={interests.interes_msi_pct}
                                            onChange={(e) => setInterests({ ...interests, interes_msi_pct: parseFloat(e.target.value) || 0 })}
                                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 w-20 text-right text-premium-gold font-mono focus:border-premium-gold outline-none transition-colors"
                                        />
                                        <span className="ml-2 text-slate-500 text-sm">%</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between md:col-span-2">
                                    <div>
                                        <div className="font-bold text-slate-300">Costo MSI Banco (Comisión Real)</div>
                                        <div className="text-[10px] text-slate-500">Comisión que el banco retiene por ventas a meses</div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={interests.comision_msi_banco_pct}
                                            onChange={(e) => setInterests({ ...interests, comision_msi_banco_pct: parseFloat(e.target.value) || 0 })}
                                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 w-20 text-right text-premium-gold font-mono focus:border-premium-gold outline-none transition-colors"
                                        />
                                        <span className="ml-2 text-slate-500 text-sm">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Fixed Costs Section */}
                {activeTab === 'costos' && (
                    <section className="bg-premium-slate/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm lg:col-span-2">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Truck className="text-premium-gold" size={24} />
                            Gastos Fijos por Tamaño
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {costs.map((c) => (
                                <div key={c.tamano} className="bg-white/5 rounded-2xl border border-white/5 p-4">
                                    <div className="flex items-center gap-2 mb-4 text-premium-gold">
                                        <Package size={18} />
                                        <span className="font-black uppercase tracking-widest text-sm">{c.tamano}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <CostInput label="Maniobras" value={c.maniobras} onChange={(v) => updateCost(c.tamano, 'maniobras', v)} />
                                        <CostInput label="Empaque" value={c.empaque} onChange={(v) => updateCost(c.tamano, 'empaque', v)} />
                                        <CostInput label="Comisión" value={c.comision} onChange={(v) => updateCost(c.tamano, 'comision', v)} />
                                        <CostInput label="Garantías" value={c.garantias} onChange={(v) => updateCost(c.tamano, 'garantias', v)} />
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-xs text-slate-500 font-bold uppercase">Total Gastos</span>
                                        <span className="text-premium-gold font-black font-mono">
                                            ${(c.maniobras + c.empaque + c.comision + c.garantias).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Promotions Section */}
                {activeTab === 'promociones' && (
                    <section className="bg-premium-slate/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm lg:col-span-2">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Tag className="text-premium-gold" size={24} />
                                Catálogo de Promociones
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Add Promo Form */}
                            <div className="md:col-span-1 bg-black/20 p-6 rounded-2xl border border-white/5 h-fit">
                                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4">Nueva Promoción</h3>
                                <form onSubmit={handlePromoAdd} className="space-y-4">
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Nombre Corto</label>
                                        <input name="name" type="text" placeholder="Ej: Buen Fin" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-premium-gold" required />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Porcentaje de Descuento (%)</label>
                                        <input name="discount_pct" type="number" step="0.1" max="100" min="0" placeholder="Ej: 15" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-premium-gold" required />
                                    </div>
                                    <button type="submit" className="w-full py-3 bg-premium-gold/20 text-premium-gold font-black uppercase rounded-xl hover:bg-premium-gold hover:text-black transition-colors flex justify-center items-center gap-2">
                                        <Plus size={16} /> Agregar
                                    </button>
                                </form>
                            </div>

                            {/* Promos List */}
                            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {promotions.map(p => (
                                    <div key={p.id} className={`p-5 rounded-2xl border transition-all ${p.is_active ? 'bg-white/5 border-premium-gold/30' : 'bg-black/30 border-white/5 opacity-60'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-white text-lg">{p.name}</h4>
                                            <button onClick={() => handlePromoDelete(p.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="text-2xl font-black text-premium-gold mb-4">{p.discount_pct}% OFF</div>
                                        <button
                                            onClick={() => handlePromoToggle(p)}
                                            className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg w-full transition-colors ${p.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                        >
                                            {p.is_active ? 'Activa - Desactivar' : 'Inactiva - Activar'}
                                        </button>
                                    </div>
                                ))}
                                {promotions.length === 0 && (
                                    <div className="col-span-2 text-center p-8 text-slate-500 italic">No hay promociones registradas</div>
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function CostInput({ label, value, onChange }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold">{label}</label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="bg-black/30 border border-white/5 rounded-xl pl-6 pr-3 py-2 w-full text-sm text-white font-mono focus:border-premium-gold/50 outline-none transition-colors"
                />
            </div>
        </div>
    );
}

export default Settings;

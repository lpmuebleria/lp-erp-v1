import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Save, Settings as SettingsIcon, TrendingUp, Truck, Package, Percent, Loader2, CheckCircle2, Tag, Plus, Trash2, Users, DollarSign, Database, Download, RefreshCcw } from 'lucide-react';
import UsersAdmin from './UsersAdmin';
import ShippingCostsAdmin from './ShippingCostsAdmin';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

function Settings({ isSuperadmin }) {
    const [activeTab, setActiveTab] = useState('utilidades'); // 'utilidades', 'costos', 'promociones', 'backups'

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
    const [fabrics, setFabrics] = useState([]);
    const [colors, setColors] = useState([]);
    const [categories, setCategories] = useState([]);
    const [backups, setBackups] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        fetchConfigs();
        if (isSuperadmin) fetchBackups();
    }, [isSuperadmin]);

    const fetchConfigs = async () => {
        try {
            const [uRes, cRes, pRes, fRes, ivaRes, intRes, fabRes, colRes, catRes] = await Promise.all([
                axios.get(`${API_URL}/config/utility`, { withCredentials: true }),
                axios.get(`${API_URL}/config/costs`, { withCredentials: true }),
                axios.get(`${API_URL}/promotions`, { withCredentials: true }),
                axios.get(`${API_URL}/config/flete`, { withCredentials: true }),
                axios.get(`${API_URL}/config/iva`, { withCredentials: true }),
                axios.get(`${API_URL}/config/interests`, { withCredentials: true }),
                axios.get(`${API_URL}/config/fabrics`, { withCredentials: true }),
                axios.get(`${API_URL}/config/colors`, { withCredentials: true }),
                axios.get(`${API_URL}/config/categories`, { withCredentials: true })
            ]);
            setUtilities(uRes.data);
            setCosts(cRes.data);
            setPromotions(pRes.data);
            setGlobalFlete(fRes.data.costo);
            setIvaAutomatico(ivaRes.data.iva_automatico);
            setInterests(intRes.data);
            setFabrics(fabRes.data);
            setColors(colRes.data);
            setCategories(catRes.data);
        } catch (err) {
            console.error("Error fetching configs:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBackups = async () => {
        try {
            const res = await axios.get(`${API_URL}/backups`, { withCredentials: true });
            setBackups(res.data);
        } catch (err) {
            console.error("Error fetching backups:", err);
        }
    };

    const handleTriggerBackup = async () => {
        setSaving(true);
        try {
            await axios.post(`${API_URL}/backups/trigger`, {}, { withCredentials: true });
            toast.success("Respaldo iniciado en segundo plano");
            setTimeout(fetchBackups, 3000);
        } catch (err) {
            console.error("Error triggering backup:", err);
            toast.error("Error al iniciar respaldo");
        } finally {
            setSaving(false);
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
        const type = form.type.value;
        const code = form.code.value;
        const selectedCategories = Array.from(form.categories.selectedOptions).map(o => parseInt(o.value));

        if (!name?.trim() || isNaN(discount_pct)) {
            toast.error("Nombre y porcentaje son obligatorios");
            return;
        }

        try {
            const res = await axios.post(`${API_URL}/promotions`, {
                name,
                discount_pct,
                is_active: 1,
                type,
                code,
                category_ids: selectedCategories
            }, { withCredentials: true });
            setPromotions([...promotions, res.data]);
            form.reset();
            toast.success("Promoción creada");
        } catch (err) {
            console.error(err);
            toast.error("Error al crear promoción");
        }
    };

    const handleAddFabric = async (e) => {
        e.preventDefault();
        const name = e.target.fabricName.value;
        if (!name?.trim()) return;
        try {
            const res = await axios.post(`${API_URL}/config/fabrics`, { name }, { withCredentials: true });
            setFabrics([...fabrics, { id: res.data.id, name }]);
            fetchConfigs(); // Also fetch config directly again to sync safely
            e.target.reset();
        } catch (err) { console.error(err); }
    };

    const handleDeleteFabric = async (id) => {
        if (!confirm("¿Eliminar tela?")) return;
        try {
            await axios.delete(`${API_URL}/config/fabrics/${id}`, { withCredentials: true });
            setFabrics(fabrics.filter(f => f.id !== id));
        } catch (err) { console.error(err); }
    };

    const handleAddColorToFabric = async (name, fabricId) => {
        if (!name?.trim()) return;
        try {
            const res = await axios.post(`${API_URL}/config/colors`, { name, fabric_id: fabricId }, { withCredentials: true });
            // Refresh to get full list or optimistic update with ID
            setColors([...colors, { id: res.data.id, name, fabric_id: fabricId }]);
            fetchConfigs(); // To be safe with lists
        } catch (err) { console.error(err); }
    };

    const handleDeleteColor = async (id) => {
        if (!confirm("¿Eliminar color?")) return;
        try {
            await axios.delete(`${API_URL}/config/colors/${id}`, { withCredentials: true });
            setColors(colors.filter(c => c.id !== id));
        } catch (err) { console.error(err); }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        const name = e.target.catName.value;
        if (!name?.trim()) return;
        try {
            const res = await axios.post(`${API_URL}/config/categories`, { name }, { withCredentials: true });
            setCategories([...categories, { id: res.data.id, name }]);
            e.target.reset();
            toast.success("Categoría añadida");
        } catch (err) { console.error(err); toast.error("Error al añadir categoría"); }
    };

    const handleDeleteCategory = async (id) => {
        if (!confirm("¿Eliminar categoría? Esto quitará la categoría a los productos asociados.")) return;
        try {
            await axios.delete(`${API_URL}/config/categories/${id}`, { withCredentials: true });
            setCategories(categories.filter(c => c.id !== id));
            toast.success("Categoría eliminada");
        } catch (err) { console.error(err); toast.error("Error al eliminar categoría"); }
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
                <button
                    onClick={() => setActiveTab('catalogos')}
                    className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'catalogos' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500 hover:text-white'
                        }`}
                >
                    Telas/Colores
                </button>
                <button
                    onClick={() => setActiveTab('categorias')}
                    className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'categorias' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500 hover:text-white'
                        }`}
                >
                    Categorías
                </button>
                {isSuperadmin && (
                    <button
                        onClick={() => setActiveTab('backups')}
                        className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'backups' ? 'bg-indigo-600/30 text-indigo-400 shadow-xl border border-indigo-500/30' : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        Respaldos
                    </button>
                )}
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
                {/* Catalogs Section */}
                {activeTab === 'catalogos' && (
                    <div className="lg:col-span-2 space-y-8">
                        <section className="bg-premium-slate/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Package className="text-premium-gold" size={24} />
                                Gestión de Telas y Colores
                            </h2>

                            <form onSubmit={handleAddFabric} className="flex gap-2 mb-8 max-w-md">
                                <input
                                    name="fabricName"
                                    placeholder="Nueva tela (ej. Lino)"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-premium-gold outline-none"
                                    required
                                />
                                <button type="submit" className="bg-premium-gold text-black px-6 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all">
                                    <Plus size={20} /> Tela
                                </button>
                            </form>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {fabrics.map(f => (
                                    <div key={f.id} className="bg-black/20 border border-white/5 rounded-2xl p-4 group flex flex-col h-full hover:border-premium-gold/30 transition-all shadow-lg">
                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                            <span className="text-sm text-white uppercase font-black tracking-widest">{f.name}</span>
                                            <button onClick={() => handleDeleteFabric(f.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="flex-1 space-y-2 mb-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            {colors.filter(c => c.fabric_id === f.id).map(c => (
                                                <div key={c.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-white/5 rounded-lg group/color">
                                                    <span className="text-[11px] text-slate-400 font-bold uppercase">{c.name}</span>
                                                    <button onClick={() => handleDeleteColor(c.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover/color:opacity-100 transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            {colors.filter(c => c.fabric_id === f.id).length === 0 && (
                                                <div className="text-[10px] text-slate-600 italic py-2">Sin colores asignados</div>
                                            )}
                                        </div>

                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            const name = e.target.colorName.value;
                                            handleAddColorToFabric(name, f.id);
                                            e.target.reset();
                                        }} className="flex gap-2 pt-4 border-t border-white/5">
                                            <input
                                                name="colorName"
                                                placeholder="Nuevo color..."
                                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-premium-gold outline-none"
                                                required
                                            />
                                            <button type="submit" className="bg-premium-gold/20 text-premium-gold p-1.5 rounded-lg hover:bg-premium-gold hover:text-black transition-all">
                                                <Plus size={16} />
                                            </button>
                                        </form>
                                    </div>
                                ))}
                            </div>
                        </section>
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
                                        <label className="text-xs text-slate-400 block mb-1">Nombre Descriptivo</label>
                                        <input name="name" type="text" placeholder="Ej: Rebaja de Verano" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-premium-gold" required />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Tipo de Descuento</label>
                                        <select name="type" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-premium-gold">
                                            <option value="global" className="bg-premium-slate">Global (Todo el carrito)</option>
                                            <option value="automatic" className="bg-premium-slate">Automático por Familia (Visible en Catálogo)</option>
                                            <option value="coupon" className="bg-premium-slate">Por Código/Cupón (Sabado Loco)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Código (Opcional - para cupones)</label>
                                        <input name="code" type="text" placeholder="SABADOLOCO" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-premium-gold" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Porcentaje (%)</label>
                                        <input name="discount_pct" type="number" step="0.1" max="100" min="0" placeholder="15" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-premium-gold" required />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Aplicar a Familias (Multiselect)</label>
                                        <select name="categories" multiple className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-premium-gold h-32 custom-scrollbar">
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-500 mt-1">Usa Ctrl/Cmd + click para seleccionar varios</p>
                                    </div>
                                    
                                    <button type="submit" className="w-full py-3 bg-premium-gold/20 text-premium-gold font-black uppercase rounded-xl hover:bg-premium-gold hover:text-black transition-colors flex justify-center items-center gap-2">
                                        <Plus size={16} /> Crear Promoción
                                    </button>
                                </form>
                            </div>

                            {/* Promos List */}
                            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {promotions.map(p => (
                                    <div key={p.id} className={`p-5 rounded-2xl border transition-all ${p.is_active ? 'bg-white/5 border-premium-gold/30' : 'bg-black/30 border-white/5 opacity-60'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{p.name}</h4>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                                                        {p.type === 'global' ? 'Global' : p.type === 'automatic' ? 'Auto por Familia' : 'Código'}
                                                    </span>
                                                    {p.code && <span className="text-[10px] bg-premium-gold/20 text-premium-gold px-2 py-0.5 rounded font-mono font-bold tracking-wider underline">#{p.code}</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => handlePromoDelete(p.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="text-2xl font-black text-premium-gold mb-2">{p.discount_pct}% OFF</div>
                                        
                                        {p.category_ids && p.category_ids.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Familias:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {p.category_ids.map(catId => {
                                                        const cat = categories.find(c => c.id === catId);
                                                        return cat ? <span key={catId} className="text-[9px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded">{cat.name}</span> : null;
                                                    })}
                                                </div>
                                            </div>
                                        )}

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

                {/* Categories Tab Content */}
                {activeTab === 'categorias' && (
                    <section className="bg-premium-slate/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm lg:col-span-2">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Tag className="text-premium-gold" size={24} />
                            Familias de Productos (Categorías)
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-1">
                                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                    Define las categorías principales de tus muebles. Esto te permitirá aplicar descuentos masivos por tipo de producto y filtrar tu inventario.
                                </p>
                                <form onSubmit={handleAddCategory} className="flex gap-2">
                                    <input 
                                        name="catName" 
                                        placeholder="Ej: Sofacamas" 
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-premium-gold outline-none"
                                        required 
                                    />
                                    <button type="submit" className="bg-premium-gold text-black px-6 rounded-xl font-bold hover:scale-105 transition-all active:scale-95">
                                        <Plus size={20} />
                                    </button>
                                </form>
                            </div>

                            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {categories.map(c => (
                                    <div key={c.id} className="bg-black/20 border border-white/5 rounded-2xl p-4 flex justify-between items-center group hover:border-premium-gold/30 transition-all">
                                        <span className="text-white font-black uppercase tracking-widest text-sm">{c.name}</span>
                                        <button onClick={() => handleDeleteCategory(c.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {categories.length === 0 && (
                                    <div className="col-span-full text-center p-8 text-slate-500 italic">No has creado ninguna categoría aún</div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Database Backups Section */}
                {activeTab === 'backups' && isSuperadmin && (
                    <section className="bg-premium-slate/50 border border-white/5 rounded-3xl p-8 backdrop-blur-sm lg:col-span-2">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                    <Database className="text-premium-gold" size={28} />
                                    RESPALDOS DE BASE DE DATOS
                                </h2>
                                <p className="text-slate-400 text-sm mt-2">
                                    El sistema genera respaldos automáticos cada 12 horas y mantiene los últimos 7 días.
                                </p>
                            </div>
                            <button
                                onClick={handleTriggerBackup}
                                disabled={saving}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <RefreshCcw className="animate-spin" size={20} /> : <RefreshCcw size={20} />}
                                Generar Respaldo Ahora
                            </button>
                        </div>

                        <div className="bg-black/30 rounded-2xl border border-white/5 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 text-[10px] font-black uppercase tracking-[2px] text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4">Archivo</th>
                                            <th className="px-6 py-4">Fecha</th>
                                            <th className="px-6 py-4 text-right">Tamaño</th>
                                            <th className="px-6 py-4 text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {backups.map((b) => (
                                            <tr key={b.filename} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4 font-mono text-sm text-slate-300">
                                                    {b.filename}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                                                    {new Date(b.created_at).toLocaleString('es-MX', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-xs text-premium-gold">
                                                    {(b.size / 1024 / 1024).toFixed(2)} MB
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <a
                                                        href={`${API_URL}/backups/download/${b.filename}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 text-indigo-400 hover:text-white text-xs font-bold uppercase transition-colors"
                                                    >
                                                        <Download size={14} />
                                                        Bajar
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                        {backups.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-slate-500 italic">
                                                    Cargando listado de respaldos o no hay archivos disponibles...
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start gap-4">
                            <div className="bg-yellow-500/20 p-2 rounded-lg shrink-0">
                                <CheckCircle2 className="text-yellow-500" size={20} />
                            </div>
                            <div>
                                <h4 className="text-yellow-500 font-bold text-sm">Aviso de Seguridad</h4>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    Los archivos SQL contienen información sensible de la base de datos.
                                    Asegúrate de guardarlos en un lugar seguro y no compartirlos con personal no autorizado.
                                </p>
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

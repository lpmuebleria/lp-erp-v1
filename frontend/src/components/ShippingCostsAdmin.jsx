import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, Search, Plus, Trash2, Edit2, CheckCircle2, X, MapPin } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://lp-erp-v1.onrender.com/api';

function ShippingCostsAdmin() {
    const [costs, setCosts] = useState([]);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('cps'); // 'cps' | 'zonas'

    // Form Modals
    const [showCpModal, setShowCpModal] = useState(false);
    const [editingCp, setEditingCp] = useState(null);
    const [cpForm, setCpForm] = useState({ cp: '', colonia: '', municipio: '', zona: '' });

    const [showZoneModal, setShowZoneModal] = useState(false);
    const [editingZone, setEditingZone] = useState(null);
    const [zoneForm, setZoneForm] = useState({ name: '', costo: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cpsRes, zonesRes] = await Promise.all([
                axios.get(`${API_URL}/shipping`),
                axios.get(`${API_URL}/shipping/zones`)
            ]);
            setCosts(cpsRes.data);
            setZones(zonesRes.data);
        } catch (error) {
            console.error("Error fetching shipping data:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- CP Handlers ---
    const handleSaveCp = async (e) => {
        e.preventDefault();
        try {
            if (editingCp) {
                await axios.put(`${API_URL}/shipping/${editingCp}`, {
                    colonia: cpForm.colonia,
                    municipio: cpForm.municipio,
                    zona: cpForm.zona
                });
            } else {
                await axios.post(`${API_URL}/shipping`, cpForm);
            }
            fetchData();
            handleCloseCpModal();
        } catch (error) {
            alert(error.response?.data?.detail || "Error al guardar CP");
        }
    };

    const handleDeleteCp = async (cp) => {
        if (!window.confirm("¿Seguro que deseas eliminar este Código Postal?")) return;
        try {
            await axios.delete(`${API_URL}/shipping/${cp}`);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.detail || "Error al eliminar CP");
        }
    };

    const handleOpenCpModal = (item = null) => {
        if (item) {
            setEditingCp(item.cp);
            setCpForm({
                cp: item.cp,
                colonia: item.colonia,
                municipio: item.municipio,
                zona: item.zona
            });
        } else {
            setEditingCp(null);
            setCpForm({ cp: '', colonia: '', municipio: '', zona: zones.length > 0 ? zones[0].name : '' });
        }
        setShowCpModal(true);
    };

    const handleCloseCpModal = () => {
        setShowCpModal(false);
        setEditingCp(null);
        setCpForm({ cp: '', colonia: '', municipio: '', zona: '' });
    };

    // --- Zone Handlers ---
    const handleSaveZone = async (e) => {
        e.preventDefault();
        try {
            if (editingZone) {
                await axios.put(`${API_URL}/shipping/zones/${editingZone}`, {
                    name: zoneForm.name,
                    costo: parseFloat(zoneForm.costo)
                });
            } else {
                await axios.post(`${API_URL}/shipping/zones`, {
                    name: zoneForm.name,
                    costo: parseFloat(zoneForm.costo)
                });
            }
            fetchData();
            handleCloseZoneModal();
        } catch (error) {
            alert(error.response?.data?.detail || "Error al guardar Zona");
        }
    };

    const handleDeleteZone = async (name) => {
        if (!window.confirm(`¿Seguro que deseas eliminar la Zona ${name}?`)) return;
        try {
            await axios.delete(`${API_URL}/shipping/zones/${name}`);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.detail || "Error al eliminar Zona");
        }
    };

    const handleOpenZoneModal = (item = null) => {
        if (item) {
            setEditingZone(item.name);
            setZoneForm({ name: item.name, costo: item.costo });
        } else {
            setEditingZone(null);
            setZoneForm({ name: '', costo: 0 });
        }
        setShowZoneModal(true);
    };

    const handleCloseZoneModal = () => {
        setShowZoneModal(false);
        setEditingZone(null);
        setZoneForm({ name: '', costo: 0 });
    };


    const filteredCosts = costs.filter(c =>
        c.cp.includes(searchTerm) ||
        c.colonia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.zona.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredZones = zones.filter(z =>
        z.name.toLowerCase().includes(searchTerm.toLowerCase())
    );


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <Truck className="text-blue-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Catálogo de Envíos</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                            Administra Zonas y Códigos Postales
                        </p>
                    </div>
                </div>

                <div className="flex space-x-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-sm text-white focus:outline-none focus:border-premium-gold transition-all"
                        />
                    </div>
                    {activeTab === 'cps' ? (
                        <button
                            onClick={() => handleOpenCpModal()}
                            className="bg-premium-gold hover:bg-yellow-400 text-black px-6 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition-all shrink-0"
                        >
                            <Plus size={16} /> Nuevo CP
                        </button>
                    ) : (
                        <button
                            onClick={() => handleOpenZoneModal()}
                            className="bg-purple-500 hover:bg-purple-400 text-white px-6 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition-all shrink-0"
                        >
                            <Plus size={16} /> Nueva Zona
                        </button>
                    )}
                </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex space-x-4 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('cps')}
                    className={`px-4 py-2 font-black text-sm uppercase tracking-widest transition-colors flex items-center gap-2 ${activeTab === 'cps' ? 'text-premium-gold border-b-2 border-premium-gold' : 'text-slate-500 hover:text-white'}`}
                >
                    <MapPin size={18} /> Códigos Postales
                </button>
                <button
                    onClick={() => setActiveTab('zonas')}
                    className={`px-4 py-2 font-black text-sm uppercase tracking-widest transition-colors flex items-center gap-2 ${activeTab === 'zonas' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-white'}`}
                >
                    <Truck size={18} /> Zonas y Precios
                </button>
            </div>

            <div className="bg-premium-slate border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="p-10 text-center text-slate-500">Cargando catálogo...</div>
                ) : activeTab === 'cps' ? (
                    // --- CPs TABLE ---
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 bg-premium-slate z-10">
                                <tr className="text-[10px] uppercase font-black tracking-widest text-slate-400 bg-white/[0.02]">
                                    <th className="p-4 border-b border-white/5">Código Postal</th>
                                    <th className="p-4 border-b border-white/5">Colonia</th>
                                    <th className="p-4 border-b border-white/5">Zona Asignada</th>
                                    <th className="p-4 border-b border-white/5 text-right w-32">Costo ($)</th>
                                    <th className="p-4 border-b border-white/5 text-center w-24">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredCosts.map(item => (
                                    <tr key={item.cp} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4">
                                            <span className="font-mono text-white font-bold bg-white/5 px-2 py-1 rounded">
                                                {item.cp}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-white font-medium text-xs leading-relaxed">{item.colonia}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded text-xs">
                                                Zona {item.zona}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-mono text-premium-gold font-black">
                                                ${parseFloat(item.costo).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenCpModal(item)} className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteCp(item.cp)} className="p-2 text-slate-400 hover:text-red-400 bg-white/5 hover:bg-red-400/10 rounded-lg transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCosts.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="text-center p-10 text-slate-500 italic">No se encontraron CPs</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    // --- ZONES TABLE ---
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 bg-premium-slate z-10">
                                <tr className="text-[10px] uppercase font-black tracking-widest text-slate-400 bg-white/[0.02]">
                                    <th className="p-4 border-b border-white/5">Nombre de la Zona</th>
                                    <th className="p-4 border-b border-white/5 text-right w-32">Costo Vigente ($)</th>
                                    <th className="p-4 border-b border-white/5 text-center w-24">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredZones.map(item => (
                                    <tr key={item.name} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4">
                                            <span className="font-bold text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-lg text-sm">
                                                Zona {item.name}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-mono text-premium-gold font-black text-lg">
                                                ${parseFloat(item.costo).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenZoneModal(item)} className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteZone(item.name)} className="p-2 text-slate-400 hover:text-red-400 bg-white/5 hover:bg-red-400/10 rounded-lg transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredZones.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center p-10 text-slate-500 italic">No se encontraron Zonas</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CP Modal */}
            {showCpModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={handleCloseCpModal}></div>
                    <div className="bg-premium-slate border border-white/10 rounded-[2rem] p-8 max-w-lg w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <button onClick={handleCloseCpModal} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                            <X size={24} />
                        </button>

                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-6 flex gap-2 items-center">
                            <MapPin className="text-premium-gold" />
                            {editingCp ? `Editar CP: ${editingCp}` : 'Nuevo Código Postal'}
                        </h3>

                        <form onSubmit={handleSaveCp} className="space-y-4">
                            {!editingCp && (
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2 mb-1 block">Código Postal</label>
                                    <input
                                        type="text"
                                        required
                                        value={cpForm.cp}
                                        onChange={e => setCpForm({ ...cpForm, cp: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono focus:border-premium-gold"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2 mb-1 block">Colonias (Separadas por coma)</label>
                                <textarea
                                    required
                                    value={cpForm.colonia}
                                    onChange={e => setCpForm({ ...cpForm, colonia: e.target.value })}
                                    rows="3"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-premium-gold text-sm"
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2 mb-1 block">Municipio</label>
                                    <input
                                        type="text"
                                        value={cpForm.municipio}
                                        onChange={e => setCpForm({ ...cpForm, municipio: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-premium-gold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2 mb-1 block">Zona Asignada</label>
                                    <select
                                        required
                                        value={cpForm.zona}
                                        onChange={e => setCpForm({ ...cpForm, zona: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-premium-gold"
                                    >
                                        <option value="" disabled>Selecciona una zona</option>
                                        {zones.map(z => (
                                            <option key={z.name} value={z.name}>
                                                Zona {z.name} (${parseFloat(z.costo).toLocaleString()})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="w-full mt-6 bg-premium-gold hover:bg-yellow-400 text-black py-4 rounded-xl flex items-center justify-center gap-2 font-black uppercase text-sm tracking-widest transition-all">
                                <CheckCircle2 size={18} />
                                {editingCp ? "Guardar Cambios" : "Crear CP"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Zone Modal */}
            {showZoneModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={handleCloseZoneModal}></div>
                    <div className="bg-premium-slate border border-white/10 rounded-[2rem] p-8 max-w-sm w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <button onClick={handleCloseZoneModal} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                            <X size={24} />
                        </button>

                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-6 flex gap-2 items-center">
                            <Truck className="text-purple-400" />
                            {editingZone ? `Editar Zona` : 'Nueva Zona'}
                        </h3>

                        <form onSubmit={handleSaveZone} className="space-y-4">
                            {!editingZone && (
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2 mb-1 block">Nombre/Identificador de Zona</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej: 1, 2, Periferia..."
                                        value={zoneForm.name}
                                        onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-bold focus:border-purple-400"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2 mb-1 block">Costo Base de Envío ($)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold">$</span>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={zoneForm.costo}
                                        onChange={e => setZoneForm({ ...zoneForm, costo: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-8 text-white focus:border-purple-400 font-mono text-xl font-bold"
                                    />
                                </div>
                                {editingZone && (
                                    <p className="text-[10px] text-slate-500 mt-2 ml-2 leading-tight">
                                        Modificar el costo aquí actualizará <b>automáticamente</b> el precio
                                        de entrega de todos los Códigos Postales asignados a la Zona {editingZone}.
                                    </p>
                                )}
                            </div>

                            <button type="submit" className="w-full mt-6 bg-purple-500 hover:bg-purple-400 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-black uppercase text-sm tracking-widest transition-all">
                                <CheckCircle2 size={18} />
                                {editingZone ? "Actualizar Tarifa" : "Crear Zona"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default ShippingCostsAdmin;

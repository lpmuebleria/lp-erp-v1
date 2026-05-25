import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Users, Target, BarChart3, Plus, Search, Filter, Loader2, Edit, Trash2, X, Save, 
    AlertCircle, CheckCircle, HelpCircle, Phone, Calendar, User, ShoppingBag, 
    TrendingUp, MessageCircle, DollarSign, ArrowUpRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

const ORIGENES = ['Facebook', 'Tiktok', 'Instagram', 'WhatsApp', 'Grupos de WhatsApp', 'Otro'];
const PRODUCTOS = ['Salas 3,2,1', 'Salas esquineras', 'Sofas', 'Comedores', 'Otro'];
const ESTATUSES = ['Primer Contacto', 'Cotizado', 'Quedó de regresar', 'Seguimiento Activo', 'Cerrado - Vendido', 'Cerrado - Perdido'];
const OBJECIONES = ['Precio', 'Medidas/Espacio', 'Color/Tela', 'Lo va a pensar/Consultar con pareja', 'Tiempo de entrega', 'Otro'];

const TIPOS_CAMPANA = ['Facebook', 'Instagram', 'Tik Tok', 'WhatsApp', 'Google', 'Exhibición', 'Escuela', 'Empresas', 'Exhibición otra ciudad', 'Otro'];
const ENFOQUES_CAMPANA = ['Salas 3,2,1', 'Salas esquineras', 'Sofas', 'Comedores', 'Otro'];

export default function CRM() {
    const [activeSubTab, setActiveSubTab] = useState('prospectos'); // 'prospectos', 'campanas', 'stats'

    const [prospects, setProspects] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Search and filter states
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Modal forms states
    const [prospectModal, setProspectModal] = useState({ isOpen: false, editMode: false, data: null });
    const [campaignModal, setCampaignModal] = useState({ isOpen: false, editMode: false, data: null });
    const [saving, setSaving] = useState(false);

    // Form inputs state
    const [prospectForm, setProspectForm] = useState({
        nombre_cliente: '', telefono: 'Anónimo', origen: 'Facebook', origen_otro: '',
        producto_interes: 'Salas 3,2,1', producto_interes_otro: '',
        estatus: 'Primer Contacto', objecion_principal: '', objecion_otro: '',
        notas_vendedora: '', campana_id: '', monto_venta: ''
    });

    const [campaignForm, setCampaignForm] = useState({
        nombre_campana: '', responsable: '', tipo_campana: 'Facebook', tipo_campana_otro: '',
        enfoque: 'Salas 3,2,1', enfoque_otro: '', monto_invertido: 0, interacciones_obtenidas: 0
    });

    const auth = JSON.parse(localStorage.getItem('lp_erp_auth')) || {};

    useEffect(() => {
        loadData();
    }, [activeSubTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeSubTab === 'prospectos') {
                const [pRes, cRes] = await Promise.all([
                    axios.get(`${API_URL}/crm/prospectos`),
                    axios.get(`${API_URL}/crm/campanas?active_only=true`)
                ]);
                setProspects(pRes.data);
                setCampaigns(cRes.data);
            } else if (activeSubTab === 'campanas') {
                const evalRes = await axios.get(`${API_URL}/crm/campanas/evaluacion`);
                setEvaluations(evalRes.data);
            } else if (activeSubTab === 'stats') {
                const statsRes = await axios.get(`${API_URL}/crm/stats`);
                setStats(statsRes.data);
            }
        } catch (err) {
            console.error("Error loading CRM data:", err);
            toast.error("Error al cargar datos del servidor");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        try {
            const res = await axios.get(`${API_URL}/crm/prospectos`, {
                params: {
                    estatus: statusFilter || undefined,
                    search: search.trim() || undefined
                }
            });
            setProspects(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (activeSubTab === 'prospectos') {
            const delayDebounceFn = setTimeout(() => {
                handleSearch();
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [search, statusFilter]);

    // Prospect Form Submission
    const handleSaveProspect = async (e) => {
        e.preventDefault();
        
        // Frontend validations
        if (!prospectForm.nombre_cliente.trim()) {
            toast.error("El nombre del cliente es obligatorio");
            return;
        }
        if (prospectForm.origen === 'Otro' && !prospectForm.origen_otro.trim()) {
            toast.error("Por favor especifica de dónde te encontró el cliente");
            return;
        }
        if (prospectForm.producto_interes === 'Otro' && !prospectForm.producto_interes_otro.trim()) {
            toast.error("Por favor especifica el producto de interés");
            return;
        }
        if (prospectForm.estatus === 'Cerrado - Perdido') {
            if (!prospectForm.objecion_principal) {
                toast.error("Debes seleccionar la objeción principal");
                return;
            }
            if (prospectForm.objecion_principal === 'Otro' && !prospectForm.objecion_otro.trim()) {
                toast.error("Por favor especifica el motivo de pérdida");
                return;
            }
        }
        if (prospectForm.estatus === 'Cerrado - Vendido') {
            if (prospectForm.monto_venta === '' || parseFloat(prospectForm.monto_venta) < 0) {
                toast.error("Debes ingresar un monto de venta válido");
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                ...prospectForm,
                campana_id: prospectForm.campana_id ? parseInt(prospectForm.campana_id) : null,
                origen_otro: prospectForm.origen === 'Otro' ? (prospectForm.origen_otro || null) : null,
                producto_interes_otro: prospectForm.producto_interes === 'Otro' ? (prospectForm.producto_interes_otro || null) : null,
                objecion_principal: prospectForm.estatus === 'Cerrado - Perdido' ? (prospectForm.objecion_principal || null) : null,
                objecion_otro: (prospectForm.estatus === 'Cerrado - Perdido' && prospectForm.objecion_principal === 'Otro') ? (prospectForm.objecion_otro || null) : null,
                monto_venta: prospectForm.estatus === 'Cerrado - Vendido' && prospectForm.monto_venta !== '' ? parseFloat(prospectForm.monto_venta) : null,
                telefono: prospectForm.telefono.trim() || 'Anónimo'
            };

            if (prospectModal.editMode) {
                await axios.put(`${API_URL}/crm/prospectos/${prospectModal.data.id_prospecto}`, payload);
                toast.success("Prospecto actualizado correctamente");
            } else {
                await axios.post(`${API_URL}/crm/prospectos`, payload);
                toast.success("Prospecto registrado correctamente");
            }
            setProspectModal({ isOpen: false, editMode: false, data: null });
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Error al guardar prospecto");
        } finally {
            setSaving(false);
        }
    };

    // Campaign Form Submission
    const handleSaveCampaign = async (e) => {
        e.preventDefault();
        if (!campaignForm.nombre_campana.trim() || !campaignForm.responsable.trim()) {
            toast.error("El nombre y el responsable son obligatorios");
            return;
        }
        if (campaignForm.tipo_campana === 'Otro' && !campaignForm.tipo_campana_otro.trim()) {
            toast.error("Especifica el tipo de campaña");
            return;
        }
        if (campaignForm.enfoque === 'Otro' && !campaignForm.enfoque_otro.trim()) {
            toast.error("Especifica el enfoque de la campaña");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...campaignForm,
                tipo_campana_otro: campaignForm.tipo_campana === 'Otro' ? (campaignForm.tipo_campana_otro || null) : null,
                enfoque_otro: campaignForm.enfoque === 'Otro' ? (campaignForm.enfoque_otro || null) : null,
                monto_invertido: parseFloat(campaignForm.monto_invertido) || 0,
                interacciones_obtenidas: parseInt(campaignForm.interacciones_obtenidas) || 0
            };

            if (campaignModal.editMode) {
                await axios.put(`${API_URL}/crm/campanas/${campaignModal.data.id_campana}`, payload);
                toast.success("Campaña actualizada");
            } else {
                await axios.post(`${API_URL}/crm/campanas`, payload);
                toast.success("Campaña registrada");
            }
            setCampaignModal({ isOpen: false, editMode: false, data: null });
            loadData();
        } catch (err) {
            toast.error("Error al guardar campaña");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProspect = async (id) => {
        if (!confirm("¿Seguro que deseas eliminar este prospecto del CRM?")) return;
        try {
            await axios.delete(`${API_URL}/crm/prospectos/${id}`);
            toast.success("Prospecto eliminado");
            loadData();
        } catch (err) {
            toast.error("Error al eliminar");
        }
    };

    const handleDeleteCampaign = async (id) => {
        if (!confirm("¿Seguro que deseas desactivar esta campaña?")) return;
        try {
            await axios.delete(`${API_URL}/crm/campanas/${id}`);
            toast.success("Campaña desactivada");
            loadData();
        } catch (err) {
            toast.error("Error al desactivar");
        }
    };

    const openProspectModal = (p = null) => {
        if (p) {
            setProspectForm({
                nombre_cliente: p.nombre_cliente,
                telefono: p.telefono,
                origen: p.origen,
                origen_otro: p.origen_otro || '',
                producto_interes: p.producto_interes,
                producto_interes_otro: p.producto_interes_otro || '',
                estatus: p.estatus,
                objecion_principal: p.objecion_principal || '',
                objecion_otro: p.objecion_otro || '',
                notas_vendedora: p.notas_vendedora || '',
                campana_id: p.campana_id || '',
                monto_venta: p.monto_venta !== null ? p.monto_venta : ''
            });
            setProspectModal({ isOpen: true, editMode: true, data: p });
        } else {
            setProspectForm({
                nombre_cliente: '',
                telefono: 'Anónimo',
                origen: 'Facebook',
                origen_otro: '',
                producto_interes: 'Salas 3,2,1',
                producto_interes_otro: '',
                estatus: 'Primer Contacto',
                objecion_principal: '',
                objecion_otro: '',
                notas_vendedora: '',
                campana_id: '',
                monto_venta: ''
            });
            setProspectModal({ isOpen: true, editMode: false, data: null });
        }
    };

    const openCampaignModal = (c = null) => {
        if (c) {
            setCampaignForm({
                nombre_campana: c.nombre_campana,
                responsable: c.responsable,
                tipo_campana: c.tipo_campana,
                tipo_campana_otro: c.tipo_campana_otro || '',
                enfoque: c.enfoque,
                enfoque_otro: c.enfoque_otro || '',
                monto_invertido: c.monto_invertido,
                interacciones_obtenidas: c.interacciones_obtenidas
            });
            setCampaignModal({ isOpen: true, editMode: true, data: c });
        } else {
            setCampaignForm({
                nombre_campana: '',
                responsable: '',
                tipo_campana: 'Facebook',
                tipo_campana_otro: '',
                enfoque: 'Salas 3,2,1',
                enfoque_otro: '',
                monto_invertido: 0,
                interacciones_obtenidas: 0
            });
            setCampaignModal({ isOpen: true, editMode: false, data: null });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Primer Contacto': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
            case 'Cotizado': return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
            case 'Quedó de regresar': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
            case 'Seguimiento Activo': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
            case 'Cerrado - Vendido': return 'bg-green-500/25 text-green-400 border border-green-500/40';
            case 'Cerrado - Perdido': return 'bg-red-500/20 text-red-400 border border-red-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Tabs */}
            <div className="flex justify-between items-center bg-premium-slate/40 border border-white/5 rounded-[2rem] p-3 backdrop-blur-md">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveSubTab('prospectos')}
                        className={`flex items-center space-x-2 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeSubTab === 'prospectos' 
                            ? 'bg-premium-gold text-black shadow-lg shadow-premium-gold/15' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Users size={16} />
                        <span>Prospectos</span>
                    </button>
                    <button
                        onClick={() => setActiveSubTab('campanas')}
                        className={`flex items-center space-x-2 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeSubTab === 'campanas' 
                            ? 'bg-premium-gold text-black shadow-lg shadow-premium-gold/15' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Target size={16} />
                        <span>Campañas y ROI</span>
                    </button>
                    <button
                        onClick={() => setActiveSubTab('stats')}
                        className={`flex items-center space-x-2 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeSubTab === 'stats' 
                            ? 'bg-premium-gold text-black shadow-lg shadow-premium-gold/15' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <BarChart3 size={16} />
                        <span>Analítica</span>
                    </button>
                </div>

                <div className="px-6">
                    {activeSubTab === 'prospectos' && (
                        <button
                            onClick={() => openProspectModal()}
                            className="bg-premium-gold hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 shadow-md shadow-premium-gold/10"
                        >
                            <Plus size={14} strokeWidth={3} />
                            <span>Registrar Prospecto</span>
                        </button>
                    )}
                    {activeSubTab === 'campanas' && (
                        <button
                            onClick={() => openCampaignModal()}
                            className="bg-premium-gold hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 shadow-md shadow-premium-gold/10"
                        >
                            <Plus size={14} strokeWidth={3} />
                            <span>Crear Campaña</span>
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="h-96 flex items-center justify-center">
                    <Loader2 className="animate-spin text-premium-gold" size={48} />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* SUBTAB: PROSPECTOS */}
                    {activeSubTab === 'prospectos' && (
                        <div className="space-y-6">
                            {/* Filter Bar */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-premium-slate/20 p-4 border border-white/5 rounded-2xl">
                                <div className="md:col-span-2 relative">
                                    <Search className="absolute left-4 top-3.5 text-slate-500" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar prospecto por nombre..." 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white text-sm outline-none focus:border-premium-gold/50"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Filter className="text-slate-500 shrink-0" size={18} />
                                    <select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value)}
                                        className="w-full bg-[#1e2330] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-premium-gold outline-none"
                                    >
                                        <option value="">Todos los Estatus</option>
                                        {ESTATUSES.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center justify-end text-xs text-slate-500 font-bold uppercase tracking-wider pr-2">
                                    Leads Encontrados: {prospects.length}
                                </div>
                            </div>

                            {/* Prospects Grid */}
                            {prospects.length === 0 ? (
                                <div className="bg-premium-slate/20 border border-white/5 rounded-3xl p-16 text-center text-slate-500">
                                    <Users className="mx-auto mb-4 opacity-10" size={48} />
                                    <p className="text-sm font-bold">No se encontraron prospectos registrados con los filtros actuales.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {prospects.map(p => (
                                        <div key={p.id_prospecto} className="bg-premium-slate/30 border border-white/5 hover:border-premium-gold/20 p-6 rounded-3xl flex flex-col justify-between transition-all duration-300 relative group shadow-lg">
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="text-lg font-black text-white leading-tight uppercase tracking-tight">{p.nombre_cliente}</h3>
                                                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mt-1">
                                                            Atendió: <span className="text-slate-400">{p.vendedor}</span>
                                                        </span>
                                                    </div>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${getStatusColor(p.estatus)}`}>
                                                        {p.estatus}
                                                    </span>
                                                </div>

                                                <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><Phone size={12} /> Teléfono:</span>
                                                        <span className="text-white font-mono flex items-center gap-2">
                                                            {p.telefono}
                                                            {p.telefono !== 'Anónimo' && (
                                                                <a 
                                                                    href={`https://wa.me/52${p.telefono.replace(/\s+/g, '')}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    className="text-green-400 hover:text-green-300"
                                                                >
                                                                    <MessageCircle size={14} />
                                                                </a>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><User size={12} /> Origen:</span>
                                                        <span className="text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                                                            {p.origen === 'Otro' ? p.origen_otro : p.origen}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><ShoppingBag size={12} /> Interés:</span>
                                                        <span className="text-premium-gold font-bold">
                                                            {p.producto_interes === 'Otro' ? p.producto_interes_otro : p.producto_interes}
                                                        </span>
                                                    </div>
                                                    {p.nombre_campana && (
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><Target size={12} /> Campaña:</span>
                                                            <span className="text-blue-400 text-[10px] uppercase font-bold truncate max-w-xs">{p.nombre_campana}</span>
                                                        </div>
                                                    )}
                                                    {p.estatus === 'Cerrado - Perdido' && p.objecion_principal && (
                                                        <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl mt-3">
                                                            <span className="text-[9px] text-red-400 font-black uppercase tracking-widest block mb-1">Motivo Pérdida</span>
                                                            <span className="text-xs text-red-300 font-semibold">
                                                                {p.objecion_principal === 'Otro' ? p.objecion_otro : p.objecion_principal}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {p.estatus === 'Cerrado - Vendido' && p.monto_venta !== null && (
                                                        <div className="bg-green-500/5 border border-green-500/10 p-3 rounded-xl mt-3 flex justify-between items-center">
                                                            <span className="text-[9px] text-green-400 font-black uppercase tracking-widest">Monto Venta:</span>
                                                            <span className="text-sm font-black font-mono text-green-300">${p.monto_venta.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {p.notas_vendedora && (
                                                    <div className="mt-4 bg-black/20 p-3.5 rounded-xl border border-white/5 text-xs text-slate-400 italic">
                                                        "{p.notas_vendedora}"
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                                                <button
                                                    onClick={() => openProspectModal(p)}
                                                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-all"
                                                >
                                                    <Edit size={12} /> Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProspect(p.id_prospecto)}
                                                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-all"
                                                >
                                                    <Trash2 size={12} /> Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SUBTAB: CAMPAÑAS Y ROI */}
                    {activeSubTab === 'campanas' && (
                        <div className="space-y-6">
                            <div className="overflow-x-auto w-full custom-scrollbar rounded-2xl border border-white/5 bg-premium-slate/20">
                                <table className="w-full text-left border-collapse min-w-[900px] text-xs">
                                    <thead>
                                        <tr className="bg-black/40 text-slate-500 uppercase tracking-widest font-black text-[9px] border-b border-white/10">
                                            <th className="p-4">Campaña</th>
                                            <th className="p-4">Responsable</th>
                                            <th className="p-4">Tipo / Enfoque</th>
                                            <th className="p-4 text-right">Inversión</th>
                                            <th className="p-4 text-right">Interacciones</th>
                                            <th className="p-4 text-right">Leads Reales</th>
                                            <th className="p-4 text-right">Ventas</th>
                                            <th className="p-4 text-right">Monto Vtas</th>
                                            <th className="p-4 text-right">Costo x Inter.</th>
                                            <th className="p-4 text-right">Costo x Lead</th>
                                            <th className="p-4 text-right">CAC</th>
                                            <th className="p-4 text-right">ROI</th>
                                            <th className="p-4 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {evaluations.length === 0 ? (
                                            <tr>
                                                <td colSpan="13" className="p-16 text-center text-slate-500 font-bold">
                                                    No hay campañas publicitarias registradas aún.
                                                </td>
                                            </tr>
                                        ) : (
                                            evaluations.map(c => {
                                                const roiColor = c.roi > 0 ? 'text-green-400' : c.roi < 0 ? 'text-red-400' : 'text-slate-400';
                                                return (
                                                    <tr key={c.id_campana} className="hover:bg-white/[0.02] border-b border-white/5 transition-colors">
                                                        <td className="p-4 font-bold text-white uppercase tracking-tight">{c.nombre_campana}</td>
                                                        <td className="p-4 text-slate-300 font-bold uppercase">{c.responsable}</td>
                                                        <td className="p-4 text-slate-400">
                                                            <div className="font-bold text-white text-[10px] uppercase">
                                                                {c.tipo_campana === 'Otro' ? c.tipo_campana_otro : c.tipo_campana}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 font-medium">
                                                                {c.enfoque === 'Otro' ? c.enfoque_otro : c.enfoque}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-right font-mono font-bold">${c.monto_invertido.toLocaleString()}</td>
                                                        <td className="p-4 text-right font-mono">{c.interacciones_obtenidas}</td>
                                                        <td className="p-4 text-right font-mono text-blue-400 font-bold">{c.prospectos_reales}</td>
                                                        <td className="p-4 text-right font-mono text-green-400 font-bold">{c.numero_ventas}</td>
                                                        <td className="p-4 text-right font-mono text-green-400 font-bold">${c.monto_ventas.toLocaleString()}</td>
                                                        <td className="p-4 text-right font-mono text-slate-400">${c.costo_por_interaccion.toLocaleString()}</td>
                                                        <td className="p-4 text-right font-mono text-slate-400">${c.costo_por_prospecto.toLocaleString()}</td>
                                                        <td className="p-4 text-right font-mono text-slate-400">${c.costo_por_adquisicion.toLocaleString()}</td>
                                                        <td className={`p-4 text-right font-mono font-black ${roiColor}`}>{c.roi}%</td>
                                                        <td className="p-4 text-center">
                                                            <div className="flex gap-2 justify-center">
                                                                <button 
                                                                    onClick={() => openCampaignModal(c)}
                                                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
                                                                    title="Editar"
                                                                >
                                                                    <Edit size={12} />
                                                                </button>
                                                                {auth.is_superadmin && (
                                                                    <button 
                                                                        onClick={() => handleDeleteCampaign(c.id_campana)}
                                                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                                                        title="Desactivar"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SUBTAB: ANALITICA */}
                    {activeSubTab === 'stats' && stats && (
                        <div className="space-y-10">
                            {/* Metrics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-premium-slate/40 border border-white/5 p-8 rounded-3xl relative overflow-hidden shadow-xl">
                                    <div className="absolute top-6 right-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                        <Users className="text-blue-400" size={20} />
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Leads Registrados</p>
                                    <p className="text-3xl font-black text-white font-mono">{stats.total_prospects}</p>
                                </div>
                                <div className="bg-premium-slate/40 border border-white/5 p-8 rounded-3xl relative overflow-hidden shadow-xl">
                                    <div className="absolute top-6 right-6 p-3 bg-green-500/10 border border-green-500/20 rounded-2xl">
                                        <CheckCircle className="text-green-400" size={20} />
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Ventas Cerradas</p>
                                    <p className="text-3xl font-black text-white font-mono text-green-400">{stats.total_ventas}</p>
                                </div>
                                <div className="bg-premium-slate/40 border border-white/5 p-8 rounded-3xl relative overflow-hidden shadow-xl">
                                    <div className="absolute top-6 right-6 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                        <AlertCircle className="text-red-400" size={20} />
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Prospectos Perdidos</p>
                                    <p className="text-3xl font-black text-white font-mono text-red-400">{stats.total_perdidos}</p>
                                </div>
                                <div className="bg-premium-slate/40 border border-white/5 p-8 rounded-3xl relative overflow-hidden shadow-xl">
                                    <div className="absolute top-6 right-6 p-3 bg-premium-gold/10 border border-premium-gold/20 rounded-2xl">
                                        <TrendingUp className="text-premium-gold" size={20} />
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Tasa de Conversión</p>
                                    <p className="text-3xl font-black text-white font-mono text-premium-gold">{stats.conversion_rate}%</p>
                                </div>
                            </div>

                            {/* Charts Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Origins Breakdown */}
                                <div className="bg-premium-slate/40 border border-white/5 rounded-3xl p-8 shadow-xl">
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6">Orígenes de Prospectos</h3>
                                    <div className="space-y-4">
                                        {stats.origin_dist.length === 0 ? (
                                            <p className="text-slate-500 text-sm">Sin datos registrados</p>
                                        ) : (
                                            stats.origin_dist.map(o => {
                                                const label = o.origen === 'Otro' ? o.origen_otro : o.origen;
                                                const pct = stats.total_prospects > 0 ? (o.cantidad / stats.total_prospects) * 100 : 0;
                                                return (
                                                    <div key={label} className="space-y-2">
                                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                                            <span className="text-slate-300">{label}</span>
                                                            <span className="text-slate-500">{o.cantidad} leads ({pct.toFixed(0)}%)</span>
                                                        </div>
                                                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                            <div className="h-full bg-gradient-to-r from-premium-gold to-yellow-500 rounded-full" style={{ width: `${pct}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Objections Breakdown */}
                                <div className="bg-premium-slate/40 border border-white/5 rounded-3xl p-8 shadow-xl">
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6 text-red-400">Auditoría: Motivos de Pérdida (Objeciones)</h3>
                                    <div className="space-y-4">
                                        {stats.objections_dist.length === 0 ? (
                                            <p className="text-slate-500 text-sm">Felicidades, no tienes prospectos marcados como perdidos o faltan datos.</p>
                                        ) : (
                                            stats.objections_dist.map(o => {
                                                const label = o.objecion_principal === 'Otro' ? o.objecion_otro : o.objecion_principal;
                                                const pct = stats.total_perdidos > 0 ? (o.cantidad / stats.total_perdidos) * 100 : 0;
                                                return (
                                                    <div key={label} className="space-y-2">
                                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                                            <span className="text-slate-300">{label}</span>
                                                            <span className="text-slate-500">{o.cantidad} objeciones ({pct.toFixed(0)}%)</span>
                                                        </div>
                                                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                            <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" style={{ width: `${pct}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: PROSPECTO (Alta y Modificación) */}
            {prospectModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => !saving && setProspectModal({ isOpen: false, editMode: false, data: null })}></div>
                    <div className="bg-premium-slate border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button 
                            className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
                            onClick={() => setProspectModal({ isOpen: false, editMode: false, data: null })}
                        >
                            <X size={20} />
                        </button>
                        
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-6">
                            {prospectModal.editMode ? "Actualizar Prospecto" : "Nuevo Prospecto"}
                        </h3>

                        <form onSubmit={handleSaveProspect} className="space-y-4">
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Nombre Completo del Cliente *</label>
                                <input 
                                    required 
                                    value={prospectForm.nombre_cliente} 
                                    onChange={e => setProspectForm({ ...prospectForm, nombre_cliente: e.target.value })} 
                                    type="text" 
                                    placeholder="Ej: Sofía Martínez" 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-premium-gold"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Teléfono</label>
                                    <div className="relative flex items-center">
                                        <input 
                                            value={prospectForm.telefono} 
                                            onChange={e => setProspectForm({ ...prospectForm, telefono: e.target.value })} 
                                            type="text" 
                                            placeholder="10 dígitos" 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pr-20 text-white text-sm outline-none focus:border-premium-gold font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setProspectForm({ ...prospectForm, telefono: 'Anónimo' })}
                                            className="absolute right-2 px-2.5 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
                                        >
                                            No dio
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Origen / Cómo Encontró *</label>
                                    <select
                                        value={prospectForm.origen}
                                        onChange={e => setProspectForm({ ...prospectForm, origen: e.target.value })}
                                        className="w-full bg-[#1e2330] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none"
                                    >
                                        {ORIGENES.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Origen manual inputs */}
                            {prospectForm.origen === 'Otro' && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Especifica de dónde nos encontró *</label>
                                    <input 
                                        required 
                                        value={prospectForm.origen_otro} 
                                        onChange={e => setProspectForm({ ...prospectForm, origen_otro: e.target.value })} 
                                        type="text" 
                                        placeholder="Ej: Letrero local, Folleto, Recomendación de vecino" 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-premium-gold"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Producto de Interés *</label>
                                    <select
                                        value={prospectForm.producto_interes}
                                        onChange={e => setProspectForm({ ...prospectForm, producto_interes: e.target.value })}
                                        className="w-full bg-[#1e2330] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none"
                                    >
                                        {PRODUCTOS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Vincular a Campaña Pagada</label>
                                    <select
                                        value={prospectForm.campana_id}
                                        onChange={e => setProspectForm({ ...prospectForm, campana_id: e.target.value })}
                                        className="w-full bg-[#1e2330] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none"
                                    >
                                        <option value="">Ninguna (Orgánico / Paso Local)</option>
                                        {campaigns.map(c => (
                                            <option key={c.id_campana} value={c.id_campana}>{c.nombre_campana} ({c.responsable})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {prospectForm.producto_interes === 'Otro' && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Especifica el Producto de Interés *</label>
                                    <input 
                                        required 
                                        value={prospectForm.producto_interes_otro} 
                                        onChange={e => setProspectForm({ ...prospectForm, producto_interes_otro: e.target.value })} 
                                        type="text" 
                                        placeholder="Ej: Banca tapizada, Cojines a medida" 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-premium-gold"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Estatus / Etapa de Venta *</label>
                                <select
                                    value={prospectForm.estatus}
                                    onChange={e => setProspectForm({ ...prospectForm, estatus: e.target.value })}
                                    className="w-full bg-[#1e2330] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none"
                                >
                                    {ESTATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* AUDIT RULES FIELDS */}
                            {prospectForm.estatus === 'Cerrado - Perdido' && (
                                <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10 space-y-4 animate-in slide-in-from-top-4 duration-300">
                                    <h4 className="text-red-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                        <AlertCircle size={14} /> Auditoría Obligatoria de Pérdida
                                    </h4>
                                    <div>
                                        <label className="text-[10px] text-slate-400 font-bold block mb-1">¿Por qué no compró? (Objeción Principal) *</label>
                                        <select
                                            required
                                            value={prospectForm.objecion_principal}
                                            onChange={e => setProspectForm({ ...prospectForm, objecion_principal: e.target.value })}
                                            className="w-full bg-[#1e2330] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none text-red-200"
                                        >
                                            <option value="">Selecciona una objeción...</option>
                                            {OBJECIONES.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    {prospectForm.objecion_principal === 'Otro' && (
                                        <div>
                                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Especifica la razón detallada *</label>
                                            <input 
                                                required 
                                                value={prospectForm.objecion_otro} 
                                                onChange={e => setProspectForm({ ...prospectForm, objecion_otro: e.target.value })} 
                                                type="text" 
                                                placeholder="Ej: Compró en Coppel, No le autorizaron crédito" 
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-premium-gold"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {prospectForm.estatus === 'Cerrado - Vendido' && (
                                <div className="bg-green-500/5 p-4 rounded-xl border border-green-500/10 space-y-2 animate-in slide-in-from-top-4 duration-300">
                                    <h4 className="text-green-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                        <CheckCircle size={14} /> Registro de Ingreso
                                    </h4>
                                    <div>
                                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Monto de Venta ($) *</label>
                                        <input 
                                            required
                                            value={prospectForm.monto_venta} 
                                            onChange={e => setProspectForm({ ...prospectForm, monto_venta: e.target.value })} 
                                            type="number" 
                                            step="0.01"
                                            min="0"
                                            placeholder="Ingresa el valor total de la venta concretada" 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-premium-gold text-green-300 font-mono font-bold"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Comentarios / Feedback Vendedora</label>
                                <textarea 
                                    value={prospectForm.notas_vendedora} 
                                    onChange={e => setProspectForm({ ...prospectForm, notas_vendedora: e.target.value })} 
                                    placeholder="Detalles sobre las preferencias, qué colores buscaba, si regresará con su pareja..." 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-premium-gold h-20"
                                />
                            </div>

                            <button 
                                disabled={saving} 
                                type="submit" 
                                className="w-full bg-premium-gold hover:bg-yellow-400 text-black py-4 rounded-xl font-black text-sm uppercase tracking-widest mt-6 transition-colors shadow-lg shadow-premium-gold/20 flex justify-center items-center"
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : (prospectModal.editMode ? "Actualizar" : "Registrar Prospecto")}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CAMPAÑA (Alta y Modificación) */}
            {campaignModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => !saving && setCampaignModal({ isOpen: false, editMode: false, data: null })}></div>
                    <div className="bg-premium-slate border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button 
                            className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
                            onClick={() => setCampaignModal({ isOpen: false, editMode: false, data: null })}
                        >
                            <X size={20} />
                        </button>
                        
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-6">
                            {campaignModal.editMode ? "Editar Campaña" : "Crear Nueva Campaña"}
                        </h3>

                        <form onSubmit={handleSaveCampaign} className="space-y-4">
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Nombre de la Campaña *</label>
                                <input 
                                    required 
                                    value={campaignForm.nombre_campana} 
                                    onChange={e => setCampaignForm({ ...campaignForm, nombre_campana: e.target.value })} 
                                    type="text" 
                                    placeholder="Ej: Campaña Mayo - Comedores" 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-premium-gold"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Empleado Responsable *</label>
                                    <input 
                                        required 
                                        value={campaignForm.responsable} 
                                        onChange={e => setCampaignForm({ ...campaignForm, responsable: e.target.value })} 
                                        type="text" 
                                        placeholder="Nombre de quien maneja la campaña" 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-premium-gold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Tipo de Campaña *</label>
                                    <select
                                        value={campaignForm.tipo_campana}
                                        onChange={e => setCampaignForm({ ...campaignForm, tipo_campana: e.target.value })}
                                        className="w-full bg-[#1e2330] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none"
                                    >
                                        {TIPOS_CAMPANA.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            {campaignForm.tipo_campana === 'Otro' && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Especifica el Tipo de Campaña *</label>
                                    <input 
                                        required 
                                        value={campaignForm.tipo_campana_otro} 
                                        onChange={e => setCampaignForm({ ...campaignForm, tipo_campana_otro: e.target.value })} 
                                        type="text" 
                                        placeholder="Ej: Folletos físicos" 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-premium-gold"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Enfoque del Producto *</label>
                                <select
                                    value={campaignForm.enfoque}
                                    onChange={e => setCampaignForm({ ...campaignForm, enfoque: e.target.value })}
                                    className="w-full bg-[#1e2330] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none"
                                >
                                    {ENFOQUES_CAMPANA.map(ef => <option key={ef} value={ef}>{ef}</option>)}
                                </select>
                            </div>

                            {campaignForm.enfoque === 'Otro' && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Especifica el Enfoque del Producto *</label>
                                    <input 
                                        required 
                                        value={campaignForm.enfoque_otro} 
                                        onChange={e => setCampaignForm({ ...campaignForm, enfoque_otro: e.target.value })} 
                                        type="text" 
                                        placeholder="Ej: Muebles TV / Recámaras" 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-premium-gold"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Presupuesto / Monto Invertido ($) *</label>
                                    <input 
                                        required 
                                        value={campaignForm.monto_invertido} 
                                        onChange={e => setCampaignForm({ ...campaignForm, monto_invertido: e.target.value })} 
                                        type="number" 
                                        min="0"
                                        step="0.01"
                                        placeholder="Ej: 1500" 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-premium-gold font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Interacciones Totales Obtenidas *</label>
                                    <input 
                                        required 
                                        value={campaignForm.interacciones_obtenidas} 
                                        onChange={e => setCampaignForm({ ...campaignForm, interacciones_obtenidas: e.target.value })} 
                                        type="number" 
                                        min="0"
                                        placeholder="Mensajes/Preguntas chat frío" 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-premium-gold font-mono"
                                    />
                                </div>
                            </div>

                            <button 
                                disabled={saving} 
                                type="submit" 
                                className="w-full bg-premium-gold hover:bg-yellow-400 text-black py-4 rounded-xl font-black text-sm uppercase tracking-widest mt-6 transition-colors shadow-lg shadow-premium-gold/20 flex justify-center items-center"
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : (campaignModal.editMode ? "Actualizar Campaña" : "Crear Campaña")}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

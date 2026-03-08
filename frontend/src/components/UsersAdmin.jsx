import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users as UsersIcon, Shield, Check, X, Plus, Trash2, Loader2, Save, Edit, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

function UsersAdmin() {
    const [activeSubTab, setActiveSubTab] = useState('directorio'); // 'directorio', 'roles', 'permisos'

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    // Form states
    const [newUser, setNewUser] = useState({
        username: '', password: '', role_id: '',
        nombre_completo: '', edad: '', cumpleanos: '', rfc: ''
    });

    const [editUserModal, setEditUserModal] = useState({ isOpen: false, user: null });
    const [editForm, setEditForm] = useState({ password: '', role_id: '', nombre_completo: '', edad: '', cumpleanos: '', rfc: '' });
    const [deletingUser, setDeletingUser] = useState(null);

    const [newRole, setNewRole] = useState({ nombre: '' });

    // Modulos del sistema hardcoded to map against matrix
    const modulos = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'inventory', label: 'Inventario' },
        { id: 'sales', label: 'Ventas de Mostrador' },
        { id: 'orders', label: 'Gestión de Pedidos' },
        { id: 'quotes', label: 'Cotizaciones' },
        { id: 'apartados', label: 'Apartados' },
        { id: 'payments', label: 'Caja y Pagos' },
        { id: 'agenda', label: 'Agenda y Logística' },
        { id: 'settings', label: 'Configuración Avanzada' }
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Using withCredentials if needed but assuming pure endpoints for now as configured
            const [uRes, rRes] = await Promise.all([
                axios.get(`${API_URL}/users`, { withCredentials: true }),
                axios.get(`${API_URL}/roles`, { withCredentials: true })
            ]);
            setUsers(uRes.data);
            setRoles(rRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (!newUser.username?.trim() || !newUser.password?.trim() || !newUser.nombre_completo?.trim() || !newUser.role_id) {
                toast.error("Por favor llena todos los campos obligatorios");
                setSaving(false);
                return;
            }
            await axios.post(`${API_URL}/users`, {
                username: newUser.username,
                password: newUser.password,
                role_id: parseInt(newUser.role_id),
                nombre_completo: newUser.nombre_completo,
                edad: newUser.edad ? parseInt(newUser.edad) : null,
                cumpleanos: newUser.cumpleanos || null,
                rfc: newUser.rfc || null
            }, { withCredentials: true });

            // Reset and refresh
            setNewUser({ username: '', password: '', role_id: '', nombre_completo: '', edad: '', cumpleanos: '', rfc: '' });
            toast.success("Usuario registrado correctamente");
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Error al crear usuario");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (user) => {
        setEditForm({
            password: '', // Leave blank unless they want to change it
            role_id: user.role_id || '',
            nombre_completo: user.nombre_completo || '',
            edad: user.edad || '',
            cumpleanos: user.cumpleanos || '',
            rfc: user.rfc || ''
        });
        setEditUserModal({ isOpen: true, user });
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (!editForm.nombre_completo?.trim()) {
                toast.error("El nombre completo no puede estar vacío");
                setSaving(false);
                return;
            }
            const payload = { ...editForm, role_id: parseInt(editForm.role_id) };
            if (!payload.password) delete payload.password; // Don't send empty password

            await axios.put(`${API_URL}/users/${editUserModal.user.username}`, payload, { withCredentials: true });
            toast.success("Perfil actualizado correctamente");
            setEditUserModal({ isOpen: false, user: null });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Error al actualizar perfil");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (username) => {
        if (!confirm(`ESTÁS A PUNTO DE ELIMINAR A ${username.toUpperCase()}.\n\nEsta acción quitará el acceso al empleado permanentemente. ¿Deseas borrar el perfil?`)) return;
        setDeletingUser(username);
        try {
            await axios.delete(`${API_URL}/users/${username}`, { withCredentials: true });
            toast.success("Usuario eliminado");
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Error al eliminar usuario");
        } finally {
            setDeletingUser(null);
        }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        if (!newRole.nombre?.trim()) {
            toast.error("El nombre del nivel es obligatorio");
            return;
        }
        setSaving(true);
        try {
            await axios.post(`${API_URL}/roles`, {
                nombre: newRole.nombre,
                is_superadmin: false
            }, { withCredentials: true });
            setNewRole({ nombre: '' });
            toast.success("Nivel de acceso creado");
            fetchData();
        } catch (err) {
            toast.error("Error al crear el Nivel de Acceso");
        } finally {
            setSaving(false);
        }
    };

    const togglePermission = async (roleId, modulo, currentVal) => {
        // Find role, ensure it's not superadmin
        const role = roles.find(r => r.id === roleId);
        if (role?.is_superadmin) {
            toast.error("No puedes alterar los permisos del Dueño / SuperAdmin.");
            return;
        }

        // Optimistic UI update
        setRoles(roles.map(r => {
            if (r.id === roleId) {
                const newPerms = [...r.permissions];
                const pIdx = newPerms.findIndex(p => p.modulo === modulo);
                if (pIdx >= 0) {
                    newPerms[pIdx] = { ...newPerms[pIdx], can_view: !currentVal };
                } else {
                    newPerms.push({ modulo, can_view: !currentVal });
                }
                return { ...r, permissions: newPerms };
            }
            return r;
        }));

        // Fire API request silently
        try {
            await axios.put(`${API_URL}/roles/${roleId}/permissions`, {
                permissions: [{ modulo, can_view: !currentVal }]
            }, { withCredentials: true });
        } catch (err) {
            console.error("Error toggling permission", err);
            // Revert on fail if needed...
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-premium-gold" /></div>;

    return (
        <div className="bg-premium-slate/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm lg:col-span-2">

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UsersIcon className="text-premium-gold" size={24} />
                    Personal y Control de Accesos
                </h2>

                {/* Internal Mini-Tabs */}
                <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                    <button
                        onClick={() => setActiveSubTab('directorio')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'directorio' ? 'bg-premium-gold text-black' : 'text-slate-500 hover:text-white'}`}
                    >
                        Directorio
                    </button>
                    <button
                        onClick={() => setActiveSubTab('permisos')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'permisos' ? 'bg-premium-gold text-black' : 'text-slate-500 hover:text-white'}`}
                    >
                        Matriz de Permisos
                    </button>
                </div>
            </div>

            {/* TAB: DIRECTORIO (Alta y listado de empleados) */}
            {activeSubTab === 'directorio' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Add Form */}
                    <div className="md:col-span-1 bg-black/20 p-6 rounded-2xl border border-white/5 h-fit">
                        <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4">Alta de Personal</h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Nombre Completo *</label>
                                <input required value={newUser.nombre_completo} onChange={e => setNewUser({ ...newUser, nombre_completo: e.target.value })} type="text" placeholder="Ej: Juan Pérez" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Nivel de Acceso (Rol) *</label>
                                <select required value={newUser.role_id} onChange={e => setNewUser({ ...newUser, role_id: e.target.value })} className="w-full bg-[#1e2330] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none custom-select">
                                    <option value="">Selecciona un Perfil...</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">ID Acceso *</label>
                                    <input required value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} type="text" placeholder="juan123" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Contraseña *</label>
                                    <input required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} type="password" placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none tracking-widest" />
                                </div>
                            </div>

                            {/* Optional Fields */}
                            <div className="pt-2 border-t border-white/5 mt-4">
                                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-3">Información Fiscal (Opcional)</p>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Edad</label>
                                        <input value={newUser.edad} onChange={e => setNewUser({ ...newUser, edad: e.target.value })} type="number" placeholder="Ej: 28" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Cumpleaños</label>
                                        <input value={newUser.cumpleanos} onChange={e => setNewUser({ ...newUser, cumpleanos: e.target.value })} type="date" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-[10px] font-mono focus:border-premium-gold outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">RFC</label>
                                    <input value={newUser.rfc} onChange={e => setNewUser({ ...newUser, rfc: e.target.value.toUpperCase() })} type="text" placeholder="XAXX010101000" maxLength="13" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm uppercase focus:border-premium-gold outline-none" />
                                </div>
                            </div>

                            <button disabled={saving} type="submit" className="w-full bg-premium-gold text-black py-4 rounded-xl font-black text-sm uppercase tracking-widest mt-6 hover:bg-yellow-400 transition-colors shadow-lg shadow-premium-gold/20 flex justify-center items-center">
                                {saving ? <Loader2 className="animate-spin" size={20} /> : "Registrar Empleado"}
                            </button>
                        </form>
                    </div>

                    {/* Employee List Grid */}
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
                        {users.map(u => (
                            <div key={u.username} className="bg-white/5 border border-white/5 p-5 rounded-2xl flex flex-col justify-between group hover:border-premium-gold/30 transition-all">
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="text-lg font-black text-white leading-tight">{u.nombre_completo || u.username}</h4>
                                        <span className="bg-black/40 text-premium-gold text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest">{u.role_name}</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mb-1"><span className="text-slate-600 w-16 inline-block font-mono">ID:</span> {u.username}</div>
                                    {u.rfc && <div className="text-xs text-slate-400 mb-1"><span className="text-slate-600 w-16 inline-block font-mono">RFC:</span> {u.rfc}</div>}
                                    {u.cumpleanos && <div className="text-xs text-slate-400"><span className="text-slate-600 w-16 inline-block font-mono">DOB:</span> <span className="text-green-400">{u.cumpleanos}</span> {(u.edad && `(${u.edad} años)`)}</div>}
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5 flex gap-2 transition-opacity">
                                    <button
                                        onClick={() => openEditModal(u)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <Edit size={12} /> Editar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(u.username)}
                                        disabled={deletingUser === u.username}
                                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                                    >
                                        {deletingUser === u.username ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: MATRIZ DE PERMISOS (Dinámica) */}
            {activeSubTab === 'permisos' && (
                <div className="animate-in fade-in duration-300">
                    <p className="text-sm text-slate-400 mb-8 border-l-2 pl-4 border-premium-gold">
                        Controla exactamente a qué puede acceder cada nivel en el sistema. Los cambios aquí bloquean o desbloquean funciones en <b>tiempo real</b>. Los Dueños (SuperAdmin) tienen acceso vitalicio total, por seguridad.
                    </p>

                    {/* New Role Creation Row */}
                    <div className="flex gap-4 items-center bg-black/20 p-4 rounded-2xl border border-white/5 mb-8">
                        <Shield className="text-slate-500" />
                        <span className="text-sm font-bold text-white whitespace-nowrap">Crear Nivel:</span>
                        <input
                            type="text"
                            placeholder="Ej: Gerente Ventas, Auditor Externo, Cajero..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-premium-gold outline-none"
                            value={newRole.nombre}
                            onChange={(e) => setNewRole({ nombre: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleCreateRole(e)}
                        />
                        <button
                            disabled={saving}
                            onClick={handleCreateRole}
                            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors flex items-center gap-2"
                        >
                            <Plus size={16} /> Crear Nivel
                        </button>
                    </div>

                    {/* Matrix Table */}
                    <div className="overflow-x-auto w-full custom-scrollbar pb-4 rounded-xl border border-white/5">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr>
                                    <th className="p-4 border-b border-white/10 bg-black/40 text-[10px] uppercase font-black text-slate-500 tracking-widest sticky left-0 z-10 w-48 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                                        Módulos del Sistema
                                    </th>
                                    {roles.map(r => (
                                        <th key={r.id} className="p-4 border-b border-l border-white/10 bg-black/20 text-center min-w-[140px]">
                                            <div className="text-sm font-black text-white">{r.nombre}</div>
                                            {r.is_superadmin && <div className="text-[9px] text-premium-gold font-bold uppercase tracking-widest mt-1">Nivel Máximo</div>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {modulos.map(m => (
                                    <tr key={m.id} className="hover:bg-white/[0.02] border-b border-white/5 transition-colors">
                                        <td className="p-4 text-sm font-bold text-slate-300 sticky left-0 bg-premium-slate/90 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                                            {m.label}
                                        </td>

                                        {roles.map(r => {
                                            // Check current status in role permissions array
                                            const pEntry = r.permissions?.find(p => p.modulo === m.id);
                                            // Superadmins have implicit TRUE
                                            const canView = r.is_superadmin ? true : (pEntry?.can_view ? true : false);

                                            return (
                                                <td key={`${r.id}-${m.id}`} className="p-4 border-l border-white/5 text-center">
                                                    <button
                                                        disabled={r.is_superadmin}
                                                        onClick={() => togglePermission(r.id, m.id, canView)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${canView
                                                            ? (r.is_superadmin ? 'bg-premium-gold/20 text-premium-gold cursor-not-allowed' : 'bg-green-500/20 text-green-400 hover:bg-green-500/40')
                                                            : 'bg-white/5 text-slate-600 hover:bg-white/10 hover:text-white'
                                                            }`}
                                                        title={r.is_superadmin ? 'Acceso inamovible' : 'Clic para alternar'}
                                                    >
                                                        {canView ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* EDIT USER MODAL */}
            {editUserModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => !saving && setEditUserModal({ isOpen: false, user: null })}></div>
                    <div className="bg-premium-slate border border-white/10 rounded-[3rem] p-10 max-w-md w-full relative z-20 shadow-2xl animate-in zoom-in-90 duration-300">
                        <button
                            className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
                            onClick={() => setEditUserModal({ isOpen: false, user: null })}
                        >
                            <X size={24} />
                        </button>

                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Editar Perfil</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase mb-8">Usuario: <span className="text-premium-gold">{editUserModal.user.username}</span></p>

                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Nombre Completo</label>
                                <input value={editForm.nombre_completo} onChange={e => setEditForm({ ...editForm, nombre_completo: e.target.value })} type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none" />
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Asignar Perfil / Jerarquía</label>
                                <select required value={editForm.role_id} onChange={e => setEditForm({ ...editForm, role_id: e.target.value })} className="w-full bg-[#1e2330] border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none custom-select">
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Forzar Nueva Contraseña</label>
                                <input value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} type="password" placeholder="Dejar en blanco para no cambiar..." className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none tracking-widest" />
                                <p className="text-[9px] text-slate-600 italic mt-1 text-right">Escribe una contraseña solo si quieres resetear el acceso actual.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Edad</label>
                                    <input value={editForm.edad} onChange={e => setEditForm({ ...editForm, edad: e.target.value })} type="number" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-premium-gold outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">AÑO NACI (DOB)</label>
                                    <input value={editForm.cumpleanos} onChange={e => setEditForm({ ...editForm, cumpleanos: e.target.value })} type="date" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-[10px] font-mono focus:border-premium-gold outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">RFC</label>
                                <input value={editForm.rfc} onChange={e => setEditForm({ ...editForm, rfc: e.target.value.toUpperCase() })} type="text" maxLength="13" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm uppercase focus:border-premium-gold outline-none" />
                            </div>

                            <button
                                disabled={saving}
                                type="submit"
                                className="w-full bg-premium-gold hover:bg-yellow-400 text-black py-4 rounded-xl font-black text-sm uppercase tracking-widest mt-6 transition-colors shadow-lg shadow-premium-gold/20 flex justify-center items-center"
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : "Actualizar Datos"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UsersAdmin;

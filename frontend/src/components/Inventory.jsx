import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Loader2, PackageOpen, Tag, Box, DollarSign, Image as ImageIcon, Upload, Edit2, Plus, FileText, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

function Inventory({ role, isSuperadmin }) {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [generatingCatalog, setGeneratingCatalog] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);

    const checkEditAccess = () => {
        if (isSuperadmin) return true;

        try {
            const auth = JSON.parse(localStorage.getItem('lp_erp_auth'));
            if (!auth) return false;
            return auth.permissions?.inventory?.sub_permissions?.edit_products === true;
        } catch (e) {
            return false;
        }
    };

    const hasEditAccess = checkEditAccess();

    useEffect(() => {
        fetchProducts();
    }, [searchTerm]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/products`, {
                params: { q: searchTerm }
            });
            setProducts(response.data);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por código o modelo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-premium-gold/50 transition-all text-white placeholder:text-slate-500"
                    />
                </div>
                <div className="flex items-center space-x-4 text-slate-400 text-sm">
                    <span>{products.length} productos encontrados</span>
                    <div className="flex space-x-3">
                        {hasEditAccess && (
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="bg-white/10 text-white font-bold px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-white/20 transition-all border border-white/10"
                            >
                                <Upload size={16} />
                                <span>Importar Excel</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowCatalogModal(true)}
                            className="bg-white/10 text-white font-bold px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-white/20 transition-all border border-white/10"
                        >
                            <FileText size={16} />
                            <span>Generar Catálogo PDF</span>
                        </button>
                        {hasEditAccess && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-premium-gold text-black font-bold px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/10"
                            >
                                <Plus size={16} />
                                <span>Nuevo Producto</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {showModal && (
                <ProductModal
                    product={editingProduct}
                    onClose={() => {
                        setShowModal(false);
                        setEditingProduct(null);
                    }}
                    onSave={fetchProducts}
                />
            )}

            {showCatalogModal && (
                <CatalogOptionsModal
                    onClose={() => setShowCatalogModal(false)}
                    isGenerating={generatingCatalog}
                    onGenerate={async (includeStock, comments) => {
                        setGeneratingCatalog(true);
                        try {
                            // Update comments first before generating
                            await axios.put(`${API_URL}/catalog/comments`, { comentarios: comments });

                            const response = await axios.get(`${API_URL}/catalog/pdf?include_stock=${includeStock}`, {
                                responseType: 'blob'
                            });
                            // Trigger physical download
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', 'Catalogo_Muebleria_Torreon.pdf');
                            document.body.appendChild(link);
                            link.click();
                            link.parentNode.removeChild(link);
                        } catch (err) {
                            console.error("Error generating catalog", err);
                            toast.error("Hubo un error al generar el catálogo. Por favor intenta de nuevo.");
                        } finally {
                            setGeneratingCatalog(false);
                            setShowCatalogModal(false);
                        }
                    }}
                />
            )}

            {showImportModal && (
                <ImportExcelModal
                    onClose={() => setShowImportModal(false)}
                    onImport={fetchProducts}
                />
            )}

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="animate-spin text-premium-gold" size={40} />
                </div>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            hasEditAccess={hasEditAccess}
                            onToggleCatalog={async () => {
                                try {
                                    await axios.put(`${API_URL}/products/${product.id}`, {
                                        ...product,
                                        in_catalog: product.in_catalog === 1 ? 0 : 1
                                    });
                                    fetchProducts(); // Refresh list to reflect toggle
                                } catch (err) {
                                    console.error(err);
                                }
                            }}
                            onEdit={() => {
                                setEditingProduct(product);
                                setShowModal(true);
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="h-64 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-dashed border-white/10 text-slate-500">
                    <PackageOpen size={48} className="mb-2 opacity-20" />
                    <p>No se encontraron productos</p>
                </div>
            )}
        </div>
    );
}

function ProductCard({ product, hasEditAccess, onEdit, onToggleCatalog }) {
    const isLowStock = product.stock <= 2;
    const [showPreview, setShowPreview] = useState(false);

    return (
        <div className="bg-premium-slate/50 rounded-2xl border border-white/5 p-5 hover:border-premium-gold/30 transition-all group hover:shadow-2xl hover:shadow-premium-gold/5 relative overflow-hidden">
            <div className="space-y-4">
                <div className="relative">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="text-premium-gold font-mono text-xs font-bold tracking-widest">{product.codigo}</span>
                                <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${isLowStock ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {product.stock} STOCK
                                </div>
                            </div>
                            <h4 className="text-lg font-bold text-white group-hover:text-premium-gold transition-colors line-clamp-1">{product.modelo}</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                            {hasEditAccess && (
                                <button
                                    onClick={onToggleCatalog}
                                    className={`p-2 rounded-lg transition-colors border ${product.in_catalog === 1 ? 'bg-premium-gold/20 text-premium-gold border-premium-gold/50' : 'bg-black/30 text-slate-500 border-white/10'}`}
                                    title={product.in_catalog === 1 ? 'Actualmente en catálogo' : 'Excluido del catálogo'}
                                >
                                    {product.in_catalog === 1 ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            )}
                            {product.imagen_url && (
                                <button
                                    onMouseEnter={() => setShowPreview(true)}
                                    onMouseLeave={() => setShowPreview(false)}
                                    onClick={() => setShowPreview(!showPreview)}
                                    className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-premium-gold transition-colors"
                                >
                                    <ImageIcon size={18} />
                                </button>
                            )}
                            {hasEditAccess && (
                                <button
                                    onClick={onEdit}
                                    className="p-2 bg-premium-gold text-black rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
                                    title="Editar Producto"
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {showPreview && product.imagen_url && (
                        <div className="absolute top-12 right-0 z-50 w-48 h-48 bg-premium-slate border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                            <img
                                src={product.imagen_url}
                                alt={product.modelo}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2 text-slate-400">
                        <Box size={14} className="text-premium-gold" />
                        <span>{product.tamano}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                        <Tag size={14} className="text-premium-gold" />
                        <span>{product.activo === 1 ? 'Activo' : 'Inactivo'}</span>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Precio Lista</span>
                        <span className="text-xl font-bold text-white">${product.precio_lista.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}


function ProductModal({ onClose, onSave, product }) {
    const [form, setForm] = useState(product ? { ...product } : {
        codigo: '',
        modelo: '',
        tamano: 'Chico',
        costo_fabrica: 0,
        flete: 0,
        maniobras: 0,
        empaque: 0,
        comision: 0,
        garantias: 0,
        costo_total: 0,
        precio_lista: 0,
        utilidad_nivel: 'media',
        activo: 1,
        stock: 0,
        imagen_url: '',
        in_catalog: 1
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [configs, setConfigs] = useState({ utilities: [], costs: [] });

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const [uRes, cRes, fRes, ivaRes] = await Promise.all([
                axios.get(`${API_URL}/config/utility`),
                axios.get(`${API_URL}/config/costs`),
                axios.get(`${API_URL}/config/flete`),
                axios.get(`${API_URL}/config/iva`)
            ]);
            setConfigs({ utilities: uRes.data, costs: cRes.data, globalFlete: fRes.data.costo, ivaAutomatico: ivaRes.data.iva_automatico });
        } catch (err) {
            console.error("Error fetching configs for modal:", err);
        }
    };

    // Auto-calculos
    useEffect(() => {
        const costConfig = configs.costs?.find(c => c.tamano === form.tamano);
        const utilityConfig = configs.utilities?.find(u => u.nivel === form.utilidad_nivel);
        const fleteGlobal = configs.globalFlete || 0;

        if (costConfig && utilityConfig) {
            const sumFixed = costConfig.maniobras + costConfig.empaque + costConfig.comision + costConfig.garantias;
            const subtotal = form.costo_fabrica + fleteGlobal;

            // Requerimiento Muebleria: (Costo + Flete) * Margen + Fijos
            let listPrice = (subtotal * utilityConfig.multiplicador) + sumFixed;
            if (configs.ivaAutomatico) {
                listPrice = listPrice * 1.16;
            }
            const totalCost = subtotal + sumFixed;

            setForm(prev => ({
                ...prev,
                flete: fleteGlobal, // Almacenar silenciosamente para historial
                maniobras: costConfig.maniobras,
                empaque: costConfig.empaque,
                comision: costConfig.comision,
                garantias: costConfig.garantias,
                costo_total: totalCost,
                precio_lista: listPrice
            }));
        }
    }, [form.tamano, form.costo_fabrica, form.utilidad_nivel, configs]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${API_URL}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setForm({ ...form, imagen_url: res.data.url });
        } catch (err) {
            console.error("Error al subir imagen:", err);
            const msg = err.response?.data?.detail || err.message;
            toast.error("Error al subir imagen: " + msg);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (!form.codigo?.trim() || !form.modelo?.trim() || !form.tamano?.trim()) {
                toast.error("Código, modelo y tamaño son obligatorios");
                setSaving(false);
                return;
            }
            if (product) {
                await axios.put(`${API_URL}/products/${product.id}`, form);
            } else {
                await axios.post(`${API_URL}/products`, form);
            }
            toast.success("Producto guardado correctamente");
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Error al guardar producto");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-premium-slate w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <h3 className="text-2xl font-bold text-white">{product ? 'Editar Producto' : 'Nuevo Producto'}</h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Código" value={form.codigo} onChange={(v) => setForm({ ...form, codigo: v })} placeholder="C-001" required />
                            <InputField label="Modelo" value={form.modelo} onChange={(v) => setForm({ ...form, modelo: v })} placeholder="Sofa Chesterfield" required />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Tamaño</label>
                                <select
                                    value={form.tamano}
                                    onChange={(e) => setForm({ ...form, tamano: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-premium-gold"
                                >
                                    <option value="Chico">Chico</option>
                                    <option value="Mediano">Mediano</option>
                                    <option value="Grande">Grande</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Nivel Utilidad</label>
                                <select
                                    value={form.utilidad_nivel}
                                    onChange={(e) => setForm({ ...form, utilidad_nivel: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-premium-gold"
                                >
                                    <option value="baja">Baja</option>
                                    <option value="media">Media</option>
                                    <option value="alta">Alta</option>
                                    <option value="especial">Especial</option>
                                </select>
                            </div>
                            <div>
                                <InputField label="Stock Físico" type="number" value={form.stock} onChange={(v) => setForm({ ...form, stock: parseInt(v) || 0 })} required />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <InputField label="Costo Fábrica" type="number" value={form.costo_fabrica} onChange={(v) => setForm({ ...form, costo_fabrica: parseFloat(v) || 0 })} required />
                            </div>
                            <div className="col-span-2 bg-white/5 rounded-xl p-3 border border-white/5">
                                <span className="text-[10px] text-slate-500 uppercase font-black block mb-2">Gastos Fijos ({form.tamano})</span>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                                    <div className="flex justify-between"><span>Maniobras:</span> <span className="text-premium-gold">${form.maniobras}</span></div>
                                    <div className="flex justify-between"><span>Empaque:</span> <span className="text-premium-gold">${form.empaque}</span></div>
                                    <div className="flex justify-between"><span>Comisión:</span> <span className="text-premium-gold">${form.comision}</span></div>
                                    <div className="flex justify-between"><span>Garantías:</span> <span className="text-premium-gold">${form.garantias}</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <label className="text-[9px] text-slate-500 uppercase font-bold block">Costo Total Final</label>
                                <span className="text-lg font-black text-white">${form.costo_total.toLocaleString()}</span>
                            </div>
                            <div className="bg-premium-gold/10 p-3 rounded-xl border border-premium-gold/20">
                                <label className="text-[9px] text-premium-gold/70 uppercase font-bold block">Precio de Lista Sugerido</label>
                                <span className="text-lg font-black text-premium-gold">${form.precio_lista.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Imagen del Producto</label>
                            <div className="flex items-center space-x-4">
                                {form.imagen_url && (
                                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                        <img src={form.imagen_url} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <label className="flex-1 border-2 border-dashed border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-premium-gold/50 hover:bg-premium-gold/5 transition-all group">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    {uploading ? (
                                        <Loader2 className="animate-spin text-premium-gold" size={24} />
                                    ) : (
                                        <>
                                            <Upload className="text-slate-500 group-hover:text-premium-gold mb-1" size={20} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white">
                                                {form.imagen_url ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
                                            </span>
                                        </>
                                    )}
                                </label>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold tracking-tight text-white mb-1">Catálogo Público</div>
                                    <div className="text-[10px] text-slate-500">Determina si este producto aparece en la exportación PDF del catálogo</div>
                                </div>

                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        value=""
                                        className="sr-only peer"
                                        checked={form.in_catalog === 1}
                                        onChange={(e) => setForm({ ...form, in_catalog: e.target.checked ? 1 : 0 })}
                                    />
                                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-premium-gold"></div>
                                </label>
                            </div>
                        </div>

                        <div className="flex space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-sm font-bold text-slate-400 hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 px-6 py-3 rounded-xl bg-premium-gold text-black font-bold text-sm hover:bg-yellow-400 transition-all flex items-center justify-center space-x-2"
                            >
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <span>{product ? 'Actualizar' : 'Guardar'}</span>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function InputField({ label, value, onChange, type = "text", placeholder, required = false }) {
    return (
        <div>
            <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-premium-gold placeholder:text-slate-600 transition-all"
            />
        </div>
    );
}

function CatalogOptionsModal({ onClose, onGenerate, isGenerating }) {
    const [includeStock, setIncludeStock] = useState(false);
    const [comments, setComments] = useState("");
    const [fetchingComments, setFetchingComments] = useState(true);

    useEffect(() => {
        const loadComments = async () => {
            try {
                const res = await axios.get(`${API_URL}/catalog/comments`);
                if (res.data.comentarios) {
                    setComments(res.data.comentarios);
                }
            } catch (err) {
                console.error("Error fetching catalog comments:", err);
            } finally {
                setFetchingComments(false);
            }
        };
        loadComments();
    }, []);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-premium-slate w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-premium-gold/20 rounded-xl text-premium-gold">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white leading-tight">Exportar Catálogo</h3>
                        <p className="text-xs text-slate-400">Generador de Archivo PDF</p>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                    <label className="flex items-start space-x-3 cursor-pointer group">
                        <div className="relative flex items-start justify-center pt-0.5">
                            <input
                                type="checkbox"
                                className="w-5 h-5 appearance-none border-2 border-white/20 rounded-md checked:bg-premium-gold checked:border-premium-gold transition-colors focus:outline-none"
                                checked={includeStock}
                                onChange={(e) => setIncludeStock(e.target.checked)}
                            />
                            {includeStock && <CheckCircle2 className="absolute text-black pointer-events-none" size={16} />}
                        </div>
                        <div>
                            <span className="text-sm font-bold text-white block group-hover:text-premium-gold transition-colors">
                                Imprimir con Cantidad en Existencia
                            </span>
                            <span className="text-xs text-slate-500 leading-tight block mt-1">
                                Útil para uso interno del equipo de ventas o actualizaciones a publico. Para mostrar solo al cliente de mostrador se recomienda mantener apagado.
                            </span>
                        </div>
                    </label>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                    <label className="text-[10px] text-slate-500 uppercase font-black mb-2 block tracking-widest">
                        Condiciones Generales (Opcional)
                    </label>
                    <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder={fetchingComments ? "Cargando..." : "Ej. Precios sujetos a cambios sin previo aviso...\nTiempo de entrega 45 días..."}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-premium-gold placeholder:text-slate-600 transition-all min-h-[100px] resize-none"
                    />
                    <p className="text-[9px] text-slate-500 mt-2">Esta información se imprimirá en la portada / primer hoja del Catálogo PDF para todos tus clientes.</p>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-sm font-bold text-slate-400 hover:text-white transition-all disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onGenerate(includeStock, comments)}
                        disabled={isGenerating}
                        className="flex-1 px-4 py-3 rounded-xl bg-premium-gold text-black font-bold text-sm hover:bg-yellow-400 transition-all flex items-center justify-center disabled:opacity-50 space-x-2"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <span>Descargar Documento</span>}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ImportExcelModal({ onClose, onImport }) {
    const [importing, setImporting] = useState(false);

    const handleDownloadTemplate = async () => {
        try {
            const response = await axios.get(`${API_URL}/products/template`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'plantilla_inventario_lp.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            toast.success("Plantilla descargada");
        } catch (err) {
            console.error("Error downloading template", err);
            toast.error("Error al descargar la plantilla");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        const loadingToast = toast.loading("Importando inventario...");

        try {
            await axios.post(`${API_URL}/products/import`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Inventario actualizado con éxito", { id: loadingToast });
            onImport();
            onClose();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || err.message;
            toast.error("Error al importar: " + msg, { id: loadingToast });
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-premium-slate w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-8 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-premium-gold/20 rounded-xl text-premium-gold">
                        <Upload size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white leading-tight">Importar Inventario</h3>
                        <p className="text-xs text-slate-400">Actualización masiva desde Excel</p>
                    </div>
                </div>

                <div className="space-y-4 mb-8 text-sm text-slate-400 leading-relaxed">
                    <p>Para cargar tus productos correctamente, sigue estas instrucciones:</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-premium-gold/80 bg-premium-gold/10 px-2 py-0.5 rounded">Obligatorio</span>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li><strong>Código</strong> (Único)</li>
                                <li><strong>Modelo</strong></li>
                                <li><strong>Precio Lista</strong></li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-2 py-0.5 rounded">Opcional</span>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>Stock (Default: 0)</li>
                                <li>Imagen URL</li>
                                <li>Costos y Flete</li>
                            </ul>
                        </div>
                    </div>
                    <p className="text-[11px] italic mt-2">Nota: Si el código ya existe, los datos se <strong>actualizarán</strong> automáticamente.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={handleDownloadTemplate}
                        className="w-full bg-white/5 border border-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center space-x-2"
                    >
                        <FileText size={18} className="text-premium-gold" />
                        <span>Descargar Plantilla Excel</span>
                    </button>

                    <label className="w-full bg-premium-gold text-black font-black py-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/10 cursor-pointer">
                        {importing ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <Upload size={20} />
                                <span>Seleccionar y Subir Archivo</span>
                            </>
                        )}
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={importing} />
                    </label>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-4 text-xs font-bold text-slate-500 hover:text-white transition-all uppercase tracking-widest"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
}

export default Inventory;


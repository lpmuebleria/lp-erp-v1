import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Loader2, PackageOpen, Tag, Box, DollarSign, Image as ImageIcon, Upload, Edit2, Plus, FileText, CheckCircle2, Eye, EyeOff, MessageCircle, Star, Trash2, X, Check, AlertTriangle, Sparkles, Zap, Save, Pencil, RotateCcw, Filter, Grid, List, ChevronDown, Rocket } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { calculateRounding, getRoundingAdjustment } from '../utils/rounding';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');

function Inventory({ role, isSuperadmin }) {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [generatingCatalog, setGeneratingCatalog] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showTagModal, setShowTagModal] = useState(false);
    const [productForTag, setProductForTag] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [interestPct, setInterestPct] = useState(15.0);
    const [showReviewModerationModal, setShowReviewModerationModal] = useState(false);

    // Filtros y Vista
    const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'
    const [categories, setCategories] = useState([]);
    const [filters, setFilters] = useState({
        category_id: '',
        stock_status: '',
        is_offer: '',
        active: '1' // Por defecto activos
    });
    const [showFilters, setShowFilters] = useState(false);

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
    }, [searchTerm, filters]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get(`${API_URL}/config/categories`);
                setCategories(res.data);
            } catch (err) {
                console.error("Error fetching categories:", err);
            }
        };
        fetchCategories();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = {
                q: searchTerm,
                category_id: filters.category_id || undefined,
                stock_status: filters.stock_status || undefined,
                is_offer: filters.is_offer === '1' ? 1 : (filters.is_offer === '0' ? 0 : undefined),
                active: filters.active || undefined
            };
            const [pRes, iRes] = await Promise.all([
                axios.get(`${API_URL}/products`, { params }),
                axios.get(`${API_URL}/config/interests`)
            ]);
            setProducts(pRes.data);
            setInterestPct(iRes.data.interes_msi_pct);
        } catch (error) {
            console.error("Error fetching products/interests:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Top Bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-premium-slate/30 p-6 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row gap-4 flex-1">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-premium-gold transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por código o modelo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold/50 transition-all text-white placeholder:text-slate-600"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center space-x-2 px-5 py-3.5 rounded-2xl border transition-all font-bold text-sm ${showFilters ? 'bg-premium-gold text-black border-premium-gold' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                        >
                            <Filter size={18} />
                            <span>Filtros</span>
                            {Object.values(filters).filter(v => v !== '' && v !== '1').length > 0 && (
                                <span className="bg-black/20 px-1.5 py-0.5 rounded-md text-[10px] ml-1">
                                    {Object.values(filters).filter(v => v !== '' && v !== '1').length}
                                </span>
                            )}
                        </button>

                        <div className="h-10 w-px bg-white/10 mx-2 hidden md:block" />

                        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-premium-gold text-black shadow-lg shadow-premium-gold/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-premium-gold text-black shadow-lg shadow-premium-gold/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center flex-wrap gap-3">
                    {hasEditAccess && (
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="bg-white/5 text-white font-bold px-5 py-3.5 rounded-2xl flex items-center space-x-2 hover:bg-white/10 transition-all border border-white/10 group"
                        >
                            <Upload size={18} className="group-hover:translate-y-[-2px] transition-transform" />
                            <span className="hidden sm:inline">Importar Excel</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowCatalogModal(true)}
                        className="bg-white/5 text-white font-bold px-5 py-3.5 rounded-2xl flex items-center space-x-2 hover:bg-white/10 transition-all border border-white/10 group"
                    >
                        <FileText size={18} className="group-hover:translate-y-[-2px] transition-transform" />
                        <span className="hidden sm:inline">Catálogo PDF</span>
                    </button>

                    {hasEditAccess && (
                        <>
                            <div className="h-10 w-px bg-white/10 mx-1" />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditingProduct(null);
                                        setShowModal(true);
                                    }}
                                    className="bg-white/5 text-white font-bold px-5 py-3.5 rounded-2xl flex items-center space-x-2 hover:bg-white/10 transition-all border border-white/10"
                                >
                                    <Plus size={20} />
                                    <span className="hidden sm:inline">Regular</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingProduct({ is_madre: 1, codigo: '' });
                                        setShowModal(true);
                                    }}
                                    className="bg-premium-gold text-black font-black px-6 py-3.5 rounded-2xl flex items-center space-x-2 hover:bg-yellow-400 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-premium-gold/10"
                                >
                                    <Rocket size={18} />
                                    <span>Madre</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Filters Tray */}
            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-premium-slate/20 rounded-[2rem] border border-white/10 animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Familia / Categoría</label>
                        <select
                            value={filters.category_id}
                            onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-premium-gold focus:outline-none transition-all"
                        >
                            <option value="">Todas las familias</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estatus Inventario</label>
                        <select
                            value={filters.stock_status}
                            onChange={(e) => setFilters({ ...filters, stock_status: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-premium-gold focus:outline-none transition-all"
                        >
                            <option value="">Todo el stock</option>
                            <option value="in_stock">En Existencia</option>
                            <option value="low_stock">Stock Bajo {"(<= 2)"}</option>
                            <option value="out_of_stock">Agotado</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Promociones</label>
                        <select
                            value={filters.is_offer}
                            onChange={(e) => setFilters({ ...filters, is_offer: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-premium-gold focus:outline-none transition-all"
                        >
                            <option value="">Todas</option>
                            <option value="1">Solo en Oferta</option>
                            <option value="0">Precio Regular</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado del Producto</label>
                        <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/10 h-[46px]">
                            <button
                                onClick={() => setFilters({ ...filters, active: '1' })}
                                className={`flex-1 rounded-lg text-xs font-bold transition-all ${filters.active === '1' ? 'bg-green-500/20 text-green-400' : 'text-slate-500 hover:text-white'}`}
                            >
                                Activos
                            </button>
                            <button
                                onClick={() => setFilters({ ...filters, active: '0' })}
                                className={`flex-1 rounded-lg text-xs font-bold transition-all ${filters.active === '0' ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-white'}`}
                            >
                                Inactivos
                            </button>
                            <button
                                onClick={() => setFilters({ ...filters, active: '' })}
                                className={`flex-1 rounded-lg text-xs font-bold transition-all ${filters.active === '' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                Todos
                            </button>
                        </div>
                    </div>
                </div>
            )}


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

            {showReviewModerationModal && (
                <ReviewModerationModal
                    onClose={() => setShowReviewModerationModal(false)}
                />
            )}

            {showTagModal && (
                <PriceTagModal
                    product={productForTag}
                    onClose={() => setShowTagModal(false)}
                    onGenerate={(basePrice) => {
                        window.open(`${API_URL}/products/${productForTag.id}/tag-pdf?base_price=${basePrice}`, '_blank');
                        setShowTagModal(false);
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
                <div className="h-64 flex flex-col items-center justify-center bg-premium-slate/20 rounded-[3rem] border border-white/5 mx-auto w-full">
                    <Loader2 className="animate-spin text-premium-gold mb-4" size={48} />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando Inventario...</p>
                </div>
            ) : products.length > 0 ? (
                <div className={viewMode === 'grid'
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                    : "flex flex-col gap-4"
                }>
                    {products.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            interestPct={interestPct}
                            hasEditAccess={hasEditAccess}
                            viewMode={viewMode}
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
                            onPrintTag={() => {
                                setProductForTag(product);
                                setShowTagModal(true);
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

function ProductCard({ product, hasEditAccess, onEdit, onToggleCatalog, onPrintTag, interestPct, viewMode }) {
    const auth = JSON.parse(localStorage.getItem('lp_erp_auth'));
    const isSuperadmin = auth?.is_superadmin === true;
    const isLowStock = product.stock <= 2 && product.stock > 0;
    const isOutOfStock = product.stock === 0;
    const [showQuickView, setShowQuickView] = useState(false);

    if (viewMode === 'list') {
        return (
            <div className="bg-premium-slate/30 border border-white/5 rounded-2xl p-4 flex items-center gap-6 hover:border-premium-gold/30 transition-all group">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/5 shrink-0 relative">
                    {product.imagen_url ? (
                        <img src={product.imagen_url} alt={product.modelo} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                            <ImageIcon size={24} />
                        </div>
                    )}
                    {product.is_offer === 1 && (
                        <div className="absolute top-1 left-1 bg-yellow-500 text-black p-1 rounded-md">
                            <Zap size={10} fill="currentColor" />
                        </div>
                    )}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-premium-gold font-bold">{product.codigo}</span>
                            <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${isOutOfStock ? 'bg-red-500 text-white' : (isLowStock ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500')}`}>
                                {isOutOfStock ? 'Agotado' : `${product.stock} Stock`}
                            </div>
                            <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${product.activo === 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                {product.activo === 1 ? 'Activo' : 'Inactivo'}
                            </div>
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-premium-gold transition-colors">{product.modelo}</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{product.categoria_name || 'Sin Categoría'}</p>
                    </div>

                    <div className="hidden md:flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <Box size={12} className="text-premium-gold" />
                            <span>{product.tamano}</span>
                        </div>
                        {(product.fabric_names || product.color_names) && (
                            <p className="text-[9px] text-slate-500 truncate max-w-[150px]">
                                {product.fabric_names && `Telas: ${product.fabric_names}`}
                                {product.color_names && ` • Colores: ${product.color_names}`}
                            </p>
                        )}
                    </div>

                    <div className="hidden md:flex flex-col gap-1 col-span-1">
                        {product.caracteristicas && (
                            <p className="text-[10px] text-slate-400 line-clamp-2 italic">
                                "{product.caracteristicas}"
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col items-end md:items-start">
                        <span className="text-[9px] text-slate-500 uppercase font-black">Precio Contado</span>
                        <div className="flex items-baseline gap-2">
                            {product.descuento_automatico > 0 ? (
                                <span className="text-sm font-black text-green-400">${product.precio_con_descuento?.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                            ) : (
                                <span className="text-sm font-black text-white">${product.precio_lista?.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        {product.imagen_url && (
                            <button
                                onClick={() => setShowQuickView(true)}
                                className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-premium-gold hover:bg-white/10 transition-all"
                                title="Vista Rápida"
                            >
                                <ImageIcon size={18} />
                            </button>
                        )}
                        {hasEditAccess && (
                            <>
                                <button
                                    onClick={onToggleCatalog}
                                    className={`p-2.5 rounded-xl transition-all border ${product.in_catalog === 1 ? 'bg-premium-gold/20 text-premium-gold border-premium-gold/50' : 'bg-black/30 text-slate-500 border-white/10'}`}
                                >
                                    {product.in_catalog === 1 ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                                <button
                                    onClick={onEdit}
                                    className="p-2.5 bg-premium-gold text-black rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-premium-gold/20"
                                >
                                    <Edit2 size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
                {showQuickView && (
                    <ProductQuickView
                        product={product}
                        interestPct={interestPct}
                        onClose={() => setShowQuickView(false)}
                    />
                )}
            </div>
        );
    }

    // Default Grid View
    return (
        <div className="relative group/card bg-premium-slate/40 rounded-[2.5rem] border border-white/5 p-5 hover:border-premium-gold/40 transition-all duration-500 hover:shadow-2xl hover:shadow-premium-gold/10 overflow-hidden flex flex-col h-full">
            {/* Image Container */}
            <div
                onClick={() => product.imagen_url && setShowQuickView(true)}
                className="relative aspect-square rounded-[2rem] overflow-hidden bg-black/40 mb-5 border border-white/5 group-hover:border-premium-gold/20 transition-all cursor-zoom-in"
            >
                {product.imagen_url ? (
                    <img src={product.imagen_url} alt={product.modelo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-800">
                        <PackageOpen size={48} className="mb-2 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-tighter opacity-20">Sin Imagen</span>
                    </div>
                )}

                {/* Visual Feedback on Hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Sparkles className="text-premium-gold opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-500" size={40} />
                </div>

                {/* Overlay Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-black text-premium-gold tracking-widest uppercase">
                        {product.codigo}
                    </div>
                </div>

                {/* Action Buttons Overlay (on hover) */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover/card:opacity-100 transition-all duration-300 translate-x-4 group-hover/card:translate-x-0">
                    {hasEditAccess && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="p-3 bg-premium-gold text-black rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all text-black hover:bg-yellow-400"
                            title="Editar"
                        >
                            <Edit2 size={18} />
                        </button>
                    )}
                </div>

                {product.is_offer === 1 && (
                    <div className="absolute bottom-4 left-4 px-3 py-1 bg-yellow-500 text-black rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xl animate-pulse">
                        <Zap size={10} fill="currentColor" />
                        OFERTA
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div className="flex-1 flex flex-col">
                <div className="mb-3">
                    <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                                {product.categoria_name || 'Sin Categoría'}
                            </p>
                            <h4 className="text-xl font-black text-white line-clamp-2 leading-tight group-hover:text-premium-gold transition-colors pr-8">
                                {product.modelo}
                            </h4>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${isOutOfStock ? 'bg-red-500/20 text-red-500' : (isLowStock ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500')}`}>
                                {isOutOfStock ? 'AGOTADO' : `${product.stock} STOCK`}
                            </div>
                            <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${product.activo === 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                {product.activo === 1 ? 'ACTIVO' : 'INACTIVO'}
                            </div>
                            {hasEditAccess && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleCatalog(); }}
                                    className={`p-2 rounded-xl transition-all border ${product.in_catalog === 1 ? 'bg-premium-gold/20 text-premium-gold border-premium-gold/50' : 'bg-black/30 text-slate-500 border-white/10 hover:text-white'}`}
                                    title={product.in_catalog === 1 ? 'Quitar del catálogo' : 'Agregar al catálogo'}
                                >
                                    {product.in_catalog === 1 ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 mb-5">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2 text-slate-500">
                            <Box size={14} className="text-premium-gold/50" />
                            <span className="text-[11px] font-bold">{product.tamano}</span>
                        </div>
                        {product.dimensiones && (
                            <div className="flex items-center space-x-2 text-slate-500">
                                <Tag size={14} className="text-premium-gold/50" />
                                <span className="text-[11px] font-bold truncate max-w-[100px]">{product.dimensiones}</span>
                            </div>
                        )}
                    </div>

                    {(product.fabric_names || product.color_names) && (
                        <div className="flex flex-col gap-0.5 mt-1 border-l-2 border-premium-gold/20 pl-3">
                            {product.fabric_names && (
                                <p className="text-[10px] text-slate-400 font-bold line-clamp-1">Telas: <span className="text-slate-500 font-medium italic">{product.fabric_names}</span></p>
                            )}
                            {product.color_names && (
                                <p className="text-[10px] text-slate-400 font-bold line-clamp-1">Colores: <span className="text-slate-500 font-medium italic">{product.color_names}</span></p>
                            )}
                        </div>
                    )}

                    {product.caracteristicas && (
                        <div className="mt-2 bg-black/20 p-2 rounded-xl border border-white/5">
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                                {product.caracteristicas}
                            </p>
                        </div>
                    )}
                </div>

                {/* Price Section */}
                <div className="mt-auto pt-5 border-t border-white/5">
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Pago de Contado</span>
                            <div className="flex items-baseline gap-2">
                                {product.descuento_automatico > 0 ? (
                                    <>
                                        <span className="text-xs text-slate-600 line-through font-bold">${product.precio_lista?.toLocaleString()}</span>
                                        <span className="text-2xl font-black text-green-400 tracking-tighter">
                                            ${product.precio_con_descuento?.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-2xl font-black text-white tracking-tighter">
                                        ${product.precio_lista?.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-premium-gold/50 uppercase font-black tracking-widest mb-1 text-right">Crédito MSI</span>
                            <span className="text-xl font-black text-premium-gold tracking-tighter">
                                ${calculateRounding((product.precio_con_descuento || product.precio_lista || 0) * (1 + interestPct / 100)).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {hasEditAccess && isSuperadmin && (
                <button
                    onClick={onPrintTag}
                    className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2 group-hover:border-premium-gold/30"
                >
                    <FileText size={14} className="text-premium-gold" />
                    <span>Imprimir Etiqueta Piso</span>
                </button>
            )}

            {showQuickView && (
                <ProductQuickView
                    product={product}
                    interestPct={interestPct}
                    onClose={() => setShowQuickView(false)}
                />
            )}
        </div>
    );
}

function ProductQuickView({ product, onClose, interestPct }) {
    const isLowStock = product.stock <= 2;
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 4));
    const handleZoomOut = () => {
        setZoom(prev => {
            const next = Math.max(prev - 0.5, 1);
            if (next === 1) setOffset({ x: 0, y: 0 });
            return next;
        });
    };
    const handleReset = () => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    };

    // Re-clamp offset when zoom changes to prevent image being "lost"
    useEffect(() => {
        if (containerRef.current && zoom > 1) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            const maxX = (width * zoom - width) / 2;
            const maxY = (height * zoom - height) / 2;

            setOffset(prev => ({
                x: Math.min(Math.max(prev.x, -maxX), maxX),
                y: Math.min(Math.max(prev.y, -maxY), maxY)
            }));
        }
    }, [zoom]);

    const onMouseDown = (e) => {
        if (zoom <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const stopDragging = () => setIsDragging(false);

    const onMouseMove = (e) => {
        if (!isDragging || zoom <= 1 || !containerRef.current) return;
        e.preventDefault();

        const { width, height } = containerRef.current.getBoundingClientRect();
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // Boundaries Calculation
        const maxX = (width * zoom - width) / 2;
        const maxY = (height * zoom - height) / 2;

        setOffset({
            x: Math.min(Math.max(newX, -maxX), maxX),
            y: Math.min(Math.max(newY, -maxY), maxY)
        });
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="bg-premium-slate/90 border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 backdrop-blur-2xl relative group/qv"
                onMouseLeave={onClose}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-premium-gold to-transparent opacity-50"></div>

                <div className="flex flex-col md:flex-row h-full">
                    {/* Image Section - Interactive Zoom/Pan */}
                    <div
                        ref={containerRef}
                        className={`w-full md:w-3/5 h-[300px] md:h-[550px] relative overflow-hidden bg-black/40 select-none ${zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}`}
                        onMouseDown={onMouseDown}
                        onMouseUp={stopDragging}
                        onMouseLeave={stopDragging}
                        onMouseMove={onMouseMove}
                        onClick={() => zoom === 1 && setZoom(2)}
                    >
                        <div
                            className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
                            style={{
                                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                            }}
                        >
                            <img
                                src={product.imagen_url}
                                alt={product.modelo}
                                draggable="false"
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>

                        {/* Zoom Controls Overlay */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl opacity-0 group-hover/qv:opacity-100 transition-opacity duration-300">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                                className="p-2.5 text-white hover:bg-white/10 rounded-xl transition-all"
                                title="Alejar"
                            >
                                <X size={16} className="rotate-45" />
                            </button>
                            <div className="w-px h-4 bg-white/10 mx-1"></div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleReset(); }}
                                className="px-3 py-1.5 text-[10px] font-black text-premium-gold uppercase tracking-widest hover:bg-white/5 rounded-lg transition-all"
                            >
                                {Math.round(zoom * 100)}%
                            </button>
                            <div className="w-px h-4 bg-white/10 mx-1"></div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                                className="p-2.5 text-white hover:bg-white/10 rounded-xl transition-all"
                                title="Acercar"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        {/* Floating Badges */}
                        <div className="absolute top-6 left-6 flex flex-col gap-2">
                            <div className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black text-premium-gold tracking-widest uppercase shadow-xl">
                                {product.codigo}
                            </div>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 p-8 md:p-10 flex flex-col justify-between bg-gradient-to-br from-white/5 to-transparent">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2 tracking-tight">
                                    {product.modelo}
                                </h2>
                                <p className="text-slate-400 text-sm font-medium">Línea de Muebles Premium • {product.tamano}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full animate-pulse ${isLowStock ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`}></div>
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-300">Inventario Disponible</span>
                                    </div>
                                    <span className={`text-xl font-black ${isLowStock ? 'text-red-400' : 'text-green-400'}`}>
                                        {product.stock} <span className="text-[10px] text-slate-500 ml-1">UNIDADES</span>
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Familia</span>
                                        <span className="text-sm font-bold text-white">{product.categoria_name || 'Sin Categoría'}</span>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Estado</span>
                                        <span className="text-sm font-bold text-premium-gold">{product.activo === 1 ? 'ACTIVO' : 'INACTIVO'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10 space-y-6">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 text-center md:text-left">Precio Contado</span>
                                <div className="flex items-baseline justify-center md:justify-start space-x-1">
                                    {product.descuento_automatico > 0 ? (
                                        <div className="flex flex-col">
                                            <span className="text-lg font-bold text-slate-500 line-through tracking-tighter decoration-red-400/30">
                                                ${product.precio_lista?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </span>
                                            <div className="flex items-baseline space-x-2">
                                                <span className="text-4xl md:text-5xl font-black text-green-400 tracking-tighter">
                                                    ${product.precio_con_descuento?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">-{product.descuento_automatico}%</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                                            ${product.precio_lista?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </span>
                                    )}
                                    <span className="text-xs font-bold text-slate-500">MXN</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black text-premium-gold/70 uppercase tracking-[0.2em] mb-1 text-center md:text-left">Precio Crédito MSI</span>
                                <div className="flex items-baseline justify-center md:justify-start space-x-1">
                                    <span className="text-4xl md:text-5xl font-black text-premium-gold tracking-tighter">
                                        ${calculateRounding((product.precio_con_descuento || product.precio_lista || 0) * (1 + interestPct / 100)).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                                    </span>
                                    <span className="text-xs font-bold text-premium-gold/50">MXN</span>
                                </div>
                            </div>
                        </div>

                        {/* Hint to interaction */}
                        <div className="mt-4 text-center space-y-2">
                            <div className="flex items-center justify-center space-x-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                <span className="p-1 bg-white/5 rounded border border-white/10 uppercase">Arraastrar para ver</span>
                                <span className="opacity-30">•</span>
                                <span className="p-1 bg-white/5 rounded border border-white/10 uppercase">Retirar para cerrar</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModernConfirmModal({ isOpen, onClose, onConfirm, title, message, color = "red" }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-200 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-premium-slate w-full max-w-sm rounded-4xl border border-white/10 shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
                <div className={`mx-auto w-16 h-16 ${color === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-premium-gold/20 text-premium-gold'} rounded-2xl flex items-center justify-center mb-6`}>
                    {color === 'red' ? <Trash2 size={32} /> : <CheckCircle2 size={32} />}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">{message}</p>
                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all border border-white/5"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`flex-1 px-6 py-3 ${color === 'red' ? 'bg-red-500 hover:bg-red-600' : 'bg-premium-gold hover:bg-premium-gold/80'} text-black font-bold rounded-xl transition-all shadow-lg active:scale-95`}
                    >
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
}

function ReviewModerationModal({ onClose }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
    const [editingId, setEditingId] = useState(null);
    const [editingText, setEditingText] = useState("");

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/admin/reviews`);
            setReviews(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Error al cargar reseñas");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await axios.put(`${API_URL}/admin/reviews/${id}/approve`);
            toast.success("Reseña aprobada");
            fetchReviews();
        } catch (err) {
            console.error(err);
            toast.error("Error al aprobar");
        }
    };

    const handleUpdateText = async (id) => {
        try {
            await axios.put(`${API_URL}/admin/reviews/${id}/text`, { comentario: editingText });
            toast.success("Comentario actualizado");
            setEditingId(null);
            fetchReviews();
        } catch (err) {
            console.error(err);
            toast.error("Error al actualizar");
        }
    };

    const handleOptimizeText = async (id) => {
        try {
            await axios.put(`${API_URL}/admin/reviews/${id}/optimize`);
            toast.success("Texto optimizado correctamente. Ahora puedes revisarlo.");
            fetchReviews();
        } catch (err) {
            console.error(err);
            toast.error("Error al optimizar");
        }
    };

    const handleApproveAllGreen = async () => {
        try {
            const res = await axios.post(`${API_URL}/admin/reviews/approve-all-green`);
            toast.success(res.data.message);
            fetchReviews();
        } catch (err) {
            console.error(err);
            toast.error("Error al aprobar masivamente");
        }
    };

    const handleDelete = async () => {
        const id = confirmDelete.id;
        try {
            await axios.delete(`${API_URL}/admin/reviews/${id}`);
            toast.success("Reseña eliminada");
            fetchReviews();
        } catch (err) {
            console.error(err);
            toast.error("Error al eliminar");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-100 flex items-center justify-center p-4">
            <div className="bg-premium-slate w-full max-w-4xl max-h-[85vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/10 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-premium-gold/20 rounded-2xl text-premium-gold">
                            <MessageCircle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">Moderación de Reseñas</h3>
                            <p className="text-xs text-slate-500">Gestiona los comentarios de tus clientes en el catálogo.</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {!loading && reviews.filter(r => !r.is_approved && r.gravedad === 'green').length > 0 && (
                            <button
                                onClick={handleApproveAllGreen}
                                className="flex items-center space-x-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-all text-xs font-bold uppercase"
                            >
                                <CheckCircle2 size={16} />
                                <span>Aprobar Verdes</span>
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-premium-gold mb-4" size={40} />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando reseñas...</p>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-20 opacity-30">
                            <MessageCircle size={60} className="mx-auto mb-4" />
                            <p className="text-xl font-bold uppercase">No hay reseñas por el momento</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {reviews.map((rev) => (
                                <div
                                    key={rev.id}
                                    className={`bg-white/5 border ${rev.gravedad === 'red' ? 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : rev.gravedad === 'yellow' ? 'border-amber-500/40' : 'border-white/10'} rounded-2xl p-6 group hover:border-premium-gold/30 transition-all flex flex-col relative overflow-hidden`}
                                >
                                    {/* Indicador de gravedad */}
                                    <div className={`absolute top-0 left-0 w-1 h-full ${rev.gravedad === 'red' ? 'bg-red-500' : rev.gravedad === 'yellow' ? 'bg-amber-500' : 'bg-green-500'}`} />

                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-xs font-black text-premium-gold uppercase tracking-widest mb-1">{rev.product_modelo}</p>
                                            <div className="flex items-center space-x-2">
                                                <p className="text-sm font-bold text-white">{rev.cliente_nombre}</p>
                                                {rev.gravedad !== 'green' && (
                                                    <div className={`flex items-center space-x-1 ${rev.gravedad === 'red' ? 'text-red-400' : 'text-amber-400'} text-[10px] font-bold uppercase`}>
                                                        <AlertTriangle size={10} />
                                                        <span>{rev.gravedad_razon}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="flex text-premium-gold mb-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={12} fill={i < rev.calificacion ? "currentColor" : "none"} />
                                                ))}
                                            </div>
                                            {!rev.is_approved && (
                                                <span className={`text-[9px] font-black text-white ${rev.gravedad === 'red' ? 'bg-red-500' : rev.gravedad === 'yellow' ? 'bg-amber-500' : 'bg-green-500/80'} px-2 py-0.5 rounded-full uppercase tracking-tighter`}>
                                                    Pendiente
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col mb-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Calidad del mensaje</span>
                                            <span className={`text-[10px] font-black ${rev.calidad_score > 80 ? 'text-green-400' : rev.calidad_score > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                                {rev.calidad_score}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${rev.calidad_score > 80 ? 'bg-green-500' : rev.calidad_score > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${rev.calidad_score}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col mb-4">
                                        {editingId === rev.id ? (
                                            <div className="animate-in fade-in duration-300">
                                                <textarea
                                                    value={editingText}
                                                    onChange={(e) => setEditingText(e.target.value)}
                                                    className="w-full bg-black/40 border border-premium-gold/50 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-premium-gold min-h-[100px] mb-2"
                                                    autoFocus
                                                />
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleUpdateText(rev.id)}
                                                        className="flex-1 bg-premium-gold text-black text-[10px] font-black uppercase py-2 rounded-lg hover:bg-yellow-400 transition-colors flex items-center justify-center space-x-1"
                                                    >
                                                        <Save size={12} />
                                                        <span>Guardar Cambios</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="px-3 bg-white/10 text-white text-[10px] font-black uppercase py-2 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center"
                                                    >
                                                        <RotateCcw size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-slate-400 text-sm leading-relaxed italic group-hover:text-slate-200 transition-colors">
                                                "{rev.comentario}"
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                        <span className="text-[10px] text-slate-500 uppercase font-bold">
                                            {rev.fecha ? new Date(rev.fecha).toLocaleDateString('es-MX') : '-'}
                                        </span>
                                        <div className="flex space-x-2">
                                            {!rev.is_approved && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(rev.id);
                                                            setEditingText(rev.comentario);
                                                        }}
                                                        className="p-2 text-slate-400 hover:bg-white/10 rounded-lg transition-colors"
                                                        title="Editar Comentario"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    {!rev.is_approved && rev.calidad_score >= 40 && (
                                                        <button
                                                            onClick={() => handleOptimizeText(rev.id)}
                                                            className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors group/btn"
                                                            title="Optimizar Formato (Sin Aprobar)"
                                                        >
                                                            <Sparkles size={18} className="group-hover/btn:animate-pulse" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleApprove(rev.id)}
                                                        className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                                                        title="Aprobar Reseña"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => setConfirmDelete({ isOpen: true, id: rev.id })}
                                                className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                title="Eliminar Reseña"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <ModernConfirmModal
                    isOpen={confirmDelete.isOpen}
                    onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                    onConfirm={handleDelete}
                    title="¿Eliminar Reseña?"
                    message="Se borrará permanentemente y dejará de ser visible en el catálogo."
                    color="red"
                />
            </div>
        </div>
    );
}

function ProductModal({ onClose, onSave, product }) {
    const initialValues = {
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
        in_catalog: 1,
        is_madre: 0,
        is_offer: 0,
        precio_etiqueta: 0,
        categoria_id: null,
        allowed_fabric_ids: [],
        allowed_color_ids: []
    };

    const [form, setForm] = useState({ ...initialValues, ...product });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [configs, setConfigs] = useState({ utilities: [], costs: [], fabrics: [], colors: [], categories: [] });

    useEffect(() => {
        const loadDetails = async () => {
            if (product?.id) {
                try {
                    const res = await axios.get(`${API_URL}/products/${product.id}`);
                    setForm(prev => ({ ...prev, ...res.data }));
                } catch (err) {
                    console.error("Error fetching product details:", err);
                }
            }
        };
        loadDetails();
        fetchConfigs();
    }, [product]);

    const fetchConfigs = async () => {
        try {
            const [uRes, cRes, fRes, ivaRes, fabRes, colRes, catRes] = await Promise.all([
                axios.get(`${API_URL}/config/utility`),
                axios.get(`${API_URL}/config/costs`),
                axios.get(`${API_URL}/config/flete`),
                axios.get(`${API_URL}/config/iva`),
                axios.get(`${API_URL}/config/fabrics`),
                axios.get(`${API_URL}/config/colors`),
                axios.get(`${API_URL}/config/categories`)
            ]);
            setConfigs({
                utilities: uRes.data,
                costs: cRes.data,
                globalFlete: fRes.data.costo,
                ivaAutomatico: ivaRes.data.iva_automatico,
                fabrics: fabRes.data,
                colors: colRes.data,
                categories: catRes.data
            });
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
            let rawPrice = (subtotal * utilityConfig.multiplicador) + sumFixed;
            if (configs.ivaAutomatico) {
                rawPrice = rawPrice * 1.16;
            }

            // Aplicar Redondeo "Silencioso" corregido
            const listPrice = calculateRounding(rawPrice);
            const round_adjustment = listPrice - rawPrice;

            const totalCost = subtotal + sumFixed;

            setForm(prev => ({
                ...prev,
                flete: fleteGlobal, // Almacenar silenciosamente para historial
                maniobras: costConfig.maniobras,
                empaque: costConfig.empaque,
                comision: costConfig.comision,
                garantias: costConfig.garantias,
                costo_total: totalCost,
                precio_lista: listPrice,
                round_adjustment: round_adjustment
            }));
        }
    }, [form.tamano, form.costo_fabrica, form.utilidad_nivel, configs]);

    // Auto-generación de código
    useEffect(() => {
        const fetchNextCode = async () => {
            if (!product?.id) {
                try {
                    const res = await axios.get(`${API_URL}/products/next-code?is_madre=${form.is_madre}`);
                    if (res.data.next_code) {
                        setForm(prev => ({ ...prev, codigo: res.data.next_code }));
                    }
                } catch (err) {
                    console.error("Error al obtener consecutivo:", err);
                }
            }
        };
        fetchNextCode();
    }, [form.is_madre, product?.id]);

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
            if (product?.id) {
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

                        <div>
                            <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">Familia (Categoría)</label>
                            <select
                                value={form.categoria_id || ''}
                                onChange={(e) => setForm({ ...form, categoria_id: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-premium-gold"
                            >
                                <option value="">Sin Categoría</option>
                                {configs.categories?.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
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

                        <div className="grid grid-cols-3 gap-4 pt-2 pb-2">
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <label className="text-[9px] text-slate-500 uppercase font-bold block">Costo Total Final</label>
                                <span className="text-lg font-black text-white">${form.costo_total.toLocaleString()}</span>
                            </div>
                            <div className="bg-premium-gold/10 p-3 rounded-xl border border-premium-gold/20">
                                <label className="text-[9px] text-premium-gold/70 uppercase font-bold block">Precio Venta Sugerido</label>
                                <span className="text-lg font-black text-premium-gold">${form.precio_lista.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                                <label className="text-[9px] text-blue-400 uppercase font-bold block">Precio de Lista (Etiqueta)</label>
                                <div className="flex items-center text-lg font-black text-blue-400 mt-0.5">
                                    <span className="mr-1">$</span>
                                    <input
                                        type="number"
                                        value={form.precio_etiqueta || ''}
                                        onChange={(e) => setForm({ ...form, precio_etiqueta: parseFloat(e.target.value) || 0 })}
                                        className="bg-transparent w-full focus:outline-none focus:border-b border-blue-500/50"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        {form.is_madre === 1 && (
                            <div className="py-4 border-y border-white/5 bg-white/5 px-4 rounded-2xl">
                                <div className="space-y-3">
                                    <label className="text-[10px] text-premium-gold uppercase font-black mb-1 block">Telas Disponibles (Colores se asignan automáticamente)</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto max-h-48 pr-2 custom-scrollbar text-[11px]">
                                        {configs.fabrics.length === 0 && <p className="text-slate-600 italic">No hay telas configuradas</p>}
                                        {configs.fabrics.map(f => (
                                            <label key={f.id} className="flex items-center space-x-2 cursor-pointer hover:text-white transition-colors bg-black/20 p-2 rounded-lg border border-white/5">
                                                <input
                                                    type="checkbox"
                                                    checked={form.allowed_fabric_ids?.includes(f.id)}
                                                    onChange={(e) => {
                                                        const current = form.allowed_fabric_ids || [];
                                                        const newFabrics = e.target.checked
                                                            ? [...current, f.id]
                                                            : current.filter(id => id !== f.id);

                                                        // Auto-enlace de colores: encontrar todos los colores de las telas seleccionadas
                                                        const inheritedColors = configs.colors
                                                            .filter(c => newFabrics.includes(c.fabric_id))
                                                            .map(c => c.id);

                                                        setForm({
                                                            ...form,
                                                            allowed_fabric_ids: newFabrics,
                                                            allowed_color_ids: inheritedColors
                                                        });
                                                    }}
                                                    className="w-4 h-4 rounded border-white/10 accent-premium-gold"
                                                />
                                                <span className="uppercase font-bold">{f.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-white/10 space-y-4">
                            <TextareaField
                                label="Descripción Detallada"
                                value={form.descripcion}
                                onChange={(v) => setForm({ ...form, descripcion: v })}
                                placeholder="Escribe aquí la descripción del producto (estilo Blueroom)..."
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <TextareaField
                                    label="Dimensiones"
                                    value={form.dimensiones}
                                    onChange={(v) => setForm({ ...form, dimensiones: v })}
                                    placeholder="Ej: Largo 2.20m x Ancho 2.10m..."
                                    rows={2}
                                />
                                <TextareaField
                                    label="Características / Incluye"
                                    value={form.caracteristicas}
                                    onChange={(v) => setForm({ ...form, caracteristicas: v })}
                                    placeholder="Ej: 2 Burós, 1 Cabecera..."
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/10">
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

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div>
                                    <div className="text-sm font-bold tracking-tight text-white mb-1">Catálogo Público</div>
                                    <div className="text-[10px] text-slate-500">Determina si este producto aparece en la exportación PDF y web</div>
                                </div>

                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={form.in_catalog === 1}
                                        onChange={(e) => setForm({ ...form, in_catalog: e.target.checked ? 1 : 0 })}
                                    />
                                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-premium-gold"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold tracking-tight text-[#eab308] mb-1">Producto en Oferta</div>
                                    <div className="text-[10px] text-slate-500">Muestra una insignia de oferta y permite filtrado especial</div>
                                </div>

                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={form.is_offer === 1}
                                        onChange={(e) => setForm({ ...form, is_offer: e.target.checked ? 1 : 0 })}
                                    />
                                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#eab308]"></div>
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

function TextareaField({ label, value, onChange, placeholder, rows = 3 }) {
    return (
        <div>
            <label className="text-[10px] text-slate-500 uppercase font-black mb-1 block">{label}</label>
            <textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-premium-gold placeholder:text-slate-600 transition-all resize-none"
            />
        </div>
    );
}

function PriceTagModal({ product, onClose, onGenerate }) {
    const [basePrice, setBasePrice] = useState(product?.precio_etiqueta || (product?.precio_lista ? Math.round(product.precio_lista * 1.3) : 0));

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-premium-slate w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mx-auto">
                        <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Etiqueta de Piso</h3>
                    <p className="text-xs text-slate-500">Configura el precio "tachado" para resaltar la oferta en el mueble físico.</p>
                </div>

                <div className="mt-8 space-y-6">
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase font-black mb-2 block tracking-widest text-center">Precio de Lista (A tachar)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                            <input
                                type="number"
                                value={basePrice}
                                onChange={(e) => setBasePrice(e.target.value)}
                                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 pl-10 text-2xl font-black text-white focus:outline-none focus:border-blue-500 transition-all text-center"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-500">PRECIO VENTA:</span>
                            <span className="text-green-400 font-mono">${product?.precio_lista?.toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-slate-600 italic">
                            * Este es el precio real que cobrarás al cliente.
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-4 rounded-2xl border border-white/10 text-sm font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onGenerate(basePrice)}
                            className="flex-1 px-4 py-4 rounded-2xl bg-blue-600 text-white font-black text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 uppercase tracking-widest"
                        >
                            Generar PDF
                        </button>
                    </div>
                </div>
            </div>
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


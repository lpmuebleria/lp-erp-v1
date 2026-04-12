import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShoppingBag,
  Search,
  MessageCircle,
  ChevronRight,
  ArrowRight,
  Star,
  Package,
  Clock,
  Instagram,
  Facebook,
  Phone,
  X,
  Menu
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');
const BACKEND_URL = API_URL.replace('/api', '');

function Catalog() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('descripcion');
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showOffersOnly, setShowOffersOnly] = useState(false);
  const [historyImageError, setHistoryImageError] = useState(false);
  const [showWAMessage, setShowWAMessage] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ cliente_nombre: '', calificacion: 5, comentario: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const calculateDiscount = (etiqueta, lista) => {
    if (!etiqueta || etiqueta <= lista) return 0;
    return Math.round(((etiqueta - lista) / etiqueta) * 100);
  };

  const DiscountBadge = ({ percentage, size = 'md' }) => {
    if (!percentage) return null;
    const sizes = {
      sm: 'w-12 h-12 text-[10px]',
      md: 'w-16 h-16 text-[12px]',
      lg: 'w-24 h-24 text-[16px]'
    };
    return (
      <div className={`absolute -bottom-2 -left-2 z-20 ${sizes[size]} flex items-center justify-center animate-bounce-slow drop-shadow-2xl`}>
        <div className="absolute inset-0 bg-[#eab308] rotate-45 rounded-sm border-2 border-black" />
        <div className="absolute inset-0 bg-[#eab308] -rotate-45 rounded-sm border-2 border-black" />
        <span className="relative font-black text-black text-center leading-none uppercase tracking-tighter">
          {percentage}%<br />OFF
        </span>
      </div>
    );
  };

  const offerProducts = products.filter(p => p.is_offer === 1);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    document.title = "LP Mueblería de Jalisco";
    const timer = setTimeout(() => setShowWAMessage(true), 3000);
    return () => {
      document.title = "LP Mueblería de Jalisco";
      clearTimeout(timer);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        axios.get(`${API_URL}/catalog/products`),
        axios.get(`${API_URL}/catalog/categories`)
      ]);
      setProducts(pRes.data);
      setCategories(['Todos', ...cRes.data]);
    } catch (err) {
      console.error("Error fetching catalog data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'Todos' || p.tamano === activeCategory;
    const matchesSearch = p.modelo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOffer = !showOffersOnly || p.is_offer === 1;
    return matchesCategory && matchesSearch && matchesOffer;
  });

  useEffect(() => {
    if (selectedProduct) {
      fetchReviews(selectedProduct.id);
    }
  }, [selectedProduct]);

  const fetchReviews = async (productId) => {
    setReviewLoading(true);
    try {
      // We need to find the numerical ID from the product object.
      // In the catalog API we might only have 'codigo'. 
      // Let's assume we have 'id' if we updated the API right.
      // Wait, get_public_catalog SELECT doesn't have ID! 
      // I need to update api/catalog.py to include ID.
      const res = await axios.get(`${API_URL}/catalog/products/${productId}/reviews`);
      setReviews(res.data);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setReviewLoading(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!newReview.cliente_nombre || !newReview.comentario) return;
    setSubmittingReview(true);
    try {
      await axios.post(`${API_URL}/catalog/products/${selectedProduct.id}/reviews`, {
        ...newReview,
        product_id: selectedProduct.id
      });
      setNewReview({ cliente_nombre: '', calificacion: 5, comentario: '' });
      setShowReviewForm(false);
      fetchReviews(selectedProduct.id);
      toast.success("¡Gracias por tu opinión!");
    } catch (err) {
      console.error("Error submitting review:", err);
      toast.error("Error al enviar reseña");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleWhatsApp = (product) => {
    const message = `Hola LP Mueblería! Me interesa el producto: ${product.modelo} (${product.codigo})`;
    const url = `https://wa.me/528718784462?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#1c1917] font-sans selection:bg-[#eab308]/20">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 border-b border-black/5 bg-white/80 backdrop-blur-xl`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img
              src={`${BACKEND_URL}/static/logo.jpg`}
              alt="LP Mueblería de Jalisco"
              className="h-14 w-auto object-contain rounded-lg"
            />
            <div className="leading-none hidden sm:block">
              <span className="block text-lg font-black tracking-tighter uppercase">Mueblería</span>
              <span className="text-[10px] text-[#eab308] font-black tracking-[4px] uppercase">De Jalisco</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-10 text-sm font-bold uppercase tracking-widest text-[#44403c]">
            <a href="#" className="hover:text-[#eab308] transition-colors">Inicio</a>
            <a href="#catalogo" className="hover:text-[#eab308] transition-colors">Catálogo</a>
            <a href="#nosotros" className="hover:text-[#eab308] transition-colors">Nosotros</a>
            <a href="#ubicacion" className="px-6 py-2.5 bg-black text-white rounded-full hover:bg-[#eab308] transition-all hover:shadow-lg ">Ubicación</a>
          </div>

          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-24 px-8 flex flex-col space-y-8 animate-in slide-in-from-top duration-300">
          <a href="#" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase">Inicio</a>
          <a href="#catalogo" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase text-[#eab308]">Catálogo</a>
          <a href="#nosotros" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase">Nosotros</a>
          <a href="#ubicacion" onClick={() => setIsMenuOpen(false)} className="text-2xl font-black uppercase">Ubicación</a>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden bg-[#0c0a09]">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?q=80&w=2070&auto=format&fit=crop"
            className="w-full h-full object-cover opacity-60 scale-105"
            alt="Luxury Sofa"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#0c0a09] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl px-6 text-center text-white">
          <span className="inline-block px-4 py-1.5 mb-6 bg-[#eab308] text-black text-[10px] font-black uppercase tracking-[5px] rounded-full animate-in fade-in slide-in-from-bottom duration-700">
            Colección 2026
          </span>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-none animate-in fade-in slide-in-from-bottom duration-1000">
            CONFORT QUE <br />
            <span className="text-[#eab308]">DEFINE TU CLASE.</span>
          </h1>
          <p className="text-lg md:text-xl text-[#d6d3d1] mb-12 max-w-2xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
            Descubre nuestra exclusiva selección de salas y recámaras diseñadas para los gustos más exigentes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
            <a href="#catalogo" className="w-full sm:w-auto px-10 py-5 bg-[#eab308] text-black font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-white hover:scale-105 transition-all shadow-2xl shadow-[#eab308]/20 group">
              Explorar Catálogo <ArrowRight className="inline-block ml-2 group-hover:translate-x-2 transition-transform" size={18} />
            </a>
            <button
              onClick={() => {
                setShowOffersOnly(true);
                document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-10 py-5 bg-white/10 backdrop-blur-md text-white font-black uppercase tracking-widest text-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all"
            >
              Ver Ofertas
            </button>
          </div>
        </div>
      </section>

      {/* Special Offers Carousel */}
      {offerProducts.length > 0 && (
        <section className="bg-white py-24 overflow-hidden border-b border-black/5">
          <div className="max-w-7xl mx-auto px-6 mb-12 flex justify-between items-end">
            <div>
              <span className="text-[#eab308] text-[10px] font-black uppercase tracking-[4px] block mb-2">Promociones</span>
              <h2 className="text-4xl font-black tracking-tighter uppercase">Ofertas Imperdibles</h2>
            </div>
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => document.getElementById('offer-scroll').scrollBy({ left: -400, behavior: 'smooth' })}
                className="p-4 rounded-full border border-black/10 hover:bg-black hover:text-white transition-all shadow-xl shadow-black/5"
              >
                <ChevronRight className="rotate-180" size={20} />
              </button>
              <button
                onClick={() => document.getElementById('offer-scroll').scrollBy({ left: 400, behavior: 'smooth' })}
                className="p-4 rounded-full border border-black/10 hover:bg-black hover:text-white transition-all shadow-xl shadow-black/5"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div
            id="offer-scroll"
            className="max-w-7xl mx-auto px-6 flex gap-8 overflow-x-auto pb-8 snap-x snap-mandatory no-scrollbar"
          >
            {offerProducts.map(p => (
              <div
                key={`offer-${p.id}`}
                className="min-w-[85%] md:min-w-[45%] lg:min-w-[30%] snap-center group/card cursor-pointer"
                onClick={() => setSelectedProduct(p)}
              >
                <div className="relative aspect-square rounded-[3rem] overflow-hidden bg-[#f5f5f4] mb-6 shadow-2xl transition-all duration-700 group-hover/card:shadow-[#eab308]/20">
                  <div className="absolute top-6 left-6 z-10 px-6 py-2 bg-red-600 text-white text-[11px] font-black uppercase tracking-[3px] rounded-full shadow-xl animate-pulse">
                    Mega Oferta
                  </div>
                  {p.imagen_url ? (
                    <img
                      src={p.imagen_url}
                      alt={p.modelo}
                      className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-1000"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-12 opacity-20">
                      <ShoppingBag size={64} className="mb-4" />
                    </div>
                  )}
                  <DiscountBadge percentage={calculateDiscount(p.precio_etiqueta, p.precio_lista)} />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 flex items-end p-10">
                    <button className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-[#eab308] transition-colors">
                      Ver Detalles
                    </button>
                  </div>
                </div>
                <div className="px-2">
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-1 truncate">{p.modelo}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-[#eab308]">${p.precio_lista.toLocaleString()}</span>
                    {p.precio_etiqueta > p.precio_lista && (
                      <span className="text-lg font-black text-red-600 line-through">${p.precio_etiqueta.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catalog Main */}
      <main id="catalogo" className="max-w-7xl mx-auto px-6 py-24">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 border-b border-black/5 pb-12">
          <div>
            <h2 className="text-3xl font-black tracking-tighter mb-2 uppercase">Catálogo de Productos</h2>
            <div className="flex items-center space-x-3">
              <p className="text-[#57534e] font-medium">Mostrando {filteredProducts.length} piezas exclusivas</p>
              {showOffersOnly && (
                <button
                  onClick={() => setShowOffersOnly(false)}
                  className="px-3 py-1 bg-[#eab308]/10 text-[#eab308] text-[9px] font-black uppercase tracking-widest rounded-full border border-[#eab308]/20 hover:bg-[#eab308]/20 transition-all flex items-center gap-2"
                >
                  <X size={10} /> Quitar Filtro de Ofertas
                </button>
              )}
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a8a29e] group-hover:text-[#eab308] transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar modelo o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-6 py-3.5 bg-white border border-[#e7e5e4] rounded-2xl w-full md:w-80 text-sm focus:outline-none focus:border-[#eab308] focus:ring-4 focus:ring-[#eab308]/5 transition-all shadow-sm"
              />
            </div>

            {/* Categories */}
            <div className="flex overflow-x-auto pb-2 gap-2 custom-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeCategory === cat
                    ? 'bg-black text-white border-black shadow-xl shadow-black/10'
                    : 'bg-white text-[#78716c] border-[#e7e5e4] hover:border-[#eab308] hover:text-[#eab308]'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse space-y-4">
                <div className="aspect-4/5 bg-[#f5f5f4] rounded-3xl" />
                <div className="h-6 w-1/2 bg-[#f5f5f4] rounded-full" />
                <div className="h-4 w-1/3 bg-[#f5f5f4] rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredProducts.map((p, idx) => (
              <div
                key={p.codigo}
                className="group relative cursor-pointer animate-in fade-in slide-in-from-bottom duration-700 h-full flex flex-col"
                style={{ transitionDelay: `${idx * 50}ms` }}
                onClick={() => setSelectedProduct(p)}
              >
                {/* Image Container */}
                <div className="relative overflow-hidden aspect-square bg-[#f5f5f4] rounded-[2.5rem] mb-6 group-hover:shadow-2xl transition-all duration-700">
                  {p.is_offer === 1 && (
                    <div className="absolute top-4 left-4 z-10 px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[2px] rounded-full shadow-lg animate-pulse">
                      Oferta
                    </div>
                  )}
                  {p.imagen_url ? (
                    <img
                      src={p.imagen_url}
                      alt={p.modelo}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center opacity-20">
                      <ShoppingBag size={64} className="mb-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Sin imagen disponible</span>
                    </div>
                  )}

                  <DiscountBadge percentage={calculateDiscount(p.precio_etiqueta, p.precio_lista)} />

                  {/* Stock Badge */}
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest z-10 ${p.stock > 0 ? 'bg-black/60 text-white backdrop-blur-md' : 'bg-red-600 text-white shadow-lg animate-pulse'
                    }`}>
                    {p.stock > 0 ? `Stock Disponible` : 'Agotado'}
                  </div>

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center gap-3">
                    <button className="p-4 bg-white text-black rounded-2xl hover:scale-110 transition-transform hover:bg-[#eab308]">
                      <Search size={20} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleWhatsApp(p); }}
                      className="p-4 bg-[#eab308] text-black rounded-2xl hover:scale-110 transition-transform hover:bg-white"
                    >
                      <MessageCircle size={20} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="px-2 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-black tracking-tight text-[#1c1917] hover:text-[#eab308] transition-colors leading-tight">{p.modelo}</h3>
                  </div>
                  <p className="text-[10px] text-[#a8a29e] uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                    <Package size={12} className="text-[#eab308]" /> {p.codigo} • {p.tamano}
                  </p>

                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-black/5">
                    <div>
                      <p className="text-xs font-bold text-[#a8a29e] uppercase tracking-tighter">Precio Contado</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-black text-black tracking-tighter">${p.precio_lista.toLocaleString()}</p>
                        {p.precio_etiqueta > p.precio_lista && (
                          <span className="text-sm font-black text-red-600 line-through">${p.precio_etiqueta.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-[#eab308] uppercase tracking-tighter">ó 12 Meses de</p>
                      <p className="text-lg font-black text-black tracking-tighter truncate">${(p.precio_msi / 12).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProducts.length === 0 && !loading && (
          <div className="py-40 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-[#f5f5f4] rounded-full flex items-center justify-center mb-6 text-[#a8a29e]">
              <Search size={40} />
            </div>
            <h3 className="text-2xl font-black uppercase mb-2 leading-none">Sin Resultados</h3>
            <p className="text-[#a8a29e] font-medium">No encontramos ningún mueble que coincida con tu búsqueda.</p>
            <button onClick={() => { setSearchQuery(''); setActiveCategory('Todos') }} className="mt-8 text-[#eab308] font-black uppercase text-sm border-b-2 border-[#eab308] pb-1 hover:text-black hover:border-black transition-all">Limpiar Filtros</button>
          </div>
        )}
      </main>

      {/* About Us Section */}
      <section id="nosotros" className="bg-[#1c1917] text-white py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="relative">
            <div className="relative aspect-4/5 rounded-[3rem] overflow-hidden shadow-2xl z-10 bg-[#292524]">
              {!historyImageError && (
                <img
                  src="https://images.unsplash.com/photo-1574015974293-817f09bc1990?q=80&w=1964&auto=format&fit=crop"
                  className="w-full h-full object-cover"
                  alt=""
                  onError={() => setHistoryImageError(true)}
                />
              )}
            </div>
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-[#eab308] rounded-[3rem] flex items-center justify-center p-12 text-black shadow-2xl z-20">
              <div className="text-center">
                <p className="text-4xl font-black mb-2 uppercase tracking-tighter">Gran</p>
                <p className="text-xs font-black uppercase tracking-[3px]">Apertura<br />2026</p>
              </div>
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-right duration-1000">
            <span className="inline-block px-4 py-1.5 mb-6 bg-[#eab308]/10 text-[#eab308] text-[10px] font-black uppercase tracking-[5px] rounded-full">
              Nuestra Historia
            </span>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-none uppercase">
              Pasión por el <br />
              <span className="text-[#eab308]">Diseño Exclusivo.</span>
            </h2>
            <div className="space-y-6 text-lg text-[#a8a29e] font-medium leading-relaxed">
              <p>
                En **LP Mueblería de Jalisco**, abrimos nuestras puertas para traerte lo último en tendencias de diseño de interiores. Nuestra pasión es transformar espacios cotidianos en santuarios de confort.
              </p>
              <p>
                Iniciamos este camino con una misión simple: ofrecer piezas con diseños vanguardistas y calidad insuperable. Cada sala, recámara y comedor de nuestra colección inaugural ha sido seleccionada cuidadosamente.
              </p>
              <ul className="grid grid-cols-2 gap-6 pt-8 text-white font-black uppercase tracking-widest text-[10px]">
                <li className="flex items-center gap-3"><div className="w-2 h-2 bg-[#eab308] rounded-full" /> Calidad de Exportación</li>
                <li className="flex items-center gap-3"><div className="w-2 h-2 bg-[#eab308] rounded-full" /> Diseños Exclusivos</li>
                <li className="flex items-center gap-3"><div className="w-2 h-2 bg-[#eab308] rounded-full" /> Atención Personalizada</li>
                <li className="flex items-center gap-3"><div className="w-2 h-2 bg-[#eab308] rounded-full" /> Entregas Seguras</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section id="ubicacion" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 mb-6 bg-[#eab308]/10 text-[#eab308] text-[10px] font-black uppercase tracking-[5px] rounded-full">
              ¡Visítanos hoy!
            </span>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-none uppercase">Nuestra Ubicación</h2>
            <p className="text-[#57534e] text-lg font-medium">Visita nuestra sala de exhibición principal</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-stretch">
            <div className="col-span-1 lg:col-span-2 rounded-[3.5rem] overflow-hidden shadow-2xl border-8 border-[#f5f5f4] min-h-[500px]">
              <iframe
                src="https://maps.google.com/maps?q=25.546722,-103.356972&z=17&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex-1 p-10 bg-[#f5f5f4] rounded-[2.5rem] hover:bg-black hover:text-white transition-all duration-500 group">
                <div className="w-14 h-14 bg-[#eab308] rounded-2xl flex items-center justify-center text-black mb-8 group-hover:scale-110 transition-transform">
                  <Package size={28} />
                </div>
                <h4 className="text-2xl font-black uppercase mb-4 tracking-tighter">Dirección</h4>
                <p className="font-bold text-[#57534e] group-hover:text-[#a8a29e] uppercase tracking-wider leading-relaxed">
                  Av. Juárez S/N Oriente<br />
                  Col. Centro, Torreón Coah.<br />
                  CP 27000
                </p>
              </div>

              <div className="p-10 bg-[#eab308] rounded-[2.5rem] text-black">
                <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white mb-8">
                  <Clock size={28} />
                </div>
                <h4 className="text-2xl font-black uppercase mb-4 tracking-tighter">Horarios</h4>
                <div className="space-y-2 font-black uppercase tracking-widest text-[10px]">
                  <div className="flex justify-between border-b border-black/10 pb-2">
                    <span>Lunes - Viernes</span>
                    <span>10:00 - 20:00</span>
                  </div>
                  <div className="flex justify-between border-b border-black/10 pb-2">
                    <span>Sábado</span>
                    <span>10:00 - 17:00</span>
                  </div>
                  <div className="flex justify-between text-black/50">
                    <span>Domingo</span>
                    <span>10:00 - 14:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-4xl overflow-hidden relative shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-20 duration-500 flex flex-col md:flex-row">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-6 right-6 z-100 p-3 bg-white/90 backdrop-blur-md text-black rounded-full hover:bg-[#eab308] hover:text-black transition-all shadow-xl border border-black/5 active:scale-95"
            >
              <X size={20} />
            </button>

            {/* Image Side */}
            <div className="w-full md:w-1/2 bg-[#f5f5f4] overflow-hidden">
              {selectedProduct.imagen_url ? (
                <img src={selectedProduct.imagen_url} className="w-full h-full object-cover" alt={selectedProduct.modelo} />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-10">
                  <ShoppingBag size={120} />
                </div>
              )}
              <div className="absolute bottom-10 left-10">
                <DiscountBadge percentage={calculateDiscount(selectedProduct.precio_etiqueta, selectedProduct.precio_lista)} size="lg" />
              </div>
            </div>

            {/* Content Side */}
            <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex-1">
                <span className="inline-block px-4 py-1 bg-[#eab308]/10 text-[#eab308] text-[10px] font-black uppercase tracking-widest rounded-full mb-6">Detalles del Producto</span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 uppercase leading-[0.9]">{selectedProduct.modelo}</h2>
                <div className="flex items-center gap-6 mb-8 text-[10px] font-black uppercase tracking-[4px] text-[#a8a29e]">
                  <span>REF: {selectedProduct.codigo}</span>
                  <span>TAMAÑO: {selectedProduct.tamano}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="p-5 bg-[#f5f5f4] rounded-4xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#a8a29e] mb-1">Pago de Contado</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-black tracking-tighter text-black">${selectedProduct.precio_lista.toLocaleString()}</p>
                      {selectedProduct.precio_etiqueta > selectedProduct.precio_lista && (
                        <span className="text-sm font-black text-red-600 line-through opacity-60">${selectedProduct.precio_etiqueta.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-5 bg-black text-white rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#eab308] mb-1">Precio a 12 MSI</p>
                    <p className="text-2xl font-black tracking-tighter text-[#eab308]">${selectedProduct.precio_msi.toLocaleString()}</p>
                  </div>
                </div>

                {/* Blueroom Tabs System */}
                <div className="mt-10 border-t border-[#f5f5f4] pt-8">
                  <div className="flex gap-8 border-b border-[#f5f5f4] mb-8 overflow-x-auto no-scrollbar">
                    {['descripcion', 'dimensiones', 'caracteristicas', 'opiniones'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                          activeTab === tab ? 'text-black' : 'text-[#a8a29e] hover:text-black'
                        }`}
                      >
                        {tab === 'caracteristicas' ? 'Características' : tab}
                        {activeTab === tab && (
                          <div className="absolute bottom-0 left-0 w-full h-1 bg-[#eab308] animate-in slide-in-from-left duration-300" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {activeTab === 'descripcion' && (
                      <div className="space-y-4">
                        <p className="text-[#57534e] text-lg leading-relaxed italic font-serif">
                          {selectedProduct.descripcion || "Dale un toque natural y sofisticado a tu espacio con este modelo exclusivo diseñado para brindar armonía, funcionalidad y estilo a tu hogar."}
                        </p>
                        <ul className="space-y-3 mt-6">
                           <li className="flex items-center gap-3 text-sm font-bold uppercase tracking-tight text-[#a8a29e]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#eab308]" />
                            Envío disponible a todo Torreón y alrededores
                          </li>
                          <li className="flex items-center gap-3 text-sm font-bold uppercase tracking-tight text-[#a8a29e]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#eab308]" />
                            Entrega inmediata según stock
                          </li>
                        </ul>
                      </div>
                    )}

                    {activeTab === 'dimensiones' && (
                      <div className="bg-[#f5f5f4] p-8 rounded-[2rem] border border-black/5">
                        <h5 className="text-xs font-black uppercase tracking-[3px] mb-4 text-[#a8a29e]">Medidas Detalladas</h5>
                        <p className="text-2xl font-black uppercase tracking-tighter">
                          {selectedProduct.dimensiones || "Consulte dimensiones específicas con un asesor."}
                        </p>
                      </div>
                    )}

                    {activeTab === 'caracteristicas' && (
                      <div className="space-y-6">
                         <div>
                          <h5 className="text-[10px] font-black uppercase tracking-widest mb-3 text-[#eab308]">Incluye:</h5>
                          <p className="text-[#57534e] font-medium leading-relaxed">
                            {selectedProduct.caracteristicas || "Materiales de alta gama y acabados premium."}
                          </p>
                        </div>
                        <div className="p-6 bg-[#f5f5f4] rounded-2xl">
                           <p className="text-[10px] font-black uppercase tracking-widest text-[#a8a29e] mb-2">Nota Importante:</p>
                           <p className="text-[10px] font-bold text-[#57534e] uppercase leading-relaxed tracking-wider">
                            * Las imágenes son ilustrativas. Debido a la naturaleza de los materiales, los tonos, vetas y acabados pueden variar ligeramente.
                           </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'opiniones' && (
                      <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center bg-[#f5f5f4] p-6 rounded-3xl">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#a8a29e] mb-1">Calificación Promedio</p>
                            <div className="flex items-center gap-2">
                              <span className="text-3xl font-black">{reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.calificacion, 0) / reviews.length).toFixed(1) : '5.0'}</span>
                              <div className="flex text-[#eab308]">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={16} fill={i < Math.round(reviews.reduce((acc, r) => acc + r.calificacion, 0) / (reviews.length || 1)) ? "currentColor" : "none"} />
                                ))}
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-[#a8a29e] uppercase mt-1 tracking-wider">{reviews.length} opiniones de clientes</p>
                          </div>
                          {!showReviewForm && (
                            <button 
                              onClick={() => setShowReviewForm(true)}
                              className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#eab308] hover:text-black transition-all"
                            >
                              Escribir Opinión
                            </button>
                          )}
                        </div>

                        {showReviewForm && (
                          <form onSubmit={submitReview} className="p-8 bg-[#f5f5f4] rounded-4xl border-2 border-[#eab308]/20 animate-in zoom-in-95 duration-300">
                            <h5 className="text-xs font-black uppercase tracking-[3px] mb-6">Comparte tu experiencia</h5>
                            <div className="space-y-4">
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#a8a29e] mb-2 block">Tu Nombre</label>
                                <input 
                                  required
                                  value={newReview.cliente_nombre}
                                  onChange={(e) => setNewReview({...newReview, cliente_nombre: e.target.value})}
                                  className="w-full bg-white border border-black/5 rounded-xl p-4 text-sm focus:outline-none focus:border-[#eab308] transition-all"
                                  placeholder="Ej: Juan Pérez"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#a8a29e] mb-2 block">Calificación</label>
                                <div className="flex gap-2">
                                  {[1,2,3,4,5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setNewReview({...newReview, calificacion: star})}
                                      className="transition-transform active:scale-90"
                                    >
                                      <Star size={24} fill={star <= newReview.calificacion ? "#eab308" : "none"} className={star <= newReview.calificacion ? "text-[#eab308]" : "text-[#a8a29e]"} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#a8a29e] mb-2 block">Tu Comentario</label>
                                <textarea 
                                  required
                                  value={newReview.comentario}
                                  onChange={(e) => setNewReview({...newReview, comentario: e.target.value})}
                                  className="w-full bg-white border border-black/5 rounded-xl p-4 text-sm focus:outline-none focus:border-[#eab308] transition-all min-h-[100px] resize-none"
                                  placeholder="¿Qué te pareció el producto?"
                                />
                              </div>
                              <div className="flex gap-3">
                                <button
                                  type="submit"
                                  disabled={submittingReview}
                                  className="flex-1 py-4 bg-[#eab308] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black hover:text-white transition-all disabled:opacity-50"
                                >
                                  {submittingReview ? 'Enviando...' : 'Publicar mi opinión'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowReviewForm(false)}
                                  className="px-6 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </form>
                        )}

                        <div className="space-y-6">
                          {reviewLoading ? (
                            <div className="flex justify-center py-10">
                              <div className="w-8 h-8 border-4 border-[#eab308] border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : reviews.length > 0 ? (
                            reviews.map((rev) => (
                              <div key={rev.id} className="p-8 bg-[#f5f5f4] rounded-4xl border border-black/5 group hover:border-[#eab308]/30 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <p className="font-black uppercase tracking-tighter text-lg leading-none">{rev.cliente_nombre}</p>
                                    <div className="flex text-[#eab308] mt-2">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={12} fill={i < rev.calificacion ? "currentColor" : "none"} />
                                      ))}
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-widest">
                                    {new Date(rev.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                                <p className="text-[#57534e] leading-relaxed italic font-serif">"{rev.comentario}"</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-20 px-6 bg-[#f5f5f4] rounded-4xl border-2 border-dashed border-[#a8a29e]/20">
                              <Star className="w-12 h-12 text-[#eab308] mx-auto mb-4 opacity-20" />
                              <p className="text-xs font-black uppercase tracking-widest text-[#a8a29e]">Este producto aún no tiene opiniones</p>
                              <p className="text-[10px] font-bold text-[#a8a29e]/60 uppercase mt-2 italic tracking-wider">Sé el primero en compartir tu experiencia</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleWhatsApp(selectedProduct)}
                className="w-full mt-12 py-5 bg-black text-white font-black uppercase tracking-widest rounded-2xl hover:bg-[#eab308] hover:text-black transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 group"
              >
                <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                Consultar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Button */}
      <div className="fixed bottom-10 right-10 z-100 flex flex-col items-end gap-3 group">
        {showWAMessage && (
          <div className="bg-white text-black p-5 rounded-3xl shadow-2xl border border-black/5 mb-2 animate-in slide-in-from-right duration-500 max-w-[280px] relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowWAMessage(false); }}
              className="absolute top-2 right-2 text-slate-400 hover:text-black transition-colors"
            >
              <X size={14} />
            </button>
            <div className="flex gap-3 items-start">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0 shadow-lg">
                <MessageCircle size={20} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1">En línea ahora</p>
                <p className="text-sm font-bold leading-tight">¡Hola! 👋 ¿Buscas algo para tu hogar? Chatea con nosotros.</p>
              </div>
            </div>
            {/* Pop-up tail */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r border-b border-black/5 rotate-45" />
          </div>
        )}
        <button
          onClick={() => {
            const message = "Hola LP Mueblería! Me gustaría recibir atención personalizada.";
            const url = `https://wa.me/528718784462?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
          }}
          className="p-6 bg-green-500 text-white rounded-full shadow-2xl hover:bg-green-600 hover:scale-110 transition-all group relative duration-500"
        >
          <MessageCircle size={32} />
          {/* Animated Glow */}
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20 pointer-events-none" />
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-[#0c0a09] text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-16 mb-24 border-b border-white/5 pb-24">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-3 mb-8">
              <img src={`${BACKEND_URL}/static/logo.jpg`} className="h-12 w-auto object-contain rounded-md" alt="LP Mueblería" />
              <div className="leading-none text-white">
                <span className="block text-lg font-black tracking-tighter uppercase">Mueblería</span>
                <span className="text-[10px] text-[#eab308] font-black tracking-[4px] uppercase">De Jalisco</span>
              </div>
            </div>
            <p className="text-[#a8a29e] text-sm leading-relaxed mb-6 font-medium">
              Llevando el confort y estilo a los hogares de México por generaciones. Piezas seleccionadas a mano para tu total satisfacción.
            </p>
            <div className="flex gap-4">
              <a href="https://www.facebook.com/profile.php?id=61588011514265" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#eab308] hover:text-black transition-all"><Facebook size={18} /></a>
              <a href="https://www.instagram.com/lpmuebleriajalisco" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#eab308] hover:text-black transition-all"><Instagram size={18} /></a>
              <a href="tel:+528718784462" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#eab308] hover:text-black transition-all"><Phone size={18} /></a>
            </div>
          </div>

          <div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-8 text-[#eab308]">Menú</h4>
            <ul className="space-y-4 text-sm font-bold text-[#a8a29e] uppercase tracking-widest">
              <li><a href="#" className="hover:text-white transition-colors">Inicio</a></li>
              <li><a href="#catalogo" className="hover:text-white transition-colors">Nuestro Catálogo</a></li>
              <li><button onClick={() => { setActiveCategory('Recamara'); window.location.href = '#catalogo' }} className="hover:text-white transition-colors">Recámaras</button></li>
              <li><button onClick={() => { setActiveCategory('Sala'); window.location.href = '#catalogo' }} className="hover:text-white transition-colors">Salas Luxury</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-8 text-[#eab308]">Legales</h4>
            <ul className="space-y-4 text-sm font-bold text-[#a8a29e] uppercase tracking-widest">
              <li><a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Políticas de Envío</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Aviso de Privacidad</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Garantías</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-8 text-[#eab308]">Ubicación</h4>
            <p className="text-[#a8a29e] text-sm leading-relaxed font-bold uppercase tracking-wider">
              Av. Juárez #1234 Oriente<br />
              Col. Centro, Torreón Coah.<br />
              CP 27000
            </p>
            <div className="mt-8">
              <p className="text-[10px] font-black text-[#eab308] uppercase tracking-[4px]">Horarios</p>
              <p className="text-sm font-bold text-white mt-1 uppercase tracking-widest">Lun - Vie: 10AM - 8PM</p>
              <p className="text-sm font-bold text-white mt-1 uppercase tracking-widest">Sáb: 10AM - 5PM | Dom: 10AM - 2PM</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center text-[10px] font-black text-white/20 uppercase tracking-[5px]">
          &copy; 2026 LP MUEBLERÍA DE JALISCO. TODOS LOS DERECHOS RESERVADOS.
        </div>
      </footer>
    </div>
  );
}

export default Catalog;

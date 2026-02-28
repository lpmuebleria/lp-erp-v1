import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Search,
    Plus,
    Trash2,
    User,
    Phone,
    Mail,
    FileText,
    CheckCircle2,
    ShoppingCart,
    Calculator,
    Loader2,
    Calendar,
    Tag,
    Clock,
    FileSpreadsheet,
    MapPin,
    AlertTriangle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function Sales({ vendedor }) {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Global Cart State (Persisted)
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem('lp_erp_cart');
        return saved ? JSON.parse(saved) : [];
    });

    const [customer, setCustomer] = useState(() => {
        const saved = localStorage.getItem('lp_erp_customer');
        return saved ? JSON.parse(saved) : { nombre: '', tel: '', email: '' };
    });
    // Tab Types: COTIZACION, VENTA_STOCK, PEDIDO_FABRICACION, APARTADO
    const [status, setStatus] = useState('COTIZACION');

    // Payment & Billing State
    const [payment, setPayment] = useState({ monto: 0, metodo: 'efectivo', referencia: '' });
    const [billing, setBilling] = useState({
        requiere_factura: false,
        rfc: '', razon: '', cp: '', regimen: '', uso_cfdi: '',
        metodo_pago: 'PUE', forma_pago: '01'
    });

    // Shipping State
    const [shipping, setShipping] = useState({
        cp: '',
        colonia: '',
        costo: 0,
        isCustom: false,
        errorMsg: ''
    });

    // Delivery State
    const [delivery, setDelivery] = useState({ fecha: '', turno: 'MANANA' });

    // Promos
    const [promotions, setPromotions] = useState([]);
    const [selectedPromoId, setSelectedPromoId] = useState('');

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);

    // Fetch promos once
    useEffect(() => {
        axios.get(`${API_URL}/promotions`)
            .then(res => setPromotions(res.data.filter(p => p.is_active)))
            .catch(console.error);
    }, []);

    // Persist cart
    useEffect(() => {
        localStorage.setItem('lp_erp_cart', JSON.stringify(cart));
    }, [cart]);

    // Persist customer
    useEffect(() => {
        localStorage.setItem('lp_erp_customer', JSON.stringify(customer));
    }, [customer]);

    useEffect(() => {
        if (searchTerm.length > 2) {
            axios.get(`${API_URL}/products`, { params: { q: searchTerm } })
                .then(res => setProducts(res.data))
                .catch(err => console.error(err));
        } else {
            setProducts([]);
        }
    }, [searchTerm]);

    const addToCart = (product) => {
        const existing = cart.find(item => item.product_id === product.id);
        if (existing) {
            setCart(cart.map(item =>
                item.product_id === product.id
                    ? { ...item, cantidad: item.cantidad + 1, total_linea: (item.cantidad + 1) * item.precio_unit }
                    : item
            ));
        } else {
            setCart([...cart, {
                product_id: product.id,
                modelo: product.modelo,
                codigo: product.codigo,
                cantidad: 1,
                precio_unit: product.precio_lista,
                total_linea: product.precio_lista,
                descuento_manual: 0 // In dollars
            }]);
        }
        setSearchTerm('');
        setProducts([]);
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.product_id !== id));
    };

    const updateQty = (id, val) => {
        const qty = parseInt(val) || 0;
        setCart(cart.map(item =>
            item.product_id === id
                ? { ...item, cantidad: qty, total_linea: qty * item.precio_unit }
                : item
        ));
    };

    const updateDiscount = (id, val) => {
        const desc = parseFloat(val) || 0;
        setCart(cart.map(item =>
            item.product_id === id
                ? { ...item, descuento_manual: desc }
                : item
        ));
    };

    // --- Calculations ---
    const subtotal = cart.reduce((acc, item) => acc + item.total_linea, 0);
    const sumDescuentosManuales = cart.reduce((acc, item) => acc + (item.descuento_manual * item.cantidad), 0);

    let activePromo = null;
    let descGlobalVal = 0;
    if (status === 'COTIZACION' && selectedPromoId) {
        activePromo = promotions.find(p => p.id === parseInt(selectedPromoId));
        if (activePromo) {
            descGlobalVal = subtotal * (activePromo.discount_pct / 100);
        }
    }

    const baseTotal = Math.max(0, subtotal - sumDescuentosManuales - descGlobalVal);
    const shippingAmount = parseFloat(shipping.costo) || 0;
    const ivaAmount = billing.requiere_factura ? baseTotal * 0.16 : 0;
    const total = baseTotal + shippingAmount + ivaAmount;

    // --- Actions ---
    const handleCpLookup = async () => {
        if (!shipping.cp || shipping.cp.length < 4) return;
        try {
            const res = await axios.get(`${API_URL}/shipping/lookup/${shipping.cp}`);
            setShipping({
                ...shipping,
                colonia: res.data.colonia,
                costo: res.data.costo,
                isCustom: false,
                errorMsg: ''
            });
        } catch (error) {
            setShipping({
                ...shipping,
                colonia: 'No encontrado',
                costo: 0,
                isCustom: true,
                errorMsg: 'Bajo cotización y disponibilidad'
            });
        }
    };

    const handleSave = async () => {
        if (cart.length === 0) return alert("El carrito está vacío");
        if (!customer.nombre) return alert("Ingrese el nombre del cliente");
        if (!customer.tel && status !== 'COTIZACION') return alert("El teléfono es obligatorio para ventas/pedidos.");

        setLoading(true);
        // Prefix based on the new types
        let prefix = 'COT';
        if (status === 'VENTA_STOCK') prefix = 'VS';
        if (status === 'PEDIDO_FABRICACION') prefix = 'PF';
        if (status === 'APARTADO') prefix = 'APT';

        // Min deposit validation
        if (status === 'PEDIDO_FABRICACION' || status === 'APARTADO') {
            const minDeposit = total * 0.30;
            if (payment.monto < minDeposit) {
                setLoading(false);
                return alert(`El anticipo mínimo es del 30% ($${minDeposit.toLocaleString()})`);
            }
        }

        const payload = {
            folio: `${prefix}-${Date.now()}`,
            vendedor,
            total: baseTotal, // Backend adds IVA if requested
            status: status === 'COTIZACION' ? 'COTIZACION' : 'REGISTRADO',
            tipo: status,
            cliente_nombre: customer.nombre,
            cliente_tel: customer.tel,
            cliente_email: customer.email,
            monto_pago: status !== 'COTIZACION' ? payment.monto : 0,
            metodo_pago: payment.metodo,
            referencia: payment.referencia,
            lines: cart,
            promo_id: selectedPromoId || null,
            descuento_global_val: descGlobalVal,
            // Delivery
            entrega_fecha: status === 'VENTA_STOCK' ? delivery.fecha : null,
            entrega_turno: status === 'VENTA_STOCK' ? delivery.turno : null,
            cp_envio: shipping.cp,
            costo_envio: parseFloat(shipping.costo) || 0,
            // Billing
            requiere_factura: billing.requiere_factura,
            factura_rfc: billing.rfc,
            factura_razon: billing.razon,
            factura_cp: billing.cp,
            factura_regimen: billing.regimen,
            factura_uso_cfdi: billing.uso_cfdi,
            factura_metodo_pago: billing.metodo_pago,
            factura_forma_pago: billing.forma_pago
        };

        try {
            // Re-using quotes endpoint for now
            const res = await axios.post(`${API_URL}/quotes`, payload);
            setSuccess({ folio: res.data.folio, id: res.data.id });
            setCart([]);
            setCustomer({ nombre: '', tel: '', email: '' });
            setPayment({ monto: 0, metodo: 'efectivo', referencia: '' });
        } catch (error) {
            alert("Error al guardar: " + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                    <CheckCircle2 size={64} />
                </div>
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">¡Registro Exitoso!</h2>
                    <p className="text-slate-400 mt-2">Se ha generado el folio: <span className="text-premium-gold font-mono">{success.folio}</span></p>
                </div>
                <div className="flex space-x-4">
                    <button
                        onClick={() => setSuccess(null)}
                        className="bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-xl transition-all"
                    >
                        Nueva Venta
                    </button>
                    <button
                        onClick={() => window.open(`${API_URL}/quotes/${success.id}/pdf`, '_blank')}
                        className="bg-premium-gold text-black font-black px-8 py-3 rounded-xl hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
                    >
                        Imprimir PDF
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 1. Cliente (Ancho completo) */}
            <section className="bg-premium-slate/50 p-6 rounded-[30px] border border-white/5 shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                    <User className="text-premium-gold" size={24} />
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Datos del Cliente</h3>
                    <span className="bg-red-500/10 text-red-400 text-[10px] uppercase font-black px-2 py-1 rounded-lg ml-2">Obligatorio</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2">Nombre Completo</label>
                        <input
                            type="text"
                            value={customer.nombre}
                            onChange={(e) => setCustomer({ ...customer, nombre: e.target.value })}
                            placeholder="Nombre del cliente..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-premium-gold/50 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2">Teléfono</label>
                        <div className="relative">
                            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={customer.tel}
                                onChange={(e) => setCustomer({ ...customer, tel: e.target.value })}
                                placeholder="Ej. 871..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-9 text-sm text-white focus:outline-none focus:border-premium-gold/50 transition-all"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2">Email (Opcional)</label>
                        <div className="relative">
                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="email"
                                value={customer.email}
                                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                                placeholder="cliente@ejemplo.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-9 text-sm text-white focus:outline-none focus:border-premium-gold/50 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Envío a Domicilio Section */}
            <section className="bg-premium-slate/50 p-6 rounded-[30px] border border-white/5 shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                    <MapPin className="text-premium-gold" size={24} />
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Envío a Domicilio</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2">Código Postal</label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={shipping.cp}
                                onChange={(e) => setShipping({ ...shipping, cp: e.target.value })}
                                onBlur={handleCpLookup}
                                placeholder="Ej. 27000"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-premium-gold/50 transition-all font-mono"
                            />
                            <button onClick={handleCpLookup} className="bg-premium-gold/20 text-premium-gold p-3 rounded-xl hover:bg-premium-gold/30 transition-colors">
                                <Search size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2">Colonia / Zona</label>
                        <input
                            type="text"
                            value={shipping.colonia}
                            readOnly={!shipping.isCustom}
                            onChange={(e) => setShipping({ ...shipping, colonia: e.target.value })}
                            placeholder="Autocompletado..."
                            className={`w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none transition-all ${!shipping.isCustom && 'opacity-70 cursor-not-allowed'}`}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2">Costo Envío</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                value={shipping.costo}
                                readOnly={!shipping.isCustom}
                                onChange={(e) => setShipping({ ...shipping, costo: parseFloat(e.target.value) || 0 })}
                                className={`w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-8 text-sm text-white font-mono focus:outline-none focus:border-premium-gold/50 transition-all ${!shipping.isCustom && 'opacity-70 cursor-not-allowed'}`}
                            />
                        </div>
                    </div>
                </div>
                {shipping.errorMsg && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 animate-in fade-in zoom-in duration-300">
                        <AlertTriangle className="text-red-400" size={20} />
                        <span className="text-red-300 text-sm font-bold uppercase tracking-wider">{shipping.errorMsg}</span>
                        <span className="text-xs text-red-400/70 ml-2">(Puede ingresar costo manualmente si lo desea)</span>
                    </div>
                )}
            </section>

            {/* 2. Pestañas de Tipo de Transacción (Ancho completo) */}
            <section className="bg-premium-slate p-6 rounded-[30px] border border-white/10 shadow-2xl ring-1 ring-white/5">
                <div className="flex items-center space-x-3 mb-4">
                    <FileSpreadsheet className="text-premium-gold" size={24} />
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Tipo de Transacción</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <TabButton active={status === 'COTIZACION'} onClick={() => setStatus('COTIZACION')} label="Cotización" color="premium-gold" />
                    <TabButton active={status === 'VENTA_STOCK'} onClick={() => setStatus('VENTA_STOCK')} label="Stock" color="blue-500" />
                    <TabButton active={status === 'PEDIDO_FABRICACION'} onClick={() => setStatus('PEDIDO_FABRICACION')} label="Fabricación" color="pink-500" />
                    <TabButton active={status === 'APARTADO'} onClick={() => setStatus('APARTADO')} label="Apartado" color="yellow-500" />
                </div>
            </section>

            {/* 3. Productos / Carrito + Pago / Totales */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left side: Products and Cart */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-premium-slate/50 p-6 rounded-[30px] border border-white/5 space-y-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <ShoppingCart className="text-premium-gold" size={20} />
                            <h3 className="text-xl font-bold text-white">Productos</h3>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Escribe el modelo o código para buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-premium-gold/50 transition-all text-white"
                            />
                            {products.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-premium-slate border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                                    {products.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => addToCart(p)}
                                            className="w-full p-4 flex justify-between items-center hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                        >
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white uppercase">{p.modelo}</p>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">{p.codigo} - {p.tamano}</p>
                                            </div>
                                            <span className="text-premium-gold font-black">${p.precio_lista.toLocaleString()}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-slate-500 border-b border-white/5 uppercase text-[10px] tracking-widest font-black">
                                        <th className="pb-3 px-2">Descripción</th>
                                        <th className="pb-3 px-2 w-20">Cant.</th>
                                        <th className="pb-3 px-2 text-right">Unitario</th>
                                        {status === 'COTIZACION' && <th className="pb-3 px-2 text-right w-24">Desc. ($)</th>}
                                        <th className="pb-3 px-2 text-right">Subtotal</th>
                                        <th className="pb-3 px-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {cart.map(item => (
                                        <tr key={item.product_id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="py-4 px-2">
                                                <p className="font-bold text-white uppercase">{item.modelo}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-mono">{item.codigo}</p>
                                            </td>
                                            <td className="py-4 px-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.cantidad}
                                                    onChange={(e) => updateQty(item.product_id, e.target.value)}
                                                    className="bg-white/5 border border-white/10 rounded-lg w-16 p-2 text-center text-white focus:outline-none focus:border-premium-gold transition-all"
                                                />
                                            </td>
                                            <td className="py-4 px-2 text-right text-slate-400 font-mono">
                                                ${item.precio_unit.toLocaleString()}
                                            </td>
                                            {status === 'COTIZACION' && (
                                                <td className="py-4 px-2 text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="100"
                                                        value={item.descuento_manual || 0}
                                                        onChange={(e) => updateDiscount(item.product_id, e.target.value)}
                                                        className="bg-red-500/10 border border-red-500/30 rounded-lg w-20 p-2 text-right text-red-400 focus:outline-none focus:border-red-500 transition-all text-xs font-mono"
                                                    />
                                                </td>
                                            )}
                                            <td className="py-4 px-2 text-right font-black text-premium-gold font-mono">
                                                ${(item.total_linea - (item.descuento_manual * item.cantidad)).toLocaleString()}
                                            </td>
                                            <td className="py-4 px-2 text-right">
                                                <button
                                                    onClick={() => removeFromCart(item.product_id)}
                                                    className="text-slate-600 hover:text-red-400 p-2 transition-colors rounded-lg hover:bg-red-400/10"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {cart.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="py-16 text-center text-slate-500 italic opacity-50">
                                                <ShoppingCart size={32} className="mx-auto mb-2 opacity-20" />
                                                No hay productos agregados al carrito
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* Right side: Summary, Payments, Delivery, Submit */}
                <div className="space-y-6">

                    {/* Delivery & Payment (Hidden on COTIZACION) */}
                    {status !== 'COTIZACION' && (
                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">

                            {/* DELIVERY SCHEDULE FOR STOCK SALES */}
                            {status === 'VENTA_STOCK' && (
                                <section className="bg-premium-slate/50 p-6 rounded-[30px] border border-white/5">
                                    <h4 className="text-sm font-black text-white uppercase mb-3 flex items-center"><Calendar size={16} className="mr-2 text-blue-500" /> Entrega</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Fecha</label>
                                            <input
                                                type="date"
                                                value={delivery.fecha}
                                                onChange={e => setDelivery({ ...delivery, fecha: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-premium-gold cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Turno</label>
                                            <select
                                                value={delivery.turno}
                                                onChange={e => setDelivery({ ...delivery, turno: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-premium-gold appearance-none font-bold cursor-pointer"
                                            >
                                                <option value="MANANA">MAÑANA (Max 5)</option>
                                                <option value="TARDE">TARDE (Max 5)</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* WARNING MESSAGES */}
                            {status === 'PEDIDO_FABRICACION' && (
                                <div className="bg-pink-500/10 border border-pink-500/30 p-4 rounded-xl flex items-center justify-between">
                                    <span className="text-xs text-pink-300 font-bold flex items-center gap-2"><CheckCircle2 size={16} /> Anticipo min: 30%</span>
                                    <span className="text-[10px] text-pink-400 font-black uppercase bg-pink-500/20 px-2 py-1 rounded">Entrega: 25 Días</span>
                                </div>
                            )}

                            {status === 'APARTADO' && (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl flex items-center justify-between">
                                    <span className="text-xs text-yellow-300 font-bold flex items-center gap-2"><CheckCircle2 size={16} /> Anticipo min: 30%</span>
                                    <span className="text-[10px] text-yellow-400 font-black uppercase bg-yellow-500/20 px-2 py-1 rounded">Límite: 30 Días</span>
                                </div>
                            )}

                            {/* PAYMENT CONFIG */}
                            <section className="bg-premium-slate/50 p-6 rounded-[30px] border border-white/5">
                                <h4 className="text-sm font-black text-white uppercase mb-4 flex items-center"><Calculator size={16} className="mr-2 text-green-500" /> Registro de Pago</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Anticipo / Monto Recibido</label>
                                        <div className="relative mt-1">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-premium-gold font-black">$</span>
                                            <input
                                                type="number"
                                                value={payment.monto}
                                                onChange={(e) => setPayment({ ...payment, monto: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-premium-gold/10 border border-premium-gold/30 rounded-xl p-3 pl-8 text-premium-gold font-black focus:outline-none focus:border-premium-gold shadow-highlight"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Método de Pago</label>
                                        <select
                                            value={payment.metodo}
                                            onChange={(e) => setPayment({ ...payment, metodo: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-premium-gold appearance-none cursor-pointer font-bold mt-1"
                                        >
                                            <option value="efectivo">EFECTIVO</option>
                                            <option value="transferencia">TRANSFERENCIA</option>
                                            <option value="debito">T. DÉBITO</option>
                                            <option value="credito">T. CRÉDITO</option>
                                        </select>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}


                    {/* Totals & Billing Switch Organically Inside */}
                    <section className="bg-premium-slate group p-6 rounded-[30px] border border-white/10 shadow-2xl ring-1 ring-white/5 space-y-4">

                        {/* Promos */}
                        {status === 'COTIZACION' && promotions.length > 0 && (
                            <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                <div className="flex items-center space-x-2 text-premium-gold">
                                    <Tag size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Promo Global</span>
                                </div>
                                <select
                                    value={selectedPromoId}
                                    onChange={e => setSelectedPromoId(e.target.value)}
                                    className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-premium-gold"
                                >
                                    <option value="">Ninguna</option>
                                    {promotions.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (-{p.discount_pct}%)</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex flex-col space-y-4">
                            <div className="flex items-center space-x-3 text-slate-400">
                                <Calculator size={24} className="text-premium-gold" />
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest block text-slate-500">Resumen</span>
                                    <span className="text-sm font-bold text-white">Cálculo Total</span>
                                </div>
                            </div>

                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between text-sm mb-2 text-slate-300">
                                    <span>Subtotal</span>
                                    <span className="font-mono">${subtotal.toLocaleString()}</span>
                                </div>
                                {sumDescuentosManuales > 0 && (
                                    <div className="flex justify-between text-sm mb-2 text-red-400">
                                        <span>Desc. Productos</span>
                                        <span className="font-mono">- ${sumDescuentosManuales.toLocaleString()}</span>
                                    </div>
                                )}
                                {descGlobalVal > 0 && (
                                    <div className="flex justify-between text-sm mb-2 text-green-400 border-b border-white/5 pb-2">
                                        <span>Desc. Promoción</span>
                                        <span className="font-mono">- ${descGlobalVal.toLocaleString()}</span>
                                    </div>
                                )}

                                {shippingAmount > 0 && (
                                    <div className="flex justify-between text-sm mb-2 text-blue-400">
                                        <span>Envío a Domicilio</span>
                                        <span className="font-mono">+ ${shippingAmount.toLocaleString()}</span>
                                    </div>
                                )}

                                {/* Organic IVA Switch */}
                                <div className="flex items-center justify-between py-2 border-b border-white/5">
                                    <span className="text-sm text-slate-300 font-bold">+ Agregar IVA (16%)</span>
                                    <label className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={billing.requiere_factura}
                                                onChange={(e) => setBilling({ ...billing, requiere_factura: e.target.checked })}
                                            />
                                            <div className={`block w-10 h-6 rounded-full transition-colors ${billing.requiere_factura ? 'bg-premium-gold' : 'bg-white/10'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${billing.requiere_factura ? 'transform translate-x-4' : ''}`}></div>
                                        </div>
                                    </label>
                                </div>

                                {billing.requiere_factura && (
                                    <div className="flex justify-between text-sm mt-3 mb-2 text-slate-400">
                                        <span>IVA</span>
                                        <span className="font-mono">+ ${ivaAmount.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-white/10 text-right">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total a Pagar</p>
                                    <p className="text-4xl font-black text-white tracking-tighter">${total.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Expand Billing Form if IVA checked */}
                        {billing.requiere_factura && (
                            <div className="grid grid-cols-2 gap-3 mt-4 animate-in fade-in duration-300 bg-white/5 p-4 rounded-xl border border-white/10">
                                <h4 className="col-span-2 text-[10px] uppercase font-black text-premium-gold tracking-widest mb-1">Datos de Facturación</h4>
                                <input type="text" placeholder="RFC" value={billing.rfc} onChange={e => setBilling({ ...billing, rfc: e.target.value.toUpperCase() })} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-premium-gold" />
                                <input type="text" placeholder="Razón Social" value={billing.razon} onChange={e => setBilling({ ...billing, razon: e.target.value.toUpperCase() })} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-premium-gold" />
                                <input type="text" placeholder="C.P." value={billing.cp} onChange={e => setBilling({ ...billing, cp: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-premium-gold" />
                                <select value={billing.uso_cfdi} onChange={e => setBilling({ ...billing, uso_cfdi: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-premium-gold font-bold">
                                    <option value="">Uso CFDI...</option>
                                    <option value="G01">G01 Mercancías</option>
                                    <option value="G03">G03 Gastos gral</option>
                                </select>
                                <select value={billing.regimen} onChange={e => setBilling({ ...billing, regimen: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-premium-gold font-bold col-span-2">
                                    <option value="">Régimen Fiscal...</option>
                                    <option value="601">601 Gral Ley Personas Morales</option>
                                    <option value="605">605 Sueldos y Salarios</option>
                                    <option value="612">612 Actividad Emp. y Prof.</option>
                                    <option value="626">626 RESICO</option>
                                </select>
                            </div>
                        )}

                        <button
                            disabled={loading || cart.length === 0}
                            onClick={handleSave}
                            className="w-full bg-premium-gold text-black font-black py-4 rounded-[20px] flex items-center justify-center space-x-3 hover:bg-yellow-400 transition-all disabled:opacity-30 shadow-xl shadow-premium-gold/20 active:scale-[0.97]"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                            <span className="text-sm tracking-tight uppercase">
                                Generar {status.replace('_', ' ')}
                            </span>
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, label, color }) {
    const colorMap = {
        "premium-gold": "premium-gold",
        "yellow-500": "yellow-500",
        "blue-500": "blue-500",
        "pink-500": "pink-500"
    };

    const activeClasses = {
        "premium-gold": "bg-premium-gold/10 border-premium-gold text-premium-gold shadow-[0_0_20px_rgba(234,179,8,0.1)]",
        "yellow-500": "bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.1)]",
        "blue-500": "bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]",
        "pink-500": "bg-pink-500/10 border-pink-500 text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.1)]"
    };

    return (
        <button
            onClick={onClick}
            className={`py-4 rounded-[20px] border text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${active
                ? activeClasses[color]
                : 'bg-white/[0.03] border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                }`}
        >
            {label}
        </button>
    );
}

export default Sales;

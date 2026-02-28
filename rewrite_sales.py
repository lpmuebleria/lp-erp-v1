import re
import codecs

with codecs.open('frontend/src/components/Sales.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the return (
main_return_start = content.find('return (\n        <div className="grid grid-cols-1 lg:grid-cols-3')
if main_return_start == -1:
    main_return_start = content.find('return (\n        <div className="grid')

end_of_component = content.find('function TabButton')

new_return_jsx = """return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 1. SECCIÓN CLIENTE (Ancho Completo) */}
            <section className="bg-premium-slate/50 p-6 rounded-3xl border border-white/5 space-y-4 shadow-xl ring-1 ring-white/5">
                <div className="flex items-center space-x-3 mb-2">
                    <User className="text-premium-gold" size={20} />
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Datos del Cliente</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2">Nombre Completo *</label>
                        <input
                            type="text"
                            value={customer.nombre}
                            onChange={(e) => setCustomer({ ...customer, nombre: e.target.value })}
                            placeholder="Nombre del cliente..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-premium-gold/50 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2">Teléfono {status !== 'COTIZACION' && '*'}</label>
                        <div className="relative">
                            <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={customer.tel}
                                onChange={(e) => setCustomer({ ...customer, tel: e.target.value })}
                                placeholder="Ej. 871..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 pl-10 text-sm text-white focus:outline-none focus:border-premium-gold/50 transition-all"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-2">Email (Opcional)</label>
                        <div className="relative">
                            <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="email"
                                value={customer.email}
                                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                                placeholder="cliente@ejemplo.com"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 pl-10 text-sm text-white focus:outline-none focus:border-premium-gold/50 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. TIPO DE TRANSACCIÓN (Ancho Completo) */}
            <section className="bg-premium-slate p-2 md:p-3 rounded-3xl border border-white/10 shadow-2xl ring-1 ring-white/5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <TabButton active={status === 'COTIZACION'} onClick={() => setStatus('COTIZACION')} label="Cotización" color="premium-gold" />
                    <TabButton active={status === 'VENTA_STOCK'} onClick={() => setStatus('VENTA_STOCK')} label="Stock" color="blue-500" />
                    <TabButton active={status === 'PEDIDO_FABRICACION'} onClick={() => setStatus('PEDIDO_FABRICACION')} label="Fabricación" color="pink-500" />
                    <TabButton active={status === 'APARTADO'} onClick={() => setStatus('APARTADO')} label="Apartado" color="yellow-500" />
                </div>
            </section>

            {/* 3. CONTENIDO PRINCIPAL (Productos + Detalles/Pagos) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUMNA IZQUIERDA: Productos y Carrito */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-premium-slate/50 p-6 rounded-3xl border border-white/5 space-y-4 shadow-xl">
                        <div className="flex items-center space-x-3 mb-2">
                            <ShoppingCart className="text-premium-gold" size={20} />
                            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Productos</h3>
                        </div>
                        <div className="relative z-50">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Escribe el modelo o código para buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-premium-gold/50 transition-all text-white font-bold"
                            />
                            {products.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-premium-slate border border-premium-gold/30 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                    {products.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => addToCart(p)}
                                            className="w-full p-4 flex justify-between items-center hover:bg-premium-gold/10 transition-colors border-b border-white/5 last:border-0"
                                        >
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white uppercase">{p.modelo}</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">{p.codigo} - {p.tamano}</p>
                                            </div>
                                            <span className="text-premium-gold font-black">${p.precio_lista.toLocaleString()}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-slate-500 border-b border-white/5 uppercase text-[10px] tracking-widest font-black">
                                        <th className="pb-3 px-2">Descripción</th>
                                        <th className="pb-3 px-2 w-20 text-center">Cant.</th>
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
                                            <td className="py-4 px-2 text-center">
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
                                            <td colSpan="6" className="py-16 text-center text-slate-500 italic opacity-50">
                                                <ShoppingCart size={32} className="mx-auto mb-2 opacity-20" />
                                                Ningún producto en carrito
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* COLUMNA DERECHA: Configuraciones, Pagos, Facturación y Totales */}
                <div className="space-y-6">
                    
                    {/* Configuraciones Específicas del Status (Pago, Entrega) */}
                    {status !== 'COTIZACION' && (
                        <section className="bg-premium-slate group p-6 rounded-3xl border border-white/10 space-y-6 shadow-xl ring-1 ring-white/5 animate-in slide-in-from-top-4">
                            
                            <div className="flex items-center space-x-3 mb-4">
                                <FileSpreadsheet className="text-premium-gold" size={20} />
                                <h3 className="text-md font-black text-white uppercase tracking-tighter">
                                    Detalles: {status.replace('_', ' ')}
                                </h3>
                            </div>

                            {/* Fechas de Entrega (Sólo Stock) */}
                            {status === 'VENTA_STOCK' && (
                                <div className="grid grid-cols-2 gap-3 pb-4 border-b border-white/5">
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Entrega</label>
                                        <div className="relative mt-1">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                            <input
                                                type="date"
                                                value={delivery.fecha}
                                                onChange={e => setDelivery({ ...delivery, fecha: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 pl-9 text-xs text-white focus:border-premium-gold cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Turno</label>
                                        <div className="relative mt-1">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                            <select
                                                value={delivery.turno}
                                                onChange={e => setDelivery({ ...delivery, turno: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 pl-9 text-xs text-white focus:border-premium-gold appearance-none font-bold cursor-pointer"
                                            >
                                                <option value="MANANA">MAÑANA</option>
                                                <option value="TARDE">TARDE</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Alertas de mínimos */}
                            {(status === 'PEDIDO_FABRICACION' || status === 'APARTADO') && (
                                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl">
                                    <p className="text-xs text-blue-300 font-bold flex items-center gap-2">
                                        <CheckCircle2 size={14} className="shrink-0" /> Anticipo mínimo 30%
                                    </p>
                                    <p className="text-[10px] text-blue-400/70 mt-1 ml-5 font-mono">
                                        Tiempo {status === 'APARTADO' ? 'de liq: 30 días.' : 'fabricación: 25 d.'}
                                    </p>
                                </div>
                            )}

                            {/* Campos de Pago */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Abono / Anticipo</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-premium-gold font-black">$</span>
                                        <input
                                            type="number"
                                            value={payment.monto}
                                            onChange={(e) => setPayment({ ...payment, monto: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-premium-gold/10 border border-premium-gold/30 rounded-2xl p-4 pl-8 text-premium-gold font-black focus:outline-none focus:border-premium-gold shadow-highlight"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Método</label>
                                        <select
                                            value={payment.metodo}
                                            onChange={(e) => setPayment({ ...payment, metodo: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-premium-gold appearance-none cursor-pointer font-bold mt-1"
                                        >
                                            <option value="efectivo">Efectivo</option>
                                            <option value="transferencia">Transferencia</option>
                                            <option value="debito">T. Débito</option>
                                            <option value="credito">T. Crédito</option>
                                        </select>
                                    </div>
                                    <div>
                                         <label className="text-[10px] text-slate-500 uppercase font-black ml-2 tracking-widest">Referencia</label>
                                         <input
                                            type="text"
                                            placeholder="Opcional..."
                                            value={payment.referencia}
                                            onChange={(e) => setPayment({ ...payment, referencia: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none mt-1"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Promociones Exclusivas de Cotización */}
                    {status === 'COTIZACION' && promotions.length > 0 && (
                        <section className="bg-premium-slate/50 p-6 rounded-3xl border border-white/5 space-y-3 shadow-xl">
                            <div className="flex items-center space-x-2 text-premium-gold mb-2">
                                <Tag size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Descuento Global</span>
                            </div>
                            <select
                                value={selectedPromoId}
                                onChange={e => setSelectedPromoId(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-premium-gold font-bold"
                            >
                                <option value="">No aplicar promoción</option>
                                {promotions.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (-{p.discount_pct}%)</option>
                                ))}
                            </select>
                        </section>
                    )}

                    {/* Facturación (Toggle dinámico) */}
                    <section className="bg-premium-slate/60 p-6 rounded-3xl border border-white/5 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <FileText className="text-premium-gold" size={16} />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Facturación</span>
                            </div>
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={billing.requiere_factura}
                                        onChange={(e) => setBilling({ ...billing, requiere_factura: e.target.checked })}
                                    />
                                    <div className={`block w-8 h-4 rounded-full transition-colors ${billing.requiere_factura ? 'bg-premium-gold' : 'bg-white/10'}`}></div>
                                    <div className={`dot absolute left-1 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${billing.requiere_factura ? 'transform translate-x-4' : ''}`}></div>
                                </div>
                                <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Req. Factura</span>
                            </label>
                        </div>

                        {billing.requiere_factura && (
                            <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in zoom-in-95 duration-200">
                                <input type="text" placeholder="RFC" value={billing.rfc} onChange={e => setBilling({ ...billing, rfc: e.target.value.toUpperCase() })} className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-[10px] text-white focus:border-premium-gold" />
                                <input type="text" placeholder="C.P." value={billing.cp} onChange={e => setBilling({ ...billing, cp: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-[10px] text-white focus:border-premium-gold" />
                                <input type="text" placeholder="Razón Social" value={billing.razon} onChange={e => setBilling({ ...billing, razon: e.target.value.toUpperCase() })} className="col-span-2 w-full bg-white/5 border border-white/10 rounded-xl p-2 text-[10px] text-white focus:border-premium-gold" />
                                <select value={billing.uso_cfdi} onChange={e => setBilling({ ...billing, uso_cfdi: e.target.value })} className="col-span-2 w-full bg-white/5 border border-white/10 rounded-xl p-2 text-[10px] text-white focus:border-premium-gold font-bold">
                                    <option value="">Uso CFDI...</option>
                                    <option value="G01">G01 Adquisición de mercancias</option>
                                    <option value="G03">G03 Gastos en general</option>
                                </select>
                                <select value={billing.regimen} onChange={e => setBilling({ ...billing, regimen: e.target.value })} className="col-span-2 w-full bg-white/5 border border-white/10 rounded-xl p-2 text-[10px] text-white focus:border-premium-gold font-bold">
                                    <option value="">Régimen Fiscal...</option>
                                    <option value="601">601 Gral Personas Morales</option>
                                    <option value="612">612 P. Físicas Emp</option>
                                    <option value="626">626 RESICO</option>
                                </select>
                            </div>
                        )}
                    </section>

                    {/* Totales y Botón Guardar */}
                    <section className="bg-premium-slate p-6 rounded-3xl border border-white/10 space-y-6 shadow-2xl overflow-hidden ring-1 ring-white/5 relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-premium-gold/5 rounded-bl-full pointer-events-none"></div>
                        <div className="flex justify-between items-end relative z-10">
                            <div className="flex items-center space-x-2 text-slate-400">
                                <Calculator size={24} className="text-premium-gold" />
                                <div>
                                    <span className="text-sm font-bold text-white uppercase tracking-wider">Totales</span>
                                </div>
                            </div>
                            <div className="text-right">
                                {billing.requiere_factura && (
                                    <div className="flex justify-between space-x-4 mb-1">
                                        <span className="text-[10px] text-slate-500 uppercase font-black">Subtotal</span>
                                        <span className="text-[10px] text-slate-400 font-mono">${baseTotal.toLocaleString()}</span>
                                    </div>
                                )}
                                {sumDescuentosManuales > 0 && (
                                    <div className="flex justify-between space-x-4 mb-1 border-b border-white/5 pb-1">
                                        <span className="text-[10px] text-slate-500 uppercase font-black">Desc. Prods</span>
                                        <span className="text-[10px] text-red-400/70 font-mono">- ${sumDescuentosManuales.toLocaleString()}</span>
                                    </div>
                                )}
                                {descGlobalVal > 0 && (
                                    <div className="flex justify-between space-x-4 mb-1">
                                        <span className="text-[10px] text-slate-500 uppercase font-black">Desc. Global</span>
                                        <span className="text-[10px] text-green-400/70 font-mono">- ${descGlobalVal.toLocaleString()}</span>
                                    </div>
                                )}
                                {billing.requiere_factura && (
                                    <div className="flex justify-between space-x-4 mt-2">
                                        <span className="text-[10px] text-slate-500 uppercase font-black">+ 16% IVA</span>
                                        <span className="text-[10px] text-slate-400 font-mono">+ ${ivaAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="border-t border-white/10 mt-2 pt-2 text-right">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total a Pagar</p>
                                    <p className="text-4xl font-black text-white tracking-tighter shadow-sm">${total.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            disabled={loading || cart.length === 0}
                            onClick={handleSave}
                            className="w-full bg-premium-gold text-black font-black py-4 rounded-2xl flex items-center justify-center space-x-2 hover:bg-yellow-400 transition-all shadow-xl shadow-premium-gold/20 disabled:opacity-30 disabled:scale-100 ring-2 ring-premium-gold/50 active:scale-95 relative z-10"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                            <span className="text-sm tracking-tight uppercase">
                                Guardar {status.replace('_', ' ')}
                            </span>
                        </button>
                    </section>

                </div>
            </div>
        </div>
    );"""

pre = content[:main_return_start]
post = content[end_of_component:]

with codecs.open('frontend/src/components/Sales.jsx', 'w', encoding='utf-8') as f:
    f.write(pre + new_return_jsx + "\n}\n\n" + post)

print("Sales.jsx successfully rewritten.")

from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

class ProductBase(BaseModel):
    codigo: str = Field(..., min_length=1)
    modelo: str = Field(..., min_length=1)
    tamano: str = Field(..., min_length=1)
    precio_lista: float = Field(..., gt=0)
    costo_total: float = Field(..., gt=0)
    costo_fabrica: float = 0
    flete: float = 0
    maniobras: float = 0
    empaque: float = 0
    comision: float = 0
    garantias: float = 0
    utilidad_nivel: str = "media"
    activo: int = 1
    stock: int = 0
    imagen_url: Optional[str] = None
    in_catalog: int = 1

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str
    rol: str

class UserCreate(UserBase):
    pin: str
    password: Optional[str] = None

class User(UserBase):
    pass

class LoginRequest(BaseModel):
    username: str
    password: str

class QuoteLineBase(BaseModel):
    product_id: int
    cantidad: int
    precio_unit: float
    descuento_tipo: Optional[str] = None
    descuento_val: Optional[float] = None
    total_linea: float

class QuoteBase(BaseModel):
    folio: str
    vendedor: str
    total: float
    status: str = 'COTIZACION'
    cliente_nombre: Optional[str] = None
    cliente_tel: Optional[str] = None
    cliente_email: Optional[str] = None
    cp_envio: Optional[str] = None
    costo_envio: Optional[float] = 0.0
    monto_pago: Optional[float] = 0
    metodo_pago: Optional[str] = 'efectivo'
    referencia: Optional[str] = ''

class QuoteCreate(QuoteBase):
    lines: List[QuoteLineBase]

class DashboardMetrics(BaseModel):
    today: str
    ventas_hoy: float
    anticipos_hoy: float
    ventas_mes: float
    anticipos_mes: float
    cot_hoy: int
    utilidad_bruta_mes: float
    pedidos_por_estatus: dict
    bolsas_mes: Optional[dict] = None

class PaymentBase(BaseModel):
    metodo: str
    monto: float
    referencia: Optional[str] = None
    efectivo_recibido: Optional[float] = None

class PaymentCreate(PaymentBase):
    order_id: int

class PaymentCancel(BaseModel):
    motivo_anulacion: str

class OrderUpdate(BaseModel):
    estatus: Optional[str] = None
    nota: Optional[str] = None
    entrega_estimada: Optional[str] = None
    entrega_promesa: Optional[str] = None
    estatus_solicitado: Optional[str] = None
    cp_envio: Optional[str] = None
    costo_envio: Optional[float] = None

class OrderNoteCreate(BaseModel):
    author: str
    content: str

class OrderNote(BaseModel):
    id: int
    order_id: int
    author: str
    content: str
    created_at: str

class ExpenseCreate(BaseModel):
    concepto: str = Field(..., min_length=1)
    monto: float = Field(..., gt=0)
    descripcion: str = Field(..., min_length=1)
    fecha: str = Field(..., min_length=1)
    metodo_pago: str = "efectivo"

class RoleCreate(BaseModel):
    nombre: str = Field(..., min_length=1)
    is_superadmin: bool = False

class RolePermissionUpdate(BaseModel):
    modulo: str
    can_view: bool

class RolePermissionBulk(BaseModel):
    permissions: List[RolePermissionUpdate]

class UserCreate(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    role_id: int
    nombre_completo: str = Field(..., min_length=1)
    edad: Optional[int] = None
    cumpleanos: Optional[str] = None
    rfc: Optional[str] = None
    
class UserUpdate(BaseModel):
    password: Optional[str] = None
    role_id: Optional[int] = None
    nombre_completo: Optional[str] = None
    edad: Optional[int] = None
    cumpleanos: Optional[str] = None
    rfc: Optional[str] = None

class ShippingCostCreate(BaseModel):
    cp: str
    colonia: str
    municipio: str
    zona: str

class ShippingCostUpdate(BaseModel):
    colonia: Optional[str] = None
    municipio: Optional[str] = None
    zona: Optional[str] = None

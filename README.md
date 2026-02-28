# LP ERP V1 (POS + Pedidos) – LP Mueblería de Jalisco

Sistema local (sin membresías) pensado para:
- Cotizaciones y pedidos bajo fabricación (anticipo 50%).
- Roles: Vendedor vs Admin.
- Reportes básicos para dueño.
- PDFs tamaño carta (cotización y recibo).

## Ejecutar
1) Instala dependencias:
   pip install -r requirements.txt
2) Arranca:
   uvicorn app:app --reload
3) Abre:
   http://127.0.0.1:8000

## Datos iniciales
- Al arrancar por primera vez, se crea `lp_erp.sqlite` y se importan productos desde `Muebleria Torreón.xlsx` (si está en la misma carpeta).
- Como el Excel aún no trae códigos, se generan automáticamente LP0001, LP0002, ...

## Usuarios
- Admin: usuario `admin` pin `1234` (cámbialo en la tabla users).
- Vendedor: usuario `vendedor` pin `1234`

> Este es un MVP. Se puede extender a inventario real, cuentas por cobrar, etc.

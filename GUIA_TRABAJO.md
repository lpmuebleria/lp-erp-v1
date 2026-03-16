# GUÍA DE TRABAJO - ERP MUEBLERÍA 🚀

Este documento resume cómo usar y actualizar tu sistema ahora que está en la nube.

## 🌐 1. Direcciones Oficiales
*   **Página Web (En Vivo):** https://lpmuebleria.vercel.app/
*   **Servidor Backend:** https://lp-erp-v1.onrender.com/api
*   **Base de Datos:** Aiven MySQL (Nube).

## 💻 2. Ciclo de Trabajo (Local vs Nube)

### A. Para Pruebas y Novedades (Local)
1.  Busca el archivo **`start_project.bat`** en tu carpeta del proyecto y ejecútalo.
2.  Tu navegador abrirá `http://localhost:5173`.
3.  **Seguridad:** En este modo, el sistema usa tu base de datos local (MySQL de tu PC). Puedes borrar o editar datos sin que nada cambie en la página real de internet.

### B. Para Publicar Cambios (Nube) - ¡NUEVO FLUJO PROTEGIDO!
Para mantener la estabilidad del demo, el flujo ahora es:
1.  Sube tus cambios a la rama **`main`**.
2.  Ve a GitHub y crea un **Pull Request** (PR) de `main` hacia `master`.
3.  Una vez aceptado el PR, `master` se actualizará y Vercel desplegará los cambios.
4.  **Seguridad:** El sistema tiene un "candado" (git hook) que impedirá que tú o yo subamos accidentalmente a `master` de forma directa.


## 📊 3. Inventario y Excel
*   Usa el botón **"Importar Excel"** dentro del sistema.
*   **Obligatorio:** Código, Modelo, Precio Lista.
*   **Opcional:** Stock, Imagen, Costos.
*   Puedes descargar la **Plantilla Oficial** directamente desde el cuadro de importación en la web.

## 🖼️ 4. Imágenes Permanentes
*   Todas las fotos que subas se guardan en **Cloudinary**.
*   Esto garantiza que nunca se borren, aunque el servidor se reinicie.

---
*Documento generado por Antigravity - 2026*

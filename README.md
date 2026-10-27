# SIFF Refrigeración Industrial - Sistema de Inventario & Salida Rápida

Sistema web integral de control de inventarios, auditoría de salidas en tiempo real y escaneo de códigos QR / barras, especialmente diseñado para técnicos y administración de empresas de refrigeración industrial y climatización.

Incluye la **propuesta interactiva y prototipo funcional** para **SIFF** cargado con **357 repuestos técnicos reales** (Danfoss, Bitzer, Vilter, Mycom, Frick, etc.) divididos entre **Bodega Central** y **Oficina Matriz**.

---

## 🚀 Prototipo Interactivo en Vivo

Abre en tu navegador:
```txt
http://localhost:3000/siff
```
*(O accede desde la ruta principal `http://localhost:3000` con el banner superior directo a la propuesta).*

---

## ⚡ Módulos Principales para SIFF

1. **Modo Rápido Técnicos (Pantalla Táctil POS & Escaneo):**
   - Selector ágil de ubicación: **Bodega Central (185 ítems)** vs. **Oficina Matriz (172 ítems)**.
   - Filtros por categoría: *Válvulas & Controles*, *Bombas & Aceites*, *Sellos & Empaques*, *Acoples & Bridas*, *Mecánica & Compresores*.
   - **Retiro en 3 segundos:** Botón de Entrada/Salida, selector de cantidad táctil y **Motivo Obligatorio** (*Servicio Técnico a Cliente*, *Venta Mostrador*, *Traspaso*, *Garantía*, *Compra Proveedor*) con detalle de cliente/orden.
   - **Escáner QR y Código de Barras:** Visor animado con cámara y botones de simulación rápida en vivo.

2. **Panel Gerencial & Kardex en Tiempo Real:**
   - Métricas en vivo (Total de repuestos, stock por ubicación y alertas de stock crítico $\le 2$ unidades).
   - Auditoría cronológica inalterable de cada movimiento: fecha, hora, repuesto, cantidad, técnico responsable y motivo.

3. **Generador e Impresor de Etiquetas QR:**
   - Vista previa e impresión de etiquetas adhesivas con logo SIFF, QR, código de barras, lote y nombre técnico para rotular estanterías y gavetas.

4. **Propuesta Comercial & Plan de Trabajo:**
   - Diagnóstico del Excel anterior vs. Solución propuesta.
   - Matriz de los 6 entregables clave y cronograma ágil de 2 semanas.

---

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **PWA Ready:** Instalable en computadoras de escritorio (Windows/Mac) y celulares (Android/iOS) con acceso directo en la pantalla de inicio.
- **Base de Datos:** Preparado para Supabase (PostgreSQL en la nube con actualización en tiempo real).
- **Lectores:** Soporte nativo para pistolas lectoras láser USB/Bluetooth y cámara de teléfono móvil.

---

## 💻 Ejecución Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Abrir la propuesta SIFF
http://localhost:3000/siff
```

---

## 🔒 Variables de Entorno (.env.local)

Para modo DEMO local funciona de forma inmediata sin configuración adicional.
Para conectar a base de datos externa:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

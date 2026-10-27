// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx-js-style');

const data = [
  {
    "Nombre": "Coca Cola 1 Litro",
    "Codigo Interno": "BEBD-0001",
    "Descripcion": "Bebida gaseosa",
    "Costo Compra": 0.92,
    "Precio": 1.25,
    "Unidad Medida": "Unidad (pieza)",
    "Stock": 50,
    "Stock Minimo": 10,
    "Stock Maximo": 150,
    "Categoria": "Bebidas",
    "Proveedor": "Arca Continental SAB de CV",
    "Imagen": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=400&auto=format&fit=crop",
    "Fecha Ingreso": "2026-05-10",
    "Fecha Caducidad": "2026-11-10"
  },
  {
    "Nombre": "Pan de Molde Bimbo",
    "Codigo Interno": "PANA-0001",
    "Descripcion": "Pan blanco tajado mediano",
    "Costo Compra": 1.85,
    "Precio": 2.50,
    "Unidad Medida": "Unidad (pieza)",
    "Stock": 15,
    "Stock Minimo": 5,
    "Stock Maximo": 30,
    "Categoria": "Panadería",
    "Proveedor": "Grupo Bimbo",
    "Imagen": "",
    "Fecha Ingreso": "2026-05-10",
    "Fecha Caducidad": "2026-05-18"
  },
  {
    "Nombre": "Leche Vita Entera 1L",
    "Codigo Interno": "LACT-0001",
    "Descripcion": "Leche entera en funda",
    "Costo Compra": 0.68,
    "Precio": 0.90,
    "Unidad Medida": "Unidad (pieza)",
    "Stock": 30,
    "Stock Minimo": 12,
    "Stock Maximo": 50,
    "Categoria": "Lácteos",
    "Proveedor": "Pasteurizadora Quito",
    "Imagen": "https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=400&auto=format&fit=crop",
    "Fecha Ingreso": "2026-05-09",
    "Fecha Caducidad": "2026-06-09"
  },
  {
    "Nombre": "Atún Real en Aceite",
    "Codigo Interno": "ATUN-0001",
    "Descripcion": "Lata de atún de 170g",
    "Costo Compra": 1.18,
    "Precio": 1.60,
    "Unidad Medida": "Unidad (pieza)",
    "Stock": 40,
    "Stock Minimo": 15,
    "Stock Maximo": 80,
    "Categoria": "Enlatados",
    "Proveedor": "Nirsa",
    "Imagen": "",
    "Fecha Ingreso": "2026-05-10",
    "Fecha Caducidad": "2028-05-10"
  },
  {
    "Nombre": "Doritos Queso Nacho",
    "Codigo Interno": "SNAC-0001",
    "Descripcion": "Snack salado 50g",
    "Costo Compra": 0.42,
    "Precio": 0.60,
    "Unidad Medida": "Unidad (pieza)",
    "Stock": 80,
    "Stock Minimo": 20,
    "Stock Maximo": 120,
    "Categoria": "Snacks",
    "Proveedor": "Frito-Lay",
    "Imagen": "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?q=80&w=400&auto=format&fit=crop",
    "Fecha Ingreso": "2026-05-08",
    "Fecha Caducidad": "2026-09-08"
  }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Productos");
XLSX.writeFile(wb, "productos_ejemplo.xlsx");
console.log("Excel file created: productos_ejemplo.xlsx");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx-js-style');

const data = [
  {
    "Nombre": "Producto de Ejemplo",
    "Codigo Interno": "PROD-0001",
    "Descripcion": "Descripción breve del producto",
    "Costo Compra": 1.10,
    "Precio": 1.50,
    "Unidad Medida": "Unidad (pieza)",
    "Stock": 50,
    "Stock Minimo": 10,
    "Stock Maximo": 100,
    "Categoria": "Bebidas",
    "Proveedor": "Ejemplo Proveedor",
    "Imagen": "https://url-de-tu-imagen.jpg",
    "Fecha Ingreso": "2026-05-10",
    "Fecha Caducidad": ""
  }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Productos");
XLSX.writeFile(wb, "plantilla_productos.xlsx");
console.log("Excel file created: plantilla_productos.xlsx");

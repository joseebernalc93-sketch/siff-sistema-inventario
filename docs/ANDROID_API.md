# API para Android

Base local:

```txt
http://localhost:3000
```

Base en Vercel:

```txt
https://tu-proyecto.vercel.app
```

## Catalogo

```http
GET /api/mobile/catalog
```

Respuesta:

```json
{
  "categories": [],
  "products": [
    {
      "id": "uuid",
      "name": "Arroz flor 2kg",
      "sku": "BAS-002",
      "price": 2.8,
      "stock": 13,
      "image_url": null
    }
  ]
}
```

## Crear pedido

```http
POST /api/mobile/orders
Content-Type: application/json
```

Body:

```json
{
  "customer_name": "Maria Perez",
  "customer_phone": "0999999999",
  "channel": "android",
  "notes": "Entregar en caja",
  "items": [
    {
      "product_id": "uuid-del-producto",
      "quantity": 2
    }
  ]
}
```

Respuesta:

```json
{
  "ok": true,
  "order": {
    "order_id": "uuid",
    "order_code": "ORD-20260503-AB12CD",
    "total": 5.6
  }
}
```

## Chatbot

```http
POST /api/chatbot
Content-Type: application/json
```

Body:

```json
{
  "message": "Quiero 2 arroz y 1 aceite"
}
```

## Registrar queja o devolucion

```http
POST /api/mobile/complaints
Content-Type: application/json
```

Body:

```json
{
  "customer_name": "Maria Perez",
  "customer_phone": "0999999999",
  "order_id": "uuid-opcional",
  "message": "El producto llego incompleto."
}
```

Respuesta:

```json
{
  "ok": true,
  "complaint": {
    "complaint_id": "uuid",
    "status": "open"
  }
}
```

Respuesta:

```json
{
  "answer": "Tengo 2 x Arroz flor 2kg, 1 x Aceite vegetal 1L. Total estimado: $7.85.",
  "intent": "order",
  "products": [],
  "suggested_order": {
    "items": [],
    "total": 7.85
  }
}
```

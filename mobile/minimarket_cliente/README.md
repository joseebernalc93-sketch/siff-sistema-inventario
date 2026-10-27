# Minimarket IA Cliente

App Flutter inicial para clientes del minimarket.

## Correr en navegador

```powershell
flutter run -d chrome
```

Para una vista rapida y estable en el navegador, compila y sirve la version web:

```powershell
flutter build web --release
npx --yes http-server build/web -a 127.0.0.1 -p 5400 -c-1
```

## Conectar con el panel web

Por defecto la app llama al servidor:

```txt
https://minimarket-ia-joelys.vercel.app
```

El registro usa `/api/mobile/clients/register` y el login usa
`/api/mobile/clients/login`. El panel administrador lee esos datos desde
`/api/admin/mobile-clients`.

Para cambiar el servidor al compilar:

```powershell
flutter build apk --release --dart-define=MINIMARKET_API_BASE_URL=https://tu-dominio.vercel.app
```

## Crear APK

```powershell
flutter build apk --release --dart-define=MINIMARKET_API_BASE_URL=https://minimarket-ia-joelys.vercel.app
```

APK generada:

```txt
build/app/outputs/flutter-apk/minimarket-ia-cliente.apk
```

## GPS y OpenStreetMap

El boton GPS pide permiso de ubicacion y usa OpenStreetMap/Nominatim para
convertir coordenadas en una direccion legible. No requiere tarjeta ni clave
de Google Maps.

Para el prototipo de tesis, respeta la politica publica de Nominatim:

- No hacer uso pesado.
- Maximo aproximado: 1 solicitud por segundo.
- Mantener atribucion visible: `Datos de ubicacion: OpenStreetMap/Nominatim`.

Si Nominatim no devuelve una direccion, el campo se llena con coordenadas GPS y
el cliente puede corregir la direccion manualmente.

# Clip Market

El marketplace de UGC: cualquiera mira los videos sin cuenta y, si uno le convence, le pide un video a ese creador.

## Cómo funciona

- **Explorar:** la vidriera es pública. Se filtra por rubro, precio y texto.
- **Cuenta:** gratis, con mail y contraseña. Hace falta para subir un video o pedir uno.
- **Subir un video:** MP4, MOV o WebM de hasta 50 MB. Queda público. Quien lo subió puede borrarlo.
- **Encargos:** la marca manda el pedido, el creador lo acepta, entrega un link al video y la marca lo aprueba. Solo los ven las dos partes. El pago lo acuerdan entre ellos; no hay comisión.

Las tarjetas marcadas como "Ejemplo" son perfiles ficticios generados con IA. Se ocultan solas cuando hay seis o más videos reales.

## Dónde vive cada cosa

- `index.html`, `style.css`, `app.js`: la app, sin paso de compilación.
- Cuentas, videos y encargos: proyecto de Supabase (tablas `cm_clips` y `cm_orders`, carpeta de archivos `clipmarket`).

## Verla en tu compu

En Windows, con Python instalado, ejecutá **Abrir demo.cmd** y entrá en http://127.0.0.1:8780/.

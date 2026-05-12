DASHBOARD E-COMMERCE - GUIA RAPIDA

Archivo principal:
- index.html

Archivos importantes:
- style.css: aspecto visual del dashboard.
- script.js: logica del dashboard, filtros, KPIs y graficos.
- datos/*.js: datos convertidos desde los JSON del ZIP.

Por que los datos estan en archivos .js:
- El navegador bloqueaba fetch() al abrir el HTML como archivo local.
- Por eso cada JSON se convirtio a un archivo JS que crea variables dentro de window.datosEcommerce.
- Asi puedes abrir PutoNicolas.html con doble click y los datos cargan sin servidor local.

Orden logico del codigo en script.js:
1. Toma los datos desde window.datosEcommerce.
2. Limpia pedidos y productos duplicados.
3. Crea un mapa productoPorId para unir detallePedidos con productos.
4. Llena los filtros de año y canal.
5. Calcula KPIs.
6. Dibuja cuatro graficos:
   - Canvas JS: Total de pedidos por mes.
   - SVG JS: Ingresos por categoria.
   - Chart.js: Pedidos por canal de compra.
   - D3.js: Motivos de devolucion.
7. Cuando cambian los filtros, recalcula todo y redibuja.

Cosas que debes editar antes de entregar:
1. En PutoNicolas.html cambia los autores:
   Nombre Apellido - username

2. En cada titulo de grafico cambia "username" por el username del autor real:
   Total de pedidos por mes - Canvas JS - username
   Ingresos por categoria - SVG JS - username
   Pedidos por canal - Chart.js - username
   Motivos de devolucion - D3.js - username

3. Si quieres cambiar colores o espaciado, usa style.css.

Nota:
- Chart.js y D3.js se cargan desde internet mediante CDN.
- Si no tienes internet, esos dos graficos no se veran.
- Canvas y SVG manuales si funcionan sin internet.

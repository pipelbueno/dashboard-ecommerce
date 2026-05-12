/* ============================================================
   DASHBOARD E-COMMERCE

   Logica del archivo:
   1. Tomar los datos cargados desde datos/*.js
   2. Limpiar duplicados basicos
   3. Crear relaciones simples entre tablas
   4. Preparar filtros
   5. Calcular KPIs
   6. Dibujar los 4 graficos requeridos
   ============================================================ */

const DATOS = window.datosEcommerce;

const pedidos = limpiarPedidos(DATOS.pedidos);
const productos = limpiarPorId(DATOS.productos, "ProductID");
const detallePedidos = DATOS.detallePedidos;
const devoluciones = DATOS.devoluciones;
const reviews = DATOS.reviews;

const productoPorId = crearMapaPorId(productos, "ProductID");

let graficoCanalCompra = null;

iniciarDashboard();


/* ============================================================
   1. Inicio del dashboard
   ============================================================ */

function iniciarDashboard() {
  llenarFiltros();
  actualizarDashboard();

  document.getElementById("filtroAnio").addEventListener("change", actualizarDashboard);
  document.getElementById("filtroCanal").addEventListener("change", actualizarDashboard);
}

function actualizarDashboard() {
  const filtros = leerFiltros();
  const pedidosFiltrados = filtrarPedidos(pedidos, filtros);
  const idsPedidosFiltrados = new Set(pedidosFiltrados.map(p => p.PedidoID));

  const detalleFiltrado = detallePedidos.filter(linea => idsPedidosFiltrados.has(linea.PedidoID));
  const devolucionesFiltradas = devoluciones.filter(dev => idsPedidosFiltrados.has(dev.PedidoID));
  const reviewsFiltradas = reviews.filter(review => idsPedidosFiltrados.has(review.PedidoID));

  actualizarKPIs(pedidosFiltrados, detalleFiltrado, devolucionesFiltradas, reviewsFiltradas);

  dibujarCanvasPedidosMes(pedidosFiltrados);
  dibujarSvgIngresosCategoria(detalleFiltrado);
  dibujarChartCanalCompra(pedidosFiltrados);
  dibujarD3MotivosDevolucion(devolucionesFiltradas);
}


/* ============================================================
   2. Limpieza y relaciones entre tablas
   ============================================================ */

function limpiarPedidos(listaPedidos) {
  const mapa = new Map();

  listaPedidos.forEach(pedido => {
    if (pedido.PedidoID && pedido.FechaPedido) {
      mapa.set(pedido.PedidoID, pedido);
    }
  });

  return Array.from(mapa.values());
}

function limpiarPorId(lista, campoId) {
  const mapa = new Map();

  lista.forEach(elemento => {
    if (elemento[campoId]) {
      mapa.set(elemento[campoId], elemento);
    }
  });

  return Array.from(mapa.values());
}

function crearMapaPorId(lista, campoId) {
  const mapa = new Map();

  lista.forEach(elemento => {
    mapa.set(elemento[campoId], elemento);
  });

  return mapa;
}


/* ============================================================
   3. Filtros
   ============================================================ */

function llenarFiltros() {
  const anios = obtenerAnios(pedidos);
  const canales = obtenerValoresUnicos(pedidos, "CanalCompra");

  llenarSelect("filtroAnio", anios);
  llenarSelect("filtroCanal", canales);
}

function obtenerAnios(listaPedidos) {
  const anios = new Set();

  listaPedidos.forEach(pedido => {
    const anio = pedido.FechaPedido.split("-")[0];
    anios.add(anio);
  });

  return Array.from(anios).sort();
}

function obtenerValoresUnicos(lista, campo) {
  const valores = new Set();

  lista.forEach(elemento => {
    if (elemento[campo]) {
      valores.add(elemento[campo]);
    }
  });

  return Array.from(valores).sort();
}

function llenarSelect(idSelect, valores) {
  const select = document.getElementById(idSelect);

  valores.forEach(valor => {
    const opcion = document.createElement("option");
    opcion.value = valor;
    opcion.textContent = valor;
    select.appendChild(opcion);
  });
}

function leerFiltros() {
  return {
    anio: document.getElementById("filtroAnio").value,
    canal: document.getElementById("filtroCanal").value
  };
}

function filtrarPedidos(listaPedidos, filtros) {
  return listaPedidos.filter(pedido => {
    const anioPedido = pedido.FechaPedido.split("-")[0];

    const cumpleAnio = filtros.anio === "todos" || anioPedido === filtros.anio;
    const cumpleCanal = filtros.canal === "todos" || pedido.CanalCompra === filtros.canal;

    return cumpleAnio && cumpleCanal;
  });
}


/* ============================================================
   4. KPIs superiores
   ============================================================ */

function actualizarKPIs(pedidosFiltrados, detalleFiltrado, devolucionesFiltradas, reviewsFiltradas) {
  const ingresos = sumar(detalleFiltrado, "IngresoLinea");
  const totalPedidos = pedidosFiltrados.length;
  const clientesActivos = contarUnicos(pedidosFiltrados, "CustomerID");

  const pedidosConDevolucion = contarUnicos(devolucionesFiltradas, "PedidoID");
  const tasaDevolucion = totalPedidos === 0 ? 0 : (pedidosConDevolucion / totalPedidos) * 100;

  const ratingMedio = promedio(reviewsFiltradas, "Rating");

  document.getElementById("kpiIngresos").textContent = formatearEuros(ingresos);
  document.getElementById("kpiPedidos").textContent = formatearEntero(totalPedidos);
  document.getElementById("kpiClientes").textContent = formatearEntero(clientesActivos);
  document.getElementById("kpiDevolucion").textContent = tasaDevolucion.toFixed(2) + "%";
  document.getElementById("kpiRating").textContent = ratingMedio.toFixed(2);
}

function sumar(lista, campo) {
  return lista.reduce((total, elemento) => total + Number(elemento[campo] || 0), 0);
}

function promedio(lista, campo) {
  if (lista.length === 0) {
    return 0;
  }

  return sumar(lista, campo) / lista.length;
}

function contarUnicos(lista, campo) {
  const valores = new Set(lista.map(elemento => elemento[campo]).filter(Boolean));
  return valores.size;
}

function formatearEuros(valor) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(valor);
}

function formatearEntero(valor) {
  return new Intl.NumberFormat("es-ES").format(valor);
}


/* ============================================================
   5. Grafico 1: Canvas JS - pedidos por mes
   ============================================================ */

function dibujarCanvasPedidosMes(pedidosFiltrados) {
  const datos = contarPedidosPorMes(pedidosFiltrados);

  const canvas = document.getElementById("canvasPedidosMes");
  const ctx = canvas.getContext("2d");

  const ancho = canvas.width;
  const alto = canvas.height;

  const margenIzq = 60;
  const margenDer = 30;
  const margenSup = 35;
  const margenInf = 80;

  const anchoGrafico = ancho - margenIzq - margenDer;
  const altoGrafico = alto - margenSup - margenInf;
  const maxValor = Math.max(...datos.map(d => d.total), 1);

  ctx.clearRect(0, 0, ancho, alto);
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, ancho, alto);

  dibujarEjesCanvas(ctx, margenIzq, margenSup, ancho, alto, margenDer, margenInf);
  dibujarLineasGuiaCanvas(ctx, maxValor, margenIzq, margenSup, ancho, alto, margenDer, margenInf, altoGrafico);

  const anchoBarra = anchoGrafico / datos.length * 0.58;

  datos.forEach((d, i) => {
    const xCentro = margenIzq + (i + 0.5) * (anchoGrafico / datos.length);
    const alturaBarra = (d.total / maxValor) * altoGrafico;
    const x = xCentro - anchoBarra / 2;
    const y = margenSup + altoGrafico - alturaBarra;

    ctx.fillStyle = "#8b5cf6";
    ctx.fillRect(x, y, anchoBarra, alturaBarra);

    ctx.fillStyle = "#e5e7eb";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(d.total, xCentro, y - 8);

    ctx.save();
    ctx.translate(xCentro, alto - margenInf + 28);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = "right";
    ctx.fillText(d.mes, 0, 0);
    ctx.restore();
  });
}

function contarPedidosPorMes(listaPedidos) {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const conteo = new Array(12).fill(0);

  listaPedidos.forEach(pedido => {
    const mes = Number(pedido.FechaPedido.split("-")[1]);
    conteo[mes - 1]++;
  });

  return meses.map((mes, i) => ({ mes: mes, total: conteo[i] }));
}

function dibujarEjesCanvas(ctx, margenIzq, margenSup, ancho, alto, margenDer, margenInf) {
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(margenIzq, margenSup);
  ctx.lineTo(margenIzq, alto - margenInf);
  ctx.lineTo(ancho - margenDer, alto - margenInf);
  ctx.stroke();
}

function dibujarLineasGuiaCanvas(ctx, maxValor, margenIzq, margenSup, ancho, alto, margenDer, margenInf, altoGrafico) {
  const marcas = 5;

  ctx.font = "12px Arial";
  ctx.textAlign = "right";

  for (let i = 0; i <= marcas; i++) {
    const valor = Math.round((maxValor / marcas) * i);
    const y = alto - margenInf - (valor / maxValor) * altoGrafico;

    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(valor, margenIzq - 10, y + 4);

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margenIzq, y);
    ctx.lineTo(ancho - margenDer, y);
    ctx.stroke();
  }
}


/* ============================================================
   6. Grafico 2: SVG JS - ingresos por categoria
   ============================================================ */

function dibujarSvgIngresosCategoria(detalleFiltrado) {
  const datos = calcularIngresosPorCategoria(detalleFiltrado);
  const svg = document.getElementById("svgIngresosCategoria");

  const ancho = 900;
  const alto = 420;
  const margenIzq = 180;
  const margenDer = 45;
  const margenSup = 35;
  const margenInf = 45;

  const anchoGrafico = ancho - margenIzq - margenDer;
  const altoGrafico = alto - margenSup - margenInf;
  const maxValor = Math.max(...datos.map(d => d.total), 1);
  const altoBarra = altoGrafico / datos.length * 0.62;

  svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
  svg.innerHTML = "";

  crearRectSvg(svg, 0, 0, ancho, alto, "#111827");

  datos.forEach((d, i) => {
    const y = margenSup + i * (altoGrafico / datos.length) + 8;
    const anchoBarra = (d.total / maxValor) * anchoGrafico;

    crearTextoSvg(svg, margenIzq - 12, y + altoBarra / 2 - 2, d.categoria, "#cbd5e1", "end", 14);
    crearRectSvg(svg, margenIzq, y, anchoBarra, altoBarra, colorCategoria(i));
    crearTextoSvg(svg, margenIzq + anchoBarra + 10, y + altoBarra / 2 + 4, formatearMiles(d.total), "#e5e7eb", "start", 13);
  });

  crearTextoSvg(svg, margenIzq, alto - 16, "Ingresos", "#cbd5e1", "start", 13);
}

function calcularIngresosPorCategoria(detalleFiltrado) {
  const ingresos = new Map();

  detalleFiltrado.forEach(linea => {
    const producto = productoPorId.get(linea.ProductID);
    const categoria = producto ? producto.Categoria : "Sin categoria";
    const ingreso = Number(linea.IngresoLinea || 0);

    ingresos.set(categoria, (ingresos.get(categoria) || 0) + ingreso);
  });

  return Array.from(ingresos, ([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

function crearRectSvg(svg, x, y, ancho, alto, color) {
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", ancho);
  rect.setAttribute("height", alto);
  rect.setAttribute("fill", color);
  svg.appendChild(rect);
}

function crearTextoSvg(svg, x, y, texto, color, anchor, size) {
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", x);
  text.setAttribute("y", y);
  text.setAttribute("fill", color);
  text.setAttribute("text-anchor", anchor);
  text.setAttribute("font-size", size);
  text.setAttribute("font-family", "Arial");
  text.textContent = texto;
  svg.appendChild(text);
}

function formatearMiles(valor) {
  if (valor >= 1000000) {
    return (valor / 1000000).toFixed(2) + "M";
  }

  if (valor >= 1000) {
    return Math.round(valor / 1000) + "K";
  }

  return Math.round(valor).toString();
}

function colorCategoria(indice) {
  const colores = ["#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444", "#ec4899", "#22c55e", "#3b82f6"];
  return colores[indice % colores.length];
}


/* ============================================================
   7. Grafico 3: Chart.js - pedidos por canal
   ============================================================ */

function dibujarChartCanalCompra(pedidosFiltrados) {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js no se ha cargado. Revisa la conexion a internet.");
    return;
  }

  const datos = contarPorCampo(pedidosFiltrados, "CanalCompra");
  const canvas = document.getElementById("chartCanalCompra");

  if (graficoCanalCompra) {
    graficoCanalCompra.destroy();
  }

  graficoCanalCompra = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: datos.map(d => d.nombre),
      datasets: [{
        data: datos.map(d => d.total),
        backgroundColor: ["#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444"],
        borderColor: "#111827",
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb"
          }
        }
      }
    }
  });
}

function contarPorCampo(lista, campo) {
  const conteo = new Map();

  lista.forEach(elemento => {
    const valor = elemento[campo] || "Sin dato";
    conteo.set(valor, (conteo.get(valor) || 0) + 1);
  });

  return Array.from(conteo, ([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);
}


/* ============================================================
   8. Grafico 4: D3.js - motivos de devolucion
   ============================================================ */

function dibujarD3MotivosDevolucion(devolucionesFiltradas) {
  if (typeof d3 === "undefined") {
    console.warn("D3.js no se ha cargado. Revisa la conexion a internet.");
    return;
  }

  const datos = contarPorCampo(devolucionesFiltradas, "MotivoDevolucion").slice(0, 10);
  const contenedor = d3.select("#d3MotivosDevolucion");

  contenedor.selectAll("*").remove();

  const ancho = 520;
  const alto = 360;
  const margen = { top: 25, right: 35, bottom: 35, left: 185 };

  const anchoGrafico = ancho - margen.left - margen.right;
  const altoGrafico = alto - margen.top - margen.bottom;

  const svg = contenedor
    .append("svg")
    .attr("viewBox", `0 0 ${ancho} ${alto}`);

  svg.append("rect")
    .attr("width", ancho)
    .attr("height", alto)
    .attr("fill", "#111827");

  const grupo = svg.append("g")
    .attr("transform", `translate(${margen.left}, ${margen.top})`);

  const escalaX = d3.scaleLinear()
    .domain([0, d3.max(datos, d => d.total) || 1])
    .range([0, anchoGrafico]);

  const escalaY = d3.scaleBand()
    .domain(datos.map(d => d.nombre))
    .range([0, altoGrafico])
    .padding(0.25);

  grupo.selectAll("rect")
    .data(datos)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", d => escalaY(d.nombre))
    .attr("width", d => escalaX(d.total))
    .attr("height", escalaY.bandwidth())
    .attr("fill", "#ec4899");

  grupo.selectAll(".valor")
    .data(datos)
    .enter()
    .append("text")
    .attr("class", "valor")
    .attr("x", d => escalaX(d.total) + 8)
    .attr("y", d => escalaY(d.nombre) + escalaY.bandwidth() / 2 + 4)
    .attr("fill", "#e5e7eb")
    .attr("font-size", 12)
    .text(d => d.total);

  grupo.append("g")
    .call(d3.axisLeft(escalaY))
    .selectAll("text")
    .attr("fill", "#cbd5e1")
    .attr("font-size", 12);

  grupo.append("g")
    .attr("transform", `translate(0, ${altoGrafico})`)
    .call(d3.axisBottom(escalaX).ticks(5))
    .selectAll("text")
    .attr("fill", "#cbd5e1");

  grupo.selectAll("path, line")
    .attr("stroke", "#64748b");
}

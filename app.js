const els = {
  anio: document.getElementById('anio'),
  mes: document.getElementById('mes'),
  depto: document.getElementById('depto'),
  estacion: document.getElementById('estacion'),
  kpi_total: document.getElementById('kpi_total'),
  kpi_rows: document.getElementById('kpi_rows'),
  kpi_cov: document.getElementById('kpi_cov'),
  story: document.getElementById('story'),
};

let DATA = [];
let MAP = null;
let GEO_LAYER = null;
let DEPT_VALUES = {};

function fmt(n) {
  try { return new Intl.NumberFormat('es-CO').format(Math.round(n)); }
  catch { return String(Math.round(n)); }
}

function norm(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function uniq(arr) {
  return Array.from(new Set(arr)).filter(v => v !== null && v !== undefined && v !== '' && !Number.isNaN(v));
}

function addOptions(select, values, labelAll='(Todos)') {
  select.innerHTML = '';
  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = labelAll;
  select.appendChild(optAll);
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = String(v);
    opt.textContent = String(v);
    select.appendChild(opt);
  });
}

function getFilters() {
  return {
    anio: els.anio.value ? Number(els.anio.value) : null,
    mes: els.mes.value ? Number(els.mes.value) : null,
    departamento: els.depto.value || null,
    estacion: els.estacion.value || null,
  };
}

function applyFilters(data, f) {
  return data.filter(r => {
    if (f.anio !== null && r.anio !== f.anio) return false;
    if (f.mes !== null && r.mes !== f.mes) return false;
    if (f.departamento !== null && r.departamento !== f.departamento) return false;
    if (f.estacion !== null && r.estacion !== f.estacion) return false;
    return true;
  });
}

function ymKey(r) {
  const y = r.anio;
  const m = String(r.mes).padStart(2, '0');
  return `${y}-${m}`;
}

function sumMap(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    m.set(k, (m.get(k) || 0) + (r.trafico_total || 0));
  }
  return m;
}

function topN(map, n) {
  return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,n);
}

function setStory(filtered, total, topDep, topEst) {
  const nRows = filtered.length;
  const nDept = uniq(filtered.map(r=>r.departamento)).length;
  const nEst = uniq(filtered.map(r=>r.estacion)).length;

  const depShare = total ? (topDep?.[1] || 0) / total * 100 : 0;
  const estShare = total ? (topEst?.[1] || 0) / total * 100 : 0;

  els.story.innerHTML = `
    <p>
      Con los filtros actuales, el <b>tráfico total</b> suma <b>${fmt(total)}</b>.
      Estamos viendo <b>${fmt(nRows)}</b> registros, que cubren <b>${nDept}</b> departamentos y <b>${nEst}</b> estaciones.
    </p>
    <div class="callout">
      <p style="margin:0"><b>Concentración</b>: el departamento líder es <b>${topDep ? topDep[0] : '—'}</b>
      con <b>${topDep ? fmt(topDep[1]) : '—'}</b> (${depShare.toFixed(1)}%).</p>
      <p style="margin:8px 0 0"><b>Estación crítica</b>: la estación #1 es <b>${topEst ? topEst[0] : '—'}</b>
      con <b>${topEst ? fmt(topEst[1]) : '—'}</b> (${estShare.toFixed(1)}%).</p>
    </div>
    <p>
      Lectura operativa: si el objetivo es maximizar impacto, una estrategia razonable es comenzar por el top territorial
      (departamentos) y luego por el top de estaciones dentro de cada territorio.
    </p>
  `;
}

function render() {
  const f = getFilters();
  const filtered = applyFilters(DATA, f);

  // KPIs
  const total = filtered.reduce((acc,r)=>acc + (r.trafico_total||0), 0);
  els.kpi_total.textContent = fmt(total);
  els.kpi_rows.textContent = fmt(filtered.length);
  els.kpi_cov.textContent = `${uniq(filtered.map(r=>r.departamento)).length} deptos · ${uniq(filtered.map(r=>r.estacion)).length} estaciones`;

  // Timeseries
  const byYM = sumMap(filtered, ymKey);
  const x = Array.from(byYM.keys()).sort();
  const y = x.map(k => byYM.get(k));

  Plotly.newPlot('chart_timeseries', [{
    x, y,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#f59e0b', width: 3 },
    marker: { size: 6, color: '#22c55e' }
  }], {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e6edf3' },
    margin: { t: 10, r: 10, b: 40, l: 70 },
    xaxis: { title: 'Año-Mes', gridcolor: '#21304a' },
    yaxis: { title: 'Tráfico Total', gridcolor: '#21304a' },
  }, {displayModeBar: false});

  // Top stations
  const topEst = topN(sumMap(filtered, r=>r.estacion), 12);
  Plotly.newPlot('chart_top_est', [{
    x: topEst.map(x=>x[1]).reverse(),
    y: topEst.map(x=>x[0]).reverse(),
    type: 'bar', orientation: 'h',
    marker: { color: '#22c55e' }
  }], {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e6edf3' },
    margin: { t: 10, r: 10, b: 40, l: 190 },
    xaxis: { title: 'Tráfico Total', gridcolor: '#21304a' },
    yaxis: { automargin: true },
  }, {displayModeBar: false});

  // Top departments
  const topDepList = topN(sumMap(filtered, r=>r.departamento), 12);
  Plotly.newPlot('chart_top_dep', [{
    x: topDepList.map(x=>x[1]).reverse(),
    y: topDepList.map(x=>x[0]).reverse(),
    type: 'bar', orientation: 'h',
    marker: { color: '#60a5fa' }
  }], {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e6edf3' },
    margin: { t: 10, r: 10, b: 40, l: 190 },
    xaxis: { title: 'Tráfico Total', gridcolor: '#21304a' },
    yaxis: { automargin: true },
  }, {displayModeBar: false});

  const topDep = topDepList[0];
  setStory(filtered, total, topDep, topEst[0]);

  // Map values
  DEPT_VALUES = Object.fromEntries(topN(sumMap(filtered, r=>r.departamento), 200));
  refreshGeoLayer();
}

function refreshGeoLayer() {
  if (!MAP || !GEO_LAYER) return;

  const vals = Object.values(DEPT_VALUES);
  const max = Math.max(...vals, 1);

  const color = (v) => {
    if (v == null) return '#22c55e';
    const t = Math.max(0, Math.min(1, v / (max || 1)));
    // amber -> green
    const r = Math.round(245 - 120 * t);
    const g = Math.round(158 + 60 * t);
    const b = Math.round(11 + 40 * (1 - t));
    return `rgb(${r},${g},${b})`;
  };

  // Keep country outline subtle
  GEO_LAYER.setStyle(() => ({ fillColor: '#122449', weight: 1.2, color: '#1f2a3f', fillOpacity: 0.10 }));

  // Refresh markers
  if (MAP.__markerLayer) {
    MAP.__markerLayer.clearLayers();
    const CENTROIDS = MAP.__centroids || {};

    for (const [dep, v] of Object.entries(DEPT_VALUES)) {
      const c = CENTROIDS[dep];
      if (!c) continue;
      const radius = 6 + 18 * (v / (max || 1));
      const marker = L.circleMarker(c, {
        radius,
        color: '#0b1220',
        weight: 1,
        fillColor: color(v),
        fillOpacity: 0.85,
      }).addTo(MAP.__markerLayer);
      marker.bindTooltip(`<b>${dep}</b><br>Tráfico total: ${fmt(v)}`);
    }
  }
}

async function initMap() {
  MAP = L.map('map', { scrollWheelZoom: false }).setView([4.57, -74.3], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 9,
    attribution: '&copy; OpenStreetMap'
  }).addTo(MAP);

  try {
    const geo = await fetch('./colombia.geojson').then(r=>r.json());
    GEO_LAYER = L.geoJSON(geo, {
      style: () => ({ fillColor: '#122449', weight: 1.2, color: '#1f2a3f', fillOpacity: 0.12 }),
    }).addTo(MAP);

    // Department centroid markers (approx). Only for common departments; extend as needed.
    const CENTROIDS = {
      'SANTANDER': [7.12, -73.12],
      'ANTIOQUIA': [6.25, -75.58],
      'CUNDINAMARCA': [4.71, -74.07],
      'VALLE DEL CAUCA': [3.45, -76.53],
      'BOYACA': [5.54, -73.36],
      'CESAR': [10.47, -73.25],
      'TOLIMA': [4.44, -75.24],
      'CAUCA': [2.44, -76.61],
      'CORDOBA': [8.75, -75.88],
      'RISARALDA': [4.81, -75.69],
      'NORTE DE SAN': [7.89, -72.50],
      'GUAJIRA': [11.54, -72.91],
      'HUILA': [2.93, -75.28],
      'CALDAS': [5.07, -75.52],
      'NARINO': [1.21, -77.28],
      'ATLANTICO': [10.98, -74.80],
      'BOLIVAR': [10.39, -75.48],
      'MAGDALENA': [11.24, -74.20],
      'META': [4.15, -73.64],
      'QUINDIO': [4.53, -75.68],
      'CASANARE': [5.35, -72.41],
      'SUCRE': [9.30, -75.40],
      'CAQUETA': [1.61, -75.61],
      'PUTUMAYO': [0.83, -77.64],
      'CHOCO': [5.69, -76.66],
      'ARAUCA': [7.08, -70.76],
    };

    // Marker layer
    const markerLayer = L.layerGroup().addTo(MAP);
    MAP.__markerLayer = markerLayer;
    MAP.__centroids = CENTROIDS;

    refreshGeoLayer();
  } catch (e) {
    const note = L.control({ position: 'topright' });
    note.onAdd = () => {
      const d = L.DomUtil.create('div');
      d.style.background = 'rgba(17,27,46,.92)';
      d.style.padding = '10px';
      d.style.border = '1px solid #21304a';
      d.style.borderRadius = '10px';
      d.style.color = '#e6edf3';
      d.style.maxWidth = '260px';
      d.innerHTML = '<b>Mapa no disponible</b><br><span style="color:#a8b6c8">No se pudo cargar el GeoJSON externo.</span>';
      return d;
    };
    note.addTo(MAP);
  }
}

async function loadCSV() {
  const text = await fetch('./data_trafico_total.csv', { cache: 'no-store' }).then(r=>r.text());
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',');
  const idx = Object.fromEntries(header.map((h,i)=>[h.trim(), i]));

  DATA = lines.slice(1).map(line => {
    const parts = line.split(',');
    const anio = Number(parts[idx.anio]);
    const mes = Number(parts[idx.mes]);
    const traf = Number(parts[idx.trafico_total]);
    const dep = norm(parts[idx.departamento]);
    const est = norm(parts[idx.estacion]);
    return {
      estacion: est,
      departamento: dep,
      anio: Number.isFinite(anio) ? anio : null,
      mes: Number.isFinite(mes) ? mes : null,
      trafico_total: Number.isFinite(traf) ? traf : 0,
    };
  }).filter(r => r.anio !== null);
}

function computeAvailableOptions(current) {
  // Cascading filters: compute valid options for each dropdown given the others.
  const base = DATA;

  const filteredForAnio = applyFilters(base, { ...current, anio: null });
  const filteredForMes = applyFilters(base, { ...current, mes: null });
  const filteredForDepto = applyFilters(base, { ...current, departamento: null });
  const filteredForEst = applyFilters(base, { ...current, estacion: null });

  return {
    anios: uniq(filteredForAnio.map(r => r.anio)).sort((a,b)=>a-b),
    meses: uniq(filteredForMes.map(r => r.mes)).filter(x=>x!==null).sort((a,b)=>a-b),
    deptos: uniq(filteredForDepto.map(r => r.departamento)).sort(),
    estaciones: uniq(filteredForEst.map(r => r.estacion)).sort(),
  };
}

function repopulateFilters() {
  const current = getFilters();
  const opts = computeAvailableOptions(current);

  // Preserve selection if still valid, else reset
  const keepOrReset = (select, validValues) => {
    const prev = select.value;
    const ok = prev === '' || validValues.map(String).includes(String(prev));
    return ok ? prev : '';
  };

  const prevAnio = keepOrReset(els.anio, opts.anios);
  const prevMes = keepOrReset(els.mes, opts.meses);
  const prevDepto = keepOrReset(els.depto, opts.deptos);
  const prevEst = keepOrReset(els.estacion, opts.estaciones);

  addOptions(els.anio, opts.anios);
  addOptions(els.mes, opts.meses);
  addOptions(els.depto, opts.deptos);
  addOptions(els.estacion, opts.estaciones);

  els.anio.value = prevAnio;
  els.mes.value = prevMes;
  els.depto.value = prevDepto;
  els.estacion.value = prevEst;
}

function populateFilters() {
  // initial fill
  repopulateFilters();

  const onChange = () => {
    repopulateFilters();
    render();
  };

  [els.anio, els.mes, els.depto, els.estacion].forEach(el => el.addEventListener('change', onChange));
}

async function main() {
  await loadCSV();
  await initMap();
  populateFilters();
  render();
}

main().catch(err => {
  console.error(err);
  alert('Error cargando datos. Revisa que data_trafico_total.csv esté en la misma carpeta.');
});

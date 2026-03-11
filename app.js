// Static dashboard for Tráfico Total (desktop)
// Primary file: data_trafico_total.csv (UTF-8)

const els = {
  file: document.getElementById('file'),
  btnReload: document.getElementById('btnReload'),
  status: document.getElementById('status'),
  anio: document.getElementById('anio'),
  mes: document.getElementById('mes'),
  depto: document.getElementById('depto'),
  estacion: document.getElementById('estacion'),
  insights: document.getElementById('insights'),
  btnDownloadFiltered: document.getElementById('btnDownloadFiltered'),
};

let DATA = [];

function setStatus(msg) {
  els.status.textContent = `Estado: ${msg}`;
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

function fmtNum(n) {
  try {
    return new Intl.NumberFormat('es-CO').format(Math.round(n));
  } catch {
    return String(Math.round(n));
  }
}

function setInsights(filtered) {
  els.insights.innerHTML = '';

  const total = filtered.reduce((acc, r) => acc + (r.trafico_total || 0), 0);
  const nEst = uniq(filtered.map(r => r.estacion)).length;
  const nDept = uniq(filtered.map(r => r.departamento)).length;

  const byDep = Array.from(sumMap(filtered, r => r.departamento).entries()).sort((a,b)=>b[1]-a[1]);
  const topDep = byDep[0];

  const byEst = Array.from(sumMap(filtered, r => r.estacion).entries()).sort((a,b)=>b[1]-a[1]);
  const topEst = byEst[0];

  const add = (html) => {
    const li = document.createElement('li');
    li.className = 'bg-slate-950/40 border border-slate-800 rounded-lg p-3';
    li.innerHTML = html;
    els.insights.appendChild(li);
  };

  add(`<b>Total (filtro actual):</b> ${fmtNum(total)}.<br><span class="text-slate-400">Cobertura: ${nDept} departamentos, ${nEst} estaciones.</span>`);

  if (topDep) {
    const share = total ? (topDep[1] / total) * 100 : 0;
    add(`<b>Departamento #1:</b> ${topDep[0]} con ${fmtNum(topDep[1])} (${share.toFixed(1)}%).`);
  }

  if (topEst) {
    const share = total ? (topEst[1] / total) * 100 : 0;
    add(`<b>Estación #1:</b> ${topEst[0]} con ${fmtNum(topEst[1])} (${share.toFixed(1)}%).`);
  }
}

function render() {
  const f = getFilters();
  const filtered = applyFilters(DATA, f);

  // Timeseries
  const byYM = sumMap(filtered, ymKey);
  const x = Array.from(byYM.keys()).sort();
  const y = x.map(k => byYM.get(k));

  Plotly.newPlot('chart_timeseries', [{
    x, y,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#22d3ee', width: 3 },
    marker: { size: 6 }
  }], {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e2e8f0' },
    margin: { t: 10, r: 10, b: 40, l: 70 },
    xaxis: { title: 'Año-Mes', gridcolor: '#334155' },
    yaxis: { title: 'Tráfico Total', gridcolor: '#334155' },
  }, {displayModeBar: false});

  // Top stations
  const topEst = Array.from(sumMap(filtered, r => r.estacion).entries())
    .sort((a,b)=>b[1]-a[1])
    .slice(0, 12);

  const estY = topEst.map(([k,_]) => k).reverse();
  const estX = topEst.map(([_,v]) => v).reverse();

  Plotly.newPlot('chart_top_est', [{
    x: estX,
    y: estY,
    type: 'bar',
    orientation: 'h',
    marker: { color: '#38bdf8' }
  }], {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e2e8f0' },
    margin: { t: 10, r: 10, b: 40, l: 190 },
    xaxis: { title: 'Tráfico Total', gridcolor: '#334155' },
    yaxis: { automargin: true },
  }, {displayModeBar: false});

  // Top departments
  const topDep = Array.from(sumMap(filtered, r => r.departamento).entries())
    .sort((a,b)=>b[1]-a[1])
    .slice(0, 10);

  const depY = topDep.map(([k,_]) => k).reverse();
  const depX = topDep.map(([_,v]) => v).reverse();

  Plotly.newPlot('chart_top_dep', [{
    x: depX,
    y: depY,
    type: 'bar',
    orientation: 'h',
    marker: { color: '#34d399' }
  }], {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e2e8f0' },
    margin: { t: 10, r: 10, b: 40, l: 190 },
    xaxis: { title: 'Tráfico Total', gridcolor: '#334155' },
    yaxis: { automargin: true },
  }, {displayModeBar: false});

  setInsights(filtered);
}

function parseCSV(text) {
  // Minimal CSV parse (assumes no commas inside fields)
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',');
  const idx = Object.fromEntries(header.map((h,i)=>[h.trim(), i]));

  return lines.slice(1).map(line => {
    const parts = line.split(',');
    return {
      estacion: parts[idx.estacion],
      anio: Number(parts[idx.anio]),
      mes: Number(parts[idx.mes]),
      codigo_estacion: parts[idx.codigo_estacion],
      departamento: parts[idx.departamento],
      trafico_total: Number(parts[idx.trafico_total]) || 0,
    };
  });
}

function toCSV(rows) {
  const header = ['estacion','anio','mes','departamento','codigo_estacion','trafico_total'];
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[\n\r,"]/g.test(s)) return '"' + s.replaceAll('"', '""') + '"';
    return s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(header.map(k => escape(r[k])).join(','));
  }
  return lines.join('\n');
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadAutoOrFile() {
  // 1) Try fetch (works if served via http.server or similar)
  try {
    setStatus('cargando CSV (auto)…');
    const resp = await fetch('./data_trafico_total.csv', { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    DATA = parseCSV(text);
    setStatus(`cargado automáticamente (${DATA.length} filas)`);
    return;
  } catch (e) {
    setStatus('auto no disponible. Selecciona el CSV manualmente.');
  }

  // 2) If a file is selected, load it
  const file = els.file.files && els.file.files[0];
  if (file) {
    const text = await file.text();
    DATA = parseCSV(text);
    setStatus(`cargado desde archivo (${DATA.length} filas)`);
  }
}

function populateFilters() {
  addOptions(els.anio, uniq(DATA.map(r => r.anio)).sort((a,b)=>a-b));
  addOptions(els.mes, uniq(DATA.map(r => r.mes)).sort((a,b)=>a-b));
  addOptions(els.depto, uniq(DATA.map(r => r.departamento)).sort());
  addOptions(els.estacion, uniq(DATA.map(r => r.estacion)).sort());

  [els.anio, els.mes, els.depto, els.estacion].forEach(el => el.addEventListener('change', render));
}

async function main() {
  els.btnReload.addEventListener('click', async () => {
    await loadAutoOrFile();
    if (DATA.length) {
      populateFilters();
      render();
    }
  });

  els.file.addEventListener('change', async () => {
    await loadAutoOrFile();
    if (DATA.length) {
      populateFilters();
      render();
    }
  });

  // Download filtered CSV (works on GitHub Pages too)
  if (els.btnDownloadFiltered) {
    els.btnDownloadFiltered.addEventListener('click', () => {
      if (!DATA.length) return;
      const f = getFilters();
      const filtered = applyFilters(DATA, f);

      const parts = [
        f.anio ? `anio${f.anio}` : null,
        f.mes ? `mes${String(f.mes).padStart(2,'0')}` : null,
        f.departamento ? `dep_${f.departamento.replaceAll(' ', '_')}` : null,
        f.estacion ? `est_${f.estacion.replaceAll(' ', '_')}` : null,
      ].filter(Boolean);
      const suffix = parts.length ? parts.join('__') : 'todos';
      const filename = `trafico_total_filtrado__${suffix}.csv`;

      downloadText(filename, toCSV(filtered));
    });
  }

  await loadAutoOrFile();
  if (DATA.length) {
    populateFilters();
    render();
  }
}

main().catch(err => {
  console.error(err);
  setStatus('error cargando datos');
});

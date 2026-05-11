// Portfolio Tracker — standalone version
// Persistence: localStorage (data stays in your browser, this device only)

const STORAGE_KEY = 'portfolio_tracker_v1';
const USD_CLP = 950;

let currentMarketFilter = 'ALL';
let rotationState = { sellIds: new Set(), preset: 'balanced' };
let portfolio = [];
let projChart = null;
let benchChart = null;
let deferredInstallPrompt = null;

const benchmarks = {
  ipsa: { '1Y': 18.5, '3Y': 12.4, '5Y': 8.2, '10Y': 5.5, '20Y': 6.8 },
  spy: { '1Y': 13.2, '3Y': 15.1, '5Y': 14.4, '10Y': 13.0, '20Y': 10.5 },
  qqq: { '1Y': 16.8, '3Y': 18.5, '5Y': 17.7, '10Y': 17.2, '20Y': 13.8 }
};

const yields = {
  SCHWAGER: 0, AAISA: 2.5, PLANVITAL: 4.5, OROBLANCO: 8.0, ZOFRI: 4.0,
  LIPIGAS: 6.0, 'ANDINA-B': 5.0, ENELCHILE: 5.5, PEHUENCHE: 6.5, 'AGUAS-A': 4.6,
  VOO: 1.3, IVV: 1.3, VTI: 1.3, SCHD: 3.5, QQQ: 0.6, VXUS: 3.0,
  O: 5.5, MSFT: 0.7, KO: 2.8, GOOGL: 0.4, NEE: 2.7, AAPL: 0.5,
  JNJ: 3.0, PG: 2.5, T: 4.0, AXP: 1.0, VYM: 3.0, BND: 4.0
};

const presets = {
  balanced: {
    name: 'Balanceado a 20 años',
    desc: 'La asignación recomendada del plan: 40% VOO, 20% SCHD, 15% QQQ, 10% VXUS, 15% individuales (O, MSFT, KO).',
    items: [
      { ticker: 'VOO', name: 'ETF S&P 500', pct: 40, yield: 1.3 },
      { ticker: 'SCHD', name: 'ETF Dividend Growers', pct: 20, yield: 3.5 },
      { ticker: 'QQQ', name: 'ETF Nasdaq 100', pct: 15, yield: 0.6 },
      { ticker: 'VXUS', name: 'ETF Mundo ex-US', pct: 10, yield: 3.0 },
      { ticker: 'O', name: 'Realty Income (REIT)', pct: 7, yield: 5.5 },
      { ticker: 'MSFT', name: 'Microsoft', pct: 5, yield: 0.7 },
      { ticker: 'KO', name: 'Coca-Cola', pct: 3, yield: 2.8 }
    ]
  },
  dividend: {
    name: 'Foco en dividendos',
    desc: 'Maximiza ingreso pasivo. Yield promedio ~4.2%. Más estabilidad, menos crecimiento de capital.',
    items: [
      { ticker: 'SCHD', name: 'ETF Dividend Growers', pct: 35, yield: 3.5 },
      { ticker: 'O', name: 'Realty Income (REIT)', pct: 25, yield: 5.5 },
      { ticker: 'VYM', name: 'ETF High Dividend', pct: 15, yield: 3.0 },
      { ticker: 'NEE', name: 'NextEra Energy', pct: 10, yield: 2.7 },
      { ticker: 'T', name: 'AT&T', pct: 8, yield: 4.0 },
      { ticker: 'KO', name: 'Coca-Cola', pct: 7, yield: 2.8 }
    ]
  },
  growth: {
    name: 'Crecimiento agresivo',
    desc: 'Apuesta por apreciación de capital, no dividendo. Más volatilidad. Yield promedio ~1.0%.',
    items: [
      { ticker: 'QQQ', name: 'ETF Nasdaq 100', pct: 40, yield: 0.6 },
      { ticker: 'VOO', name: 'ETF S&P 500', pct: 30, yield: 1.3 },
      { ticker: 'MSFT', name: 'Microsoft', pct: 12, yield: 0.7 },
      { ticker: 'GOOGL', name: 'Alphabet', pct: 10, yield: 0.4 },
      { ticker: 'AAPL', name: 'Apple', pct: 8, yield: 0.5 }
    ]
  },
  conservative: {
    name: 'Conservador estable',
    desc: 'Mínima volatilidad, dividendos sólidos. Yield promedio ~3.5%. Ideal si te acercas al final del horizonte.',
    items: [
      { ticker: 'SCHD', name: 'ETF Dividend Growers', pct: 30, yield: 3.5 },
      { ticker: 'VOO', name: 'ETF S&P 500', pct: 25, yield: 1.3 },
      { ticker: 'O', name: 'Realty Income (REIT)', pct: 20, yield: 5.5 },
      { ticker: 'BND', name: 'ETF Bonos Total', pct: 15, yield: 4.0 },
      { ticker: 'JNJ', name: 'Johnson & Johnson', pct: 5, yield: 3.0 },
      { ticker: 'PG', name: 'Procter & Gamble', pct: 5, yield: 2.5 }
    ]
  }
};

const defaultPortfolio = [
  { id: '1', ticker: 'SCHWAGER', name: 'Schwager Energy', market: 'CL', qty: 178755, buyPrice: 1.77, currentPrice: 2.24 },
  { id: '2', ticker: 'AAISA', name: 'Adm. Americana Inversiones', market: 'CL', qty: 685, buyPrice: 296.97, currentPrice: 388.37 },
  { id: '3', ticker: 'PLANVITAL', name: 'AFP Planvital', market: 'CL', qty: 810, buyPrice: 237.72, currentPrice: 281.60 },
  { id: '4', ticker: 'OROBLANCO', name: 'Inversiones Oro Blanco', market: 'CL', qty: 17931, buyPrice: 7.86, currentPrice: 11.68 },
  { id: '5', ticker: 'ZOFRI', name: 'Zona Franca de Iquique', market: 'CL', qty: 146, buyPrice: 984.82, currentPrice: 1018.80 },
  { id: '6', ticker: 'LIPIGAS', name: 'Empresas Lipigas', market: 'CL', qty: 17, buyPrice: 6382.68, currentPrice: 8045.60 },
  { id: '7', ticker: 'ANDINA-B', name: 'Embotelladora Andina B', market: 'CL', qty: 30, buyPrice: 4058.10, currentPrice: 4336.10 },
  { id: '8', ticker: 'ENELCHILE', name: 'Enel Chile', market: 'CL', qty: 1082, buyPrice: 71.63, currentPrice: 81.86 },
  { id: '9', ticker: 'PEHUENCHE', name: 'Eléctrica Pehuenche', market: 'CL', qty: 30, buyPrice: 2868.92, currentPrice: 2630.00 },
  { id: '10', ticker: 'AGUAS-A', name: 'Aguas Andinas A', market: 'CL', qty: 224, buyPrice: 345.63, currentPrice: 334.74 }
];

// --- Persistence helpers ---
function loadPortfolio() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    portfolio = stored ? JSON.parse(stored) : defaultPortfolio;
  } catch (e) {
    console.error('Error loading portfolio:', e);
    portfolio = defaultPortfolio;
  }
}
function savePortfolio() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  } catch (e) {
    console.error('Error saving portfolio:', e);
    alert('Error al guardar. Tu navegador podría tener almacenamiento deshabilitado.');
  }
}

// --- Calculation helpers ---
const fmt = (n, isCLP) => isCLP ? '$' + Math.round(n).toLocaleString('es-CL') : '$' + Math.round(n).toLocaleString('en-US');
const posValueUSD = p => { const v = p.qty * p.currentPrice; return p.market === 'CL' ? v / USD_CLP : v; };
const posCostUSD = p => { const c = p.qty * p.buyPrice; return p.market === 'CL' ? c / USD_CLP : c; };
const posGainUSD = p => posValueUSD(p) - posCostUSD(p);
const posReturnPct = p => (p.currentPrice - p.buyPrice) / p.buyPrice * 100;
const posYield = p => p.yield !== undefined ? p.yield : (yields[p.ticker] ?? 0);
const posAnnualDividend = p => posValueUSD(p) * posYield(p) / 100;
const filterPortfolio = mkt => mkt === 'ALL' ? portfolio : portfolio.filter(p => p.market === mkt);

function aggregateMetrics(mkt) {
  const filtered = filterPortfolio(mkt);
  const val = filtered.reduce((a, p) => a + posValueUSD(p), 0);
  const cost = filtered.reduce((a, p) => a + posCostUSD(p), 0);
  const div = filtered.reduce((a, p) => a + posAnnualDividend(p), 0);
  return { val, cost, gain: val - cost, pct: cost > 0 ? ((val - cost) / cost * 100) : 0, count: filtered.length, div };
}

function getSector(ticker) {
  const map = {
    'SCHWAGER': 'Energía/Servicios', 'LIPIGAS': 'Energía/Servicios',
    'ENELCHILE': 'Utilities', 'PEHUENCHE': 'Utilities', 'AGUAS-A': 'Utilities',
    'AAISA': 'Holdings', 'OROBLANCO': 'Holdings',
    'PLANVITAL': 'Financiero', 'ANDINA-B': 'Consumo', 'ZOFRI': 'Comercial',
    'VOO': 'ETF S&P 500', 'IVV': 'ETF S&P 500', 'SCHD': 'ETF Dividendos',
    'QQQ': 'ETF Tech', 'VXUS': 'ETF Internacional', 'VTI': 'ETF Total US',
    'O': 'REIT', 'MSFT': 'Tecnología US', 'KO': 'Consumo US',
    'GOOGL': 'Tecnología US', 'NEE': 'Utility US', 'JNJ': 'Salud US',
    'PG': 'Consumo US', 'AAPL': 'Tecnología US', 'T': 'Telecom US',
    'VYM': 'ETF Dividendos', 'BND': 'ETF Bonos'
  };
  return map[ticker] || 'Otros';
}

// --- Renderers ---
function renderMetrics() {
  const m = aggregateMetrics(currentMarketFilter);
  const losers = filterPortfolio(currentMarketFilter).filter(p => posReturnPct(p) < 0).length;
  const metrics = [
    { label: 'Valor total', value: fmt(m.val), sub: fmt(m.val * USD_CLP, true) + ' CLP' },
    { label: 'Ganancia', value: fmt(m.gain), sub: (m.gain >= 0 ? '+' : '') + m.pct.toFixed(2) + '%', color: m.gain >= 0 ? 'success' : 'danger' },
    { label: 'Dividendos/año', value: fmt(m.div), sub: m.val > 0 ? (m.div / m.val * 100).toFixed(2) + '% yield' : '—' },
    { label: 'A meta US$100k', value: Math.min(100, (m.val / 100000 * 100)).toFixed(1) + '%', sub: fmt(Math.max(0, 100000 - m.val)) + ' restante' }
  ];
  document.getElementById('metrics-grid').innerHTML = metrics.map(mt => {
    const c = mt.color === 'success' ? 'var(--text-success)' : mt.color === 'danger' ? 'var(--text-danger)' : 'var(--text-primary)';
    return `<div class="metric-card"><p class="metric-label">${mt.label}</p><p class="metric-value" style="color: ${c};">${mt.value}</p><p class="metric-sub">${mt.sub}</p></div>`;
  }).join('');

  const total = aggregateMetrics('ALL');
  const monthlyR = 0.08 / 12;
  let curr = total.val, months = 0;
  while (curr < 100000 && months < 600) { curr = curr * (1 + monthlyR) + 600; months++; }
  document.getElementById('progress-bar').style.width = Math.min(100, total.val / 100000 * 100) + '%';
  document.getElementById('progress-current').textContent = fmt(total.val) + ' / $100,000';
  document.getElementById('progress-eta').textContent = total.val >= 100000 ? '¡Meta alcanzada!' : 'En ~' + (months / 12).toFixed(1) + ' años con US$600/mes';
}

function renderMarketSplit() {
  const cl = aggregateMetrics('CL'), us = aggregateMetrics('US');
  const total = cl.val + us.val;
  const clPct = total > 0 ? (cl.val / total * 100) : 0;
  const usPct = total > 0 ? (us.val / total * 100) : 0;
  document.getElementById('cl-summary').innerHTML = `<div style="font-size: 20px; font-weight: 500; margin-bottom: 4px;">${fmt(cl.val)}</div><div class="text-secondary" style="font-size: 12px; margin-bottom: 8px;">${clPct.toFixed(1)}% del total · ${cl.count} posiciones</div><div style="font-size: 13px;" class="${cl.gain >= 0 ? 'text-success' : 'text-danger'}">${cl.gain >= 0 ? '+' : ''}${fmt(cl.gain)} (${cl.pct.toFixed(2)}%)</div>`;
  document.getElementById('us-summary').innerHTML = us.count === 0
    ? `<div class="text-tertiary" style="font-size: 14px; padding: 12px 0; text-align: center;"><i class="ti ti-plus-circle" style="font-size: 24px; display: block; margin: 0 auto 8px;"></i>Sin posiciones aún<br><span style="font-size: 12px;">Agrega VOO, SCHD u otros</span></div>`
    : `<div style="font-size: 20px; font-weight: 500; margin-bottom: 4px;">${fmt(us.val)}</div><div class="text-secondary" style="font-size: 12px; margin-bottom: 8px;">${usPct.toFixed(1)}% del total · ${us.count} posiciones</div><div style="font-size: 13px;" class="${us.gain >= 0 ? 'text-success' : 'text-danger'}">${us.gain >= 0 ? '+' : ''}${fmt(us.gain)} (${us.pct.toFixed(2)}%)</div>`;
}

function renderDistribution() {
  const filtered = filterPortfolio(currentMarketFilter);
  const sectors = {};
  filtered.forEach(p => { const v = posValueUSD(p); const s = getSector(p.ticker); sectors[s] = (sectors[s] || 0) + v; });
  const total = Object.values(sectors).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(sectors).sort((a, b) => b[1] - a[1]);
  const colors = ['#378ADD', '#1D9E75', '#D85A30', '#D4537E', '#7F77DD', '#BA7517', '#888780'];
  document.getElementById('dist-scope').textContent = currentMarketFilter === 'CL' ? '(solo Chile)' : currentMarketFilter === 'US' ? '(solo EE.UU.)' : '(total)';
  document.getElementById('dist-bars').innerHTML = total === 0
    ? `<div class="text-tertiary" style="font-size: 13px; padding: 16px 0; text-align: center;">Sin posiciones</div>`
    : sorted.map(([s, v], i) => {
      const pct = (v / total * 100);
      return `<div style="margin-bottom: 10px;"><div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;"><span>${s}</span><span class="text-secondary">${fmt(v)} · ${pct.toFixed(1)}%</span></div><div class="bar-container" style="height: 8px; border-radius: 4px;"><div class="bar-fill" style="background: ${colors[i % colors.length]}; width: ${pct}%;"></div></div></div>`;
    }).join('');
  document.getElementById('market-split').style.display = currentMarketFilter === 'ALL' ? 'grid' : 'none';
}

function renderPositions() {
  const renderList = (mkt, containerId, countId) => {
    const filtered = portfolio.filter(p => p.market === mkt);
    document.getElementById(countId).textContent = filtered.length + ' posición(es)';
    if (filtered.length === 0) {
      document.getElementById(containerId).innerHTML = `<div class="text-tertiary" style="background: var(--bg-secondary); border-radius: var(--radius-md); padding: 16px; text-align: center; font-size: 13px;">No hay posiciones</div>`;
      return;
    }
    document.getElementById(containerId).innerHTML = filtered.map(p => {
      const vUSD = posValueUSD(p), pct = posReturnPct(p), y = posYield(p), div = posAnnualDividend(p);
      const cls = pct >= 0 ? 'text-success' : 'text-danger';
      return `<div class="row">
        <div class="row-main">
          <div class="row-title">${p.ticker} ${y > 0 ? `<span class="text-success" style="font-size: 11px; font-weight: 400; margin-left: 4px;">${y}% yield</span>` : ''}</div>
          <div class="row-sub">${p.name || ''} · ${p.qty.toLocaleString('es-CL')} u. ${div > 0 ? `· ${fmt(div)}/año` : ''}</div>
        </div>
        <div class="row-aside" style="margin-right: 12px;">
          <div class="row-title">${fmt(vUSD)}</div>
          <div class="${cls}" style="font-size: 12px;">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</div>
        </div>
        <button class="btn btn-sm btn-icon btn-danger del-btn" data-id="${p.id}"><i class="ti ti-x"></i></button>
      </div>`;
    }).join('');
  };
  renderList('CL', 'cl-positions', 'cl-count');
  renderList('US', 'us-positions', 'us-count');
  document.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.id;
    if (!confirm('¿Eliminar esta posición?')) return;
    portfolio = portfolio.filter(p => p.id !== id);
    savePortfolio();
    renderAll();
  }));
}

function renderDividends() {
  const total = aggregateMetrics('ALL');
  const cl = aggregateMetrics('CL');
  const us = aggregateMetrics('US');
  const avgYield = total.val > 0 ? (total.div / total.val * 100) : 0;
  const monthly = total.div / 12;

  const metrics = [
    { label: 'Dividendos anuales', value: fmt(total.div), sub: fmt(total.div * USD_CLP, true) + ' CLP' },
    { label: 'Promedio mensual', value: fmt(monthly), sub: 'pasivo estimado' },
    { label: 'Yield promedio', value: avgYield.toFixed(2) + '%', sub: 'ponderado por monto' },
    { label: 'Yield CL vs US', value: (cl.val > 0 ? (cl.div / cl.val * 100).toFixed(1) + '%' : '—') + ' / ' + (us.val > 0 ? (us.div / us.val * 100).toFixed(1) + '%' : '—'), sub: 'CL típico más alto' }
  ];
  document.getElementById('div-metrics').innerHTML = metrics.map(m => `<div class="metric-card"><p class="metric-label">${m.label}</p><p class="metric-value">${m.value}</p><p class="metric-sub">${m.sub}</p></div>`).join('');

  const sorted = portfolio.map(p => ({ ...p, _div: posAnnualDividend(p), _y: posYield(p) })).filter(p => p._div > 0).sort((a, b) => b._div - a._div).slice(0, 7);
  document.getElementById('div-top').innerHTML = sorted.length === 0
    ? `<div class="text-tertiary" style="font-size: 13px; text-align: center; padding: 12px 0;">Ninguna posición paga dividendos significativos</div>`
    : sorted.map(p => `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-tertiary);"><div><div style="font-weight: 500; font-size: 13px;">${p.ticker} <span class="text-success" style="font-size: 11px; font-weight: 400;">${p._y}% yield</span></div><div class="text-secondary" style="font-size: 12px;">${p.name || ''}</div></div><div style="text-align: right;"><div style="font-weight: 500; font-size: 14px;">${fmt(p._div)}/año</div><div class="text-secondary" style="font-size: 12px;">${fmt(p._div / 12)}/mes prom.</div></div></div>`).join('');

  const points = [];
  let v = total.val;
  const monthlyR = 0.08 / 12, yieldR = 0.025;
  for (let y = 0; y <= 20; y++) {
    points.push({ year: y, value: v, annualDiv: v * yieldR });
    for (let m = 0; m < 12; m++) v = v * (1 + monthlyR) + 600;
  }
  const milestones = [5, 10, 15, 20];
  document.getElementById('div-projection').innerHTML = `<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">${milestones.map(y => { const p = points[y]; return `<div style="background: var(--bg-secondary); padding: 10px; border-radius: var(--radius-md); text-align: center;"><div class="text-secondary" style="font-size: 11px;">Año ${y}</div><div style="font-size: 16px; font-weight: 500; margin: 4px 0;">${fmt(p.annualDiv)}</div><div class="text-tertiary" style="font-size: 11px;">${fmt(p.annualDiv / 12)}/mes</div></div>`; }).join('')}</div><div class="text-secondary" style="margin-top: 12px; font-size: 12px; text-align: center;">Al año 20 tu cartera generaría ~${fmt(points[20].annualDiv / 12)} mensuales solo en dividendos 💸</div>`;
}

function renderRotation() {
  const renderRotPositions = () => {
    document.getElementById('rot-positions').innerHTML = portfolio.map(p => {
      const checked = rotationState.sellIds.has(p.id);
      const vUSD = posValueUSD(p);
      const pct = posReturnPct(p);
      const cls = pct >= 0 ? 'text-success' : 'text-danger';
      return `<label style="display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid var(--border-tertiary); cursor: pointer;">
        <input type="checkbox" class="rot-cb" data-id="${p.id}" ${checked ? 'checked' : ''} />
        <div style="flex: 1; min-width: 0;"><div style="font-size: 13px; font-weight: 500;">${p.market === 'CL' ? '🇨🇱' : '🇺🇸'} ${p.ticker}</div><div class="text-secondary" style="font-size: 11px;">${p.name || ''}</div></div>
        <div style="text-align: right;"><div style="font-size: 13px; font-weight: 500;">${fmt(vUSD)}</div><div class="${cls}" style="font-size: 11px;">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</div></div>
      </label>`;
    }).join('');
    document.querySelectorAll('.rot-cb').forEach(cb => cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) rotationState.sellIds.add(id); else rotationState.sellIds.delete(id);
      updateRotation();
    }));
  };

  const updateRotation = () => {
    const capital = portfolio.filter(p => rotationState.sellIds.has(p.id)).reduce((a, p) => a + posValueUSD(p), 0);
    const capEl = document.getElementById('rot-capital');
    capEl.textContent = fmt(capital);
    capEl.style.color = capital > 0 ? 'var(--text-success)' : 'var(--text-primary)';

    const preset = presets[rotationState.preset];
    document.getElementById('preset-desc').innerHTML = `<strong>${preset.name}.</strong> ${preset.desc}`;
    const avgYield = preset.items.reduce((a, i) => a + i.pct / 100 * i.yield, 0);
    document.getElementById('rot-allocation').innerHTML = preset.items.map(i => {
      const amt = capital * i.pct / 100;
      return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-tertiary); font-size: 13px;"><div><span style="font-weight: 500;">${i.ticker}</span> <span class="text-secondary">— ${i.name}</span><span class="text-success" style="margin-left: 6px; font-size: 11px;">${i.yield}% yield</span></div><div style="text-align: right;"><div style="font-weight: 500;">${fmt(amt)}</div><div class="text-secondary" style="font-size: 11px;">${i.pct}%</div></div></div>`;
    }).join('') + `<div class="text-secondary" style="padding-top: 12px; font-size: 12px; text-align: right;">Yield promedio nuevo: <strong>${avgYield.toFixed(2)}%</strong></div>`;

    const beforeCL = aggregateMetrics('CL'), beforeUS = aggregateMetrics('US');
    const beforeTotal = beforeCL.val + beforeUS.val;
    const beforeDiv = beforeCL.div + beforeUS.div;
    const newUS = beforeUS.val + capital;
    const newCL = beforeCL.val - capital;
    const newTotal = newCL + newUS;
    const soldDiv = portfolio.filter(p => rotationState.sellIds.has(p.id)).reduce((a, p) => a + posAnnualDividend(p), 0);
    const newDiv = (beforeDiv - soldDiv) + capital * avgYield / 100;
    const utilTickers = p => ['Utilities', 'Energía/Servicios'].includes(getSector(p.ticker));
    const utilBefore = portfolio.reduce((a, p) => a + (utilTickers(p) ? posValueUSD(p) : 0), 0);
    const utilAfter = portfolio.filter(p => !rotationState.sellIds.has(p.id)).reduce((a, p) => a + (utilTickers(p) ? posValueUSD(p) : 0), 0);

    if (capital === 0) {
      document.getElementById('rot-comparison').innerHTML = `<div class="text-tertiary" style="font-size: 13px; text-align: center; padding: 16px 0;">Selecciona posiciones arriba para ver el impacto</div>`;
      return;
    }
    document.getElementById('rot-comparison').innerHTML = `
      <div class="grid grid-2" style="margin-bottom: 12px;">
        <div style="background: var(--bg-secondary); padding: 12px; border-radius: var(--radius-md);">
          <p class="text-secondary" style="font-size: 11px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Antes</p>
          <div style="font-size: 13px; margin-bottom: 4px;">Total: <strong>${fmt(beforeTotal)}</strong></div>
          <div style="font-size: 13px; margin-bottom: 4px;">CL: ${fmt(beforeCL.val)} (${(beforeCL.val/beforeTotal*100).toFixed(0)}%)</div>
          <div style="font-size: 13px; margin-bottom: 4px;">US: ${fmt(beforeUS.val)} (${(beforeUS.val/beforeTotal*100).toFixed(0)}%)</div>
          <div style="font-size: 13px; margin-bottom: 4px;">Dividendos: ${fmt(beforeDiv)}/año</div>
          <div style="font-size: 13px;">Utilities: ${beforeTotal > 0 ? (utilBefore/beforeTotal*100).toFixed(0) : 0}%</div>
        </div>
        <div style="background: var(--bg-info); padding: 12px; border-radius: var(--radius-md); color: var(--text-info);">
          <p style="font-size: 11px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Después</p>
          <div style="font-size: 13px; margin-bottom: 4px;">Total: <strong>${fmt(newTotal)}</strong></div>
          <div style="font-size: 13px; margin-bottom: 4px;">CL: ${fmt(newCL)} (${newTotal > 0 ? (newCL/newTotal*100).toFixed(0) : 0}%)</div>
          <div style="font-size: 13px; margin-bottom: 4px;">US: ${fmt(newUS)} (${newTotal > 0 ? (newUS/newTotal*100).toFixed(0) : 0}%)</div>
          <div style="font-size: 13px; margin-bottom: 4px;">Dividendos: ${fmt(newDiv)}/año</div>
          <div style="font-size: 13px;">Utilities: ${newTotal > 0 ? (utilAfter/newTotal*100).toFixed(0) : 0}%</div>
        </div>
      </div>
      <div class="alert alert-warning" style="margin-bottom: 0;">
        <i class="ti ti-alert-circle"></i>
        <div><div class="alert-title">Impacto tributario</div><div class="alert-msg">Vender en Chile activa hecho gravado. Las ganancias tributan en Global Complementario (excepto si calificas para exención de presencia bursátil). Consulta con un contador antes de ejecutar.</div></div>
      </div>`;
  };

  renderRotPositions();
  updateRotation();

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      rotationState.preset = btn.dataset.preset;
      updateRotation();
    };
  });
}

function renderBenchmark() {
  const cl = aggregateMetrics('CL'), us = aggregateMetrics('US');
  const clEl = document.getElementById('bench-cl-pct');
  const usEl = document.getElementById('bench-us-pct');
  clEl.textContent = cl.count === 0 ? '—' : (cl.pct >= 0 ? '+' : '') + cl.pct.toFixed(2) + '%';
  clEl.style.color = cl.count === 0 ? 'var(--text-tertiary)' : (cl.pct >= benchmarks.ipsa['1Y'] ? 'var(--text-success)' : 'var(--text-danger)');
  usEl.textContent = us.count === 0 ? '—' : (us.pct >= 0 ? '+' : '') + us.pct.toFixed(2) + '%';
  usEl.style.color = us.count === 0 ? 'var(--text-tertiary)' : (us.pct >= benchmarks.spy['1Y'] ? 'var(--text-success)' : 'var(--text-danger)');

  const periods = ['1Y', '3Y', '5Y', '10Y', '20Y'];
  const labels = { '1Y': '1 año', '3Y': '3 años anual.', '5Y': '5 años anual.', '10Y': '10 años anual.', '20Y': '20 años anual.' };
  document.getElementById('bench-tbody').innerHTML = periods.map(p => `<tr><td>${labels[p]}</td><td style="text-align: right;" class="text-success">+${benchmarks.ipsa[p]}%</td><td style="text-align: right;" class="text-success">+${benchmarks.spy[p]}%</td><td style="text-align: right;" class="text-success">+${benchmarks.qqq[p]}%</td></tr>`).join('');

  if (cl.cost > 0) {
    const ipsaSim = cl.cost * (1 + benchmarks.ipsa['1Y'] / 100);
    const diff = cl.val - ipsaSim;
    const diffPct = ((cl.val - ipsaSim) / ipsaSim * 100);
    document.getElementById('bench-cl-sim').innerHTML = `<div class="grid" style="grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 8px;"><div><div class="text-secondary" style="font-size: 12px;">Inversión inicial</div><div style="font-size: 16px; font-weight: 500;">${fmt(cl.cost)}</div></div><div><div class="text-secondary" style="font-size: 12px;">Tu cartera hoy</div><div style="font-size: 16px; font-weight: 500;">${fmt(cl.val)}</div></div><div><div class="text-secondary" style="font-size: 12px;">Si fuera IPSA</div><div style="font-size: 16px; font-weight: 500;">${fmt(ipsaSim)}</div></div></div><div style="background: var(--bg-secondary); padding: 10px 12px; border-radius: var(--radius-md); font-size: 13px;"><span class="${diff >= 0 ? 'text-success' : 'text-danger'}" style="font-weight: 500;">${diff >= 0 ? '+' : ''}${fmt(diff)} (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)}%)</span><span class="text-secondary" style="margin-left: 8px;">${diff >= 0 ? 'Tu stock-picking le ganó al benchmark 🎉' : 'El benchmark hubiera rendido más'}</span></div>`;
  } else {
    document.getElementById('bench-cl-sim').innerHTML = `<div class="text-tertiary" style="font-size: 13px; padding: 8px 0;">Sin posiciones en Chile</div>`;
  }

  if (benchChart) benchChart.destroy();
  const ctx = document.getElementById('bench-chart');
  if (ctx && typeof Chart !== 'undefined') {
    const datasets = [
      { label: 'IPSA', data: periods.map(p => benchmarks.ipsa[p]), backgroundColor: '#7F77DD' },
      { label: 'S&P 500', data: periods.map(p => benchmarks.spy[p]), backgroundColor: '#1D9E75' },
      { label: 'Nasdaq 100', data: periods.map(p => benchmarks.qqq[p]), backgroundColor: '#378ADD' }
    ];
    if (cl.count > 0) datasets.unshift({ label: 'Tu CL', data: [cl.pct, null, null, null, null], backgroundColor: '#D85A30' });
    if (us.count > 0) datasets.unshift({ label: 'Tu US', data: [us.pct, null, null, null, null], backgroundColor: '#BA7517' });
    benchChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: periods.map(p => labels[p].replace(' anual.', '')), datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + (c.parsed.y === null ? 'N/D' : c.parsed.y.toFixed(2) + '%') } } },
        scales: { y: { ticks: { callback: v => v + '%' } } }
      }
    });
  }
}

function renderProjection() {
  const initial = +document.getElementById('proj-initial').value;
  const monthly = +document.getElementById('proj-monthly').value;
  const ret = +document.getElementById('proj-return').value;
  const years = +document.getElementById('proj-years').value;
  document.getElementById('proj-monthly-out').textContent = '$' + monthly;
  document.getElementById('proj-initial-out').textContent = '$' + initial.toLocaleString('en-US');
  document.getElementById('proj-return-out').textContent = ret + '%';
  document.getElementById('proj-years-out').textContent = years;

  const monthlyR = ret / 100 / 12;
  const data = [];
  let v = initial, contrib = initial;
  for (let m = 0; m <= years * 12; m++) {
    if (m % 12 === 0) data.push({ year: m / 12, value: v, contrib });
    v = v * (1 + monthlyR) + monthly;
    contrib += monthly;
  }
  const final = data[data.length - 1];
  const summary = [
    { label: 'Valor final', value: fmt(final.value) },
    { label: 'Total aportado', value: fmt(final.contrib) },
    { label: 'Ganancia', value: fmt(final.value - final.contrib), color: 'success' },
    { label: 'Multiplicador', value: (final.value / final.contrib).toFixed(2) + 'x' }
  ];
  document.getElementById('proj-summary').innerHTML = summary.map(m => {
    const c = m.color === 'success' ? 'var(--text-success)' : 'var(--text-primary)';
    return `<div class="metric-card"><p class="metric-label">${m.label}</p><p class="metric-value" style="color: ${c};">${m.value}</p></div>`;
  }).join('');

  if (projChart) projChart.destroy();
  const ctx = document.getElementById('proj-chart');
  if (ctx && typeof Chart !== 'undefined') {
    projChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => 'Año ' + d.year),
        datasets: [
          { label: 'Valor portafolio', data: data.map(d => Math.round(d.value)), borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.1)', fill: true, tension: 0.3, borderWidth: 2 },
          { label: 'Total aportado', data: data.map(d => Math.round(d.contrib)), borderColor: '#888780', borderDash: [5, 5], fill: false, borderWidth: 2, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: c => c.dataset.label + ': $' + c.parsed.y.toLocaleString('en-US') } } },
        scales: { y: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } }
      }
    });
  }
}

function renderAlerts() {
  const alerts = [];
  const enel = portfolio.find(p => p.ticker === 'ENELCHILE');
  const peh = portfolio.find(p => p.ticker === 'PEHUENCHE');
  if (enel && peh) alerts.push({ type: 'danger', icon: 'ti-alert-triangle', title: 'Redundancia detectada', msg: 'PEHUENCHE es filial de Enel Generación Chile. Tener ambas duplica exposición.' });
  const cl = aggregateMetrics('CL'), us = aggregateMetrics('US');
  if (cl.pct < benchmarks.ipsa['1Y'] && cl.count > 0) alerts.push({ type: 'warning', icon: 'ti-chart-bar', title: 'Cartera CL bajo IPSA', msg: `Tu cartera CL rinde ${cl.pct.toFixed(1)}% vs IPSA ${benchmarks.ipsa['1Y']}% (1 año).` });
  if (us.count > 0 && us.pct < benchmarks.spy['1Y']) alerts.push({ type: 'warning', icon: 'ti-chart-bar', title: 'Cartera US bajo S&P 500', msg: `Tu cartera US rinde ${us.pct.toFixed(1)}% vs S&P 500 ${benchmarks.spy['1Y']}% (1 año).` });
  portfolio.forEach(p => { const pct = posReturnPct(p); if (pct < -5) alerts.push({ type: 'warning', icon: 'ti-trending-down', title: `${p.ticker} en pérdida (${pct.toFixed(2)}%)`, msg: 'Revisa si la tesis sigue válida.' }); });
  const utilVal = portfolio.reduce((a, p) => a + (['Utilities', 'Energía/Servicios'].includes(getSector(p.ticker)) ? posValueUSD(p) : 0), 0);
  const total = cl.val + us.val;
  if (total > 0 && utilVal / total > 0.4) alerts.push({ type: 'warning', icon: 'ti-chart-pie', title: `Concentración utilities ${(utilVal/total*100).toFixed(1)}%`, msg: 'Más del 40% en utilities/energía.' });
  if (us.count === 0) alerts.push({ type: 'info', icon: 'ti-world', title: '100% exposición Chile', msg: 'Sin posiciones en EE.UU. Empieza con VOO o SCHD.' });
  if (alerts.length === 0) alerts.push({ type: 'success', icon: 'ti-check', title: 'Cartera saludable', msg: 'Sin alertas críticas.' });
  document.getElementById('alerts-list').innerHTML = alerts.map(a => `<div class="alert alert-${a.type}"><i class="ti ${a.icon}"></i><div><div class="alert-title">${a.title}</div><div class="alert-msg">${a.msg}</div></div></div>`).join('');
}

function renderAll() {
  renderMetrics();
  renderMarketSplit();
  renderDistribution();
  renderPositions();
  renderDividends();
  renderAlerts();
  const activeTab = document.querySelector('.tab-content.active').id;
  if (activeTab === 'tab-rotation') renderRotation();
  if (activeTab === 'tab-benchmark') renderBenchmark();
  if (activeTab === 'tab-projection') renderProjection();
}

// --- Setup ---
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'projection') renderProjection();
      if (btn.dataset.tab === 'benchmark') renderBenchmark();
      if (btn.dataset.tab === 'rotation') renderRotation();
      if (btn.dataset.tab === 'dividends') renderDividends();
    });
  });
}

function setupMarketFilter() {
  document.querySelectorAll('.mkt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mkt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMarketFilter = btn.dataset.mkt;
      renderMetrics();
      renderDistribution();
    });
  });
}

function setupForm() {
  document.getElementById('add-position-btn').addEventListener('click', () => document.getElementById('add-form').style.display = 'block');
  document.getElementById('cancel-position-btn').addEventListener('click', () => document.getElementById('add-form').style.display = 'none');
  document.getElementById('save-position-btn').addEventListener('click', () => {
    const t = document.getElementById('f-ticker').value.toUpperCase().trim();
    const q = +document.getElementById('f-qty').value;
    const b = +document.getElementById('f-buy').value;
    const n = +document.getElementById('f-now').value;
    const m = document.getElementById('f-market').value;
    const nm = document.getElementById('f-name').value.trim();
    const y = document.getElementById('f-yield').value;
    if (!t || !q || !b || !n) { alert('Completa los campos requeridos: ticker, cantidad, precio de compra y precio actual.'); return; }
    const pos = { id: Date.now().toString(), ticker: t, name: nm, market: m, qty: q, buyPrice: b, currentPrice: n };
    if (y) pos.yield = +y;
    portfolio.push(pos);
    savePortfolio();
    document.getElementById('add-form').style.display = 'none';
    ['f-ticker', 'f-qty', 'f-buy', 'f-now', 'f-name', 'f-yield'].forEach(id => document.getElementById(id).value = '');
    renderAll();
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('¿Resetear a la cartera de ejemplo? Tus datos actuales se perderán.')) {
      portfolio = JSON.parse(JSON.stringify(defaultPortfolio));
      savePortfolio();
      renderAll();
    }
  });
  document.getElementById('export-csv-btn').addEventListener('click', () => {
    const rows = [['Ticker', 'Nombre', 'Mercado', 'Cantidad', 'P.Compra', 'P.Actual', 'Valor USD', 'Ganancia %', 'Yield %', 'Div/año USD']];
    portfolio.forEach(p => rows.push([p.ticker, p.name || '', p.market, p.qty, p.buyPrice, p.currentPrice, posValueUSD(p).toFixed(2), posReturnPct(p).toFixed(2), posYield(p), posAnnualDividend(p).toFixed(2)]));
    download('portfolio_' + new Date().toISOString().split('T')[0] + '.csv', rows.map(r => r.join(',')).join('\n'), 'text/csv');
  });
  document.getElementById('export-json-btn').addEventListener('click', () => {
    download('portfolio_backup_' + new Date().toISOString().split('T')[0] + '.json', JSON.stringify(portfolio, null, 2), 'application/json');
  });
  document.getElementById('import-json-btn').addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!Array.isArray(data)) throw new Error('Formato inválido');
        if (!confirm(`¿Reemplazar tu cartera actual con ${data.length} posición(es) del archivo?`)) return;
        portfolio = data;
        savePortfolio();
        renderAll();
        alert('Cartera importada correctamente.');
      } catch (err) {
        alert('Error al leer el archivo: ' + err.message);
      }
    };
    r.readAsText(f);
    e.target.value = '';
  });
  ['proj-monthly', 'proj-initial', 'proj-return', 'proj-years'].forEach(id => document.getElementById(id).addEventListener('input', renderProjection));
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
}

// --- PWA install ---
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (!localStorage.getItem('install_dismissed')) {
    document.getElementById('install-banner').classList.add('show');
  }
});
document.getElementById('install-btn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') document.getElementById('install-banner').classList.remove('show');
  deferredInstallPrompt = null;
});
document.getElementById('install-dismiss').addEventListener('click', () => {
  document.getElementById('install-banner').classList.remove('show');
  localStorage.setItem('install_dismissed', '1');
});

// --- Service worker registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => console.log('SW registration failed:', err));
  });
}

// --- Init ---
loadPortfolio();
setupTabs();
setupMarketFilter();
setupForm();
renderAll();

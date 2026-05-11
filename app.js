// Portfolio Tracker — v4 (PortfoliosLab-inspired)
// Persistence: localStorage. Data stays in your browser, this device only.

const STORAGE_KEY = 'portfolio_tracker_v1';
const USD_CLP = 950;

let portfolio = [];
let currentMarketFilter = 'ALL';
let rotationState = { sellIds: new Set(), preset: 'balanced' };
let projChart = null, benchChart = null, distChart = null;
let deferredInstallPrompt = null;

// ====== Benchmark data ======
const benchmarks = {
  ipsa: { '1Y': 18.5, '3Y': 12.4, '5Y': 8.2, '10Y': 5.5, '20Y': 6.8 },
  spy:  { '1Y': 13.2, '3Y': 15.1, '5Y': 14.4, '10Y': 13.0, '20Y': 10.5 },
  qqq:  { '1Y': 16.8, '3Y': 18.5, '5Y': 17.7, '10Y': 17.2, '20Y': 13.8 }
};

// ====== Approximate dividend yields ======
const yields = {
  SCHWAGER: 0, AAISA: 2.5, PLANVITAL: 4.5, OROBLANCO: 8.0, ZOFRI: 4.0,
  LIPIGAS: 6.0, 'ANDINA-B': 5.0, ENELCHILE: 5.5, PEHUENCHE: 6.5, 'AGUAS-A': 4.6,
  VOO: 1.3, IVV: 1.3, VTI: 1.3, SCHD: 3.5, QQQ: 0.6, VXUS: 3.0,
  O: 5.5, MSFT: 0.7, KO: 2.8, GOOGL: 0.4, NEE: 2.7, AAPL: 0.5,
  JNJ: 3.0, PG: 2.5, T: 4.0, AXP: 1.0, VYM: 3.0, BND: 4.0
};

// ====== Sector risk profile (estimated annual vol and max drawdown) ======
const sectorRisk = {
  'Energía/Servicios': { vol: 25, dd: -50 },
  'Utilities': { vol: 14, dd: -30 },
  'Holdings': { vol: 22, dd: -45 },
  'Financiero': { vol: 20, dd: -50 },
  'Consumo': { vol: 13, dd: -28 },
  'Comercial': { vol: 17, dd: -35 },
  'ETF S&P 500': { vol: 16, dd: -34 },
  'ETF Dividendos': { vol: 12, dd: -27 },
  'ETF Tech': { vol: 22, dd: -45 },
  'ETF Internacional': { vol: 17, dd: -35 },
  'ETF Total US': { vol: 16, dd: -34 },
  'ETF Bonos': { vol: 6, dd: -15 },
  'REIT': { vol: 19, dd: -40 },
  'Tecnología US': { vol: 24, dd: -50 },
  'Consumo US': { vol: 13, dd: -28 },
  'Utility US': { vol: 14, dd: -30 },
  'Salud US': { vol: 13, dd: -30 },
  'Telecom US': { vol: 18, dd: -40 },
  'Otros': { vol: 20, dd: -40 }
};

// ====== Rotation presets ======
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

// ====== Lazy Portfolios (famous "set and forget" strategies) ======
const lazyPortfolios = [
  {
    name: 'Bogleheads 3-Fund',
    author: 'John Bogle / Boglehead community',
    desc: 'La estrategia "set and forget" más popular del mundo Bogleheads. Solo 3 ETFs ultra-baratos, máxima diversificación.',
    allocation: [
      { ticker: 'VTI', name: 'US Total Market', pct: 60, color: '#1D9E75' },
      { ticker: 'VXUS', name: 'Mundo ex-US', pct: 30, color: '#378ADD' },
      { ticker: 'BND', name: 'US Bonds', pct: 10, color: '#888780' }
    ],
    cagr: 7.5, maxDD: -35, vol: 11
  },
  {
    name: 'All-Weather Portfolio',
    author: 'Ray Dalio (Bridgewater)',
    desc: 'Diseñada para rendir en cualquier escenario económico. Equilibra crecimiento, recesión, inflación y deflación.',
    allocation: [
      { ticker: 'VTI', name: 'US Stocks', pct: 30, color: '#1D9E75' },
      { ticker: 'TLT', name: 'Long-term Bonds', pct: 40, color: '#888780' },
      { ticker: 'IEF', name: 'Mid-term Bonds', pct: 15, color: '#a8a59c' },
      { ticker: 'DBC', name: 'Commodities', pct: 7.5, color: '#BA7517' },
      { ticker: 'GLD', name: 'Gold', pct: 7.5, color: '#F5C518' }
    ],
    cagr: 6.5, maxDD: -15, vol: 7
  },
  {
    name: 'Permanent Portfolio',
    author: 'Harry Browne',
    desc: 'Equilibrio extremo: 25% en cada activo. Pensado para preservar capital ante incertidumbre macro.',
    allocation: [
      { ticker: 'VTI', name: 'Stocks', pct: 25, color: '#1D9E75' },
      { ticker: 'TLT', name: 'Long Bonds', pct: 25, color: '#888780' },
      { ticker: 'SHY', name: 'Short Bonds (Cash)', pct: 25, color: '#b4b2a9' },
      { ticker: 'GLD', name: 'Gold', pct: 25, color: '#F5C518' }
    ],
    cagr: 6.0, maxDD: -13, vol: 7
  },
  {
    name: 'Classic 60/40',
    author: 'Wall Street tradition',
    desc: 'El benchmark institucional histórico. 60% acciones, 40% bonos. Simple y efectivo.',
    allocation: [
      { ticker: 'VTI', name: 'US Stocks', pct: 60, color: '#1D9E75' },
      { ticker: 'BND', name: 'US Bonds', pct: 40, color: '#888780' }
    ],
    cagr: 8.0, maxDD: -30, vol: 10
  },
  {
    name: 'Aggressive 80/20',
    author: 'Para horizontes largos',
    desc: 'Maximiza crecimiento aceptando volatilidad. Ideal para perfiles jóvenes con 20+ años de horizonte (tu caso).',
    allocation: [
      { ticker: 'VTI', name: 'US Stocks', pct: 80, color: '#1D9E75' },
      { ticker: 'BND', name: 'US Bonds', pct: 20, color: '#888780' }
    ],
    cagr: 9.0, maxDD: -40, vol: 14
  },
  {
    name: 'Golden Butterfly',
    author: 'Tyler @ Portfolio Charts',
    desc: 'Variante del Permanent Portfolio con small-cap value. Excelente Sharpe histórico y bajo drawdown.',
    allocation: [
      { ticker: 'VTI', name: 'Total Market', pct: 20, color: '#1D9E75' },
      { ticker: 'VB', name: 'Small-Cap Value', pct: 20, color: '#2DBE8E' },
      { ticker: 'TLT', name: 'Long Bonds', pct: 20, color: '#888780' },
      { ticker: 'SHY', name: 'Short Bonds', pct: 20, color: '#b4b2a9' },
      { ticker: 'GLD', name: 'Gold', pct: 20, color: '#F5C518' }
    ],
    cagr: 7.0, maxDD: -15, vol: 8
  }
];

// ====== Default portfolio ======
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

// ====== Persistence ======
function loadPortfolio() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    portfolio = stored ? JSON.parse(stored) : defaultPortfolio;
  } catch (e) {
    console.error('Error loading:', e);
    portfolio = defaultPortfolio;
  }
}
function savePortfolio() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio)); }
  catch (e) { console.error('Error saving:', e); alert('No se pudo guardar. Revisa permisos de almacenamiento.'); }
}

// ====== Calculation helpers ======
const fmt = (n, isCLP) => isCLP ? '$' + Math.round(n).toLocaleString('es-CL') : '$' + Math.round(n).toLocaleString('en-US');
const posValueUSD = p => { const v = p.qty * p.currentPrice; return p.market === 'CL' ? v / USD_CLP : v; };
const posCostUSD = p => { const c = p.qty * p.buyPrice; return p.market === 'CL' ? c / USD_CLP : c; };
const posGainUSD = p => posValueUSD(p) - posCostUSD(p);
const posReturnPct = p => (p.currentPrice - p.buyPrice) / p.buyPrice * 100;
const posYield = p => p.yield !== undefined ? p.yield : (yields[p.ticker] ?? 0);
const posAnnualDividend = p => posValueUSD(p) * posYield(p) / 100;
const filterPortfolio = mkt => mkt === 'ALL' ? portfolio : portfolio.filter(p => p.market === mkt);

function aggregateMetrics(mkt) {
  const f = filterPortfolio(mkt);
  const val = f.reduce((a, p) => a + posValueUSD(p), 0);
  const cost = f.reduce((a, p) => a + posCostUSD(p), 0);
  const div = f.reduce((a, p) => a + posAnnualDividend(p), 0);
  return { val, cost, gain: val - cost, pct: cost > 0 ? ((val - cost) / cost * 100) : 0, count: f.length, div };
}

function getSector(ticker) {
  const m = {
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
  return m[ticker] || 'Otros';
}

// ====== Risk calculations ======
function calculateHHI() {
  const total = aggregateMetrics('ALL').val;
  if (total === 0) return 0;
  let hhi = 0;
  portfolio.forEach(p => {
    const w = posValueUSD(p) / total;
    hhi += (w * 100) ** 2;
  });
  return hhi;
}

function concentrationLabel(hhi) {
  if (hhi < 1500) return { label: 'Baja', color: 'success', msg: 'Bien diversificada' };
  if (hhi < 2500) return { label: 'Media', color: 'warning', msg: 'Moderadamente concentrada' };
  return { label: 'Alta', color: 'danger', msg: 'Demasiado concentrada en pocas posiciones' };
}

function calculatePortfolioRisk() {
  const total = aggregateMetrics('ALL').val;
  if (total === 0) return { vol: 0, dd: 0 };
  let weightedVol = 0, weightedDD = 0;
  portfolio.forEach(p => {
    const w = posValueUSD(p) / total;
    const r = sectorRisk[getSector(p.ticker)] || sectorRisk['Otros'];
    weightedVol += w * r.vol;
    weightedDD += w * r.dd;
  });
  // Diversification discount: assume 20% correlation reduction for portfolios with 5+ positions
  const divDiscount = portfolio.length >= 5 ? 0.85 : 1;
  return { vol: weightedVol * divDiscount, dd: weightedDD * divDiscount };
}

function calculateHealthScore() {
  const total = aggregateMetrics('ALL');
  const cl = aggregateMetrics('CL');
  const us = aggregateMetrics('US');
  if (total.val === 0) return { score: 0, grade: 'N/A', breakdown: [] };

  // 1. Diversification (0-25): positions + sectors
  const sectors = new Set(portfolio.map(p => getSector(p.ticker)));
  const divScore = Math.min(15, portfolio.length * 1.5) + Math.min(10, sectors.size * 1.5);

  // 2. Concentration / inverse HHI (0-25)
  const hhi = calculateHHI();
  const concScore = Math.max(0, Math.min(25, 25 * (5000 - hhi) / (5000 - 1500)));

  // 3. Geographic balance (0-15)
  const clShare = total.val > 0 ? cl.val / total.val : 0;
  const geoBalance = 1 - Math.abs(0.5 - clShare) * 2; // 1 at 50/50, 0 at 100% one side
  const geoScore = geoBalance * 15;

  // 4. Performance vs benchmark (0-20)
  let perfScore = 10; // neutral default
  if (cl.cost > 0 && us.cost > 0) {
    const expected = (cl.cost * benchmarks.ipsa['1Y'] + us.cost * benchmarks.spy['1Y']) / (cl.cost + us.cost);
    const actual = total.pct;
    perfScore = Math.max(0, Math.min(20, 10 + (actual - expected) * 0.4));
  } else if (cl.cost > 0) {
    perfScore = Math.max(0, Math.min(20, 10 + (cl.pct - benchmarks.ipsa['1Y']) * 0.4));
  } else if (us.cost > 0) {
    perfScore = Math.max(0, Math.min(20, 10 + (us.pct - benchmarks.spy['1Y']) * 0.4));
  }

  // 5. Yield quality (0-15)
  const avgYield = total.val > 0 ? total.div / total.val * 100 : 0;
  const yieldScore = Math.min(15, avgYield * 3);

  const score = Math.round(divScore + concScore + geoScore + perfScore + yieldScore);
  let grade = 'F';
  if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 40) grade = 'D';

  return {
    score, grade,
    breakdown: [
      { label: 'Diversificación', value: Math.round(divScore), max: 25 },
      { label: 'Concentración', value: Math.round(concScore), max: 25 },
      { label: 'Balance geográfico', value: Math.round(geoScore), max: 15 },
      { label: 'Vs benchmark', value: Math.round(perfScore), max: 20 },
      { label: 'Yield', value: Math.round(yieldScore), max: 15 }
    ]
  };
}

// ====== Renderers: Dashboard ======
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
  document.getElementById('cl-summary').innerHTML = `<div style="font-size: 22px; font-weight: 600; margin-bottom: 4px; font-variant-numeric: tabular-nums;">${fmt(cl.val)}</div><div class="text-secondary" style="font-size: 12px; margin-bottom: 10px;">${clPct.toFixed(1)}% del total · ${cl.count} posiciones</div><div style="font-size: 14px; font-variant-numeric: tabular-nums;" class="${cl.gain >= 0 ? 'text-success' : 'text-danger'}">${cl.gain >= 0 ? '+' : ''}${fmt(cl.gain)} (${cl.pct.toFixed(2)}%)</div>`;
  document.getElementById('us-summary').innerHTML = us.count === 0
    ? `<div class="text-tertiary" style="font-size: 14px; padding: 16px 0; text-align: center;"><i class="ti ti-plus-circle" style="font-size: 28px; display: block; margin: 0 auto 8px; color: var(--accent);"></i>Sin posiciones aún<br><span style="font-size: 12px;">Agrega VOO, SCHD u otros</span></div>`
    : `<div style="font-size: 22px; font-weight: 600; margin-bottom: 4px; font-variant-numeric: tabular-nums;">${fmt(us.val)}</div><div class="text-secondary" style="font-size: 12px; margin-bottom: 10px;">${usPct.toFixed(1)}% del total · ${us.count} posiciones</div><div style="font-size: 14px; font-variant-numeric: tabular-nums;" class="${us.gain >= 0 ? 'text-success' : 'text-danger'}">${us.gain >= 0 ? '+' : ''}${fmt(us.gain)} (${us.pct.toFixed(2)}%)</div>`;
}

function renderDistribution() {
  const filtered = filterPortfolio(currentMarketFilter);
  const sectors = {};
  filtered.forEach(p => { const v = posValueUSD(p); const s = getSector(p.ticker); sectors[s] = (sectors[s] || 0) + v; });
  const total = Object.values(sectors).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(sectors).sort((a, b) => b[1] - a[1]);
  const colors = ['#1D9E75', '#378ADD', '#D85A30', '#7F77DD', '#D4537E', '#BA7517', '#888780', '#2DBE8E', '#5B8FCC'];

  document.getElementById('dist-scope').textContent = currentMarketFilter === 'CL' ? 'Solo cartera Chile' : currentMarketFilter === 'US' ? 'Solo cartera EE.UU.' : 'Total de la cartera';

  document.getElementById('dist-bars').innerHTML = total === 0
    ? `<div class="text-tertiary" style="font-size: 13px; padding: 16px 0; text-align: center;">Sin posiciones</div>`
    : sorted.map(([s, v], i) => {
      const pct = (v / total * 100);
      return `<div style="margin-bottom: 12px;"><div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px;"><span style="display: flex; align-items: center; gap: 6px;"><span style="width: 9px; height: 9px; border-radius: 2px; background: ${colors[i % colors.length]};"></span><span style="font-weight: 500;">${s}</span></span><span class="text-secondary" style="font-variant-numeric: tabular-nums;">${pct.toFixed(1)}%</span></div><div class="bar-container" style="height: 6px;"><div class="bar-fill" style="background: ${colors[i % colors.length]}; width: ${pct}%;"></div></div></div>`;
    }).join('');

  // Donut chart
  if (distChart) distChart.destroy();
  const ctx = document.getElementById('dist-chart');
  if (ctx && typeof Chart !== 'undefined' && sorted.length > 0) {
    distChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: sorted.map(([s]) => s),
        datasets: [{
          data: sorted.map(([, v]) => v),
          backgroundColor: sorted.map((_, i) => colors[i % colors.length]),
          borderWidth: 2,
          borderColor: 'var(--bg-primary)',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => c.label + ': ' + fmt(c.parsed) + ' (' + (c.parsed / total * 100).toFixed(1) + '%)'
            }
          }
        }
      }
    });
  }
}

// ====== Renderers: Portfolio ======
function renderPositions() {
  const renderList = (mkt, containerId, countId) => {
    const filtered = portfolio.filter(p => p.market === mkt);
    document.getElementById(countId).textContent = filtered.length + ' posición(es)';
    if (filtered.length === 0) {
      document.getElementById(containerId).innerHTML = `<div class="text-tertiary" style="background: var(--bg-secondary); border-radius: var(--radius-md); padding: 20px; text-align: center; font-size: 13px;">No hay posiciones</div>`;
      return;
    }
    document.getElementById(containerId).innerHTML = filtered.map(p => {
      const vUSD = posValueUSD(p), pct = posReturnPct(p), y = posYield(p), div = posAnnualDividend(p);
      const cls = pct >= 0 ? 'text-success' : 'text-danger';
      return `<div class="row">
        <div class="row-main">
          <div class="row-title">${p.ticker}${y > 0 ? `<span class="text-success" style="font-size: 11px; font-weight: 500; margin-left: 6px; padding: 2px 6px; background: var(--bg-success); border-radius: 4px;">${y}%</span>` : ''}</div>
          <div class="row-sub">${p.name || ''} · ${p.qty.toLocaleString('es-CL')} u.${div > 0 ? ` · ${fmt(div)}/año` : ''}</div>
        </div>
        <div class="row-aside" style="margin-right: 12px;">
          <div class="row-title">${fmt(vUSD)}</div>
          <div class="${cls}" style="font-size: 12px; font-weight: 500;">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</div>
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

// ====== Renderers: Risk ======
function renderRisk() {
  const total = aggregateMetrics('ALL');
  if (total.val === 0) {
    document.getElementById('health-score-container').innerHTML = `<div class="card text-tertiary" style="text-align: center; padding: 40px;">Agrega posiciones para ver tu análisis de riesgo</div>`;
    document.getElementById('concentration-metrics').innerHTML = '';
    document.getElementById('risk-metrics').innerHTML = '';
    document.getElementById('drawdown-display').innerHTML = '';
    return;
  }

  const health = calculateHealthScore();
  document.getElementById('health-score-container').innerHTML = `
    <div class="health-score">
      <div class="health-circle">
        <div class="score">${health.score}</div>
        <div class="grade">GRADO ${health.grade}</div>
      </div>
      <div class="health-breakdown">
        <h3>Score de cartera</h3>
        <p>Evaluación integral de diversificación, concentración, balance y rendimiento</p>
        <div class="health-bars">
          ${health.breakdown.map(b => `
            <div class="health-bar">
              <span>${b.label}</span>
              <div class="health-bar-track"><div class="health-bar-fill" style="width: ${(b.value / b.max * 100)}%;"></div></div>
              <span style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 600;">${b.value}/${b.max}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;

  const hhi = calculateHHI();
  const conc = concentrationLabel(hhi);
  const topPos = [...portfolio].sort((a, b) => posValueUSD(b) - posValueUSD(a)).slice(0, 3);
  const top3Pct = topPos.reduce((a, p) => a + posValueUSD(p), 0) / total.val * 100;

  document.getElementById('concentration-metrics').innerHTML = `
    <div style="margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
        <span class="text-secondary" style="font-size: 12px;">Índice HHI</span>
        <strong style="font-size: 22px; font-variant-numeric: tabular-nums;" class="text-${conc.color}">${Math.round(hhi)}</strong>
      </div>
      <div class="text-tertiary" style="font-size: 11px;">${conc.msg}</div>
    </div>
    <div style="margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;"><span class="text-secondary">Top 3 posiciones</span><strong style="font-variant-numeric: tabular-nums;">${top3Pct.toFixed(1)}%</strong></div>
      <div class="bar-container" style="height: 6px;"><div class="bar-fill" style="background: var(--text-${top3Pct > 60 ? 'danger' : top3Pct > 40 ? 'warning' : 'success'}); width: ${Math.min(100, top3Pct)}%;"></div></div>
    </div>
    <div style="font-size: 11px; color: var(--text-tertiary); line-height: 1.6;">
      <div><strong>HHI &lt; 1,500</strong> baja concentración (ideal)</div>
      <div><strong>1,500–2,500</strong> moderada</div>
      <div><strong>&gt; 2,500</strong> alta (riesgoso)</div>
    </div>`;

  const risk = calculatePortfolioRisk();
  document.getElementById('risk-metrics').innerHTML = `
    <div style="margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
        <span class="text-secondary" style="font-size: 12px;">Volatilidad anual estimada</span>
        <strong style="font-size: 22px; font-variant-numeric: tabular-nums;" class="text-${risk.vol > 18 ? 'danger' : risk.vol > 13 ? 'warning' : 'success'}">${risk.vol.toFixed(1)}%</strong>
      </div>
      <div class="text-tertiary" style="font-size: 11px;">Cuánto puede oscilar tu cartera en un año típico</div>
    </div>
    <div style="margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
        <span class="text-secondary" style="font-size: 12px;">Yield promedio</span>
        <strong style="font-size: 22px; font-variant-numeric: tabular-nums;" class="text-success">${(total.div / total.val * 100).toFixed(2)}%</strong>
      </div>
      <div class="text-tertiary" style="font-size: 11px;">Renta pasiva anual sobre valor actual</div>
    </div>
    <div style="font-size: 11px; color: var(--text-tertiary); line-height: 1.6;">
      <div><strong>&lt; 10%</strong> conservadora</div>
      <div><strong>10–18%</strong> equilibrada</div>
      <div><strong>&gt; 18%</strong> agresiva</div>
    </div>`;

  const ddDollars = total.val * risk.dd / 100;
  document.getElementById('drawdown-display').innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: center; margin-bottom: 16px;">
      <div>
        <div class="text-secondary" style="font-size: 12px; margin-bottom: 6px;">Drawdown estimado en escenario adverso</div>
        <div style="font-size: 36px; font-weight: 600; font-variant-numeric: tabular-nums;" class="text-danger">${risk.dd.toFixed(0)}%</div>
        <div style="font-size: 14px; font-weight: 500;" class="text-danger">${fmt(ddDollars)}</div>
      </div>
      <div>
        <div class="text-secondary" style="font-size: 12px; margin-bottom: 6px;">Valor en escenario adverso</div>
        <div style="font-size: 28px; font-weight: 600; font-variant-numeric: tabular-nums;">${fmt(total.val + ddDollars)}</div>
        <div class="text-tertiary" style="font-size: 12px;">desde ${fmt(total.val)}</div>
      </div>
    </div>
    <div class="alert alert-warning" style="margin: 0;"><i class="ti ti-alert-circle"></i><div><div class="alert-title">Recuerda</div><div class="alert-msg">Los drawdowns son normales en horizontes largos. El S&P 500 ha tenido caídas del 30–50% varias veces (2008, 2020, 2022). Quienes aguantaron sin vender llegaron a recuperarse y superar máximos. La paciencia es el activo más rentable.</div></div></div>`;
}

// ====== Renderers: Dividends ======
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
    { label: 'Yield CL / US', value: (cl.val > 0 ? (cl.div / cl.val * 100).toFixed(1) + '%' : '—') + ' / ' + (us.val > 0 ? (us.div / us.val * 100).toFixed(1) + '%' : '—'), sub: 'CL típico más alto' }
  ];
  document.getElementById('div-metrics').innerHTML = metrics.map(m => `<div class="metric-card"><p class="metric-label">${m.label}</p><p class="metric-value">${m.value}</p><p class="metric-sub">${m.sub}</p></div>`).join('');

  const sorted = portfolio.map(p => ({ ...p, _div: posAnnualDividend(p), _y: posYield(p) })).filter(p => p._div > 0).sort((a, b) => b._div - a._div).slice(0, 7);
  document.getElementById('div-top').innerHTML = sorted.length === 0
    ? `<div class="text-tertiary" style="font-size: 13px; text-align: center; padding: 16px 0;">Ninguna posición paga dividendos</div>`
    : sorted.map(p => `<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-tertiary);"><div><div style="font-weight: 600; font-size: 13px;">${p.ticker}<span class="text-success" style="font-size: 11px; font-weight: 500; margin-left: 6px; padding: 2px 6px; background: var(--bg-success); border-radius: 4px;">${p._y}%</span></div><div class="text-secondary" style="font-size: 12px; margin-top: 2px;">${p.name || ''}</div></div><div style="text-align: right;"><div style="font-weight: 600; font-size: 14px; font-variant-numeric: tabular-nums;">${fmt(p._div)}/año</div><div class="text-secondary" style="font-size: 12px; font-variant-numeric: tabular-nums;">${fmt(p._div / 12)}/mes</div></div></div>`).join('');

  const points = [];
  let v = total.val;
  const monthlyR = 0.08 / 12, yieldR = 0.025;
  for (let y = 0; y <= 20; y++) {
    points.push({ year: y, value: v, annualDiv: v * yieldR });
    for (let m = 0; m < 12; m++) v = v * (1 + monthlyR) + 600;
  }
  const milestones = [5, 10, 15, 20];
  document.getElementById('div-projection').innerHTML = `<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">${milestones.map(y => { const p = points[y]; return `<div style="background: var(--bg-secondary); padding: 14px; border-radius: var(--radius-md); text-align: center;"><div class="text-secondary" style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Año ${y}</div><div style="font-size: 18px; font-weight: 600; margin: 6px 0; font-variant-numeric: tabular-nums;">${fmt(p.annualDiv)}</div><div class="text-tertiary" style="font-size: 11px; font-variant-numeric: tabular-nums;">${fmt(p.annualDiv / 12)}/mes</div></div>`; }).join('')}</div><div class="text-secondary" style="margin-top: 14px; font-size: 12px; text-align: center;">Al año 20 tu cartera generaría ~${fmt(points[20].annualDiv / 12)} mensuales solo en dividendos 💸</div>`;
}

// ====== Renderers: Rotation ======
function renderRotation() {
  const renderRotPos = () => {
    document.getElementById('rot-positions').innerHTML = portfolio.map(p => {
      const checked = rotationState.sellIds.has(p.id);
      const vUSD = posValueUSD(p);
      const pct = posReturnPct(p);
      const cls = pct >= 0 ? 'text-success' : 'text-danger';
      return `<label style="display: flex; align-items: center; gap: 10px; padding: 10px 4px; border-bottom: 1px solid var(--border-tertiary); cursor: pointer;">
        <input type="checkbox" class="rot-cb" data-id="${p.id}" ${checked ? 'checked' : ''} />
        <div style="flex: 1; min-width: 0;"><div style="font-size: 13px; font-weight: 600;">${p.market === 'CL' ? '🇨🇱' : '🇺🇸'} ${p.ticker}</div><div class="text-secondary" style="font-size: 11px;">${p.name || ''}</div></div>
        <div style="text-align: right;"><div style="font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums;">${fmt(vUSD)}</div><div class="${cls}" style="font-size: 11px; font-weight: 500;">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</div></div>
      </label>`;
    }).join('');
    document.querySelectorAll('.rot-cb').forEach(cb => cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) rotationState.sellIds.add(id); else rotationState.sellIds.delete(id);
      updateRot();
    }));
  };

  const updateRot = () => {
    const capital = portfolio.filter(p => rotationState.sellIds.has(p.id)).reduce((a, p) => a + posValueUSD(p), 0);
    const capEl = document.getElementById('rot-capital');
    capEl.textContent = fmt(capital);
    capEl.style.color = capital > 0 ? 'var(--text-success)' : 'var(--text-primary)';

    const preset = presets[rotationState.preset];
    document.getElementById('preset-desc').innerHTML = `<strong style="color: var(--text-primary);">${preset.name}.</strong> ${preset.desc}`;
    const avgYield = preset.items.reduce((a, i) => a + i.pct / 100 * i.yield, 0);
    document.getElementById('rot-allocation').innerHTML = preset.items.map(i => {
      const amt = capital * i.pct / 100;
      return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-tertiary); font-size: 13px;"><div><span style="font-weight: 600;">${i.ticker}</span> <span class="text-secondary">— ${i.name}</span><span class="text-success" style="margin-left: 6px; font-size: 11px; padding: 2px 6px; background: var(--bg-success); border-radius: 4px; font-weight: 500;">${i.yield}%</span></div><div style="text-align: right;"><div style="font-weight: 600; font-variant-numeric: tabular-nums;">${fmt(amt)}</div><div class="text-secondary" style="font-size: 11px;">${i.pct}%</div></div></div>`;
    }).join('') + `<div class="text-secondary" style="padding-top: 14px; font-size: 12px; text-align: right;">Yield promedio: <strong style="color: var(--text-primary); font-variant-numeric: tabular-nums;">${avgYield.toFixed(2)}%</strong></div>`;

    const bCL = aggregateMetrics('CL'), bUS = aggregateMetrics('US');
    const bTotal = bCL.val + bUS.val;
    const bDiv = bCL.div + bUS.div;
    const newUS = bUS.val + capital;
    const newCL = bCL.val - capital;
    const newTotal = newCL + newUS;
    const soldDiv = portfolio.filter(p => rotationState.sellIds.has(p.id)).reduce((a, p) => a + posAnnualDividend(p), 0);
    const newDiv = (bDiv - soldDiv) + capital * avgYield / 100;
    const isUtil = p => ['Utilities', 'Energía/Servicios'].includes(getSector(p.ticker));
    const utilBefore = portfolio.reduce((a, p) => a + (isUtil(p) ? posValueUSD(p) : 0), 0);
    const utilAfter = portfolio.filter(p => !rotationState.sellIds.has(p.id)).reduce((a, p) => a + (isUtil(p) ? posValueUSD(p) : 0), 0);

    if (capital === 0) {
      document.getElementById('rot-comparison').innerHTML = `<div class="text-tertiary" style="font-size: 13px; text-align: center; padding: 20px 0;">Selecciona posiciones arriba para ver el impacto</div>`;
      return;
    }
    document.getElementById('rot-comparison').innerHTML = `
      <div class="grid grid-2" style="margin-bottom: 14px;">
        <div style="background: var(--bg-secondary); padding: 14px; border-radius: var(--radius-md);">
          <p class="text-secondary" style="font-size: 10px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Antes</p>
          <div style="font-size: 13px; margin-bottom: 5px; font-variant-numeric: tabular-nums;">Total: <strong>${fmt(bTotal)}</strong></div>
          <div style="font-size: 13px; margin-bottom: 5px; font-variant-numeric: tabular-nums;">🇨🇱: ${fmt(bCL.val)} (${(bCL.val/bTotal*100).toFixed(0)}%)</div>
          <div style="font-size: 13px; margin-bottom: 5px; font-variant-numeric: tabular-nums;">🇺🇸: ${fmt(bUS.val)} (${(bUS.val/bTotal*100).toFixed(0)}%)</div>
          <div style="font-size: 13px; margin-bottom: 5px; font-variant-numeric: tabular-nums;">Dividendos: ${fmt(bDiv)}/año</div>
          <div style="font-size: 13px; font-variant-numeric: tabular-nums;">Utilities: ${bTotal > 0 ? (utilBefore/bTotal*100).toFixed(0) : 0}%</div>
        </div>
        <div style="background: var(--bg-success); padding: 14px; border-radius: var(--radius-md); color: var(--text-success);">
          <p style="font-size: 10px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Después</p>
          <div style="font-size: 13px; margin-bottom: 5px; font-variant-numeric: tabular-nums;">Total: <strong>${fmt(newTotal)}</strong></div>
          <div style="font-size: 13px; margin-bottom: 5px; font-variant-numeric: tabular-nums;">🇨🇱: ${fmt(newCL)} (${newTotal > 0 ? (newCL/newTotal*100).toFixed(0) : 0}%)</div>
          <div style="font-size: 13px; margin-bottom: 5px; font-variant-numeric: tabular-nums;">🇺🇸: ${fmt(newUS)} (${newTotal > 0 ? (newUS/newTotal*100).toFixed(0) : 0}%)</div>
          <div style="font-size: 13px; margin-bottom: 5px; font-variant-numeric: tabular-nums;">Dividendos: ${fmt(newDiv)}/año</div>
          <div style="font-size: 13px; font-variant-numeric: tabular-nums;">Utilities: ${newTotal > 0 ? (utilAfter/newTotal*100).toFixed(0) : 0}%</div>
        </div>
      </div>
      <div class="alert alert-warning" style="margin: 0;"><i class="ti ti-alert-circle"></i><div><div class="alert-title">Impacto tributario</div><div class="alert-msg">Vender en Chile activa hecho gravado. Las ganancias tributan en Global Complementario (salvo exención por presencia bursátil). Consulta a un contador antes de ejecutar.</div></div></div>`;
  };

  renderRotPos();
  updateRot();
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      rotationState.preset = btn.dataset.preset;
      updateRot();
    };
  });
}

// ====== Renderers: Benchmark ======
function renderBenchmark() {
  const cl = aggregateMetrics('CL'), us = aggregateMetrics('US');
  const clEl = document.getElementById('bench-cl-pct'), usEl = document.getElementById('bench-us-pct');
  clEl.textContent = cl.count === 0 ? '—' : (cl.pct >= 0 ? '+' : '') + cl.pct.toFixed(2) + '%';
  clEl.style.color = cl.count === 0 ? 'var(--text-tertiary)' : (cl.pct >= benchmarks.ipsa['1Y'] ? 'var(--text-success)' : 'var(--text-danger)');
  usEl.textContent = us.count === 0 ? '—' : (us.pct >= 0 ? '+' : '') + us.pct.toFixed(2) + '%';
  usEl.style.color = us.count === 0 ? 'var(--text-tertiary)' : (us.pct >= benchmarks.spy['1Y'] ? 'var(--text-success)' : 'var(--text-danger)');

  const periods = ['1Y', '3Y', '5Y', '10Y', '20Y'];
  const labels = { '1Y': '1 año', '3Y': '3 años anual.', '5Y': '5 años anual.', '10Y': '10 años anual.', '20Y': '20 años anual.' };
  document.getElementById('bench-tbody').innerHTML = periods.map(p => `<tr><td><strong>${labels[p]}</strong></td><td style="text-align: right;" class="text-success">+${benchmarks.ipsa[p]}%</td><td style="text-align: right;" class="text-success">+${benchmarks.spy[p]}%</td><td style="text-align: right;" class="text-success">+${benchmarks.qqq[p]}%</td></tr>`).join('');

  if (cl.cost > 0) {
    const ipsaSim = cl.cost * (1 + benchmarks.ipsa['1Y'] / 100);
    const diff = cl.val - ipsaSim;
    const diffPct = ((cl.val - ipsaSim) / ipsaSim * 100);
    document.getElementById('bench-cl-sim').innerHTML = `<div class="grid grid-3" style="margin-bottom: 12px;"><div><div class="text-secondary" style="font-size: 12px;">Inversión inicial</div><div style="font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums;">${fmt(cl.cost)}</div></div><div><div class="text-secondary" style="font-size: 12px;">Tu cartera hoy</div><div style="font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums;">${fmt(cl.val)}</div></div><div><div class="text-secondary" style="font-size: 12px;">Si fuera IPSA</div><div style="font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums;">${fmt(ipsaSim)}</div></div></div><div style="background: var(--bg-secondary); padding: 12px 14px; border-radius: var(--radius-md); font-size: 13px;"><span class="${diff >= 0 ? 'text-success' : 'text-danger'}" style="font-weight: 600; font-variant-numeric: tabular-nums;">${diff >= 0 ? '+' : ''}${fmt(diff)} (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)}%)</span><span class="text-secondary" style="margin-left: 10px;">${diff >= 0 ? 'Tu stock-picking le ganó al benchmark 🎉' : 'El benchmark hubiera rendido más'}</span></div>`;
  } else {
    document.getElementById('bench-cl-sim').innerHTML = `<div class="text-tertiary" style="font-size: 13px; padding: 12px 0;">Sin posiciones en Chile</div>`;
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

// ====== Renderers: Lazy Portfolios ======
function renderLazy() {
  const total = aggregateMetrics('ALL');
  const yourRisk = calculatePortfolioRisk();
  const yourCagr = total.pct; // proxy: current YTD %
  const yourDD = yourRisk.dd;

  // Comparison card
  const comparison = [{ name: 'Tu cartera', cagr: yourCagr, maxDD: yourDD, vol: yourRisk.vol, isYours: true }, ...lazyPortfolios];
  document.getElementById('lazy-comparison').innerHTML = `
    <div style="overflow-x: auto;">
      <table style="width: 100%; font-size: 13px;">
        <thead><tr>
          <th>Cartera</th>
          <th style="text-align: right;">CAGR estim.</th>
          <th style="text-align: right;">Max Drawdown</th>
          <th style="text-align: right;">Volatilidad</th>
        </tr></thead>
        <tbody>
        ${comparison.map(c => `<tr ${c.isYours ? 'style="background: var(--bg-success);"' : ''}>
          <td><strong>${c.isYours ? '⭐ ' : ''}${c.name}</strong></td>
          <td style="text-align: right; font-variant-numeric: tabular-nums;" class="${c.cagr >= 0 ? 'text-success' : 'text-danger'}">${c.cagr >= 0 ? '+' : ''}${c.cagr.toFixed(1)}%</td>
          <td style="text-align: right; font-variant-numeric: tabular-nums;" class="text-danger">${c.maxDD.toFixed(0)}%</td>
          <td style="text-align: right; font-variant-numeric: tabular-nums;">${c.vol.toFixed(1)}%</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="text-tertiary" style="font-size: 11px; margin-top: 12px; line-height: 1.5;">CAGR estimado, drawdown y volatilidad para lazy portfolios basados en backtests largos. Para tu cartera usamos % retorno actual como proxy y estimaciones sectoriales.</p>`;

  document.getElementById('lazy-list').innerHTML = lazyPortfolios.map(lp => `
    <div class="lazy-card">
      <div class="lazy-header">
        <div><h3 class="lazy-title">${lp.name}</h3><p class="lazy-author">${lp.author}</p></div>
      </div>
      <p class="lazy-desc">${lp.desc}</p>
      <div class="lazy-stats">
        <div class="lazy-stat"><div class="lazy-stat-label">CAGR</div><div class="lazy-stat-value text-success">+${lp.cagr}%</div></div>
        <div class="lazy-stat"><div class="lazy-stat-label">Max Drawdown</div><div class="lazy-stat-value text-danger">${lp.maxDD}%</div></div>
        <div class="lazy-stat"><div class="lazy-stat-label">Volatilidad</div><div class="lazy-stat-value">${lp.vol}%</div></div>
        <div class="lazy-stat"><div class="lazy-stat-label">Activos</div><div class="lazy-stat-value">${lp.allocation.length}</div></div>
      </div>
      <div class="lazy-allocation">
        ${lp.allocation.map(a => `<div class="lazy-alloc-seg" style="background: ${a.color}; flex: ${a.pct};" title="${a.ticker} ${a.pct}%">${a.pct >= 12 ? a.pct + '%' : ''}</div>`).join('')}
      </div>
      <div class="lazy-alloc-labels">
        ${lp.allocation.map(a => `<div class="lazy-alloc-label"><span class="lazy-alloc-dot" style="background: ${a.color};"></span><strong style="color: var(--text-primary);">${a.ticker}</strong> ${a.pct}% <span style="color: var(--text-tertiary);">— ${a.name}</span></div>`).join('')}
      </div>
    </div>
  `).join('');
}

// ====== Renderers: Projection ======
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
  let v = initial, contrib = initial, prevValue = initial;
  for (let m = 0; m <= years * 12; m++) {
    if (m % 12 === 0) {
      data.push({
        year: m / 12, value: v, contrib, interest: v - contrib,
        yearlyContrib: m === 0 ? initial : monthly * 12,
        yearlyInterest: m === 0 ? 0 : (v - prevValue - monthly * 12)
      });
      prevValue = v;
    }
    v = v * (1 + monthlyR) + monthly;
    contrib += monthly;
  }

  let cumCrossover = null, annualCrossover = null;
  for (let i = 1; i < data.length; i++) {
    if (cumCrossover === null && data[i].interest >= data[i].contrib) cumCrossover = data[i].year;
    if (annualCrossover === null && data[i].yearlyInterest >= data[i].yearlyContrib) annualCrossover = data[i].year;
  }
  const doublingYears = Math.log(2) / Math.log(1 + ret / 100);
  const final = data[data.length - 1];
  const interestPct = final.value > 0 ? (final.value - final.contrib) / final.value * 100 : 0;

  const summary = [
    { label: 'Valor final', value: fmt(final.value), sub: 'al año ' + years },
    { label: 'Tú aportaste', value: fmt(final.contrib), sub: (100 - interestPct).toFixed(0) + '% del total' },
    { label: 'Interés compuesto', value: fmt(final.value - final.contrib), color: 'success', sub: interestPct.toFixed(0) + '% del total' },
    { label: 'Multiplicador', value: (final.value / Math.max(final.contrib, 1)).toFixed(2) + 'x', sub: 'tu dinero × este factor' }
  ];
  document.getElementById('proj-summary').innerHTML = summary.map(m => {
    const c = m.color === 'success' ? 'var(--text-success)' : 'var(--text-primary)';
    return `<div class="metric-card"><p class="metric-label">${m.label}</p><p class="metric-value" style="color: ${c};">${m.value}</p><p class="metric-sub">${m.sub || ''}</p></div>`;
  }).join('');

  if (projChart) projChart.destroy();
  const ctx = document.getElementById('proj-chart');
  if (ctx && typeof Chart !== 'undefined') {
    projChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => 'Año ' + d.year),
        datasets: [
          { label: 'Tu dinero (aportes)', data: data.map(d => Math.round(d.contrib)), borderColor: '#888780', backgroundColor: 'rgba(136,135,128,0.45)', fill: 'origin', tension: 0.3, borderWidth: 2, pointRadius: 0 },
          { label: 'Interés compuesto', data: data.map(d => Math.round(d.value - d.contrib)), borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.55)', fill: '-1', tension: 0.3, borderWidth: 2, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: c => c.dataset.label + ': $' + c.parsed.y.toLocaleString('en-US'), footer: items => 'Total: $' + Math.round(items.reduce((a, b) => a + b.parsed.y, 0)).toLocaleString('en-US') } }
        },
        scales: { y: { stacked: true, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } }
      }
    });
  }

  let html = '';
  if (cumCrossover !== null) html += `<div class="alert alert-success" style="margin-bottom: 8px;"><i class="ti ti-arrow-merge"></i><div><div class="alert-title">Año ${cumCrossover}: el interés iguala a tus aportes</div><div class="alert-msg">El mercado generó acumulado ${fmt(data[cumCrossover].interest)}, igualando lo que tú aportaste (${fmt(data[cumCrossover].contrib)}). Desde aquí, el mercado pone más que tú.</div></div></div>`;
  if (annualCrossover !== null) html += `<div class="alert alert-info" style="margin-bottom: 8px;"><i class="ti ti-rocket"></i><div><div class="alert-title">Año ${annualCrossover}: velocidad de escape 🚀</div><div class="alert-msg">El interés generado este año (${fmt(data[annualCrossover].yearlyInterest)}) supera tus aportes anuales (${fmt(data[annualCrossover].yearlyContrib)}). El interés compuesto se vuelve la fuerza dominante.</div></div></div>`;
  html += `<div class="alert alert-info" style="margin-bottom: 1rem;"><i class="ti ti-math-symbols"></i><div><div class="alert-title">Regla del 72: tu dinero se duplica cada ${doublingYears.toFixed(1)} años</div><div class="alert-msg">Al ${ret}% anual, lo que tengas hoy vale ~2× en ${doublingYears.toFixed(1)} años, ~4× en ${(doublingYears * 2).toFixed(1)} años. Solo la mecánica del interés compuesto.</div></div></div>`;
  document.getElementById('proj-insights').innerHTML = html;

  const step = years <= 10 ? 2 : 5;
  const ms = [];
  for (let y = step; y <= years; y += step) ms.push(y);
  if (ms[ms.length - 1] !== years) ms.push(years);
  document.getElementById('proj-milestones-table').innerHTML = `<thead><tr><th>Año</th><th style="text-align: right;">Valor total</th><th style="text-align: right;">Aportado</th><th style="text-align: right;">Interés acum.</th><th style="text-align: right;">% interés</th><th style="text-align: right;">Interés del año</th></tr></thead><tbody>${ms.map(y => {
    const d = data[y]; const pct = d.value > 0 ? ((d.value - d.contrib) / d.value * 100) : 0;
    const isCross = y === cumCrossover, isEsc = y === annualCrossover;
    const marker = isCross ? ' 🟰' : (isEsc ? ' 🚀' : '');
    return `<tr ${(isCross || isEsc) ? 'style="background: var(--bg-success);"' : ''}><td><strong>${y}${marker}</strong></td><td style="text-align: right;">${fmt(d.value)}</td><td style="text-align: right;" class="text-secondary">${fmt(d.contrib)}</td><td style="text-align: right;" class="text-success"><strong>${fmt(d.interest)}</strong></td><td style="text-align: right;">${pct.toFixed(0)}%</td><td style="text-align: right;" class="text-success">${fmt(d.yearlyInterest)}</td></tr>`;
  }).join('')}</tbody>`;
}

// ====== Renderers: Alerts ======
function renderAlerts() {
  const alerts = [];
  const enel = portfolio.find(p => p.ticker === 'ENELCHILE');
  const peh = portfolio.find(p => p.ticker === 'PEHUENCHE');
  if (enel && peh) alerts.push({ type: 'danger', icon: 'ti-alert-triangle', title: 'Redundancia detectada', msg: 'PEHUENCHE es filial de Enel Generación Chile. Tener ambas duplica exposición al mismo grupo.' });
  const cl = aggregateMetrics('CL'), us = aggregateMetrics('US');
  if (cl.pct < benchmarks.ipsa['1Y'] && cl.count > 0) alerts.push({ type: 'warning', icon: 'ti-chart-bar', title: 'Cartera CL bajo IPSA', msg: `Tu cartera Chile rinde ${cl.pct.toFixed(1)}% vs IPSA ${benchmarks.ipsa['1Y']}% (1 año).` });
  if (us.count > 0 && us.pct < benchmarks.spy['1Y']) alerts.push({ type: 'warning', icon: 'ti-chart-bar', title: 'Cartera US bajo S&P 500', msg: `Tu cartera US rinde ${us.pct.toFixed(1)}% vs S&P 500 ${benchmarks.spy['1Y']}% (1 año).` });
  portfolio.forEach(p => { const pct = posReturnPct(p); if (pct < -5) alerts.push({ type: 'warning', icon: 'ti-trending-down', title: `${p.ticker} en pérdida (${pct.toFixed(2)}%)`, msg: 'Revisa si la tesis sigue válida.' }); });
  const utilVal = portfolio.reduce((a, p) => a + (['Utilities', 'Energía/Servicios'].includes(getSector(p.ticker)) ? posValueUSD(p) : 0), 0);
  const total = cl.val + us.val;
  if (total > 0 && utilVal / total > 0.4) alerts.push({ type: 'warning', icon: 'ti-chart-pie', title: `Concentración utilities ${(utilVal/total*100).toFixed(1)}%`, msg: 'Más del 40% en utilities/energía. Considera diversificar.' });
  if (us.count === 0) alerts.push({ type: 'info', icon: 'ti-world', title: '100% exposición Chile', msg: 'Sin posiciones en EE.UU. Empieza con VOO o SCHD para diversificación geográfica.' });

  const hhi = calculateHHI();
  if (hhi > 2500) alerts.push({ type: 'warning', icon: 'ti-target', title: `Alta concentración (HHI ${Math.round(hhi)})`, msg: 'Tu cartera depende demasiado de pocas posiciones. Ver pestaña Riesgo.' });

  if (alerts.length === 0) alerts.push({ type: 'success', icon: 'ti-check', title: 'Cartera saludable', msg: 'Sin alertas críticas detectadas.' });
  document.getElementById('alerts-list').innerHTML = alerts.map(a => `<div class="alert alert-${a.type}"><i class="ti ${a.icon}"></i><div><div class="alert-title">${a.title}</div><div class="alert-msg">${a.msg}</div></div></div>`).join('');
}

// ====== Master render ======
function renderAll() {
  renderMetrics();
  renderMarketSplit();
  renderDistribution();
  renderPositions();
  renderDividends();
  renderAlerts();
  const active = document.querySelector('.tab-content.active');
  if (!active) return;
  const id = active.id;
  if (id === 'tab-risk') renderRisk();
  if (id === 'tab-rotation') renderRotation();
  if (id === 'tab-benchmark') renderBenchmark();
  if (id === 'tab-lazy') renderLazy();
  if (id === 'tab-projection') renderProjection();
}

// ====== Setup ======
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      const t = btn.dataset.tab;
      if (t === 'projection') renderProjection();
      if (t === 'benchmark') renderBenchmark();
      if (t === 'rotation') renderRotation();
      if (t === 'risk') renderRisk();
      if (t === 'lazy') renderLazy();
      if (t === 'dividends') renderDividends();
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
    if (!t || !q || !b || !n) { alert('Completa campos requeridos: ticker, cantidad, precio de compra y precio actual.'); return; }
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
    const rows = [['Ticker', 'Nombre', 'Mercado', 'Cantidad', 'P.Compra', 'P.Actual', 'Valor USD', 'Ganancia %', 'Yield %', 'Div/año']];
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
        if (!confirm(`¿Reemplazar tu cartera con ${data.length} posición(es) del archivo?`)) return;
        portfolio = data;
        savePortfolio();
        renderAll();
        alert('Cartera importada correctamente.');
      } catch (err) { alert('Error: ' + err.message); }
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

// ====== PWA install prompt ======
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (!localStorage.getItem('install_dismissed')) {
    document.getElementById('install-banner').classList.add('show');
  }
});
document.getElementById('install-btn')?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') document.getElementById('install-banner').classList.remove('show');
  deferredInstallPrompt = null;
});
document.getElementById('install-dismiss')?.addEventListener('click', () => {
  document.getElementById('install-banner').classList.remove('show');
  localStorage.setItem('install_dismissed', '1');
});

// ====== Service Worker ======
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => console.log('SW failed:', err));
  });
}

// ====== Init ======
loadPortfolio();
setupTabs();
setupMarketFilter();
setupForm();
renderAll();

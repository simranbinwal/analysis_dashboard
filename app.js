const state = {
  rawRows: [],
  cleanedRows: [],
  columns: [],
  types: {},
  profile: null,
  quality: null,
  insights: [],
  forecast: null,
  segments: null
};

const colors = {
  blue: "#2563eb",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  teal: "#0f766e",
  violet: "#7c3aed",
  ink: "#182033",
  muted: "#687287",
  line: "#dfe5ee"
};

const els = {
  fileInput: document.getElementById("fileInput"),
  sampleBtn: document.getElementById("sampleBtn"),
  cleanBtn: document.getElementById("cleanBtn"),
  pdfBtn: document.getElementById("pdfBtn"),
  pptBtn: document.getElementById("pptBtn"),
  numericSelect: document.getElementById("numericSelect"),
  categorySelect: document.getElementById("categorySelect"),
  targetSelect: document.getElementById("targetSelect"),
  qualityBadge: document.getElementById("qualityBadge"),
  rowsMetric: document.getElementById("rowsMetric"),
  colsMetric: document.getElementById("colsMetric"),
  missingMetric: document.getElementById("missingMetric"),
  duplicateMetric: document.getElementById("duplicateMetric"),
  outlierMetric: document.getElementById("outlierMetric"),
  cleaningList: document.getElementById("cleaningList"),
  insightsList: document.getElementById("insightsList"),
  predictiveStats: document.getElementById("predictiveStats"),
  segmentSummary: document.getElementById("segmentSummary"),
  chartCaption: document.getElementById("chartCaption"),
  tableCaption: document.getElementById("tableCaption"),
  chatLog: document.getElementById("chatLog"),
  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput")
};

const sampleCsv = `Date,Region,Customer,Product,Sales,Quantity,Discount,Satisfaction
2025-01-01,North,Aster Retail,Laptop,12800,8,0.08,8.7
2025-01-02,South,Bright Mart,Tablet,5200,5,0.12,7.9
2025-01-03,East,Cascade Inc,Phone,7600,9,0.05,8.3
2025-01-04,West,Dwell Co,Laptop,15400,10,0.1,9.1
2025-01-05,North,Elm Foods,Accessory,2100,15,0.2,7.1
2025-01-06,South,Focal Shop,Phone,8400,11,0.07,8.4
2025-01-07,East,Grove Stores,Tablet,,6,0.09,7.8
2025-01-08,West,Halo Market,Laptop,18200,12,0.11,9.2
2025-01-09,North,Iris Supply,Phone,9100,10,0.06,8.6
2025-01-10,South,Juno Labs,Accessory,2600,18,0.18,
2025-01-10,South,Juno Labs,Accessory,2600,18,0.18,
2025-01-11,East,Kite Retail,Tablet,6100,7,0.1,7.7
2025-01-12,West,Lumen Co,Laptop,19200,13,0.09,9.4
2025-01-13,North,Mosaic Ltd,Phone,9800,12,0.07,8.8
2025-01-14,South,Nova Traders,Accessory,2900,20,0.21,7.2
2025-01-15,East,Orbit Sales,Tablet,6800,8,0.11,8.1
2025-01-16,West,Praxis Corp,Laptop,20500,14,0.08,9.3
2025-01-17,North,Quartz Hub,Phone,10400,13,0.06,8.9
2025-01-18,South,Rivet Shop,Accessory,3300,21,0.19,7.4
2025-01-19,East,Solace Stores,Tablet,7200,9,0.1,8.2
2025-01-20,West,Tandem Inc,Laptop,21400,15,0.09,9.5
2025-01-21,North,Uplink Retail,Phone,11200,14,0.05,8.9
2025-01-22,South,Vector Mart,Accessory,3600,23,0.2,7.6
2025-01-23,East,Wave Labs,Tablet,7600,10,0.08,8.4
2025-01-24,West,Yarrow Co,Laptop,22500,16,0.07,9.6
2025-01-25,North,Zenith Ltd,Phone,11900,15,0.06,9.0
2025-01-26,South,Aster Retail,Accessory,3900,24,0.18,7.7
2025-01-27,East,Bright Mart,Tablet,7900,11,0.09,8.3
2025-01-28,West,Cascade Inc,Laptop,23900,17,0.08,9.6
2025-01-29,North,Dwell Co,Phone,12600,15,0.05,9.1
2025-01-30,South,Elm Foods,Accessory,4200,25,0.17,7.8
2025-01-31,East,Focal Shop,Tablet,8200,11,0.08,8.4
2025-02-01,West,Grove Stores,Laptop,61000,18,0.07,9.7`;

function parseCsv(text) {
  const rows = [];
  let cell = "";
  let row = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (!rows.length) return [];

  const headers = rows[0].map((name, index) => name || `Column ${index + 1}`);
  return rows.slice(1).map(values => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] ?? "";
    });
    return item;
  });
}

function loadRows(rows) {
  state.rawRows = rows;
  state.columns = rows.length ? Object.keys(rows[0]) : [];
  state.cleanedRows = rows.map(row => ({ ...row }));
  state.types = inferTypes(rows, state.columns);
  state.profile = profileRows(rows);
  populateControls();
  runAnalysis();
  els.cleanBtn.disabled = false;
  els.pdfBtn.disabled = false;
  els.pptBtn.disabled = false;
}

function inferTypes(rows, columns) {
  const types = {};
  columns.forEach(column => {
    let numeric = 0;
    let dateLike = 0;
    let filled = 0;
    rows.forEach(row => {
      const value = row[column];
      if (isMissing(value)) return;
      filled += 1;
      if (Number.isFinite(toNumber(value))) numeric += 1;
      if (!Number.isNaN(Date.parse(value))) dateLike += 1;
    });
    const numericRate = filled ? numeric / filled : 0;
    const dateRate = filled ? dateLike / filled : 0;
    types[column] = dateRate > 0.8 && numericRate < 0.6 ? "date" : numericRate > 0.7 ? "number" : "category";
  });
  return types;
}

function profileRows(rows) {
  const missingByColumn = {};
  const uniqueSignatures = new Set();
  let missing = 0;
  let duplicates = 0;

  state.columns.forEach(column => {
    missingByColumn[column] = 0;
  });

  rows.forEach(row => {
    const signature = JSON.stringify(row);
    if (uniqueSignatures.has(signature)) duplicates += 1;
    uniqueSignatures.add(signature);
    state.columns.forEach(column => {
      if (isMissing(row[column])) {
        missing += 1;
        missingByColumn[column] += 1;
      }
    });
  });

  const outliers = detectOutliers(rows);
  return { missing, missingByColumn, duplicates, outliers };
}

function cleanRows(rows) {
  const unique = [];
  const seen = new Set();
  rows.forEach(row => {
    const signature = JSON.stringify(row);
    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push({ ...row });
    }
  });

  const fillValues = {};
  state.columns.forEach(column => {
    const values = unique.map(row => row[column]).filter(value => !isMissing(value));
    fillValues[column] = state.types[column] === "number" ? median(values.map(toNumber)) : mode(values);
  });

  unique.forEach(row => {
    state.columns.forEach(column => {
      if (isMissing(row[column])) row[column] = fillValues[column] ?? "";
    });
  });

  const outlierMap = detectOutliers(unique);
  Object.keys(outlierMap.byColumn).forEach(column => {
    const values = unique.map(row => toNumber(row[column])).filter(Number.isFinite);
    const bounds = iqrBounds(values);
    unique.forEach(row => {
      const value = toNumber(row[column]);
      if (!Number.isFinite(value)) return;
      if (value < bounds.low) row[column] = round(bounds.low);
      if (value > bounds.high) row[column] = round(bounds.high);
    });
  });

  return unique;
}

function runAnalysis() {
  state.cleanedRows = cleanRows(state.rawRows);
  state.profile = profileRows(state.rawRows);
  state.quality = computeQuality(state.rawRows, state.profile);
  state.insights = generateInsights();
  state.forecast = buildForecast();
  state.segments = buildSegments();
  renderAll();
}

function computeQuality(rows, profile) {
  const cells = Math.max(1, rows.length * state.columns.length);
  const completeness = 1 - profile.missing / cells;
  const uniqueness = rows.length ? 1 - profile.duplicates / rows.length : 1;
  const outlierHealth = rows.length ? 1 - Math.min(profile.outliers.total / Math.max(1, rows.length), 1) * 0.5 : 1;
  const consistency = computeConsistency(rows);
  const score = Math.round((completeness * 0.35 + uniqueness * 0.25 + consistency * 0.2 + outlierHealth * 0.2) * 100);
  return {
    score,
    completeness: Math.round(completeness * 100),
    uniqueness: Math.round(uniqueness * 100),
    consistency: Math.round(consistency * 100),
    outlierHealth: Math.round(outlierHealth * 100)
  };
}

function computeConsistency(rows) {
  let checks = 0;
  let pass = 0;
  state.columns.forEach(column => {
    rows.forEach(row => {
      const value = row[column];
      if (isMissing(value)) return;
      checks += 1;
      if (state.types[column] === "number") {
        if (Number.isFinite(toNumber(value))) pass += 1;
      } else if (state.types[column] === "date") {
        if (!Number.isNaN(Date.parse(value))) pass += 1;
      } else {
        pass += 1;
      }
    });
  });
  return checks ? pass / checks : 1;
}

function detectOutliers(rows) {
  const byColumn = {};
  let total = 0;
  numericColumns().forEach(column => {
    const values = rows.map(row => toNumber(row[column])).filter(Number.isFinite);
    if (values.length < 4) return;
    const bounds = iqrBounds(values);
    const count = values.filter(value => value < bounds.low || value > bounds.high).length;
    if (count) {
      byColumn[column] = count;
      total += count;
    }
  });
  return { total, byColumn };
}

function iqrBounds(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  return { low: q1 - 1.5 * iqr, high: q3 + 1.5 * iqr };
}

function generateInsights() {
  if (!state.rawRows.length) return ["Upload a CSV file to generate automated insights."];
  const numeric = numericColumns();
  const category = els.categorySelect.value || categoryColumns()[0];
  const target = els.targetSelect.value || numeric[0];
  const profile = state.profile;
  const insights = [];

  insights.push(`${state.rawRows.length} rows and ${state.columns.length} columns were profiled; ${state.cleanedRows.length} rows remain after duplicate removal.`);
  insights.push(`${profile.missing} missing values were detected and imputed using median or mode values.`);

  if (profile.outliers.total) {
    const top = Object.entries(profile.outliers.byColumn).sort((a, b) => b[1] - a[1])[0];
    insights.push(`${profile.outliers.total} outliers were detected; ${top[0]} contributed the highest count and was capped during cleaning.`);
  } else {
    insights.push("No statistical outliers were found with the IQR rule.");
  }

  if (target && category) {
    const groups = groupBy(state.cleanedRows, category, target);
    const best = groups.sort((a, b) => b.sum - a.sum)[0];
    if (best) insights.push(`${best.key} leads ${category} by total ${target}, contributing ${formatNumber(best.sum)}.`);
  }

  if (state.forecast && state.forecast.next.length) {
    const next = state.forecast.next[0];
    insights.push(`The next forecasted ${state.forecast.target} value is ${formatNumber(next.value)} based on the latest trend.`);
  }

  if (state.quality) {
    insights.push(`Overall data quality score is ${state.quality.score}/100, driven by ${state.quality.completeness}% completeness and ${state.quality.uniqueness}% uniqueness.`);
  }

  return insights;
}

function buildForecast() {
  const numeric = numericColumns();
  if (!numeric.length || !state.cleanedRows.length) return null;

  const target = pickSalesColumn(numeric);
  const dateColumn = state.columns.find(column => state.types[column] === "date");
  const series = [];

  if (dateColumn) {
    const grouped = new Map();
    state.cleanedRows.forEach(row => {
      const time = Date.parse(row[dateColumn]);
      const value = toNumber(row[target]);
      if (Number.isNaN(time) || !Number.isFinite(value)) return;
      const key = new Date(time).toISOString().slice(0, 10);
      grouped.set(key, (grouped.get(key) || 0) + value);
    });
    [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([label, value], index) => {
      series.push({ x: index + 1, label, value });
    });
  } else {
    state.cleanedRows.forEach((row, index) => {
      const value = toNumber(row[target]);
      if (Number.isFinite(value)) series.push({ x: index + 1, label: `Row ${index + 1}`, value });
    });
  }

  if (series.length < 3) return null;
  const model = linearRegression(series.map(point => point.x), series.map(point => point.value));
  const next = Array.from({ length: 6 }, (_, index) => {
    const x = series.length + index + 1;
    return { x, label: `Next ${index + 1}`, value: Math.max(0, model.predict(x)) };
  });

  return { target, series, next, model };
}

function buildSegments() {
  const numeric = numericColumns();
  if (numeric.length < 2 || state.cleanedRows.length < 6) return null;
  const features = numeric.slice(0, 4);
  const points = state.cleanedRows.map(row => features.map(column => toNumber(row[column])));
  const valid = points
    .map((values, index) => ({ values, row: state.cleanedRows[index] }))
    .filter(item => item.values.every(Number.isFinite));
  if (valid.length < 6) return null;

  const scaled = standardize(valid.map(item => item.values));
  const k = Math.min(3, scaled.length);
  const labels = kmeans(scaled, k, 18);
  const segments = Array.from({ length: k }, (_, index) => ({
    id: index,
    rows: [],
    count: 0
  }));

  labels.forEach((label, index) => {
    segments[label].rows.push(valid[index].row);
    segments[label].count += 1;
  });

  const target = pickSalesColumn(numeric);
  segments.forEach(segment => {
    const values = segment.rows.map(row => toNumber(row[target])).filter(Number.isFinite);
    segment.avg = average(values);
  });

  return { features, target, labels, valid, segments };
}

function linearRegression(xs, ys) {
  const xAvg = average(xs);
  const yAvg = average(ys);
  const numerator = xs.reduce((sum, x, index) => sum + (x - xAvg) * (ys[index] - yAvg), 0);
  const denominator = xs.reduce((sum, x) => sum + Math.pow(x - xAvg, 2), 0) || 1;
  const slope = numerator / denominator;
  const intercept = yAvg - slope * xAvg;
  const predicted = xs.map(x => intercept + slope * x);
  const ssRes = ys.reduce((sum, y, index) => sum + Math.pow(y - predicted[index], 2), 0);
  const ssTot = ys.reduce((sum, y) => sum + Math.pow(y - yAvg, 2), 0) || 1;
  return {
    slope,
    intercept,
    r2: Math.max(0, 1 - ssRes / ssTot),
    predict: x => intercept + slope * x
  };
}

function standardize(rows) {
  const columns = rows[0].length;
  const means = Array.from({ length: columns }, (_, column) => average(rows.map(row => row[column])));
  const deviations = Array.from({ length: columns }, (_, column) => {
    const variance = average(rows.map(row => Math.pow(row[column] - means[column], 2)));
    return Math.sqrt(variance) || 1;
  });
  return rows.map(row => row.map((value, column) => (value - means[column]) / deviations[column]));
}

function kmeans(points, k, iterations) {
  let centroids = points.slice(0, k).map(point => [...point]);
  let labels = points.map((_, index) => index % k);

  for (let step = 0; step < iterations; step += 1) {
    labels = points.map(point => closestCentroid(point, centroids));
    centroids = centroids.map((centroid, cluster) => {
      const members = points.filter((_, index) => labels[index] === cluster);
      if (!members.length) return centroid;
      return centroid.map((_, column) => average(members.map(point => point[column])));
    });
  }
  return labels;
}

function closestCentroid(point, centroids) {
  let best = 0;
  let bestDistance = Infinity;
  centroids.forEach((centroid, index) => {
    const distance = centroid.reduce((sum, value, column) => sum + Math.pow(point[column] - value, 2), 0);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

function renderAll() {
  renderMetrics();
  renderControlsState();
  renderCleaning();
  renderInsights();
  renderCharts();
  renderPredictive();
  renderSegments();
  renderTable();
}

function renderMetrics() {
  const profile = state.profile || { missing: 0, duplicates: 0, outliers: { total: 0 } };
  els.rowsMetric.textContent = String(state.cleanedRows.length);
  els.colsMetric.textContent = String(state.columns.length);
  els.missingMetric.textContent = String(profile.missing);
  els.duplicateMetric.textContent = String(profile.duplicates);
  els.outlierMetric.textContent = String(profile.outliers.total);
  els.qualityBadge.textContent = state.quality ? `${state.quality.score}` : "--";
  els.qualityBadge.style.color = state.quality && state.quality.score < 70 ? colors.amber : colors.green;
}

function renderControlsState() {
  els.chartCaption.textContent = state.cleanedRows.length
    ? `${state.cleanedRows.length} cleaned rows ready for dashboarding.`
    : "Upload a CSV to generate charts.";
}

function renderCleaning() {
  if (!state.profile || !state.quality) return;
  const outlierColumns = Object.entries(state.profile.outliers.byColumn)
    .map(([column, count]) => `${column}: ${count}`)
    .join(", ") || "None";
  setList(els.cleaningList, [
    `Missing values imputed: ${state.profile.missing}.`,
    `Duplicate records removed: ${state.profile.duplicates}.`,
    `Outlier fields detected: ${outlierColumns}.`,
    `Quality components: completeness ${state.quality.completeness}%, uniqueness ${state.quality.uniqueness}%, consistency ${state.quality.consistency}%.`
  ]);
  drawQualityChart();
}

function renderInsights() {
  setList(els.insightsList, state.insights);
}

function renderPredictive() {
  if (!state.forecast) {
    els.predictiveStats.textContent = "Not enough numeric data to generate a predictive model.";
    clearCanvas("forecastChart", "No forecast available");
    return;
  }
  const model = state.forecast.model;
  els.predictiveStats.innerHTML = `
    <strong>Target:</strong> ${escapeHtml(state.forecast.target)}<br>
    <strong>Trend slope:</strong> ${formatNumber(model.slope)} per period<br>
    <strong>Model fit:</strong> ${(model.r2 * 100).toFixed(1)}% R2<br>
    <strong>Next estimate:</strong> ${formatNumber(state.forecast.next[0].value)}
  `;
  drawForecastChart();
}

function renderSegments() {
  if (!state.segments) {
    els.segmentSummary.textContent = "At least two numeric fields and six valid rows are required for segmentation.";
    clearCanvas("segmentChart", "No segment data");
    return;
  }
  els.segmentSummary.innerHTML = state.segments.segments
    .map(segment => `<strong>Segment ${segment.id + 1}</strong>: ${segment.count} rows, average ${escapeHtml(state.segments.target)} ${formatNumber(segment.avg)}`)
    .join("<br>");
  drawSegmentChart();
}

function renderTable() {
  const thead = document.querySelector("#dataTable thead");
  const tbody = document.querySelector("#dataTable tbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";
  if (!state.cleanedRows.length) return;

  const headerRow = document.createElement("tr");
  state.columns.forEach(column => {
    const th = document.createElement("th");
    th.textContent = column;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  state.cleanedRows.slice(0, 25).forEach(row => {
    const tr = document.createElement("tr");
    state.columns.forEach(column => {
      const td = document.createElement("td");
      td.textContent = row[column];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  els.tableCaption.textContent = `First ${Math.min(25, state.cleanedRows.length)} cleaned records`;
}

function renderCharts() {
  drawHistogram();
  drawCategoryChart();
}

function drawHistogram() {
  const column = els.numericSelect.value || numericColumns()[0];
  const canvas = document.getElementById("histogramChart");
  const ctx = getChartContext(canvas);
  if (!column) return drawEmpty(ctx, "No numeric field available");
  const values = state.cleanedRows.map(row => toNumber(row[column])).filter(Number.isFinite);
  if (!values.length) return drawEmpty(ctx, "No values to plot");
  const bins = makeBins(values, 8);
  drawBarChart(ctx, bins.map(bin => bin.label), bins.map(bin => bin.count), `${column} distribution`, colors.blue);
}

function drawCategoryChart() {
  const category = els.categorySelect.value || categoryColumns()[0];
  const target = els.targetSelect.value || numericColumns()[0];
  const canvas = document.getElementById("categoryChart");
  const ctx = getChartContext(canvas);
  if (!category || !target) return drawEmpty(ctx, "No category summary available");
  const groups = groupBy(state.cleanedRows, category, target).slice(0, 8);
  if (!groups.length) return drawEmpty(ctx, "No grouped values");
  drawBarChart(ctx, groups.map(group => group.key), groups.map(group => group.sum), `${target} by ${category}`, colors.teal);
}

function drawQualityChart() {
  const canvas = document.getElementById("qualityChart");
  const ctx = getChartContext(canvas);
  if (!state.quality) return drawEmpty(ctx, "No quality score");
  drawBarChart(
    ctx,
    ["Complete", "Unique", "Consistent", "Outlier Health"],
    [state.quality.completeness, state.quality.uniqueness, state.quality.consistency, state.quality.outlierHealth],
    "Data quality components",
    colors.green,
    100
  );
}

function drawForecastChart() {
  const ctx = getChartContext(document.getElementById("forecastChart"));
  const points = [...state.forecast.series, ...state.forecast.next];
  drawLineChart(ctx, points, state.forecast.series.length, `${state.forecast.target} forecast`);
}

function drawSegmentChart() {
  const ctx = getChartContext(document.getElementById("segmentChart"));
  const segmentColors = [colors.blue, colors.green, colors.violet];
  drawFrame(ctx, "Customer segmentation");
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  const plot = { x: 52, y: 44, w: width - 76, h: height - 78 };
  const featureA = state.segments.features[0];
  const featureB = state.segments.features[1];
  const xs = state.segments.valid.map(item => toNumber(item.row[featureA]));
  const ys = state.segments.valid.map(item => toNumber(item.row[featureB]));
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  state.segments.valid.forEach((item, index) => {
    const x = scale(toNumber(item.row[featureA]), xMin, xMax, plot.x, plot.x + plot.w);
    const y = scale(toNumber(item.row[featureB]), yMin, yMax, plot.y + plot.h, plot.y);
    ctx.fillStyle = segmentColors[state.segments.labels[index] % segmentColors.length];
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = colors.muted;
  ctx.font = "12px sans-serif";
  ctx.fillText(featureA, plot.x, height - 14);
  ctx.save();
  ctx.translate(16, plot.y + plot.h);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(featureB, 0, 0);
  ctx.restore();
}

function drawBarChart(ctx, labels, values, title, fill, fixedMax) {
  drawFrame(ctx, title);
  const canvas = ctx.canvas;
  const plot = { x: 52, y: 44, w: canvas.width - 76, h: canvas.height - 86 };
  const max = fixedMax || Math.max(...values, 1);
  const barWidth = plot.w / values.length * 0.68;

  values.forEach((value, index) => {
    const x = plot.x + index * (plot.w / values.length) + (plot.w / values.length - barWidth) / 2;
    const h = value / max * plot.h;
    ctx.fillStyle = fill;
    ctx.fillRect(x, plot.y + plot.h - h, barWidth, h);
    ctx.fillStyle = colors.muted;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(shortLabel(labels[index]), x + barWidth / 2, plot.y + plot.h + 18);
  });

  ctx.textAlign = "left";
  ctx.fillStyle = colors.muted;
  ctx.fillText(formatNumber(max), 8, plot.y + 4);
  ctx.fillText("0", 28, plot.y + plot.h);
}

function drawLineChart(ctx, points, splitAt, title) {
  drawFrame(ctx, title);
  const canvas = ctx.canvas;
  const plot = { x: 52, y: 44, w: canvas.width - 76, h: canvas.height - 80 };
  const values = points.map(point => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  ctx.strokeStyle = colors.blue;
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = scale(index, 0, points.length - 1, plot.x, plot.x + plot.w);
    const y = scale(point.value, min, max, plot.y + plot.h, plot.y);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = colors.amber;
  const splitX = scale(splitAt - 1, 0, points.length - 1, plot.x, plot.x + plot.w);
  ctx.beginPath();
  ctx.moveTo(splitX, plot.y);
  ctx.lineTo(splitX, plot.y + plot.h);
  ctx.stroke();
  ctx.setLineDash([]);

  points.forEach((point, index) => {
    const x = scale(index, 0, points.length - 1, plot.x, plot.x + plot.w);
    const y = scale(point.value, min, max, plot.y + plot.h, plot.y);
    ctx.fillStyle = index >= splitAt ? colors.amber : colors.blue;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFrame(ctx, title) {
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fbfcff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(52, 36);
  ctx.lineTo(52, canvas.height - 42);
  ctx.lineTo(canvas.width - 24, canvas.height - 42);
  ctx.stroke();
  ctx.fillStyle = colors.ink;
  ctx.font = "700 15px sans-serif";
  ctx.fillText(title, 14, 22);
}

function drawEmpty(ctx, label) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#fbfcff";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = colors.muted;
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, ctx.canvas.width / 2, ctx.canvas.height / 2);
  ctx.textAlign = "left";
}

function clearCanvas(id, label) {
  drawEmpty(getChartContext(document.getElementById(id)), label);
}

function getChartContext(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(300, Math.floor(rect.width));
  const height = Math.max(180, Number(canvas.getAttribute("height")) || 240);
  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }
  return canvas.getContext("2d");
}

function populateControls() {
  const numeric = numericColumns();
  const categories = categoryColumns();
  fillSelect(els.numericSelect, numeric);
  fillSelect(els.targetSelect, numeric);
  fillSelect(els.categorySelect, categories);
}

function fillSelect(select, options) {
  select.innerHTML = "";
  options.forEach(option => {
    const element = document.createElement("option");
    element.value = option;
    element.textContent = option;
    select.appendChild(element);
  });
}

function setList(element, items) {
  element.innerHTML = "";
  items.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    element.appendChild(li);
  });
}

function groupBy(rows, category, target) {
  const grouped = new Map();
  rows.forEach(row => {
    const key = row[category] || "Unknown";
    const value = toNumber(row[target]);
    if (!Number.isFinite(value)) return;
    grouped.set(key, (grouped.get(key) || 0) + value);
  });
  return [...grouped.entries()]
    .map(([key, sum]) => ({ key, sum }))
    .sort((a, b) => b.sum - a.sum);
}

function makeBins(values, count) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const bins = Array.from({ length: count }, (_, index) => ({
    label: `${formatNumber(min + span / count * index)}+`,
    count: 0
  }));
  values.forEach(value => {
    const index = Math.min(count - 1, Math.floor((value - min) / span * count));
    bins[index].count += 1;
  });
  return bins;
}

function numericColumns() {
  return state.columns.filter(column => state.types[column] === "number");
}

function categoryColumns() {
  return state.columns.filter(column => state.types[column] === "category");
}

function pickSalesColumn(numeric) {
  return numeric.find(column => /sales|revenue|amount|price|value/i.test(column)) || numeric[0];
}

function isMissing(value) {
  return value === null || value === undefined || String(value).trim() === "" || String(value).trim().toLowerCase() === "na";
}

function toNumber(value) {
  if (typeof value === "number") return value;
  const normalized = String(value).replace(/[$,%\s]/g, "");
  return normalized === "" ? NaN : Number(normalized);
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return "";
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : round((sorted[middle - 1] + sorted[middle]) / 2);
}

function mode(values) {
  const counts = new Map();
  values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function percentile(sorted, fraction) {
  const index = (sorted.length - 1) * fraction;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function scale(value, min, max, low, high) {
  if (max === min) return (low + high) / 2;
  return low + (value - min) / (max - min) * (high - low);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "--";
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function shortLabel(label) {
  const text = String(label);
  return text.length > 12 ? `${text.slice(0, 11)}.` : text;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function answerQuestion(question) {
  if (!state.cleanedRows.length) return "Upload a CSV first and I can analyze data quality, forecasting, and segments.";
  const text = question.toLowerCase();
  if (text.includes("missing") || text.includes("clean")) {
    return `${state.profile.missing} missing values were filled. Numeric columns use medians and category columns use modes. ${state.profile.duplicates} duplicate rows were removed.`;
  }
  if (text.includes("outlier")) {
    return state.profile.outliers.total
      ? `${state.profile.outliers.total} outliers were detected and capped. The affected columns are ${Object.keys(state.profile.outliers.byColumn).join(", ")}.`
      : "No outliers were detected by the IQR rule.";
  }
  if (text.includes("quality") || text.includes("score")) {
    return `The quality score is ${state.quality.score}/100, with ${state.quality.completeness}% completeness and ${state.quality.uniqueness}% uniqueness.`;
  }
  if (text.includes("forecast") || text.includes("sales")) {
    return state.forecast
      ? `The forecast target is ${state.forecast.target}. The next estimate is ${formatNumber(state.forecast.next[0].value)}, and the trend slope is ${formatNumber(state.forecast.model.slope)} per period.`
      : "A forecast needs at least one numeric target and three valid observations.";
  }
  if (text.includes("segment") || text.includes("customer")) {
    return state.segments
      ? state.segments.segments.map(segment => `Segment ${segment.id + 1}: ${segment.count} rows, avg ${state.segments.target} ${formatNumber(segment.avg)}`).join(" ")
      : "Segmentation needs at least two numeric fields and six valid rows.";
  }
  return state.insights.slice(0, 3).join(" ");
}

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.textContent = text;
  els.chatLog.appendChild(message);
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function generateReportHtml() {
  const items = state.insights.map(item => `<li>${escapeHtml(item)}</li>`).join("");
  const segments = state.segments
    ? state.segments.segments.map(segment => `<li>Segment ${segment.id + 1}: ${segment.count} rows, average ${escapeHtml(state.segments.target)} ${formatNumber(segment.avg)}</li>`).join("")
    : "<li>No segment model generated.</li>";
  return `<!doctype html>
<html><head><title>Data Quality Report</title><style>
body{font-family:Arial,sans-serif;color:#182033;margin:40px;line-height:1.5}
h1{font-size:28px} .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
.box{border:1px solid #dfe5ee;border-radius:8px;padding:14px}.box strong{display:block;font-size:24px}
li{margin:8px 0}@media print{button{display:none}}
</style></head><body>
<button onclick="window.print()">Print or Save as PDF</button>
<h1>Automated Data Cleaning and Visualization Report</h1>
<div class="grid">
<div class="box">Quality<strong>${state.quality.score}/100</strong></div>
<div class="box">Rows<strong>${state.cleanedRows.length}</strong></div>
<div class="box">Missing Fixed<strong>${state.profile.missing}</strong></div>
<div class="box">Outliers<strong>${state.profile.outliers.total}</strong></div>
</div>
<h2>Actionable Insights</h2><ul>${items}</ul>
<h2>Customer Segments</h2><ul>${segments}</ul>
<h2>Predictive Analytics</h2>
<p>${state.forecast ? `Target ${escapeHtml(state.forecast.target)} has next forecast ${formatNumber(state.forecast.next[0].value)} with R2 ${(state.forecast.model.r2 * 100).toFixed(1)}%.` : "No forecast generated."}</p>
</body></html>`;
}

function exportPdfReport() {
  const report = window.open("", "_blank");
  report.document.write(generateReportHtml());
  report.document.close();
  report.focus();
}

function exportPptx() {
  const slides = [
    {
      title: "Automated Data Cleaning and Visualization System",
      bullets: [
        `Data quality score: ${state.quality.score}/100`,
        `Rows analyzed: ${state.rawRows.length}`,
        `Cleaned rows: ${state.cleanedRows.length}`,
        `Columns profiled: ${state.columns.length}`
      ]
    },
    {
      title: "Cleaning Results",
      bullets: [
        `Missing values imputed: ${state.profile.missing}`,
        `Duplicates removed: ${state.profile.duplicates}`,
        `Outliers detected and capped: ${state.profile.outliers.total}`,
        `Completeness: ${state.quality.completeness}%`
      ]
    },
    {
      title: "Actionable Insights",
      bullets: state.insights.slice(0, 5)
    },
    {
      title: "Predictive Analytics and Segments",
      bullets: [
        state.forecast ? `Forecast target: ${state.forecast.target}, next estimate ${formatNumber(state.forecast.next[0].value)}` : "Forecast was not available.",
        state.segments ? `${state.segments.segments.length} customer segments generated.` : "Segmentation was not available.",
        state.segments ? state.segments.segments.map(segment => `Segment ${segment.id + 1}: ${segment.count} rows`).join("; ") : ""
      ].filter(Boolean)
    }
  ];
  const blob = buildPptx(slides);
  downloadBlob(blob, "automated-data-analysis-report.pptx");
}

function buildPptx(slides) {
  const files = {};
  files["[Content_Types].xml"] = contentTypes(slides.length);
  files["_rels/.rels"] = packageRels();
  files["ppt/presentation.xml"] = presentationXml(slides.length);
  files["ppt/_rels/presentation.xml.rels"] = presentationRels(slides.length);
  files["ppt/theme/theme1.xml"] = themeXml();
  files["ppt/slideMasters/slideMaster1.xml"] = slideMasterXml();
  files["ppt/slideMasters/_rels/slideMaster1.xml.rels"] = slideMasterRels();
  files["ppt/slideLayouts/slideLayout1.xml"] = slideLayoutXml();
  files["ppt/slideLayouts/_rels/slideLayout1.xml.rels"] = slideLayoutRels();
  slides.forEach((slide, index) => {
    files[`ppt/slides/slide${index + 1}.xml`] = slideXml(slide, index);
  });
  return new Blob([zipStore(files)], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}

function contentTypes(count) {
  const slideTypes = Array.from({ length: count }, (_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>${slideTypes}</Types>`;
}

function packageRels() {
  return `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`;
}

function presentationXml(count) {
  const ids = Array.from({ length: count }, (_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="wide"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;
}

function presentationRels(count) {
  const slides = Array.from({ length: count }, (_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides}<Relationship Id="rId${count + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>`;
}

function slideXml(slide, index) {
  const bulletShapes = slide.bullets.map((bullet, bulletIndex) => textShape(3, 1.55 + bulletIndex * 0.72, 8.8, 0.55, bullet, 22, false)).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${index % 2 ? "F8FAFC" : "EEF5FF"}"/></a:solidFill></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${textShape(0.6, 0.45, 11, 0.75, slide.title, 32, true)}${bulletShapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function textShape(x, y, w, h, text, size, bold) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${Math.floor(Math.random() * 900000) + 10}" name="Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="${size * 100}"${bold ? ' b="1"' : ""}><a:solidFill><a:srgbClr val="182033"/></a:solidFill></a:rPr><a:t>${escapeXml(text)}</a:t></a:r></a:p></p:txBody></p:sp>`;
}

function themeXml() {
  return `<?xml version="1.0" encoding="UTF-8"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="AutoData"><a:themeElements><a:clrScheme name="AutoData"><a:dk1><a:srgbClr val="182033"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="2563EB"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="2563EB"/></a:accent1><a:accent2><a:srgbClr val="16A34A"/></a:accent2><a:accent3><a:srgbClr val="D97706"/></a:accent3><a:accent4><a:srgbClr val="0F766E"/></a:accent4><a:accent5><a:srgbClr val="7C3AED"/></a:accent5><a:accent6><a:srgbClr val="DC2626"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fontScheme name="Arial"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="AutoData"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
}

function slideMasterXml() {
  return `<?xml version="1.0" encoding="UTF-8"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;
}

function slideMasterRels() {
  return `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;
}

function slideLayoutXml() {
  return `<?xml version="1.0" encoding="UTF-8"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
}

function slideLayoutRels() {
  return `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
}

function emu(inches) {
  return Math.round(inches * 914400);
}

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, char => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;"
  }[char]));
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;

  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint32(10, dosDateTime(), true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    chunks.push(local, data);

    const centralEntry = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralEntry.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(12, dosDateTime(), true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    centralEntry.set(nameBytes, 46);
    central.push(centralEntry);
    offset += local.length + data.length;
  });

  const centralOffset = offset;
  central.forEach(entry => {
    chunks.push(entry);
    offset += entry.length;
  });

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, central.length, true);
  endView.setUint16(10, central.length, true);
  endView.setUint32(12, offset - centralOffset, true);
  endView.setUint32(16, centralOffset, true);
  chunks.push(end);
  return new Blob(chunks);
}

function dosDateTime() {
  const date = new Date();
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 25) | ((date.getMonth() + 1) << 21) | (date.getDate() << 16);
  return day | time;
}

function crc32(data) {
  let crc = -1;
  for (let i = 0; i < data.length; i += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

els.fileInput.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadRows(parseCsv(reader.result));
  reader.readAsText(file);
});

els.sampleBtn.addEventListener("click", () => loadRows(parseCsv(sampleCsv)));
els.cleanBtn.addEventListener("click", runAnalysis);
els.pdfBtn.addEventListener("click", exportPdfReport);
els.pptBtn.addEventListener("click", exportPptx);
els.numericSelect.addEventListener("change", renderCharts);
els.categorySelect.addEventListener("change", renderCharts);
els.targetSelect.addEventListener("change", () => {
  state.insights = generateInsights();
  state.forecast = buildForecast();
  state.segments = buildSegments();
  renderAll();
});
els.chatForm.addEventListener("submit", event => {
  event.preventDefault();
  const question = els.chatInput.value.trim();
  if (!question) return;
  addMessage("user", question);
  addMessage("assistant", answerQuestion(question));
  els.chatInput.value = "";
});

window.addEventListener("resize", () => {
  if (state.cleanedRows.length) renderCharts();
});

renderAll();

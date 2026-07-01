/** ルーストック増加 → 仕込み回数の自動集計 */

function getPrepCatalog() {
  return FORM.ousama.map((f) => ({
    id: f.id,
    name: f.label,
    unit: f.unit || "",
  }));
}

function isRouxStockId(id) {
  return FORM.ousama.some((f) => f.id === id);
}

function emptyPrepLog() {
  return { active: {} };
}

function loadPrepLog() {
  if (typeof getPrepLogFromStore === "function") {
    return getPrepLogFromStore();
  }
  return emptyPrepLog();
}

function savePrepLog(log) {
  if (typeof savePrepLogToStore === "function") {
    savePrepLogToStore(log);
    return;
  }
}

function emptyDayPrep() {
  const day = {};
  getPrepCatalog().forEach((item) => {
    day[item.id] = 0;
  });
  return day;
}

function recordPrepIncrease(itemId, dateISO) {
  if (!isRouxStockId(itemId) || !dateISO) return;
  const month = dateISO.slice(0, 7);
  const log = loadPrepLog();
  if (!log.active[month]) log.active[month] = {};
  if (!log.active[month][dateISO]) {
    log.active[month][dateISO] = emptyDayPrep();
  }
  log.active[month][dateISO][itemId] = roundVal(
    (log.active[month][dateISO][itemId] || 0) + 1
  );
  savePrepLog(log);
  renderPrepSummaryUI();
}

function getPrepDayCounts(dateISO) {
  const month = dateISO?.slice(0, 7);
  if (!month || !dateISO) return emptyDayPrep();
  const log = loadPrepLog();
  return { ...(log.active[month]?.[dateISO] || emptyDayPrep()) };
}

function aggregatePrepMonth(monthKey) {
  const totals = emptyDayPrep();
  const days = loadPrepLog().active[monthKey] || {};
  Object.values(days).forEach((daySnap) => {
    getPrepCatalog().forEach((item) => {
      totals[item.id] = roundVal(totals[item.id] + (daySnap[item.id] || 0));
    });
  });
  return totals;
}

function getPrepMonthDayCount(monthKey) {
  return Object.keys(loadPrepLog().active[monthKey] || {}).length;
}

function collectPrepForDate(dateISO) {
  const counts = getPrepDayCounts(dateISO);
  return getPrepCatalog()
    .map((item) => ({
      id: item.id,
      name: item.name,
      qty: counts[item.id] || 0,
      unit: item.unit,
    }))
    .filter((row) => row.qty > 0);
}

function prepShareLines(dateISO) {
  const items = collectPrepForDate(dateISO);
  if (items.length === 0) return [];
  const lines = ["  ─ 本日の仕込み ─"];
  items.forEach((item) => {
    lines.push(`  ${item.name}　${formatQty(item.qty)}回`);
  });
  return lines;
}

function renderPrepSummaryUI() {
  const el = document.getElementById("prepSummary");
  if (!el) return;

  const dateEl = document.getElementById("reportDate");
  const dateISO = dateEl?.value || todayISO();
  const monthKey = dateISO.slice(0, 7);
  const dayCounts = getPrepDayCounts(dateISO);
  const monthTotals = aggregatePrepMonth(monthKey);
  const dayTotal = getPrepCatalog().reduce((s, item) => s + (dayCounts[item.id] || 0), 0);
  const monthTotal = getPrepCatalog().reduce((s, item) => s + (monthTotals[item.id] || 0), 0);

  if (dayTotal === 0 && monthTotal === 0) {
    el.innerHTML = `<p class="prep-summary-empty">ストックを上げると、仕込み回数を1回ずつ記録します</p>`;
    return;
  }

  let html = `<div class="prep-summary-grid">`;

  if (dayTotal > 0) {
    html += `<div class="prep-summary-block"><p class="prep-summary-label">本日（${escapeHtml(formatDateJP(dateISO))}）</p><ul class="prep-summary-list">`;
    getPrepCatalog().forEach((item) => {
      const c = dayCounts[item.id] || 0;
      if (c <= 0) return;
      html += `<li><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(formatQty(c))}回</strong></li>`;
    });
    html += `</ul></div>`;
  }

  if (monthTotal > 0) {
    html += `<div class="prep-summary-block"><p class="prep-summary-label">今月累計（${escapeHtml(formatMonthJP(monthKey))}・${getPrepMonthDayCount(monthKey)}日）</p><ul class="prep-summary-list">`;
    getPrepCatalog().forEach((item) => {
      const c = monthTotals[item.id] || 0;
      if (c <= 0) return;
      html += `<li><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(formatQty(c))}回</strong></li>`;
    });
    html += `</ul></div>`;
  }

  html += `</div>`;
  el.innerHTML = html;
}

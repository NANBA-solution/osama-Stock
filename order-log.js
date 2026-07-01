/**
 * 発注数の日次記録と月締め集計
 *
 * データ構造（localStorage: osama-order-log-v1）
 * {
 *   active: { "YYYY-MM": { "YYYY-MM-DD": { itemId: qty, ... } } },
 *   closed: { "YYYY-MM": { closedAt, days, totals } }
 * }
 */
const ORDER_LOG_KEY = "osama-order-log-v1";

function getOrderCatalog() {
  const items = [];
  FORM.meat.forEach((ing) => {
    items.push({
      id: ing.id,
      name: ing.name,
      unit: ing.orderUnit,
      group: "meat",
      groupLabel: "お肉",
    });
  });
  FORM.ingredients.forEach((ing) => {
    items.push({
      id: ing.id,
      name: ing.name,
      unit: ing.orderUnit,
      group: "ingredients",
      groupLabel: "具材",
    });
  });
  return items;
}

function emptyOrderLog() {
  return { active: {}, closed: {} };
}

function loadOrderLog() {
  try {
    const raw = localStorage.getItem(ORDER_LOG_KEY);
    if (!raw) return emptyOrderLog();
    const parsed = JSON.parse(raw);
    return {
      active: parsed.active && typeof parsed.active === "object" ? parsed.active : {},
      closed: parsed.closed && typeof parsed.closed === "object" ? parsed.closed : {},
    };
  } catch {
    return emptyOrderLog();
  }
}

function saveOrderLog(log) {
  localStorage.setItem(ORDER_LOG_KEY, JSON.stringify(log));
}

function snapshotOrdersFromState() {
  const snap = {};
  getOrderCatalog().forEach((item) => {
    snap[item.id] = roundVal(state[`${item.id}_order`] ?? 0);
  });
  return snap;
}

function hasAnyOrder(snap) {
  return getOrderCatalog().some((item) => (snap[item.id] || 0) > 0);
}

function recordOrderSnapshot(dateISO) {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return;
  const snap = snapshotOrdersFromState();
  const month = dateISO.slice(0, 7);
  const log = loadOrderLog();

  if (log.closed[month]) return;

  if (!hasAnyOrder(snap)) {
    if (log.active[month]?.[dateISO]) {
      delete log.active[month][dateISO];
      if (Object.keys(log.active[month]).length === 0) {
        delete log.active[month];
      }
      saveOrderLog(log);
    }
    return;
  }

  if (!log.active[month]) log.active[month] = {};
  log.active[month][dateISO] = snap;
  saveOrderLog(log);
}

function aggregateMonthDays(days) {
  const totals = {};
  getOrderCatalog().forEach((item) => {
    totals[item.id] = 0;
  });
  Object.values(days || {}).forEach((daySnap) => {
    getOrderCatalog().forEach((item) => {
      totals[item.id] = roundVal(totals[item.id] + (daySnap[item.id] || 0));
    });
  });
  return totals;
}

function getMonthData(monthKey) {
  const log = loadOrderLog();
  if (log.closed[monthKey]) {
    const closed = log.closed[monthKey];
    return {
      status: "closed",
      days: closed.days || {},
      totals: closed.totals || aggregateMonthDays(closed.days),
      closedAt: closed.closedAt || "",
    };
  }
  const days = log.active[monthKey] || {};
  return {
    status: "active",
    days,
    totals: aggregateMonthDays(days),
    closedAt: "",
  };
}

function listMonthKeys() {
  const log = loadOrderLog();
  const keys = new Set([
    ...Object.keys(log.active),
    ...Object.keys(log.closed),
  ]);
  return [...keys].sort().reverse();
}

function closeOrderMonth(monthKey) {
  const log = loadOrderLog();
  if (log.closed[monthKey]) {
    return { ok: false, reason: "already_closed" };
  }
  const days = log.active[monthKey];
  if (!days || Object.keys(days).length === 0) {
    return { ok: false, reason: "empty" };
  }
  log.closed[monthKey] = {
    closedAt: new Date().toISOString(),
    days: { ...days },
    totals: aggregateMonthDays(days),
  };
  delete log.active[monthKey];
  saveOrderLog(log);
  return { ok: true };
}

function formatMonthJP(monthKey) {
  if (!monthKey) return "";
  const [y, m] = monthKey.split("-");
  return `${y}年${Number(m)}月`;
}

function monthFromDateISO(dateISO) {
  return dateISO?.slice(0, 7) || todayISO().slice(0, 7);
}

function buildOrderSummaryText(monthKey, data) {
  const lines = [];
  const statusLabel = data.status === "closed" ? "（締め済み）" : "（集計中）";
  lines.push(`📊 発注集計 ${formatMonthJP(monthKey)}${statusLabel}`);
  lines.push(`記録日数：${Object.keys(data.days).length}日`);
  lines.push(DIVIDER);

  ["meat", "ingredients"].forEach((group) => {
    const label = group === "meat" ? "お肉" : "具材";
    const items = getOrderCatalog().filter((i) => i.group === group);
    const groupLines = items
      .map((item) => {
        const total = data.totals[item.id] || 0;
        if (total <= 0) return null;
        return `  ${item.name}　${qtyWithUnit(total, item.unit)}`;
      })
      .filter(Boolean);
    if (groupLines.length === 0) return;
    lines.push("");
    lines.push(`■ ${label}`);
    lines.push(...groupLines);
  });

  const grandTotal = getOrderCatalog().reduce(
    (sum, item) => sum + (data.totals[item.id] || 0),
    0
  );
  if (grandTotal <= 0) {
    lines.push("");
    lines.push("（発注記録なし）");
  }

  return lines.join("\n").trimEnd();
}

function renderOrderSummaryUI() {
  const monthEl = document.getElementById("orderSummaryMonth");
  const statusEl = document.getElementById("orderSummaryStatus");
  const contentEl = document.getElementById("orderSummaryContent");
  const closeBtn = document.getElementById("orderSummaryClose");
  if (!monthEl || !statusEl || !contentEl) return;

  const monthKey = monthEl.value || monthFromDateISO(todayISO());
  const data = getMonthData(monthKey);
  const dayCount = Object.keys(data.days).length;
  const isClosed = data.status === "closed";

  statusEl.innerHTML = isClosed
    ? `<span class="order-summary-badge order-summary-badge--closed">締め済み</span> 記録 ${dayCount}日`
    : `<span class="order-summary-badge order-summary-badge--active">集計中</span> 記録 ${dayCount}日`;

  if (closeBtn) {
    closeBtn.disabled = isClosed || dayCount === 0;
    closeBtn.textContent = isClosed ? "締め済み" : "月締めする";
  }

  const groups = [
    { key: "meat", label: "お肉" },
    { key: "ingredients", label: "具材" },
  ];

  let html = "";
  groups.forEach((group) => {
    const items = getOrderCatalog().filter((i) => i.group === group.key);
    const rows = items
      .map((item) => {
        const total = data.totals[item.id] || 0;
        if (total <= 0) return "";
        return `<tr>
          <td class="order-summary-name">${escapeHtml(item.name)}</td>
          <td class="order-summary-qty">${escapeHtml(qtyWithUnit(total, item.unit))}</td>
        </tr>`;
      })
      .join("");

    if (!rows) return;

    html += `
      <div class="order-summary-group">
        <p class="order-summary-group-title">${escapeHtml(group.label)}</p>
        <table class="order-summary-table">
          <thead>
            <tr><th>品目</th><th>月間合計</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  });

  if (!html) {
    html = `<p class="order-summary-empty">この月の発注記録はまだありません。<br>発注数を入力して保存すると、日付ごとに集計されます。</p>`;
  }

  const sortedDays = Object.keys(data.days).sort();
  if (sortedDays.length > 0) {
    html += `<details class="order-summary-days">
      <summary>日別の内訳（${sortedDays.length}日）</summary>
      <div class="order-summary-days-body">`;
    sortedDays.forEach((day) => {
      const snap = data.days[day];
      const dayLines = getOrderCatalog()
        .filter((item) => (snap[item.id] || 0) > 0)
        .map(
          (item) =>
            `<span>${escapeHtml(item.name)} ${escapeHtml(qtyWithUnit(snap[item.id], item.unit))}</span>`
        )
        .join("");
      if (!dayLines) return;
      html += `<div class="order-summary-day">
        <p class="order-summary-day-date">${escapeHtml(formatDateJP(day))}</p>
        <div class="order-summary-day-items">${dayLines}</div>
      </div>`;
    });
    html += `</div></details>`;
  }

  contentEl.innerHTML = html;
}

function initOrderSummary() {
  const monthEl = document.getElementById("orderSummaryMonth");
  if (!monthEl) return;

  const dateEl = document.getElementById("reportDate");
  monthEl.value = monthFromDateISO(dateEl?.value || todayISO());

  monthEl.addEventListener("change", renderOrderSummaryUI);

  dateEl?.addEventListener("change", () => {
    monthEl.value = monthFromDateISO(dateEl.value || todayISO());
    renderOrderSummaryUI();
  });

  document.getElementById("orderSummaryRefresh")?.addEventListener("click", () => {
    renderOrderSummaryUI();
    showToast("集計を更新しました");
  });

  document.getElementById("orderSummaryCopy")?.addEventListener("click", async () => {
    const monthKey = monthEl.value || monthFromDateISO(todayISO());
    const text = buildOrderSummaryText(monthKey, getMonthData(monthKey));
    try {
      await copyToClipboard(text);
      showToast("集計をコピーしました");
    } catch {
      alert("コピーに失敗しました");
    }
  });

  document.getElementById("orderSummaryClose")?.addEventListener("click", () => {
    const monthKey = monthEl.value || monthFromDateISO(todayISO());
    const data = getMonthData(monthKey);
    if (data.status === "closed") return;
    if (Object.keys(data.days).length === 0) {
      alert("この月には発注記録がありません。");
      return;
    }
    const ok = window.confirm(
      `${formatMonthJP(monthKey)}の発注集計を月締めします。\n締め後も履歴から確認できます。よろしいですか？`
    );
    if (!ok) return;
    const result = closeOrderMonth(monthKey);
    if (!result.ok) {
      alert(result.reason === "already_closed" ? "すでに締め済みです。" : "締められませんでした。");
      return;
    }
    renderOrderSummaryUI();
    showToast(`${formatMonthJP(monthKey)}を締めました`);
    if (navigator.vibrate) navigator.vibrate(30);
  });

  renderOrderSummaryUI();
}

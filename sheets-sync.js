/** Googleスプレッドシート連携（コピー・LINE共有時に自動POST） */

function getOrderCatalog() {
  const items = [];
  FORM.meat.forEach((ing) => {
    items.push({
      id: ing.id,
      name: ing.name,
      unit: ing.orderUnit,
      groupLabel: "お肉",
    });
  });
  FORM.ingredients.forEach((ing) => {
    items.push({
      id: ing.id,
      name: ing.name,
      unit: ing.orderUnit,
      groupLabel: "具材",
    });
  });
  return items;
}

function collectCurrentOrders() {
  return getOrderCatalog()
    .map((item) => ({
      id: item.id,
      name: item.name,
      groupLabel: item.groupLabel,
      qty: num(`${item.id}_order`),
      unit: item.unit || "",
    }))
    .filter((row) => row.qty > 0);
}

async function postToSheets(payload) {
  const url = getSheetsWebhookUrl();
  if (!url) return { ok: false, skipped: true };
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

async function syncDailyReportToSheet(reportText) {
  const dateEl = document.getElementById("reportDate");
  const reportDate = dateEl?.value || todayISO();
  return postToSheets({
    type: "daily_report",
    sentAt: new Date().toISOString(),
    reportDate,
    deviceId: getDeviceId(),
    reportText: reportText || "",
    orders: collectCurrentOrders(),
  });
}

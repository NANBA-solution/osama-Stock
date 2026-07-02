/** Googleスプレッドシート連携（コピー・LINE共有時に自動POST） */

const SHEET_POST_DEBOUNCE_MS = 20000;

let lastSheetPostKey = "";
let lastSheetPostAt = 0;

function hashSharePayload(reportDate, deviceId, reportText) {
  const raw = `${reportDate}|${deviceId}|${reportText || ""}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

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
      redirect: "follow",
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

async function syncDailyReportToSheet(reportText) {
  const dateEl = document.getElementById("reportDate");
  const reportDate = dateEl?.value || todayISO();
  const deviceId = getDeviceId();
  const text = reportText || "";
  const dedupKey = hashSharePayload(reportDate, deviceId, text);
  const now = Date.now();

  if (dedupKey === lastSheetPostKey && now - lastSheetPostAt < SHEET_POST_DEBOUNCE_MS) {
    return { ok: true, skipped: true, reason: "duplicate" };
  }

  const payload = {
    type: "daily_report",
    requestId: `${deviceId}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    sentAt: new Date().toISOString(),
    reportDate,
    deviceId,
    reportText: text,
    orders: collectCurrentOrders(),
  };

  const result = await postToSheets(payload);
  if (result.ok) {
    lastSheetPostKey = dedupKey;
    lastSheetPostAt = now;
  }
  return result;
}

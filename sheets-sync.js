/** Googleスプレッドシート連携（Apps Script WebアプリへPOST） */

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
  const preps =
    typeof collectPrepForDate === "function" ? collectPrepForDate(reportDate) : [];
  return postToSheets({
    type: "daily_report",
    sentAt: new Date().toISOString(),
    reportDate,
    deviceId: getDeviceId(),
    reportText: reportText || "",
    orders: collectCurrentOrders(),
    preps,
  });
}

async function syncMonthCloseToSheet(monthKey, data) {
  const totals = getOrderCatalog()
    .map((item) => ({
      id: item.id,
      name: item.name,
      groupLabel: item.groupLabel,
      qty: data.totals[item.id] || 0,
      unit: item.unit || "",
    }))
    .filter((row) => row.qty > 0);

  return postToSheets({
    type: "month_close",
    sentAt: new Date().toISOString(),
    month: monthKey,
    deviceId: getDeviceId(),
    summaryText: buildOrderSummaryText(monthKey, data),
    dayCount: Object.keys(data.days).length,
    totals,
  });
}

function updateSheetsConfigUI() {
  const input = document.getElementById("sheetsWebhookUrl");
  const status = document.getElementById("sheetsConfigStatus");
  if (!input) return;
  input.value = getSheetsWebhookUrl();
  if (status) {
    status.textContent = getSheetsWebhookUrl()
      ? "連携設定済み（コピー・LINE共有・月締め時に自動送信）"
      : "未設定";
  }
}

function initSheetsSync() {
  const saveBtn = document.getElementById("sheetsSaveUrl");
  const sendBtn = document.getElementById("sheetsSendNow");
  const input = document.getElementById("sheetsWebhookUrl");
  if (!input) return;

  updateSheetsConfigUI();

  saveBtn?.addEventListener("click", () => {
    const url = input.value.trim();
    if (url && !/^https:\/\/script\.google\.com\/macros\/s\//.test(url)) {
      alert("Google Apps Script の WebアプリURL（https://script.google.com/macros/s/...）を入力してください。");
      return;
    }
    saveSheetsWebhookUrl(url);
    updateSheetsConfigUI();
    showToast(url ? "スプレッドシートURLを保存しました" : "連携を解除しました");
  });

  sendBtn?.addEventListener("click", async () => {
    if (!getSheetsWebhookUrl()) {
      alert("先にスプレッドシートのURLを保存してください。");
      return;
    }
    const result = await syncDailyReportToSheet(buildShareText());
    if (result.skipped) return;
    if (result.ok) {
      showToast("スプレッドシートに送信しました");
    } else {
      alert("送信に失敗しました。URLを確認してください。");
    }
  });
}

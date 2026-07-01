/**
 * アプリ統合データストア（localStorage: osama-stock-app-v2）
 *
 * {
 *   v: 2,
 *   updatedAt: ISO,
 *   form: { date, values },
 *   orders: { active, closed },
 *   reports: { "YYYY-MM-DD": { text, savedAt } }
 * }
 */
const APP_STORAGE_KEY = "osama-stock-app-v2";
const LEGACY_FORM_KEY = "osama-stock-form-v1";
const LEGACY_ORDER_KEY = "osama-order-log-v1";
const DEFAULT_SHEETS_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbyYzC7zYwIfaBkJrbeMIaMOx2VY8Dy084Wh6VzsFHnh-SdvMrtUWz9l9Lo5gY7Kfasj/exec";

/** @type {object|null} */
let appDataCache = null;

function emptyAppData() {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    v: 2,
    updatedAt: new Date().toISOString(),
    form: { date: today, values: {} },
    orders: { active: {}, closed: {} },
    reports: {},
    sheets: { webhookUrl: "" },
    deviceId: "",
  };
}

function normalizeAppData(raw) {
  const base = emptyAppData();
  if (!raw || typeof raw !== "object") return base;
  return {
    v: 2,
    updatedAt: raw.updatedAt || base.updatedAt,
    form: {
      date: raw.form?.date || base.form.date,
      values: raw.form?.values && typeof raw.form.values === "object" ? raw.form.values : {},
    },
    orders: {
      active: raw.orders?.active && typeof raw.orders.active === "object" ? raw.orders.active : {},
      closed: raw.orders?.closed && typeof raw.orders.closed === "object" ? raw.orders.closed : {},
    },
    reports: raw.reports && typeof raw.reports === "object" ? raw.reports : {},
    sheets: {
      webhookUrl: raw.sheets?.webhookUrl || "",
    },
    deviceId: raw.deviceId || "",
  };
}

function migrateLegacyData() {
  const formRaw = localStorage.getItem(LEGACY_FORM_KEY);
  const orderRaw = localStorage.getItem(LEGACY_ORDER_KEY);
  if (!formRaw && !orderRaw) return null;

  const data = emptyAppData();
  if (formRaw) {
    try {
      const form = JSON.parse(formRaw);
      data.form.date = form.date || data.form.date;
      data.form.values = form.values || {};
    } catch {
      /* noop */
    }
  }
  if (orderRaw) {
    try {
      const orders = JSON.parse(orderRaw);
      data.orders.active = orders.active || {};
      data.orders.closed = orders.closed || {};
    } catch {
      /* noop */
    }
  }
  return data;
}

function loadAppData() {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (raw) return normalizeAppData(JSON.parse(raw));
  } catch {
    /* noop */
  }
  const migrated = migrateLegacyData();
  if (migrated) {
    saveAppData(migrated);
    return migrated;
  }
  return emptyAppData();
}

function saveAppData(data) {
  data.updatedAt = new Date().toISOString();
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
}

function getAppData() {
  if (!appDataCache) appDataCache = loadAppData();
  return appDataCache;
}

function persistAppData() {
  saveAppData(getAppData());
}

function resetAppDataCache() {
  appDataCache = null;
}

function getOrderLogFromStore() {
  return getAppData().orders;
}

function saveOrderLogToStore(orders) {
  getAppData().orders = orders;
  persistAppData();
}

function saveFormToStore(dateISO, values) {
  const data = getAppData();
  data.form.date = dateISO;
  data.form.values = values;
  persistAppData();
}

function saveReportArchive(dateISO, text) {
  if (!dateISO || !text?.trim()) return;
  const data = getAppData();
  data.reports[dateISO] = {
    text: text.trim(),
    savedAt: new Date().toISOString(),
  };
  persistAppData();
}

function getDataStorageSummary() {
  const data = getAppData();
  const months = new Set([
    ...Object.keys(data.orders.active),
    ...Object.keys(data.orders.closed),
  ]);
  return {
    orderMonthCount: months.size,
    reportDayCount: Object.keys(data.reports).length,
    updatedAt: data.updatedAt,
  };
}

function formatStorageUpdatedAt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${h}:${min}`;
}

function downloadTextFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAppBackup() {
  const data = getAppData();
  const stamp = (data.form.date || todayISO()).replace(/-/g, "");
  downloadTextFile(
    `osama-stock-backup-${stamp}.json`,
    JSON.stringify(data, null, 2),
    "application/json;charset=utf-8"
  );
}

function importAppDataFromJson(parsed) {
  if (!parsed || parsed.v !== 2) {
    return { ok: false, reason: "invalid" };
  }
  appDataCache = normalizeAppData(parsed);
  persistAppData();
  return { ok: true };
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildMonthCsv(monthKey, data) {
  const rows = [["日付", "区分", "品目", "発注数", "単位"]];
  const sortedDays = Object.keys(data.days).sort();
  sortedDays.forEach((day) => {
    const snap = data.days[day];
    getOrderCatalog().forEach((item) => {
      const qty = snap[item.id] || 0;
      if (qty <= 0) return;
      rows.push([day, item.groupLabel, item.name, formatQty(qty), item.unit]);
    });
  });
  rows.push([]);
  rows.push(["月間合計", "", "", "", ""]);
  getOrderCatalog().forEach((item) => {
    const total = data.totals[item.id] || 0;
    if (total <= 0) return;
    rows.push(["", item.groupLabel, item.name, formatQty(total), item.unit]);
  });
  return `\uFEFF${rows.map((r) => r.map(csvEscape).join(",")).join("\n")}`;
}

function downloadMonthCsv(monthKey) {
  const data = getMonthData(monthKey);
  const content = buildMonthCsv(monthKey, data);
  downloadTextFile(`osama-order-${monthKey}.csv`, content, "text/csv;charset=utf-8");
}

function getDeviceId() {
  const data = getAppData();
  if (!data.deviceId) {
    data.deviceId = `d-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    persistAppData();
  }
  return data.deviceId;
}

function getSheetsWebhookUrl() {
  const saved = getAppData().sheets?.webhookUrl?.trim() || "";
  return saved || DEFAULT_SHEETS_WEBHOOK_URL;
}

function saveSheetsWebhookUrl(url) {
  const data = getAppData();
  data.sheets = { webhookUrl: String(url || "").trim() };
  persistAppData();
}

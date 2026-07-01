/**
 * アプリ統合データストア（localStorage: osama-stock-app-v2）
 *
 * {
 *   v: 2,
 *   updatedAt: ISO,
 *   form: { date, values },
 *   reports: { "YYYY-MM-DD": { text, savedAt } }
 * }
 */
const APP_STORAGE_KEY = "osama-stock-app-v2";
const LEGACY_FORM_KEY = "osama-stock-form-v1";
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
    reports: raw.reports && typeof raw.reports === "object" ? raw.reports : {},
    sheets: {
      webhookUrl: raw.sheets?.webhookUrl || "",
    },
    deviceId: raw.deviceId || "",
  };
}

function migrateLegacyData() {
  const formRaw = localStorage.getItem(LEGACY_FORM_KEY);
  if (!formRaw) return null;

  const data = emptyAppData();
  try {
    const form = JSON.parse(formRaw);
    data.form.date = form.date || data.form.date;
    data.form.values = form.values || {};
  } catch {
    /* noop */
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

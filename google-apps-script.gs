/**
 * 王様のスプーン｜在庫フォーム — Googleスプレッドシート受信スクリプト
 *
 * セットアップ（Safariで拡張機能→Apps Scriptが開けない場合）:
 * 1. スプレッドシート「王様一集計」を開き、URLの /d/ と /edit の間のIDをコピー
 * 2. Chromeで https://script.google.com/home を開く → 新しいプロジェクト
 * 3. 下の SPREADSHEET_ID にIDを貼り、このファイル全体を貼り付けて保存
 * 4. デプロイ → 新しいデプロイ → ウェブアプリ（自分／全員）
 * 5. /exec で終わるURLを在庫アプリに設定
 */

// 「王様一集計」のURL: …/d/【この部分】/edit
const SPREADSHEET_ID = "1HjGStBhSgALjn82BVCFnWDq86Vi6sn3ni-nimHLUJAw";

const SHEET_ORDERS = "発注記録";
const SHEET_REPORTS = "在庫レポート";

function getSpreadsheet_() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

function ensureSheets_(ss) {
  getOrCreateSheet_(ss, SHEET_ORDERS, [
    "送信日時",
    "報告日",
    "端末ID",
    "区分",
    "品目",
    "発注数",
    "単位",
  ]);
  getOrCreateSheet_(ss, SHEET_REPORTS, [
    "送信日時",
    "報告日",
    "端末ID",
    "レポート全文",
  ]);
}

function shortContentHash_(text) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    String(text || "").slice(0, 4000),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(bytes).slice(0, 16);
}

function isDuplicateDailyReport_(payload) {
  const cache = CacheService.getScriptCache();
  const requestId = String(payload.requestId || "");
  if (requestId && cache.get(`req:${requestId}`)) return true;

  const dedupKey = `dr:${payload.deviceId || ""}:${payload.reportDate || ""}:${shortContentHash_(payload.reportText)}`;
  if (cache.get(dedupKey)) return true;

  return false;
}

function markDailyReportSent_(payload) {
  const cache = CacheService.getScriptCache();
  const requestId = String(payload.requestId || "");
  const dedupKey = `dr:${payload.deviceId || ""}:${payload.reportDate || ""}:${shortContentHash_(payload.reportText)}`;
  if (requestId) cache.put(`req:${requestId}`, "1", 120);
  cache.put(dedupKey, "1", 60);
}

function writeDailyReport_(ss, payload) {
  const sentAt = payload.sentAt ? new Date(payload.sentAt) : new Date();
  const reportDate = payload.reportDate || "";
  const deviceId = payload.deviceId || "";

  const orderSheet = getOrCreateSheet_(ss, SHEET_ORDERS, [
    "送信日時",
    "報告日",
    "端末ID",
    "区分",
    "品目",
    "発注数",
    "単位",
  ]);

  (payload.orders || []).forEach((item) => {
    orderSheet.appendRow([
      sentAt,
      reportDate,
      deviceId,
      item.groupLabel || "",
      item.name || "",
      item.qty || 0,
      item.unit || "",
    ]);
  });

  if (payload.reportText) {
    const reportSheet = getOrCreateSheet_(ss, SHEET_REPORTS, [
      "送信日時",
      "報告日",
      "端末ID",
      "レポート全文",
    ]);
    reportSheet.appendRow([sentAt, reportDate, deviceId, payload.reportText]);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: "empty body" });
    }

    const payload = JSON.parse(e.postData.contents);

    if (payload.type !== "daily_report") {
      return jsonResponse({ ok: false, error: "unknown type" });
    }

    if (isDuplicateDailyReport_(payload)) {
      return jsonResponse({ ok: true, duplicate: true });
    }

    let ss;
    try {
      ss = getSpreadsheet_();
    } catch (err) {
      return jsonResponse({
        ok: false,
        error: "spreadsheet_open_failed",
        detail: String(err),
      });
    }

    ensureSheets_(ss);
    writeDailyReport_(ss, payload);
    markDailyReportSent_(payload);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("osama-stock sheet receiver ok");
}

/**
 * テストデータ削除用（Apps Scriptエディタで1回だけ実行）
 * 1. script.google.com でこのプロジェクトを開く
 * 2. 関数 clearAllTestData を選んで「実行」
 * 3. 発注記録・在庫レポート（および古い月締め・仕込み記録があれば）の2行目以降を削除
 */
function clearAllTestData() {
  const ss = getSpreadsheet_();
  ["発注記録", "在庫レポート", "月締め", "仕込み記録"].forEach((name) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  });
}

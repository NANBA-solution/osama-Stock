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
const SHEET_MONTHLY = "月締め";
const SHEET_PREP = "仕込み記録";

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
  getOrCreateSheet_(ss, SHEET_MONTHLY, [
    "送信日時",
    "対象月",
    "端末ID",
    "記録日数",
    "区分",
    "品目",
    "月間合計",
    "単位",
    "集計テキスト",
  ]);
  getOrCreateSheet_(ss, SHEET_PREP, [
    "送信日時",
    "報告日",
    "端末ID",
    "鍋種別",
    "仕込み回数",
    "単位",
  ]);
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

  const prepSheet = getOrCreateSheet_(ss, SHEET_PREP, [
    "送信日時",
    "報告日",
    "端末ID",
    "鍋種別",
    "仕込み回数",
    "単位",
  ]);
  (payload.preps || []).forEach((item) => {
    prepSheet.appendRow([
      sentAt,
      reportDate,
      deviceId,
      item.name || "",
      item.qty || 0,
      item.unit || "",
    ]);
  });
}

function writeMonthClose_(ss, payload) {
  const sentAt = payload.sentAt ? new Date(payload.sentAt) : new Date();
  const month = payload.month || "";
  const deviceId = payload.deviceId || "";
  const dayCount = payload.dayCount || 0;
  const summaryText = payload.summaryText || "";

  const sheet = getOrCreateSheet_(ss, SHEET_MONTHLY, [
    "送信日時",
    "対象月",
    "端末ID",
    "記録日数",
    "区分",
    "品目",
    "月間合計",
    "単位",
    "集計テキスト",
  ]);

  const totals = payload.totals || [];
  if (totals.length === 0) {
    sheet.appendRow([sentAt, month, deviceId, dayCount, "", "", "", "", summaryText]);
    return;
  }

  totals.forEach((item, index) => {
    sheet.appendRow([
      sentAt,
      month,
      deviceId,
      dayCount,
      item.groupLabel || "",
      item.name || "",
      item.qty || 0,
      item.unit || "",
      index === 0 ? summaryText : "",
    ]);
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = getSpreadsheet_();
    ensureSheets_(ss);

    if (payload.type === "daily_report") {
      writeDailyReport_(ss, payload);
    } else if (payload.type === "month_close") {
      writeMonthClose_(ss, payload);
    } else {
      return jsonResponse({ ok: false, error: "unknown type" });
    }

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

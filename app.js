/** フォーム定義 */
const INTEGER_STEP = 1;
const DECIMAL_STEP = 0.1;
const DECIMAL_PLACES = 1;

const FORM = {
  tane: [
    {
      id: "taneOsama",
      name: "王様",
      hasPlus: true,
      plusNote: "-700g",
      stockDefault: 0,
      plusDefault: 0,
    },
    { id: "onion", name: "オニオン", stockDefault: 0 },
    { id: "soup", name: "スープ", stockDefault: 0 },
    { id: "keema", name: "キーマ", stockDefault: 2 },
  ],
  ousama: [
    { id: "oonabe", label: "大鍋", unit: "", default: 0 },
    { id: "chunabe", label: "中鍋", unit: "", default: 0 },
    { id: "keemaNabe", label: "キーマ鍋", unit: "", default: 0 },
  ],
  cutStock: [
    { id: "cutChicken", label: "チキン", unit: "", default: 0 },
    { id: "cutSpicyChicken", label: "辛口チキン", unit: "", default: 0 },
    { id: "cutPorkLoin", label: "豚ヘレ", unit: "", default: 0 },
  ],
  soupSales: { id: "soupSales", label: "スープ売上", default: 2 },
  meat: [
    {
      id: "torimune",
      name: "鶏胸",
      constant: "定数 4",
      stockUnit: "",
      orderUnit: "",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "butaheru",
      name: "豚ヘレ",
      constant: "定数 4",
      stockUnit: "",
      orderUnit: "",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "gyuminchi",
      name: "牛ミンチ",
      constant: "定数 4",
      stockUnit: "",
      orderUnit: "",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "torigara",
      name: "鶏ガラ",
      constant: "定数 2",
      stockUnit: "",
      orderUnit: "",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "gyukoma",
      name: "牛コマ",
      constant: "定数 2",
      stockUnit: "",
      orderUnit: "",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "tebasamoto",
      name: "手羽元",
      constant: "定数 2",
      stockUnit: "",
      orderUnit: "",
      stockDefault: 0,
      orderDefault: 0,
    },
  ],
  soupIngredients: [
    { id: "siJagaimo", label: "ジャガイモ", default: 0 },
    { id: "siNinjin", label: "人参", default: 0 },
    { id: "siKabocha", label: "カボチャ", default: 0 },
    { id: "siTebba", label: "手羽", default: 0 },
    { id: "siSet", label: "セット", default: 0 },
  ],
  ingredients: [
    {
      id: "mukiTamanegi",
      name: "むき玉ねぎ（4P）",
      constant: "定数 3P＝12個",
      stockUnit: "P",
      orderUnit: "P",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "kabocha",
      name: "かぼちゃ",
      constant: "定数 1/2玉",
      stockUnit: "個",
      orderUnit: "個",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "ninjin",
      name: "にんじん",
      constant: "定数 6本",
      stockUnit: "本",
      orderUnit: "本",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "jagaimo",
      name: "じゃがいも",
      constant: "定数 20個",
      stockUnit: "個",
      orderUnit: "個",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "shoga",
      name: "しょうが",
      constant: "定数 2パック",
      stockUnit: "パック",
      orderUnit: "パック",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "mukiNinniku",
      name: "むきニンニク",
      constant: "定数 1/2パック",
      stockUnit: "パック",
      orderUnit: "パック",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "cabbage",
      name: "キャベツ",
      constant: "定数 1玉",
      stockUnit: "玉",
      orderUnit: "玉",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "ringo",
      name: "りんご",
      constant: "",
      stockUnit: "玉",
      orderUnit: "玉",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "celery",
      name: "セロリ",
      constant: "",
      stockUnit: "個",
      orderUnit: "個",
      stockDefault: 0,
      orderDefault: 0,
    },
    {
      id: "banana",
      name: "バナナ",
      constant: "",
      stockUnit: "個",
      orderUnit: "個",
      stockDefault: 0,
      orderDefault: 0,
    },
  ],
};

const STORAGE_KEY = "osama-stock-form-v1";
const DIVIDER = "━━━━━━━━━━━━━━━━";

/** @type {Record<string, number|string>} */
let state = {};

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateJP(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function roundVal(v) {
  const p = 10 ** DECIMAL_PLACES;
  return Math.round((Number(v) || 0) * p) / p;
}

/** 表示用（0 / 0.1 / 0.2 …） */
function formatQty(v) {
  const n = roundVal(v);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(DECIMAL_PLACES);
}

function num(id) {
  const v = state[id];
  return v === "" || v === undefined ? 0 : roundVal(v);
}

function qtyWithUnit(value, unit) {
  const u = unit ? ` ${unit}` : "";
  return `${formatQty(value)}${u}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = saved.values || {};
      const dateEl = document.getElementById("reportDate");
      if (dateEl && saved.date) dateEl.value = saved.date;
    }
  } catch {
  }
  applyDefaults();
}

function saveState() {
  const dateEl = document.getElementById("reportDate");
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      date: dateEl?.value || todayISO(),
      values: state,
    })
  );
}

function applyDefaults() {
  FORM.tane.forEach((item) => {
    if (!item.hasPlus && state[item.id] !== undefined && state[`${item.id}_stock`] === undefined) {
      state[`${item.id}_stock`] = state[item.id];
      delete state[item.id];
    }
    if (state[`${item.id}_stock`] === undefined) {
      state[`${item.id}_stock`] = item.stockDefault;
    }
    if (item.hasPlus && state[`${item.id}_plus`] === undefined) {
      state[`${item.id}_plus`] = item.plusDefault;
    }
  });
  FORM.ousama.forEach((f) => {
    if (state[f.id] === undefined) state[f.id] = f.default;
  });
  FORM.cutStock.forEach((f) => {
    if (state[f.id] === undefined) state[f.id] = f.default;
  });
  if (state.soupSales === undefined) state.soupSales = FORM.soupSales.default;
  FORM.soupIngredients.forEach((f) => {
    if (state[f.id] === undefined) state[f.id] = f.default;
  });
  FORM.meat.forEach((ing) => {
    if (state[`${ing.id}_stock`] === undefined) state[`${ing.id}_stock`] = ing.stockDefault;
    if (state[`${ing.id}_order`] === undefined) state[`${ing.id}_order`] = ing.orderDefault;
  });
  FORM.ingredients.forEach((ing) => {
    if (state[`${ing.id}_stock`] === undefined) state[`${ing.id}_stock`] = ing.stockDefault;
    if (state[`${ing.id}_order`] === undefined) state[`${ing.id}_order`] = ing.orderDefault;
  });
  if (!state.timing) state.timing = "";
}

function createStepper(id, { label, unit = "", step = INTEGER_STEP, min = 0, max = 999, small = "" }) {
  const wrap = document.createElement("div");
  wrap.className = "field-card";
  const labelEl = document.createElement("span");
  labelEl.className = "field-label";
  labelEl.textContent = unit ? `${label}（${unit}）` : label;
  if (small) {
    const sm = document.createElement("small");
    sm.textContent = small;
    labelEl.appendChild(document.createElement("br"));
    labelEl.appendChild(sm);
  }
  wrap.appendChild(labelEl);
  wrap.appendChild(buildStepperEl(id, { step, min, max }));
  return wrap;
}

function parseInputVal(str) {
  const v = parseFloat(String(str).replace(/,/g, "").trim());
  return Number.isNaN(v) ? null : v;
}

function buildStepperEl(id, { step = INTEGER_STEP, min = 0, max = 999 }) {
  const wrap = document.createElement("div");
  wrap.className = "stepper-wrap";

  const stepper = document.createElement("div");
  stepper.className = "stepper";

  const btnDec = document.createElement("button");
  btnDec.type = "button";
  btnDec.className = "stepper-btn";
  btnDec.setAttribute("aria-label", "1減らす");
  btnDec.textContent = "−";

  const inputWrap = document.createElement("div");
  inputWrap.className = "stepper-input-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";
  input.enterKeyHint = "done";
  input.className = "stepper-input";
  input.value = formatQty(num(id));
  input.setAttribute("aria-label", "数量");

  const btnInc = document.createElement("button");
  btnInc.type = "button";
  btnInc.className = "stepper-btn";
  btnInc.setAttribute("aria-label", "1増やす");
  btnInc.textContent = "＋";

  inputWrap.appendChild(input);
  stepper.appendChild(btnDec);
  stepper.appendChild(inputWrap);
  stepper.appendChild(btnInc);

  const tools = document.createElement("div");
  tools.className = "stepper-tools";

  const zeroBtn = document.createElement("button");
  zeroBtn.type = "button";
  zeroBtn.className = "tool-btn tool-zero";
  zeroBtn.textContent = "0";

  const btnDecTenth = document.createElement("button");
  btnDecTenth.type = "button";
  btnDecTenth.className = "tool-btn tool-decimal";
  btnDecTenth.textContent = "−0.1";

  const btnIncTenth = document.createElement("button");
  btnIncTenth.type = "button";
  btnIncTenth.className = "tool-btn tool-decimal";
  btnIncTenth.textContent = "＋0.1";

  tools.appendChild(zeroBtn);
  tools.appendChild(btnDecTenth);
  tools.appendChild(btnIncTenth);

  const syncZero = () => {
    zeroBtn.classList.toggle("active", num(id) === 0);
  };

  const apply = (v) => {
    setValue(id, roundVal(Math.min(max, Math.max(min, v))), input);
    syncZero();
  };

  const tap = (fn) => (e) => {
    e.preventDefault();
    fn();
  };

  zeroBtn.addEventListener("click", tap(() => apply(0)));
  btnDecTenth.addEventListener("click", tap(() => apply(num(id) - DECIMAL_STEP)));
  btnIncTenth.addEventListener("click", tap(() => apply(num(id) + DECIMAL_STEP)));
  btnDec.addEventListener("click", tap(() => apply(num(id) - step)));
  btnInc.addEventListener("click", tap(() => apply(num(id) + step)));

  const commitInput = () => {
    const parsed = parseInputVal(input.value);
    if (parsed === null) {
      input.value = formatQty(num(id));
      return;
    }
    apply(parsed);
  };

  input.addEventListener("blur", commitInput);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    }
  });
  input.addEventListener("focus", () => {
    requestAnimationFrame(() => input.select());
  });

  wrap.appendChild(stepper);
  wrap.appendChild(tools);
  syncZero();
  return wrap;
}


function setValue(id, value, inputEl) {
  const v = roundVal(value);
  state[id] = v;
  if (inputEl) inputEl.value = formatQty(v);
  saveState();
}

function renderForm() {
  const root = document.getElementById("formRoot");
  root.innerHTML = "";

  const sTane = section("タネ");
  FORM.tane.forEach((item) => sTane.appendChild(renderTaneItem(item)));
  root.appendChild(sTane);

  const s1 = section("王様ストック");
  const g1 = document.createElement("div");
  g1.className = "row-grid cols-2";
  FORM.ousama.forEach((f) => {
    g1.appendChild(createStepper(f.id, { label: f.label, unit: f.unit }));
  });
  s1.appendChild(g1);
  root.appendChild(s1);

  const sCut = section("カツストック");
  const gCut = document.createElement("div");
  gCut.className = "row-grid cols-2";
  FORM.cutStock.forEach((f) => {
    gCut.appendChild(createStepper(f.id, { label: f.label, unit: f.unit }));
  });
  sCut.appendChild(gCut);
  root.appendChild(sCut);

  const s2 = section("スープ");
  const s2grid = document.createElement("div");
  s2grid.className = "row-grid cols-2";
  const soupSalesCard = createStepper("soupSales", { label: FORM.soupSales.label });
  soupSalesCard.classList.add("field-card--full");
  s2grid.appendChild(soupSalesCard);
  s2.appendChild(s2grid);

  const s2b = document.createElement("div");
  s2b.className = "soup-ingredients-block";
  const t = document.createElement("p");
  t.className = "subsection-title";
  t.textContent = "スープ具材";
  s2b.appendChild(t);
  const g2 = document.createElement("div");
  g2.className = "row-grid cols-2";
  FORM.soupIngredients.forEach((f) => {
    g2.appendChild(createStepper(f.id, { label: f.label }));
  });
  s2b.appendChild(g2);
  s2.appendChild(s2b);
  root.appendChild(s2);

  const s3 = section("具材・在庫");
  const hint = document.createElement("p");
  hint.className = "step-hint";
  hint.textContent = "±は1ずつ｜0でリセット｜半分は±0.1";
  s3.appendChild(hint);
  FORM.ingredients.forEach((ing) => s3.appendChild(renderIngredient(ing)));
  root.appendChild(s3);

  const sMeat = section("お肉");
  FORM.meat.forEach((item) => sMeat.appendChild(renderIngredient(item)));
  root.appendChild(sMeat);

  const s4 = section("タイミー評価");
  s4.appendChild(renderTiming());
  root.appendChild(s4);
}

function section(title) {
  const el = document.createElement("section");
  el.className = "section";
  const h = document.createElement("p");
  h.className = "section-title";
  h.textContent = title;
  el.appendChild(h);
  return el;
}

function renderIngredient(ing) {
  const block = document.createElement("div");
  block.className = "ingredient-group";
  const title = document.createElement("p");
  title.className = "ingredient-title";
  title.innerHTML = `${ing.name}${
    ing.constant ? `<small>（${ing.constant}）</small>` : ""
  }`;
  block.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "row-grid cols-2";
  grid.appendChild(
    createStepper(`${ing.id}_stock`, { label: "在庫", unit: ing.stockUnit })
  );
  grid.appendChild(
    createStepper(`${ing.id}_order`, { label: "発注", unit: ing.orderUnit })
  );
  block.appendChild(grid);
  return block;
}

function renderTaneItem(item) {
  const block = document.createElement("div");
  block.className = "ingredient-group";
  const title = document.createElement("p");
  title.className = "ingredient-title";
  title.textContent = item.name;
  block.appendChild(title);

  const grid = document.createElement("div");
  grid.className = item.hasPlus ? "row-grid cols-2" : "row-grid";
  grid.appendChild(createStepper(`${item.id}_stock`, { label: "在庫" }));
  if (item.hasPlus) {
    grid.appendChild(
      createStepper(`${item.id}_plus`, {
        label: "＋",
        small: item.plusNote,
      })
    );
  }
  block.appendChild(grid);
  return block;
}

function updateTimingUI(group) {
  group.querySelectorAll(".timing-btn").forEach((btn) => {
    btn.classList.remove("selected-good", "selected-bad");
    const v = btn.dataset.value;
    if (state.timing === v) {
      btn.classList.add(v === "good" ? "selected-good" : "selected-bad");
    }
  });
}

function renderTiming() {
  const g = document.createElement("div");
  g.className = "timing-group";
  [
    { id: "good", label: "良い" },
    { id: "bad", label: "悪い" },
  ].forEach((o) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "timing-btn";
    btn.dataset.value = o.id;
    btn.textContent = o.label;
    btn.addEventListener("click", () => {
      state.timing = state.timing === o.id ? "" : o.id;
      saveState();
      updateTimingUI(g);
    });
    g.appendChild(btn);
  });
  updateTimingUI(g);
  return g;
}

function row(label, value, unit = "") {
  const pad = "　".repeat(Math.max(0, 4 - [...label].length));
  return `  ${label}${pad}：${qtyWithUnit(value, unit)}`;
}

function taneShareLines(item) {
  const stock = num(`${item.id}_stock`);
  const lines = [`【${item.name}】`];
  if (item.hasPlus) {
    const plus = num(`${item.id}_plus`);
    lines.push(
      `  在庫　${formatQty(stock)}　＋　${formatQty(plus)}（${item.plusNote}）`
    );
  } else {
    lines.push(`  在庫　${formatQty(stock)}`);
  }
  return lines;
}

function tanePreviewHtml(item) {
  const stock = num(`${item.id}_stock`);
  const value = item.hasPlus
    ? `在庫 ${formatQty(stock)} ＋ ${formatQty(num(`${item.id}_plus`))}（${item.plusNote}）`
    : `在庫 ${formatQty(stock)}`;
  return `
        <div class="preview-ingredient">
          <p class="preview-item-title">${escapeHtml(item.name)}</p>
          <p class="preview-tane-value">${escapeHtml(value)}</p>
        </div>`;
}

function buildShareText() {
  const dateEl = document.getElementById("reportDate");
  const dateStr = formatDateJP(dateEl?.value || todayISO());
  const lines = [];

  lines.push(`📅 ${dateStr}`);
  lines.push("王様のスプーン｜在庫レポート");
  lines.push(DIVIDER);
  lines.push("");
  lines.push("■ タネ");
  FORM.tane.forEach((item) => {
    lines.push("");
    lines.push(...taneShareLines(item));
  });
  lines.push("");
  lines.push("■ 王様ストック");
  FORM.ousama.forEach((f) => {
    lines.push(row(f.label, num(f.id), f.unit));
  });
  lines.push("");
  lines.push("■ カツストック");
  FORM.cutStock.forEach((f) => {
    lines.push(row(f.label, num(f.id), f.unit));
  });
  lines.push("");
  lines.push("■ スープ");
  lines.push(row(FORM.soupSales.label, num("soupSales")));
  lines.push("  ─ 具材 ─");
  FORM.soupIngredients.forEach((f) => {
    lines.push(row(f.label, num(f.id)));
  });
  lines.push("");
  lines.push("■ 具材・在庫");
  FORM.ingredients.forEach((ing) => {
    const stock = num(`${ing.id}_stock`);
    const order = num(`${ing.id}_order`);
    lines.push("");
    lines.push(`【${ing.name}】`);
    if (ing.constant) lines.push(`  ※ ${ing.constant}`);
    lines.push(
      `  在庫　${qtyWithUnit(stock, ing.stockUnit)}　｜　発注　${qtyWithUnit(order, ing.orderUnit)}`
    );
  });
  lines.push("");
  lines.push("■ お肉");
  FORM.meat.forEach((ing) => {
    const stock = num(`${ing.id}_stock`);
    const order = num(`${ing.id}_order`);
    lines.push("");
    lines.push(`【${ing.name}】`);
    if (ing.constant) lines.push(`  ※ ${ing.constant}`);
    lines.push(
      `  在庫　${qtyWithUnit(stock, ing.stockUnit)}　｜　発注　${qtyWithUnit(order, ing.orderUnit)}`
    );
  });
  lines.push("");
  lines.push(DIVIDER);
  const timingLabel =
    state.timing === "good" ? "◎ 良い" : state.timing === "bad" ? "△ 悪い" : "（未選択）";
  lines.push(`■ タイミー評価　${timingLabel}`);

  return lines.join("\n").trimEnd();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function previewRow(label, value, unit = "") {
  return `<div class="preview-row">
    <span class="preview-label">${escapeHtml(label)}</span>
    <span class="preview-value">${escapeHtml(qtyWithUnit(value, unit))}</span>
  </div>`;
}


function renderPreviewUI() {
  const el = document.getElementById("previewText");
  const dateEl = document.getElementById("reportDate");
  const dateStr = formatDateJP(dateEl?.value || todayISO());
  const timingLabel =
    state.timing === "good" ? "◎ 良い" : state.timing === "bad" ? "△ 悪い" : "（未選択）";

  el.innerHTML = `
    <div class="preview-head">
      <p class="preview-date">📅 ${escapeHtml(dateStr)}</p>
      <p class="preview-title">王様のスプーン｜在庫レポート</p>
    </div>
    <section class="preview-section">
      <h3>タネ</h3>
      ${FORM.tane.map((item) => tanePreviewHtml(item)).join("")}
    </section>
    <section class="preview-section">
      <h3>王様ストック</h3>
      ${FORM.ousama.map((f) => previewRow(f.label, num(f.id), f.unit)).join("")}
    </section>
    <section class="preview-section">
      <h3>カツストック</h3>
      ${FORM.cutStock.map((f) => previewRow(f.label, num(f.id), f.unit)).join("")}
    </section>
    <section class="preview-section">
      <h3>スープ</h3>
      ${previewRow(FORM.soupSales.label, num("soupSales"))}
      <p class="preview-sub">具材</p>
      ${FORM.soupIngredients.map((f) => previewRow(f.label, num(f.id))).join("")}
    </section>
    <section class="preview-section">
      <h3>具材・在庫</h3>
      ${FORM.ingredients
        .map((ing) => {
          const stock = num(`${ing.id}_stock`);
          const order = num(`${ing.id}_order`);
          return `
        <div class="preview-ingredient">
          <p class="preview-item-title">${escapeHtml(ing.name)}</p>
          ${ing.constant ? `<p class="preview-note">※ ${escapeHtml(ing.constant)}</p>` : ""}
          <div class="preview-stock-row">
            <span>在庫 <strong>${escapeHtml(qtyWithUnit(stock, ing.stockUnit))}</strong></span>
            <span class="preview-sep">｜</span>
            <span>発注 <strong>${escapeHtml(qtyWithUnit(order, ing.orderUnit))}</strong></span>
          </div>
        </div>`;
        })
        .join("")}
    </section>
    <section class="preview-section">
      <h3>お肉</h3>
      ${FORM.meat
        .map((ing) => {
          const stock = num(`${ing.id}_stock`);
          const order = num(`${ing.id}_order`);
          return `
        <div class="preview-ingredient">
          <p class="preview-item-title">${escapeHtml(ing.name)}</p>
          ${ing.constant ? `<p class="preview-note">※ ${escapeHtml(ing.constant)}</p>` : ""}
          <div class="preview-stock-row">
            <span>在庫 <strong>${escapeHtml(qtyWithUnit(stock, ing.stockUnit))}</strong></span>
            <span class="preview-sep">｜</span>
            <span>発注 <strong>${escapeHtml(qtyWithUnit(order, ing.orderUnit))}</strong></span>
          </div>
        </div>`;
        })
        .join("")}
    </section>
    <section class="preview-section preview-timing">
      <h3>タイミー評価</h3>
      <p class="preview-timing-value">${escapeHtml(timingLabel)}</p>
    </section>
  `;
  el.dataset.plain = buildShareText();
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function showToast(message = "コピーしました！") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

function shareToLine(text) {
  const url = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
  window.location.href = url;
}

function openDialog(dlg) {
  renderPreviewUI();
  if (typeof dlg.showModal === "function") {
    try {
      dlg.showModal();
      return;
    } catch {
      /* iOS 等 */
    }
  }
  dlg.setAttribute("open", "");
}

function closeDialog(dlg) {
  if (typeof dlg.close === "function") {
    try {
      dlg.close();
      return;
    } catch {
      /* noop */
    }
  }
  dlg.removeAttribute("open");
}

function init() {
  const dateEl = document.getElementById("reportDate");
  if (!dateEl.value) dateEl.value = todayISO();
  dateEl.addEventListener("change", saveState);

  loadState();
  renderForm();

  const previewDialog = document.getElementById("previewDialog");
  const getText = () =>
    document.getElementById("previewText").dataset.plain || buildShareText();

  document.getElementById("copyBtn").addEventListener("click", async () => {
    const text = buildShareText();
    try {
      await copyToClipboard(text);
      showToast();
      if (navigator.vibrate) navigator.vibrate(30);
    } catch {
      alert("コピーに失敗しました。プレビューから手動でコピーしてください。");
    }
  });

  document.getElementById("lineShareBtn").addEventListener("click", () => {
    shareToLine(buildShareText());
    if (navigator.vibrate) navigator.vibrate(30);
  });

  document.getElementById("previewBtn").addEventListener("click", () => {
    openDialog(previewDialog);
  });

  document.getElementById("closePreview").addEventListener("click", () => {
    closeDialog(previewDialog);
  });

  document.getElementById("copyFromPreview").addEventListener("click", async () => {
    try {
      await copyToClipboard(getText());
      showToast();
      closeDialog(previewDialog);
    } catch {
      alert("コピーに失敗しました");
    }
  });

  document.getElementById("lineShareFromPreview").addEventListener("click", () => {
    shareToLine(getText());
    closeDialog(previewDialog);
    if (navigator.vibrate) navigator.vibrate(30);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// =====================================================
// AUDIO CONVERTER PAGE
// A dedicated spreadsheet-style page for turning a
// column of words/phrases into individually named,
// downloadable audio files using the browser's TTS voice.
// =====================================================

let isReading = false;
let voices = [];
const TOTAL_COLS = 26;
let totalRows = 26;
const sheetTable = document.getElementById("sheet");

// -----------------------------------------------------
// BUILD TABLE  (row 0 = column letters, row 1 = language
// select per column, row 2+ = data — same layout as the
// main sheet page)
// -----------------------------------------------------
const staticCells = Array(TOTAL_COLS).fill('<td contenteditable="true"></td>').join("");

function buildTable() {
  let headerHtml = "<tr><th></th>";
  for (let c = 0; c < TOTAL_COLS; c++) headerHtml += `<th>${String.fromCharCode(65 + c)}</th>`;
  headerHtml += "</tr>";

  let selRow = "<tr><th></th>";
  for (let c = 0; c < TOTAL_COLS; c++) {
    selRow += `<th><select class="col-select"><option>Off</option></select></th>`;
  }
  selRow += "</tr>";

  let bodyHtml = "";
  for (let r = 1; r <= totalRows; r++) {
    bodyHtml += `<tr><th class="row-head">${r}</th>${staticCells}</tr>`;
  }

  sheetTable.innerHTML = headerHtml + selRow + bodyHtml;
}
buildTable();

function addNewRows(count) {
  if (count <= 0) return;
  let buf = "";
  for (let i = 0; i < count; i++) {
    totalRows++;
    buf += `<tr><th class="row-head">${totalRows}</th>${staticCells}</tr>`;
  }
  sheetTable.insertAdjacentHTML("beforeend", buf);
}

// Row layout: row[0]=letters, row[1]=language selects, row[2..]=data.
// rowNum is 1-based (row "1" on screen -> table.rows[2]).
function getDataRow(rowNum) {
  return sheetTable.rows[rowNum + 1];
}
function getCellByCoords(rowNum, col) {
  const row = getDataRow(rowNum);
  if (!row) return null;
  return row.cells[col + 1]; // +1 for the row-number header cell
}
function getColumnLanguage(col) {
  const select = sheetTable.rows[1]?.cells[col + 1]?.querySelector("select");
  return select?.value || "Off";
}

// -----------------------------------------------------
// CELL REFERENCE PARSING  ("A1" -> {col:0, row:1})
// -----------------------------------------------------
function colToIndex(letters) {
  let n = 0;
  for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
  return n - 1;
}
function parseCell(ref) {
  if (!ref) return null;
  const match = ref.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return { col: colToIndex(match[1]), row: parseInt(match[2], 10) };
}

// -----------------------------------------------------
// VOICES / LANGUAGES  (mirrors the main page's logic so
// each column's dropdown lists every language your
// browser actually has a voice for)
// -----------------------------------------------------
function normalizeLang(code) {
  return code?.trim().replace("_", "-").toLowerCase();
}

function getBrowserLanguages() {
  const unique = new Map();
  voices.forEach(v => {
    if (!v.lang) return;
    const key = normalizeLang(v.lang);
    if (!unique.has(key)) unique.set(key, v.lang);
  });
  return [...unique.values()].sort((a, b) => a.localeCompare(b));
}

function getLanguageLabel(lang) {
  try {
    const parts = lang.split("-");
    const languageNames = new Intl.DisplayNames([navigator.language || "en"], { type: "language" });
    const regionNames = new Intl.DisplayNames([navigator.language || "en"], { type: "region" });
    const languageName = languageNames.of(parts[0]) || parts[0];
    const regionName = parts[1] ? regionNames.of(parts[1]) : "";
    return regionName ? `${languageName} (${regionName}) — ${lang}` : `${languageName} — ${lang}`;
  } catch {
    return lang;
  }
}

function getVoice(langCode) {
  if (!langCode || langCode === "Off") return null;
  const wanted = normalizeLang(langCode);
  let voice = voices.find(v => normalizeLang(v.lang) === wanted);
  if (voice) return voice;
  const base = wanted.split("-")[0];
  return voices.find(v => normalizeLang(v.lang).split("-")[0] === base) || null;
}

function updateLanguageDropdowns() {
  const selectorRow = sheetTable.rows[1];
  if (!selectorRow) return;
  const langs = getBrowserLanguages();
  if (!langs.length) return;

  for (let c = 1; c < selectorRow.cells.length; c++) {
    const select = selectorRow.cells[c]?.querySelector("select");
    if (!select) continue;
    const currentValue = select.value || "Off";

    select.innerHTML = "";
    const offOption = document.createElement("option");
    offOption.value = "Off";
    offOption.textContent = "Off";
    select.appendChild(offOption);

    langs.forEach(lang => {
      const option = document.createElement("option");
      option.value = lang;
      option.textContent = getLanguageLabel(lang);
      select.appendChild(option);
    });

    if (currentValue === "Off") { select.value = "Off"; continue; }
    const normalizedCurrent = normalizeLang(currentValue);
    const base = normalizedCurrent?.split("-")[0];
    const exact = langs.find(l => normalizeLang(l) === normalizedCurrent);
    const baseMatch = langs.find(l => normalizeLang(l).split("-")[0] === base);
    select.value = exact || baseMatch || "Off";
  }
}

function loadVoices() {
  voices = speechSynthesis.getVoices() || [];
  updateLanguageDropdowns();
}
if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
  setTimeout(loadVoices, 250);
  setTimeout(loadVoices, 1000);
}

// -----------------------------------------------------
// SPEAK ONE CELL — uses that cell's column language
// -----------------------------------------------------
function speak(text, lang, rate) {
  return new Promise(resolve => {
    if (!text || !text.trim()) return resolve();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = getVoice(lang);
    if (voice) { utter.voice = voice; utter.lang = voice.lang; }
    else if (lang && lang !== "Off") { utter.lang = lang; }
    utter.rate = rate || 1;
    utter.onend = resolve;
    utter.onerror = resolve;
    speechSynthesis.speak(utter);
  });
}

function clearHighlight() {
  document.querySelectorAll(".reading").forEach(c => c.classList.remove("reading"));
}

function stopReading() {
  isReading = false;
  speechSynthesis.cancel();
  clearHighlight();
}

async function startReading() {
  if (isReading) return;
  isReading = true;

  const rate = parseFloat(document.getElementById("audioRate")?.value || "0.85");
  const start = parseCell(document.getElementById("startCell")?.value) || { row: 1, col: 0 };
  const end = parseCell(document.getElementById("endCell")?.value) || { row: totalRows, col: start.col };
  const reverse = document.getElementById("reverse")?.checked;

  let rowRange = [];
  for (let r = start.row; r <= end.row; r++) rowRange.push(r);
  if (reverse) rowRange.reverse();

  try {
    for (const r of rowRange) {
      if (!isReading) return;
      const cell = getCellByCoords(r, start.col);
      if (!cell) continue;
      const text = cell.innerText.trim();
      if (!text) continue;

      const lang = getColumnLanguage(start.col);
      if (lang === "Off") continue;

      cell.classList.add("reading");
      await speak(text, lang, rate);
      cell.classList.remove("reading");
    }
  } finally {
    isReading = false;
    clearHighlight();
  }
}

// -----------------------------------------------------
// UPLOAD COLUMN (paste a vocab list straight into cells)
// -----------------------------------------------------
window.uploadColumn = function () {
  const rawText = document.getElementById("columnData")?.value?.trim();
  if (!rawText) { alert("Please paste some text."); return; }

  const startInput = document.getElementById("startCellUpload")?.value?.trim().toUpperCase() || "A1";
  const start = parseCell(startInput);
  if (!start) { alert("Invalid cell format. Use A1, B5, C12, etc."); return; }

  const direction = document.getElementById("uploadDirection")?.value || "down";
  const lines = rawText.split(/\r?\n/).filter(x => x.trim() !== "");
  if (!lines.length) return;

  const neededRows = direction === "down" ? (start.row - 1) + lines.length : start.row;
  if (neededRows > totalRows) addNewRows(neededRows - totalRows);

  for (let i = 0; i < lines.length; i++) {
    const r = direction === "down" ? start.row + i : start.row;
    const c = direction === "down" ? start.col : start.col + i;
    const cell = getCellByCoords(r, c);
    if (cell) cell.innerText = lines[i].trim();
  }

  alert(`Uploaded ${lines.length} item${lines.length > 1 ? "s" : ""}.`);
};

// -----------------------------------------------------
// SAVE / LOAD TABLE (plain text grid + column languages, JSON)
// -----------------------------------------------------
window.saveTable = function () {
  const data = [];
  for (let r = 1; r <= totalRows; r++) {
    const rowVals = [];
    for (let c = 0; c < TOTAL_COLS; c++) rowVals.push(getCellByCoords(r, c)?.innerText || "");
    data.push(rowVals);
  }
  const langs = [];
  for (let c = 0; c < TOTAL_COLS; c++) langs.push(getColumnLanguage(c));

  const blob = new Blob([JSON.stringify({ data, langs })], { type: "application/json" });
  downloadBlob(blob, "audio-converter-table.json");
};

window.uploadTable = function () {
  document.getElementById("tableFileInput").click();
};
document.getElementById("tableFileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const parsed = JSON.parse(reader.result);
      const data = parsed.data || parsed; // support old flat-array saves too
      if (data.length > totalRows) addNewRows(data.length - totalRows);
      data.forEach((rowVals, i) => {
        rowVals.forEach((val, c) => {
          const cell = getCellByCoords(i + 1, c);
          if (cell) cell.innerText = val;
        });
      });
      if (parsed.langs) {
        parsed.langs.forEach((lang, c) => {
          const select = sheetTable.rows[1]?.cells[c + 1]?.querySelector("select");
          if (select && [...select.options].some(o => o.value === lang)) select.value = lang;
        });
      }
    } catch (err) {
      alert("Couldn't read that file — expected a JSON table saved from this page.");
    }
  };
  reader.readAsText(file);
  this.value = "";
});

// -----------------------------------------------------
// TOGGLES
// -----------------------------------------------------
window.toggleUpload = function () {
  const box = document.getElementById("uploadBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
};
window.toggleReader = function () {
  const bar = document.getElementById("toolbar");
  bar.style.display = bar.style.display === "flex" ? "none" : "flex";
};
window.toggleConversion = function () {
  const box = document.getElementById("conversionBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
};

// -----------------------------------------------------
// FILENAME + DOWNLOAD HELPERS
// -----------------------------------------------------
function sanitizeFilename(text, fallback) {
  const name = (text || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
  return name || fallback;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -----------------------------------------------------
// MAIN CONVERSION ENGINE
// One cell at a time: highlight -> speak+record -> stop
// recording -> save the file into the output column ->
// move to the next row down. Language/voice for each row
// comes from the SOURCE column's language dropdown.
// -----------------------------------------------------
async function startAudioConversion() {

  const startCell = document.getElementById("audioStartCell").value.trim().toUpperCase();
  const endCell = document.getElementById("audioEndCell").value.trim().toUpperCase();
  const outputColumn = document.getElementById("audioOutputColumn").value.trim().toUpperCase();
  const autoDownload = document.getElementById("audioAutoDownload")?.checked ?? true;
  const rate = parseFloat(document.getElementById("audioRate")?.value || "0.85");

  const start = parseCell(startCell);
  const end = parseCell(endCell);

  if (!start || !end || !outputColumn || !/^[A-Z]+$/.test(outputColumn)) {
    alert("Please fill in a valid start cell, end cell, and output column letter (e.g. B).");
    return;
  }

  const outCol = colToIndex(outputColumn);
  const sourceLang = getColumnLanguage(start.col);

  const progressContainer = document.getElementById("audioProgressContainer");
  const progressBar = document.getElementById("audioProgressBar");
  const progressText = document.getElementById("audioProgressText");

  alert('Choose "This Tab" and make sure "Share tab audio" is checked — that\'s what lets the converter record what the browser speaks.');

  let displayStream;
  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  } catch (err) {
    alert("Audio capture was cancelled or denied, so conversion can't continue.");
    return;
  }

  const audioTracks = displayStream.getAudioTracks();
  if (!audioTracks.length) {
    alert('No audio track was shared. Re-run and make sure "Share tab audio" is checked in the picker.');
    displayStream.getTracks().forEach(t => t.stop());
    return;
  }

  // Record from an audio-only stream. Mixing an audio-only
  // MediaRecorder mimeType with a stream that also carries a
  // video track is what triggers "Failed to execute 'start'"
  // in Chrome/Edge, so we split the audio track off here and
  // stop the (unused) video track immediately.
  displayStream.getVideoTracks().forEach(t => t.stop());
  const audioStream = new MediaStream(audioTracks);

  const mimeType =
    (window.MediaRecorder && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) ? "audio/webm;codecs=opus" :
    (window.MediaRecorder && MediaRecorder.isTypeSupported("audio/webm")) ? "audio/webm" :
    ""; // let the browser pick if neither is reported supported

  progressContainer.style.display = "block";
  progressText.style.display = "block";

  const totalCells = (end.row - start.row) + 1;
  let completed = 0;
  const usedNames = new Set();

  for (let r = start.row; r <= end.row; r++) {

    const sourceCell = getCellByCoords(r, start.col);
    if (!sourceCell) continue;

    const text = sourceCell.innerText.trim();
    if (!text) continue;

    sourceCell.classList.add("reading");
    progressText.innerText = `Recording ${completed + 1} / ${totalCells}: "${text}"`;
    progressBar.style.width = ((completed / totalCells) * 100) + "%";

    try {
      const blob = await recordOneCell(text, sourceLang, rate, audioStream, mimeType);

      const targetCell = getCellByCoords(r, outCol);
      if (targetCell) {
        let baseName = sanitizeFilename(text, `cell_r${r}`);
        let filename = baseName;
        let n = 2;
        while (usedNames.has(filename)) { filename = `${baseName}_${n}`; n++; }
        usedNames.add(filename);
        filename += ".webm";

        placeAudioInCell(targetCell, blob, filename);
        if (autoDownload) downloadBlob(blob, filename);
      }
    } catch (err) {
      console.error("Recording failed for cell", r, err);
      progressText.innerText = `Skipped row ${r} (recording error) — continuing...`;
    }

    sourceCell.classList.remove("reading");
    completed++;
    progressBar.style.width = ((completed / totalCells) * 100) + "%";

    // Brief pause so the previous MediaRecorder instance is
    // fully released before the next one is created.
    await wait(150);
  }

  progressText.innerText = `Finished ${completed} cells`;
  displayStream.getTracks().forEach(t => t.stop());
  alert(`Audio conversion complete — ${completed} file${completed === 1 ? "" : "s"} created${autoDownload ? " and downloaded" : ""}.`);
}

// Records exactly one utterance from the shared audio-only
// stream and resolves with the resulting Blob.
function recordOneCell(text, lang, rate, audioStream, mimeType) {
  return new Promise((resolve, reject) => {
    let recorder;
    try {
      recorder = mimeType ? new MediaRecorder(audioStream, { mimeType }) : new MediaRecorder(audioStream);
    } catch (err) {
      reject(err);
      return;
    }

    const chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    recorder.onerror = e => reject(e.error || e);
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));

    try {
      recorder.start();
    } catch (err) {
      reject(err);
      return;
    }

    // Small lead-in so the recorder is definitely rolling
    // before speech starts, then speak the cell.
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = getVoice(lang);
      if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
      else if (lang && lang !== "Off") { utterance.lang = lang; }
      utterance.rate = rate;

      const finish = () => setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 300);

      utterance.onend = finish;
      utterance.onerror = finish;
      speechSynthesis.speak(utterance);
    }, 200);
  });
}

function placeAudioInCell(targetCell, blob, filename) {
  const url = URL.createObjectURL(blob);
  targetCell.innerHTML = "";
  targetCell.dataset.audio = url;
  targetCell.dataset.filename = filename;
  targetCell.classList.add("audio-ready");

  const playIcon = document.createElement("span");
  playIcon.textContent = "🎵";
  playIcon.className = "audio-icon";
  playIcon.title = "Play";
  playIcon.onclick = ev => {
    ev.stopPropagation();
    new Audio(targetCell.dataset.audio).play();
  };

  const dlIcon = document.createElement("span");
  dlIcon.textContent = "⬇";
  dlIcon.className = "audio-icon";
  dlIcon.title = "Download " + filename;
  dlIcon.onclick = ev => {
    ev.stopPropagation();
    fetch(targetCell.dataset.audio)
      .then(res => res.blob())
      .then(b => downloadBlob(b, targetCell.dataset.filename));
  };

  targetCell.appendChild(playIcon);
  targetCell.appendChild(dlIcon);
  targetCell.appendChild(document.createTextNode(" " + filename));
}

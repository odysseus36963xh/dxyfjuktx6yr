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
// BUILD TABLE
// -----------------------------------------------------
const staticCells = Array(TOTAL_COLS).fill('<td contenteditable="true"></td>').join("");

function buildTable() {
  let headerHtml = "<tr><th></th>";
  for (let c = 0; c < TOTAL_COLS; c++) headerHtml += `<th>${String.fromCharCode(65 + c)}</th>`;
  headerHtml += "</tr>";

  let bodyHtml = "";
  for (let r = 1; r <= totalRows; r++) {
    bodyHtml += `<tr><th class="row-head">${r}</th>${staticCells}</tr>`;
  }

  sheetTable.innerHTML = headerHtml + bodyHtml;
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

// Row layout: row[0] = column letters, row[1..] = data (row N -> table.rows[N])
function getDataRow(rowNum) {
  return sheetTable.rows[rowNum]; // rowNum is 1-based, header is row 0
}
function getCellByCoords(rowNum, col) {
  const row = getDataRow(rowNum);
  if (!row) return null;
  return row.cells[col + 1]; // +1 for the row-number header cell
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
// VOICES / LANGUAGES
// -----------------------------------------------------
function loadVoices() {
  voices = speechSynthesis.getVoices() || [];
  const select = document.getElementById("audioVoice");
  if (!select) return;
  const current = select.value;
  select.innerHTML = "";
  voices.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    select.appendChild(opt);
  });
  if (current && voices.some(v => v.name === current)) select.value = current;
}
if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
  setTimeout(loadVoices, 250);
  setTimeout(loadVoices, 1000);
}

function getSelectedVoice() {
  const name = document.getElementById("audioVoice")?.value;
  return voices.find(v => v.name === name) || null;
}

// -----------------------------------------------------
// SPEAK ONE CELL (used by preview reading)
// -----------------------------------------------------
function speak(text, rate) {
  return new Promise(resolve => {
    if (!text || !text.trim()) return resolve();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = getSelectedVoice();
    if (voice) { utter.voice = voice; utter.lang = voice.lang; }
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

      cell.classList.add("reading");
      await speak(text, rate);
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
// SAVE / LOAD TABLE (plain text grid, JSON)
// -----------------------------------------------------
window.saveTable = function () {
  const data = [];
  for (let r = 1; r <= totalRows; r++) {
    const rowVals = [];
    for (let c = 0; c < TOTAL_COLS; c++) {
      rowVals.push(getCellByCoords(r, c)?.innerText || "");
    }
    data.push(rowVals);
  }
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
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
      const data = JSON.parse(reader.result);
      if (data.length > totalRows) addNewRows(data.length - totalRows);
      data.forEach((rowVals, i) => {
        rowVals.forEach((val, c) => {
          const cell = getCellByCoords(i + 1, c);
          if (cell) cell.innerText = val;
        });
      });
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

// -----------------------------------------------------
// MAIN CONVERSION ENGINE
// Reads each cell in the source range aloud, records the
// audio, names the file after the cell's text, and drops
// a playable / downloadable result into the output column.
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

  const progressContainer = document.getElementById("audioProgressContainer");
  const progressBar = document.getElementById("audioProgressBar");
  const progressText = document.getElementById("audioProgressText");

  alert('Choose "This Tab" and make sure "Share tab audio" is checked — that\'s what lets the converter record what the browser speaks.');

  let captureStream;
  try {
    captureStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  } catch (err) {
    alert("Audio capture was cancelled or denied, so conversion can't continue.");
    return;
  }

  if (!captureStream.getAudioTracks().length) {
    alert('No audio track was shared. Re-run and make sure "Share tab audio" is checked in the picker.');
    captureStream.getTracks().forEach(t => t.stop());
    return;
  }

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

    const chunks = [];
    const recorder = new MediaRecorder(captureStream, { mimeType: "audio/webm" });
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    await new Promise(resolve => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      const voice = getSelectedVoice();
      if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);

        const targetCell = getCellByCoords(r, outCol);
        if (targetCell) {
          let baseName = sanitizeFilename(text, `cell_r${r}`);
          let filename = baseName;
          let n = 2;
          while (usedNames.has(filename)) {
            filename = `${baseName}_${n}`;
            n++;
          }
          usedNames.add(filename);
          filename += ".webm";

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

          if (autoDownload) downloadBlob(blob, filename);
        }
        resolve();
      };

      recorder.start();
      // small lead-in so the recorder is definitely rolling before speech starts
      setTimeout(() => speechSynthesis.speak(utterance), 200);

      utterance.onend = () => setTimeout(() => recorder.stop(), 300);
      utterance.onerror = () => setTimeout(() => recorder.stop(), 300);
    });

    sourceCell.classList.remove("reading");
    completed++;
    progressBar.style.width = ((completed / totalCells) * 100) + "%";
  }

  progressText.innerText = `Finished ${completed} cells`;
  captureStream.getTracks().forEach(t => t.stop());
  alert(`Audio conversion complete — ${completed} file${completed === 1 ? "" : "s"} created${autoDownload ? " and downloaded" : ""}.`);
}

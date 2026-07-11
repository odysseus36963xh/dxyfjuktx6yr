// ===============================
// GLOBAL STATE
// ===============================
let isReading = false;
let voices = [];



/* =========================================================
   PRACTICE HEATMAP — JAVASCRIPT
   =========================================================
   Production-ready. No external dependencies.
   ========================================================= */

(function () {
    "use strict";

    /* ---------------------------------------------------------
       Color stops for the heatmap.
       Each stop = { count, rgb:[r,g,b] }.
       Values between stops are linearly interpolated.
       --------------------------------------------------------- */
    var HEATMAP_STOPS = [
        { count: 0,   rgb: [255, 255, 255] }, // #ffffff
        { count: 1,   rgb: [255, 230, 238] }, // #ffe6ee
        { count: 10,  rgb: [255, 179, 204] }, // #ffb3cc
        { count: 25,  rgb: [255, 204, 128] }, // #ffcc80
        { count: 50,  rgb: [255, 241, 118] }, // #fff176
        { count: 75,  rgb: [165, 214, 167] }, // #a5d6a7
        { count: 100, rgb: [76, 175, 80]   }  // #4caf50
    ];

    /* ---------------------------------------------------------
       Internal: linear interpolation between two numbers.
       --------------------------------------------------------- */
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /* ---------------------------------------------------------
       Internal: convert a listen count into an interpolated
       rgb() CSS color string using HEATMAP_STOPS.
       --------------------------------------------------------- */
    function getHeatmapColor(count) {
        if (!isFinite(count) || count <= 0) {
            return "rgb(255, 255, 255)";
        }

        // Clamp to the maximum defined stop.
        var lastStop = HEATMAP_STOPS[HEATMAP_STOPS.length - 1];
        if (count >= lastStop.count) {
            return "rgb(" + lastStop.rgb[0] + ", " +
                            lastStop.rgb[1] + ", " +
                            lastStop.rgb[2] + ")";
        }

        // Find the two stops the count falls between.
        for (var i = 0; i < HEATMAP_STOPS.length - 1; i++) {
            var lower = HEATMAP_STOPS[i];
            var upper = HEATMAP_STOPS[i + 1];

            if (count >= lower.count && count <= upper.count) {
                var range = upper.count - lower.count;
                var t = range === 0 ? 0 : (count - lower.count) / range;

                var r = Math.round(lerp(lower.rgb[0], upper.rgb[0], t));
                var g = Math.round(lerp(lower.rgb[1], upper.rgb[1], t));
                var b = Math.round(lerp(lower.rgb[2], upper.rgb[2], t));

                return "rgb(" + r + ", " + g + ", " + b + ")";
            }
        }

        // Fallback (should not be reached).
        return "rgb(255, 255, 255)";
    }

    /* ---------------------------------------------------------
       Internal: determine the practice-level CSS class
       for a given listen count.
       --------------------------------------------------------- */
    function getPracticeClass(count) {
        if (count >= 100) return "practice-mastered";
        if (count >= 50)  return "practice-high";
        if (count >= 10)  return "practice-medium";
        if (count >= 1)   return "practice-low";
        return null; // 0 listens => no practice class
    }

    var PRACTICE_CLASSES = [
        "practice-low",
        "practice-medium",
        "practice-high",
        "practice-mastered"
    ];

    /* ---------------------------------------------------------
       Internal: read a cell's current listen count safely.
       --------------------------------------------------------- */
    function readCount(cell) {
        var raw = cell.dataset.listenCount;
        var n = parseInt(raw, 10);
        return isFinite(n) && n > 0 ? n : 0;
    }

    /* =========================================================
       PUBLIC: updateCellPracticeColor(cell)
       Applies the interpolated heatmap background color and
       the correct practice-level class. Touches only this cell.
       ========================================================= */
    function updateCellPracticeColor(cell) {
        if (!cell) return;

        var count = readCount(cell);

        // Apply interpolated background color directly.
        cell.style.backgroundColor = getHeatmapColor(count);

        // Update practice-level class (remove old, add new).
        var targetClass = getPracticeClass(count);
        for (var i = 0; i < PRACTICE_CLASSES.length; i++) {
            if (PRACTICE_CLASSES[i] !== targetClass) {
                cell.classList.remove(PRACTICE_CLASSES[i]);
            }
        }
        if (targetClass) {
            cell.classList.add(targetClass);
        }

        // Ensure the cell can anchor a badge without layout shift.
        if (!cell.classList.contains("practice-cell")) {
            cell.classList.add("practice-cell");
        }
    }

    /* =========================================================
       PUBLIC: updateCellPracticeBadge(cell)
       Creates/updates/hides the upper-right corner badge.
       Reuses the existing badge node to avoid DOM churn.
       ========================================================= */

   
    function updateCellPracticeBadge(cell) {
    return;
}



   
    /* =========================================================
       PUBLIC: incrementCellListenCount(cell)
       Increments the cell's listen count by 1 and updates ONLY
       that cell's color + badge. Call this AFTER successful
       completion of TTS or audio playback.
       ========================================================= */
    function incrementCellListenCount(cell) {
        if (!cell) return;

        var count = readCount(cell);
        count += 1;
        cell.dataset.listenCount = String(count);

        // Update only the affected cell — no full-table scan.
        updateCellPracticeColor(cell);
        updateCellPracticeBadge(cell);
    }

    /* =========================================================
       PUBLIC: exportPracticeData()
       Returns a plain object mapping cell-id -> listenCount.
       Include the returned object in your existing JSON export.

       NOTE: Each cell must have a stable identifier so counts
       can be restored. We use cell.dataset.cellId. If your cells
       already have an id, set CELL_ID_ATTR accordingly below.
       ========================================================= */

    // Adjust this if your cells identify themselves differently.
    var CELL_SELECTOR = ".practice-cell, [data-cell-id]";
    var CELL_ID_ATTR = "cellId"; // => cell.dataset.cellId

    function getCellId(cell) {
        return cell.dataset[CELL_ID_ATTR] || cell.id || null;
    }

    function exportPracticeData() {
        var data = {};
        var cells = document.querySelectorAll(CELL_SELECTOR);

        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            var count = readCount(cell);
            if (count > 0) {
                var id = getCellId(cell);
                if (id) {
                    data[id] = count;
                }
            }
        }
        return data;
    }

    /* =========================================================
       PUBLIC: restorePracticeData(data)
       Accepts the object produced by exportPracticeData() and
       restores counts, then rebuilds colors + badges.
       Only touches cells that exist and have stored counts
       (plus a light pass to clear any stale visuals).
       ========================================================= */
    function restorePracticeData(data) {
        if (!data || typeof data !== "object") return;

        var cells = document.querySelectorAll(CELL_SELECTOR);

        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            var id = getCellId(cell);
            var count = id && Object.prototype.hasOwnProperty.call(data, id)
                ? parseInt(data[id], 10)
                : 0;

            if (!isFinite(count) || count < 0) {
                count = 0;
            }

            cell.dataset.listenCount = String(count);

            // Rebuild visuals for this cell.
            updateCellPracticeColor(cell);
            updateCellPracticeBadge(cell);
        }
    }

    /* ---------------------------------------------------------
       Expose the public API globally so existing code can call.
       --------------------------------------------------------- */
    window.incrementCellListenCount = incrementCellListenCount;
    window.updateCellPracticeColor  = updateCellPracticeColor;
    window.updateCellPracticeBadge  = updateCellPracticeBadge;
    window.exportPracticeData       = exportPracticeData;
    window.restorePracticeData      = restorePracticeData;
})();



function loadVoices() {
  voices = speechSynthesis.getVoices() || [];
  updateLanguageDropdowns();
}

if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = loadVoices;

  // Some browsers load voices late, so call a few times
  loadVoices();
  setTimeout(loadVoices, 250);
  setTimeout(loadVoices, 1000);
}


// ===============================
// HELPER: Blob <-> Base64
// ===============================
// Converts Blob to Base64 string (for saving)
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Converts Base64 string back to Blob (for loading)
function base64ToBlob(dataUrl) {
    const parts = dataUrl.split(';base64,');
    const mimeType = parts[0].split(':')[1];
    const rawBase64 = parts[1];
    const byteCharacters = atob(rawBase64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
        const slice = byteCharacters.slice(offset, offset + 1024);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type: mimeType });
}





// ===============================
// AUDIO RECORDING (Force WebM + Recognize OGX)
// ===============================
let audioContext = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingStartTime = 0;
let recordingTimerInterval = null;

async function initializeRecorder() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // FORCE WebM format - if not supported, fallback to whatever browser wants
    const options = { mimeType: 'audio/webm;codecs=opus' };
    const supported = MediaRecorder.isTypeSupported(options.mimeType);
    
    mediaRecorder = new MediaRecorder(stream, supported ? options : {});
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      saveRecording();
    };

    return true;
  } catch (err) {
    alert("❌ Audio access failed: " + err.message);
    return false;
  }
}

async function startRecording() {
  const recordBtn = document.getElementById("recordBtn");
  const stopBtn = document.getElementById("stopRecordBtn");
  const status = document.getElementById("recordingStatus");
  const timer = document.getElementById("recordingTimer");

  const ready = await initializeRecorder();
  if (!ready) return;

  mediaRecorder.start();
  isRecording = true;
  recordingStartTime = Date.now();

  recordBtn.style.display = "none";
  stopBtn.style.display = "inline-block";
  status.style.display = "block";
  timer.style.display = "block";
  timer.textContent = " 00:00";

  recordingTimerInterval = setInterval(() => {
    if (!isRecording) {
      clearInterval(recordingTimerInterval);
      return;
    }
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const secs = String(elapsed % 60).padStart(2, "0");
    timer.textContent = ` ${mins}:${secs}`;
  }, 1000);

  console.log("Recording started");
}

function stopRecording() {
  if (!isRecording || !mediaRecorder) return;

  isRecording = false;
  mediaRecorder.stop();
  clearInterval(recordingTimerInterval);

  document.getElementById("recordBtn").style.display = "inline-block";
  document.getElementById("stopRecordBtn").style.display = "none";
  document.getElementById("recordingStatus").style.display = "none";
  document.getElementById("recordingTimer").style.display = "none";

  console.log("Recording stopped");
}

function saveRecording() {
  if (!audioChunks.length) {
    alert("No audio recorded.");
    return;
  }

  // Use ACTUAL mime type from the recorder (might be audio/ogg on Firefox)
  const actualMimeType = audioChunks[0].type || 'audio/webm';
  const extension = actualMimeType.includes('ogg') ? 'ogg' : 'webm';
  
  const audioBlob = new Blob(audioChunks, { type: actualMimeType });
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `recording_${getTimestamp()}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const status = document.getElementById("recordingStatus");
  status.textContent = "✅ Recording saved!";
  status.style.background = "#27ae60";
  setTimeout(() => {
    status.style.display = "none";
  }, 3000);
}









// ===============================
// UTIL: COLUMN + CELL PARSING
// ===============================
function colToIndex(col) {
  return col.toUpperCase().charCodeAt(0) - 65;
}

function parseCell(ref) {
  if (!ref || ref.trim() === "") return null;
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  // Returns 1-based row index to match UI (A1 = row 1)
  const col = colToIndex(match[1]);
  const row = parseInt(match[2]);
  return { col, row };
}






// ===============================
// VOICE SELECTION
// ===============================
// ===============================
// VOICE SELECTION - ALL BROWSER LANGUAGES
// ===============================

const LEGACY_LANG_MAP = {
  EN: "en",
  IT: "it",
  ES: "es",
  FR: "fr",
  DE: "de"
};

function normalizeLang(code) {
  return code?.trim().replace("_", "-").toLowerCase();
}

function getVoice(langCode) {
  if (!voices.length) {
    voices = speechSynthesis.getVoices() || [];
  }

  const mappedCode = LEGACY_LANG_MAP[langCode] || langCode;
  const wanted = normalizeLang(mappedCode);

  if (!wanted || wanted === "off") return null;

  // Exact match first, e.g. "en-US"
  let voice = voices.find(v => normalizeLang(v.lang) === wanted);
  if (voice) return voice;

  // Base-language match, e.g. "en" matches "en-US" or "en-GB"
  const baseLang = wanted.split("-")[0];

  return voices.find(v => {
    const voiceLang = normalizeLang(v.lang);
    return voiceLang?.split("-")[0] === baseLang;
  }) || null;
}

function getBrowserLanguages() {
  const unique = new Map();

  voices.forEach(v => {
    if (!v.lang) return;

    const key = normalizeLang(v.lang);
    if (!unique.has(key)) {
      unique.set(key, v.lang);
    }
  });

  return [...unique.values()].sort((a, b) => a.localeCompare(b));
}

function getLanguageLabel(lang) {
  try {
    const parts = lang.split("-");
    const languageCode = parts[0];
    const regionCode = parts[1];

    const languageNames = new Intl.DisplayNames([navigator.language || "en"], {
      type: "language"
    });

    const regionNames = new Intl.DisplayNames([navigator.language || "en"], {
      type: "region"
    });

    const languageName = languageNames.of(languageCode) || languageCode;
    const regionName = regionCode ? regionNames.of(regionCode) : "";

    return regionName
      ? `${languageName} (${regionName}) — ${lang}`
      : `${languageName} — ${lang}`;
  } catch {
    return lang;
  }
}

function updateLanguageDropdowns() {
  const table = document.getElementById("sheet");
  if (!table) return;

  const selectorRow = table.rows[1];
  if (!selectorRow) return;

  const langs = getBrowserLanguages();

  // Do not wipe existing dropdowns before voices are loaded
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

    // Preserve current selection if possible
    if (currentValue === "Off") {
      select.value = "Off";
      continue;
    }

    const mappedCurrent = LEGACY_LANG_MAP[currentValue] || currentValue;
    const normalizedCurrent = normalizeLang(mappedCurrent);
    const currentBase = normalizedCurrent?.split("-")[0];

    const exactMatch = langs.find(l => normalizeLang(l) === normalizedCurrent);
    const baseMatch = langs.find(l => normalizeLang(l).split("-")[0] === currentBase);

    select.value = exactMatch || baseMatch || "Off";
  }
}














// ===============================
// PAPERCLIP & MEDIA ATTACHMENT
// ===============================

// ===============================
// PAPERCLIP & MEDIA ATTACHMENT (MULTI-FILE SUPPORT)
// ===============================

document.body.insertAdjacentHTML('beforeend', `
  <input type="file" id="cellFileInput" accept="image/jpeg, image/jpg, image/png, image/gif, image/webp, audio/mp3, audio/mpeg, audio/webm, audio/wav, audio/ogg, video/webm, video/mp4" style="display:none">
  <button id="floatingClip" contenteditable="false" title="Attach Media">📎</button>
  <div id="mediaPopup"></div>
`);

const floatingClip = document.getElementById("floatingClip");
const fileInput = document.getElementById("cellFileInput");
const sheetWrap = document.getElementById("sheetWrap");
let activeCell = null;

// Show paperclip when cell is focused
document.getElementById("sheet").addEventListener("focusin", (e) => {
    if (e.target.tagName === "TD") {
        activeCell = e.target;
        const rect = activeCell.getBoundingClientRect();
        floatingClip.style.display = "block";
        floatingClip.style.top = (window.scrollY + rect.top + 4) + "px";
        floatingClip.style.left = (window.scrollX + rect.right - 28) + "px";
    }
});

// Hide paperclip on scroll/click outside
sheetWrap.addEventListener("scroll", () => floatingClip.style.display = "none");
document.addEventListener("mousedown", (e) => {
    if (e.target !== floatingClip && e.target.tagName !== "TD") {
        floatingClip.style.display = "none";
    }
});

// Trigger file upload
floatingClip.addEventListener("mousedown", (e) => {
    e.preventDefault();
    if (activeCell) fileInput.click();
});

// Handle file attachment (SUPER RELIABLE EMOJI FIX)
fileInput.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file || !activeCell) return;

    // Get existing attachments
    let mediaUrls = [];
    let mediaTypes = [];
    
    if (activeCell.dataset.mediaUrls) {
        try {
            mediaUrls = JSON.parse(activeCell.dataset.mediaUrls);
            mediaTypes = JSON.parse(activeCell.dataset.mediaTypes);
        } catch(e) {
            mediaUrls = [];
            mediaTypes = [];
        }
    }

    // Add new file
    const fileUrl = URL.createObjectURL(file);
    mediaUrls.push(fileUrl);
    mediaTypes.push(file.type);

    // Save arrays to dataset
    activeCell.dataset.mediaUrls = JSON.stringify(mediaUrls);
    activeCell.dataset.mediaTypes = JSON.stringify(mediaTypes);

    // ==== EMOJI FIX: Works 100% of the time ====
    const emojiMap = {
        'image': '🖼️',
        'audio': '🎵',
        'video': '🎥'
    };
    
    // Get file extension (SUPER RELIABLE)
    const ext = file.name.split('.').pop().toLowerCase();
    let typePrefix = file.type.split('/')[0];
    
    // If MIME type is missing or unknown, use extension
    if (!emojiMap[typePrefix]) {
        if (['mp3', 'wav', 'webm', 'ogg', 'ogx', 'm4a', 'aac', 'flac'].includes(ext)) {
            typePrefix = 'audio';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
            typePrefix = 'image';
        } else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) {
            typePrefix = 'video';
        }
    }
    
    // FORCE ADD EMOJI if not present
    const emoji = emojiMap[typePrefix];
    if (emoji && !activeCell.innerHTML.includes(emoji)) {
        activeCell.appendChild(document.createTextNode(` ${emoji}`));
    }
    
    this.value = ""; 
    floatingClip.style.display = "none"; 
    placeCaretAtEnd(activeCell); 
});



// ===============================
// SPEAK FUNCTION
// ===============================
function speak(text, lang, rate,cell) {
  return new Promise(resolve => {
    if (!text || !text.trim()) return resolve();

    const utter = new SpeechSynthesisUtterance(text);
    const voice = getVoice(lang);

    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else if (lang && lang !== "Off") {
      utter.lang = LEGACY_LANG_MAP[lang] || lang;
    }

 utter.rate = rate || 1;
utter.pitch = 1.05;
    
 utter.onend = function() {
      incrementCellListenCount(cell);
      resolve();
    };

    utter.onerror = resolve;

    speechSynthesis.speak(utter);
  });
}



// ===============================
// UI HELPERS
// ===============================
// ===============================
// UI HELPERS
// ===============================
function clearHighlight() {
  document.querySelectorAll(".reading").forEach(c => c.classList.remove("reading"));
}

window.currentMediaElement = null; // Global tracker for audio/video playback

function stopReading() {
  isReading = false;
  speechSynthesis.cancel();
  
  // Stop ALL media elements (plural!)
  if (window.currentMediaElements) {
    window.currentMediaElements.forEach(el => {
        try { el.pause(); } catch(e) {}
    });
    window.currentMediaElements = null;
  }
  
  const popup = document.getElementById("mediaPopup");
  if (popup) popup.classList.remove("show");
  
  clearHighlight();
}

// ===============================
// MEDIA PLAYER
// ===============================
// ===============================
// MEDIA PLAYER (MULTI-FILE + NO FREEZE)
// ===============================

function playCellMedia(cell) {
  return new Promise(async (resolve) => {
    let mediaUrls = [];
    let mediaTypes = [];

    try {
      mediaUrls = cell.dataset.mediaUrls ? JSON.parse(cell.dataset.mediaUrls) : [];
      mediaTypes = cell.dataset.mediaTypes ? JSON.parse(cell.dataset.mediaTypes) : [];
    } catch (e) {
      console.error("Bad media data:", e);
      return resolve({ hasAudio: false, hasImage: false });
    }

    const popup = document.getElementById("mediaPopup");

    if (!mediaUrls.length) {
      return resolve({ hasAudio: false, hasImage: false });
    }

    const images = [];
    const audios = [];
    const videos = [];

    mediaUrls.forEach((url, i) => {
      const type = mediaTypes[i] || "";

      if (isImageType(type)) {
        images.push(url);
      } else if (isAudioType(type)) {
        audios.push(url);
      } else if (isVideoType(type)) {
        videos.push(url);
      } else {
        // If unknown, try treating it as audio
        audios.push(url);
      }
    });

    if (popup) {
      popup.innerHTML = "";

      images.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.style.cssText = "max-width:100%;margin:4px 0;";
        popup.appendChild(img);
      });

      videos.forEach(url => {
        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
        video.style.cssText = "max-width:100%;margin:4px 0;";
        popup.appendChild(video);
      });

      if (images.length || videos.length || audios.length) {
        popup.classList.add("show");
      }
    }

    // If only image/video but no audio, do not block long
    if (!audios.length) {
      setTimeout(() => {
        resolve({
          hasAudio: false,
          hasImage: images.length > 0
        });
      }, 300);

      return;
    }

    window.currentMediaElements = [];

    // Play audio files ONE BY ONE.
    // Reader will not continue until each one ends.
    for (const url of audios) {
      if (!isReading) break;

      const audio = document.createElement("audio");
      audio.src = url;
      audio.controls = true;
      audio.preload = "auto";
      audio.style.cssText = "width:100%;margin:4px 0;";

      if (popup) {
        popup.appendChild(audio);
        popup.classList.add("show");
      }

      window.currentMediaElements.push(audio);

      window._currentCellForAudio = cell; await playAndWaitForAudio(audio);
    }

    window.currentMediaElements = null;

    if (popup) popup.classList.remove("show");

    resolve({
      hasAudio: true,
      hasImage: images.length > 0
    });
  });
}


function playAndWaitForAudio(audio) {
  return new Promise((resolve) => {
    let finished = false;

    function done() {
      if (finished) return;
      finished = true;

      clearTimeout(timeout);

      audio.onended = null;
      audio.onerror = null;
      audio.onabort = null;

      resolve();
    }

   audio.onended = function() {
    // ADD THIS - increment for the cell that owns this audio
    if (window._currentCellForAudio) {
        incrementCellListenCount(window._currentCellForAudio);
    }
    done();
};
    audio.onerror = done;
    audio.onabort = done;

    // Safety timeout so app cannot freeze forever
    const timeout = setTimeout(() => {
      console.warn("Audio timeout, moving to next cell");
      try {
        audio.pause();
      } catch (e) {}
      done();
    }, 120000);

    audio.play().catch(err => {
      console.error("Audio autoplay failed:", err);

      const popup = document.getElementById("mediaPopup");
      if (popup) {
        const warning = document.createElement("div");
        warning.style.cssText =
          "background:#fff3cd;color:#856404;padding:6px;margin:4px 0;border-radius:4px;font-size:13px;";
        warning.textContent =
          "Audio was blocked by browser. Click play. Reader will wait until it finishes.";
        popup.prepend(warning);
      }

      // DO NOT resolve here.
      // This is important.
      // If autoplay is blocked, user can click play manually,
      // and the reader will still wait for audio.onended.
    });
  });
}

function isImageType(type) {
  return type.startsWith("image");
}

function isAudioType(type) {
  return (
    type.startsWith("audio") ||
    type.includes("ogg") ||
    type.includes("mp3") ||
    type.includes("mpeg") ||
    type.includes("wav") ||
    type.includes("webm")
  );
}

function isVideoType(type) {
  return (
    type.startsWith("video") ||
    type.includes("mp4") ||
    type.includes("mov")
  );
}
// ===============================
// MAIN READING ENGINE
// ===============================
// ===============================
// MAIN READING ENGINE
// ===============================
async function startReading() {
  if (isReading) return;
  isReading = true;

  const table = document.getElementById("sheet");
  if (!table) {
    console.error("Table not found");
    isReading = false;
    return;
  }

  const getSpeed = () => parseFloat(document.getElementById("speed")?.value || "1");
  const repeatRow = parseInt(document.getElementById("repeatRow")?.value || "1");
  const repeatTable = parseInt(document.getElementById("repeatTable")?.value || "1");
  const repeatCell = parseInt(document.getElementById("repeatCell")?.value || "1");

  const start = parseCell(document.getElementById("startCell")?.value) || { row: 1, col: 0 };
  const end = parseCell(document.getElementById("endCell")?.value) || { row: 26, col: 25 };
  const reverse = document.getElementById("reverse")?.checked;

  let rowRange = [];
  let colRange = [];

  for (let r = start.row; r <= end.row; r++) rowRange.push(r);
  for (let c = start.col; c <= end.col; c++) colRange.push(c);

  if (reverse) {
    rowRange.reverse();
    colRange.reverse();
  }

  try {
    for (let rt = 0; rt < repeatTable; rt++) {
      if (!isReading) return;

      for (let r of rowRange) {
        if (!isReading) return;

        const row = table.rows[r + 1];
        if (!row) continue;

        for (let rr = 0; rr < repeatRow; rr++) {
          if (!isReading) return;

          for (let c of colRange) {
            if (!isReading) return;

            const cell = row.cells[c + 1];
            if (!cell) continue;

            const rawText = cell.innerText || "";
            const cleanText = rawText.replace(/[🖼️🎵🎥]/g, "").trim();

            const selector = table.rows[1]?.cells[c + 1]?.querySelector("select");
            const lang = selector?.value || "Off";

            let hasMedia = false;
            try {
              hasMedia =
                cell.dataset.mediaUrls &&
                JSON.parse(cell.dataset.mediaUrls).length > 0;
            } catch (e) {
              hasMedia = false;
            }

            /*
              IMPORTANT LOGIC:

              - If cell has media, allow it even if language is Off.
              - If cell has no media and language is Off, skip it.
              - If cell has no text and no media, skip it.
            */
            if (lang === "Off" || (!hasMedia && !cleanText)) {
            continue;
            }

            for (let rc = 0; rc < repeatCell; rc++) {
              if (!isReading) return;

              cell.classList.add("reading");

              // 1. Play media and WAIT until audio finishes
              const mediaResult = await playCellMedia(cell);

              if (!isReading) return;

              // 2. Only read text if:
              // - no audio was played
              // - language is not Off
              // - text exists
              if (!mediaResult.hasAudio && lang !== "Off" && cleanText) {
                await speak(cleanText, lang, getSpeed(), cell);
              }

              cell.classList.remove("reading");

              const popup = document.getElementById("mediaPopup");
              if (popup) popup.classList.remove("show");
            }
          }
        }
      }
    }
  } finally {
    isReading = false;
    clearHighlight();

    const popup = document.getElementById("mediaPopup");
    if (popup) popup.classList.remove("show");
  }
}











// ===============================
// EXPORT & SAVE (harmonised)
// ===============================



function getTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

// ===============================
// EXPORT & SAVE (with Media)
// ===============================
async function exportTableData() { // <-- Now async
    const table = document.getElementById("sheet");
    if (!table) return null;

    const dataRows = table.rows.length - 2;
    const colCount = 26;
    const cells = [];
    const languages = [];
    const media = {}; // NEW: Stores media data

    // Get language settings
    const selectorRow = table.rows[1];
    for (let c = 0; c < colCount; c++) {
        const cell = selectorRow?.cells[c + 1];
        const select = cell?.querySelector("select");
        languages.push(select?.value || "Off");
    }

    // Process cells and media
    for (let r = 2; r < table.rows.length; r++) {
        const row = table.rows[r];
        const rowData = [];
        for (let c = 1; c <= colCount; c++) {
            const cell = row.cells[c];
            const text = cell?.innerText?.trim() || "";
            rowData.push(text);

            // Save media if present
            if (cell.dataset.mediaUrls && cell.dataset.mediaTypes) {
                try {
                    const urls = JSON.parse(cell.dataset.mediaUrls);
                    const types = JSON.parse(cell.dataset.mediaTypes);
                    if (urls.length > 0) {
                        const cellKey = `${r-2}-${c-1}`; // Use 0-based indices
                        media[cellKey] = { urls: [], types: types };
                        
                        // Convert each media file to Base64
                        for (let i = 0; i < urls.length; i++) {
                            const response = await fetch(urls[i]);
                            const blob = await response.blob();
                            const base64 = await blobToBase64(blob);
                            media[cellKey].urls.push(base64);
                        }
                    }
                } catch (err) {
                    console.error("Media export failed for cell", r, c, err);
                }
            }
        }
        cells.push(rowData);
    }

    return {
        createdAt: new Date().toISOString(),
        columns: colCount,
        rows: dataRows,
        cells,
        languages,
               media, // <-- NEW
        practiceData: exportPracticeData() // ADD THIS LINE
    };
}

function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function openSaveDialog(defaultName, onConfirm) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;";
  const box = document.createElement("div");
  box.style.cssText = "background:#fff;padding:20px;border-radius:10px;width:320px;font-family:Arial;";
  box.innerHTML = `
    <h3 style="margin-top:0;">Save Table</h3>
    <input id="fileName" style="width:100%;padding:8px" value="${defaultName}">
    <div style="margin-top:12px;display:flex;justify-content:flex-end;gap:8px;">
      <button id="cancel">Cancel</button>
      <button id="save">Save</button>
    </div>`;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.querySelector("#cancel").onclick = () => overlay.remove();
  overlay.querySelector("#save").onclick = () => {
    const name = overlay.querySelector("#fileName").value.trim();
    overlay.remove();
    onConfirm(name || defaultName);
  };
}

// ===============================
// SAVE TABLE (with Media + Custom Filename)
// ===============================
async function saveTable() {
    const defaultName = `language-table_${getTimestamp()}.json`;
    
    // First, ask for filename
    openSaveDialog(defaultName, async (finalName) => { // <-- Make callback async
        const data = await exportTableData();
        if (!data) return;

        // Warn if file is huge
        const jsonString = JSON.stringify(data, null, 2);
        const sizeMB = (new Blob([jsonString]).size / 1024 / 1024).toFixed(2);
        if (sizeMB > 10) {
            if (!confirm(`Warning: Save file is ${sizeMB}MB. Continue?`)) return;
        }

        downloadJSON(finalName.endsWith(".json") ? finalName : finalName + ".json", data);
    });
}
// ===============================
// UPLOAD TABLE (harmonised)
// ===============================
// ===============================
// UPLOAD TABLE (harmonised) - FIXED
// ===============================
// ===============================
// UPLOAD TABLE (with Media)
// ===============================
function uploadTable() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = function () {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function (e) { // <-- Now async
            try {
                const data = JSON.parse(e.target.result);

                if (!data.cells || !data.languages) {
                    throw new Error("Missing 'cells' or 'languages'");
                }

                const table = document.getElementById("sheet");
                if (!table) throw new Error("Table not found");

                // Clear existing rows
                while (table.rows.length > 2) {
                    table.deleteRow(2);
                }

                // Restore languages
                const selectorRow = table.rows[1];
                for (let c = 0; c < data.languages.length; c++) {
                    const cell = selectorRow.cells[c + 1];
                    const select = cell?.querySelector("select");
                    if (select) select.value = data.languages[c];
                }

                // Rebuild cells and restore media
                for (let r = 0; r < data.cells.length; r++) {
                    const rowArray = data.cells[r];
                    const newRow = table.insertRow();
                    const numberCell = newRow.insertCell();
                    numberCell.textContent = newRow.rowIndex - 1;
                    numberCell.className = "row-number";

                    for (let c = 0; c < rowArray.length; c++) {
                        const td = newRow.insertCell();
                        td.textContent = rowArray[c] || "";
                        td.contentEditable = "true";
                      // ADD THESE LINES:
                      td.dataset.cellId = r + ":" + c; // Stable ID for save/load
                      td.dataset.listenCount = "0";    // Initialize listen count

                        // Restore media if exists
                        const cellKey = `${r}-${c}`;
                        if (data.media && data.media[cellKey]) {
                            const mediaInfo = data.media[cellKey];
                            const urls = [];
                            
                            // Convert Base64 back to blobs and URLs
                            for (let i = 0; i < mediaInfo.urls.length; i++) {
                                const base64 = mediaInfo.urls[i];
                                const blob = base64ToBlob(base64);
                                const url = URL.createObjectURL(blob);
                                urls.push(url);
                            }

                            td.dataset.mediaUrls = JSON.stringify(urls);
                            td.dataset.mediaTypes = JSON.stringify(mediaInfo.types);

                            // Restore emojis
                            const emojiMap = {
                                'image': '🖼️',
                                'audio': '🎵',
                                'video': '🎥'
                            };
                            const uniqueTypes = [...new Set(mediaInfo.types)];
                            uniqueTypes.forEach(type => {
                                const prefix = type.split('/')[0];
                                const emoji = emojiMap[prefix];
                                if (emoji && !td.innerHTML.includes(emoji)) {
                                    td.appendChild(document.createTextNode(` ${emoji}`));
                                }
                            });
                        }
                    }
                }
 if (data.practiceData) {     
   restorePracticeData(data.practiceData); }  
              alert("✅ Table and media uploaded successfully!");

            } catch (err) {
                alert("Invalid JSON file: " + (err.message || ""));
            }
        };
        reader.readAsText(file);
    };

    input.click();
}











// ===============================
// UI TOGGLES
// ===============================
function toggleUpload() {
  const box = document.getElementById("uploadBox");
  if (!box) return;
  box.style.display = box.style.display === "block" ? "none" : "block";
}


function toggleExtract() {
  const box = document.getElementById("extractBox");
  if (!box) return;

  // Close upload if open (keeps UI clean)
  const uploadBox = document.getElementById("uploadBox");
  if (uploadBox) uploadBox.style.display = "none";

  box.style.display = box.style.display === "block" ? "none" : "block";
}


function toggleReader() {
  const bar = document.getElementById("toolbar");
  if (!bar) return;
  bar.style.display = bar.style.display === "flex" ? "none" : "flex";
} 




// ===============================
// UI TOGGLES
// ===============================

















// ===============================
// Upload
// ===============================

window.uploadColumn = function () {
  console.log("🚀 UPLOAD CLICKED!");

  const rawText = document.getElementById("columnData").value.trim();
  if (!rawText) {
    alert("Please paste some text.");
    return;
  }

  const startCellInput = document.getElementById("startCellUpload").value.trim().toUpperCase();
  const direction = document.getElementById("uploadDirection").value;

  let startCol = 0;   // Default = Column A
  let startRow = 0;   // Default = Row 1

  if (startCellInput) {
    const match = startCellInput.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      alert("Invalid cell format. Please use something like A1, B5, or C12");
      return;
    }
    startCol = match[1].charCodeAt(0) - 65;
    startRow = parseInt(match[2]) - 1;
  }

  const lines = rawText.split(/\r?\n/).map(x => x.trim()).filter(x => x !== "");

  // Auto-expand table if needed
  const neededRows = direction === "down" 
    ? startRow + lines.length 
    : startRow + 1;

  const currentRows = sheetTable.rows.length - 2;
  if (neededRows > currentRows) {
    addNewRows(neededRows - currentRows);
  }

  // Fill the cells
  for (let i = 0; i < lines.length; i++) {
    let rowIndex = startRow;
    let colIndex = startCol;

    if (direction === "down") {
      rowIndex += i;
    } else {
      colIndex += i;
    }

    const row = sheetTable.rows[rowIndex + 2];
    if (!row) continue;
    const cell = row.cells[colIndex + 1];
    if (!cell) continue;

    cell.innerText = lines[i];
  }

  alert(`✅ Successfully uploaded ${lines.length} item${lines.length === 1 ? '' : 's'}!`);

  // Optional: clear the input after successful upload
  // document.getElementById("columnData").value = "";
};



// ===============================
// EXTRACT RANGE
// ===============================
function extractRange(mode) {
  const table = document.getElementById("sheet");
  if (!table) {
    alert("Table not found.");
    return;
  }

  const startRef = document.getElementById("extractStart").value.trim().toUpperCase();
  const endRef   = document.getElementById("extractEnd").value.trim().toUpperCase();

  const start = parseCell(startRef);
  const end   = parseCell(endRef);

  if (!start || !end) {
    alert("Invalid cell format. Use format like A1 or C5.");
    return;
  }

  // Normalize selection (handles reversed input)
  const startRow = Math.min(start.row, end.row);
  const endRow   = Math.max(start.row, end.row);
  const startCol = Math.min(start.col, end.col);
  const endCol   = Math.max(start.col, end.col);

  let extracted = [];

  for (let r = startRow; r <= endRow; r++) {
    const tableRow = table.rows[r + 1]; // +1 offset (header row)
    if (!tableRow) continue;

    let rowData = [];

    for (let c = startCol; c <= endCol; c++) {
      const cell = tableRow.cells[c + 1]; // +1 skip row number column
      if (!cell) continue;

      rowData.push(cell.innerText || "");

      if (mode === "remove") {
        cell.innerText = "";
      }
    }

    extracted.push(rowData.join("\t"));
  }

  if (mode === "copy") {
    const text = extracted.join("\n");

    navigator.clipboard.writeText(text).then(() => {
      alert("✅ Range copied!");
    }).catch(() => {
      alert("Clipboard blocked by browser.");
    });
  }

  if (mode === "remove") {
    alert("✅ Range cleared!");
  }
}













document.getElementById("openFinder").addEventListener("click", () => {
  const newTab = window.open("", "_blank");
  if (!newTab) {
    alert("Allow pop-ups for this site to open the Frequency Finder.");
    return;
  }

  newTab.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Frequency Finder</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    font-family:'Segoe UI',Arial,sans-serif;
    background:#0d0d0d;color:#e0e0e0;
    padding:24px;min-height:100vh;
  }
  h1{color:#5ea4ff;margin-bottom:6px;font-size:28px}
  .subtitle{color:#888;margin-bottom:18px;font-size:14px;line-height:1.5}
  textarea{
    width:100%;height:320px;padding:16px;
    font-size:15px;line-height:1.6;
    border-radius:10px;border:2px solid #222;
    background:#141414;color:#e0e0e0;
    resize:vertical;outline:none;
    transition:border-color .2s;
  }
  textarea:focus{border-color:#5ea4ff}
  .controls{
    display:flex;flex-wrap:wrap;gap:10px;
    align-items:center;margin-top:14px;
  }
  .controls label{color:#aaa;font-size:14px}
  .controls input[type=number], .controls input[type=text]{
    padding:10px 12px;font-size:14px;
    border:none;border-radius:8px;
    background:#1a1a1a;color:#e0e0e0;
  }
  .controls input[type=number]{width:65px;text-align:center}
  .controls input[type=text]{width:220px}
  .controls input::placeholder{color:#555}
  button{
    background:linear-gradient(135deg,#2b7cff,#1a5ec2);
    color:#fff;border:none;padding:11px 22px;
    border-radius:10px;cursor:pointer;font-size:15px;
    font-weight:600;transition:all .2s;
  }
  button:hover{transform:translateY(-1px);box-shadow:0 4px 18px #2b7cff55}
  button:active{transform:translateY(0)}
  button:disabled{opacity:.5;cursor:wait;transform:none;box-shadow:none}
  
  /* COPY BUTTONS */
  .copy-btn{
    background:#1a1a1a;border:1px solid #333;color:#aaa;
    padding:9px 14px;font-size:13px;border-radius:8px;cursor:pointer;
    transition:all .2s;font-weight:500;
  }
  .copy-btn:hover{background:#222;color:#fff;border-color:#5ea4ff}
  .copy-btn.copied{background:#1b5e20;border-color:#4caf50;color:#fff}

  .stats{
    margin-top:18px;padding:12px 16px;
    background:#161616;border-radius:8px;
    font-size:13px;color:#999;display:none;
  }
  .stats span{color:#5ea4ff;font-weight:700}
  .table-wrap{
    margin-top:20px;max-height:60vh;
    overflow-y:auto;border-radius:10px;
    border:1px solid #222;display:none;
  }
  table{width:100%;border-collapse:collapse;background:#111}
  thead{position:sticky;top:0;z-index:2}
  th{
    background:#1e1e1e;color:#5ea4ff;
    padding:14px 16px;text-align:left;
    font-size:14px;border-bottom:2px solid #333;
  }
  td{
    padding:10px 16px;border-bottom:1px solid #1a1a1a;
    font-size:14px;
  }
  tr:hover td{background:#1a2233}
  tr:nth-child(even) td{background:#0f0f0f}
  tr:nth-child(even):hover td{background:#1a2233}
  .rank{color:#555;font-size:12px;margin-right:8px}
  .bar-cell{position:relative}
  .bar{
    position:absolute;left:0;top:0;bottom:0;
    background:#2b7cff15;border-radius:3px;
    pointer-events:none;transition:width .4s ease;
  }
  .bar-text{position:relative;z-index:1}
  .no-results{
    text-align:center;padding:40px;color:#555;font-size:15px;
  }
  .spinner{
    display:inline-block;width:18px;height:18px;
    border:3px solid #ffffff44;border-top-color:#fff;
    border-radius:50%;animation:spin .6s linear infinite;
    vertical-align:middle;margin-right:8px;
  }
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>

<h1>\u{1F50D} Frequency Finder</h1>
<div class="subtitle">
  Paste any text \u2014 Bible verses, Bhagavad Gita, Quran, Tao Te Ching,
  Tolstoy poems, or anything in any language. Digits & punctuation are stripped.
  Case is ignored. Copy any column instantly.
</div>

<textarea id="textInput"
  placeholder="Paste your text here \u2014 large or small\u2026"></textarea>

<div class="controls">
  <label>Combo size:</label>
  <input id="comboSize" type="number" min="1" max="12" value="1">
  <button id="findBtn">Find Frequency</button>
  <input id="filterInput" type="text" placeholder="Filter results\u2026">
  <button id="copyWords" class="copy-btn">Copy Words</button>
  <button id="copyCounts" class="copy-btn">Copy Counts</button>
  <button id="copyPcts" class="copy-btn">Copy %</button>
</div>

<div class="stats" id="stats"></div>

<div class="table-wrap" id="tableWrap">
  <table id="resultTable">
    <thead>
      <tr>
        <th style="width:40%">Word / Combination</th>
        <th style="width:20%">Count</th>
        <th style="width:40%">% of Text</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>
</div>

<script>
(function(){
  "use strict";

  /* ---------- helpers ---------- */
  function normalizeText(text){
    text = text.normalize("NFKC");
    text = text.replace(/\\p{N}/gu, " ");
    text = text.toLocaleLowerCase();
    text = text.replace(/[\\p{P}\\p{S}\\p{C}]/gu, " ");
    text = text.replace(/\\s+/g, " ").trim();
    return text;
  }

  function tokenize(text){
    var m = text.match(/\\p{L}+/gu);
    return m ? m : [];
  }

  function buildNgrams(words, n){
    if(n < 1) n = 1;
    var out = [];
    for(var i = 0; i <= words.length - n; i++){
      out.push(words.slice(i, i + n).join(" "));
    }
    return out;
  }

  function escapeHtml(s){
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  /* ---------- state ---------- */
  var findBtn    = document.getElementById("findBtn");
  var textInput  = document.getElementById("textInput");
  var comboInput = document.getElementById("comboSize");
  var filterIn   = document.getElementById("filterInput");
  var tbody      = document.getElementById("tbody");
  var tableWrap  = document.getElementById("tableWrap");
  var statsDiv   = document.getElementById("stats");

  var allResults = [];
  var currentDisplay = [];

  /* ---------- render ---------- */
  function renderTable(data){
    currentDisplay = data; // track what's visible for copying
    var maxCount = data.length ? data[0].count : 1;
    var html = "";
    var limit = Math.min(data.length, 5000);

    for(var i = 0; i < limit; i++){
      var d = data[i];
      var pct = d.pct.toFixed(4);
      var barW = ((d.count / maxCount) * 100).toFixed(2);
      html += '<tr>' +
        '<td><span class="rank">#' + (i+1) + '</span>' + escapeHtml(d.word) + '</td>' +
        '<td>' + d.count.toLocaleString() + '</td>' +
        '<td class="bar-cell">' +
          '<div class="bar" style="width:' + barW + '%"></div>' +
          '<span class="bar-text">' + pct + '%</span>' +
        '</td>' +
      '</tr>';
    }

    if(data.length > limit){
      html += '<tr><td colspan="3" class="no-results">Showing top ' + limit.toLocaleString() + ' of ' + data.length.toLocaleString() + '</td></tr>';
    }
    if(!data.length){
      html = '<tr><td colspan="3" class="no-results">No results.</td></tr>';
    }

    tbody.innerHTML = html;
  }

  /* ---------- main logic ---------- */
  findBtn.addEventListener("click", function(){
    var raw = textInput.value;
    if(!raw.trim()){ alert("Please paste some text first."); return; }

    findBtn.disabled = true;
    findBtn.innerHTML = '<span class="spinner"></span>Processing\u2026';

    setTimeout(function(){
      var n = parseInt(comboInput.value, 10) || 1;
      if(n < 1) n = 1; if(n > 12) n = 12;
      comboInput.value = n;

      var cleaned = normalizeText(raw);
      var words   = tokenize(cleaned);
      if(!words.length){ alert("No words found."); resetBtn(); return; }

      var units = buildNgrams(words, n);
      var freq  = Object.create(null);
      for(var i = 0; i < units.length; i++){
        freq[units[i]] = (freq[units[i]] || 0) + 1;
      }

      var total = units.length;
      var sorted = Object.keys(freq).map(function(w){
        return { word:w, count:freq[w], pct:(freq[w]/total)*100 };
      }).sort(function(a,b){ return b.count - a.count; });

      allResults = sorted;
      statsDiv.style.display = "block";
      statsDiv.innerHTML = 'Tokens: <span>'+total.toLocaleString()+'</span> | Unique: <span>'+sorted.length.toLocaleString()+'</span> | Combo: <span>'+n+'</span>';
      
      renderTable(sorted);
      tableWrap.style.display = "block";
      resetBtn();
    }, 50);
  });

  function resetBtn(){
    findBtn.disabled = false;
    findBtn.textContent = "Find Frequency";
  }

  /* ---------- filter ---------- */
  filterIn.addEventListener("input", function(){
    var q = this.value.toLocaleLowerCase().trim();
    if(!q){ renderTable(allResults); return; }
    renderTable(allResults.filter(function(d){ return d.word.indexOf(q) !== -1; }));
  });

  /* ---------- COPY COLUMNS ---------- */
  function setupCopy(btnId, extractor){
    document.getElementById(btnId).addEventListener("click", function(){
      if(!currentDisplay.length) return;
      var text = currentDisplay.map(extractor).join("\\n");
      navigator.clipboard.writeText(text).then(() => {
        var btn = this, orig = btn.textContent;
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1400);
      }).catch(() => {
        // Fallback for older browsers or non-HTTPS
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
        var btn = this, orig = btn.textContent;
        btn.textContent = "Copied!"; btn.classList.add("copied");
        setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1400);
      });
    });
  }

  setupCopy("copyWords",  d => d.word);
  setupCopy("copyCounts", d => d.count);
  setupCopy("copyPcts",   d => d.pct.toFixed(4) + "%");

})();
</script>
</body>
</html>`);
});


// ===============================
// RECORDER BUTTON EVENTS
// ===============================
document.getElementById("recordBtn")?.addEventListener("click", startRecording);
document.getElementById("stopRecordBtn")?.addEventListener("click", stopRecording);



// Sync practice visuals on page load
(function syncInitialPracticeVisuals() {
    var cells = document.querySelectorAll("td[contenteditable='true']");
    for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        // Ensure cell ID exists
        if (!cell.dataset.cellId) {
            var row = cell.closest("tr");
            var rowIndex = row ? row.rowIndex - 2 : 0;
            var colIndex = cell.cellIndex - 1;
            cell.dataset.cellId = rowIndex + ":" + colIndex;
        }
        if (!cell.dataset.listenCount) {
            cell.dataset.listenCount = "0";
        }
        if (!cell.classList.contains("practice-cell")) {
            cell.classList.add("practice-cell");
        }
        updateCellPracticeColor(cell);
        updateCellPracticeBadge(cell);
    }
})();

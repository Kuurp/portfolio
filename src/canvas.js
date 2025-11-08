const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const colorPickerTrigger = document.getElementById('colorPickerTrigger');
const colorPickerPopup = document.getElementById('colorPickerPopup');
const cpSV = document.getElementById('cp-sv');
const cpSVCursor = document.getElementById('cp-sv-cursor');
const cpHue = document.getElementById('cp-hue');
const cpHueCursor = document.getElementById('cp-hue-cursor');
const cpHex = document.getElementById('cp-hex');
const cpClose = document.getElementById('closeColorPicker');

const brushSize = document.getElementById('brushSize');
const saveDrawingBtn = document.getElementById('saveDrawing');
const canvasOverlay = document.getElementById('canvasOverlay');

const undoBtn = document.getElementById('undoDrawing');
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwrob4SF38UzR-s_FrrIwqXo7rvgpEvPmTA8WPJE65ZWHs5CYMNwIX3_LhNgsOFH9TR/exec';

// Initial setup
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.strokeStyle = '#000000'; // default color
ctx.lineWidth = 2;

// Undo manager
const UNDO_LIMIT = 200;
const undoStack = [];

function updateUndoButton() {
  if (undoBtn) undoBtn.disabled = undoStack.length <= 1;
}

function pushState() {
  try {
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (undoStack.length >= UNDO_LIMIT) {
      undoStack.shift(); // drop oldest
    }
    undoStack.push(snapshot);
    updateUndoButton();
  } catch (e) {
    // getImageData can throw if canvas is tainted; ignore to avoid breaking drawing
    console.log('Unable to snapshot canvas state for undo:', e);
  }
}

function undo() {
  if (undoStack.length <= 1) return; // keep initial
  // Remove current state
  undoStack.pop();
  const previous = undoStack[undoStack.length - 1];
  if (previous) {
    ctx.putImageData(previous, 0, 0);
  }
  updateUndoButton();
}

// Push initial blank state
pushState();

// ---- Color Picker ----
// HSV values: h in [0,360], s in [0,1], v in [0,1]
let hsv = { h: 0, s: 0, v: 0 };

function hsvToRgb(h, s, v) {
  const c = v * s;
  const hh = (h / 60) % 6;
  const x = c * (1 - Math.abs(hh % 2 - 1));
  let r=0,g=0,b=0;
  if (0 <= hh && hh < 1) { r=c; g=x; b=0; }
  else if (1 <= hh && hh < 2) { r=x; g=c; b=0; }
  else if (2 <= hh && hh < 3) { r=0; g=c; b=x; }
  else if (3 <= hh && hh < 4) { r=0; g=x; b=c; }
  else if (4 <= hh && hh < 5) { r=x; g=0; b=c; }
  else if (5 <= hh && hh < 6) { r=c; g=0; b=x; }
  const m = v - c;
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return { r, g, b };
}

function rgbToHex({r,g,b}) {
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if(!m) return null;
  const intVal = parseInt(m[1],16);
  return { r: (intVal>>16)&255, g: (intVal>>8)&255, b: intVal&255 };
}

function rgbToHsv(r,g,b) {
  r/=255; g/=255; b/=255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  const d = max - min;
  let h=0;
  if (d === 0) h = 0;
  else if (max === r) h = 60 * (((g-b)/d) % 6);
  else if (max === g) h = 60 * (((b-r)/d) + 2);
  else h = 60 * (((r-g)/d) + 4);
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function updateUISV() {
  // Update SV cursor position based on hsv.s and hsv.v
  const w = cpSV.clientWidth;
  const hEl = cpSV.clientHeight;
  cpSVCursor.style.left = (hsv.s * w) + 'px';
  // v: 0 bottom, 1 top -> y = (1 - v) * height
  cpSVCursor.style.top = ((1 - hsv.v) * hEl) + 'px';
}

function updateUIHue() {
  const hEl = cpHue.clientHeight;
  cpHueCursor.style.top = (hsv.h / 360 * hEl) + 'px';
  // Update base hue background of SV square
  cpSV.style.background = `hsl(${hsv.h}, 100%, 50%)`;
}

function applyColorToApp() {
  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const hex = rgbToHex(rgb);
  cpHex.value = hex;
  ctx.strokeStyle = hex;
  colorPickerTrigger.style.background = hex;
}

function setHex(hex) {
  const rgb = hexToRgb(hex);
  if(!rgb) return;
  hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  updateUIHue();
  updateUISV();
  applyColorToApp();
}

function onSVInteract(clientX, clientY) {
  const rect = cpSV.getBoundingClientRect();
  let x = (clientX - rect.left) / rect.width; // 0..1 saturation
  let y = (clientY - rect.top) / rect.height; // 0..1 from top
  x = Math.min(Math.max(x,0),1);
  y = Math.min(Math.max(y,0),1);
  hsv.s = x;
  hsv.v = 1 - y; // invert for value
  updateUISV();
  applyColorToApp();
}

function onHueInteract(clientY) {
  const rect = cpHue.getBoundingClientRect();
  let y = (clientY - rect.top) / rect.height; // 0..1
  y = Math.min(Math.max(y,0),1);
  hsv.h = y * 360;
  updateUIHue();
  applyColorToApp();
}

// Show / hide popup
colorPickerTrigger.addEventListener('click', () => {
  colorPickerPopup.classList.toggle('hidden');
});
cpClose.addEventListener('click', () => {
  colorPickerPopup.classList.add('hidden');
});

// SV interactions
let svDragging = false;
cpSV.addEventListener('mousedown', e => { e.preventDefault(); svDragging = true; onSVInteract(e.clientX, e.clientY); });
document.addEventListener('mousemove', e => { if (svDragging) onSVInteract(e.clientX, e.clientY); });
document.addEventListener('mouseup', () => { svDragging = false; });

// Hue interactions
let hueDragging = false;
cpHue.addEventListener('mousedown', e => { e.preventDefault(); hueDragging = true; onHueInteract(e.clientY); });
document.addEventListener('mousemove', e => { if (hueDragging) onHueInteract(e.clientY); });
document.addEventListener('mouseup', () => { hueDragging = false; });

// Hex input
cpHex.addEventListener('input', (e) => {
  const val = e.target.value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    setHex(val);
  }
});

// Initialize UI
updateUIHue();
updateUISV();
applyColorToApp();

// Brush size change handler
brushSize.addEventListener('input', (e) => {
  const size = e.target.value;
  ctx.lineWidth = size;
});

// Drawing
let drawing = false;
let didDrawInStroke = false;
let lastX = 0, lastY = 0;
canvas.addEventListener('mousedown', e => {
  drawing = true;
  didDrawInStroke = false;
  ctx.beginPath();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  lastX = e.offsetX * scaleX;
  lastY = e.offsetY * scaleY;
  ctx.moveTo(lastX, lastY);
});
canvas.addEventListener('mouseup', () => {
  drawing = false;
  if (didDrawInStroke) {
    pushState();
  } else {
    ctx.beginPath();
    ctx.arc(lastX, lastY, Math.max(1, ctx.lineWidth / 2), 0, Math.PI * 2);
    const prevFill = ctx.fillStyle;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.fillStyle = prevFill;
    pushState();
  }
  didDrawInStroke = false;
});
canvas.addEventListener('mouseleave', () => {
  // Only consider this a stroke end if we were actively drawing when leaving
  if (drawing && didDrawInStroke) {
    pushState();
  }
  drawing = false;
  didDrawInStroke = false;
});
canvas.addEventListener('mousemove', e => {
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  ctx.lineTo(e.offsetX * scaleX, e.offsetY * scaleY);
  ctx.stroke();
  didDrawInStroke = true;
});

// Save drawing
saveDrawingBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'my-drawing.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});


if (undoBtn) {
  undoBtn.addEventListener('click', () => {
    undo();
  });
}

// Ctrl + z
window.addEventListener('keydown', (e) => {
  const isUndoKey = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
  if (isUndoKey) {
    e.preventDefault();
    undo();
  }
});


// Callback function for JSONP response
window.handleUploadResponse = function(data) {
  const btn = document.getElementById('send');
  
  // Hide loader
  btn.classList.remove('loading');
  
  if (data.error) {
    console.error('Upload error:', data.error);
    btn.disabled = false;
    btn.textContent = 'Send';
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  } else {
    console.log('Upload complete! File name:', data.name);
    console.log('File URL:', data.url);
    
    // Disable send button and change text
    btn.disabled = true;
    btn.textContent = 'Sent!';
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    
    // Show overlay and download button
    canvasOverlay.style.display = 'block';
    saveDrawingBtn.style.display = 'block';
  }
};

document.getElementById('send').onclick = async () => {
  const btn = document.getElementById('send');
  btn.disabled = true;
  btn.classList.add('loading');
  btn.innerHTML = '&nbsp;';

  try {
    // Convert canvas to base64
    const dataURL = canvas.toDataURL('image/png');
    const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');

    // Send via POST with no-cors mode
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `file=${encodeURIComponent(base64Data)}&mimeType=image/png`
    });

    // Assume success after a delay (since we can't read response with no-cors)
    setTimeout(() => {
      console.log('Upload complete!');
      
      btn.disabled = true;
      btn.textContent = 'Sent!';
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.classList.remove('loading');
      
      canvasOverlay.style.display = 'block';
      saveDrawingBtn.style.display = 'block';
    }, 2000);

  } catch (err) {
    console.error('Error:', err.message);
    btn.classList.remove('loading');
    btn.disabled = false;
    btn.textContent = 'Send';
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  }
};
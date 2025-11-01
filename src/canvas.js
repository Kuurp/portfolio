const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorInput = document.getElementById('colorInput');
const brushSize = document.getElementById('brushSize');
const saveDrawingBtn = document.getElementById('saveDrawing');
const canvasOverlay = document.getElementById('canvasOverlay');
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwrob4SF38UzR-s_FrrIwqXo7rvgpEvPmTA8WPJE65ZWHs5CYMNwIX3_LhNgsOFH9TR/exec';

// Initial setup
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.strokeStyle = document.getElementById('colorInput').value || '#000000';
ctx.lineWidth = 2;

// Color input change handler, TODO do a proper thing to pick a color instead of just a hex code
colorInput.addEventListener('input', (e) => {
  const color = e.target.value;
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    ctx.strokeStyle = color;
  }
});

// Brush size change handler
brushSize.addEventListener('input', (e) => {
  const size = e.target.value;
  ctx.lineWidth = size;
});

// Drawing
let drawing = false;
canvas.addEventListener('mousedown', e => {
  drawing = true;
  ctx.beginPath();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  ctx.moveTo(e.offsetX * scaleX, e.offsetY * scaleY);
});
canvas.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('mouseleave', () => drawing = false);
canvas.addEventListener('mousemove', e => {
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  ctx.lineTo(e.offsetX * scaleX, e.offsetY * scaleY);
  ctx.stroke();
});

// Save drawing
saveDrawingBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'my-drawing.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
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
const API = {
  list: '/api/photos',
  upload: '/api/upload',
  photo: (id) => `/api/photo/${id}`,
};

const MAX_BYTES = 4.5 * 1024 * 1024;

const els = {
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('fileInput'),
  grid: document.getElementById('grid'),
  empty: document.getElementById('empty'),
  count: document.getElementById('count'),
  status: document.getElementById('status'),
  lightbox: document.getElementById('lightbox'),
  lightboxImg: document.getElementById('lightboxImg'),
  lightboxFilename: document.getElementById('lightboxFilename'),
  lightboxMeta: document.getElementById('lightboxMeta'),
  lightboxDownload: document.getElementById('lightboxDownload'),
  lightboxDelete: document.getElementById('lightboxDelete'),
};

let photos = [];
let deleteArmed = false;
let deleteTimer = null;
let statusTimer = null;

function setStatus(msg, tone = 'info') {
  els.status.textContent = msg;
  els.status.dataset.tone = tone;
  els.status.classList.add('show');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => els.status.classList.remove('show'), 3200);
}

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
  );
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadPhotos() {
  try {
    const res = await fetch(API.list);
    const data = await res.json();
    photos = data.photos || [];
    renderGrid();
  } catch (err) {
    setStatus('ছবির তালিকা আনতে সমস্যা হয়েছে', 'error');
  }
}

function renderGrid() {
  els.count.textContent = photos.length;
  els.empty.hidden = photos.length > 0;
  els.grid.hidden = photos.length === 0;
  els.grid.innerHTML = '';

  photos.forEach((p, i) => {
    const fig = document.createElement('figure');
    fig.className = 'frame';
    fig.tabIndex = 0;
    fig.dataset.id = p.id;
    fig.innerHTML = `
      <span class="frame-no">${String(i + 1).padStart(2, '0')}</span>
      <img src="${API.photo(p.id)}" alt="${escapeHtml(p.filename)}" loading="lazy">
      <figcaption class="frame-meta">${escapeHtml(p.filename)}</figcaption>
    `;
    fig.addEventListener('click', () => openLightbox(p));
    fig.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(p);
      }
    });
    els.grid.appendChild(fig);
  });
}

function openLightbox(photo) {
  resetDeleteArm();
  els.lightbox.hidden = false;
  els.lightboxImg.src = API.photo(photo.id);
  els.lightboxImg.alt = photo.filename;
  els.lightboxFilename.textContent = photo.filename;
  els.lightboxMeta.textContent = `${formatDate(photo.uploadedAt)} · ${formatBytes(photo.size)}`;
  els.lightboxDownload.href = API.photo(photo.id);
  els.lightboxDownload.setAttribute('download', photo.filename);
  els.lightboxDelete.dataset.id = photo.id;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  els.lightbox.hidden = true;
  document.body.style.overflow = '';
  resetDeleteArm();
}

function resetDeleteArm() {
  deleteArmed = false;
  clearTimeout(deleteTimer);
  els.lightboxDelete.textContent = 'মুছে ফেলো';
  els.lightboxDelete.classList.remove('confirming');
}

async function handleDeleteClick() {
  const id = els.lightboxDelete.dataset.id;

  if (!deleteArmed) {
    deleteArmed = true;
    els.lightboxDelete.textContent = 'সত্যিই মুছবে?';
    els.lightboxDelete.classList.add('confirming');
    deleteTimer = setTimeout(resetDeleteArm, 4000);
    return;
  }

  clearTimeout(deleteTimer);
  els.lightboxDelete.textContent = 'মুছে ফেলা হচ্ছে...';

  try {
    const res = await fetch(API.photo(id), { method: 'DELETE' });
    if (!res.ok) throw new Error('delete failed');
    photos = photos.filter((p) => p.id !== id);
    renderGrid();
    closeLightbox();
    setStatus('ছবিটা মুছে ফেলা হয়েছে');
  } catch (err) {
    setStatus('মুছতে সমস্যা হয়েছে', 'error');
    resetDeleteArm();
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadFile(file) {
  if (!file.type.startsWith('image/')) {
    setStatus(`${file.name} — এটা ছবি না, বাদ দেওয়া হলো`, 'error');
    return;
  }
  if (file.size > MAX_BYTES) {
    setStatus(`${file.name} — সাইজ ৪ এমবি-র বেশি`, 'error');
    return;
  }

  setStatus(`${file.name} আপলোড হচ্ছে...`);

  try {
    const base64 = await fileToBase64(file);
    const res = await fetch(API.upload, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type, data: base64 }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'upload failed');
    setStatus(`${file.name} সংরক্ষিত হলো`);
    await loadPhotos();
  } catch (err) {
    setStatus(`${file.name} আপলোড ব্যর্থ হয়েছে`, 'error');
  }
}

async function handleFiles(fileList) {
  for (const file of Array.from(fileList)) {
    await uploadFile(file);
  }
}

// Upload zone interactions
els.dropzone.addEventListener('click', () => els.fileInput.click());
els.dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    els.fileInput.click();
  }
});

els.fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
  e.target.value = '';
});

['dragenter', 'dragover'].forEach((evt) =>
  els.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropzone.classList.add('dragover');
  })
);

['dragleave', 'drop'].forEach((evt) =>
  els.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('dragover');
  })
);

els.dropzone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});

// Lightbox interactions
els.lightbox.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.lightbox.hidden) closeLightbox();
});

els.lightboxDelete.addEventListener('click', handleDeleteClick);

loadPhotos();

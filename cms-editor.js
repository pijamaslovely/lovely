/**
 * LOVELY CMS - IN-PAGE VISUAL EDITOR
 * Sistema de edición visual en vivo para Lovely Store Pijamas
 */

(function () {
  'use strict';

  // Configuración por defecto
  const DEFAULT_CONFIG = {
    adminPin: '1234',
    githubRepo: 'pijamaslovely/lovely',
    githubBranch: 'main',
    githubFilePath: 'index.html',
    githubToken: ''
  };

  // Cargar configuración guardada
  function getConfig() {
    try {
      const saved = localStorage.getItem('lovely_cms_config');
      return saved ? Object.assign({}, DEFAULT_CONFIG, JSON.parse(saved)) : Object.assign({}, DEFAULT_CONFIG);
    } catch (e) {
      return Object.assign({}, DEFAULT_CONFIG);
    }
  }

  function saveConfig(cfg) {
    localStorage.setItem('lovely_cms_config', JSON.stringify(cfg));
  }

  let isEditMode = false;
  let isPreviewMode = false;
  let currentTargetEl = null;

  // Inicialización al cargar la página
  window.addEventListener('DOMContentLoaded', initCMS);

  function initCMS() {
    injectCMSUI();
    bindEvents();
    checkAutoLogin();
  }

  // Comprobar si se ingresó con ?admin=1 o ya estaba autenticado en la sesión
  function checkAutoLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === '1' || sessionStorage.getItem('lovely_cms_auth') === '1') {
      enterEditMode();
    }
  }

  // Inyectar HTML del CMS (Barra superior, Modales, Notificaciones Toast)
  function injectCMSUI() {
    // 1. Barra superior
    const bar = document.createElement('div');
    bar.id = 'lovely-cms-bar';
    bar.innerHTML = `
      <div class="cms-bar-brand">
        <span style="font-size:1.2rem;">🌸</span>
        <span>Lovely CMS</span>
        <span class="cms-brand-badge">Modo Editor</span>
      </div>
      <div class="cms-bar-actions">
        <button class="cms-btn cms-btn-preview" id="cms-btn-preview" title="Ocultar recuadros para ver cómo queda">
          <span>👁️</span> <span id="cms-preview-text">Previsualizar</span>
        </button>
        <button class="cms-btn cms-btn-save" id="cms-btn-download" title="Descargar copia del index.html">
          <span>💾</span> <span>Descargar HTML</span>
        </button>
        <button class="cms-btn cms-btn-publish" id="cms-btn-publish" title="Subir cambios a GitHub Pages">
          <span>🚀</span> <span>Publicar en la Web</span>
        </button>
        <button class="cms-btn cms-btn-settings" id="cms-btn-settings" title="Configurar GitHub y Clave">
          <span>⚙️</span>
        </button>
        <button class="cms-btn cms-btn-exit" id="cms-btn-exit" title="Cerrar modo editor">
          <span>✖</span> <span>Salir</span>
        </button>
      </div>
    `;
    document.body.appendChild(bar);

    // 2. Modal de Edición
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'cms-modal-overlay';
    modalOverlay.className = 'cms-modal-overlay';
    modalOverlay.innerHTML = `
      <div class="cms-modal" id="cms-modal-container">
        <div class="cms-modal-header">
          <h3 id="cms-modal-title">✏️ Editar elemento</h3>
          <button class="cms-modal-close" id="cms-modal-close-btn">&times;</button>
        </div>
        <div id="cms-modal-body">
          <!-- Dinámico -->
        </div>
        <div class="cms-modal-footer">
          <button class="cms-btn cms-btn-preview" id="cms-modal-cancel-btn">Cancelar</button>
          <button class="cms-btn cms-btn-publish" id="cms-modal-save-btn">Guardar cambios</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalOverlay);

    // 3. Contenedor de Toast
    const toast = document.createElement('div');
    toast.id = 'cms-toast';
    toast.className = 'cms-toast';
    document.body.appendChild(toast);
  }

  // Notificaciones Toast
  function showToast(msg, type = 'info', duration = 3500) {
    const toast = document.getElementById('cms-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `cms-toast show ${type}`;
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // Control del Modo Editor
  function enterEditMode() {
    isEditMode = true;
    isPreviewMode = false;
    sessionStorage.setItem('lovely_cms_auth', '1');
    document.body.classList.add('cms-active');
    document.body.classList.remove('cms-preview-mode');
    document.getElementById('lovely-cms-bar').classList.add('active');
    updatePreviewButtonState();
    showToast('✨ Modo Editor activado. Haz clic en cualquier sección o texto para cambiarlo.', 'success', 4000);
  }

  function exitEditMode() {
    isEditMode = false;
    isPreviewMode = false;
    sessionStorage.removeItem('lovely_cms_auth');
    document.body.classList.remove('cms-active', 'cms-preview-mode');
    document.getElementById('lovely-cms-bar').classList.remove('active');
    showToast('Modo editor cerrado', 'info');
  }

  function togglePreviewMode() {
    isPreviewMode = !isPreviewMode;
    document.body.classList.toggle('cms-preview-mode', isPreviewMode);
    updatePreviewButtonState();
    if (isPreviewMode) {
      showToast('👁️ Modo vista previa: Así lo ven tus clientes.', 'info', 2500);
    } else {
      showToast('✏️ Modo edición reactivado.', 'info', 2000);
    }
  }

  function updatePreviewButtonState() {
    const btn = document.getElementById('cms-btn-preview');
    const txt = document.getElementById('cms-preview-text');
    if (isPreviewMode) {
      btn.classList.add('active');
      txt.textContent = 'Volver a Editar';
    } else {
      btn.classList.remove('active');
      txt.textContent = 'Previsualizar';
    }
  }

  // Interacción y eventos de la página
  function bindEvents() {
    // Botón de barra
    document.getElementById('cms-btn-preview').addEventListener('click', togglePreviewMode);
    document.getElementById('cms-btn-exit').addEventListener('click', exitEditMode);
    document.getElementById('cms-btn-settings').addEventListener('click', openSettingsModal);
    document.getElementById('cms-btn-download').addEventListener('click', downloadUpdatedHTML);
    document.getElementById('cms-btn-publish').addEventListener('click', publishToGitHub);

    // Modal cerrar
    document.getElementById('cms-modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('cms-modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('cms-modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'cms-modal-overlay') closeModal();
    });

    // Delegación de clic sobre elementos editables [data-cms]
    document.addEventListener('click', function (e) {
      if (!isEditMode || isPreviewMode) return;

      // Ignorar clics dentro de la barra o modales del CMS
      if (e.target.closest('#lovely-cms-bar') || e.target.closest('#cms-modal-overlay') || e.target.closest('.cms-admin-trigger')) {
        return;
      }

      const editableEl = e.target.closest('[data-cms]');
      if (editableEl) {
        e.preventDefault();
        e.stopPropagation();
        openEditorForElement(editableEl);
      }
    }, true);

    // Atajo de teclado: Ctrl + Shift + E para activar el modo editor
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && (e.key === 'E' || e.key === 'e') && e.shiftKey) {
        e.preventDefault();
        if (isEditMode) {
          exitEditMode();
        } else {
          promptAdminLogin();
        }
      }
    });

    // Enlace de admin en el footer
    const adminLink = document.getElementById('cms-admin-login-link');
    if (adminLink) {
      adminLink.addEventListener('click', function (e) {
        e.preventDefault();
        promptAdminLogin();
      });
    }
  }

  // Solicitar PIN de Administrador
  function promptAdminLogin() {
    const config = getConfig();
    const pin = prompt('🔐 Ingresa la clave/PIN de Administrador (Por defecto: 1234):');
    if (pin === null) return;
    if (pin.trim() === config.adminPin) {
      enterEditMode();
    } else {
      alert('❌ Clave incorrecta.');
    }
  }

  // Abrir Modal de Edición según el tipo de elemento
  function openEditorForElement(el) {
    currentTargetEl = el;
    const cmsId = el.getAttribute('data-cms');
    const cmsType = el.getAttribute('data-cms-type') || detectElementType(el);
    const cmsLabel = el.getAttribute('data-cms-label') || 'Elemento';

    const titleEl = document.getElementById('cms-modal-title');
    const bodyEl = document.getElementById('cms-modal-body');
    titleEl.innerHTML = `✏️ Editar: <em>${cmsLabel}</em>`;

    bodyEl.innerHTML = '';

    if (cmsType === 'image') {
      renderImageEditor(el, bodyEl);
    } else if (cmsType === 'link') {
      renderLinkEditor(el, bodyEl);
    } else if (cmsType === 'card') {
      renderCardEditor(el, bodyEl);
    } else {
      renderTextEditor(el, bodyEl);
    }

    openModal();
  }

  function detectElementType(el) {
    if (el.tagName === 'IMG') return 'image';
    if (el.tagName === 'A' || el.classList.contains('product-wa-btn') || el.classList.contains('cta-btn-wa')) return 'link';
    if (el.classList.contains('product-card')) return 'card';
    return 'text';
  }

  // 1. Editor de Texto / Títulos
  function renderTextEditor(el, container) {
    const isMultiline = el.innerHTML.includes('<br>') || el.innerText.length > 80 || el.tagName === 'P' || el.tagName === 'DIV';
    const currentVal = el.innerHTML.trim();

    container.innerHTML = `
      <div class="cms-form-group">
        <label class="cms-form-label">Contenido / Texto:</label>
        ${isMultiline 
          ? `<textarea id="cms-field-text" class="cms-textarea" rows="6">${escapeHtml(currentVal)}</textarea>`
          : `<input type="text" id="cms-field-text" class="cms-input" value="${escapeHtml(currentVal)}"/>`
        }
        <div class="cms-form-help">Tip: Puedes usar etiquetas como &lt;br/&gt; para saltos de línea o &lt;em&gt;texto&lt;/em&gt; para cursiva.</div>
      </div>
    `;

    document.getElementById('cms-modal-save-btn').onclick = function () {
      const newVal = document.getElementById('cms-field-text').value;
      el.innerHTML = newVal;
      closeModal();
      showToast('✅ Texto actualizado con éxito.', 'success');
    };
  }

  // Utilidades para Optimización y Subida de Imágenes
  const PRESET_IMAGES = [
    '1Carrusel.jpg', '2Carrusel.jpg', '3Carrusel.jpg', '4Carrusel.jpg', '5Carrusel.jpg',
    '6Carrusel.jpg', '7Carrusel.jpg', '8Carrusel.jpg', '9Carrusel.jpg', '10Carrusel.jpg',
    'logo.png'
  ];

  function optimizeImage(file, maxDimension = 1200, quality = 0.85) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          canvas.toBlob((blob) => {
            resolve({ dataUrl, blob, width, height });
          }, 'image/jpeg', quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadImageToGitHub(blob, filename) {
    const config = getConfig();
    if (!config.githubToken) {
      throw new Error('Debes ingresar tu Token de GitHub en Configuración (⚙️) para subir fotos directamente a tu repositorio.');
    }

    const arrayBuffer = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Content = btoa(binary);

    const repo = config.githubRepo || 'pijamaslovely/lovely';
    const branch = config.githubBranch || 'main';
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${filename}?ref=${branch}`;

    let currentSha = null;
    try {
      const checkRes = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (checkRes.ok) {
        const existing = await checkRes.json();
        currentSha = existing.sha;
      }
    } catch (e) {}

    const putBody = {
      message: `Subir imagen ${filename} desde Lovely CMS`,
      content: base64Content,
      branch: branch
    };
    if (currentSha) putBody.sha = currentSha;

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(putBody)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Error al subir la foto a GitHub');
    }

    return filename;
  }

  // 2. Editor de Imágenes (Carrusel o foto individual)
  function renderImageEditor(el, container) {
    const isImg = el.tagName === 'IMG';
    const currentSrc = isImg ? el.getAttribute('src') : (el.querySelector('img')?.getAttribute('src') || '');
    const currentAlt = isImg ? el.getAttribute('alt') || '' : '';

    let pendingBlob = null;
    let pendingDataUrl = null;
    let pendingFilename = '';

    container.innerHTML = `
      <div style="background:#fff8fc; border:1.5px solid #f48dc1; border-radius:14px; padding:16px; margin-bottom:16px;">
        <label class="cms-form-label" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span>📸 Foto actual / nueva:</span>
          <span id="cms-img-status" style="font-size:0.75rem; color:#888;"></span>
        </label>
        
        <div style="display:flex; gap:14px; align-items:center; margin-bottom:14px;">
          <div style="width:90px; height:90px; border-radius:12px; overflow:hidden; border:2px solid var(--cms-primary); background:#fff; flex-shrink:0; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.06);">
            <img id="cms-img-preview" src="${currentSrc || 'logo.png'}" alt="Previsualización" style="width:100%; height:100%; object-fit:cover;"/>
          </div>
          <div style="flex:1;">
            <label class="cms-btn" style="background:var(--cms-primary); color:white; cursor:pointer; display:inline-flex; align-items:center; gap:8px; margin-bottom:6px; padding:8px 16px;">
              <span>📁</span> <span>Elegir foto de mi PC o Celular</span>
              <input type="file" id="cms-file-upload" accept="image/*" style="display:none;"/>
            </label>
            <div style="font-size:0.75rem; color:#666;">Formatos: JPG, PNG, WEBP. Se optimiza automáticamente.</div>
          </div>
        </div>

        <div id="cms-github-upload-box" style="display:none; background:#f0fff4; border:1.5px solid #bbf7d0; border-radius:10px; padding:12px; margin-bottom:14px;">
          <div style="font-size:0.82rem; color:#15803d; font-weight:700; margin-bottom:6px;">
            ✨ Nueva foto lista: <span id="cms-file-name-display"></span>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" id="cms-upload-github-btn" class="cms-btn" style="background:#25D366; color:white; font-size:0.82rem; padding:6px 14px;">
              <span>☁️</span> <span>Subir archivo a GitHub ahora</span>
            </button>
            <span id="cms-github-upload-msg" style="font-size:0.75rem; color:#666;">(O se aplicará al guardar)</span>
          </div>
        </div>

        <div class="cms-form-group" style="margin-bottom:8px;">
          <label class="cms-form-label" style="font-size:0.8rem;">O elegir una foto existente del catálogo:</label>
          <select id="cms-select-preset" class="cms-select" style="font-size:0.85rem;">
            <option value="">-- Seleccionar imagen de la tienda --</option>
            ${PRESET_IMAGES.map(img => `<option value="${img}" ${currentSrc === img ? 'selected' : ''}>${img}</option>`).join('')}
          </select>
        </div>

        <div class="cms-form-group" style="margin-bottom:0;">
          <label class="cms-form-label" style="font-size:0.8rem;">Ruta o URL del archivo:</label>
          <input type="text" id="cms-img-src" class="cms-input" value="${currentSrc}" placeholder="Ej: 1Carrusel.jpg o URL web" style="font-size:0.85rem;"/>
        </div>
      </div>

      ${isImg ? `
      <div class="cms-form-group">
        <label class="cms-form-label">Descripción de la imagen (SEO / Accesibilidad):</label>
        <input type="text" id="cms-img-alt" class="cms-input" value="${escapeHtml(currentAlt)}"/>
      </div>` : ''}
    `;

    const imgPreview = document.getElementById('cms-img-preview');
    const imgSrcInput = document.getElementById('cms-img-src');
    const selectPreset = document.getElementById('cms-select-preset');
    const fileUpload = document.getElementById('cms-file-upload');
    const githubBox = document.getElementById('cms-github-upload-box');
    const fileNameDisplay = document.getElementById('cms-file-name-display');
    const uploadGithubBtn = document.getElementById('cms-upload-github-btn');
    const imgStatus = document.getElementById('cms-img-status');

    selectPreset.addEventListener('change', function () {
      if (this.value) {
        imgSrcInput.value = this.value;
        imgPreview.src = this.value;
        githubBox.style.display = 'none';
        pendingBlob = null;
        pendingDataUrl = null;
        imgStatus.textContent = 'Foto de catálogo seleccionada';
      }
    });

    imgSrcInput.addEventListener('input', function () {
      imgPreview.src = this.value;
    });

    fileUpload.addEventListener('change', async function (e) {
      const file = e.target.files[0];
      if (!file) return;

      imgStatus.textContent = 'Optimizando foto...';
      const optimized = await optimizeImage(file);
      pendingBlob = optimized.blob;
      pendingDataUrl = optimized.dataUrl;

      // Generar nombre de archivo limpio
      const cleanName = file.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9.]/g, '-')
        .replace(/-+/g, '-');
      pendingFilename = cleanName.endsWith('.jpg') || cleanName.endsWith('.jpeg') ? cleanName : `${cleanName}.jpg`;

      imgPreview.src = pendingDataUrl;
      imgSrcInput.value = pendingFilename;
      fileNameDisplay.textContent = pendingFilename;
      githubBox.style.display = 'block';
      imgStatus.textContent = `Lista (${Math.round(optimized.blob.size / 1024)} KB)`;
    });

    uploadGithubBtn.addEventListener('click', async function () {
      if (!pendingBlob) return;
      uploadGithubBtn.disabled = true;
      uploadGithubBtn.innerHTML = '<span>⏳</span> <span>Subiendo a GitHub...</span>';
      try {
        const savedName = await uploadImageToGitHub(pendingBlob, pendingFilename);
        imgSrcInput.value = savedName;
        document.getElementById('cms-github-upload-msg').innerHTML = `<strong style="color:#15803d;">✅ Subida a GitHub: ${savedName}</strong>`;
        showToast('🎉 Foto subida a tu repositorio de GitHub', 'success');
      } catch (err) {
        alert(`❌ Error al subir imagen a GitHub:\n${err.message}`);
        showToast('Error al subir imagen a GitHub', 'error');
      } finally {
        uploadGithubBtn.disabled = false;
        uploadGithubBtn.innerHTML = '<span>☁️</span> <span>Subir archivo a GitHub ahora</span>';
      }
    });

    document.getElementById('cms-modal-save-btn').onclick = function () {
      const targetImg = isImg ? el : el.querySelector('img');
      let finalSrc = imgSrcInput.value.trim();

      // Si seleccionó una foto local y no la subió a GitHub aún, usar la dataURL para previsualización inmediata
      if (pendingDataUrl && finalSrc === pendingFilename) {
        finalSrc = pendingDataUrl;
      }

      if (targetImg && finalSrc) {
        targetImg.setAttribute('src', finalSrc);
      }
      if (isImg && document.getElementById('cms-img-alt')) {
        targetImg.setAttribute('alt', document.getElementById('cms-img-alt').value);
      }
      closeModal();
      showToast('✅ Foto actualizada con éxito.', 'success');
    };
  }

  // 3. Editor de Enlaces y Botones (Con generador de WhatsApp)
  function renderLinkEditor(el, container) {
    const currentHref = el.getAttribute('href') || '';
    const textNode = el.querySelector('span') || el;
    const currentText = textNode.textContent.trim();

    const isWa = currentHref.includes('wa.me') || currentHref.includes('whatsapp.com');
    let waPhone = '573142168781';
    let waMsg = '';

    if (isWa) {
      const match = currentHref.match(/wa\.me\/(?:c\/)?(\d+)/);
      if (match) waPhone = match[1];
      const msgMatch = currentHref.match(/text=([^&]+)/);
      if (msgMatch) {
        try {
          waMsg = decodeURIComponent(msgMatch[1]);
        } catch (e) {
          waMsg = msgMatch[1];
        }
      }
    }

    container.innerHTML = `
      <div class="cms-form-group">
        <label class="cms-form-label">Texto del Botón / Enlace:</label>
        <input type="text" id="cms-link-text" class="cms-input" value="${escapeHtml(currentText)}"/>
      </div>
      <div class="cms-form-group">
        <label class="cms-form-label">Enlace de destino (URL):</label>
        <input type="text" id="cms-link-href" class="cms-input" value="${escapeHtml(currentHref)}"/>
      </div>
      <div style="background:#f0fff4; border:1.5px solid #bbf7d0; border-radius:12px; padding:14px; margin-top:16px;">
        <h4 style="margin:0 0 10px; font-size:0.9rem; color:#15803d; display:flex; align-items:center; gap:6px;">
          <span>💬</span> Generador de Enlace de WhatsApp
        </h4>
        <div class="cms-form-group">
          <label class="cms-form-label" style="font-size:0.8rem;">Número de WhatsApp (con código de país, ej: 573142168781):</label>
          <input type="text" id="cms-wa-phone" class="cms-input" value="${waPhone}"/>
        </div>
        <div class="cms-form-group">
          <label class="cms-form-label" style="font-size:0.8rem;">Mensaje predeterminado:</label>
          <input type="text" id="cms-wa-msg" class="cms-input" value="${escapeHtml(waMsg)}" placeholder="Ej: ¡Hola! Quiero información sobre la pijama..."/>
        </div>
        <button type="button" id="cms-wa-apply-btn" class="cms-btn" style="background:#25D366; color:white; font-size:0.8rem; padding:6px 12px;">
          Aplicar a este enlace
        </button>
      </div>
    `;

    document.getElementById('cms-wa-apply-btn').addEventListener('click', function () {
      const phone = document.getElementById('cms-wa-phone').value.trim();
      const msg = document.getElementById('cms-wa-msg').value.trim();
      if (!phone) {
        alert('Por favor indica un número de teléfono.');
        return;
      }
      let finalWa = `https://wa.me/${phone}`;
      if (msg) finalWa += `?text=${encodeURIComponent(msg)}`;
      document.getElementById('cms-link-href').value = finalWa;
      showToast('Enlace de WhatsApp generado', 'info');
    });

    document.getElementById('cms-modal-save-btn').onclick = function () {
      const newText = document.getElementById('cms-link-text').value.trim();
      const newHref = document.getElementById('cms-link-href').value.trim();

      if (el.querySelector('span')) {
        el.querySelector('span').textContent = newText;
      } else {
        const svg = el.querySelector('svg');
        if (svg) {
          el.innerHTML = '';
          el.appendChild(svg);
          el.appendChild(document.createTextNode(' ' + newText));
        } else {
          el.textContent = newText;
        }
      }

      if (newHref) el.setAttribute('href', newHref);
      closeModal();
      showToast('✅ Botón/Enlace actualizado.', 'success');
    };
  }

  // 4. Editor de Tarjeta de Producto
  function renderCardEditor(el, container) {
    const imgEl = el.querySelector('img');
    const badgeEl = el.querySelector('.product-badge');
    const titleEl = el.querySelector('h3');
    const descEl = el.querySelector('.product-info p');
    const btnEl = el.querySelector('.product-wa-btn');

    const imgSrc = imgEl ? imgEl.getAttribute('src') : '';
    const badgeText = badgeEl ? badgeEl.textContent.trim() : '';
    const titleText = titleEl ? titleEl.textContent.trim() : '';
    const descText = descEl ? descEl.textContent.trim() : '';
    const btnHref = btnEl ? btnEl.getAttribute('href') : '';
    const btnText = btnEl ? (btnEl.querySelector('span')?.textContent.trim() || btnEl.textContent.trim()) : '';

    let pendingBlob = null;
    let pendingDataUrl = null;
    let pendingFilename = '';

    container.innerHTML = `
      <div class="cms-form-group">
        <label class="cms-form-label">Nombre del Producto / Pijama:</label>
        <input type="text" id="cms-prod-title" class="cms-input" value="${escapeHtml(titleText)}"/>
      </div>
      <div class="cms-form-group">
        <label class="cms-form-label">Descripción corta (Colores, tipo):</label>
        <input type="text" id="cms-prod-desc" class="cms-input" value="${escapeHtml(descText)}"/>
      </div>
      <div class="cms-form-group">
        <label class="cms-form-label">Etiqueta / Badge (Ej: 💜 Tendencia, 🎀 Nuevo):</label>
        <input type="text" id="cms-prod-badge" class="cms-input" value="${escapeHtml(badgeText)}" placeholder="Deja vacío para no mostrar etiqueta"/>
      </div>

      <!-- FOTO DEL PRODUCTO CON SUBIDA VISUAL Y GITHUB -->
      <div style="background:#fff8fc; border:1.5px solid #f48dc1; border-radius:14px; padding:14px; margin-bottom:16px;">
        <label class="cms-form-label" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span>📸 Foto del Producto:</span>
          <span id="cms-prod-img-status" style="font-size:0.75rem; color:#888;"></span>
        </label>
        
        <div style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
          <div style="width:80px; height:80px; border-radius:12px; overflow:hidden; border:2px solid var(--cms-primary); background:#fff; flex-shrink:0; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.06);">
            <img id="cms-prod-img-preview" src="${imgSrc || 'logo.png'}" alt="Previsualización" style="width:100%; height:100%; object-fit:cover;"/>
          </div>
          <div style="flex:1;">
            <label class="cms-btn" style="background:var(--cms-primary); color:white; cursor:pointer; display:inline-flex; align-items:center; gap:6px; margin-bottom:6px; padding:8px 14px;">
              <span>📁</span> <span>Subir foto desde mi equipo</span>
              <input type="file" id="cms-prod-file-upload" accept="image/*" style="display:none;"/>
            </label>
            <div style="font-size:0.75rem; color:#666;">Selecciona una foto de tu PC o celular.</div>
          </div>
        </div>

        <div id="cms-prod-github-upload-box" style="display:none; background:#f0fff4; border:1.5px solid #bbf7d0; border-radius:10px; padding:10px; margin-bottom:12px;">
          <div style="font-size:0.8rem; color:#15803d; font-weight:700; margin-bottom:6px;">
            ✨ Nueva foto lista: <span id="cms-prod-file-name-display"></span>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" id="cms-prod-upload-github-btn" class="cms-btn" style="background:#25D366; color:white; font-size:0.8rem; padding:6px 12px;">
              <span>☁️</span> <span>Subir a GitHub ahora</span>
            </button>
            <span id="cms-prod-github-upload-msg" style="font-size:0.75rem; color:#666;">(O se aplicará al guardar)</span>
          </div>
        </div>

        <div class="cms-form-group" style="margin-bottom:8px;">
          <label class="cms-form-label" style="font-size:0.8rem;">O elegir de fotos existentes:</label>
          <select id="cms-prod-select-preset" class="cms-select" style="font-size:0.85rem;">
            <option value="">-- Seleccionar imagen del catálogo --</option>
            ${PRESET_IMAGES.map(img => `<option value="${img}" ${imgSrc === img ? 'selected' : ''}>${img}</option>`).join('')}
          </select>
        </div>

        <div class="cms-form-group" style="margin-bottom:0;">
          <label class="cms-form-label" style="font-size:0.8rem;">Nombre de archivo o URL:</label>
          <input type="text" id="cms-prod-img" class="cms-input" value="${escapeHtml(imgSrc)}" placeholder="Ej: 1Carrusel.jpg o URL web" style="font-size:0.85rem;"/>
        </div>
      </div>

      <div class="cms-form-group">
        <label class="cms-form-label">Texto del botón:</label>
        <input type="text" id="cms-prod-btn-text" class="cms-input" value="${escapeHtml(btnText)}"/>
      </div>
      <div class="cms-form-group">
        <label class="cms-form-label">Enlace al catálogo / WhatsApp:</label>
        <input type="text" id="cms-prod-btn-href" class="cms-input" value="${escapeHtml(btnHref)}"/>
      </div>
    `;

    const prodImgPreview = document.getElementById('cms-prod-img-preview');
    const prodImgInput = document.getElementById('cms-prod-img');
    const prodSelectPreset = document.getElementById('cms-prod-select-preset');
    const prodFileUpload = document.getElementById('cms-prod-file-upload');
    const prodGithubBox = document.getElementById('cms-prod-github-upload-box');
    const prodFileNameDisplay = document.getElementById('cms-prod-file-name-display');
    const prodUploadGithubBtn = document.getElementById('cms-prod-upload-github-btn');
    const prodImgStatus = document.getElementById('cms-prod-img-status');

    prodSelectPreset.addEventListener('change', function () {
      if (this.value) {
        prodImgInput.value = this.value;
        prodImgPreview.src = this.value;
        prodGithubBox.style.display = 'none';
        pendingBlob = null;
        pendingDataUrl = null;
        prodImgStatus.textContent = 'Foto de catálogo seleccionada';
      }
    });

    prodImgInput.addEventListener('input', function () {
      prodImgPreview.src = this.value;
    });

    prodFileUpload.addEventListener('change', async function (e) {
      const file = e.target.files[0];
      if (!file) return;

      prodImgStatus.textContent = 'Optimizando foto...';
      const optimized = await optimizeImage(file);
      pendingBlob = optimized.blob;
      pendingDataUrl = optimized.dataUrl;

      // Generar nombre de archivo basado en el título del producto si existe
      const prodTitle = document.getElementById('cms-prod-title').value.trim();
      const baseName = prodTitle ? prodTitle : file.name.replace(/\.[^/.]+$/, '');
      const cleanBase = baseName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      pendingFilename = `pijama-${cleanBase}.jpg`;

      prodImgPreview.src = pendingDataUrl;
      prodImgInput.value = pendingFilename;
      prodFileNameDisplay.textContent = pendingFilename;
      prodGithubBox.style.display = 'block';
      prodImgStatus.textContent = `Lista (${Math.round(optimized.blob.size / 1024)} KB)`;
    });

    prodUploadGithubBtn.addEventListener('click', async function () {
      if (!pendingBlob) return;
      prodUploadGithubBtn.disabled = true;
      prodUploadGithubBtn.innerHTML = '<span>⏳</span> <span>Subiendo a GitHub...</span>';
      try {
        const savedName = await uploadImageToGitHub(pendingBlob, pendingFilename);
        prodImgInput.value = savedName;
        document.getElementById('cms-prod-github-upload-msg').innerHTML = `<strong style="color:#15803d;">✅ Subida a GitHub: ${savedName}</strong>`;
        showToast('🎉 Foto subida a tu repositorio de GitHub', 'success');
      } catch (err) {
        alert(`❌ Error al subir imagen a GitHub:\n${err.message}`);
        showToast('Error al subir imagen a GitHub', 'error');
      } finally {
        prodUploadGithubBtn.disabled = false;
        prodUploadGithubBtn.innerHTML = '<span>☁️</span> <span>Subir a GitHub ahora</span>';
      }
    });

    document.getElementById('cms-modal-save-btn').onclick = function () {
      if (titleEl) titleEl.textContent = document.getElementById('cms-prod-title').value.trim();
      if (descEl) descEl.textContent = document.getElementById('cms-prod-desc').value.trim();
      
      const newBadge = document.getElementById('cms-prod-badge').value.trim();
      if (newBadge) {
        if (badgeEl) {
          badgeEl.textContent = newBadge;
          badgeEl.style.display = '';
        } else {
          const wrap = el.querySelector('.product-img-wrap');
          if (wrap) {
            const newBadgeEl = document.createElement('span');
            newBadgeEl.className = 'product-badge';
            newBadgeEl.textContent = newBadge;
            wrap.appendChild(newBadgeEl);
          }
        }
      } else if (badgeEl) {
        badgeEl.remove();
      }

      let finalImg = prodImgInput.value.trim();
      if (pendingDataUrl && finalImg === pendingFilename) {
        finalImg = pendingDataUrl;
      }
      if (imgEl && finalImg) imgEl.setAttribute('src', finalImg);

      if (btnEl) {
        const span = btnEl.querySelector('span');
        if (span) span.textContent = document.getElementById('cms-prod-btn-text').value.trim();
        btnEl.setAttribute('href', document.getElementById('cms-prod-btn-href').value.trim());
      }

      closeModal();
      showToast('✅ Producto actualizado con éxito.', 'success');
    };
  }

  // Modal de Configuración (GitHub API Token, Cambiar PIN)
  function openSettingsModal() {
    const config = getConfig();
    const titleEl = document.getElementById('cms-modal-title');
    const bodyEl = document.getElementById('cms-modal-body');
    titleEl.innerHTML = `⚙️ Configuración del CMS`;

    bodyEl.innerHTML = `
      <div class="cms-form-group">
        <label class="cms-form-label">Clave / PIN de Administrador:</label>
        <input type="password" id="cms-cfg-pin" class="cms-input" value="${config.adminPin}"/>
        <div class="cms-form-help">Usa este PIN para iniciar sesión en el modo edición.</div>
      </div>
      <hr style="border:0; border-top:1px solid #fce4f0; margin:16px 0;"/>
      <h4 style="margin:0 0 8px; color:var(--cms-primary-dark); font-size:0.95rem;">🚀 Publicación Automática en GitHub Pages</h4>
      <div class="cms-form-group">
        <label class="cms-form-label">Repositorio de GitHub (usuario/repo):</label>
        <input type="text" id="cms-cfg-repo" class="cms-input" value="${config.githubRepo}"/>
      </div>
      <div class="cms-form-group">
        <label class="cms-form-label">Rama principal:</label>
        <input type="text" id="cms-cfg-branch" class="cms-input" value="${config.githubBranch}"/>
      </div>
      <div class="cms-form-group">
        <label class="cms-form-label">Token de GitHub (Personal Access Token):</label>
        <input type="password" id="cms-cfg-token" class="cms-input" value="${config.githubToken}" placeholder="ghp_xxxxxxxxxxxxxx"/>
        <div class="cms-form-help">
          Permite que el botón "Publicar en la Web" guarde los cambios directamente en tu GitHub sin tocar código.
          <br/><a href="https://github.com/settings/tokens/new?scopes=repo&description=Lovely+CMS+Editor" target="_blank" rel="noopener" style="color:var(--cms-primary); font-weight:700;">Crear token en GitHub (permiso 'repo') &rarr;</a>
        </div>
      </div>
    `;

    document.getElementById('cms-modal-save-btn').onclick = function () {
      const newPin = document.getElementById('cms-cfg-pin').value.trim() || '1234';
      const newRepo = document.getElementById('cms-cfg-repo').value.trim() || 'pijamaslovely/lovely';
      const newBranch = document.getElementById('cms-cfg-branch').value.trim() || 'main';
      const newToken = document.getElementById('cms-cfg-token').value.trim();

      saveConfig({
        adminPin: newPin,
        githubRepo: newRepo,
        githubBranch: newBranch,
        githubFilePath: 'index.html',
        githubToken: newToken
      });

      closeModal();
      showToast('✅ Configuración guardada correctamente.', 'success');
    };

    openModal();
  }

  // Generador de HTML Limpio para guardar / publicar
  function generateCleanHTML() {
    // Clonar el DOM actual
    const docClone = document.documentElement.cloneNode(true);

    // Remover clases temporales del CMS
    docClone.classList.remove('cms-active', 'cms-preview-mode');
    const bodyClone = docClone.querySelector('body');
    if (bodyClone) {
      bodyClone.classList.remove('cms-active', 'cms-preview-mode');
      bodyClone.removeAttribute('style');
    }

    // Remover interfaz inyectada del CMS para no duplicar en el archivo fuente
    const cmsBar = docClone.querySelector('#lovely-cms-bar');
    if (cmsBar) cmsBar.remove();
    const cmsModal = docClone.querySelector('#cms-modal-overlay');
    if (cmsModal) cmsModal.remove();
    const cmsToast = docClone.querySelector('#cms-toast');
    if (cmsToast) cmsToast.remove();

    // Obtener string final HTML5
    const htmlString = '<!DOCTYPE html>\n' + docClone.outerHTML;
    return htmlString;
  }

  // Descarga del archivo index.html actualizado
  function downloadUpdatedHTML() {
    const cleanHtml = generateCleanHTML();
    const blob = new Blob([cleanHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('💾 index.html descargado listo para reemplazo.', 'success');
  }

  // Publicación directa en GitHub mediante GitHub API
  async function publishToGitHub() {
    const config = getConfig();
    if (!config.githubToken) {
      showToast('⚠️ Debes ingresar tu Token de GitHub en Configuración (⚙️)', 'error', 4000);
      openSettingsModal();
      return;
    }

    const publishBtn = document.getElementById('cms-btn-publish');
    const originalText = publishBtn.innerHTML;
    publishBtn.innerHTML = '<span>⏳</span> <span>Publicando...</span>';
    publishBtn.disabled = true;

    try {
      const repo = config.githubRepo;
      const branch = config.githubBranch || 'main';
      const path = config.githubFilePath || 'index.html';
      const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;

      // 1. Obtener SHA actual del archivo
      showToast('Obteniendo versión actual de GitHub...', 'info', 2000);
      const getRes = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!getRes.ok) {
        throw new Error(`No se pudo leer el archivo en GitHub (Código: ${getRes.status})`);
      }

      const fileData = await getRes.json();
      const currentSha = fileData.sha;

      // 2. Generar el nuevo HTML y codificarlo en UTF-8 Base64
      const newHtml = generateCleanHTML();
      const encodedContent = btoa(unescape(encodeURIComponent(newHtml)));

      // 3. Enviar actualización (commit)
      showToast('Guardando cambios en GitHub...', 'info', 2500);
      const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Actualización de contenido desde Lovely CMS [${new Date().toLocaleString('es-CO')}]`,
          content: encodedContent,
          sha: currentSha,
          branch: branch
        })
      });

      if (!putRes.ok) {
        const errorData = await putRes.json();
        throw new Error(errorData.message || 'Error al guardar en GitHub');
      }

      showToast('🎉 ¡Publicado con éxito! Tu sitio se actualizará en ~30 segundos.', 'success', 6000);
    } catch (err) {
      console.error(err);
      alert(`❌ Error al publicar en GitHub:\n${err.message}\n\nRevisa tu Token y permisos en el botón de Configuración (⚙️).`);
      showToast('Error al publicar en GitHub', 'error');
    } finally {
      publishBtn.innerHTML = originalText;
      publishBtn.disabled = false;
    }
  }

  // Utilidades del Modal
  function openModal() {
    document.getElementById('cms-modal-overlay').classList.add('active');
  }

  function closeModal() {
    document.getElementById('cms-modal-overlay').classList.remove('active');
    currentTargetEl = null;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

})();

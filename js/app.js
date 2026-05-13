/* =============================================================
 * GIAFER y JOAKO 🛖 — Sistema de Caja y Control de Fiados
 * Archivo  : js/app.js
 * Propósito: Controlador JS único compartido por todas las páginas.
 *
 * ARQUITECTURA:
 *  1.  Configuración global
 *  2.  Gestión de estado — localStorage
 *  3.  Módulo de autenticación
 *  4.  Funciones utilitarias (helpers)
 *  5.  Sistema de alertas (toast)
 *  6.  Navegación compartida (navbar)
 *  7.  Página: Login         (login.html)
 *  8.  Página: Dashboard     (index.html)
 *  9.  Página: Ventas        (ventas.html)
 *  10. Página: Deudas/Fiados (deudas.html)
 *  11. Punto de entrada (DOMContentLoaded)
 * ============================================================= */


/* ─────────────────────────────────────────────────────────────
 * 1. CONFIGURACIÓN GLOBAL
 *    Cambia las credenciales aquí si necesitas actualizar el acceso.
 * ───────────────────────────────────────────────────────────── */
const CONFIG = {
  credentials: {
    username: 'cleto',  // Usuario del sistema
    password: '123'     // Contraseña del sistema
  },
  storageKey: 'elPibe_data',    // Clave de datos en localStorage
  sessionKey: 'elPibe_session'  // Clave de sesión en localStorage
};


/* ─────────────────────────────────────────────────────────────
 * 2. GESTIÓN DE ESTADO — localStorage
 *    Toda lectura y escritura de datos pasa por getState/saveState.
 *    Esto centraliza la persistencia y facilita depuración.
 * ───────────────────────────────────────────────────────────── */

/**
 * Lee el estado completo desde localStorage.
 * Si no existe o está corrompido, retorna el estado inicial vacío.
 * @returns {Object} Estado de la aplicación
 */
function getState() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // localStorage corrupto: reiniciar datos para evitar crash
    console.warn('localStorage corrupto, reiniciando estado:', e);
  }
  // Estado inicial por defecto (primera vez o reset)
  return {
    wallets: {
      efectivo: 0,  // Dinero físico acumulado
      yape:     0,  // Pagos recibidos por Yape
      plin:     0   // Pagos recibidos por Plin
    },
    debtors:      [], // Perfiles de deudores/clientes al crédito
    transactions: []  // Historial global: ventas + abonos
  };
}

/**
 * Guarda el estado completo en localStorage.
 * @param {Object} state — Estado actualizado a persistir
 */
function saveState(state) {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
  } catch (e) {
    console.error('Error al guardar en localStorage:', e);
    showToast('❌ Error al guardar datos. Revisa el almacenamiento del navegador.', 'error');
  }
}


/* ─────────────────────────────────────────────────────────────
 * 3. MÓDULO DE AUTENTICACIÓN
 *    Controla la sesión del usuario y protege todas las páginas
 *    mediante authGuard(), que redirige a login si no hay sesión.
 * ───────────────────────────────────────────────────────────── */

/** @returns {boolean} true si hay sesión activa en localStorage */
function isLoggedIn() {
  return localStorage.getItem(CONFIG.sessionKey) === 'active';
}

/** Marca la sesión como activa */
function setSession() {
  localStorage.setItem(CONFIG.sessionKey, 'active');
}

/** Elimina la sesión y redirige al login */
function logout() {
  localStorage.removeItem(CONFIG.sessionKey);
  window.location.href = 'login.html';
}

/**
 * Guardia de autenticación.
 * Llama esto al inicio de TODAS las páginas excepto login.html.
 * Si no hay sesión activa, redirige automáticamente al login.
 */
function authGuard() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}


/* ─────────────────────────────────────────────────────────────
 * 4. FUNCIONES UTILITARIAS (HELPERS)
 *    Pequeñas funciones puras reutilizables en todo el sistema.
 * ───────────────────────────────────────────────────────────── */

/** Genera un ID único basado en timestamp + número aleatorio */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * Formatea un número como moneda peruana S/ con 2 decimales.
 * @param {number} amount
 * @returns {string} Ej: "S/ 125.50"
 */
function formatCurrency(amount) {
  return 'S/ ' + (parseFloat(amount) || 0).toFixed(2);
}

/**
 * Convierte un ISO string a fecha/hora legible en español.
 * @param {string} isoString
 * @returns {string} Ej: "12/05/2025 02:30"
 */
function formatDateTime(isoString) {
  try {
    const d = new Date(isoString);
    const fecha = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora  = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} ${hora}`;
  } catch {
    return isoString; // Si falla el parseo, retornar el string crudo
  }
}

/**
 * Calcula el total de "Por Cobrar" sumando saldos de todos los deudores.
 * @param {Object} state
 * @returns {number}
 */
function getTotalReceivable(state) {
  return state.debtors.reduce((sum, d) => sum + (d.balance || 0), 0);
}

/**
 * Retorna metadatos visuales de cada método de pago.
 * Usado para renderizar emojis, etiquetas y clases CSS dinámicamente.
 * @param {string} method — 'efectivo' | 'yape' | 'plin' | 'fiado'
 * @returns {{ emoji: string, label: string, cssClass: string }}
 */
function getMethodInfo(method) {
  const map = {
    efectivo: { emoji: '💵', label: 'Efectivo', cssClass: 'method-efectivo' },
    yape:     { emoji: '🔮', label: 'Yape',     cssClass: 'method-yape'     },
    plin:     { emoji: '📱', label: 'Plin',     cssClass: 'method-plin'     },
    fiado:    { emoji: '📋', label: 'Fiado',    cssClass: 'method-fiado'    }
  };
  return map[method] || { emoji: '❓', label: method, cssClass: '' };
}

/**
 * Escapa caracteres HTML para prevenir XSS al insertar datos de usuario en el DOM.
 * SIEMPRE usar esto antes de poner datos del usuario en innerHTML.
 * @param {string} str
 * @returns {string} Texto HTML-seguro
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}


/* ─────────────────────────────────────────────────────────────
 * 5. SISTEMA DE ALERTAS — Toast Notifications
 *    Muestra mensajes temporales en la esquina superior derecha.
 *    Los estilos se inyectan en el <head> dinámicamente para que
 *    funcionen en TODAS las páginas con un único archivo JS.
 * ───────────────────────────────────────────────────────────── */

/**
 * Muestra una notificación tipo toast en pantalla.
 * @param {string} message  — Texto del mensaje
 * @param {string} type     — 'success' | 'warning' | 'error' | 'info'
 */
function showToast(message, type = 'info') {
  // Eliminar toasts previos para evitar acumulación visual
  document.querySelectorAll('.app-toast').forEach(el => el.remove());

  const toast = document.createElement('div');
  toast.className = `app-toast app-toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Forzar reflow antes de animar (necesario para que la transición CSS funcione)
  requestAnimationFrame(() => toast.classList.add('app-toast--visible'));

  // Auto-cierre tras 3.5 segundos con fade-out
  setTimeout(() => {
    toast.classList.remove('app-toast--visible');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

/* Inyectar estilos del toast en el <head> una sola vez al cargar el script.
 * Al estar aquí en JS, aplican globalmente sin duplicar CSS en cada página. */
(function injectToastStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .app-toast {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      padding: 0.9rem 1.2rem;
      border-radius: 10px;
      font-size: 0.88rem;
      font-weight: 500;
      max-width: 320px;
      line-height: 1.4;
      box-shadow: 0 6px 24px rgba(0,0,0,0.55);
      transform: translateX(115%);
      transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      color: #e6edf3;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .app-toast--visible  { transform: translateX(0); }
    .app-toast--success  { background: #1a4731; border-left: 4px solid #3fb950; }
    .app-toast--warning  { background: #3d2f00; border-left: 4px solid #e3b341; }
    .app-toast--error    { background: #4a1515; border-left: 4px solid #f85149; }
    .app-toast--info     { background: #1a2a4a; border-left: 4px solid #58a6ff; }
    @media (max-width: 480px) {
      .app-toast { right: 0.5rem; left: 0.5rem; max-width: 100%; }
    }
  `;
  document.head.appendChild(style);
})();


/* ─────────────────────────────────────────────────────────────
 * 6. NAVEGACIÓN COMPARTIDA (NAVBAR)
 *    Se ejecuta en todas las páginas autenticadas.
 *    Maneja: logout, menú hamburguesa en móvil, enlace activo.
 * ───────────────────────────────────────────────────────────── */

/**
 * Inicializa todos los comportamientos del navbar.
 * Verifica la existencia de cada elemento antes de añadir listeners
 * (técnica de selectores condicionales para script único multi-página).
 */
function initSharedNav() {
  // ─ Botón de cerrar sesión ─
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('¿Deseas cerrar sesión?')) logout();
    });
  }

  // ─ Toggle hamburguesa para móvil ─
  const navToggle  = document.getElementById('navToggle');
  const navbarMenu = document.getElementById('navbarMenu');
  if (navToggle && navbarMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navbarMenu.classList.toggle('open');
      navToggle.textContent = isOpen ? '✕' : '☰';
      navToggle.setAttribute('aria-expanded', isOpen);
    });
    // Cerrar menú al hacer clic en cualquier enlace
    navbarMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navbarMenu.classList.remove('open');
        navToggle.textContent = '☰';
      });
    });
  }

  // ─ Resaltar enlace de la página actual ─
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === currentFile) {
      link.classList.add('active');
    }
  });
}


/* ─────────────────────────────────────────────────────────────
 * 7. PÁGINA: LOGIN (login.html)
 * ───────────────────────────────────────────────────────────── */

/**
 * Inicializa la lógica del formulario de login.
 * Solo actúa si #loginForm existe en el DOM (es decir, en login.html).
 */
function initLoginPage() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return; // ← Salir silenciosamente si no estamos en login.html

  // Si ya hay sesión, saltar directamente al dashboard
  if (isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const usernameVal = document.getElementById('username').value.trim();
    const passwordVal  = document.getElementById('password').value;
    const errorEl      = document.getElementById('loginError');

    if (usernameVal === CONFIG.credentials.username &&
        passwordVal  === CONFIG.credentials.password) {
      // Credenciales correctas: activar sesión e ir al dashboard
      setSession();
      window.location.href = 'index.html';
    } else {
      // Credenciales incorrectas: mostrar error + animación shake
      if (errorEl) errorEl.classList.remove('hidden');
      document.getElementById('password').value = '';
      loginForm.classList.add('shake');
      setTimeout(() => loginForm.classList.remove('shake'), 600);
    }
  });
}


/* ─────────────────────────────────────────────────────────────
 * 8. PÁGINA: DASHBOARD / CIERRE DE CAJA (index.html)
 * ───────────────────────────────────────────────────────────── */

/**
 * Inicializa el dashboard.
 * Solo actúa si #dashboardSection existe en el DOM (index.html).
 */
function initDashboard() {
  const dashboardSection = document.getElementById('dashboardSection');
  if (!dashboardSection) return; // ← Salir si no estamos en index.html

  renderDashboard();

  const closeCajaBtn = document.getElementById('closeCajaBtn');
  if (closeCajaBtn) {
    closeCajaBtn.addEventListener('click', handleCierreCaja);
  }
}

/**
 * Actualiza todos los valores numéricos del dashboard
 * y re-renderiza el historial de movimientos.
 */
function renderDashboard() {
  const state          = getState();
  const totalReceivable = getTotalReceivable(state);
  const totalCash       = state.wallets.efectivo + state.wallets.yape + state.wallets.plin;

  // Función interna para actualizar un elemento si existe
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('walletEfectivo',   formatCurrency(state.wallets.efectivo));
  setEl('walletYape',       formatCurrency(state.wallets.yape));
  setEl('walletPlin',       formatCurrency(state.wallets.plin));
  setEl('walletReceivable', formatCurrency(totalReceivable));
  setEl('walletTotal',      formatCurrency(totalCash));

  // Contadores de transacciones del día
  const txCount = state.transactions.filter(t => t.type === 'sale').length;
  setEl('txCount', txCount + ' venta' + (txCount !== 1 ? 's' : ''));

  const historialContainer = document.getElementById('historialContainer');
  if (historialContainer) {
    renderTransactionHistory(historialContainer, state.transactions);
  }
}

/**
 * Renderiza la lista de transacciones (ventas + abonos) en el contenedor dado.
 * Muestra máximo 60 registros, del más reciente al más antiguo.
 * @param {HTMLElement} container
 * @param {Array}       transactions
 */
function renderTransactionHistory(container, transactions) {
  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<p class="empty-msg">📭 No hay movimientos en esta sesión de caja.</p>';
    return;
  }

  const recent = [...transactions].reverse().slice(0, 60);

  container.innerHTML = recent.map(tx => {
    const info       = getMethodInfo(tx.method);
    const isPositive = tx.method !== 'fiado';
    const amtClass   = isPositive ? 'tx-amount--positive' : 'tx-amount--fiado';
    const sign       = isPositive ? '+' : '';

    return `
      <div class="tx-item">
        <div class="tx-badge ${info.cssClass}">${info.emoji}</div>
        <div class="tx-body">
          <span class="tx-desc">${escapeHtml(tx.description)}</span>
          <span class="tx-meta">
            ${escapeHtml(info.label)} · ${formatDateTime(tx.timestamp)}
            ${tx.debtorName ? ' · 👤 ' + escapeHtml(tx.debtorName) : ''}
          </span>
        </div>
        <div class="tx-amount ${amtClass}">${sign}${formatCurrency(tx.amount)}</div>
      </div>`;
  }).join('');
}

/**
 * Ejecuta el proceso de Cierre de Caja:
 * muestra resumen detallado y solicita confirmación antes de resetear.
 * Los deudores y sus saldos se CONSERVAN tras el reset.
 */
function handleCierreCaja() {
  const state           = getState();
  const totalReceivable = getTotalReceivable(state);
  const totalCash       = state.wallets.efectivo + state.wallets.yape + state.wallets.plin;

  const resumen = [
    '══════════════════════════════════════════',
    '     CIERRE DE CAJA — GIAFER y JOAKO 🛖   ',
    '══════════════════════════════════════════',
    `  💵 Efectivo : ${formatCurrency(state.wallets.efectivo)}`,
    `  🔮 Yape     : ${formatCurrency(state.wallets.yape)}`,
    `  📱 Plin     : ${formatCurrency(state.wallets.plin)}`,
    '  ──────────────────────────────',
    `  💰 TOTAL REAL  : ${formatCurrency(totalCash)}`,
    `  📋 POR COBRAR  : ${formatCurrency(totalReceivable)}`,
    '══════════════════════════════════',
    '',
    '¿Deseas RESETEAR las billeteras para',
    'iniciar una nueva sesión de caja?',
    '',
    '(Los deudores y sus saldos NO se borrarán)'
  ].join('\n');

  if (confirm(resumen)) {
    state.wallets      = { efectivo: 0, yape: 0, plin: 0 };
    state.transactions = [];
    saveState(state);
    renderDashboard();
    showToast('✅ Caja reseteada. ¡Lista para una nueva jornada! 🛖', 'success');
  }
}


/* ─────────────────────────────────────────────────────────────
 * 9. PÁGINA: VENTAS (ventas.html)
 * ───────────────────────────────────────────────────────────── */

/**
 * Inicializa la página de registro de ventas.
 * Solo actúa si #ventasForm existe en el DOM (ventas.html).
 */
function initVentasPage() {
  const ventasForm = document.getElementById('ventasForm');
  if (!ventasForm) return; // ← Salir si no estamos en ventas.html

  refreshDebtorSelect();

  // Escuchar cambio en los radio buttons de método de pago
  document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
    radio.addEventListener('change', onPaymentMethodChange);
  });

  ventasForm.addEventListener('submit', handleNewSale);
  renderRecentSales();
}

/**
 * Rellena el <select> de deudores con los registrados en localStorage.
 * Se llama al cargar la página y cada vez que el usuario elige "Fiado".
 */
function refreshDebtorSelect() {
  const sel = document.getElementById('debtorSelect');
  if (!sel) return;

  const { debtors } = getState();
  sel.innerHTML = '<option value="">— Seleccionar deudor (obligatorio) —</option>';

  if (debtors.length === 0) {
    sel.innerHTML += '<option value="" disabled>Sin deudores — ve a Fiados para agregar</option>';
    return;
  }

  debtors.forEach(d => {
    const opt = document.createElement('option');
    opt.value       = d.id;
    opt.textContent = `${d.name}  (Debe: ${formatCurrency(d.balance)})`;
    sel.appendChild(opt);
  });
}

/**
 * Muestra u oculta el bloque del selector de deudor
 * dependiendo de si el método de pago es "Fiado".
 */
function onPaymentMethodChange() {
  const selected    = document.querySelector('input[name="paymentMethod"]:checked');
  const debtorGroup = document.getElementById('debtorGroup');
  if (!selected || !debtorGroup) return;

  if (selected.value === 'fiado') {
    debtorGroup.classList.remove('hidden');
    refreshDebtorSelect(); // Recargar por si se crearon nuevos deudores recientemente
  } else {
    debtorGroup.classList.add('hidden');
  }
}

/**
 * Valida y procesa el registro de una nueva venta.
 * — Ventas en efectivo/Yape/Plin → suman a la billetera correspondiente.
 * — Ventas al fiado              → suman al saldo del deudor (no a billeteras).
 * @param {Event} e — Evento submit del formulario
 */
function handleNewSale(e) {
  e.preventDefault();

  const description = document.getElementById('saleDescription').value.trim();
  const amount      = parseFloat(document.getElementById('saleAmount').value);
  const selected    = document.querySelector('input[name="paymentMethod"]:checked');

  // ── Validaciones de campos ──
  if (!description) {
    showToast('⚠️ Describe el producto o servicio vendido.', 'warning');
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showToast('⚠️ El monto debe ser mayor a S/ 0.00.', 'warning');
    return;
  }
  if (!selected) {
    showToast('⚠️ Selecciona el método de pago.', 'warning');
    return;
  }

  const method = selected.value;
  let debtorId   = null;
  let debtorName = null;

  // ── Validación adicional para fiado ──
  if (method === 'fiado') {
    const debtorSel = document.getElementById('debtorSelect');
    debtorId = debtorSel ? debtorSel.value : '';

    if (!debtorId) {
      showToast('⚠️ Selecciona el nombre del deudor para el fiado.', 'warning');
      return;
    }

    const state  = getState();
    const debtor = state.debtors.find(d => d.id === debtorId);
    if (debtor) debtorName = debtor.name;
  }

  // ── Actualizar estado ──
  const state = getState();

  const tx = {
    id:          generateId(),
    type:        'sale',
    description: description,
    amount:      amount,
    method:      method,
    debtorId:    debtorId,
    debtorName:  debtorName,
    timestamp:   new Date().toISOString()
  };

  // Distribuir el dinero según método de pago seleccionado
  if      (method === 'efectivo') { state.wallets.efectivo += amount; }
  else if (method === 'yape')     { state.wallets.yape     += amount; }
  else if (method === 'plin')     { state.wallets.plin     += amount; }
  else if (method === 'fiado') {
    // El fiado NO entra a ninguna billetera: aumenta la deuda del cliente
    const idx = state.debtors.findIndex(d => d.id === debtorId);
    if (idx !== -1) state.debtors[idx].balance += amount;
  }

  state.transactions.push(tx);
  saveState(state);

  // ── Feedback al usuario ──
  const info = getMethodInfo(method);
  const msg  = method === 'fiado'
    ? `📋 Fiado de ${formatCurrency(amount)} registrado a ${debtorName}`
    : `✅ ${formatCurrency(amount)} registrado en ${info.emoji} ${info.label}`;
  showToast(msg, 'success');

  e.target.reset();
  const dg = document.getElementById('debtorGroup');
  if (dg) dg.classList.add('hidden');

  renderRecentSales();
}

/**
 * Renderiza las últimas 30 ventas en ventas.html.
 */
function renderRecentSales() {
  const container = document.getElementById('recentSalesContainer');
  if (!container) return;

  const state = getState();
  const sales = state.transactions
    .filter(tx => tx.type === 'sale')
    .slice(-30)
    .reverse();

  if (sales.length === 0) {
    container.innerHTML = '<p class="empty-msg">📭 Aún no hay ventas registradas.</p>';
    return;
  }

  container.innerHTML = sales.map(tx => {
    const info = getMethodInfo(tx.method);
    return `
      <div class="sale-row">
        <span class="sale-badge ${info.cssClass}">${info.emoji}</span>
        <div class="sale-info">
          <span class="sale-desc">${escapeHtml(tx.description)}</span>
          <span class="sale-time">
            ${formatDateTime(tx.timestamp)}
            ${tx.debtorName ? ' · 👤 ' + escapeHtml(tx.debtorName) : ''}
          </span>
        </div>
        <span class="sale-amount">${formatCurrency(tx.amount)}</span>
      </div>`;
  }).join('');
}


/* ─────────────────────────────────────────────────────────────
 * 10. PÁGINA: DEUDAS / FIADOS (deudas.html)
 * ───────────────────────────────────────────────────────────── */

/**
 * Inicializa la página de gestión de deudores.
 * Solo actúa si #debtorForm existe en el DOM (deudas.html).
 */
function initDeudasPage() {
  const debtorForm = document.getElementById('debtorForm');
  if (!debtorForm) return; // ← Salir si no estamos en deudas.html

  debtorForm.addEventListener('submit', handleNewDebtor);
  renderDebtorsList();
}

/**
 * Registra un nuevo perfil de deudor con saldo inicial en 0.
 * @param {Event} e — Evento submit del formulario
 */
function handleNewDebtor(e) {
  e.preventDefault();

  const nameInput = document.getElementById('debtorName');
  const name      = nameInput ? nameInput.value.trim() : '';

  if (!name) {
    showToast('⚠️ Ingresa el nombre del cliente o equipo.', 'warning');
    return;
  }

  const state = getState();

  // Evitar duplicados (comparación insensible a mayúsculas)
  if (state.debtors.some(d => d.name.toLowerCase() === name.toLowerCase())) {
    showToast(`⚠️ Ya existe el deudor "${name}". Usa un nombre diferente.`, 'warning');
    return;
  }

  const newDebtor = {
    id:        generateId(),
    name:      name,
    balance:   0,   // Deuda inicial en cero
    payments:  [],  // Historial de abonos del cliente
    createdAt: new Date().toISOString()
  };

  state.debtors.push(newDebtor);
  saveState(state);

  showToast(`✅ Deudor "${name}" registrado correctamente.`, 'success');
  e.target.reset();
  renderDebtorsList();
}

/**
 * Construye y muestra las tarjetas de todos los deudores registrados.
 */
function renderDebtorsList() {
  const container = document.getElementById('debtorsContainer');
  if (!container) return;

  const state = getState();

  if (state.debtors.length === 0) {
    container.innerHTML = '<p class="empty-msg">📭 No hay deudores registrados. Agrega el primero arriba.</p>';
    return;
  }

  container.innerHTML = state.debtors.map(d => buildDebtorCard(d)).join('');
}

/**
 * Genera el HTML de la tarjeta de un deudor.
 * Incluye: encabezado con nombre y saldo, formulario de abono (si tiene deuda),
 * historial de últimos 5 abonos y botón de eliminar.
 * @param {Object} debtor — Datos del deudor
 * @returns {string} HTML de la tarjeta
 */
function buildDebtorCard(debtor) {
  const hasBalance = debtor.balance > 0;
  const sid        = escapeHtml(debtor.id);    // ID seguro para HTML
  const sname      = escapeHtml(debtor.name);  // Nombre seguro para HTML

  // Formulario de abono: solo se muestra si el deudor tiene saldo pendiente
  const paymentFormHtml = hasBalance ? `
    <div class="payment-form">
      <h4 class="payment-form-title">💰 Registrar Abono</h4>
      <div class="payment-form-row">
        <div class="form-field">
          <label for="amt_${sid}">Monto del abono</label>
          <input
            type="number"
            id="amt_${sid}"
            class="input-payment"
            placeholder="0.00"
            min="0.01"
            max="${debtor.balance}"
            step="0.01"
          >
        </div>
        <div class="form-field">
          <label for="mth_${sid}">Método de pago</label>
          <select id="mth_${sid}" class="select-payment">
            <option value="efectivo">💵 Efectivo</option>
            <option value="yape">🔮 Yape</option>
            <option value="plin">📱 Plin</option>
          </select>
        </div>
      </div>
      <button class="btn-pay" onclick="handlePayment('${sid}')">
        Confirmar Abono
      </button>
    </div>` : '';

  // Historial de abonos: últimos 5 en orden descendente
  const paymentsHtml = (debtor.payments && debtor.payments.length > 0) ? `
    <div class="abonos-history">
      <h4 class="history-label">Últimos abonos</h4>
      ${[...debtor.payments].reverse().slice(0, 5).map(p => {
        const info = getMethodInfo(p.method);
        return `
          <div class="abono-row">
            <span class="abono-method">${info.emoji} ${escapeHtml(info.label)}</span>
            <span class="abono-amount">-${formatCurrency(p.amount)}</span>
            <span class="abono-date">${formatDateTime(p.timestamp)}</span>
          </div>`;
      }).join('')}
    </div>` : '';

  return `
    <div class="debtor-card ${hasBalance ? 'debtor-card--active' : 'debtor-card--clear'}">
      <div class="debtor-card-header">
        <div class="debtor-id-block">
          <p class="debtor-card-name">${sname}</p>
          <p class="debtor-card-since">Desde ${formatDateTime(debtor.createdAt)}</p>
        </div>
        <div class="debtor-card-balance ${hasBalance ? 'balance--active' : 'balance--clear'}">
          ${hasBalance
            ? `📋 Debe<br><strong>${formatCurrency(debtor.balance)}</strong>`
            : '✅ Sin deuda'}
        </div>
      </div>
      ${paymentFormHtml}
      ${paymentsHtml}
      <div class="debtor-card-footer">
        <button class="btn-delete-debtor" onclick="handleDeleteDebtor('${sid}', '${sname}')">
          🗑️ Eliminar deudor
        </button>
      </div>
    </div>`;
}

/**
 * Procesa el abono parcial de un deudor:
 *  1. Descuenta el monto del saldo del deudor.
 *  2. Acredita el dinero a la billetera real seleccionada.
 *  3. Registra el movimiento en el historial global.
 * @param {string} debtorId — ID del deudor a quien se le abona
 */
function handlePayment(debtorId) {
  const amountInput  = document.getElementById(`amt_${debtorId}`);
  const methodSelect = document.getElementById(`mth_${debtorId}`);

  if (!amountInput || !methodSelect) {
    showToast('❌ Error: campos del formulario no encontrados.', 'error');
    return;
  }

  const amount = parseFloat(amountInput.value);
  const method = methodSelect.value;

  if (isNaN(amount) || amount <= 0) {
    showToast('⚠️ Ingresa un monto de abono mayor a cero.', 'warning');
    return;
  }

  const state = getState();
  const idx   = state.debtors.findIndex(d => d.id === debtorId);

  if (idx === -1) {
    showToast('❌ Error: deudor no encontrado.', 'error');
    return;
  }

  const debtor = state.debtors[idx];

  // El abono no puede ser mayor a la deuda actual
  if (amount > debtor.balance + 0.005) {
    showToast(
      `⚠️ El abono (${formatCurrency(amount)}) supera la deuda (${formatCurrency(debtor.balance)}).`,
      'warning'
    );
    return;
  }

  const info = getMethodInfo(method);

  // ── Registro del abono en el historial del deudor ──
  const paymentRecord = {
    id:        generateId(),
    amount:    amount,
    method:    method,
    timestamp: new Date().toISOString()
  };

  // Reducir saldo (Math.max para evitar negativos por decimales flotantes)
  state.debtors[idx].balance = Math.max(0, debtor.balance - amount);
  if (!state.debtors[idx].payments) state.debtors[idx].payments = [];
  state.debtors[idx].payments.push(paymentRecord);

  // ── Acreditar el dinero a la billetera real ──
  if      (method === 'efectivo') { state.wallets.efectivo += amount; }
  else if (method === 'yape')     { state.wallets.yape     += amount; }
  else if (method === 'plin')     { state.wallets.plin     += amount; }

  // ── Registrar en el historial global de transacciones ──
  state.transactions.push({
    id:          generateId(),
    type:        'payment',
    description: `Abono de ${debtor.name}`,
    amount:      amount,
    method:      method,
    debtorId:    debtorId,
    debtorName:  debtor.name,
    timestamp:   new Date().toISOString()
  });

  saveState(state);

  showToast(
    `✅ Abono de ${formatCurrency(amount)} en ${info.emoji} ${info.label} registrado para ${debtor.name}`,
    'success'
  );

  renderDebtorsList();
}

/**
 * Elimina un deudor del sistema tras confirmación explícita del usuario.
 * @param {string} debtorId   — ID del deudor a eliminar
 * @param {string} debtorName — Nombre del deudor (para el mensaje de confirmación)
 */
function handleDeleteDebtor(debtorId, debtorName) {
  if (!confirm(`¿Eliminar a "${debtorName}" y todo su historial de abonos?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }

  const state    = getState();
  state.debtors  = state.debtors.filter(d => d.id !== debtorId);
  saveState(state);

  showToast(`🗑️ Deudor "${debtorName}" eliminado.`, 'info');
  renderDebtorsList();
}


/* ─────────────────────────────────────────────────────────────
 * 11. PUNTO DE ENTRADA PRINCIPAL
 *     Se ejecuta una sola vez cuando el DOM está listo.
 *     Detecta la página actual y activa solo el módulo correcto.
 * ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {

  // Determinar la página actual por el nombre de archivo en la URL
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';

  // ─ login.html no requiere autenticación ni navbar ─
  if (currentFile === 'login.html') {
    initLoginPage();
    return;
  }

  // ─ Todas las demás páginas: verificar sesión primero ─
  authGuard();         // Redirige si no hay sesión activa
  initSharedNav();     // Navbar, logout, menú hamburguesa

  // Cada función comprueba internamente si sus elementos existen en el DOM.
  // Así el script único no lanza errores al ejecutarse en distintas páginas.
  initDashboard();     // Actúa solo si está en index.html
  initVentasPage();    // Actúa solo si está en ventas.html
  initDeudasPage();    // Actúa solo si está en deudas.html
});

/**
 * Tịnh Độ Liên Hoa - Theme Scripts
 * 1. Mobile Menu (Drawer & Overlay)
 * 2. Font Size Controller (Tăng giảm cỡ chữ đọc kinh & sách cho người lớn tuổi)
 */
(function() {
  'use strict';

  // =========================================================================
  // 1. MOBILE MENU
  // =========================================================================
  function initMobileMenu() {
    var burger = document.getElementById('burger');
    if (!burger) return;

    // Close menu when pressing Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && burger.checked) {
        burger.checked = false;
      }
    });

    // Close menu when clicking any navigation link
    var navLinks = document.querySelectorAll('.mainnavigation a');
    for (var i = 0; i < navLinks.length; i++) {
      navLinks[i].addEventListener('click', function() {
        if (window.innerWidth <= 800) {
          burger.checked = false;
        }
      });
    }
  }

  // =========================================================================
  // 2. FONT SIZE & ACCESSIBILITY CONTROLLER (NGƯỜI CAO NIÊN & ĐỌC BAN ĐÊM)
  // =========================================================================
  var SCALES = [1.00, 1.25, 1.50, 1.75];
  var STORAGE_KEY_SCALE = 'tm_font_scale';
  var STORAGE_KEY_NIGHT = 'tm_night_mode';
  var STORAGE_KEY_ELDERLY = 'tm_elderly_mode';

  function getStoredScale() {
    try {
      var s = parseFloat(localStorage.getItem(STORAGE_KEY_SCALE));
      if (!isNaN(s) && s >= 0.8 && s <= 2.2) {
        return s;
      }
    } catch(e) {}
    return 1.00;
  }

  function getScaleLabel(scale) {
    var p = Math.round(scale * 100);
    if (p <= 100) return 'Chuẩn (100%)';
    if (p <= 125) return 'Lớn vừa (125%)';
    if (p <= 150) return 'Lớn rõ (150%)';
    return 'Rất lớn (' + p + '%)';
  }

  var toastTimer = null;
  function showReaderToast(htmlMessage) {
    var toast = document.getElementById('tm-font-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tm-font-toast';
      toast.className = 'tm-font-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.innerHTML = htmlMessage;
    toast.classList.add('tm-toast-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toast.classList.remove('tm-toast-show');
    }, 2000);
  }

  function applyScale(scale, showToast) {
    scale = Math.round(scale * 100) / 100;
    document.documentElement.style.setProperty('--tm-font-scale', scale);
    document.documentElement.setAttribute('data-font-scale', scale);
    if (document.body) {
      document.body.style.setProperty('--tm-font-scale', scale);
    }

    try {
      localStorage.setItem(STORAGE_KEY_SCALE, scale);
    } catch(e) {}

    var percentText = Math.round(scale * 100) + '%';
    var labelEls = document.querySelectorAll('.tm-font-scale-text');
    for (var i = 0; i < labelEls.length; i++) {
      labelEls[i].textContent = percentText;
    }

    // Toggle active state on cycle button when scaled up
    var cycleBtns = document.querySelectorAll('.tm-font-cycle-btn');
    for (var c = 0; c < cycleBtns.length; c++) {
      cycleBtns[c].classList.toggle('active', scale > 1.00);
    }

    if (showToast) {
      if (scale === 1.00) {
        showReaderToast('<span class="tm-toast-lotus">🪷</span> Cỡ chữ: <strong>Đã đặt lại Chuẩn (100%)</strong>');
      } else {
        showReaderToast('<span class="tm-toast-lotus">🪷</span> Cỡ chữ: <strong>' + getScaleLabel(scale) + '</strong>');
      }
    }
  }

  function cycleScale() {
    var cur = getStoredScale();
    var closestIdx = 0;
    var minDiff = 999;
    for (var i = 0; i < SCALES.length; i++) {
      var diff = Math.abs(SCALES[i] - cur);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    var nextIdx = (closestIdx + 1) % SCALES.length;
    applyScale(SCALES[nextIdx], true);
  }

  function stepScale(direction) {
    var cur = getStoredScale();
    var closestIdx = 0;
    var minDiff = 999;
    for (var i = 0; i < SCALES.length; i++) {
      var diff = Math.abs(SCALES[i] - cur);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    var targetIdx = closestIdx + direction;
    if (targetIdx < 0) targetIdx = 0;
    if (targetIdx >= SCALES.length) targetIdx = SCALES.length - 1;
    applyScale(SCALES[targetIdx], true);
  }

  function resetScale() {
    applyScale(1.00, true);
  }

  function toggleNightMode() {
    var isNight = document.documentElement.classList.toggle('tm-night-mode');
    if (document.body) {
      document.body.classList.toggle('tm-night-mode', isNight);
    }
    try {
      localStorage.setItem(STORAGE_KEY_NIGHT, isNight ? 'true' : 'false');
    } catch(e) {}

    var nightBtns = document.querySelectorAll('.tm-night-mode-btn');
    for (var i = 0; i < nightBtns.length; i++) {
      nightBtns[i].classList.toggle('active', isNight);
      nightBtns[i].setAttribute('aria-pressed', isNight ? 'true' : 'false');
    }

    if (isNight) {
      showReaderToast('🌙 <strong>Chế độ đọc ban đêm</strong> (Dịu mắt, êm đềm)');
    } else {
      showReaderToast('☀️ <strong>Chế độ đọc ban ngày</strong> (Thanh tịnh)');
    }
  }

  function toggleElderlyMode() {
    var isElderly = document.documentElement.classList.toggle('tm-elderly-mode');
    if (document.body) {
      document.body.classList.toggle('tm-elderly-mode', isElderly);
    }
    try {
      localStorage.setItem(STORAGE_KEY_ELDERLY, isElderly ? 'true' : 'false');
    } catch(e) {}

    var elderlyBtns = document.querySelectorAll('.tm-elderly-mode-btn');
    for (var i = 0; i < elderlyBtns.length; i++) {
      elderlyBtns[i].classList.toggle('active', isElderly);
      elderlyBtns[i].setAttribute('aria-pressed', isElderly ? 'true' : 'false');
    }

    if (isElderly) {
      showReaderToast('👓 <strong>Chế độ Người Cao Tuổi</strong> (Chữ to, Menu & Nút bấm cỡ lớn)');
    } else {
      showReaderToast('👓 <strong>Giao diện Tiêu Chuẩn</strong>');
    }
  }

  function syncAccessibilityStates() {
    // Sync Night Mode state from localStorage / DOM
    var isNight = false;
    try {
      isNight = localStorage.getItem(STORAGE_KEY_NIGHT) === 'true';
    } catch(e) {}
    if (isNight || document.documentElement.classList.contains('tm-night-mode')) {
      document.documentElement.classList.add('tm-night-mode');
      if (document.body) document.body.classList.add('tm-night-mode');
      var nightBtns = document.querySelectorAll('.tm-night-mode-btn');
      for (var i = 0; i < nightBtns.length; i++) {
        nightBtns[i].classList.add('active');
        nightBtns[i].setAttribute('aria-pressed', 'true');
      }
    }

    // Sync Elderly Mode state from localStorage / DOM
    var isElderly = false;
    try {
      isElderly = localStorage.getItem(STORAGE_KEY_ELDERLY) === 'true';
    } catch(e) {}
    if (isElderly || document.documentElement.classList.contains('tm-elderly-mode')) {
      document.documentElement.classList.add('tm-elderly-mode');
      if (document.body) document.body.classList.add('tm-elderly-mode');
      var elderlyBtns = document.querySelectorAll('.tm-elderly-mode-btn');
      for (var j = 0; j < elderlyBtns.length; j++) {
        elderlyBtns[j].classList.add('active');
        elderlyBtns[j].setAttribute('aria-pressed', 'true');
      }
    }
  }

  function initFontSizeController() {
    // Apply saved scale immediately
    var currentScale = getStoredScale();
    applyScale(currentScale, false);

    // Sync Night & Elderly states
    syncAccessibilityStates();

    // Event delegation for all toolbar buttons
    document.addEventListener('click', function(e) {
      // 1. Single A+ cycle button
      var cycleBtn = e.target.closest('.tm-font-cycle-btn');
      if (cycleBtn) {
        e.preventDefault();
        cycleScale();
        return;
      }

      // 2. Night mode button (🌙)
      var nightBtn = e.target.closest('.tm-night-mode-btn');
      if (nightBtn) {
        e.preventDefault();
        toggleNightMode();
        return;
      }

      // 3. Elderly / Senior mode button (👓)
      var elderlyBtn = e.target.closest('.tm-elderly-mode-btn');
      if (elderlyBtn) {
        e.preventDefault();
        toggleElderlyMode();
        return;
      }

      // Legacy buttons compatibility
      var decBtn = e.target.closest('.tm-font-dec');
      if (decBtn) {
        e.preventDefault();
        stepScale(-1);
        return;
      }
      var incBtn = e.target.closest('.tm-font-inc');
      if (incBtn) {
        e.preventDefault();
        stepScale(1);
        return;
      }
      var resetBtn = e.target.closest('.tm-font-reset');
      if (resetBtn) {
        e.preventDefault();
        resetScale();
        return;
      }
    });
  }

  function initAll() {
    initMobileMenu();
    initFontSizeController();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();

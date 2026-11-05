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
  // 2. FONT SIZE CONTROLLER (HỖ TRỢ ĐỌC KINH & SÁCH CHO NGƯỜI CAO NIÊN)
  // =========================================================================
  var SCALES = [0.90, 1.00, 1.15, 1.30, 1.45, 1.60, 1.75, 1.90];
  var STORAGE_KEY = 'tm_font_scale';

  function getStoredScale() {
    try {
      var s = parseFloat(localStorage.getItem(STORAGE_KEY));
      if (!isNaN(s) && s >= 0.8 && s <= 2.2) {
        return s;
      }
    } catch(e) {}
    return 1.00;
  }

  function getScaleLabel(scale) {
    var p = Math.round(scale * 100);
    if (p <= 90) return 'Nhỏ gọn (90%)';
    if (p === 100) return 'Chuẩn (100%)';
    if (p <= 115) return 'Vừa vặn (115%)';
    if (p <= 130) return 'Lớn rõ (130%)';
    if (p <= 145) return 'Rất rõ (145%)';
    if (p <= 160) return 'Chữ lớn (160%)';
    return 'Cực lớn (' + p + '%)';
  }

  var toastTimer = null;
  function showScaleToast(scale) {
    var toast = document.getElementById('tm-font-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tm-font-toast';
      toast.className = 'tm-font-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<span class="tm-toast-lotus">🪷</span> Cỡ chữ: <strong>' + getScaleLabel(scale) + '</strong>';
    toast.classList.add('tm-toast-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toast.classList.remove('tm-toast-show');
    }, 1800);
  }

  function applyScale(scale, showToast) {
    scale = Math.round(scale * 100) / 100;
    document.documentElement.style.setProperty('--tm-font-scale', scale);
    document.documentElement.setAttribute('data-font-scale', scale);

    try {
      localStorage.setItem(STORAGE_KEY, scale);
    } catch(e) {}

    var percentText = Math.round(scale * 100) + '%';
    var labelEls = document.querySelectorAll('.tm-font-scale-text');
    for (var i = 0; i < labelEls.length; i++) {
      labelEls[i].textContent = percentText;
    }

    var decBtns = document.querySelectorAll('.tm-font-dec');
    var incBtns = document.querySelectorAll('.tm-font-inc');
    var isMin = scale <= SCALES[0];
    var isMax = scale >= SCALES[SCALES.length - 1];

    for (var d = 0; d < decBtns.length; d++) {
      decBtns[d].disabled = isMin;
      decBtns[d].classList.toggle('tm-btn-disabled', isMin);
    }
    for (var n = 0; n < incBtns.length; n++) {
      incBtns[n].disabled = isMax;
      incBtns[n].classList.toggle('tm-btn-disabled', isMax);
    }

    if (showToast) {
      showScaleToast(scale);
    }
  }

  function stepScale(direction) {
    var cur = getStoredScale();
    var closestIdx = 1;
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

  function initFontSizeController() {
    // Apply saved scale immediately
    var currentScale = getStoredScale();
    applyScale(currentScale, false);

    // Event delegation for all font buttons
    document.addEventListener('click', function(e) {
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

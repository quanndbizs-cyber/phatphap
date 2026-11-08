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

    // Close menu when clicking any navigation link (leaf link or head link to direct page)
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
  // 1b. NAVIGATION ACCORDION (MỞ RỘNG / THU LẠI PHÂN CẤP TỪNG MỤC)
  // =========================================================================
  function initNavigationAccordion() {
    document.addEventListener('click', function(e) {
      var toggleBtn = e.target.closest('.nav-folder-toggle');
      if (!toggleBtn) return;

      e.preventDefault();
      e.stopPropagation();

      var li = toggleBtn.closest('li.folder');
      if (!li) return;

      var sublist = li.querySelector(':scope > ul.nav-sublist, :scope > ul');
      var isExpanded = li.classList.contains('is-expanded');

      if (isExpanded) {
        // Thu lại phân cấp (collapse)
        li.classList.remove('is-expanded');
        li.classList.add('is-collapsed');
        toggleBtn.setAttribute('aria-expanded', 'false');
        var folderNameEl = toggleBtn.querySelector('.nav-folder-title');
        var nameText = folderNameEl ? folderNameEl.textContent.trim() : '';
        toggleBtn.setAttribute('title', 'Bấm để mở rộng mục ' + nameText);
        if (sublist) {
          sublist.style.display = 'none';
        }
      } else {
        // Mở rộng phân cấp (expand)
        li.classList.remove('is-collapsed');
        li.classList.add('is-expanded');
        toggleBtn.setAttribute('aria-expanded', 'true');
        var folderNameEl = toggleBtn.querySelector('.nav-folder-title');
        var nameText = folderNameEl ? folderNameEl.textContent.trim() : '';
        toggleBtn.setAttribute('title', 'Bấm để thu lại mục ' + nameText);
        if (sublist) {
          sublist.style.display = 'block';
        }
      }
    });
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

  // =========================================================================
  // 3. RESPONSIVE TABLES FOR MOBILE (HYBRID CARD VIEW + HORIZONTAL SCROLL)
  // =========================================================================
  var STORAGE_KEY_TABLE_MODE = 'tm_mobile_table_mode'; // 'cards' (default) or 'scroll'

  function getStoredTableMode() {
    try {
      var m = localStorage.getItem(STORAGE_KEY_TABLE_MODE);
      if (m === 'scroll' || m === 'cards') return m;
    } catch(e) {}
    return 'cards';
  }

  function applyTableMode(wrapper, mode) {
    wrapper.classList.toggle('tm-table-cards', mode === 'cards');
    wrapper.classList.toggle('tm-table-scroll', mode === 'scroll');
    var bar = wrapper._mobileBar || wrapper.previousElementSibling;
    if (bar && bar.classList && bar.classList.contains('tm-table-mobile-bar')) {
      var btns = bar.querySelectorAll('.tm-table-mode-btn');
      for (var i = 0; i < btns.length; i++) {
        var btnMode = btns[i].getAttribute('data-table-mode');
        var isActive = btnMode === mode;
        btns[i].classList.toggle('active', isActive);
        btns[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
      var hint = bar.querySelector('.tm-table-scroll-hint');
      if (hint) {
        hint.style.display = mode === 'scroll' ? 'inline-flex' : 'none';
      }
    }
  }

  function initResponsiveTables() {
    var tables = document.querySelectorAll('article table, .grid-main table, .tm-table table');
    if (!tables.length) return;

    var defaultMode = getStoredTableMode();

    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
      var wrapper = table.closest('.tm-table');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'tm-table';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }

      if (wrapper.getAttribute('data-tm-responsive-ready') === 'true') {
        continue;
      }
      wrapper.setAttribute('data-tm-responsive-ready', 'true');

      // Extract column headers from thead or first tr
      var headers = [];
      var thEls = table.querySelectorAll('thead th, thead td');
      if (!thEls.length) {
        var firstRow = table.querySelector('tr');
        if (firstRow) {
          thEls = firstRow.querySelectorAll('th');
        }
      }
      for (var h = 0; h < thEls.length; h++) {
        headers.push((thEls[h].textContent || '').replace(/\s+/g, ' ').trim());
      }

      // Assign data-label to each cell in tbody
      var rows = table.querySelectorAll('tbody tr');
      if (!rows.length) {
        var allRows = table.querySelectorAll('tr');
        var startRow = thEls.length ? 1 : 0;
        rows = Array.prototype.slice.call(allRows, startRow);
      }

      for (var r = 0; r < rows.length; r++) {
        var cells = rows[r].querySelectorAll('td');
        for (var c = 0; c < cells.length; c++) {
          if (headers[c] && !cells[c].getAttribute('data-label')) {
            cells[c].setAttribute('data-label', headers[c]);
          }
          if (c === 0) {
            cells[c].classList.add('tm-td-primary');
          }
        }
      }

      // Create mobile control bar right above .tm-table
      var bar = document.createElement('div');
      bar.className = 'tm-table-mobile-bar';
      bar.innerHTML =
        '<div class="tm-table-mode-group" role="group" aria-label="Chế độ xem bảng trên điện thoại">' +
          '<button type="button" class="tm-table-mode-btn" data-table-mode="cards" aria-pressed="true">' +
            '🗂️ Dạng Thẻ' +
          '</button>' +
          '<button type="button" class="tm-table-mode-btn" data-table-mode="scroll" aria-pressed="false">' +
            '📊 Dạng Bảng' +
          '</button>' +
        '</div>' +
        '<span class="tm-table-scroll-hint" style="display:none;">↔ Vuốt ngang để xem</span>';

      wrapper._mobileBar = bar;
      wrapper.parentNode.insertBefore(bar, wrapper);
      applyTableMode(wrapper, defaultMode);
    }

    // Event delegation for switching table mode
    document.addEventListener('click', function(e) {
      var modeBtn = e.target.closest('.tm-table-mode-btn');
      if (!modeBtn) return;
      e.preventDefault();
      var targetMode = modeBtn.getAttribute('data-table-mode') || 'cards';
      try {
        localStorage.setItem(STORAGE_KEY_TABLE_MODE, targetMode);
      } catch(err) {}

      var allWrappers = document.querySelectorAll('.tm-table[data-tm-responsive-ready="true"]');
      for (var i = 0; i < allWrappers.length; i++) {
        applyTableMode(allWrappers[i], targetMode);
      }
    });
    window.initResponsiveTables = initResponsiveTables;
  }

  // =========================================================================
  // 5. DROPCAP & PARENTHESIZED NOTES ADJUSTMENT (TRÁNH VIẾT HOA CHÚ THÍCH ())
  // =========================================================================
  function initDropcapNotes() {
    var article = document.querySelector('article.td-dropcap-enabled');
    if (!article) return;

    var paras = article.querySelectorAll('p');
    for (var i = 0; i < paras.length; i++) {
      var p = paras[i];
      var text = p.textContent.trim();
      // Bỏ qua các đoạn chú thích mở đầu bằng dấu ngoặc đơn (...)
      if (/^[\s*_\-—]*\(/.test(text)) {
        p.classList.add('no-dropcap');
        p.classList.add('tm-sutra-note');

        // Nếu đoạn chú thích này nằm ngay sau tiêu đề h2, h3 hoặc blockquote,
        // thì chuyển drop-cap sang đoạn văn kế tiếp (nội dung chính của bài)
        var prev = p.previousElementSibling;
        while (prev && prev.tagName === 'P' && prev.classList.contains('no-dropcap')) {
          prev = prev.previousElementSibling;
        }
        if (prev && (/^H[1-6]$/.test(prev.tagName) || prev.tagName === 'BLOCKQUOTE')) {
          var next = p.nextElementSibling;
          while (next && next.tagName === 'P') {
            var nextText = next.textContent.trim();
            if (!/^[\s*_\-—]*\(/.test(nextText)) {
              next.classList.add('story-dropcap');
              break;
            }
            next = next.nextElementSibling;
          }
        }
      }
    }
  }

  function initTopDropdownAndFloatingDock() {
    // 1. Top menu dropdown ("Danh mục chính")
    var topDropdown = document.getElementById('tm-top-dropdown');
    var topDropdownBtn = document.getElementById('tm-top-dropdown-btn');
    if (topDropdown && topDropdownBtn) {
      topDropdownBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = topDropdown.classList.toggle('is-open');
        topDropdownBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      document.addEventListener('click', function(e) {
        if (!topDropdown.contains(e.target) && topDropdown.classList.contains('is-open')) {
          topDropdown.classList.remove('is-open');
          topDropdownBtn.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && topDropdown.classList.contains('is-open')) {
          topDropdown.classList.remove('is-open');
          topDropdownBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // 2. Floating font bar right-edge auto-show/hide
    var floatBar = document.getElementById('tm-floating-font-bar');
    var dockToggle = document.getElementById('tm-float-dock-toggle');
    if (floatBar && dockToggle) {
      var dockTimer = null;
      var resetDockTimer = function() {
        clearTimeout(dockTimer);
        if (floatBar.classList.contains('tm-dock-expanded')) {
          dockTimer = setTimeout(function() {
            floatBar.classList.remove('tm-dock-expanded');
            floatBar.classList.add('tm-dock-collapsed');
            dockToggle.setAttribute('aria-expanded', 'false');
          }, 5000);
        }
      };

      dockToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isExpanded = floatBar.classList.toggle('tm-dock-expanded');
        floatBar.classList.toggle('tm-dock-collapsed', !isExpanded);
        dockToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        if (isExpanded) {
          resetDockTimer();
        } else {
          clearTimeout(dockTimer);
        }
      });

      floatBar.addEventListener('click', function() {
        if (floatBar.classList.contains('tm-dock-expanded')) {
          resetDockTimer();
        }
      });

      document.addEventListener('click', function(e) {
        if (!floatBar.contains(e.target) && floatBar.classList.contains('tm-dock-expanded')) {
          floatBar.classList.remove('tm-dock-expanded');
          floatBar.classList.add('tm-dock-collapsed');
          dockToggle.setAttribute('aria-expanded', 'false');
          clearTimeout(dockTimer);
        }
      });

      var scrollTimer = null;
      window.addEventListener('scroll', function() {
        if (!floatBar.classList.contains('tm-dock-expanded')) {
          floatBar.classList.add('tm-scrolling-hide');
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(function() {
            floatBar.classList.remove('tm-scrolling-hide');
          }, 600);
        }
      }, { passive: true });
    }
  }

  function initAll() {
    initMobileMenu();
    initNavigationAccordion();
    initFontSizeController();
    initTopDropdownAndFloatingDock();
    initResponsiveTables();
    initDropcapNotes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();


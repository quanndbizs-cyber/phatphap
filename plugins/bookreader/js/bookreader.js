/**
 * BOOK READER & FLOATING TOC PLUGIN (TỊNH ĐỘ LIÊN HOA)
 * Provides a draggable bookmark button, smooth TOC drawer, search filter, and active reading progress.
 * Supports both native reading book pages (H2 anchors) and audio story card hubs (.tm-story-card).
 */
(function () {
  'use strict';

  function initBookReader() {
    // Only run on frontend pages with article content
    var article = document.querySelector('article') || document.querySelector('.content') || document.querySelector('main');
    if (!article) return;

    var config = window.TmBookReaderConfig || {
      defaultSide: 'right',
      draggable: true,
      showSearch: true,
      showProgress: true,
      minHeadings: 2
    };

    var headings = [];
    var storyCount = 0;

    // 1. Check for story cards (audio hubs like /nhan-qua/bao-ung-hien-doi-tap-6)
    var storyCards = article.querySelectorAll('.tm-story-card');
    if (storyCards && storyCards.length >= 2) {
      storyCards.forEach(function (card, idx) {
        var num = idx + 1;
        var id = card.id || ('truyen-' + num);
        if (!card.id) card.id = id;
        var titleEl = card.querySelector('.tm-story-title');
        var titleText = titleEl ? titleEl.textContent.trim() : ('Truyện ' + num);
        storyCount++;
        headings.push({
          el: card,
          id: id,
          text: num + '. ' + titleText,
          level: 'card',
          isTOC: false,
          isStory: true
        });
      });
    } else {
      // 2. Standard headings on reading pages or long articles
      var rawHeadings = article.querySelectorAll('h2[id], h3[id]');
      rawHeadings.forEach(function (h) {
        var id = h.id;
        if (!id) return;
        var text = h.textContent.trim();
        var isTOC = id === 'muc-luc' || text.toLowerCase().includes('mục lục');
        var isStory = id.startsWith('truyen-') || /^\d+\./.test(text);
        if (isStory) storyCount++;

        headings.push({
          el: h,
          id: id,
          text: text,
          level: h.tagName.toLowerCase(),
          isTOC: isTOC,
          isStory: isStory
        });
      });
    }

    if (headings.length < config.minHeadings) {
      // If URL does not contain doc-sach, don't activate on short pages
      if (!window.location.pathname.includes('doc-sach')) {
        return;
      }
    }

    // Load saved position & side
    var savedPos = null;
    try {
      savedPos = JSON.parse(localStorage.getItem('tm_reader_pos'));
    } catch (e) {}

    var currentSide = (savedPos && savedPos.side) ? savedPos.side : config.defaultSide;

    // 1. Create Floating Bookmark Button
    var btn = document.createElement('div');
    btn.id = 'tm-reader-btn';
    btn.className = 'pos-' + currentSide;
    btn.title = 'Mục lục đọc sách (Kéo thả để di chuyển)';

    // SVG Circular Progress + Bookmark Icon
    var circleRadius = 23;
    var circleCircumference = 2 * Math.PI * circleRadius; // ~144.5

    btn.innerHTML =
      '<svg class="tm-progress-svg" viewBox="0 0 52 52">' +
        '<circle class="tm-progress-circle-bg" cx="26" cy="26" r="' + circleRadius + '"></circle>' +
        '<circle class="tm-progress-circle-bar" cx="26" cy="26" r="' + circleRadius + '" style="stroke-dasharray: ' + circleCircumference + '; stroke-dashoffset: ' + circleCircumference + ';"></circle>' +
      '</svg>' +
      '<svg class="tm-btn-icon" viewBox="0 0 24 24">' +
        '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>' +
      '</svg>' +
      (storyCount > 0 ? '<span class="tm-btn-badge">' + storyCount + '</span>' : '') +
      '<div class="tm-btn-tooltip">📖 Mục lục đọc sách</div>';

    document.body.appendChild(btn);

    // Apply initial position
    function applyBtnPosition() {
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
        var x = Math.max(10, Math.min(w - 65, savedPos.x));
        var y = Math.max(50, Math.min(h - 65, savedPos.y));
        btn.style.left = x + 'px';
        btn.style.top = y + 'px';
        btn.style.right = 'auto';
        btn.style.bottom = 'auto';
        btn.className = (x > w / 2) ? 'pos-right' : 'pos-left';
      } else {
        if (currentSide === 'left') {
          btn.style.left = (w < 640 ? '12px' : '24px');
          btn.style.right = 'auto';
        } else {
          btn.style.right = (w < 640 ? '12px' : '24px');
          btn.style.left = 'auto';
        }
        btn.style.top = (w < 640 ? '100px' : '140px');
      }
    }
    applyBtnPosition();

    // 2. Drag & Drop functionality
    var isDragging = false;
    var dragStartX = 0;
    var dragStartY = 0;
    var initialBtnX = 0;
    var initialBtnY = 0;
    var hasMoved = false;

    function onDragStart(e) {
      if (e.type === 'touchstart') {
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
      } else {
        if (e.button !== 0) return;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
      }

      var rect = btn.getBoundingClientRect();
      initialBtnX = rect.left;
      initialBtnY = rect.top;
      hasMoved = false;

      document.addEventListener('mousemove', onDragMove, { passive: false });
      document.addEventListener('mouseup', onDragEnd);
      document.addEventListener('touchmove', onDragMove, { passive: false });
      document.addEventListener('touchend', onDragEnd);
    }

    function onDragMove(e) {
      var curX = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
      var curY = (e.type === 'touchmove') ? e.touches[0].clientY : e.clientY;

      var dx = curX - dragStartX;
      var dy = curY - dragStartY;

      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        hasMoved = true;
        isDragging = true;
        btn.classList.add('tm-dragging');
        if (e.cancelable) e.preventDefault();

        var newX = initialBtnX + dx;
        var newY = initialBtnY + dy;

        var maxW = window.innerWidth - btn.offsetWidth - 10;
        var maxH = window.innerHeight - btn.offsetHeight - 10;

        newX = Math.max(10, Math.min(maxW, newX));
        newY = Math.max(40, Math.min(maxH, newY));

        btn.style.left = newX + 'px';
        btn.style.top = newY + 'px';
        btn.style.right = 'auto';
        btn.style.bottom = 'auto';
      }
    }

    function onDragEnd() {
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('touchend', onDragEnd);

      if (isDragging) {
        setTimeout(function () {
          isDragging = false;
          btn.classList.remove('tm-dragging');
        }, 50);

        var rect = btn.getBoundingClientRect();
        var midX = window.innerWidth / 2;
        var side = (rect.left > midX) ? 'right' : 'left';
        btn.className = 'pos-' + side;

        savedPos = { x: rect.left, y: rect.top, side: side };
        try {
          localStorage.setItem('tm_reader_pos', JSON.stringify(savedPos));
        } catch (e) {}
      }
    }

    btn.addEventListener('mousedown', onDragStart);
    btn.addEventListener('touchstart', onDragStart, { passive: true });

    // Click handler for opening drawer
    btn.addEventListener('click', function (e) {
      if (hasMoved || isDragging) return;
      openDrawer();
    });

    // 3. Create Backdrop and Drawer
    var backdrop = document.createElement('div');
    backdrop.id = 'tm-reader-backdrop';
    document.body.appendChild(backdrop);

    var drawer = document.createElement('div');
    drawer.id = 'tm-reader-drawer';
    drawer.className = 'dock-' + currentSide;

    drawer.innerHTML =
      '<div class="tm-drawer-header">' +
        '<div class="tm-drawer-title-group">' +
          '<span class="tm-drawer-icon">🪷</span>' +
          '<h3 class="tm-drawer-title">Mục Lục Đọc Sách</h3>' +
          (storyCount > 0 ? '<span class="tm-drawer-count">' + storyCount + ' bài</span>' : '') +
        '</div>' +
        '<div class="tm-drawer-controls">' +
          '<button class="tm-drawer-btn tm-dock-switch" title="Chuyển vị trí hiển thị (Trái / Phải)">⇄</button>' +
          '<button class="tm-drawer-btn tm-drawer-close" title="Đóng mục lục (Esc)">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="tm-drawer-progress-strip">' +
        '<div class="tm-progress-bar-bg">' +
          '<div class="tm-progress-bar-fill" id="tm-drawer-prog-fill"></div>' +
        '</div>' +
        '<div class="tm-progress-text" id="tm-drawer-prog-text">0%</div>' +
      '</div>' +
      '<div class="tm-drawer-search-wrap">' +
        '<input type="text" class="tm-drawer-search-input" placeholder="🔍 Tìm nhanh bài đọc (nhập số hoặc tên)..." />' +
        '<button class="tm-drawer-search-clear" title="Xóa tìm kiếm">✕</button>' +
      '</div>' +
      '<div class="tm-drawer-list-wrap">' +
        '<ul class="tm-drawer-list" id="tm-drawer-items"></ul>' +
        '<div class="tm-drawer-empty" style="display:none;">Không tìm thấy câu chuyện phù hợp</div>' +
      '</div>' +
      '<div class="tm-drawer-footer">' +
        '<a href="#top" class="tm-footer-action-btn" id="tm-btn-top">⬆ Đầu trang</a>' +
        '<a href="#muc-luc" class="tm-footer-action-btn" id="tm-btn-toc">📑 Mục lục</a>' +
        '<button type="button" class="tm-footer-action-btn tm-footer-close-btn" id="tm-btn-close-footer">✕ Đóng</button>' +
        '<a href="#bottom" class="tm-footer-action-btn" id="tm-btn-bot">⬇ Cuối trang</a>' +
      '</div>';

    document.body.appendChild(drawer);

    // Populate drawer list items
    var listEl = document.getElementById('tm-drawer-items');
    headings.forEach(function (h, idx) {
      var li = document.createElement('li');
      li.className = 'tm-drawer-item';
      li.dataset.targetId = h.id;

      // Extract number if starts with digit
      var numMatch = h.text.match(/^(\d+)\.\s*(.*)/);
      var numHtml = '';
      var titleText = h.text;
      if (numMatch) {
        numHtml = '<span class="tm-drawer-num">#' + numMatch[1] + '</span>';
        titleText = numMatch[2];
      } else if (h.isTOC) {
        numHtml = '<span class="tm-drawer-num">📑</span>';
      } else {
        numHtml = '<span class="tm-drawer-num">•</span>';
      }

      var a = document.createElement('a');
      a.className = 'tm-drawer-link';
      a.href = '#' + h.id;
      a.innerHTML = numHtml + '<span class="tm-drawer-text">' + titleText + '</span><span class="tm-drawer-active-dot"></span>';

      a.addEventListener('click', function (e) {
        e.preventDefault();
        scrollToHeading(h.id);
        if (window.innerWidth < 640) {
          closeDrawer();
        }
      });

      li.appendChild(a);
      listEl.appendChild(li);
    });

    // Drawer open / close handlers
    function openDrawer() {
      // Auto close mobile top navigation menu if open
      var burgerCheck = document.getElementById('burger');
      if (burgerCheck && burgerCheck.checked) {
        burgerCheck.checked = false;
      }
      drawer.classList.add('tm-open');
      backdrop.classList.add('tm-active');
      var searchInput = drawer.querySelector('.tm-drawer-search-input');
      if (searchInput && window.innerWidth >= 640) {
        setTimeout(function () { searchInput.focus(); }, 150);
      }
    }

    function closeDrawer() {
      drawer.classList.remove('tm-open');
      backdrop.classList.remove('tm-active');
    }

    drawer.querySelector('.tm-drawer-close').addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);

    var closeFooterBtn = document.getElementById('tm-btn-close-footer');
    if (closeFooterBtn) {
      closeFooterBtn.addEventListener('click', closeDrawer);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('tm-open')) {
        closeDrawer();
      }
    });

    // Dock switcher button
    drawer.querySelector('.tm-dock-switch').addEventListener('click', function () {
      if (drawer.classList.contains('dock-right')) {
        drawer.classList.remove('dock-right');
        drawer.classList.add('dock-left');
        currentSide = 'left';
      } else {
        drawer.classList.remove('dock-left');
        drawer.classList.add('dock-right');
        currentSide = 'right';
      }
      try {
        savedPos = savedPos || {};
        savedPos.side = currentSide;
        localStorage.setItem('tm_reader_pos', JSON.stringify(savedPos));
      } catch (e) {}
    });

    // Search filter logic
    var searchInput = drawer.querySelector('.tm-drawer-search-input');
    var searchClear = drawer.querySelector('.tm-drawer-search-clear');
    var emptyEl = drawer.querySelector('.tm-drawer-empty');

    function normalizeText(str) {
      return str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');
    }

    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim();
      if (q) {
        searchClear.classList.add('active');
      } else {
        searchClear.classList.remove('active');
      }

      var normQ = normalizeText(q);
      var visibleCount = 0;
      var items = listEl.querySelectorAll('.tm-drawer-item');

      items.forEach(function (item) {
        var text = item.textContent || '';
        var normText = normalizeText(text);
        if (!normQ || normText.indexOf(normQ) !== -1 || text.indexOf(q) !== -1) {
          item.style.display = '';
          visibleCount++;
        } else {
          item.style.display = 'none';
        }
      });

      emptyEl.style.display = (visibleCount === 0) ? 'block' : 'none';
    });

    searchClear.addEventListener('click', function () {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.focus();
    });

    // Smooth Scroll To Heading / Card Helper
    function scrollToHeading(id) {
      var target = document.getElementById(id);
      if (!target) return;

      var headerOffset = 80;
      var elementPosition = target.getBoundingClientRect().top;
      var offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Highlight target with pulse glow
      target.classList.remove('tm-reader-target-glow');
      void target.offsetWidth; // trigger reflow
      target.classList.add('tm-reader-target-glow');
      setTimeout(function () {
        target.classList.remove('tm-reader-target-glow');
      }, 2500);

      // Update URL hash without jumping
      if (window.history && window.history.pushState) {
        window.history.pushState(null, null, '#' + id);
      }
    }

    // Quick Actions (Top, TOC, Bottom)
    document.getElementById('tm-btn-top').addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('tm-btn-toc').addEventListener('click', function (e) {
      e.preventDefault();
      var tocEl = document.getElementById('muc-luc') || document.getElementById('stories');
      if (tocEl) {
        scrollToHeading(tocEl.id);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    document.getElementById('tm-btn-bot').addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });

    // 4. ScrollSpy & Progress Calculation
    var progressCircleBar = btn.querySelector('.tm-progress-circle-bar');
    var drawerProgFill = document.getElementById('tm-drawer-prog-fill');
    var drawerProgText = document.getElementById('tm-drawer-prog-text');

    function onScroll() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var pct = (scrollHeight > 0) ? Math.min(100, Math.max(0, Math.round((scrollTop / scrollHeight) * 100))) : 0;

      // Update button ring
      if (progressCircleBar) {
        var offset = circleCircumference - (pct / 100) * circleCircumference;
        progressCircleBar.style.strokeDashoffset = offset;
      }

      // Update drawer progress
      if (drawerProgFill) drawerProgFill.style.width = pct + '%';
      if (drawerProgText) drawerProgText.textContent = pct + '%';

      // Find active heading / card
      var scrollPos = scrollTop + 100;
      var currentActiveId = null;

      for (var i = 0; i < headings.length; i++) {
        var hTop = headings[i].el.getBoundingClientRect().top + scrollTop;
        if (hTop <= scrollPos) {
          currentActiveId = headings[i].id;
        } else {
          break;
        }
      }

      var items = listEl.querySelectorAll('.tm-drawer-item');
      items.forEach(function (it) {
        if (it.dataset.targetId === currentActiveId) {
          it.classList.add('active');
        } else {
          it.classList.remove('active');
        }
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', applyBtnPosition, { passive: true });
    onScroll();

    // Check if page loaded with a hash (e.g. #truyen-5) and smoothly scroll to it
    if (window.location.hash) {
      var hashId = window.location.hash.substring(1);
      setTimeout(function () {
        scrollToHeading(hashId);
      }, 400);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBookReader);
  } else {
    initBookReader();
  }
})();

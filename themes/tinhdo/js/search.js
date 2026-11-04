/**
 * Tịnh Độ Liên Hoa - Site-Wide Instant Search
 * Tìm kiếm toàn bộ kinh điển, bài giảng, và truyện nhân quả trong hệ thống.
 */
(function() {
  'use strict';

  var searchIndex = null;
  var isLoadingIndex = false;
  var selectedIndex = -1;
  var currentCategory = 'all';

  var accentsMap = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a','ă':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a','â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e','ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o','ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o','ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u','ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
    'đ':'d',
    'À':'a','Á':'a','Ả':'a','Ã':'a','Ạ':'a','Ă':'a','Ằ':'a','Ắ':'a','Ẳ':'a','Ẵ':'a','Ặ':'a','Â':'a','Ầ':'a','Ấ':'a','Ẩ':'a','Ẫ':'a','Ậ':'a',
    'È':'a','É':'e','Ẻ':'e','Ẽ':'e','Ẹ':'e','Ê':'e','Ề':'e','Ế':'e','Ể':'e','Ễ':'e','Ệ':'e',
    'Ì':'i','Í':'i','Ỉ':'i','Ĩ':'i','Ị':'i',
    'Ò':'o','Ó':'o','Ỏ':'o','Õ':'o','Ọ':'o','Ô':'o','Ồ':'o','Ố':'o','Ổ':'o','Ỗ':'o','Ộ':'o','Ơ':'o','Ờ':'o','Ớ':'o','Ở':'o','Ỡ':'o','Ợ':'o',
    'Ù':'u','Ú':'u','Ủ':'u','Ũ':'u','Ụ':'u','Ư':'u','Ừ':'u','Ứ':'u','Ử':'u','Ữ':'u','Ự':'u',
    'Ỳ':'y','Ý':'y','Ỷ':'y','Ỹ':'y','Ỵ':'y',
    'Đ':'d'
  };

  function removeAccents(str) {
    if (!str) return '';
    return str.replace(/[^A-Za-z0-9]/g, function(x) {
      return accentsMap[x] || x;
    }).toLowerCase();
  }

  function getBaseUrl() {
    var link = document.querySelector('link[rel="canonical"]');
    if (link && link.href) {
      try {
        var u = new URL(link.href);
        var p = u.pathname.split('/');
        if (p.length > 1 && p[1] === 'phatphap') return '/phatphap';
      } catch (e) {}
    }
    return (window.location.pathname.indexOf('/phatphap') === 0) ? '/phatphap' : '';
  }

  function loadSearchIndex(callback) {
    if (searchIndex) {
      if (callback) callback(searchIndex);
      return;
    }
    if (isLoadingIndex) return;
    isLoadingIndex = true;

    var url = getBaseUrl() + '/themes/tinhdo/js/search-index.json?v=' + Date.now();
    fetch(url)
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(data) {
        searchIndex = data.items || [];
        isLoadingIndex = false;
        if (callback) callback(searchIndex);
      })
      .catch(function(err) {
        console.warn('[SiteSearch] Không thể tải search index:', err);
        isLoadingIndex = false;
      });
  }

  function createSearchModalDOM() {
    if (document.getElementById('tm-search-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'tm-search-overlay';
    overlay.className = 'tm-search-overlay';
    overlay.innerHTML =
      '<div class="tm-search-modal" role="dialog" aria-modal="true" aria-label="Tìm kiếm">' +
        '<div class="tm-search-header">' +
          '<span class="tm-search-header-icon" aria-hidden="true">🔍</span>' +
          '<input type="text" id="tm-search-input" class="tm-search-input" placeholder="Nhập từ khóa tìm kiếm kinh, truyện, pháp môn, niệm Phật..." autocomplete="off" spellcheck="false" />' +
          '<button type="button" id="tm-search-clear" class="tm-search-clear" title="Xóa từ khóa" aria-label="Xóa">✕</button>' +
          '<button type="button" id="tm-search-close" class="tm-search-close" title="Đóng [Esc]" aria-label="Đóng">Đóng</button>' +
        '</div>' +
        '<div class="tm-search-filters">' +
          '<button type="button" class="tm-filter-chip active" data-cat="all">Tất Cả</button>' +
          '<button type="button" class="tm-filter-chip" data-cat="Pháp Môn Tịnh Độ">🪷 Tịnh Độ</button>' +
          '<button type="button" class="tm-filter-chip" data-cat="Nhân Quả & Nghiệp Báo">⚖️ Nhân Quả</button>' +
          '<button type="button" class="tm-filter-chip" data-cat="Giáo Dục & Trí Tuệ">🎓 Giáo Dục</button>' +
          '<button type="button" class="tm-filter-chip" data-cat="Thông Báo">📢 Thông Báo</button>' +
        '</div>' +
        '<div class="tm-search-meta">' +
          '<span id="tm-search-stats" class="tm-search-stats">Nhập ít nhất 2 ký tự để tìm kiếm</span>' +
        '</div>' +
        '<div class="tm-search-results-wrap" id="tm-search-results-wrap">' +
          '<ul class="tm-search-results" id="tm-search-results"></ul>' +
          '<div class="tm-search-empty" id="tm-search-empty" style="display:none;">' +
            '<p class="empty-icon">🪷</p>' +
            '<p class="empty-text">Không tìm thấy bài viết hoặc câu chuyện phù hợp.</p>' +
            '<p class="empty-hint">Thử tìm với từ khóa ngắn gọn hơn như: <em>nhân quả, vãng sanh, niệm phật, đệ tử quy, hải đào, an sĩ</em>...</p>' +
          '</div>' +
        '</div>' +
        '<div class="tm-search-footer">' +
          '<span class="tm-shortcut-hint"><kbd>↑</kbd><kbd>↓</kbd> Di chuyển</span>' +
          '<span class="tm-shortcut-hint"><kbd>↵</kbd> Xem bài</span>' +
          '<span class="tm-shortcut-hint"><kbd>Esc</kbd> Đóng</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Event bindings inside modal
    var input = document.getElementById('tm-search-input');
    var clearBtn = document.getElementById('tm-search-clear');
    var closeBtn = document.getElementById('tm-search-close');
    var overlayEl = document.getElementById('tm-search-overlay');

    input.addEventListener('input', onSearchInput);
    input.addEventListener('keydown', onInputKeydown);

    clearBtn.addEventListener('click', function() {
      input.value = '';
      input.focus();
      clearBtn.style.display = 'none';
      renderResults([]);
    });

    closeBtn.addEventListener('click', closeSearchModal);

    overlayEl.addEventListener('click', function(e) {
      if (e.target === overlayEl) {
        closeSearchModal();
      }
    });

    // Category filter clicks
    var filterChips = overlayEl.querySelectorAll('.tm-filter-chip');
    filterChips.forEach(function(chip) {
      chip.addEventListener('click', function() {
        filterChips.forEach(function(c) { c.classList.remove('active'); });
        chip.classList.add('active');
        currentCategory = chip.getAttribute('data-cat') || 'all';
        onSearchInput();
      });
    });
  }

  function openSearchModal() {
    createSearchModalDOM();
    var overlay = document.getElementById('tm-search-overlay');
    var input = document.getElementById('tm-search-input');
    overlay.classList.add('open');
    document.body.classList.add('tm-search-open');

    // Preload index
    loadSearchIndex(function() {
      if (input.value.trim().length >= 2) {
        onSearchInput();
      }
    });

    setTimeout(function() {
      input.focus();
      input.select();
    }, 50);
  }

  function closeSearchModal() {
    var overlay = document.getElementById('tm-search-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.classList.remove('tm-search-open');
  }

  function highlightMatches(text, queryWords) {
    if (!text) return '';
    var safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (!queryWords || queryWords.length === 0) return safeText;

    // Build regex from query words
    var escaped = queryWords.map(function(w) {
      return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).filter(function(w) { return w.length > 0; });

    if (escaped.length === 0) return safeText;

    try {
      var regex = new RegExp('(' + escaped.join('|') + ')', 'gi');
      return safeText.replace(regex, '<mark class="tm-search-mark">$1</mark>');
    } catch (e) {
      return safeText;
    }
  }

  function performSearch(query, cat) {
    if (!searchIndex || !query) return [];
    var rawQ = query.trim().toLowerCase();
    var normQ = removeAccents(rawQ);
    var tokens = normQ.split(/\s+/).filter(function(t) { return t.length > 0; });
    var rawTokens = rawQ.split(/\s+/).filter(function(t) { return t.length > 0; });

    if (tokens.length === 0) return [];

    var results = [];

    for (var i = 0; i < searchIndex.length; i++) {
      var item = searchIndex[i];

      // Filter by category if not 'all'
      if (cat !== 'all' && item.category !== cat) {
        continue;
      }

      var itemNorm = item.norm || '';
      var itemTitleNorm = removeAccents(item.title);
      var itemParentNorm = removeAccents(item.parent || '');

      // Check if all tokens match
      var allMatch = true;
      for (var t = 0; t < tokens.length; t++) {
        if (itemNorm.indexOf(tokens[t]) === -1) {
          allMatch = false;
          break;
        }
      }
      if (!allMatch) continue;

      // Scoring
      var score = 0;
      if (itemTitleNorm.indexOf(normQ) !== -1) {
        score += 150; // Exact phrase in title
      } else {
        for (var t2 = 0; t2 < tokens.length; t2++) {
          if (itemTitleNorm.indexOf(tokens[t2]) !== -1) score += 40;
          if (itemParentNorm.indexOf(tokens[t2]) !== -1) score += 20;
        }
      }

      // Boost page over chapter slightly or vice-versa
      if (item.type === 'page') score += 15;

      results.push({
        item: item,
        score: score,
        rawTokens: rawTokens
      });
    }

    // Sort by score descending
    results.sort(function(a, b) {
      return b.score - a.score;
    });

    return results.slice(0, 50); // Top 50 results
  }

  function renderResults(results, queryWords) {
    var resultsUl = document.getElementById('tm-search-results');
    var emptyDiv = document.getElementById('tm-search-empty');
    var statsSpan = document.getElementById('tm-search-stats');
    var input = document.getElementById('tm-search-input');
    var clearBtn = document.getElementById('tm-search-clear');

    var query = input ? input.value.trim() : '';
    if (clearBtn) {
      clearBtn.style.display = query ? 'block' : 'none';
    }

    if (!query || query.length < 2) {
      resultsUl.innerHTML = '';
      emptyDiv.style.display = 'none';
      statsSpan.textContent = 'Nhập ít nhất 2 ký tự để tìm kiếm trong 400+ kinh sách & câu chuyện';
      selectedIndex = -1;
      return;
    }

    if (results.length === 0) {
      resultsUl.innerHTML = '';
      emptyDiv.style.display = 'block';
      statsSpan.textContent = '0 kết quả cho "' + query + '"';
      selectedIndex = -1;
      return;
    }

    emptyDiv.style.display = 'none';
    statsSpan.innerHTML = 'Tìm thấy <strong>' + results.length + '</strong> kết quả cho "' + query + '"';

    var baseUrl = getBaseUrl();
    var html = '';

    results.forEach(function(r, idx) {
      var item = r.item;
      var fullUrl = baseUrl + item.url;
      var highlightedTitle = highlightMatches(item.title, r.rawTokens);
      var highlightedSnippet = highlightMatches(item.snippet, r.rawTokens);
      var catBadge = item.category || 'Phật Pháp';
      var parentText = item.parent && item.parent !== item.title ? item.parent : '';

      html +=
        '<li class="tm-search-item" data-index="' + idx + '" data-url="' + fullUrl + '">' +
          '<a href="' + fullUrl + '" class="tm-search-link">' +
            '<div class="tm-search-item-top">' +
              '<span class="tm-search-badge ' + getBadgeClass(catBadge) + '">' + catBadge + '</span>' +
              (parentText ? '<span class="tm-search-parent">' + parentText + '</span>' : '') +
            '</div>' +
            '<h4 class="tm-search-item-title">' + highlightedTitle + '</h4>' +
            (highlightedSnippet ? '<p class="tm-search-item-snippet">' + highlightedSnippet + '</p>' : '') +
            '<span class="tm-search-action">Đọc tiếp →</span>' +
          '</a>' +
        '</li>';
    });

    resultsUl.innerHTML = html;
    selectedIndex = -1;
  }

  function getBadgeClass(cat) {
    if (cat.indexOf('Tịnh Độ') !== -1) return 'cat-tinhdo';
    if (cat.indexOf('Nhân Quả') !== -1) return 'cat-nhanqua';
    if (cat.indexOf('Giáo Dục') !== -1) return 'cat-giaoduc';
    return 'cat-default';
  }

  var searchDebounceTimer = null;
  function onSearchInput() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(function() {
      var input = document.getElementById('tm-search-input');
      if (!input) return;
      var q = input.value.trim();
      if (q.length < 2) {
        renderResults([]);
        return;
      }
      loadSearchIndex(function() {
        var results = performSearch(q, currentCategory);
        renderResults(results, q.split(/\s+/));
      });
    }, 80);
  }

  function onInputKeydown(e) {
    var items = document.querySelectorAll('.tm-search-item');
    if (items.length === 0) {
      if (e.key === 'Escape') {
        closeSearchModal();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex++;
      if (selectedIndex >= items.length) selectedIndex = 0;
      updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex--;
      if (selectedIndex < 0) selectedIndex = items.length - 1;
      updateActiveItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        var targetLink = items[selectedIndex].querySelector('a');
        if (targetLink) targetLink.click();
      } else if (items.length > 0) {
        var firstLink = items[0].querySelector('a');
        if (firstLink) firstLink.click();
      }
    } else if (e.key === 'Escape') {
      closeSearchModal();
    }
  }

  function updateActiveItem(items) {
    items.forEach(function(it, idx) {
      if (idx === selectedIndex) {
        it.classList.add('selected');
        it.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        it.classList.remove('selected');
      }
    });
  }

  function initGlobalTriggers() {
    // 1. Hotkey Ctrl+K / Cmd+K or "/"
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openSearchModal();
        return;
      }
      if (e.key === '/' && !isInputFocused()) {
        e.preventDefault();
        openSearchModal();
        return;
      }
      if (e.key === 'Escape') {
        closeSearchModal();
      }
    });

    // 2. Click on elements with [data-search-trigger] or specific IDs
    document.addEventListener('click', function(e) {
      var trigger = e.target.closest('#tm-search-trigger, #tm-search-trigger-mobile, #tm-sidebar-search-trigger, .tinhdo-search-trigger');
      if (trigger) {
        e.preventDefault();
        openSearchModal();
      }
    });

    // Preload index when user hovers over a search trigger
    document.addEventListener('mouseover', function(e) {
      if (e.target.closest('#tm-search-trigger, #tm-search-trigger-mobile, #tm-sidebar-search-trigger, .tinhdo-search-trigger')) {
        loadSearchIndex();
      }
    });
  }

  function isInputFocused() {
    var tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    return tag === 'input' || tag === 'textarea' || tag === 'select' || (document.activeElement && document.activeElement.isContentEditable);
  }

  // Expose to window
  window.tmOpenSearch = openSearchModal;
  window.tmCloseSearch = closeSearchModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalTriggers);
  } else {
    initGlobalTriggers();
  }
})();

/* Navigation Accordion (Expand/Collapse Folder Items) */
(function() {
  'use strict';
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
        li.classList.remove('is-expanded');
        li.classList.add('is-collapsed');
        toggleBtn.setAttribute('aria-expanded', 'false');
        if (sublist) sublist.style.display = 'none';
      } else {
        li.classList.remove('is-collapsed');
        li.classList.add('is-expanded');
        toggleBtn.setAttribute('aria-expanded', 'true');
        if (sublist) sublist.style.display = 'block';
      }
    });

    var burger = document.getElementById('burger');
    if (burger) {
      var navLinks = document.querySelectorAll('.mainnavigation a');
      for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].addEventListener('click', function() {
          if (window.innerWidth <= 800) {
            burger.checked = false;
          }
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigationAccordion);
  } else {
    initNavigationAccordion();
  }
})();
/**
 * Tịnh Độ Liên Hoa - Theme Scripts
 */
(function() {
  'use strict';

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
  } else {
    initMobileMenu();
  }
})();

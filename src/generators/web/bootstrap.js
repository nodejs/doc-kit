'use strict';

{
  function setupSidebarScroll() {
    // eslint-disable-next-line no-undef
    const sidebarLinks = document.querySelectorAll('aside > section > ul > a');

    let link;
    for (link of sidebarLinks) {
      // eslint-disable-next-line no-undef
      if (link.pathname === window.location.pathname) break;
    }

    if (!link) return;

    link.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function bootstrap() {
    setupSidebarScroll();
  }

  // eslint-disable-next-line no-undef
  if (document.readyState === 'loading') {
    // eslint-disable-next-line no-undef
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
}

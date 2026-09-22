/* =========================================================================
   CINOU DEVICE ROUTER — client-side safety net (OPTIONAL)

   The real routing happens on the server (server.js decides which
   index.html answers "/"). This file only covers the cases the server
   can't:

     · the page was opened from the service-worker cache while offline
     · the site is hosted as plain static files with no Node server
     · a proxy/CDN served one device's copy to another

   Drop it in public/ and add ONE line to public/index.html, as the very
   first script inside <head>:

       <script src="cinou-device-router.js"></script>

   It changes nothing about how the desktop page looks or works — it only
   redirects a phone/tablet that ended up on the desktop page, and only
   when the visitor hasn't asked for the desktop version on purpose.
   ========================================================================= */

(function () {
    'use strict';

    const KEY = 'cinou_view';

    try {

        const params = new URLSearchParams(window.location.search);
        const requested = (params.get('view') || '').toLowerCase();

        /* 1. explicit choice in the URL wins and is remembered */
        if (requested === 'desktop' || requested === 'mobile') {
            localStorage.setItem(KEY, requested);
            document.cookie = 'cinou_view=' + requested + '; Path=/; Max-Age=31536000; SameSite=Lax';
            return;
        }

        /* 2. a remembered choice is respected */
        const saved = localStorage.getItem(KEY);

        if (saved === 'desktop' || saved === 'mobile') {
            document.cookie = 'cinou_view=' + saved + '; Path=/; Max-Age=31536000; SameSite=Lax';
            return;
        }

        /* 3. otherwise: is this a touch device on the wrong page? */
        if (!isTouchDevice()) {
            return;
        }

        // this file ships with the DESKTOP page, so reaching here on a
        // phone or tablet means we're on the wrong side.
        window.location.replace('/?view=mobile');

    } catch (err) {
        /* private mode, blocked storage, anything — just leave the page alone */
    }


    function isTouchDevice() {

        const ua = (navigator.userAgent || '').toLowerCase();

        const platform = (
            (navigator.userAgentData && navigator.userAgentData.platform) ||
            navigator.platform ||
            ''
        ).toLowerCase();

        // iPadOS 13+ reports itself as a Mac, so check the touch points too
        const iPadOS = platform === 'macintel' && navigator.maxTouchPoints > 1;

        const tablet =
            /ipad|tablet|playbook|silk|kindle/.test(ua) ||
            (/android/.test(ua) && !/mobile/.test(ua)) ||
            iPadOS;

        const phone =
            /iphone|ipod/.test(ua) ||
            /android.*mobile/.test(ua) ||
            /windows phone|iemobile/.test(ua) ||
            /blackberry|bb10/.test(ua) ||
            /opera mini|opera mobi/.test(ua);

        return tablet || phone;
    }

})();

/* =========================================================================
   CINOU DEVICE APP — standalone, does not touch app.js
   Detects the visitor's device (Windows / Mac / Linux / Android / iOS,
   and phone vs tablet vs desktop), adds a "Get the App" item to the
   sidebar (next to "Developer Zone"), and on click opens a modal that
   shows ONLY that visitor's device — automatically, no picking between
   PC / Phone / Tablet previews.

     1. If the browser already fired `beforeinstallprompt` (Chrome/Edge/
        Android/ChromeOS, once manifest.json + sw.js are being served)
        → triggers the REAL native install prompt. Accepting it installs
        CinouAI as a standalone app with its own window/icon — genuine
        "software" for that device, no app store needed.
     2. If iOS Safari (which never fires that event, by Apple's design)
        → shows quick "Add to Home Screen" steps inside the same modal.
     3. Otherwise (browser doesn't support install yet, e.g. Firefox
        desktop) → shows a friendly "coming soon" note inside the modal.

   Reuses the site's existing `.dev-item` / `.user-meta` / `.sidebar-text`
   classes so it automatically matches the current theme and collapses
   correctly with the sidebar — no changes needed to style.css.
   ========================================================================= */

(function () {
    'use strict';

    const SW_PATH = 'sw.js';

    let deferredPrompt = null;
    let installState = 'idle'; // 'idle' | 'available' | 'installed'

    const platform = detectPlatform();

    document.addEventListener('DOMContentLoaded', () => {
        registerServiceWorker();
        injectSidebarButton();
        updateButtonState();
        maybeAutoOpenForPhone();
    });

    /* Phone visitors get the device card immediately on load — no tap
       needed. Desktop/tablet still use the sidebar "Get the App" button,
       so the card doesn't pop up unasked-for on bigger screens. */
    function maybeAutoOpenForPhone() {
        if (platform.deviceType !== 'phone') return;
        if (isRunningStandalone()) return; // already installed & running as the app — no need to show it
        openDeviceModal();
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installState = 'available';
        updateButtonState();
        refreshModalIfOpen();
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        installState = 'installed';
        updateButtonState();
        refreshModalIfOpen();
    });


    /* ---------------- device / platform detection ---------------- */

    function detectPlatform() {
        const ua = navigator.userAgent || '';
        const uaPlatform = (
            (navigator.userAgentData && navigator.userAgentData.platform) ||
            navigator.platform ||
            ''
        ).toLowerCase();

        const isIOS =
            /iphone|ipad|ipod/i.test(ua) ||
            (uaPlatform === 'macintel' && navigator.maxTouchPoints > 1); // iPadOS 13+

        const isAndroid = /android/i.test(ua);
        const isWindows = /win/i.test(uaPlatform) || /windows/i.test(ua);
        const isMac = /mac/i.test(uaPlatform) && !isIOS;
        const isLinux = /linux/i.test(uaPlatform) && !isAndroid;

        const isTablet =
            /ipad/i.test(ua) ||
            (isAndroid && !/mobile/i.test(ua)) ||
            (isIOS && navigator.maxTouchPoints > 1 && !/iphone/i.test(ua));

        let deviceType = 'desktop';
        if (isIOS || isAndroid) deviceType = isTablet ? 'tablet' : 'phone';

        let key = 'other';
        let label = 'your device';

        if (isIOS) {
            key = 'ios';
            label = deviceType === 'tablet' ? 'iPad' : 'iPhone';
        } else if (isAndroid) {
            key = 'android';
            label = deviceType === 'tablet' ? 'Android Tablet' : 'Android';
        } else if (isWindows) {
            key = 'windows';
            label = 'Windows';
        } else if (isMac) {
            key = 'mac';
            label = 'Mac';
        } else if (isLinux) {
            key = 'linux';
            label = 'Linux';
        }

        return { key, label, deviceType };
    }

    function isRunningStandalone() {
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true // iOS Safari's own flag
        );
    }


    /* ---------------- service worker (enables install + offline shell) ---------------- */

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register(SW_PATH).catch((err) => {
            console.warn('CinouAI: service worker registration failed', err);
        });
    }


    /* ---------------- sidebar button ---------------- */

    function injectSidebarButton() {

        const devBox = document.querySelector('.sidebar-dev-box');
        if (!devBox) return; // sidebar structure not found — fail silently

        if (document.getElementById('cinou-get-app-btn')) return; // already injected

        const item = document.createElement('button');
        item.type = 'button';
        item.id = 'cinou-get-app-btn';
        item.className = 'dev-item';
        item.title = 'Get the CinouAI app for this device';
        item.style.width = '100%';
        item.style.border = '0';
        item.style.background = 'transparent';
        item.style.font = 'inherit';
        item.style.textAlign = 'left';

        item.innerHTML =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
            'stroke="currentColor" stroke-width="2">' +
            '<rect x="3" y="4" width="18" height="13" rx="2"></rect>' +
            '<line x1="8" y1="21" x2="16" y2="21"></line>' +
            '<line x1="12" y1="17" x2="12" y2="21"></line>' +
            '</svg>' +
            '<div class="user-meta sidebar-text">' +
            '<span class="user-name">Get the App</span>' +
            '<span class="user-sub" id="cinou-get-app-sub">For ' + platform.label + '</span>' +
            '</div>';

        devBox.appendChild(item);

        item.addEventListener('click', () => openDeviceModal());
    }

    function updateButtonState() {

        const sub = document.getElementById('cinou-get-app-sub');
        if (!sub) return;

        if (isRunningStandalone() || installState === 'installed') {
            sub.textContent = 'Installed ✓';
        } else if (installState === 'available') {
            sub.textContent = 'Install for ' + platform.label;
        } else {
            sub.textContent = 'For ' + platform.label;
        }
    }


    /* ---------------- install action (shared by modal button) ---------------- */

    async function runInstallAction(statusEl) {

        if (isRunningStandalone()) {
            if (statusEl) statusEl.textContent = "You're already using the installed CinouAI app.";
            return;
        }

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice.catch(() => null);
            deferredPrompt = null;

            if (choice && choice.outcome === 'accepted') {
                installState = 'installed';
            }
            updateButtonState();
            refreshModalIfOpen();
            return;
        }

        if (platform.key === 'ios') {
            showIOSStepsInline(statusEl);
            return;
        }

        if (statusEl) {
            statusEl.textContent =
                'A downloadable build for ' + platform.label + ' is coming soon. ' +
                'Meanwhile, look for "Install" or "Add to Home Screen" in your browser menu.';
        }
    }

    function showIOSStepsInline(container) {
        if (!container) return;
        container.innerHTML =
            '<ol class="cinou-ios-steps">' +
            '<li>Tap the <strong>Share</strong> icon in Safari\'s toolbar.</li>' +
            '<li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>' +
            '<li>Tap <strong>Add</strong> — CinouAI opens like a normal app from then on.</li>' +
            '</ol>';
    }


    /* ---------------- device showcase modal (auto — only THIS device) ---------------- */

    let modalEl = null;

    function refreshModalIfOpen() {
        if (modalEl && document.body.contains(modalEl)) {
            openDeviceModal(); // re-render with fresh state
        }
    }

    function openDeviceModal() {

        ensureStyles();
        closeDeviceModal();

        const overlay = document.createElement('div');
        overlay.className = 'cinou-device-overlay';

        const card = document.createElement('div');
        card.className = 'cinou-device-card';

        card.innerHTML =
            '<button type="button" class="cinou-device-close" aria-label="Close">&times;</button>' +
            '<div class="cinou-device-header">' +
                '<div class="cinou-device-title">CINOU AI</div>' +
                '<div class="cinou-device-tagline">Your AI. Everywhere.</div>' +
            '</div>' +
            '<div class="cinou-device-preview-wrap">' + buildMockupHTML() + '</div>' +
            '<div class="cinou-device-status" id="cinou-device-status"></div>' +
            '<button type="button" class="cinou-device-install-btn" id="cinou-device-install-btn">' +
                installButtonLabel() +
            '</button>' +
            '<div class="cinou-device-footer">ONE AI &nbsp;•&nbsp; YOUR DEVICE</div>';

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        modalEl = overlay;

        requestAnimationFrame(() => overlay.classList.add('is-visible'));

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDeviceModal();
        });
        card.querySelector('.cinou-device-close').addEventListener('click', closeDeviceModal);

        const statusEl = card.querySelector('#cinou-device-status');
        card.querySelector('#cinou-device-install-btn').addEventListener('click', () => {
            runInstallAction(statusEl);
        });

        document.addEventListener('keydown', escCloseHandler);
    }

    function escCloseHandler(e) {
        if (e.key === 'Escape') closeDeviceModal();
    }

    function closeDeviceModal() {
        if (!modalEl) return;
        const el = modalEl;
        modalEl = null;
        el.classList.remove('is-visible');
        document.removeEventListener('keydown', escCloseHandler);
        setTimeout(() => el.remove(), 200);
    }

    function installButtonLabel() {
        if (isRunningStandalone() || installState === 'installed') return 'Installed ✓';
        if (deferredPrompt) return 'Install for ' + platform.label;
        if (platform.key === 'ios') return 'Show me how';
        return 'Install for ' + platform.label;
    }

    /* Builds one mockup that resembles the real chat UI, sized/shaped for
       the visitor's actual device type — desktop gets the sidebar+chat
       layout, phone/tablet get the compact single-column layout. */
    function buildMockupHTML() {

        const isCompact = platform.deviceType === 'phone' || platform.deviceType === 'tablet';
        const frameClass = 'cinou-mock cinou-mock-' + platform.deviceType;

        if (isCompact) {
            return (
                '<div class="' + frameClass + '">' +
                    '<div class="cinou-mock-bar"></div>' +
                    '<div class="cinou-mock-titlebar">CINOU AI</div>' +
                    '<div class="cinou-mock-body">' +
                        '<div class="cinou-mock-bubble">' +
                            '<span class="cinou-mock-emoji">🤖</span>' +
                            'Chat with Cinou<br>Hello! How can I help you today?' +
                        '</div>' +
                    '</div>' +
                    '<div class="cinou-mock-inputbar">' +
                        '<span class="cinou-mock-input">Ask anything…</span>' +
                        (platform.deviceType === 'phone' ? '<span class="cinou-mock-mic">🎤</span>' : '') +
                    '</div>' +
                '</div>'
            );
        }

        // desktop
        return (
            '<div class="' + frameClass + '">' +
                '<div class="cinou-mock-bar"></div>' +
                '<div class="cinou-mock-desktop-body">' +
                    '<div class="cinou-mock-sidebar">' +
                        '<div class="cinou-mock-logo">CINOU<br>AI</div>' +
                        '<div class="cinou-mock-navitem">Chat</div>' +
                        '<div class="cinou-mock-navitem">Images</div>' +
                        '<div class="cinou-mock-navitem">Code</div>' +
                        '<div class="cinou-mock-navitem">Memory</div>' +
                    '</div>' +
                    '<div class="cinou-mock-main">' +
                        '<div class="cinou-mock-bubble">Hello! I\'m Cinou AI 🤖</div>' +
                        '<div class="cinou-mock-sub">Ask me anything</div>' +
                        '<div class="cinou-mock-inputbar"><span class="cinou-mock-input">Type here…</span></div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    }


    /* ---------------- styles ---------------- */

    function ensureStyles() {

        if (document.getElementById('cinou-device-app-style')) return;

        const style = document.createElement('style');
        style.id = 'cinou-device-app-style';
        style.textContent = `
            .cinou-device-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);
                display:flex;align-items:center;justify-content:center;z-index:10000;
                padding:20px;opacity:0;transition:opacity .2s ease;}
            .cinou-device-overlay.is-visible{opacity:1;}

            .cinou-device-card{background:var(--bg-card,#181a20);color:var(--text-primary,#f3f4f6);
                border:1px solid var(--border-color,rgba(255,255,255,.08));border-radius:20px;
                padding:28px 24px 22px;max-width:360px;width:100%;position:relative;
                box-shadow:var(--shadow-soft,0 20px 50px rgba(0,0,0,.45));
                text-align:center;transform:translateY(8px);transition:transform .2s ease;}
            .cinou-device-overlay.is-visible .cinou-device-card{transform:translateY(0);}

            .cinou-device-close{position:absolute;top:10px;right:12px;background:transparent;
                border:0;color:var(--text-secondary,#9ca3af);font-size:22px;line-height:1;
                cursor:pointer;padding:4px 8px;border-radius:8px;}
            .cinou-device-close:hover{background:rgba(255,255,255,.06);}

            .cinou-device-title{font-weight:800;letter-spacing:.06em;font-size:20px;
                background:linear-gradient(90deg,#fde68a,#f97316,#ef4444);
                -webkit-background-clip:text;background-clip:text;color:transparent;}
            .cinou-device-tagline{font-size:12.5px;color:var(--text-secondary,#9ca3af);margin-top:2px;}

            .cinou-device-preview-wrap{display:flex;justify-content:center;margin:20px 0 6px;}

            .cinou-mock{border-radius:14px;overflow:hidden;
                border:1px solid var(--border-color,rgba(255,255,255,.1));
                background:var(--bg-secondary,#101216);box-shadow:0 10px 24px rgba(0,0,0,.35);}
            .cinou-mock-bar{height:8px;
                background:linear-gradient(90deg,#fde68a,#f97316,#ef4444);}

            /* phone / tablet */
            .cinou-mock-phone{width:200px;}
            .cinou-mock-tablet{width:250px;}
            .cinou-mock-titlebar{font-size:12px;font-weight:700;text-align:center;
                padding:8px 0 6px;letter-spacing:.04em;color:var(--text-primary,#f3f4f6);}
            .cinou-mock-body{padding:0 12px 12px;min-height:70px;display:flex;align-items:flex-start;}
            .cinou-mock-bubble{background:var(--bg-card,#1c1f26);border:1px solid var(--border-color,rgba(255,255,255,.08));
                border-radius:12px;padding:10px 12px;font-size:11.5px;line-height:1.5;text-align:left;
                color:var(--text-primary,#f3f4f6);}
            .cinou-mock-emoji{margin-right:4px;}
            .cinou-mock-sub{font-size:11px;color:var(--text-secondary,#9ca3af);margin:8px 0 10px;text-align:left;padding:0 2px;}
            .cinou-mock-inputbar{display:flex;align-items:center;gap:8px;margin:0 12px 12px;
                background:var(--bg-secondary,#0d0e11);border:1px solid var(--border-color,rgba(255,255,255,.08));
                border-radius:999px;padding:8px 12px;}
            .cinou-mock-desktop-body .cinou-mock-inputbar{margin:10px 0 0;}
            .cinou-mock-input{font-size:11px;color:var(--text-secondary,#9ca3af);flex:1;text-align:left;}
            .cinou-mock-mic{font-size:12px;}

            /* desktop */
            .cinou-mock-desktop{width:320px;}
            .cinou-mock-desktop-body{display:flex;min-height:130px;}
            .cinou-mock-sidebar{width:78px;background:var(--bg-secondary,#101216);
                border-right:1px solid var(--border-color,rgba(255,255,255,.08));
                padding:10px 8px;text-align:left;}
            .cinou-mock-logo{font-size:9.5px;font-weight:800;letter-spacing:.04em;margin-bottom:10px;
                color:var(--text-primary,#f3f4f6);}
            .cinou-mock-navitem{font-size:9.5px;color:var(--text-secondary,#9ca3af);padding:4px 0;}
            .cinou-mock-main{flex:1;padding:12px;text-align:left;}

            .cinou-device-status{min-height:16px;font-size:11.5px;color:var(--text-secondary,#9ca3af);
                margin:14px 4px 4px;line-height:1.6;}
            .cinou-ios-steps{margin:0;padding-left:18px;font-size:11.5px;line-height:1.7;text-align:left;
                color:var(--text-secondary,#9ca3af);}

            .cinou-device-install-btn{width:100%;margin-top:10px;padding:11px;border:0;border-radius:12px;
                background:var(--accent,#6366f1);color:#fff;font-weight:700;font-size:13.5px;cursor:pointer;}
            .cinou-device-install-btn:hover{filter:brightness(1.08);}

            .cinou-device-footer{margin-top:16px;font-size:10.5px;letter-spacing:.12em;
                color:var(--text-secondary,#9ca3af);opacity:.8;}
        `;

        document.head.appendChild(style);
    }

})();

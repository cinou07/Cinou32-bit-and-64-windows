/* =========================================================================
   CINOU CODE PANEL — FULLSCREEN BUTTON (STANDALONE)
   Self-contained. Does not touch app.js or any other existing code.
   Wires up the VS-Code-style maximize/restore toggle on #code-panel.
   ========================================================================= */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {

        const codePanel = document.getElementById('code-panel');

        if (!codePanel) return;

        // Reuses the button already in your HTML (#fullscreen-code-panel-btn).
        // If it doesn't exist yet, creates it and drops it into the toolbar.
        let fsBtn = document.getElementById('fullscreen-code-panel-btn');

        const closeBtn = document.getElementById('close-code-panel-btn');

        const toolbar =
            (closeBtn && closeBtn.parentElement) ||
            document.querySelector('.code-panel-actions') ||
            codePanel;

        // VS Code style "maximize" icon (expand arrows)
        const maximizeIcon = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>`;

        // VS Code style "restore" icon (collapse arrows)
        const restoreIcon = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
                <polyline points="4 14 10 14 10 20"></polyline>
                <polyline points="20 10 14 10 14 4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>`;

        if (!fsBtn) {

            fsBtn = document.createElement('button');
            fsBtn.id = 'fullscreen-code-panel-btn';
            fsBtn.type = 'button';
            fsBtn.className = 'code-action-btn';
            fsBtn.title = 'Toggle fullscreen';
            fsBtn.innerHTML = maximizeIcon;

            if (closeBtn) {
                toolbar.insertBefore(fsBtn, closeBtn);
            } else {
                toolbar.appendChild(fsBtn);
            }
        }

        // Click handler — toggles the .fullscreen class + swaps the icon
        fsBtn.addEventListener('click', () => {

            const isFullscreen =
                codePanel.classList.toggle('fullscreen');

            fsBtn.innerHTML =
                isFullscreen ? restoreIcon : maximizeIcon;

            fsBtn.title =
                isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen';
        });

        // Esc exits fullscreen first (before closing the panel itself)
        document.addEventListener('keydown', (e) => {

            if (
                e.key === 'Escape' &&
                codePanel.classList.contains('fullscreen')
            ) {

                codePanel.classList.remove('fullscreen');

                fsBtn.innerHTML = maximizeIcon;
                fsBtn.title = 'Toggle fullscreen';
            }
        });

        // Fallback CSS — only injected if #code-panel.fullscreen
        // isn't already styled in your stylesheet.
        if (!document.getElementById('cinou-fullscreen-fallback-style')) {

            const style = document.createElement('style');
            style.id = 'cinou-fullscreen-fallback-style';

            style.textContent = `
                #code-panel.fullscreen {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    max-width: none !important;
                    max-height: none !important;
                    z-index: 9999 !important;
                    border-radius: 0 !important;
                }
            `;

            document.head.appendChild(style);
        }

    });

})();
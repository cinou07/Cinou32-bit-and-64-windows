/* =========================================================================
   CINOU BUILD — PREVIEW FULLSCREEN BUTTON (standalone, does not touch app.js)
   Adds a fullscreen toggle to the live preview, with its own X close button
   that exits back to the normal Build workspace (not back to chat).
   ========================================================================= */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {

        const previewArea = document.querySelector('.build-preview-area');
        const previewHeader = document.querySelector('.build-preview-header');
        const runBtn = document.getElementById('build-run-btn');

        if (!previewArea || !previewHeader || !runBtn) return;

        // ---- Create the "Fullscreen" button next to RUN ----
        let fsBtn = document.getElementById('build-preview-fullscreen-btn');

        if (!fsBtn) {
            fsBtn = document.createElement('button');
            fsBtn.id = 'build-preview-fullscreen-btn';
            fsBtn.type = 'button';
            fsBtn.innerHTML = '⛶ Fullscreen';
            previewHeader.appendChild(fsBtn);
        }

        // ---- Create the "X" close button (only visible in fullscreen) ----
        let closeBtn = document.getElementById('build-preview-close-btn');

        if (!closeBtn) {
            closeBtn = document.createElement('button');
            closeBtn.id = 'build-preview-close-btn';
            closeBtn.type = 'button';
            closeBtn.innerHTML = '&times;';
            closeBtn.title = 'Exit fullscreen';
            closeBtn.style.display = 'none';
            previewArea.appendChild(closeBtn);
        }

        function enterFullscreen() {
            previewArea.classList.add('preview-fullscreen');
            closeBtn.style.display = 'flex';
        }

        function exitFullscreen() {
            previewArea.classList.remove('preview-fullscreen');
            closeBtn.style.display = 'none';
        }

        fsBtn.addEventListener('click', () => {
            if (previewArea.classList.contains('preview-fullscreen')) {
                exitFullscreen();
            } else {
                enterFullscreen();
            }
        });

        closeBtn.addEventListener('click', exitFullscreen);

        // Esc exits preview fullscreen
        document.addEventListener('keydown', (e) => {
            if (
                e.key === 'Escape' &&
                previewArea.classList.contains('preview-fullscreen')
            ) {
                exitFullscreen();
            }
        });

        // Optional: auto-fullscreen right when the user presses RUN
        // Comment this out if you'd rather they click "Fullscreen" manually.
        runBtn.addEventListener('click', () => {
            setTimeout(enterFullscreen, 50);
        });

    });

})();
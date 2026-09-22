/* =========================================================================
   CINOU QUICK OPTIONS — standalone, does not touch app.js
   When the AI's reply ends with a [[QUICK_OPTIONS]] ... [[/QUICK_OPTIONS]]
   block (see the CLARIFYING QUESTIONS addition in the system prompt),
   this replaces that raw block with tappable choice buttons. Tapping a
   button fills the input with that option and sends it, exactly like the
   user typed it themselves.
   ========================================================================= */

(function () {
    'use strict';

    const START_TOKEN = '[[QUICK_OPTIONS]]';
    const END_TOKEN = '[[/QUICK_OPTIONS]]';

    document.addEventListener('DOMContentLoaded', () => {

        const chatBox = document.getElementById('chat-box');
        const userInput = document.getElementById('user-input');
        const sendBtn = document.getElementById('send-btn');

        if (!chatBox) return;

        const observer = new MutationObserver(() => scanForFinishedBubbles(chatBox, userInput, sendBtn));

        observer.observe(chatBox, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['class']
        });

        // In case history is already rendered before this script runs.
        scanForFinishedBubbles(chatBox, userInput, sendBtn);
    });


    function scanForFinishedBubbles(chatBox, userInput, sendBtn) {

        const bubbles = chatBox.querySelectorAll('.ai-message:not(.cinou-typing)');

        bubbles.forEach((bubble) => {

            if (bubble.dataset.cinouChecked === '1') return;
            if (!bubble.innerHTML.includes(START_TOKEN)) return;
            if (!bubble.innerHTML.includes(END_TOKEN)) return;

            bubble.dataset.cinouChecked = '1';
            processBubble(bubble, userInput, sendBtn);
        });
    }


    function processBubble(bubble, userInput, sendBtn) {

        const html = bubble.innerHTML;

        const startIdx = html.indexOf(START_TOKEN);
        const endIdx = html.indexOf(END_TOKEN);

        if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return;

        const before = html.slice(0, startIdx);
        const middle = html.slice(startIdx + START_TOKEN.length, endIdx);
        const after = html.slice(endIdx + END_TOKEN.length);

        const tmp = document.createElement('div');
        tmp.innerHTML = middle;

        const options = Array.from(tmp.querySelectorAll('li'))
            .map((li) => li.textContent.trim())
            .filter(Boolean);

        if (options.length < 2) return; // not a well-formed block — leave the message as-is

        tmp.querySelectorAll('ul, ol').forEach((el) => el.remove());
        const question = tmp.textContent.replace(/\s+/g, ' ').trim();

        const cleanedBefore = before.replace(/<p>\s*<\/p>\s*$/i, '');
        const cleanedAfter = after.replace(/^\s*<p>\s*<\/p>/i, '');

        bubble.innerHTML = cleanedBefore + cleanedAfter;

        renderOptionBar(bubble, question, options, userInput, sendBtn);
    }


    function renderOptionBar(bubble, question, options, userInput, sendBtn) {

        const bar = document.createElement('div');
        bar.className = 'cinou-quick-options';

        if (question) {
            const q = document.createElement('div');
            q.className = 'cinou-quick-options-question';
            q.textContent = question;
            bar.appendChild(q);
        }

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.flexWrap = 'wrap';
        btnRow.style.gap = '8px';

        options.forEach((optionText) => {

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cinou-quick-option-btn';
            btn.textContent = optionText;

            btn.addEventListener('click', () => {

                if (bar.classList.contains('is-answered')) return;
                bar.classList.add('is-answered');

                if (!userInput || !sendBtn) return;

                userInput.value = optionText;
                userInput.dispatchEvent(new Event('input', { bubbles: true }));
                sendBtn.click();
            });

            btnRow.appendChild(btn);
        });

        bar.appendChild(btnRow);
        bubble.appendChild(bar);
    }

})();

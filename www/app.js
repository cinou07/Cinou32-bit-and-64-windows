/* =========================================================================
   CINOU AI CORE APPLICATION
   Rebuilt to match the real HTML/CSS (marked.js + highlight.js), with:
   - Code shown ONLY in the VS-Code-style side panel (never inline in chat)
   - File cards in chat instead of raw code blocks
   - Working fullscreen + close on the code panel
   - Typing animation for AI replies
   - Fixed OLED / Midnight themes
   - Fixed custom background
   - CINOU BUILD V1
   ========================================================================= */


document.addEventListener('DOMContentLoaded', () => {

const modeSelect = document.getElementById('chat-mode-select');
const stopBtn = document.getElementById('stop-btn');
let currentAbortController = null;

function createMessageUI() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message ai-message';

  // Claude-style collapsible thought block
  const thoughtContainer = document.createElement('div');
  thoughtContainer.className = 'thought-container hidden';
  thoughtContainer.innerHTML = `
    <button class="thought-header" type="button">
      <span class="thought-status wavy-text">Thinking...</span>
      <span class="thought-arrow">â–¼</span>
    </button>
    <div class="thought-content hidden"></div>
  `;

  // Answer container
  const answerBox = document.createElement('div');
  answerBox.className = 'answer-content';

  messageDiv.appendChild(thoughtContainer);
  messageDiv.appendChild(answerBox);

  // NOTE: fixed to '#chat-box' â€” that's the real container id used
  // throughout the rest of app.js. The originally-given snippet used
  // '#chat-messages', which doesn't exist in this project's HTML.
  const chatMessages = document.getElementById('chat-box');
  chatMessages.appendChild(messageDiv);

  // Accordion toggle logic
  const headerBtn = thoughtContainer.querySelector('.thought-header');
  const thoughtContent = thoughtContainer.querySelector('.thought-content');
  const arrow = thoughtContainer.querySelector('.thought-arrow');

  headerBtn.addEventListener('click', () => {
    thoughtContent.classList.toggle('hidden');
    arrow.classList.toggle('rotated');
  });

  return {
    thoughtContainer,
    thoughtStatus: thoughtContainer.querySelector('.thought-status'),
    thoughtContent,
    answerBox
  };
}

async function handleSendMessage(userPrompt) {
  if (currentAbortController) currentAbortController.abort();
  currentAbortController = new AbortController();

  const selectedMode = modeSelect.value;

  // Thought container is built automatically for every message
  const { thoughtContainer, thoughtStatus, thoughtContent, answerBox } = createMessageUI();
  if (stopBtn) stopBtn.classList.remove('hidden');

  const startTime = Date.now();
  let isThinking = true;

  try {
    const response = await fetch('https://cinouai.onrender.com/api/chat', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json' // Missing header can cause req.body to be empty
    },
    body: JSON.stringify({ prompt: userPrompt })
});

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = JSON.parse(line.replace('data: ', ''));

        // 1. Process Thinking Chunk
        if (data.type === 'thought' && data.text) {
          thoughtContainer.classList.remove('hidden');
          thoughtContent.innerText += data.text;
          thoughtContent.scrollTop = thoughtContent.scrollHeight;
        }

        // 2. Transition to Answer Chunk
        else if (data.type === 'answer' && data.text) {
          if (isThinking) {
            isThinking = false;
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            // Remove wavy effect and set duration tag
            thoughtStatus.classList.remove('wavy-text');
            thoughtStatus.innerText = `Thought for ${elapsed} seconds`;
          }
          answerBox.innerText += data.text;
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      answerBox.innerText += '\n\n[Generation interrupted by user]';
    }
  } finally {
    if (stopBtn) stopBtn.classList.add('hidden');
    currentAbortController = null;
  }
}

    // DOM Elements
    const openMemoryBtn = document.getElementById('cinou-open-memory-btn');
    const closeMemoryBtn = document.getElementById('cinou-close-memory-btn');
    const memoryModal = document.getElementById('cinou-memory-modal');
    const sidebarElement = document.getElementById('sidebar');
    const closeButtons = document.querySelectorAll('[data-close-memory]');

    // Move open button into sidebar automatically
    if (openMemoryBtn && sidebarElement && !sidebarElement.contains(openMemoryBtn)) {
        sidebarElement.appendChild(openMemoryBtn);
    }

    // Dynamic memory data structure
    let memories = JSON.parse(localStorage.getItem('cinou_memories')) || [];

    function saveMemories() {
        localStorage.setItem('cinou_memories', JSON.stringify(memories));
    }

    // Function to render memories
    function renderMemoryMap() {
        const grid = document.getElementById('cinou-memory-grid');
        const empty = document.getElementById('cinou-memory-empty');

        if (!grid || !empty) {
            console.error('Memory Map elements were not found.');
            return;
        }

        grid.innerHTML = '';

        if (memories.length === 0) {
            empty.classList.remove('hidden');
            return;
        } else {
            empty.classList.add('hidden');
        }

        memories.forEach(memory => {
            const memoryItem = document.createElement('div');
            memoryItem.className = 'memory-item';
            memoryItem.innerHTML = `
                <strong>${escapeHtml(memory.type)}:</strong>
                ${escapeHtml(memory.value)}
            `;
            grid.appendChild(memoryItem);
        });
    }

    // Open Modal Handler
    if (openMemoryBtn && memoryModal) {
        openMemoryBtn.addEventListener('click', () => {
            try {
                renderMemoryMap();
            } catch (error) {
                console.error("Error rendering Memory Map:", error);
            }
            memoryModal.classList.remove('hidden');
            memoryModal.style.display = 'flex';
        });
    }

    // Close Modal Handler
    const hideMemoryModal = () => {
        if (memoryModal) {
            memoryModal.classList.add('hidden');
            memoryModal.style.display = 'none';
        }
    };

    if (closeMemoryBtn) {
        closeMemoryBtn.addEventListener('click', hideMemoryModal);
    }

    closeButtons.forEach(button => {
        button.addEventListener('click', hideMemoryModal);
    });

    if (memoryModal) {
        memoryModal.addEventListener('click', (event) => {
            if (event.target === memoryModal) {
                hideMemoryModal();
            }
        });
    }


    /* ============================================================
       CINOU BUILD SYSTEM
       ============================================================ */

    const cinouBuild = document.getElementById('cinou-build');
    const openBuildBtn = document.getElementById('open-build-btn');
    const buildCloseBtn = document.getElementById('build-close');

    const buildPrompt = document.getElementById('build-prompt');
    const buildProjectBtn = document.getElementById('build-project-btn');

    const buildWorkspace = document.getElementById('build-workspace');

    // Optional element. Your current HTML may not have this.
    const buildProjectName = document.getElementById('build-project-name');

    const buildCode = document.getElementById('build-code');
    const buildCurrentFile = document.getElementById('build-current-file');

    const buildRunBtn = document.getElementById('build-run-btn');
    const buildPreview = document.getElementById('build-preview');

    const buildStatus = document.getElementById('build-status');

    const buildChangeArea = document.getElementById('build-change-area');
    const buildChangeInput = document.getElementById('build-change-input');
    const buildChangeBtn = document.getElementById('build-change-btn');

    const buildCopyCode = document.getElementById('build-copy-code');

    let cinouBuildProject = {
        name: 'cinou-project',
        files: {
            'index.html': '',
            'style.css': '',
            'app.js': ''
        }
    };

    let cinouBuildCurrentFile = 'index.html';


    /* ============================================================
       OPEN / CLOSE BUILD
       ============================================================ */

    if (openBuildBtn) {
        openBuildBtn.addEventListener('click', () => {
            if (cinouBuild) {
                cinouBuild.classList.remove('hidden');
            }

            if (buildPrompt) {
                setTimeout(() => buildPrompt.focus(), 100);
            }
        });
    }

    if (buildCloseBtn) {
        buildCloseBtn.addEventListener('click', () => {
            if (cinouBuild) {
                cinouBuild.classList.add('hidden');
            }
        });
    }


    /* ============================================================
       BUILD STATUS
       ============================================================ */

    function setBuildStatus(message) {
        if (buildStatus) {
            buildStatus.textContent = message;
        }
    }


    /* ============================================================
       CLEAN BUILD RESPONSE
       ============================================================ */

    function cleanBuildResponse(text) {
        if (!text) {
            throw new Error('Cinou returned an empty response.');
        }

        let cleaned = String(text).trim();

        // Remove markdown code fences.
        cleaned = cleaned
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        // Sometimes an AI response can contain text before/after JSON.
        // Try to isolate the JSON object safely.
        if (!cleaned.startsWith('{')) {
            const firstBrace = cleaned.indexOf('{');
            if (firstBrace !== -1) {
                cleaned = cleaned.substring(firstBrace);
            }
        }

        if (!cleaned.endsWith('}')) {
            const lastBrace = cleaned.lastIndexOf('}');
            if (lastBrace !== -1) {
                cleaned = cleaned.substring(0, lastBrace + 1);
            }
        }

        return cleaned.trim();
    }


    /* ============================================================
       EXTRACT TEXT FROM BACKEND RESPONSE
       ============================================================ */

    function extractBuildResponseText(data) {
        if (!data) return '';

        if (typeof data.response === 'string') {
            return data.response;
        }

        if (typeof data.output_text === 'string') {
            return data.output_text;
        }

        if (typeof data.text === 'string') {
            return data.text;
        }

        if (typeof data.message === 'string') {
            return data.message;
        }

        if (data.message && typeof data.message.content === 'string') {
            return data.message.content;
        }

        if (typeof data.content === 'string') {
            return data.content;
        }

        if (Array.isArray(data.output)) {
            return data.output
                .map(item => {
                    if (typeof item === 'string') {
                        return item;
                    }

                    if (item && typeof item.text === 'string') {
                        return item.text;
                    }

                    if (item && typeof item.content === 'string') {
                        return item.content;
                    }

                    if (item && Array.isArray(item.content)) {
                        return item.content
                            .map(part => {
                                if (typeof part === 'string') return part;
                                return part?.text || '';
                            })
                            .join('');
                    }

                    return '';
                })
                .join('');
        }

        if (Array.isArray(data.choices) && data.choices[0]) {
            const choice = data.choices[0];

            if (
                choice.message &&
                typeof choice.message.content === 'string'
            ) {
                return choice.message.content;
            }

            if (typeof choice.text === 'string') {
                return choice.text;
            }

            if (
                choice.message &&
                Array.isArray(choice.message.content)
            ) {
                return choice.message.content
                    .map(part => part?.text || '')
                    .join('');
            }
        }

        return '';
    }


    /* ============================================================
       BUILD AI REQUEST
       ============================================================ */

    async function cinouBuildAI(userRequest, existingProject = null) {

        let systemPrompt = `
You are CINOU BUILD, the website-building engine inside CinouAI.

Your job is to turn a natural-language request into a COMPLETE,
POLISHED, WORKING web project.

Return ONLY valid JSON.

The JSON must have exactly this structure:

{
  "name": "project-name",
  "files": {
    "index.html": "...",
    "style.css": "...",
    "app.js": "..."
  }
}

IMPORTANT:
The values of index.html, style.css and app.js MUST be strings.

Rules:

1. index.html must be a complete standalone HTML document.
2. style.css must contain all required CSS.
3. app.js must contain all required JavaScript.
4. The three files must work together.
5. Do not use Markdown code fences.
6. Do not put explanations outside the JSON.
7. Prefer pure HTML, CSS and JavaScript.
8. Do not depend on npm.
9. Do not require a build system.
10. Do not use external libraries unless absolutely necessary.
11. Use relative paths only.
12. Make the interface visually polished.
13. Make it responsive.
14. Add smooth animations where appropriate.
15. Make every requested button and interaction actually work.
16. If the user asks for a game, make the game actually playable.
17. If graphics are required, prefer CSS, Canvas, inline SVG or generated HTML
    so the result can run immediately inside an iframe.
18. Do not use external image URLs unless the user specifically requests them.
19. Make the result work immediately when CINOU BUILD presses RUN.
20. Never return null for any required file.
21. Never return an empty required file.
22. Keep JavaScript inside app.js.
23. Keep CSS inside style.css.
24. Keep the main HTML structure inside index.html.
25. The final project should look like something a real developer would ship.
`;

        if (existingProject) {

            systemPrompt += `

The user already has an existing CINOU BUILD project.

PROJECT NAME:
${existingProject.name}

CURRENT index.html:
${existingProject.files['index.html']}

CURRENT style.css:
${existingProject.files['style.css']}

CURRENT app.js:
${existingProject.files['app.js']}

The user's new request is a modification to this project.

IMPORTANT:
- Preserve existing functionality.
- Do not randomly redesign unrelated parts.
- Modify only what is needed for the requested change.
- Return the COMPLETE updated files, not partial files.
- Return all three files again.
`;
        }

        const messages = [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: userRequest
            }
        ];

        /*
         * IMPORTANT FIX:
         * Use the existing CINOU requestOpenAI() function instead of creating
         * another independent /api/chat request.
         *
         * This means CINOU BUILD uses the same working backend and retry system
         * as the normal CinouAI chat.
         */
        const data = await requestOpenAI(messages);

        const text = extractBuildResponseText(data);

        if (!text) {
            console.error('CINOU BUILD EMPTY BACKEND RESPONSE:', data);
            throw new Error('Could not read Cinou Build response.');
        }

        const cleaned = cleanBuildResponse(text);

        let project;

        try {
            project = JSON.parse(cleaned);
        } catch (error) {
            console.error('CINOU BUILD INVALID JSON:', cleaned);

            throw new Error(
                'Cinou generated an invalid project response. Please try again.'
            );
        }

        if (!project || typeof project !== 'object') {
            throw new Error('Cinou returned an invalid project.');
        }

        if (!project.name || typeof project.name !== 'string') {
            project.name = 'cinou-project';
        }

        if (!project.files || typeof project.files !== 'object') {
            throw new Error(
                'Cinou did not generate the project files.'
            );
        }

        if (typeof project.files['index.html'] !== 'string') {
            throw new Error(
                'Cinou did not generate index.html.'
            );
        }

        if (typeof project.files['style.css'] !== 'string') {
            throw new Error(
                'Cinou did not generate style.css.'
            );
        }

        if (typeof project.files['app.js'] !== 'string') {
            throw new Error(
                'Cinou did not generate app.js.'
            );
        }

        if (!project.files['index.html'].trim()) {
            throw new Error(
                'Cinou generated an empty index.html.'
            );
        }

        return project;
    }


    /* ============================================================
       DISPLAY BUILD PROJECT
       ============================================================ */

    function displayBuildProject(project) {

        cinouBuildProject = {
            name: project.name || 'cinou-project',
            files: {
                'index.html': project.files['index.html'] || '',
                'style.css': project.files['style.css'] || '',
                'app.js': project.files['app.js'] || ''
            }
        };

        if (buildProjectName) {
            buildProjectName.textContent = cinouBuildProject.name;
        }

        if (buildWorkspace) {
            buildWorkspace.classList.remove('hidden');
        }

        if (buildChangeArea) {
            buildChangeArea.classList.remove('hidden');
        }

        selectBuildFile('index.html');
    }


    /* ============================================================
       SELECT BUILD FILE
       ============================================================ */

    function selectBuildFile(filename) {

        if (
            !cinouBuildProject.files ||
            typeof cinouBuildProject.files[filename] !== 'string'
        ) {
            return;
        }

        cinouBuildCurrentFile = filename;

        if (buildCurrentFile) {
            buildCurrentFile.textContent = filename;
        }

        if (buildCode) {
            buildCode.textContent =
                cinouBuildProject.files[filename] || '';
        }

        document
            .querySelectorAll('.build-file')
            .forEach(button => {
                button.classList.toggle(
                    'active',
                    button.dataset.buildFile === filename
                );
            });
    }


    /* ============================================================
       BUILD FILE BUTTONS
       ============================================================ */

    document
        .querySelectorAll('.build-file')
        .forEach(button => {

            button.addEventListener('click', () => {

                const filename =
                    button.dataset.buildFile;

                if (filename) {
                    selectBuildFile(filename);
                }
            });
        });


    /* ============================================================
       RUN CINOU BUILD PROJECT
       ============================================================ */

    function runCinouBuild() {

        const html =
            cinouBuildProject.files['index.html'] || '';

        const css =
            cinouBuildProject.files['style.css'] || '';

        const js =
            cinouBuildProject.files['app.js'] || '';

        if (!html.trim()) {
            setBuildStatus(
                'âš ï¸ There is no project to run yet.'
            );
            return;
        }

        /*
         * Inject CSS safely before </head>.
         * If the AI somehow omitted </head>, create one.
         */
        let finalHTML = html;

        if (/<\/head>/i.test(finalHTML)) {

            finalHTML = finalHTML.replace(
                /<\/head>/i,
                `<style id="cinou-build-injected-css">
${css}
</style></head>`
            );

        } else {

            finalHTML =
                `<style id="cinou-build-injected-css">
${css}
</style>
${finalHTML}`;
        }


        /*
         * Inject JavaScript before </body>.
         * If </body> is missing, append the script.
         */
        const safeScript = `
<script>
${js}
<\/script>
`;

        if (/<\/body>/i.test(finalHTML)) {

            finalHTML = finalHTML.replace(
                /<\/body>/i,
                `${safeScript}</body>`
            );

        } else {

            finalHTML += safeScript;
        }


        if (buildPreview) {

            /*
             * Clear first so clicking RUN always reloads the project.
             */
            buildPreview.srcdoc = '';

            setTimeout(() => {
                buildPreview.srcdoc = finalHTML;
            }, 20);
        }

        setBuildStatus('âœ“ Project running');
    }


    /* ============================================================
       RUN BUTTON
       ============================================================ */

    if (buildRunBtn) {

        buildRunBtn.addEventListener(
            'click',
            runCinouBuild
        );
    }


    /* ============================================================
       START BUILD
       ============================================================ */

    async function startCinouBuild() {

        const request =
            buildPrompt?.value.trim();

        if (!request) {

            setBuildStatus(
                'âš ï¸ Tell Cinou what you want to build first.'
            );

            if (buildPrompt) {
                buildPrompt.focus();
            }

            return;
        }

        if (window.cinouBuilding) {
            return;
        }

        window.cinouBuilding = true;

        if (buildProjectBtn) {
            buildProjectBtn.disabled = true;
            buildProjectBtn.textContent = 'âš¡ BUILDING...';
        }

        setBuildStatus(
            'âš¡ Cinou is designing your project...'
        );

        try {

            const project =
                await cinouBuildAI(request);

            displayBuildProject(project);

            setBuildStatus(
                'âœ“ Project generated. Press â–¶ RUN to launch it.'
            );

        } catch (error) {

            console.error(
                'CINOU BUILD ERROR:',
                error
            );

            setBuildStatus(
                formatCinouAIError(error?.message)
            );

        } finally {

            window.cinouBuilding = false;

            if (buildProjectBtn) {
                buildProjectBtn.disabled = false;
                buildProjectBtn.textContent = 'âš¡ BUILD PROJECT';
            }
        }
    }


    if (buildProjectBtn) {

        buildProjectBtn.addEventListener(
            'click',
            startCinouBuild
        );
    }


    /* ============================================================
       CHANGE EXISTING PROJECT
       ============================================================ */

    async function changeCinouBuild() {

        const change =
            buildChangeInput?.value.trim();

        if (!change) {

            setBuildStatus(
                'âš ï¸ Tell Cinou what you want to change.'
            );

            if (buildChangeInput) {
                buildChangeInput.focus();
            }

            return;
        }

        if (!cinouBuildProject.files['index.html']) {

            setBuildStatus(
                'âš ï¸ Build a project first.'
            );

            return;
        }

        if (window.cinouBuilding) {
            return;
        }

        window.cinouBuilding = true;

        if (buildChangeBtn) {
            buildChangeBtn.disabled = true;
            buildChangeBtn.textContent = 'âœ¨ CHANGING...';
        }

        setBuildStatus(
            'âœ¨ Cinou is modifying your project...'
        );

        try {

            const updatedProject =
                await cinouBuildAI(
                    change,
                    cinouBuildProject
                );

            displayBuildProject(
                updatedProject
            );

            setBuildStatus(
                'âœ“ Project changed. Press â–¶ RUN to see the result.'
            );

            if (buildChangeInput) {
                buildChangeInput.value = '';
            }

        } catch (error) {

            console.error(
                'CINOU BUILD CHANGE ERROR:',
                error
            );

            setBuildStatus(
                formatCinouAIError(error?.message)
            );

        } finally {

            window.cinouBuilding = false;

            if (buildChangeBtn) {
                buildChangeBtn.disabled = false;
                buildChangeBtn.textContent = 'âœ¨ CHANGE IT';
            }
        }
    }


    if (buildChangeBtn) {

        buildChangeBtn.addEventListener(
            'click',
            changeCinouBuild
        );
    }


    /* ============================================================
       CTRL + ENTER BUILD
       ============================================================ */

    if (buildPrompt) {

        buildPrompt.addEventListener(
            'keydown',
            event => {

                if (
                    event.ctrlKey &&
                    event.key === 'Enter'
                ) {

                    event.preventDefault();

                    startCinouBuild();
                }
            }
        );
    }


    /* ============================================================
       COPY BUILD CODE
       ============================================================ */

    if (buildCopyCode) {

        buildCopyCode.addEventListener(
            'click',
            async () => {

                try {

                    const code =
                        cinouBuildProject.files[
                            cinouBuildCurrentFile
                        ] || '';

                    if (!code) {
                        setBuildStatus(
                            'âš ï¸ There is no code to copy.'
                        );
                        return;
                    }

                    await navigator.clipboard.writeText(
                        code
                    );

                    setBuildStatus(
                        'âœ“ Code copied.'
                    );

                } catch (error) {

                    /*
                     * Clipboard fallback for browsers where
                     * navigator.clipboard is unavailable.
                     */
                    try {

                        const textarea =
                            document.createElement('textarea');

                        textarea.value =
                            cinouBuildProject.files[
                                cinouBuildCurrentFile
                            ] || '';

                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';

                        document.body.appendChild(textarea);
                        textarea.focus();
                        textarea.select();

                        document.execCommand('copy');

                        textarea.remove();

                        setBuildStatus(
                            'âœ“ Code copied.'
                        );

                    } catch (fallbackError) {

                        setBuildStatus(
                            'âš ï¸ Could not copy code.'
                        );
                    }
                }
            }
        );
    }


    /* ============================================================
       STATE
       ============================================================ */

    let conversations = JSON.parse(localStorage.getItem('cinou_conversations')) || [];
    let currentConversationId = null;

    /* Modes: chat | image | video */
    let currentMode = 'chat';
    let isTempChat = false;
    let currentCodeBlock = null;


    /* =====================================================================
       USER SETTINGS
       ===================================================================== */

    let userSettings = JSON.parse(localStorage.getItem('cinou_user_settings')) || {
        username: 'User',
        avatar: 'C',
        avatarImage: '',
        theme: 'dark',
        customBg: '',
        accentColor: '#6366f1',
        customInstructions: ''
    };

    if (!userSettings.avatar) userSettings.avatar = 'C';
    if (!userSettings.avatarImage) userSettings.avatarImage = '';
    if (!userSettings.theme) userSettings.theme = 'dark';
    if (!userSettings.accentColor) userSettings.accentColor = '#6366f1';
    if (!userSettings.customBg) userSettings.customBg = '';
    if (!userSettings.customInstructions) userSettings.customInstructions = '';


    /* =====================================================================
       BACKEND ENDPOINT
       ===================================================================== */

    const OPENAI_CHAT_ENDPOINT = 'https://cinouai.onrender.com/api/chat';


    /* =====================================================================
       DOM ELEMENTS
       ===================================================================== */

    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const searchThreadsInput = document.getElementById('search-threads-input');
    const modeButtons = document.querySelectorAll('.mode-sidebar-btn');
    const historyList = document.getElementById('history-list');
    const chatBox = document.getElementById('chat-box');
    const chatViewport = document.getElementById('chat-viewport');
    const workspaceBody = document.getElementById('workspace-body');
    const welcomeScreen = document.getElementById('welcome-screen');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const modelSelector = document.getElementById('model-selector');
    const aiActionStatus = document.getElementById('ai-action-status');
    const tempChatBadge = document.getElementById('temp-chat-badge');

    const topOptionsBtn = document.getElementById('top-options-btn');
    const optionsMenu = document.getElementById('options-menu');
    const toggleTempChatBtn = document.getElementById('toggle-temp-chat-btn');
    const deleteCurrentChatBtn = document.getElementById('delete-current-chat-btn');

    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const usernameInput = document.getElementById('username-input');
    const userAvatarInput = document.getElementById('user-avatar-input');
    const userAvatarPreview = document.getElementById('user-avatar-preview');
    const userNameDisplay = document.getElementById('user-name-display');
    const themeChips = document.querySelectorAll('.theme-chip');
    const bgUploadInput = document.getElementById('bg-upload-input');
    const removeBgBtn = document.getElementById('remove-bg-btn');
    const avatarUploadInput = document.getElementById('avatar-upload-input');
    const removeAvatarBtn = document.getElementById('remove-avatar-btn');
    const customAccentPicker = document.getElementById('custom-accent-picker');
    const customInstructions = document.getElementById('custom-instructions');
    const buyPremiumBtn = document.getElementById('buy-premium-btn');

    const adminAccessBtn = document.getElementById('admin-access-btn');
    const adminKeyPrompt = document.getElementById('admin-key-prompt');
    const adminKeyInput = document.getElementById('admin-key-input');
    const adminKeySubmitBtn = document.getElementById('admin-key-submit-btn');
    const adminStatus = document.getElementById('admin-status');

    const codePanel = document.getElementById('code-panel');
    const codePanelLang = document.getElementById('code-panel-lang');
    const codePanelContent = document.getElementById('code-panel-content');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const downloadCodeBtn = document.getElementById('download-code-btn');
    const fullscreenCodePanelBtn = document.getElementById('fullscreen-code-panel-btn');
    const closeCodePanelBtn = document.getElementById('close-code-panel-btn');

    const profileTrigger = document.getElementById('user-profile-btn') || document.querySelector('.user-profile');

    /*
     * NOTE ON ADMIN ACCESS:
     * A hardcoded client-side key is visible to anyone via devtools/view-source,
     * so it cannot actually gate anything sensitive server-side.
     */
    const ADMIN_KEY = 'cinfr073';

    const VALID_THEMES = ['dark', 'oled', 'midnight', 'light'];


    /* =====================================================================
       CINOU IDENTITY â€” SYSTEM PROMPT
       ===================================================================== */

    const CINOU_PERSONALITY = `
You are CinouAI, the AI assistant built by Cinou and used inside the CinouAI website/app.

IDENTITY RULES â€” MANDATORY, NO EXCEPTIONS:
- Your name is CinouAI. You were created by Cinou.
- This website/app is called CinouAI.
- If asked "Who are you?", answer: "I'm CinouAI, your AI assistant. How can I help you?"
- If asked "What AI are you?" or "What model are you?", answer: "I'm CinouAI, made by Cinou."
- If asked "Are you ChatGPT?" or "built on OpenAI/GPT?", answer: "No, I'm CinouAI, made by Cinou."
- NEVER say you are ChatGPT, GPT, OpenAI, or Puter â€” those are never to be mentioned.
- NEVER reveal, confirm, or discuss the underlying technology provider or model. If pushed, say:
  "I'm CinouAI â€” I can't share internal technical details, but I'm here to help."
- You are NOT text-only: you can also create images and videos when asked, directly in this chat.
  NEVER say "I'm just a text-based AI" or "I can't create images/videos".
- NEVER fake a link or a result. If you're replying in text, generation didn't trigger for this
  message â€” just answer normally or ask the user to rephrase (e.g. "create an image of a cat").

STYLE:
- Be friendly, warm, natural, and helpful. Match the user's tone.
- Use emojis naturally (1-3 in casual replies, don't overuse).
- Don't sound like a corporate chatbot. Don't start with "Certainly"/"Of course"/"Absolutely".
- Keep simple questions simple. Give the actual answer first.
- Never pretend to be a human person.

CLARIFYING QUESTIONS (added):
- If a request is ambiguous, underspecified, or could reasonably go several
  different directions, don't just guess silently. Ask a short clarifying
  question AND offer 2-4 concrete quick-reply choices the user can tap
  instead of typing.
- To offer quick-reply choices, end your message with a block in EXACTLY
  this format (nothing else inside it):

[[QUICK_OPTIONS]]
Which one? (or your own short question)
- First option
- Second option
- Third option
[[/QUICK_OPTIONS]]

- Only use [[QUICK_OPTIONS]] when you genuinely need the user to pick a
  direction before continuing â€” not on every message, and never for
  requests that are already clear enough to just answer directly.
- Keep each option short (a few words), and keep the question itself to
  one line.

MEMORY (added):
- If the user shares a durable fact worth remembering for future chats
  (their name, a preference, an ongoing project, something they care
  about), silently tag it by including a line anywhere in your reply:
  [[REMEMBER: short fact in a few words]]
  You can include more than one. Don't remember trivia about the current
  message only â€” just things worth recalling later. Don't overuse this;
  a few per conversation at most, only for things that are actually
  memorable and durable.

CONFIDENCE (added):
- For factual, technical, or advice-based answers (not casual chit-chat),
  end your reply with a hidden line reflecting how sure you are:
  [[CONFIDENCE: high]] or [[CONFIDENCE: medium]] or [[CONFIDENCE: low]]
  Use "low" honestly when you're genuinely unsure or guessing â€” don't
  inflate confidence to sound more authoritative.

THINKING (added):
- For non-trivial questions that involve multiple reasoning steps (math,
  debugging, planning, multi-part problems), you may prepend a short
  outline of your approach before the main answer, wrapped like this:
  [[THINKING]]
  - Step one of your approach
  - Step two
  [[/THINKING]]
  Then continue with your normal answer right after. Skip this entirely
  for simple or conversational messages.
`;


    /* =====================================================================
       CINOU IDENTITY â€” OUTPUT FILTER
       ===================================================================== */

    function enforceCinouIdentity(text) {
        if (typeof text !== 'string') return text || '';

        let result = text;

        const phraseReplacements = [
            [/\bOpenAI'?s\s+ChatGPT\b/gi, 'CinouAI'],
            [/\bOpenAI\s+ChatGPT\b/gi, 'CinouAI'],
            [/\bChat\s?GPT-?\d(\.\d)?\b/gi, 'CinouAI'],
            [/\bGPT-?\d(\.\d)?\b/gi, 'CinouAI'],
            [/\bChat\s?GPT\b/gi, 'CinouAI'],
            [/\bPuter\.ai\b/gi, 'CinouAI'],
            [/\bPuter\s+AI\b/gi, 'CinouAI'],
            [/\bPuter\b/gi, 'CinouAI'],
            [/\bOpenAI\b/gi, 'Cinou'],
            [/\bGPT\b/gi, 'CinouAI']
        ];

        phraseReplacements.forEach(([pattern, replacement]) => {
            result = result.replace(pattern, replacement);
        });

        result = result.replace(/\b(CinouAI)(\s+\1)+\b/gi, '$1');

        return result;
    }


    /* =====================================================================
       CINOU IDENTITY â€” ERROR MESSAGE FILTER
       ===================================================================== */

    function formatCinouAIError(rawMessage) {

        if (!rawMessage) {
            return "âš ï¸ CinouAI is temporarily busy. Please try again shortly.";
        }

        const lower = rawMessage.toLowerCase();

        if (
            lower.includes('rate limit') ||
            lower.includes('too many requests')
        ) {

            const retryMatch =
                rawMessage.match(/try again in ([^.]+)\./i);

            const retryTime =
                retryMatch ? retryMatch[1].trim() : null;

            return retryTime
                ? `âš ï¸ Rate limit reached for CinouAI. Please try again Later (Sorry)`
                : `âš ï¸ Rate limit reached for CinouAI. Please try again shortly.`;
        }

        return "âš ï¸ CinouAI couldn't respond right now. Please try again.";
    }


    /* =====================================================================
       INITIALIZE
       ===================================================================== */

    initApp();

    function initApp() {
        normalizeConversations();
        applySettings();
        restoreSidebarState();
        restoreCurrentMode();
        renderHistory();
        setupEventListeners();
        restoreLastConversation();
    }


    /* =====================================================================
       EVENT LISTENERS
       ===================================================================== */

    function setupEventListeners() {

        if (toggleSidebarBtn && sidebar) {
            toggleSidebarBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                localStorage.setItem(
                    'cinou_sidebar_collapsed',
                    sidebar.classList.contains('collapsed')
                );
            });
        }

        if (newChatBtn) newChatBtn.addEventListener('click', startNewChat);

        if (searchThreadsInput) {
            searchThreadsInput.addEventListener('input', (e) => {
                renderHistory(e.target.value.toLowerCase().trim());
            });
        }

        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedMode = btn.dataset.mode;
                currentMode = selectedMode;

                modeButtons.forEach(button => {
                    button.classList.toggle(
                        'active',
                        button.dataset.mode === selectedMode
                    );
                });

                updateInputForMode();
                localStorage.setItem('cinou_current_mode', currentMode);
                showModeStatus(currentMode);
            });
        });

        if (userInput) {
            userInput.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
            });

            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleUserSubmission();
                }
            });
        }

        if (sendBtn) sendBtn.addEventListener('click', handleUserSubmission);

        if (topOptionsBtn && optionsMenu) {
            topOptionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                optionsMenu.classList.toggle('hidden');
            });

            document.addEventListener('click', () => {
                optionsMenu.classList.add('hidden');
            });
        }

        if (toggleTempChatBtn && tempChatBadge) {
            toggleTempChatBtn.addEventListener('click', () => {
                isTempChat = !isTempChat;
                tempChatBadge.classList.toggle('hidden', !isTempChat);
                toggleTempChatBtn.style.color = isTempChat ? 'var(--accent)' : '';
            });
        }

        if (deleteCurrentChatBtn) {
            deleteCurrentChatBtn.addEventListener('click', () => {
                if (!currentConversationId) return;
                if (!confirm('Delete this conversation?')) return;

                conversations = conversations.filter(
                    c => c.id !== currentConversationId
                );

                saveConversations();
                startNewChat();
            });
        }

        if (openSettingsBtn && settingsModal) {
            openSettingsBtn.addEventListener(
                'click',
                openSettingsModal
            );
        }

        if (profileTrigger && settingsModal) {
            profileTrigger.addEventListener(
                'click',
                openSettingsModal
            );
        }

        if (closeSettingsBtn && settingsModal) {
            closeSettingsBtn.addEventListener(
                'click',
                closeSettings
            );
        }

        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    closeSettings();
                }
            });
        }

        document.addEventListener('keydown', (e) => {

            if (e.key === 'Escape') {

                if (
                    settingsModal &&
                    settingsModal.classList.contains('active')
                ) {
                    closeSettings();
                }

                if (
                    codePanel &&
                    codePanel.classList.contains('active')
                ) {
                    closeCodePanel();
                }
            }
        });

        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener(
                'click',
                saveUserSettings
            );
        }

        themeChips.forEach(chip => {
            chip.addEventListener('click', () => {
                applyTheme(chip.dataset.theme);
                saveSettingsToStorage();
            });
        });

        if (bgUploadInput) {
            bgUploadInput.addEventListener('change', (e) => {

                const file = e.target.files[0];

                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    alert('Please choose an image file.');
                    return;
                }

                const reader = new FileReader();

                reader.onload = function (uploadEvent) {

                    userSettings.customBg =
                        uploadEvent.target.result;

                    applyCustomBackground();

                    if (removeBgBtn) {
                        removeBgBtn.classList.remove('hidden');
                    }

                    saveSettingsToStorage();
                };

                reader.readAsDataURL(file);
            });
        }

        if (removeBgBtn) {
            removeBgBtn.addEventListener('click', () => {

                userSettings.customBg = '';

                applyCustomBackground();

                if (bgUploadInput) {
                    bgUploadInput.value = '';
                }

                removeBgBtn.classList.add('hidden');

                saveSettingsToStorage();
            });
        }

        if (avatarUploadInput) {
            avatarUploadInput.addEventListener('change', (e) => {

                const file = e.target.files[0];

                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    alert('Please choose an image file.');
                    return;
                }

                const reader = new FileReader();

                reader.onload = function (uploadEvent) {

                    userSettings.avatarImage =
                        uploadEvent.target.result;

                    applyUserAvatar();

                    if (removeAvatarBtn) {
                        removeAvatarBtn.classList.remove('hidden');
                    }

                    saveSettingsToStorage();
                };

                reader.readAsDataURL(file);
            });
        }

        if (removeAvatarBtn) {
            removeAvatarBtn.addEventListener('click', () => {

                userSettings.avatarImage = '';

                if (avatarUploadInput) {
                    avatarUploadInput.value = '';
                }

                applyUserAvatar();

                removeAvatarBtn.classList.add('hidden');

                saveSettingsToStorage();
                renderHistory();
            });
        }

        if (adminAccessBtn && adminKeyPrompt) {
            adminAccessBtn.addEventListener('click', () => {

                adminKeyPrompt.classList.toggle('hidden');

                if (adminStatus) {
                    adminStatus.classList.add('hidden');
                }

                if (
                    !adminKeyPrompt.classList.contains('hidden') &&
                    adminKeyInput
                ) {
                    adminKeyInput.value = '';
                    adminKeyInput.focus();
                }
            });
        }

        if (adminKeySubmitBtn && adminKeyInput) {

            const submitAdminKey = () => {

                const entered =
                    adminKeyInput.value.trim();

                if (!adminStatus) return;

                if (entered === ADMIN_KEY) {

                    adminStatus.textContent =
                        'âœ… Admin access granted.';

                    adminStatus.className =
                        'admin-status success';

                    if (adminKeyPrompt) {
                        adminKeyPrompt.classList.add('hidden');
                    }

                } else {

                    adminStatus.textContent =
                        'âŒ Incorrect admin key.';

                    adminStatus.className =
                        'admin-status error';
                }
            };

            adminKeySubmitBtn.addEventListener(
                'click',
                submitAdminKey
            );

            adminKeyInput.addEventListener(
                'keydown',
                (e) => {

                    if (e.key === 'Enter') {

                        e.preventDefault();

                        submitAdminKey();
                    }
                }
            );
        }


        /* ---------------- CODE PANEL ---------------- */

        if (copyCodeBtn) {

            copyCodeBtn.addEventListener(
                'click',
                async () => {

                    if (!currentCodeBlock) return;

                    try {

                        await navigator.clipboard.writeText(
                            currentCodeBlock.code
                        );

                        showTemporaryStatus(
                            'Code copied! ðŸ“‹'
                        );

                        copyCodeBtn.classList.add('copied');

                        setTimeout(
                            () => copyCodeBtn.classList.remove('copied'),
                            1200
                        );

                    } catch (error) {

                        console.error(
                            'Copy failed:',
                            error
                        );
                    }
                }
            );
        }

        if (downloadCodeBtn) {

            downloadCodeBtn.addEventListener(
                'click',
                () => {

                    if (!currentCodeBlock) return;

                    const filename =
                        currentCodeBlock.tabLabel ||
                        'cinou-code.txt';

                    const blob = new Blob(
                        [currentCodeBlock.code],
                        { type: 'text/plain' }
                    );

                    const url =
                        URL.createObjectURL(blob);

                    const a =
                        document.createElement('a');

                    a.href = url;
                    a.download = filename;

                    a.click();

                    URL.revokeObjectURL(url);
                }
            );
        }

        if (fullscreenCodePanelBtn) {

            fullscreenCodePanelBtn.addEventListener(
                'click',
                () => {

                    if (!codePanel) return;

                    codePanel.classList.toggle(
                        'fullscreen'
                    );
                }
            );
        }

        if (closeCodePanelBtn) {
            closeCodePanelBtn.addEventListener(
                'click',
                closeCodePanel
            );
        }

        if (buyPremiumBtn) {

            buyPremiumBtn.addEventListener(
                'click',
                () => {
                    window.location.href =
                        'https://cinouai-premium-2.onrender.com';
                }
            );
        }

        if (historyList) {

            historyList.addEventListener(
                'click',
                () => {

                    if (currentConversationId) {

                        localStorage.setItem(
                            'cinou_current_conversation',
                            currentConversationId
                        );
                    }
                }
            );
        }

        window.addEventListener(
            'resize',
            () => {
                setTimeout(
                    scrollChatToBottom,
                    100
                );
            }
        );

        document.addEventListener(
            'visibilitychange',
            () => {

                if (!document.hidden) {

                    setTimeout(
                        scrollChatToBottom,
                        100
                    );
                }
            }
        );

        window.addEventListener(
            'beforeunload',
            () => {

                if (currentConversationId) {

                    localStorage.setItem(
                        'cinou_current_conversation',
                        currentConversationId
                    );

                } else {

                    localStorage.removeItem(
                        'cinou_current_conversation'
                    );
                }
            }
        );

        document.addEventListener(
            'keydown',
            (event) => {

                if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key.toLowerCase() === 'k'
                ) {

                    event.preventDefault();

                    if (userInput) {
                        userInput.focus();
                    }
                }

                if (
                    (event.ctrlKey || event.metaKey) &&
                    event.shiftKey &&
                    event.key.toLowerCase() === 'n'
                ) {

                    event.preventDefault();

                    startNewChat();
                }
            }
        );
    }


    /* =====================================================================
       BUILD MESSAGE PAYLOAD FOR BACKEND
       ===================================================================== */

    function buildOpenAIMessages(
        conversationMessages,
        latestPromptText
    ) {

        const messages = [
            {
                role: 'system',
                content: CINOU_PERSONALITY
            }
        ];

        if (
            userSettings.customInstructions &&
            userSettings.customInstructions.trim()
        ) {

            messages.push({
                role: 'system',
                content:
                    'Additional user instructions:\n' +
                    userSettings.customInstructions.trim()
            });
        }

        if (Array.isArray(conversationMessages)) {

            conversationMessages.forEach(message => {

                if (
                    !message ||
                    typeof message.content !== 'string' ||
                    !message.content.trim()
                ) {
                    return;
                }

                if (
                    message.mode &&
                    message.mode !== 'chat'
                ) {
                    return;
                }

                messages.push({
                    role:
                        message.role === 'assistant' ||
                        message.role === 'ai'
                            ? 'assistant'
                            : 'user',

                    content: message.content
                });
            });
        }

        if (
            typeof latestPromptText === 'string' &&
            latestPromptText.trim()
        ) {

            messages.push({
                role: 'user',
                content: latestPromptText.trim()
            });
        }

        return messages;
    }


    /* =====================================================================
   BACKEND REQUEST â€” GROQ / CINOUAI
   ===================================================================== */

async function requestOpenAI(userMessage, conversation = [], fast = false) {
    try {
        const prompt = String(userMessage || "").trim();

        if (!prompt) {
            throw new Error("No prompt was provided.");
        }

        console.log("CinouAI â†’ sending:", prompt);

        const response = await fetch("https://cinouai.onrender.com/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: prompt,
                conversation: Array.isArray(conversation)
                    ? conversation
                    : [],
                fast: Boolean(fast)
            })
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                `Server returned invalid JSON (HTTP ${response.status}).`
            );
        }

        console.log("CinouAI â† backend:", data);

        if (!response.ok) {
            throw new Error(
                data.error ||
                data.message ||
                `Server returned HTTP ${response.status}.`
            );
        }

        if (!data.success) {
            throw new Error(
                data.error ||
                data.message ||
                "CinouAI backend returned an unsuccessful response."
            );
        }

        const answer =
            data.response ||
            data.answer ||
            data.text ||
            (
                data.message &&
                typeof data.message === "string"
                    ? data.message
                    : ""
            );

        if (!answer) {
            throw new Error(
                "The backend returned no AI response."
            );
        }

        // IMPORTANT:
        // Return the complete backend object because
        // handleChatResponse() uses data.response.
        return data;

    } catch (error) {
        console.error("CinouAI chat error:", error);
        throw error;
    }
}

/* =========================================================================
   CINOUAI â€” HANDLE CHAT RESPONSE
   Works with the Groq /api/chat backend
   ========================================================================= */

async function handleChatResponse(
    promptText,
    conversationMessages = []
) {
    try {
        // ---------------------------------------------------------------
        // Validate user prompt
        // ---------------------------------------------------------------
        const cleanPrompt =
            typeof promptText === "string"
                ? promptText.trim()
                : "";

        if (!cleanPrompt) {
            throw new Error("No prompt was provided.");
        }

        // ---------------------------------------------------------------
        // Show thinking status
        // ---------------------------------------------------------------
        if (typeof showAIStatus === "function") {
            showAIStatus("CinouAI is thinking...");
        }

        // ---------------------------------------------------------------
        // Build conversation messages
        // ---------------------------------------------------------------
        let messages = [];

        if (typeof buildOpenAIMessages === "function") {
            messages = buildOpenAIMessages(
                conversationMessages,
                cleanPrompt
            );
        } else {
            // Fallback if buildOpenAIMessages does not exist
            messages = [];

            if (Array.isArray(conversationMessages)) {
                conversationMessages.forEach(message => {
                    if (
                        message &&
                        typeof message.content === "string" &&
                        message.content.trim()
                    ) {
                        messages.push({
                            role:
                                message.role === "ai"
                                    ? "assistant"
                                    : message.role || "user",
                            content: message.content.trim()
                        });
                    }
                });
            }

            messages.push({
                role: "user",
                content: cleanPrompt
            });
        }

        console.log(
            "CinouAI conversation messages:",
            messages
        );

        // ---------------------------------------------------------------
        // Send request to backend
        //
        // IMPORTANT:
        // First argument = actual prompt text
        // Second argument = conversation history
        // ---------------------------------------------------------------
        if (typeof requestOpenAI !== "function") {
            throw new Error(
                "requestOpenAI() is not available."
            );
        }

        const data = await requestOpenAI(
            cleanPrompt,
            messages
        );

        console.log(
            "CinouAI received backend data:",
            data
        );

        // ---------------------------------------------------------------
        // Extract AI response
        // ---------------------------------------------------------------
        let responseText = "";

        if (
            data &&
            typeof data.response === "string"
        ) {
            responseText = data.response;

        } else if (
            data &&
            typeof data.answer === "string"
        ) {
            responseText = data.answer;

        } else if (
            data &&
            typeof data.text === "string"
        ) {
            responseText = data.text;

        } else if (
            data &&
            typeof data.output_text === "string"
        ) {
            responseText = data.output_text;

        } else if (
            data &&
            data.message &&
            typeof data.message.content === "string"
        ) {
            responseText =
                data.message.content;

        } else if (
            data &&
            Array.isArray(data.choices) &&
            data.choices.length > 0
        ) {
            const choice = data.choices[0];

            if (
                choice.message &&
                typeof choice.message.content === "string"
            ) {
                responseText =
                    choice.message.content;

            } else if (
                typeof choice.text === "string"
            ) {
                responseText =
                    choice.text;
            }
        }

        responseText =
            typeof responseText === "string"
                ? responseText.trim()
                : "";

        // ---------------------------------------------------------------
        // Make sure CinouAI actually received an answer
        // ---------------------------------------------------------------
        if (!responseText) {
            throw new Error(
                "CinouAI returned an empty response."
            );
        }

        // ---------------------------------------------------------------
        // Force CinouAI identity if this function exists
        // ---------------------------------------------------------------
        if (
            typeof enforceCinouIdentity === "function"
        ) {
            responseText =
                enforceCinouIdentity(
                    responseText
                );
        }

        // ---------------------------------------------------------------
        // MEMORY SYSTEM
        // Detect:
        // [[REMEMBER: something]]
        // ---------------------------------------------------------------
        if (
            typeof memories !== "undefined" &&
            Array.isArray(memories) &&
            typeof saveMemories === "function"
        ) {
            const rememberRegex =
                /\[\[REMEMBER:\s*(.*?)\]\]/gi;

            let match;

            while (
                (match =
                    rememberRegex.exec(
                        responseText
                    )) !== null
            ) {
                const fact =
                    match[1].trim();

                if (
                    fact &&
                    !memories.some(
                        memory =>
                            memory &&
                            memory.value === fact
                    )
                ) {
                    memories.push({
                        type: "Fact",
                        value: fact
                    });

                    saveMemories();
                }
            }

            // Remove invisible memory tags
            responseText =
                responseText
                    .replace(
                        /\[\[REMEMBER:\s*.*?\]\]/gi,
                        ""
                    )
                    .trim();
        }

        // ---------------------------------------------------------------
        // Final empty-response check
        // ---------------------------------------------------------------
        if (!responseText) {
            throw new Error(
                "CinouAI returned an empty response."
            );
        }

        // ---------------------------------------------------------------
        // Display AI message
        // ---------------------------------------------------------------
        if (
            typeof appendMessageToDOM === "function"
        ) {
            appendMessageToDOM(
                "ai",
                responseText,
                false,
                true
            );
        }

        // ---------------------------------------------------------------
        // Save response to current conversation
        // ---------------------------------------------------------------
        if (
            typeof isTempChat !== "undefined" &&
            !isTempChat &&
            typeof currentConversationId !== "undefined" &&
            currentConversationId &&
            typeof conversations !== "undefined" &&
            Array.isArray(conversations)
        ) {
            const activeConv =
                conversations.find(
                    conversation =>
                        conversation.id ===
                        currentConversationId
                );

            if (activeConv) {
                if (
                    !Array.isArray(
                        activeConv.messages
                    )
                ) {
                    activeConv.messages = [];
                }

                activeConv.messages.push({
                    role: "ai",
                    content: responseText,
                    mode: "chat"
                });

                activeConv.updatedAt =
                    Date.now();

                if (
                    typeof saveConversations ===
                    "function"
                ) {
                    saveConversations();
                }
            }
        }

        // ---------------------------------------------------------------
        // Return the clean response
        // ---------------------------------------------------------------
        return responseText;

    } catch (error) {

        console.error(
            "CinouAI chat error:",
            error
        );

        const errorText =
            error &&
            error.message
                ? error.message
                : "CinouAI request failed.";

        // ---------------------------------------------------------------
        // Display error in chat
        // ---------------------------------------------------------------
        if (
            typeof appendMessageToDOM === "function"
        ) {
            let formattedError =
                errorText;

            if (
                typeof formatCinouAIError ===
                "function"
            ) {
                formattedError =
                    formatCinouAIError(
                        errorText
                    );
            }

            if (
                typeof escapeHtml === "function"
            ) {
                formattedError =
                    escapeHtml(
                        formattedError
                    );
            }

            appendMessageToDOM(
                "ai",
                formattedError,
                true,
                false
            );
        }

        return "";

    } finally {

        // ---------------------------------------------------------------
        // Hide thinking status
        // ---------------------------------------------------------------
        if (
            typeof hideAIStatus === "function"
        ) {
            hideAIStatus();
        }
    }
}



    /* =====================================================================
       CONTENT INTENT DETECTION
       ===================================================================== */

    function detectContentIntent(promptText) {

        const lower =
            promptText.toLowerCase();

        const videoVerbs =
            '(generate|generates|create|creat|creates|make|makes|produce|produces|render|renders|film|films|gÃ©nÃ¨re|genere|gÃ©nÃ©rer|generer|crÃ©e|cree|crÃ©er|creer|fais|fait|filme|rÃ©alise|realise)';

        const videoNouns =
            '(video|clip|animation|short film|movie|vidÃ©o|vidÃ©os)';

        const imageVerbs =
            '(generate|generates|create|creat|creates|draw|draws|make|makes|paint|paints|design|designs|render|renders|sketch|sketches|gÃ©nÃ¨re|genere|gÃ©nÃ©rer|generer|crÃ©e|cree|crÃ©er|creer|dessine|dessin|dessiner|fais|fait|peins|peint|peindre)';

        const imageNouns =
            '(image|picture|pic|photo|drawing|artwork|illustration|logo|wallpaper|avatar|poster|sketch|dessin|illustration|affiche)';

        const videoPattern =
            new RegExp(
                `\\b${videoVerbs}\\b[^.?!]{0,40}\\b${videoNouns}\\b`,
                'i'
            ).test(lower) ||

            /\b(video|vidÃ©o)\s+(of|de|d')\b/.test(lower) ||

            /\banimate\s+(this|that|it|ceci|cela|Ã§a)\b/.test(lower);

        if (videoPattern) return 'video';

        const imagePattern =
            new RegExp(
                `\\b${imageVerbs}\\b[^.?!]{0,40}\\b${imageNouns}\\b`,
                'i'
            ).test(lower) ||

            /\b(image|picture|pic|photo|drawing|illustration|poster|dessin|affiche)\s+(of|de|d')\b/.test(lower) ||

            /\bshow me what\b.{0,40}\blooks? like\b/.test(lower) ||

            /\bmontre[- ]moi\b.{0,40}\b(Ã  quoi|a quoi)\b/.test(lower);

        if (imagePattern) return 'image';

        return 'chat';
    }


    /* =====================================================================
       IMAGE PROMPT ENRICHMENT
       ===================================================================== */

    async function buildEnrichedImagePrompt(
        conversationMessages,
        latestPromptText
    ) {

        const priorImageContext = [];

        if (Array.isArray(conversationMessages)) {

            conversationMessages.forEach(
                message => {

                    if (
                        !message ||
                        message.mode !== 'image'
                    ) {
                        return;
                    }

                    if (
                        message.role === 'user' &&
                        typeof message.content === 'string' &&
                        message.content.trim()
                    ) {

                        priorImageContext.push(
                            `User requested: ${message.content.trim()}`
                        );

                    } else if (
                        message.role === 'ai' &&
                        typeof message.imagePrompt === 'string' &&
                        message.imagePrompt.trim()
                    ) {

                        priorImageContext.push(
                            `Image was generated from this description: ${message.imagePrompt.trim()}`
                        );
                    }
                }
            );
        }

        if (priorImageContext.length === 0) {
            return latestPromptText;
        }

        const mergeMessages = [
            {
                role: 'system',
                content:
                    'You write a single, complete, standalone image-generation prompt. Given the history ' +
                    'of an ongoing image request and a new follow-up instruction, output ONE merged plain-text ' +
                    'description for a fresh image that keeps everything relevant from the earlier description ' +
                    'AND applies the new instruction on top of it. Output only the final prompt text.'
            },
            {
                role: 'user',
                content:
                    `Image history:\n${priorImageContext
                        .slice(-6)
                        .join('\n')}\n\nNew instruction: ${latestPromptText}\n\nMerged image prompt:`
            }
        ];

        try {

            const data =
                await requestOpenAI(
                    mergeMessages
                );

            let merged = '';

            if (
                data &&
                typeof data.response === 'string'
            ) {
                merged = data.response;

            } else if (
                data &&
                typeof data.output_text === 'string'
            ) {
                merged = data.output_text;

            } else if (
                data &&
                typeof data.text === 'string'
            ) {
                merged = data.text;

            } else if (
                data &&
                data.message &&
                typeof data.message.content === 'string'
            ) {
                merged = data.message.content;

            } else if (
                data &&
                Array.isArray(data.choices) &&
                data.choices[0]
            ) {

                const choice =
                    data.choices[0];

                merged =
                    (
                        choice.message &&
                        choice.message.content
                    ) ||
                    choice.text ||
                    '';
            }

            merged =
                merged.trim();

            return (
                merged ||
                latestPromptText
            );

        } catch (error) {

            console.error(
                'Could not merge image context, using raw prompt instead:',
                error
            );

            return latestPromptText;
        }
    }


    /* =====================================================================
       IMAGE GENERATION
       ===================================================================== */

    async function handleImageGeneration(
        promptText,
        conversationMessages
    ) {

        try {

            showAIStatus(
                'CinouAI is creating your image...'
            );

            const enrichedPrompt =
                await buildEnrichedImagePrompt(
                    conversationMessages,
                    promptText
                );

            const imageElement =
                await puter.ai.txt2img(
                    enrichedPrompt,
                    {
                        model: 'gpt-image-2'
                    }
                );

            const usedMergedDescription =
                enrichedPrompt.trim().toLowerCase() !==
                promptText.trim().toLowerCase();

            const captionLabel =
                usedMergedDescription
                    ? "Here's the full description I used"
                    : 'Generated visual art for';

            const captionText =
                usedMergedDescription
                    ? enrichedPrompt
                    : promptText;

            let imageHtml = '';

            if (
                imageElement &&
                imageElement.outerHTML
            ) {

                imageHtml = `
                    <p>${captionLabel}: <em>"${escapeHtml(captionText)}"</em></p>
                    <div class="generated-media-card">
                        ${imageElement.outerHTML}
                    </div>
                `;

            } else if (
                typeof imageElement === 'string'
            ) {

                imageHtml = `
                    <p>${captionLabel}: <em>"${escapeHtml(captionText)}"</em></p>
                    <div class="generated-media-card">
                        <img
                            src="${escapeHtml(imageElement)}"
                            alt="Generated image"
                            class="generated-image"
                        >
                    </div>
                `;

            } else {

                throw new Error(
                    'The image generator returned no image.'
                );
            }

            appendMessageToDOM(
                'ai',
                imageHtml,
                true
            );

            if (
                !isTempChat &&
                currentConversationId
            ) {

                const activeConv =
                    conversations.find(
                        c =>
                            c.id ===
                            currentConversationId
                    );

                if (activeConv) {

                    activeConv.messages.push({
                        role: 'ai',
                        content: imageHtml,
                        mode: 'image',
                        imagePrompt:
                            enrichedPrompt
                    });

                    activeConv.updatedAt =
                        Date.now();

                    saveConversations();
                }
            }

        } catch (error) {

            console.error(
                'Image generation failed:',
                error
            );

            appendMessageToDOM(
                'ai',
                `âš ï¸ Image generation failed: ${escapeHtml(
                    error && error.message
                        ? error.message
                        : 'Unknown error'
                )}`,
                true
            );

        } finally {

            hideAIStatus();
        }
    }


    /* =====================================================================
       VIDEO GENERATION
       ===================================================================== */

    async function handleVideoGeneration(
        promptText,
        conversationMessages
    ) {

        try {

            showAIStatus(
                'CinouAI is preparing your video...'
            );

            const videoHtml = `
                <div class="video-preview-container">
                    <p>
                        ðŸŽ¬
                        <strong>
                            Video generation is coming soon!
                        </strong>
                    </p>

                    <p>
                        Your request:
                        <em>"${escapeHtml(promptText)}"</em>
                    </p>

                    <p class="video-status">
                        CinouAI is working on bringing AI video generation
                        to the app. Stay tuned â€” it'll be free! ðŸš€
                    </p>
                </div>
            `;

            appendMessageToDOM(
                'ai',
                videoHtml,
                true
            );

            if (
                !isTempChat &&
                currentConversationId
            ) {

                const activeConv =
                    conversations.find(
                        c =>
                            c.id ===
                            currentConversationId
                    );

                if (activeConv) {

                    activeConv.messages.push({
                        role: 'ai',
                        content: videoHtml,
                        mode: 'video'
                    });

                    activeConv.updatedAt =
                        Date.now();

                    saveConversations();
                }
            }

        } catch (error) {

            console.error(
                'Video message failed:',
                error
            );

            appendMessageToDOM(
                'ai',
                'âš ï¸ Unable to display the video generation message.',
                true
            );

        } finally {

            hideAIStatus();
        }
    }


    /* =====================================================================
       CODE LANGUAGE DETECTION
       ===================================================================== */

    function detectCodeLanguage(code) {

        const trimmed =
            code.trim();

        if (
            /^<!doctype html>/i.test(trimmed) ||
            /<html[\s>]/i.test(trimmed) ||
            (
                /<\/?[a-z][\w-]*[\s>]/i.test(trimmed) &&
                /<(div|span|p|body|head|section|header|footer|button)\b/i.test(trimmed)
            )
        ) {
            return 'html';
        }

        if (
            /^\s*[.#]?[\w-]+(\s*,\s*[.#]?[\w-]+)*\s*{[\s\S]*?:[\s\S]*?;[\s\S]*?}/
                .test(trimmed) &&
            !/\b(function|const|let|var|import|def |class )\b/.test(trimmed)
        ) {
            return 'css';
        }

        if (
            /^\s*def\s+\w+\s*\(.*\)\s*:/m.test(trimmed) ||
            (
                /^\s*import\s+\w+/m.test(trimmed) &&
                /:\s*$/m.test(trimmed)
            ) ||
            (
                /\bprint\(/.test(trimmed) &&
                /:\s*$/m.test(trimmed)
            )
        ) {
            return 'python';
        }

        if (
            /^\s*(public|private|protected)\s+(static\s+)?(void|class|int|String|final)\b/m
                .test(trimmed)
        ) {
            return 'java';
        }

        if (
            /^\s*{[\s\S]*}\s*$/.test(trimmed) &&
            /"[\w-]+"\s*:/.test(trimmed) &&
            !/\b(function|const|let|var)\b/.test(trimmed)
        ) {
            return 'json';
        }

        if (
            /^#!\/bin\/(bash|sh)/m.test(trimmed) ||
            /^\s*(sudo|cd |ls |grep |echo |npm |pip )/m.test(trimmed)
        ) {
            return 'bash';
        }

        if (
            /\b(function|const|let|var|=>|console\.log|document\.|window\.|import .* from)\b/
                .test(trimmed)
        ) {
            return 'javascript';
        }

        return 'text';
    }


    function getLanguageColorKey(lang) {

        const key =
            (lang || 'text')
                .toLowerCase()
                .trim();

        if (
            ['js', 'javascript', 'jsx']
                .includes(key)
        ) return 'js';

        if (
            ['ts', 'typescript', 'tsx']
                .includes(key)
        ) return 'ts';

        if (
            key === 'html' ||
            key === 'xml'
        ) return 'html';

        if (
            key === 'css' ||
            key === 'scss' ||
            key === 'sass'
        ) return 'css';

        if (
            ['py', 'python']
                .includes(key)
        ) return 'python';

        if (key === 'json') return 'json';

        if (
            ['bash', 'sh', 'shell']
                .includes(key)
        ) return 'bash';

        if (key === 'java') return 'java';

        return 'text';
    }


    function getLanguageTabLabel(lang) {

        const key =
            (lang || 'text')
                .toLowerCase()
                .trim();

        const map = {
            js: 'app.js',
            javascript: 'app.js',
            jsx: 'App.jsx',
            ts: 'app.ts',
            typescript: 'app.ts',
            tsx: 'App.tsx',
            html: 'index.html',
            css: 'styles.css',
            py: 'script.py',
            python: 'script.py',
            java: 'Main.java',
            json: 'data.json',
            bash: 'script.sh',
            sh: 'script.sh',
            shell: 'script.sh',
            c: 'main.c',
            cpp: 'main.cpp',
            'c++': 'main.cpp',
            csharp: 'Program.cs',
            cs: 'Program.cs',
            php: 'index.php',
            ruby: 'script.rb',
            rb: 'script.rb',
            go: 'main.go',
            rust: 'main.rs',
            rs: 'main.rs',
            sql: 'query.sql',
            yaml: 'config.yaml',
            yml: 'config.yaml',
            xml: 'data.xml',
            md: 'README.md',
            markdown: 'README.md'
        };

        return (
            map[key] ||
            (
                lang &&
                lang.trim()
                    ? lang.trim()
                    : 'code.txt'
            )
        );
    }


    function getHljsLanguageName(lang) {

        const key =
            (lang || 'text')
                .toLowerCase()
                .trim();

        const map = {
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            py: 'python',
            sh: 'bash',
            shell: 'bash',
            yml: 'yaml',
            cs: 'csharp',
            rb: 'ruby',
            rs: 'rust'
        };

        return map[key] || key;
    }


    function getFileCardIconSvg() {

        return `
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
        `;
    }


    /* =====================================================================
       MARKDOWN RENDERING
       ===================================================================== */

    function formatMessage(text) {

        if (typeof text !== 'string') {
            return {
                html: '',
                codeBlocks: []
            };
        }

        const filtered =
            enforceCinouIdentity(text);

        const codeBlocks = [];

        if (typeof marked === 'undefined') {

            return {
                html:
                    `<p>${escapeHtml(filtered)
                        .replace(/\n/g, '<br>')}</p>`,

                codeBlocks
            };
        }

        const renderer =
            new marked.Renderer();

        renderer.code = (
            codeOrToken,
            maybeLang
        ) => {

            let code;
            let declaredLang;

            if (
                codeOrToken &&
                typeof codeOrToken === 'object'
            ) {

                code =
                    codeOrToken.text || '';

                declaredLang =
                    codeOrToken.lang || '';

            } else {

                code =
                    codeOrToken || '';

                declaredLang =
                    maybeLang || '';
            }

            const detectedLang =
                (
                    declaredLang ||
                    ''
                ).trim() ||
                detectCodeLanguage(code);

            const colorKey =
                getLanguageColorKey(
                    detectedLang
                );

            const tabLabel =
                getLanguageTabLabel(
                    detectedLang
                );

            const blockIndex =
                codeBlocks.length;

            codeBlocks.push({
                lang: detectedLang,
                code,
                tabLabel,
                colorKey
            });

            return `
                <div
                    class="cinou-file-card"
                    data-block-index="${blockIndex}"
                    data-lang="${colorKey}"
                    role="button"
                    tabindex="0"
                >
                    <div class="cinou-file-icon cinou-file-icon-${colorKey}">
                        ${getFileCardIconSvg()}
                    </div>

                    <div class="cinou-file-info">
                        <div class="cinou-file-name">
                            ${escapeHtml(tabLabel)}
                        </div>

                        <div class="cinou-file-type">
                            ${escapeHtml(colorKey.toUpperCase())} FILE
                        </div>
                    </div>

                    <button
                        type="button"
                        class="cinou-file-open-btn"
                    >
                        Open
                    </button>
                </div>
            `;
        };

        let html;

        try {

            html =
                marked.parse(
                    filtered,
                    {
                        renderer,
                        breaks: true,
                        gfm: true
                    }
                );

        } catch (error) {

            console.error(
                'Markdown parse failed, falling back to plain text:',
                error
            );

            html =
                `<p>${escapeHtml(filtered)
                    .replace(/\n/g, '<br>')}</p>`;
        }

        return {
            html,
            codeBlocks
        };
    }


    function wireFileCards(
        container,
        codeBlocks,
        autoOpenFirst
    ) {

        const cards =
            container.querySelectorAll(
                '.cinou-file-card'
            );

        cards.forEach(card => {

            const idx =
                parseInt(
                    card.dataset.blockIndex,
                    10
                );

            const block =
                codeBlocks[idx];

            if (!block) return;

            const openCard = () => {

                currentCodeBlock =
                    block;

                openCodePanel();
            };

            card.addEventListener(
                'click',
                openCard
            );

            card.addEventListener(
                'keydown',
                (e) => {

                    if (
                        e.key === 'Enter' ||
                        e.key === ' '
                    ) {

                        e.preventDefault();

                        openCard();
                    }
                }
            );
        });

        if (
            autoOpenFirst &&
            codeBlocks.length > 0
        ) {

            currentCodeBlock =
                codeBlocks[0];

            openCodePanel();
        }
    }


    /* =====================================================================
       MESSAGE RENDERING
       ===================================================================== */

    function appendMessageToDOM(
        sender,
        content,
        isHtml = false,
        autoOpenCode = true
    ) {

        if (welcomeScreen) {
            welcomeScreen.style.display =
                'none';
        }

        if (!chatBox) return null;

        const bubble =
            document.createElement('div');

        bubble.className =
            `message ${
                sender === 'user'
                    ? 'user-message'
                    : 'ai-message'
            }`;

        if (sender === 'user') {

            bubble.textContent =
                content;

            chatBox.appendChild(
                bubble
            );

            scrollChatToBottom();

            return bubble;
        }

        if (isHtml) {

            bubble.innerHTML =
                content;

            chatBox.appendChild(
                bubble
            );

            scrollChatToBottom();

            return bubble;
        }

        chatBox.appendChild(
            bubble
        );

        animateAIText(
            bubble,
            content,
            autoOpenCode
        );

        return bubble;
    }


    function renderFinalAIContent(
        bubble,
        rawText,
        autoOpenCode
    ) {

        const {
            html,
            codeBlocks
        } =
            formatMessage(rawText);

        bubble.innerHTML =
            html;

        wireFileCards(
            bubble,
            codeBlocks,
            autoOpenCode
        );

        scrollChatToBottom();
    }


    function animateAIText(
        bubble,
        rawText,
        isFreshReply
    ) {

        if (!isFreshReply) {

            renderFinalAIContent(
                bubble,
                rawText,
                false
            );

            return;
        }

        bubble.classList.add(
            'cinou-typing'
        );

        const words =
            rawText.split(/(\s+)/);

        let i = 0;

        function step() {

            if (i >= words.length) {

                bubble.classList.remove(
                    'cinou-typing'
                );

                renderFinalAIContent(
                    bubble,
                    rawText,
                    true
                );

                return;
            }

            bubble.textContent +=
                words[i];

            i++;

            scrollChatToBottom();

            setTimeout(
                step,
                14
            );
        }

        step();
    }


    /* =====================================================================
       ESCAPE HTML
       ===================================================================== */

    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return '';
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    /* =====================================================================
       SCROLL / STATUS HELPERS
       ===================================================================== */

    function scrollChatToBottom() {

        if (chatBox) {
            chatBox.scrollTop =
                chatBox.scrollHeight;
        }
    }


    function showAIStatus(text) {

        if (!aiActionStatus) return;

        aiActionStatus.textContent =
            text ||
            'CinouAI is thinking...';

        aiActionStatus.classList.remove(
            'hidden'
        );
    }


    function hideAIStatus() {

        if (!aiActionStatus) return;

        aiActionStatus.classList.add(
            'hidden'
        );
    }


    function showTemporaryStatus(text) {

        if (!aiActionStatus) return;

        aiActionStatus.textContent =
            text;

        aiActionStatus.classList.remove(
            'hidden'
        );

        clearTimeout(
            window.cinouTemporaryStatusTimer
        );

        window.cinouTemporaryStatusTimer =
            setTimeout(
                () => {
                    aiActionStatus.classList.add(
                        'hidden'
                    );
                },
                1500
            );
    }


    function showModeStatus(mode) {

        if (!aiActionStatus) return;

        let text =
            'ðŸ’¬ Chat mode';

        if (mode === 'image') {
            text =
                'ðŸŽ¨ Image mode';
        }

        if (mode === 'video') {
            text =
                'ðŸŽ¬ Video mode';
        }

        aiActionStatus.textContent =
            text;

        aiActionStatus.classList.remove(
            'hidden'
        );

        clearTimeout(
            window.cinouModeStatusTimer
        );

        window.cinouModeStatusTimer =
            setTimeout(
                () => {
                    aiActionStatus.classList.add(
                        'hidden'
                    );
                },
                1200
            );
    }


    /* =====================================================================
       CODE PANEL
       ===================================================================== */

    function openCodePanel() {

        if (!codePanel) return;

        const lang =
            currentCodeBlock &&
            currentCodeBlock.lang
                ? currentCodeBlock.lang
                : 'text';

        const tabLabel =
            currentCodeBlock &&
            currentCodeBlock.tabLabel
                ? currentCodeBlock.tabLabel
                : getLanguageTabLabel(lang);

        const code =
            currentCodeBlock &&
            currentCodeBlock.code
                ? currentCodeBlock.code
                : '';

        if (codePanelLang) {

            const dotIndex =
                tabLabel.lastIndexOf('.');

            const name =
                dotIndex > 0
                    ? tabLabel.substring(
                        0,
                        dotIndex
                    )
                    : tabLabel;

            const ext =
                dotIndex > 0
                    ? tabLabel
                        .substring(dotIndex + 1)
                        .toUpperCase()
                    : getLanguageColorKey(
                        lang
                    ).toUpperCase();

            codePanelLang.innerHTML = `
                <span class="code-panel-filename">
                    ${escapeHtml(name)}
                </span>

                <span class="code-panel-ext">
                    ${escapeHtml(ext)}
                </span>
            `;
        }

        if (codePanelContent) {

            const hljsLang =
                getHljsLanguageName(lang);

            let highlighted;

            try {

                if (
                    typeof hljs !== 'undefined' &&
                    hljs.getLanguage &&
                    hljs.getLanguage(hljsLang)
                ) {

                    highlighted =
                        hljs.highlight(
                            code,
                            {
                                language:
                                    hljsLang
                            }
                        ).value;

                } else if (
                    typeof hljs !== 'undefined'
                ) {

                    highlighted =
                        hljs.highlightAuto(
                            code
                        ).value;

                } else {

                    highlighted =
                        escapeHtml(code);
                }

            } catch (error) {

                highlighted =
                    escapeHtml(code);
            }

            codePanelContent.innerHTML =
                highlighted;

            codePanelContent.className =
                `hljs language-${hljsLang}`;
        }

        if (workspaceBody) {
            workspaceBody.classList.add(
                'split-view'
            );
        }

        codePanel.classList.remove(
            'hidden'
        );

        codePanel.classList.add(
            'active'
        );
    }


    function closeCodePanel() {

        if (!codePanel) return;

        codePanel.classList.remove(
            'active'
        );

        codePanel.classList.remove(
            'fullscreen'
        );

        codePanel.classList.add(
            'hidden'
        );

        if (workspaceBody) {
            workspaceBody.classList.remove(
                'split-view'
            );
        }
    }


    /* =====================================================================
       HISTORY
       ===================================================================== */

    function renderHistory(
        filterQuery = ''
    ) {

        if (!historyList) return;

        historyList.innerHTML =
            '';

        const filtered =
            conversations.filter(
                c =>
                    c.title
                        .toLowerCase()
                        .includes(
                            filterQuery
                        )
            );

        filtered.forEach(
            conversation => {

                const item =
                    document.createElement(
                        'div'
                    );

                item.className =
                    `history-item ${
                        conversation.id ===
                        currentConversationId
                            ? 'active'
                            : ''
                    }`;

                item.textContent =
                    conversation.title;

                item.title =
                    conversation.title;

                item.addEventListener(
                    'click',
                    () =>
                        loadConversation(
                            conversation.id
                        )
                );

                historyList.appendChild(
                    item
                );
            }
        );
    }


    /* =====================================================================
       LOAD CONVERSATION
       ===================================================================== */

    function loadConversation(id) {

        const conv =
            conversations.find(
                c => c.id === id
            );

        if (!conv) return;

        currentConversationId =
            id;

        isTempChat =
            false;

        if (tempChatBadge) {
            tempChatBadge.classList.add(
                'hidden'
            );
        }

        if (chatBox) {
            chatBox.innerHTML =
                '';
        }

        if (welcomeScreen) {
            welcomeScreen.style.display =
                'none';
        }

        closeCodePanel();

        conv.messages.forEach(
            msg => {

                const isMedia =
                    msg.mode === 'image' ||
                    msg.mode === 'video';

                appendMessageToDOM(
                    msg.role === 'user'
                        ? 'user'
                        : 'ai',

                    msg.content,

                    isMedia,

                    false
                );
            }
        );

        localStorage.setItem(
            'cinou_current_conversation',
            id
        );

        renderHistory();
    }


    function restoreLastConversation() {

        const savedConversationId =
            localStorage.getItem(
                'cinou_current_conversation'
            );

        if (
            savedConversationId &&
            conversations.some(
                c =>
                    c.id ===
                    savedConversationId
            )
        ) {

            loadConversation(
                savedConversationId
            );
        }
    }


    /* =====================================================================
       SETTINGS MODAL
       ===================================================================== */

    function openSettingsModal() {

        if (!settingsModal) return;

        updateSettingsUI();

        settingsModal.classList.add(
            'active'
        );
    }


    function closeSettings() {

        if (!settingsModal) return;

        settingsModal.classList.remove(
            'active'
        );
    }


    function saveUserSettings() {

        if (usernameInput) {

            const newUsername =
                usernameInput.value.trim();

            if (newUsername) {
                userSettings.username =
                    newUsername;
            }
        }

        if (userAvatarInput) {

            const newAvatar =
                userAvatarInput.value.trim();

            if (newAvatar) {

                userSettings.avatar =
                    newAvatar.substring(
                        0,
                        2
                    );
            }
        }

        if (customAccentPicker) {
            userSettings.accentColor =
                customAccentPicker.value;
        }

        if (customInstructions) {
            userSettings.customInstructions =
                customInstructions.value.trim();
        }

        saveSettingsToStorage();

        applySettings();

        closeSettings();

        renderHistory();
    }


    function saveSettingsToStorage() {

        try {

            localStorage.setItem(
                'cinou_user_settings',
                JSON.stringify(
                    userSettings
                )
            );

        } catch (error) {

            console.error(
                'Unable to save settings:',
                error
            );

            if (
                error &&
                error.name ===
                    'QuotaExceededError'
            ) {

                alert(
                    'Your avatar or background image is too large to save. Try a smaller image.'
                );
            }
        }
    }


    /* =====================================================================
       APPLY SETTINGS
       ===================================================================== */

    function applySettings() {

        applyTheme(
            userSettings.theme
        );

        applyCustomBackground();

        applyAccentColor();

        applyUserProfile();

        applyUserAvatar();

        updateSettingsUI();
    }


    function applyTheme(theme) {

        if (
            !VALID_THEMES.includes(
                theme
            )
        ) {
            theme = 'dark';
        }

        userSettings.theme =
            theme;

        document.documentElement.setAttribute(
            'data-theme',
            theme
        );

        document.body.setAttribute(
            'data-theme',
            theme
        );

        themeChips.forEach(
            chip => {

                chip.classList.toggle(
                    'active',
                    chip.dataset.theme ===
                        theme
                );
            }
        );
    }


    function applyAccentColor() {

        const accent =
            userSettings.accentColor ||
            '#6366f1';

        document.documentElement.style.setProperty(
            '--accent',
            accent
        );

        document.documentElement.style.setProperty(
            '--accent-color',
            accent
        );

        if (customAccentPicker) {
            customAccentPicker.value =
                accent;
        }
    }


    function applyCustomBackground() {

        const background =
            userSettings.customBg;

        const target =
            chatViewport ||
            document.body;

        if (background) {

            target.style.setProperty(
                'background-image',
                `url("${background}")`
            );

            target.style.setProperty(
                'background-size',
                'cover'
            );

            target.style.setProperty(
                'background-position',
                'center'
            );

            target.style.setProperty(
                'background-attachment',
                'fixed'
            );

            if (removeBgBtn) {
                removeBgBtn.classList.remove(
                    'hidden'
                );
            }

        } else {

            target.style.removeProperty(
                'background-image'
            );

            target.style.removeProperty(
                'background-size'
            );

            target.style.removeProperty(
                'background-position'
            );

            target.style.removeProperty(
                'background-attachment'
            );

            if (removeBgBtn) {
                removeBgBtn.classList.add(
                    'hidden'
                );
            }
        }
    }


    function applyUserProfile() {

        const username =
            userSettings.username ||
            'Cinou';

        if (userNameDisplay) {
            userNameDisplay.textContent =
                username;
        }

        const greeting =
            document.getElementById(
                'dynamic-greeting'
            );

        if (greeting) {
            greeting.textContent =
                `The mic is yours, ${username}`;
        }
    }


    function applyUserAvatar() {

        const avatarImage =
            userSettings.avatarImage;

        const avatarText =
            userSettings.avatar ||
            'C';

        const renderInto = (el) => {

            if (avatarImage) {

                el.innerHTML =
                    `<img src="${avatarImage}" alt="User avatar" class="user-avatar-image">`;

            } else {

                el.textContent =
                    avatarText;
            }
        };

        if (userAvatarPreview) {
            renderInto(
                userAvatarPreview
            );
        }

        document
            .querySelectorAll(
                '[data-user-avatar]'
            )
            .forEach(
                renderInto
            );

        document
            .querySelectorAll(
                '.user-avatar'
            )
            .forEach(
                el => {

                    if (
                        el ===
                        userAvatarPreview
                    ) {
                        return;
                    }

                    renderInto(el);
                }
            );

        if (removeAvatarBtn) {

            removeAvatarBtn.classList.toggle(
                'hidden',
                !avatarImage
            );
        }
    }


    function updateSettingsUI() {

        if (usernameInput) {
            usernameInput.value =
                userSettings.username ||
                '';
        }

        if (userAvatarInput) {
            userAvatarInput.value =
                userSettings.avatar ||
                'C';
        }

        if (customAccentPicker) {
            customAccentPicker.value =
                userSettings.accentColor ||
                '#6366f1';
        }

        if (customInstructions) {
            customInstructions.value =
                userSettings.customInstructions ||
                '';
        }

        themeChips.forEach(
            chip => {

                chip.classList.toggle(
                    'active',
                    chip.dataset.theme ===
                        userSettings.theme
                );
            }
        );

        if (removeBgBtn) {

            removeBgBtn.classList.toggle(
                'hidden',
                !userSettings.customBg
            );
        }

        if (removeAvatarBtn) {

            removeAvatarBtn.classList.toggle(
                'hidden',
                !userSettings.avatarImage
            );
        }
    }


    /* =====================================================================
       SIDEBAR / MODE STATE
       ===================================================================== */

    function restoreSidebarState() {

        if (!sidebar) return;

        const collapsed =
            localStorage.getItem(
                'cinou_sidebar_collapsed'
            );

        sidebar.classList.toggle(
            'collapsed',
            collapsed === 'true'
        );
    }


    function restoreCurrentMode() {

        const savedMode =
            localStorage.getItem(
                'cinou_current_mode'
            );

        currentMode =
            [
                'chat',
                'image',
                'video'
            ].includes(
                savedMode
            )
                ? savedMode
                : 'chat';

        modeButtons.forEach(
            button => {

                button.classList.toggle(
                    'active',
                    button.dataset.mode ===
                        currentMode
                );
            }
        );

        updateInputForMode();
    }


    function updateInputForMode() {

        if (!userInput) return;

        if (currentMode === 'image') {

            userInput.placeholder =
                'Describe the image you want CinouAI to create...';

        } else if (
            currentMode === 'video'
        ) {

            userInput.placeholder =
                'Describe the video you want...';

        } else {

            userInput.placeholder =
                'Message CinouAI...';
        }
    }


    /* =====================================================================
       NEW CHAT / CONVERSATION MANAGEMENT
       ===================================================================== */

    function startNewChat() {

        currentConversationId =
            null;

        isTempChat =
            false;

        if (tempChatBadge) {
            tempChatBadge.classList.add(
                'hidden'
            );
        }

        if (toggleTempChatBtn) {
            toggleTempChatBtn.style.color =
                '';
        }

        if (chatBox) {
            chatBox.innerHTML =
                '';
        }

        if (welcomeScreen) {
            welcomeScreen.style.display =
                '';
        }

        closeCodePanel();

        if (userInput) {

            userInput.value =
                '';

            userInput.style.height =
                'auto';
        }

        localStorage.removeItem(
            'cinou_current_conversation'
        );

        hideAIStatus();

        renderHistory();

        if (userInput) {

            setTimeout(
                () =>
                    userInput.focus(),
                50
            );
        }
    }


    function createConversation(
        firstMessage
    ) {

        const cleanMessage =
            String(
                firstMessage ||
                'New conversation'
            ).trim();

        const title =
            cleanMessage.length > 50
                ? cleanMessage.substring(
                    0,
                    50
                ) + '...'
                : cleanMessage;

        const conversation = {

            id:
                'conv_' +
                Date.now() +
                '_' +
                Math.random()
                    .toString(36)
                    .substring(2, 9),

            title:
                title ||
                'New conversation',

            createdAt:
                Date.now(),

            updatedAt:
                Date.now(),

            messages: []
        };

        conversations.unshift(
            conversation
        );

        currentConversationId =
            conversation.id;

        saveConversations();

        renderHistory();

        return conversation;
    }


    function saveConversations() {

        try {

            localStorage.setItem(
                'cinou_conversations',
                JSON.stringify(
                    conversations
                )
            );

        } catch (error) {

            console.error(
                'Unable to save conversations:',
                error
            );

            if (
                error &&
                error.name ===
                    'QuotaExceededError'
            ) {

                console.warn(
                    'CinouAI localStorage quota exceeded.'
                );
            }
        }
    }


    function sortConversations() {

        conversations.sort(
            (a, b) => {

                const aTime =
                    Number(
                        a.updatedAt ||
                        a.createdAt ||
                        0
                    );

                const bTime =
                    Number(
                        b.updatedAt ||
                        b.createdAt ||
                        0
                    );

                return bTime - aTime;
            }
        );
    }


    function normalizeConversations() {

        if (!Array.isArray(conversations)) {

            conversations = [];

            return;
        }

        conversations =
            conversations
                .filter(
                    c =>
                        c &&
                        typeof c === 'object'
                )
                .map(
                    conversation => {

                        if (!conversation.id) {

                            conversation.id =
                                'conv_' +
                                Date.now() +
                                '_' +
                                Math.random()
                                    .toString(36)
                                    .substring(
                                        2,
                                        8
                                    );
                        }

                        if (
                            !conversation.title
                        ) {
                            conversation.title =
                                'Conversation';
                        }

                        if (
                            !Array.isArray(
                                conversation.messages
                            )
                        ) {
                            conversation.messages =
                                [];
                        }

                        if (
                            !conversation.createdAt
                        ) {
                            conversation.createdAt =
                                Date.now();
                        }

                        if (
                            !conversation.updatedAt
                        ) {
                            conversation.updatedAt =
                                conversation.createdAt;
                        }

                        conversation.messages =
                            conversation.messages
                                .filter(
                                    m =>
                                        m &&
                                        typeof m ===
                                            'object'
                                )
                                .map(
                                    m => {

                                        const normalized =
                                            {
                                                role:
                                                    m.role ===
                                                    'user'
                                                        ? 'user'
                                                        : 'ai',

                                                content:
                                                    typeof m.content ===
                                                    'string'
                                                        ? m.content
                                                        : '',

                                                mode:
                                                    m.mode ||
                                                    'chat'
                                            };

                                        if (
                                            typeof m.imagePrompt ===
                                                'string' &&
                                            m.imagePrompt.trim()
                                        ) {

                                            normalized.imagePrompt =
                                                m.imagePrompt;
                                        }

                                        return normalized;
                                    }
                                );

                        return conversation;
                    }
                );

        sortConversations();

        saveConversations();
    }


    /* =====================================================================
       HANDLE USER SUBMISSION
       ===================================================================== */

    async function handleUserSubmission() {

        if (!userInput) return;

        const promptText =
            userInput.value.trim();

        if (!promptText) return;

        if (window.cinouSubmitting) {
            return;
        }

        window.cinouSubmitting =
            true;

        try {

            if (
                !currentConversationId &&
                !isTempChat
            ) {

                createConversation(
                    promptText
                );
            }

            const activeConversation =
                currentConversationId
                    ? conversations.find(
                        c =>
                            c.id ===
                            currentConversationId
                    )
                    : null;

            const previousMessages =
                activeConversation &&
                Array.isArray(
                    activeConversation.messages
                )
                    ? activeConversation.messages.slice()
                    : [];

            appendMessageToDOM(
                'user',
                promptText,
                false
            );

            const effectiveMode =
                currentMode === 'chat'
                    ? detectContentIntent(
                        promptText
                    )
                    : currentMode;

            if (
                !isTempChat &&
                activeConversation
            ) {

                activeConversation.messages.push({
                    role: 'user',
                    content: promptText,
                    mode: effectiveMode
                });

                activeConversation.updatedAt =
                    Date.now();

                saveConversations();

                renderHistory();
            }

            userInput.value =
                '';

            userInput.style.height =
                'auto';

            if (
                effectiveMode ===
                'image'
            ) {

                await handleImageGeneration(
                    promptText,
                    previousMessages
                );

            } else if (
                effectiveMode ===
                'video'
            ) {

                await handleVideoGeneration(
                    promptText,
                    previousMessages
                );

            } else {

                await handleChatResponse(
                    promptText,
                    previousMessages
                );
            }

        } finally {

            window.cinouSubmitting =
                false;
        }
    }


    /* =====================================================================
       DEBUG API
       ===================================================================== */

    window.CinouAI = {

        version:
            'CinouAI',

        getCurrentMode:
            () =>
                currentMode,

        getCurrentConversation:
            () =>
                currentConversationId,

        newChat:
            () =>
                startNewChat(),

        openSettings:
            () =>
                openSettingsModal(),

        getConversations:
            () =>
                conversations,

        clearConversations:
            () => {

                conversations =
                    [];

                saveConversations();

                startNewChat();

                renderHistory();
            },

        build:
            (prompt) => {

                if (buildPrompt) {
                    buildPrompt.value =
                        prompt || '';
                }

                if (cinouBuild) {
                    cinouBuild.classList.remove(
                        'hidden'
                    );
                }

                if (prompt) {
                    return startCinouBuild();
                }
            },

        runBuild:
            () =>
                runCinouBuild()
    };


    console.log(
        '%cCinouAI initialized successfully.',
        'font-weight:bold;font-size:14px;'
    );

    console.log(
        'Backend endpoint:',
        OPENAI_CHAT_ENDPOINT
    );

    console.log(
        'Current mode:',
        currentMode
    );

    console.log(
        'Conversations:',
        conversations.length
    );

    console.log(
        '%cCINOU BUILD V1 initialized.',
        'font-weight:bold;color:#6366f1;'
    );

});

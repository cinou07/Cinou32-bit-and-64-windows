
/* =========================================================================
   CINOU AUTH GATE — standalone, does not touch app.js
   On load: if the visitor hasn't chosen yet, shows "Sign in to use CinouAI"
   with a real Google Sign-In button + "Continue without sign in".
   Once a choice is made it's remembered (localStorage) so the gate doesn't
   reappear on every visit. A successful Google sign-in updates the same
   avatar/name spots app.js already renders (#user-avatar-preview,
   #user-name-display, any [data-user-avatar] / .user-avatar elements),
   by merging into the same 'cinou_user_settings' key app.js reads.
   ========================================================================= */

(function () {
    'use strict';

    const CHOICE_KEY = 'cinou_auth_choice';       // 'google' | 'guest'
    const GOOGLE_USER_KEY = 'cinou_google_user';   // verified profile, cached
    const SETTINGS_KEY = 'cinou_user_settings';    // same key app.js uses

    document.addEventListener('DOMContentLoaded', () => {

        const gate = document.getElementById('cinou-auth-gate');
        const btnContainer = document.getElementById('cinou-google-btn-container');
        const guestBtn = document.getElementById('cinou-continue-guest-btn');
        const message = document.getElementById('cinou-auth-message');

        if (!gate) return;

        const alreadyChose = localStorage.getItem(CHOICE_KEY);

        // If the user already signed in with Google before, re-apply their
        // profile to the UI in case app.js loaded before this ran.
        if (alreadyChose === 'google') {
            const cached = safeParse(localStorage.getItem(GOOGLE_USER_KEY));
            if (cached) applyProfileToUI(cached);
        }

        if (alreadyChose) {
            // Choice already made in a previous visit — don't show the gate.
            return;
        }

        gate.classList.add('active');

        initGoogleButton(btnContainer, message);

        if (guestBtn) {
            guestBtn.addEventListener('click', () => {
                localStorage.setItem(CHOICE_KEY, 'guest');
                gate.classList.remove('active');
            });
        }
    });


    /*
       PATCHED AUTH ONLY:
       The old web Google Identity Services code has been replaced with
       the native Electron Google OAuth bridge exposed by preload.js.

       This keeps the rest of the auth gate unchanged.
    */
    async function initGoogleButton(container, message) {

        if (!container) return;

        container.innerHTML = '';

        const button = document.createElement('button');

        button.type = 'button';
        button.textContent = 'Continue with Google';

        button.style.cssText = `
            background:#111;
            color:white;
            border:0;
            border-radius:999px;
            padding:13px 24px;
            font-size:15px;
            font-weight:600;
            cursor:pointer;
            min-width:230px;
        `;

        button.addEventListener('click', async () => {

            button.disabled = true;
            button.textContent = 'Opening Google...';

            if (message) {
                message.textContent = '';
            }

            try {

                if (
                    !window.cinouAuth ||
                    typeof window.cinouAuth.signInWithGoogle !== 'function'
                ) {
                    throw new Error(
                        'Google authentication is unavailable.'
                    );
                }

                const result =
                    await window.cinouAuth.signInWithGoogle();

                if (!result || !result.success || !result.user) {
                    throw new Error(
                        result?.error ||
                        'Google sign-in failed.'
                    );
                }

                const user = result.user;

                const email = (user.email || '').toLowerCase();

                if (!email) {
                    throw new Error(
                        "Google didn't return an email for this account."
                    );
                }

                const profile = {
                    id: user.id,
                    email,
                    name: user.name || email,
                    picture: user.picture || '',
                    emailVerified: user.emailVerified === true
                };

                localStorage.setItem(
                    CHOICE_KEY,
                    'google'
                );

                localStorage.setItem(
                    GOOGLE_USER_KEY,
                    JSON.stringify(profile)
                );

                applyProfileToUI(profile);

                const gate =
                    document.getElementById('cinou-auth-gate');

                if (gate) {
                    gate.classList.remove('active');
                }

            } catch (err) {

                console.error(
                    'CinouAI Google sign-in:',
                    err
                );

                if (message) {
                    message.textContent =
                        err.message ||
                        'Google sign-in failed. Please try again.';
                }

                button.disabled = false;
                button.textContent = 'Continue with Google';
            }
        });

        container.appendChild(button);
    }


    /*
       Merges the Google profile into the same localStorage object app.js
       reads on load, and updates the DOM directly so it shows immediately
       without needing a page reload.
    */
    function applyProfileToUI(user) {

        const settings = safeParse(localStorage.getItem(SETTINGS_KEY)) || {};

        settings.username = user.name || settings.username || 'User';
        settings.avatarImage = user.picture || settings.avatarImage || '';

        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

        const nameEl = document.getElementById('user-name-display');
        if (nameEl) nameEl.textContent = settings.username;

        const avatarTargets = [
            document.getElementById('user-avatar-preview'),
            ...document.querySelectorAll('[data-user-avatar]'),
            ...document.querySelectorAll('.user-avatar')
        ].filter(Boolean);

        avatarTargets.forEach((el) => {
            if (settings.avatarImage) {
                const initial = (settings.username || 'U').trim().charAt(0).toUpperCase();
                el.innerHTML =
                    `<img src="${settings.avatarImage}" alt="User avatar" class="user-avatar-image" ` +
                    `referrerpolicy="no-referrer" ` +
                    `onerror="this.replaceWith(Object.assign(document.createElement('span'), {textContent: '${initial}'}))">`;
            }
        });
    }


    function safeParse(str) {
        try {
            return JSON.parse(str);
        } catch (err) {
            return null;
        }
    }

})();


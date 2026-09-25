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

    let googleClientId = null;

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


    async function initGoogleButton(container, message) {

        try {
            const res = await fetch('/api/config');
            const config = await res.json();
            googleClientId = config.googleClientId;
        } catch (err) {
            console.error('Could not load Google client ID:', err);
        }

        if (!googleClientId || googleClientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
            if (message) message.textContent = 'Google Sign-In is not configured.';
            return;
        }

        waitForGoogleScript(container, message);
    }


    function waitForGoogleScript(container, message) {

        if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
            setTimeout(() => waitForGoogleScript(container, message), 250);
            return;
        }

        google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response) => handleCredential(response, message)
        });

        if (container) {
            google.accounts.id.renderButton(container, {
                theme: 'filled_black',
                size: 'large',
                shape: 'pill',
                text: 'continue_with',
                width: 300
            });
        }
    }


    function handleCredential(response, message) {

        let payload;
        try {
            payload = decodeJwtPayload(response.credential);
        } catch (err) {
            if (message) message.textContent = 'Google sign-in failed. Please try again.';
            return;
        }

        const email = (payload.email || '').toLowerCase();

        if (!email) {
            if (message) message.textContent = "Google didn't return an email for this account.";
            return;
        }

        const user = {
            id: payload.sub,
            email,
            name: payload.name || email,
            picture: payload.picture || '',
            emailVerified: payload.email_verified === true
        };

        localStorage.setItem(CHOICE_KEY, 'google');
        localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(user));

        applyProfileToUI(user);

        const gate = document.getElementById('cinou-auth-gate');
        if (gate) gate.classList.remove('active');
    }


    /* Decodes a JWT's payload (base64url) without verifying its signature.
       NOTE: not cryptographically verified — good enough to render a name/
       avatar in the UI, not enough to gate anything sensitive server-side.
       For that, switch back to POSTing response.credential to a verified
       server endpoint (e.g. /api/auth/google using google-auth-library). */
    function decodeJwtPayload(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    }


    /* Merges the Google profile into the same localStorage object app.js
       reads on load, and updates the DOM directly so it shows immediately
       without needing a page reload. */
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

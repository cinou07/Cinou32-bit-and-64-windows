/* =========================================================================
   CINOU PREMIUM STATUS — standalone, does not touch app.js
   Reads/writes a simple 'cinou_premium' localStorage record:
     { active: boolean, expiresAt: <ms timestamp> }
   and renders it in two places:
     - the sidebar subtitle under the user's name (#user-plan-label)
     - the settings modal "Your Plan" row (#cinou-plan-name / #cinou-plan-expiry)

   IMPORTANT: this is a DISPLAY layer only. Nothing here actually charges
   anyone or verifies a real purchase — there's no payment backend wired
   up yet. Until you connect a real payment processor (Stripe, etc.) and
   have it call something like window.cinouActivatePremium(days) after a
   verified successful payment, this just shows whatever state is stored
   locally. Two helpers are exposed on window for testing:
     cinouActivatePremium(days)   e.g. cinouActivatePremium(30)
     cinouDeactivatePremium()
   ========================================================================= */

(function () {
    'use strict';

    const PREMIUM_KEY = 'cinou_premium';

    function getPremiumState() {
        try {
            const raw = JSON.parse(localStorage.getItem(PREMIUM_KEY));
            if (!raw) return { active: false, expiresAt: 0 };
            if (raw.active && raw.expiresAt && raw.expiresAt > Date.now()) {
                return raw;
            }
            return { active: false, expiresAt: 0 };
        } catch (err) {
            return { active: false, expiresAt: 0 };
        }
    }

    function render() {
        const state = getPremiumState();

        const sidebarLabel = document.getElementById('user-plan-label');
        const planName = document.getElementById('cinou-plan-name');
        const planExpiry = document.getElementById('cinou-plan-expiry');
        const planStatusBox = document.getElementById('cinou-plan-status');

        if (state.active) {
            const daysLeft = Math.max(
                1,
                Math.ceil((state.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
            );

            if (sidebarLabel) {
                sidebarLabel.textContent = `Premium · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
            }
            if (planName) planName.textContent = 'Premium';
            if (planExpiry) planExpiry.textContent = `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
            if (planStatusBox) planStatusBox.classList.add('is-premium');

        } else {
            if (sidebarLabel) sidebarLabel.textContent = 'Free plan';
            if (planName) planName.textContent = 'Free';
            if (planExpiry) planExpiry.textContent = '';
            if (planStatusBox) planStatusBox.classList.remove('is-premium');
        }
    }

    /* Public helpers — call these once you wire up a real payment
       confirmation (e.g. from a Stripe webhook result, or the redirect
       back from the premium page carrying a verified success flag). */
    window.cinouActivatePremium = function (days) {
        const expiresAt = Date.now() + (Number(days) || 30) * 24 * 60 * 60 * 1000;
        localStorage.setItem(PREMIUM_KEY, JSON.stringify({ active: true, expiresAt }));
        render();
    };

    window.cinouDeactivatePremium = function () {
        localStorage.setItem(PREMIUM_KEY, JSON.stringify({ active: false, expiresAt: 0 }));
        render();
    };

    document.addEventListener('DOMContentLoaded', () => {
        render();
        // Re-render once a minute so the "days left" count stays accurate
        // for anyone who leaves the tab open across a day boundary.
        setInterval(render, 60 * 1000);
    });

})();

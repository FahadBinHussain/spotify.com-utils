// ==UserScript==
// @name         Spotify Miniplayer Ultimate Unblocker (V24 - Hover Effect)
// @namespace    http://tampermonkey.net/
// @version      24.0
// @description  Restores the official "Show on Hover" behavior for controls. Hides Premium text via Opacity. Keeps Art visible.
// @author       Fahad
// @match        https://open.spotify.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log("Spotify Miniplayer: Hover Effect Enabled");

    const antiPremiumCSS = `
        /* 1. PLAYER CONTAINER */
        [data-testid="pip-hover-element"],
        #document-pip-main-container {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            z-index: 1 !important;
        }

        /* 2. CONTROLS (THE HOVER FIX) */
        .encore-over-media-set,
        [data-testid="document-pip-hover-element"] {
            display: flex !important;
            z-index: 99999 !important;
            background: rgba(0,0,0,0.3) !important;
            
            /* Start Invisible */
            opacity: 0 !important;
            /* Add smooth fade animation */
            transition: opacity 0.2s ease-in-out !important;
        }

        /* SHOW CONTROLS WHEN HOVERING THE WINDOW */
        body:hover .encore-over-media-set,
        body:hover [data-testid="document-pip-hover-element"] {
            opacity: 1 !important;
        }

        /* 3. WINDOW SETUP */
        body {
             display: flex !important;
             flex-direction: column !important;
             margin: 0 !important;
             overflow: hidden !important;
        }
    `;

    // JS JANITOR (Unchanged - Keeps Art alive by using opacity hidden on text)
    function startJanitor(doc) {
        const observer = new MutationObserver((mutations) => {
            const xpath = "//*[contains(text(),'You discovered a Premium feature')]";
            const matchingElement = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

            if (matchingElement) {
                // Find the wrapper holding the text/buttons
                const premiumContentBox = matchingElement.closest('div').parentElement;

                if (premiumContentBox) {
                    // Hide via Opacity (Keeps Art Container Expanded)
                    if (premiumContentBox.style.opacity !== '0') {
                        premiumContentBox.style.opacity = '0';
                        premiumContentBox.style.pointerEvents = 'none';
                    }
                }
            }
        });

        observer.observe(doc.body, { childList: true, subtree: true });
    }

    // --- THE TRAP ---
    if (window.documentPictureInPicture) {
        const originalRequestWindow = window.documentPictureInPicture.requestWindow;

        window.documentPictureInPicture.requestWindow = async function(options) {
            const pipWindow = await originalRequestWindow.call(window.documentPictureInPicture, options);

            const style = pipWindow.document.createElement('style');
            style.textContent = antiPremiumCSS;
            pipWindow.document.head.appendChild(style);

            startJanitor(pipWindow.document);

            return pipWindow;
        };
    }

})();

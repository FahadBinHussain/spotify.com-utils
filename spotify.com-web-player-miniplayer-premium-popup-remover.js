// ==UserScript==
// @name         Spotify Miniplayer Ultimate Unblocker (V5.0 - Final Art Fix)
// @namespace    http://tampermonkey.net/
// @version      29
// @description  Restored V5.0 CSS. Hides text via Opacity to keep the Art container expanded and visible.
// @author       Fahad
// @match        https://open.spotify.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log("Spotify Miniplayer: V5.0 Logic + Opacity Fix");

    // EXACT CSS FROM V5.0 (No extra "Art" rules that break layout)
    const antiPremiumCSS = `
        /* 1. FORCE THE PLAYER VISIBLE */
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

        /* 2. FORCE CONTROLS VISIBLE */
        .encore-over-media-set,
        [data-testid="document-pip-hover-element"] {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 99999 !important; /* Force on top */
            background: rgba(0,0,0,0.3) !important;
        }

        /* 3. ENSURE RESIZABILITY */
        body {
             display: flex !important;
             flex-direction: column !important;
             margin: 0 !important;
             overflow: hidden !important;
        }
    `;

    // JS Janitor
    function startJanitor(doc) {
        const observer = new MutationObserver((mutations) => {
            // Find specific text "You discovered a Premium feature"
            const xpath = "//*[contains(text(),'You discovered a Premium feature')]";
            const matchingElement = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

            if (matchingElement) {
                // Traverse up to find the container holding the text/buttons
                // matchingElement (span) -> div -> div (The wrapper)
                const premiumContentBox = matchingElement.closest('div').parentElement;

                if (premiumContentBox) {
                    // *** THE FIX ***
                    // We DO NOT use 'display: none'. That collapses the box and kills the art.
                    // We use 'opacity: 0'. This keeps the box expanded (saving the Art) but makes the text invisible.

                    if (premiumContentBox.style.opacity !== '0') {
                        premiumContentBox.style.opacity = '0';
                        premiumContentBox.style.pointerEvents = 'none'; // Ensure clicks pass through to controls
                        console.log("Premium text hidden via opacity. Art preserved.");
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
            console.log("Spotify requested Miniplayer. Intercepting...");

            const pipWindow = await originalRequestWindow.call(window.documentPictureInPicture, options);

            const style = pipWindow.document.createElement('style');
            style.textContent = antiPremiumCSS;
            pipWindow.document.head.appendChild(style);

            startJanitor(pipWindow.document);

            return pipWindow;
        };
    } else {
        console.log("Document PiP API not supported.");
    }

})();

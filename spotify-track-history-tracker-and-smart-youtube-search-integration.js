// ==UserScript==
// @name         Spotify to YouTube (Cloud Sync + Clear + Multi-Artist + Artist Page Fix)
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Adds YouTube button, handles Artist Pages, syncs history.
// @author       Fahad
// @match        https://open.spotify.com/*
// @connect      script.google.com
// @connect      googleusercontent.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // YOUR URL
    const CLOUD_URL = "https://script.google.com/macros/s/AKfycbwEfwNz67Ch9eVFolmghS5A-STiEgrfCQxN8Y18yS6v9cybqNwiwwi9Y4yjF2l4jGcpLg/exec";

    const YT_BUTTON_CLASS = 'vm-yt-search-btn';
    let visitedTracks = new Set();
    let isHistoryLoaded = false;
    let debounceTimer = null;

    // Icons
    const ytIconSvg = `<svg role="img" height="16" width="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
    const visitedIconSvg = `<svg role="img" height="16" width="16" viewBox="0 0 24 24" fill="#E22134"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;

    function fetchHistory() {
        const noCacheUrl = CLOUD_URL + "?t=" + Date.now();

        GM_xmlhttpRequest({
            method: "GET",
            url: noCacheUrl,
            onload: function(response) {
                try {
                    const ids = JSON.parse(response.responseText);
                    visitedTracks = new Set(ids);
                    isHistoryLoaded = true;
                    addYoutubeButtons();
                } catch (e) {
                    console.error("Cloud Error:", e);
                }
            }
        });
    }

    function saveToCloud(trackId, songName, action = "add") {
        GM_xmlhttpRequest({
            method: "POST",
            url: CLOUD_URL,
            data: JSON.stringify({
                id: trackId,
                name: songName,
                action: action
            }),
            headers: { "Content-Type": "text/plain" },
            onload: function(response) {
                console.log(`Cloud action (${action}):`, response.responseText);
            }
        });
    }

    function addYoutubeButtons() {
        const rows = document.querySelectorAll('div[data-testid="tracklist-row"]');

        rows.forEach(row => {
            // -- ALIGNMENT --
            const titleColumn = row.querySelector('div[aria-colindex="2"]');
            if (!titleColumn) return;

            const textContainer = Array.from(titleColumn.children).find(child =>
                child.tagName === 'DIV' && !child.classList.contains(YT_BUTTON_CLASS)
            );
            if (textContainer && textContainer.style.flex !== "1 1 0%") {
                textContainer.style.flex = "1";
                textContainer.style.minWidth = "0";
            }
            // -- END ALIGNMENT --

            const titleEl = row.querySelector('a[data-testid="internal-track-link"]');
            if (!titleEl) return;
            const trackHref = titleEl.getAttribute('href');
            const trackId = trackHref ? trackHref.split('/').pop() : null;

            let btn = row.querySelector(`.${YT_BUTTON_CLASS}`);

            const updateIcon = (buttonElement) => {
                if (isHistoryLoaded && trackId && visitedTracks.has(trackId)) {
                    buttonElement.innerHTML = visitedIconSvg;
                    buttonElement.title = "Visited (Shift+Click to clear)";
                    buttonElement.style.color = "#E22134";
                } else {
                    buttonElement.innerHTML = ytIconSvg;
                    buttonElement.title = "Search on YouTube";
                    buttonElement.style.color = "#b3b3b3";
                }
            };

            if (btn) {
                updateIcon(btn);
                if (titleColumn.lastElementChild !== btn) {
                     titleColumn.appendChild(btn);
                }
                return;
            }

            // --- DATA EXTRACTION ---
            const songName = titleEl.innerText.trim();

            // 1. Try to get artists from the row (Playlists, Liked Songs, etc.)
            const artistEls = row.querySelectorAll('a[href^="/artist/"]');
            let artistList = Array.from(artistEls).map(el => el.innerText.trim());

            // 2. Fallback: If row has no artist info (Happens on Artist Pages & Album Pages)
            if (artistList.length === 0) {
                // Grab the main page header using the selector you found
                const pageTitleEl = document.querySelector('[data-encore-id="adaptiveTitle"]');
                if (pageTitleEl) {
                    // If on Artist Page -> This is the Artist Name
                    // If on Album Page -> This is the Album Name (Search still works well: "Album Song")
                    artistList.push(pageTitleEl.innerText.trim());
                }
            }

            const artistNameString = artistList.join(" ");
            const artistNameForSave = artistList.join(", ");

            const query = encodeURIComponent(`${artistNameString} ${songName}`);
            const ytUrl = `https://www.youtube.com/results?search_query=${query}`;

            btn = document.createElement('a');
            btn.className = YT_BUTTON_CLASS;
            btn.href = ytUrl;
            btn.target = '_blank';

            // Styles
            btn.style.display = "flex";
            btn.style.alignItems = "center";
            btn.style.justifyContent = "center";
            btn.style.background = "transparent";
            btn.style.border = "none";
            btn.style.cursor = "pointer";
            btn.style.marginLeft = "20px";
            btn.style.marginRight = "10px";
            btn.style.textDecoration = "none";
            btn.style.flexShrink = "0";

            updateIcon(btn);

            // Hover effects
            btn.onmouseover = () => { if (!visitedTracks.has(trackId)) btn.style.color = "#fff"; };
            btn.onmouseout = () => { btn.style.color = visitedTracks.has(trackId) ? "#E22134" : "#b3b3b3"; };

            // CLICK HANDLER
            btn.onclick = (e) => {
                e.preventDefault();

                if (e.shiftKey) {
                    // --- REMOVE ACTION ---
                    if (visitedTracks.has(trackId)) {
                        visitedTracks.delete(trackId);
                        updateIcon(btn);
                        if (trackId) saveToCloud(trackId, `${artistNameForSave} - ${songName}`, "remove");
                    }
                } else {
                    // --- SEARCH/ADD ACTION ---
                    if (!visitedTracks.has(trackId)) {
                        visitedTracks.add(trackId);
                        updateIcon(btn);
                        if (trackId) saveToCloud(trackId, `${artistNameForSave} - ${songName}`, "add");
                    } else {
                         if (trackId) saveToCloud(trackId, `${artistNameForSave} - ${songName}`, "add");
                    }
                    window.open(ytUrl, '_blank');
                }
            };

            titleColumn.appendChild(btn);
            titleColumn.style.display = "flex";
            titleColumn.style.alignItems = "center";
        });
    }

    fetchHistory();

    const observer = new MutationObserver((mutations) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            addYoutubeButtons();
        }, 300);
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();

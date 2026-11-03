(function () {
    "use strict";

    function formatDur(sec) {
        sec = parseInt(sec || 0, 10);
        if (!sec || sec <= 0) return "";
        var h = Math.floor(sec / 3600);
        var m = Math.floor((sec % 3600) / 60);
        var s = sec % 60;
        var mm = m < 10 ? "0" + m : "" + m;
        var ss = s < 10 ? "0" + s : "" + s;
        return h > 0 ? (h + ":" + mm + ":" + ss) : (mm + ":" + ss);
    }

    function escapeHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    /* =========================================================================
       1. STANDALONE NATIVE ABS HTML5 PLAYLIST PLAYER ([:absplayer:] / [:embed:])
       ========================================================================= */
    function getAbsGroups(uid) {
        var box = document.getElementById(uid);
        if (!box) return [];
        try {
            return JSON.parse(box.getAttribute("data-groups") || "[]");
        } catch (e) {
            return [];
        }
    }

    window.tmAbsSwitchGroup = function (uid, gIdx) {
        var box = document.getElementById(uid);
        if (!box) return;
        var groups = getAbsGroups(uid);
        var g = groups[gIdx];
        if (!g) return;

        box.setAttribute("data-cur-group", String(gIdx));
        box.setAttribute("data-cur-track", "0");

        var tabs = box.querySelectorAll(".tm-abs-tab");
        tabs.forEach(function (tab, i) {
            if (i === gIdx) tab.classList.add("active");
            else tab.classList.remove("active");
        });

        var listEl = box.querySelector(".tm-abs-tracklist");
        if (listEl) {
            var html = "";
            (g.tracks || []).forEach(function (t, tIdx) {
                var active = tIdx === 0 ? " active" : "";
                var dur = formatDur(t.duration);
                html +=
                    '<div class="tm-abs-track' + active + '" data-tidx="' + tIdx + '" data-title="' + escapeHtml((t.title || "").toLowerCase()) + '" onclick="window.tmAbsPlayTrack(\'' + uid + '\', ' + gIdx + ', ' + tIdx + ')">' +
                    '  <span class="tm-abs-t-num">' + (tIdx + 1) + '</span>' +
                    '  <span class="tm-abs-t-name">' + escapeHtml(t.title) + '</span>' +
                    '  <span class="tm-abs-t-dur">' + dur + '</span>' +
                    '  <span class="tm-abs-t-play">▶ Phát</span>' +
                    '</div>';
            });
            listEl.innerHTML = html;
        }

        window.tmAbsPlayTrack(uid, gIdx, 0, true);
    };

    window.tmAbsPlayTrack = function (uid, gIdx, tIdx, autoPlay) {
        var box = document.getElementById(uid);
        if (!box) return;
        var groups = getAbsGroups(uid);
        if (gIdx === null || gIdx === undefined) {
            gIdx = parseInt(box.getAttribute("data-cur-group") || "0", 10);
        }
        var g = groups[gIdx];
        if (!g || !g.tracks || !g.tracks[tIdx]) return;

        var track = g.tracks[tIdx];
        box.setAttribute("data-cur-group", String(gIdx));
        box.setAttribute("data-cur-track", String(tIdx));

        var npTitle = box.querySelector(".tm-abs-np-title");
        if (npTitle) {
            npTitle.textContent = track.title || ("Bài " + (tIdx + 1));
        }

        var rows = box.querySelectorAll(".tm-abs-track");
        rows.forEach(function (r) {
            var idx = parseInt(r.getAttribute("data-tidx") || "-1", 10);
            var playBadge = r.querySelector(".tm-abs-t-play");
            if (idx === tIdx) {
                r.classList.add("active");
                if (playBadge) playBadge.textContent = "🔊 Đang phát";
            } else {
                r.classList.remove("active");
                if (playBadge) playBadge.textContent = "▶ Phát";
            }
        });

        var audio = box.querySelector(".tm-abs-audio");
        if (audio) {
            if (audio.src !== track.src) {
                audio.src = track.src;
            }
            var speedSel = box.querySelector(".tm-abs-speed");
            if (speedSel) {
                audio.playbackRate = parseFloat(speedSel.value || "1");
            }
            if (autoPlay !== false) {
                audio.play().catch(function () {});
            }
        }
    };

    window.tmAbsPrev = function (uid) {
        var box = document.getElementById(uid);
        if (!box) return;
        var gIdx = parseInt(box.getAttribute("data-cur-group") || "0", 10);
        var tIdx = parseInt(box.getAttribute("data-cur-track") || "0", 10);
        if (tIdx > 0) {
            window.tmAbsPlayTrack(uid, gIdx, tIdx - 1, true);
        }
    };

    window.tmAbsNext = function (uid) {
        var box = document.getElementById(uid);
        if (!box) return;
        var groups = getAbsGroups(uid);
        var gIdx = parseInt(box.getAttribute("data-cur-group") || "0", 10);
        var tIdx = parseInt(box.getAttribute("data-cur-track") || "0", 10);
        var g = groups[gIdx];
        if (g && g.tracks && tIdx + 1 < g.tracks.length) {
            window.tmAbsPlayTrack(uid, gIdx, tIdx + 1, true);
        } else if (gIdx + 1 < groups.length) {
            window.tmAbsSwitchGroup(uid, gIdx + 1);
        }
    };

    window.tmAbsSpeed = function (uid, rate) {
        var box = document.getElementById(uid);
        if (!box) return;
        var audio = box.querySelector(".tm-abs-audio");
        if (audio) {
            audio.playbackRate = parseFloat(rate || "1");
        }
    };

    window.tmAbsFilter = function (uid, query) {
        var box = document.getElementById(uid);
        if (!box) return;
        var q = (query || "").trim().toLowerCase();
        var rows = box.querySelectorAll(".tm-abs-track");
        rows.forEach(function (r) {
            var title = r.getAttribute("data-title") || "";
            r.style.display = (!q || title.indexOf(q) !== -1) ? "flex" : "none";
        });
    };

    /* =========================================================================
       2. DUAL-PANE MEDIA HUB ([:mediahub:])
       ========================================================================= */
    window.tmHubToggleMenu = function (hubId) {
        var hub = document.getElementById(hubId);
        if (hub) {
            hub.classList.toggle("menu-open");
        }
    };

    window.tmHubSelect = function (hubId, index) {
        var hub = document.getElementById(hubId);
        if (!hub) return;

        var raw = hub.getAttribute("data-items");
        if (!raw) return;

        var items = [];
        try {
            items = JSON.parse(raw);
        } catch (e) {
            return;
        }

        var selected = items[index];
        if (!selected) return;

        hub.setAttribute("data-cur-item", String(index));
        hub.setAttribute("data-cur-track", "0");

        var listEls = hub.querySelectorAll(".tm-hub-item");
        listEls.forEach(function (el, idx) {
            if (idx === index) el.classList.add("active");
            else el.classList.remove("active");
        });

        hub.classList.remove("menu-open");

        var mobileTitle = hub.querySelector(".tm-hub-mobiletitle");
        if (mobileTitle && selected.title) {
            mobileTitle.textContent = selected.title;
        }

        var iframeWrap = hub.querySelector(".tm-hub-iframe-wrap");
        var iframeEl = hub.querySelector(".tm-hub-iframe");
        var cardWrap = hub.querySelector(".tm-hub-card-wrap");

        var tracks = selected.tracks || [];
        if (tracks.length > 0 && cardWrap) {
            if (iframeWrap) iframeWrap.style.display = "none";
            if (iframeEl) iframeEl.src = "";
            cardWrap.style.display = "flex";

            var firstTrack = tracks[0];
            var extUrl = selected.url || (selected.slug ? ("https://audio.com/quan-nguyen-duc-1/collections/" + selected.slug) : "");
            var readUrl = selected.read_url || "";
            var pdfUrl = selected.pdf_url || "";
            var videoUrl = selected.video_url || "";

            var headerLinks = "";
            if (readUrl) {
                headerLinks += '<a class="tm-hub-format-btn tm-fmt-read" href="' + escapeHtml(readUrl) + '">📖 Đọc Sách / Tóm Tắt Truyện</a>';
            }
            if (pdfUrl) {
                headerLinks += '<a class="tm-hub-format-btn tm-fmt-pdf" href="' + escapeHtml(pdfUrl) + '" target="_blank" rel="noopener noreferrer">📄 Sách PDF</a>';
            }
            if (videoUrl) {
                headerLinks += '<a class="tm-hub-format-btn tm-fmt-video" href="' + escapeHtml(videoUrl) + '" target="_blank" rel="noopener noreferrer">🎬 Xem Video</a>';
            }
            if (extUrl) {
                var extLbl = extUrl.indexOf("audio.com") !== -1 ? "↗ Audio.com" : "↗ Audiobookshelf";
                headerLinks += '<a class="tm-hub-format-btn tm-fmt-ext" href="' + escapeHtml(extUrl) + '" target="_blank" rel="noopener noreferrer">' + extLbl + '</a>';
            }

            var trackRowsHtml = "";
            tracks.forEach(function (t, tIdx) {
                var active = tIdx === 0 ? " active" : "";
                var dur = formatDur(t.duration);
                trackRowsHtml +=
                    '<div class="tm-hub-track' + active + '" data-tidx="' + tIdx + '" data-title="' + escapeHtml((t.title || "").toLowerCase()) + '" onclick="window.tmHubPlayTrack(\'' + hubId + '\', ' + index + ', ' + tIdx + ')">' +
                    '  <span class="tm-abs-t-num">' + (tIdx + 1) + '</span>' +
                    '  <span class="tm-abs-t-name">' + escapeHtml(t.title) + '</span>' +
                    '  <span class="tm-abs-t-dur">' + dur + '</span>' +
                    '  <span class="tm-abs-t-play">' + (tIdx === 0 ? "🔊 Đang chọn" : "▶ Phát") + '</span>' +
                    '</div>';
            });

            cardWrap.innerHTML =
                '<div class="tm-hub-player-deck">' +
                '  <div class="tm-hub-deck-top">' +
                '    <div>' +
                '      <div class="tm-hub-deck-title">' + escapeHtml(selected.title || "Tuyển tập Audio") + '</div>' +
                '      <div class="tm-hub-deck-np">Bài đang chọn: <strong class="tm-hub-np-name">' + escapeHtml(firstTrack.title) + '</strong></div>' +
                '    </div>' +
                '    <div class="tm-hub-format-bar">' + headerLinks + '</div>' +
                '  </div>' +
                '  <div class="tm-hub-audio-row">' +
                '    <button type="button" class="tm-abs-btn" onclick="window.tmHubPrev(\'' + hubId + '\')">⏮ Trước</button>' +
                '    <audio class="tm-hub-audio" controls preload="metadata" src="' + escapeHtml(firstTrack.src) + '"></audio>' +
                '    <button type="button" class="tm-abs-btn" onclick="window.tmHubNext(\'' + hubId + '\')">Tiếp ⏭</button>' +
                '  </div>' +
                '  <div class="tm-hub-search-row">' +
                '    <input type="search" class="tm-hub-search" placeholder="🔍 Tìm nhanh bài nghe trong mục này (' + tracks.length + ' bài)..." oninput="window.tmHubFilterTracks(\'' + hubId + '\', this.value)" />' +
                '  </div>' +
                '</div>' +
                '<div class="tm-hub-tracklist">' + trackRowsHtml + '</div>';

            var audioEl = cardWrap.querySelector(".tm-hub-audio");
            if (audioEl) {
                audioEl.addEventListener("ended", function () {
                    window.tmHubNext(hubId);
                });
            }
        } else if (selected.type === "audiocom_collection" || selected.mode === "external") {
            if (iframeWrap) iframeWrap.style.display = "none";
            if (iframeEl) iframeEl.src = "";
            if (cardWrap) {
                cardWrap.style.display = "block";
                var extUrl2 = selected.url || ("https://audio.com/quan-nguyen-duc-1/collections/" + (selected.slug || ""));
                cardWrap.innerHTML =
                    '<div class="tm-hub-ext-box">' +
                    '  <div class="tm-hub-ext-title">' + escapeHtml(selected.title || "Tuyển tập Audio") + '</div>' +
                    '  <div class="tm-hub-ext-desc">' + escapeHtml(selected.description || "Tự động chuyển bài và phát liên tục trọn bộ trên Audio.com.") + '</div>' +
                    '  <a class="tm-hub-ext-btn" href="' + escapeHtml(extUrl2) + '" target="_blank" rel="noopener noreferrer">▶ Mở phát trọn bộ ngay</a>' +
                    '</div>';
            }
        } else {
            if (cardWrap) cardWrap.style.display = "none";
            if (iframeWrap) iframeWrap.style.display = "block";
            if (iframeEl && selected.url && iframeEl.src !== selected.url) {
                iframeEl.src = selected.url;
            }
        }
    };

    window.tmHubPlayTrack = function (hubId, itemIdx, tIdx) {
        var hub = document.getElementById(hubId);
        if (!hub) return;
        var items = [];
        try {
            items = JSON.parse(hub.getAttribute("data-items") || "[]");
        } catch (e) {
            return;
        }
        var item = items[itemIdx];
        if (!item || !item.tracks || !item.tracks[tIdx]) return;
        var track = item.tracks[tIdx];

        hub.setAttribute("data-cur-track", String(tIdx));

        var npName = hub.querySelector(".tm-hub-np-name");
        if (npName) npName.textContent = track.title;

        var rows = hub.querySelectorAll(".tm-hub-track");
        rows.forEach(function (r) {
            var idx = parseInt(r.getAttribute("data-tidx") || "-1", 10);
            var badge = r.querySelector(".tm-abs-t-play");
            if (idx === tIdx) {
                r.classList.add("active");
                if (badge) badge.textContent = "🔊 Đang phát";
            } else {
                r.classList.remove("active");
                if (badge) badge.textContent = "▶ Phát";
            }
        });

        var audio = hub.querySelector(".tm-hub-audio");
        if (audio) {
            if (audio.src !== track.src) {
                audio.src = track.src;
            }
            audio.play().catch(function () {});
        }
    };

    window.tmHubPrev = function (hubId) {
        var hub = document.getElementById(hubId);
        if (!hub) return;
        var itemIdx = parseInt(hub.getAttribute("data-cur-item") || "0", 10);
        var tIdx = parseInt(hub.getAttribute("data-cur-track") || "0", 10);
        if (tIdx > 0) {
            window.tmHubPlayTrack(hubId, itemIdx, tIdx - 1);
        }
    };

    window.tmHubNext = function (hubId) {
        var hub = document.getElementById(hubId);
        if (!hub) return;
        var items = [];
        try {
            items = JSON.parse(hub.getAttribute("data-items") || "[]");
        } catch (e) {
            return;
        }
        var itemIdx = parseInt(hub.getAttribute("data-cur-item") || "0", 10);
        var tIdx = parseInt(hub.getAttribute("data-cur-track") || "0", 10);
        var item = items[itemIdx];
        if (item && item.tracks && tIdx + 1 < item.tracks.length) {
            window.tmHubPlayTrack(hubId, itemIdx, tIdx + 1);
        }
    };

    window.tmHubFilterTracks = function (hubId, query) {
        var hub = document.getElementById(hubId);
        if (!hub) return;
        var q = (query || "").trim().toLowerCase();
        var rows = hub.querySelectorAll(".tm-hub-track");
        rows.forEach(function (r) {
            var title = r.getAttribute("data-title") || "";
            r.style.display = (!q || title.indexOf(q) !== -1) ? "flex" : "none";
        });
    };

    /* =========================================================================
       3. TRACKLIST & ACCORDION HELPERS
       ========================================================================= */
    window.tmFilterTracks = function (boxId, query) {
        var box = document.getElementById(boxId);
        if (!box) return;
        var q = (query || "").trim().toLowerCase();
        var rows = box.querySelectorAll(".tm-track-row");
        rows.forEach(function (row) {
            var title = row.getAttribute("data-title") || "";
            row.style.display = (!q || title.indexOf(q) !== -1) ? "flex" : "none";
        });
    };

    window.tmFilterStories = function (boxId, query) {
        var box = document.getElementById(boxId);
        if (!box) return;
        var q = (query || "").trim().toLowerCase();
        var cards = box.querySelectorAll(".tm-story-card");
        cards.forEach(function (card) {
            var txt = card.getAttribute("data-search") || "";
            card.style.display = (!q || txt.indexOf(q) !== -1) ? "block" : "none";
        });
    };

    window.tmToggleStoryVideo = function (drawerId, embedUrl) {
        var drawer = document.getElementById(drawerId);
        if (!drawer) return;
        if (drawer.style.display === "none" || !drawer.innerHTML) {
            drawer.style.display = "block";
            drawer.innerHTML =
                '<div class="tm-story-video-frame">' +
                '  <iframe src="' + escapeHtml(embedUrl) + '" style="width:100%; height:380px; border:none; border-radius:8px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>' +
                '</div>';
        } else {
            drawer.style.display = "none";
            drawer.innerHTML = "";
        }
    };

    window.tmPlayInlineAudio = function (btn, src, title) {
        var existing = document.getElementById("tm-floating-audio-bar");
        if (!existing) {
            existing = document.createElement("div");
            existing.id = "tm-floating-audio-bar";
            existing.className = "tm-floating-audio-bar";
            existing.innerHTML =
                '<div class="tm-fab-inner">' +
                '  <div class="tm-fab-title">🎧 <span id="tm-fab-name"></span></div>' +
                '  <audio id="tm-fab-player" controls autoplay style="flex:1; max-width:520px; height:38px;"></audio>' +
                '  <button type="button" class="tm-fab-close" onclick="var b=document.getElementById(\'tm-floating-audio-bar\'); var p=document.getElementById(\'tm-fab-player\'); if(p)p.pause(); if(b)b.style.display=\'none\';">✕</button>' +
                '</div>';
            document.body.appendChild(existing);
        }
        existing.style.display = "block";
        var nameEl = document.getElementById("tm-fab-name");
        if (nameEl) nameEl.textContent = title || "Đang phát MP3";
        var player = document.getElementById("tm-fab-player");
        if (player) {
            player.src = src;
            player.play().catch(function () {});
        }
    };

    window.tmToggleAccordion = function (btn) {
        if (!btn || !btn.parentElement) return;
        var item = btn.parentElement;
        item.classList.toggle("tm-acc-open");
        var icon = btn.querySelector(".tm-accordion-icon");
        if (icon) {
            icon.classList.toggle("tm-acc-rot");
        }
    };

    document.addEventListener("DOMContentLoaded", function () {
        var absPlayers = document.querySelectorAll(".tm-absplayer");
        absPlayers.forEach(function (box) {
            box.setAttribute("data-cur-group", "0");
            box.setAttribute("data-cur-track", "0");
            var audio = box.querySelector(".tm-abs-audio");
            if (audio && box.id) {
                audio.addEventListener("ended", function () {
                    window.tmAbsNext(box.id);
                });
            }
        });

        var hubs = document.querySelectorAll(".tm-mediahub");
        hubs.forEach(function (hub) {
            if (hub.id) {
                window.tmHubSelect(hub.id, 0);
            }
        });
    });
})();

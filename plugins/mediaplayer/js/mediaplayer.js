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
            var finalUrl = embedUrl || "";
            if (finalUrl.indexOf("youtube.com/embed/") !== -1 && finalUrl.indexOf("playsinline=") === -1) {
                finalUrl += (finalUrl.indexOf("?") === -1 ? "?" : "&") + "playsinline=1&rel=0";
            }
            drawer.style.display = "block";
            drawer.innerHTML =
                '<div class="tm-story-video-frame">' +
                '  <iframe src="' + escapeHtml(finalUrl) + '" style="width:100%; height:380px; border:none; border-radius:8px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
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

    window.tmToggleSummary = function (summaryEl) {
        if (!summaryEl) return;
        summaryEl.classList.toggle("is-expanded");
        var btn = summaryEl.querySelector(".tm-summary-toggle-btn");
        if (btn) {
            btn.textContent = summaryEl.classList.contains("is-expanded") ? "Thu gọn ▴" : "Xem thêm ▾";
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

    window.tmSwitchBuhdTab = function (uid, tabName) {
        var container = document.getElementById(uid);
        if (!container) return;
        var tabs = container.querySelectorAll(".tm-buhdview-tab");
        tabs.forEach(function (t) {
            var isTarget = t.getAttribute("data-tab") === tabName;
            t.classList.toggle("active", isTarget);
            t.setAttribute("aria-selected", isTarget ? "true" : "false");
        });
        var panes = container.querySelectorAll(".tm-buhdview-pane");
        panes.forEach(function (p) {
            var isPaneTarget = p.getAttribute("data-pane") === tabName;
            p.classList.toggle("active", isPaneTarget);
            p.style.display = isPaneTarget ? "block" : "none";
        });
    };

    var hubs = document.querySelectorAll(".tm-mediahub");
        hubs.forEach(function (hub) {
            if (hub.id) {
                window.tmHubSelect(hub.id, 0);
            }
        });

        initKpcReader();
        initKnnpReader();
    });

    /* =========================================================================
       4. KINH PHÁP CÚ SINGLE-VERSE READER & TOC ([:kpcreader:] & [:kpctoc:])
       ========================================================================= */
    var kpcMasterData = null;
    var kpcCurrentVerse = 1;
    var KPC_STORAGE_KEY = "tm_kpc_last_verse";

    function getRequestedVerse(defaultVerse) {
        try {
            var params = new URLSearchParams(window.location.search);
            var qBai = parseInt(params.get("bai") || params.get("ke") || params.get("verse") || "", 10);
            if (!isNaN(qBai) && qBai >= 1 && qBai <= 423) {
                return qBai;
            }
            var hash = window.location.hash || "";
            var hm = hash.match(/#(?:bai-|ke-|verse-)?(\d{1,3})$/i);
            if (hm) {
                var hBai = parseInt(hm[1], 10);
                if (hBai >= 1 && hBai <= 423) {
                    return hBai;
                }
            }
            var saved = parseInt(localStorage.getItem(KPC_STORAGE_KEY) || "", 10);
            if (!isNaN(saved) && saved >= 1 && saved <= 423) {
                return saved;
            }
        } catch (e) {}
        return defaultVerse || 1;
    }

    function renderKpcStoryBlocks(blocks) {
        if (!blocks || !blocks.length) return "";
        var html = "";
        for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i];
            if (!b) continue;
            if (b.type === "para" && b.text) {
                html += '<p class="tm-kpc-story-para">' + escapeHtml(b.text) + '</p>';
            } else if (b.type === "verse" && b.lines && b.lines.length) {
                html += '<blockquote class="tm-kpc-story-poem">';
                for (var l = 0; l < b.lines.length; l++) {
                    html += '<div class="tm-kpc-poem-line">' + escapeHtml(b.lines[l]) + '</div>';
                }
                html += '</blockquote>';
            } else if (b.type === "image" && b.url) {
                var storyImgCap = "Minh họa Tích truyện Kinh Pháp Cú — Bài kệ " + kpcCurrentVerse;
                html +=
                    '<figure class="tm-kpc-story-figure">' +
                    '  <div class="tm-kpc-zoomable-wrap" data-src="' + escapeHtml(b.url) + '" data-caption="' + escapeHtml(storyImgCap) + '" onclick="window.tmKpcOpenLightbox(this.getAttribute(\'data-src\'), this.getAttribute(\'data-caption\'))" role="button" tabindex="0" title="Bấm vào ảnh để mở popup xem ảnh lớn">' +
                    '    <img src="' + escapeHtml(b.url) + '" alt="' + escapeHtml(storyImgCap) + '" loading="lazy" />' +
                    '    <span class="tm-kpc-img-zoom-hint">🔍 Bấm để xem ảnh lớn</span>' +
                    '  </div>' +
                    '</figure>';
            } else if (b.type === "verse_table" && b.cells && b.cells.length) {
                html += '<div class="tm-kpc-story-vtable">';
                for (var c = 0; c < b.cells.length; c++) {
                    var cellLines = b.cells[c] || [];
                    html += '<div class="tm-kpc-story-vcell">';
                    for (var cl = 0; cl < cellLines.length; cl++) {
                        html += '<div>' + escapeHtml(cellLines[cl]) + '</div>';
                    }
                    html += '</div>';
                }
                html += '</div>';
            }
        }
        return html;
    }

    function renderKpcVerseView(vnum, updateHistory) {
        var app = document.getElementById("tm-kpc-reader");
        var stage = document.getElementById("tm-kpc-stage");
        if (!app || !stage || !kpcMasterData) return;

        vnum = parseInt(vnum, 10);
        if (isNaN(vnum) || vnum < 1) vnum = 1;
        if (vnum > 423) vnum = 423;
        kpcCurrentVerse = vnum;

        try {
            localStorage.setItem(KPC_STORAGE_KEY, String(vnum));
        } catch (e) {}

        if (updateHistory !== false && window.history && window.history.replaceState) {
            try {
                var u = new URL(window.location.href);
                u.searchParams.set("bai", String(vnum));
                window.history.replaceState({ bai: vnum }, "", u.toString());
            } catch (e) {}
        }

        // Sync selectors & buttons
        var verseSel = document.getElementById("tm-kpc-verse-select");
        if (verseSel) verseSel.value = String(vnum);

        var jumpInp = document.getElementById("tm-kpc-jump-input");
        if (jumpInp) jumpInp.value = String(vnum);

        var prevBtn = document.getElementById("tm-kpc-prev-btn");
        var nextBtn = document.getElementById("tm-kpc-next-btn");
        if (prevBtn) prevBtn.disabled = (vnum <= 1);
        if (nextBtn) nextBtn.disabled = (vnum >= 423);

        var v = kpcMasterData.verses[String(vnum)];
        if (!v) {
            stage.innerHTML = '<div class="tm-media-alert">Không tìm thấy dữ liệu bài kệ ' + vnum + '.</div>';
            return;
        }

        var phamSel = document.getElementById("tm-kpc-pham-select");
        if (phamSel) {
            var opts = phamSel.querySelectorAll("option");
            opts.forEach(function (opt) {
                var pid = parseInt(opt.getAttribute("data-pham-id") || "0", 10);
                if (pid === v.pham_id) {
                    phamSel.value = opt.value;
                }
            });
        }

        var st = (v.story_id && kpcMasterData.stories) ? kpcMasterData.stories[v.story_id] : null;
        var paliLines = v.pali_lines || [];
        var vnLines = v.vn_lines || [];
        var verseImg = v.verse_img || v.story_img || "";
        var yt = v.youtube || null;
        var storyVerses = v.story_verses || [vnum];

        // Sibling verses pill bar when a story covers multiple verses (e.g. 3-4 or 183-185)
        var siblingHtml = "";
        if (storyVerses.length > 1) {
            siblingHtml = '<div class="tm-kpc-sibling-bar"><span class="tm-kpc-sibling-lbl">🔗 Cụm bài kệ cùng tích truyện:</span>';
            storyVerses.forEach(function (sv) {
                var act = (sv === vnum) ? " active" : "";
                siblingHtml += '<button type="button" class="tm-kpc-sibling-pill' + act + '" onclick="window.tmKpcGoTo(' + sv + ')">Bài kệ ' + sv + '</button>';
            });
            siblingHtml += '</div>';
        }

        var paliHtml = "";
        for (var p = 0; p < paliLines.length; p++) {
            paliHtml += '<div class="tm-kpc-line">' + escapeHtml(paliLines[p]) + '</div>';
        }
        var vnHtml = "";
        for (var j = 0; j < vnLines.length; j++) {
            vnHtml += '<div class="tm-kpc-line">' + escapeHtml(vnLines[j]) + '</div>';
        }

        // Media grid (Illustration image from loiphatday.org + YouTube Short from @PhapGiacTam)
        var mediaHtml = '<div class="tm-kpc-media-grid' + (yt ? ' has-both' : ' single-img') + '">';
        if (verseImg) {
            var vCap = "Tranh minh họa Kinh Pháp Cú — Bài kệ " + vnum + (st && st.story_name ? (" (" + st.story_name + ")") : "");
            mediaHtml +=
                '<div class="tm-kpc-media-card tm-kpc-img-card">' +
                '  <div class="tm-kpc-media-head">' +
                '    <span>🖼️ Tranh Minh Họa Bài Kệ ' + vnum + '</span>' +
                '    <button type="button" class="tm-kpc-head-action" data-src="' + escapeHtml(verseImg) + '" data-caption="' + escapeHtml(vCap) + '" onclick="window.tmKpcOpenLightbox(this.getAttribute(\'data-src\'), this.getAttribute(\'data-caption\'))">🔍 Phóng to</button>' +
                '  </div>' +
                '  <div class="tm-kpc-img-wrap tm-kpc-zoomable-wrap" data-src="' + escapeHtml(verseImg) + '" data-caption="' + escapeHtml(vCap) + '" onclick="window.tmKpcOpenLightbox(this.getAttribute(\'data-src\'), this.getAttribute(\'data-caption\'))" role="button" tabindex="0" title="Bấm vào ảnh để mở popup xem ảnh lớn">' +
                '    <img src="' + escapeHtml(verseImg) + '" alt="' + escapeHtml(vCap) + '" loading="eager" />' +
                '    <span class="tm-kpc-img-zoom-hint">🔍 Bấm vào ảnh để mở xem cỡ lớn</span>' +
                '  </div>' +
                '</div>';
        }
        if (yt && yt.video_id) {
            var embedUrl = "https://www.youtube.com/embed/" + encodeURIComponent(yt.video_id) + "?playsinline=1&rel=0";
            var watchUrl = yt.shorts_url || yt.video_url || ("https://www.youtube.com/shorts/" + encodeURIComponent(yt.video_id));
            mediaHtml +=
                '<div class="tm-kpc-media-card tm-kpc-yt-card">' +
                '  <div class="tm-kpc-media-head">' +
                '    <span>🎬 Video 30s Hiểu Kinh Pháp Cú (Câu ' + vnum + ')</span>' +
                '    <a href="' + escapeHtml(watchUrl) + '" target="_blank" rel="noopener noreferrer" class="tm-kpc-yt-ext">↗ Mở YouTube</a>' +
                '  </div>' +
                '  <div class="tm-kpc-yt-topic">' + escapeHtml(yt.title || "") + '</div>' +
                '  <div class="tm-kpc-yt-frame-wrap">' +
                '    <iframe src="' + embedUrl + '" title="' + escapeHtml(yt.title || ("Kinh Pháp Cú Câu " + vnum)) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
                '  </div>' +
                '</div>';
        }
        mediaHtml += '</div>';

        // Story Section (luồng đọc liền mạch từ Bài Kệ xuống Tích Truyện của Bài Kệ)
        var storyHtml = "";
        if (st) {
            var tagsHtml = "";
            if (st.tags && st.tags.length) {
                tagsHtml = '<div class="tm-kpc-story-tags"><span class="tm-kpc-tag-lbl">🏷️ Chủ đề:</span>';
                st.tags.forEach(function (tg) {
                    tagsHtml += '<span class="tm-kpc-tag">' + escapeHtml(tg) + '</span>';
                });
                tagsHtml += '</div>';
            }

            storyHtml =
                '<div class="tm-kpc-flow-bridge">' +
                '  <a href="#tm-kpc-story-anchor" class="tm-kpc-flow-btn" onclick="var el=document.getElementById(\'tm-kpc-story-anchor\');if(el){event.preventDefault();el.scrollIntoView({behavior:\'smooth\',block:\'start\'});}">' +
                '    <span>📖 Đọc tiếp theo luồng: <strong>Tích Truyện Của Bài Kệ ' + vnum + ' (' + escapeHtml(st.story_name || st.title) + ')</strong></span>' +
                '    <span class="tm-kpc-flow-down">↓</span>' +
                '  </a>' +
                '</div>' +
                '<section class="tm-kpc-story-section" id="tm-kpc-story-anchor">' +
                '  <div class="tm-kpc-story-header">' +
                '    <span class="tm-kpc-story-eyebrow">☸ DUYÊN KHỞI &amp; TÍCH TRUYỆN KINH PHÁP CÚ</span>' +
                '    <h2 class="tm-kpc-story-title">' + escapeHtml(st.title) + '</h2>' +
                '    ' + siblingHtml +
                '  </div>' +
                '  <div class="tm-kpc-story-body">' +
                '    ' + renderKpcStoryBlocks(st.blocks) +
                '  </div>' +
                '  ' + tagsHtml +
                '  <div class="tm-kpc-story-footer-nav">' +
                '    <button type="button" class="tm-kpc-foot-btn" onclick="window.tmKpcStep(-1)" ' + (vnum <= 1 ? 'disabled' : '') + '>⏮ Bài kệ trước (' + (vnum > 1 ? (vnum - 1) : 1) + ')</button>' +
                '    <button type="button" class="tm-kpc-foot-btn tm-kpc-foot-top" onclick="var r=document.getElementById(\'tm-kpc-reader\');if(r)r.scrollIntoView({behavior:\'smooth\'});">↑ Lên đầu bài kệ ' + vnum + '</button>' +
                '    <button type="button" class="tm-kpc-foot-btn tm-kpc-foot-share" onclick="window.tmKpcOpenShareModal()">🔗 Chia sẻ bài kệ ' + vnum + '</button>' +
                '    <button type="button" class="tm-kpc-foot-btn tm-kpc-foot-next" onclick="window.tmKpcStep(1)" ' + (vnum >= 423 ? 'disabled' : '') + '>Bài kệ tiếp (' + (vnum < 423 ? (vnum + 1) : 423) + ') ⏭</button>' +
                '  </div>' +
                '</section>';
        }

        stage.innerHTML =
            '<article class="tm-kpc-verse-card">' +
            '  <header class="tm-kpc-verse-header">' +
            '    <div class="tm-kpc-pham-badge">Phẩm ' + (v.pham_id < 10 ? "0" + v.pham_id : v.pham_id) + ' • ' + escapeHtml(v.pham_name) + ' (' + escapeHtml(v.pham_pali) + ')</div>' +
            '    <div class="tm-kpc-verse-header-right">' +
            '      <div class="tm-kpc-verse-num-badge">Bài kệ <strong>' + vnum + '</strong> / 423</div>' +
            '      <button type="button" class="tm-kpc-share-btn" onclick="window.tmKpcOpenShareModal()" title="Chia sẻ bài kệ Kinh Pháp Cú số ' + vnum + '">🔗 Chia sẻ bài kệ</button>' +
            '    </div>' +
            '  </header>' +
            '  <h2 class="tm-kpc-verse-heading">Kệ Pháp Cú Số ' + vnum + (st && st.story_name ? (' — ' + escapeHtml(st.story_name)) : '') + '</h2>' +
            '  ' + siblingHtml +
            '  <div class="tm-kpc-bilingual-box">' +
            '    <div class="tm-kpc-lang-col tm-kpc-pali-col">' +
            '      <div class="tm-kpc-lang-label">📜 Nguyên tác Pāli</div>' +
            '      <div class="tm-kpc-lang-lines">' + paliHtml + '</div>' +
            '    </div>' +
            '    <div class="tm-kpc-lang-col tm-kpc-vn-col">' +
            '      <div class="tm-kpc-lang-label">🪷 Việt dịch (HT. Thích Minh Châu)</div>' +
            '      <div class="tm-kpc-lang-lines">' + vnHtml + '</div>' +
            '    </div>' +
            '  </div>' +
            '  ' + mediaHtml +
            '</article>' +
            storyHtml;
    }

    window.tmKpcGoTo = function (vnum, scrollReader) {
        renderKpcVerseView(vnum, true);
        if (scrollReader !== false) {
            var app = document.getElementById("tm-kpc-reader");
            if (app) {
                app.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }
    };

    window.tmKpcStep = function (delta) {
        var target = kpcCurrentVerse + delta;
        if (target < 1 || target > 423) return;
        window.tmKpcGoTo(target, true);
    };

    window.tmKpcJumpInput = function () {
        var inp = document.getElementById("tm-kpc-jump-input");
        if (!inp) return;
        var val = parseInt(inp.value, 10);
        if (!isNaN(val) && val >= 1 && val <= 423) {
            window.tmKpcGoTo(val, true);
        }
    };

    window.tmKpcFilterPham = function (phamId, btnEl) {
        var pills = document.querySelectorAll("#tm-kpc-filter-pills .tm-kpc-filter-pill");
        pills.forEach(function (p) {
            p.classList.toggle("active", p === btnEl);
        });
        var secs = document.querySelectorAll("#tm-kpc-toc-sections .tm-kpc-toc-section");
        secs.forEach(function (sec) {
            var spid = sec.getAttribute("data-pham-section");
            sec.style.display = (phamId === "all" || spid === String(phamId)) ? "block" : "none";
        });
    };

    window.tmKpcFilterToc = function (query) {
        var q = (query || "").trim().toLowerCase();
        var secs = document.querySelectorAll("#tm-kpc-toc-sections .tm-kpc-toc-section");
        secs.forEach(function (sec) {
            var items = sec.querySelectorAll(".tm-kpc-toc-item");
            var visibleCount = 0;
            items.forEach(function (it) {
                var txt = it.getAttribute("data-search") || "";
                var vnum = it.getAttribute("data-verse") || "";
                var match = !q || txt.indexOf(q) !== -1 || vnum === q;
                it.style.display = match ? "flex" : "none";
                if (match) visibleCount++;
            });
            sec.style.display = visibleCount > 0 ? "block" : "none";
        });
    };

    window.tmKpcTocGoNum = function () {
        var app = document.getElementById("tm-kpc-toc-app");
        var inp = document.getElementById("tm-kpc-toc-num");
        if (!app || !inp) return;
        var v = parseInt(inp.value, 10);
        if (!isNaN(v) && v >= 1 && v <= 423) {
            var readerUrl = app.getAttribute("data-reader-url") || "/phat-giao/kinh-phap-cu/doc-kinh-phap-cu";
            window.location.href = readerUrl + "?bai=" + v;
        }
    };

    /* =========================================================================
       5. IMAGE LIGHTBOX POPUP (Xem ảnh lớn & Đóng về lại trang)
       ========================================================================= */
    function ensureKpcLightbox() {
        var box = document.getElementById("tm-kpc-lightbox");
        if (box) return box;

        box = document.createElement("div");
        box.id = "tm-kpc-lightbox";
        box.className = "tm-kpc-lightbox";
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        box.style.display = "none";
        box.innerHTML =
            '<div class="tm-kpc-lb-backdrop" onclick="window.tmKpcCloseLightbox()"></div>' +
            '<div class="tm-kpc-lb-container" onclick="if(event.target===this)window.tmKpcCloseLightbox()">' +
            '  <div class="tm-kpc-lb-topbar">' +
            '    <div class="tm-kpc-lb-caption" id="tm-kpc-lb-caption">Tranh minh họa Kinh Pháp Cú</div>' +
            '    <div class="tm-kpc-lb-actions">' +
            '      <button type="button" class="tm-kpc-lb-btn" id="tm-kpc-lb-zoom-btn" onclick="window.tmKpcToggleLightboxZoom()">🔍 Phóng to (+)</button>' +
            '      <button type="button" class="tm-kpc-lb-btn tm-kpc-lb-close" onclick="window.tmKpcCloseLightbox()" title="Đóng ảnh (Esc)">✕ Đóng</button>' +
            '    </div>' +
            '  </div>' +
            '  <div class="tm-kpc-lb-stage" id="tm-kpc-lb-stage" onclick="if(event.target===this)window.tmKpcCloseLightbox()">' +
            '    <img id="tm-kpc-lb-img" class="tm-kpc-lb-img" src="" alt="Ảnh phóng to" onclick="event.stopPropagation();window.tmKpcToggleLightboxZoom();" />' +
            '  </div>' +
            '  <div class="tm-kpc-lb-bottombar">' +
            '    <span class="tm-kpc-lb-hint">💡 Chạm vào ảnh để phóng to / thu nhỏ • Bấm Đóng để quay lại trang đọc</span>' +
            '    <button type="button" class="tm-kpc-lb-btn tm-kpc-lb-close-bottom" onclick="window.tmKpcCloseLightbox()">✕ Đóng &amp; Quay lại bài kệ</button>' +
            '  </div>' +
            '</div>';
        document.body.appendChild(box);
        return box;
    }

    window.tmKpcOpenLightbox = function (src, caption) {
        if (!src) return;
        var box = ensureKpcLightbox();
        var img = document.getElementById("tm-kpc-lb-img");
        var cap = document.getElementById("tm-kpc-lb-caption");
        var zoomBtn = document.getElementById("tm-kpc-lb-zoom-btn");
        var stage = document.getElementById("tm-kpc-lb-stage");

        if (img) {
            img.src = src;
            img.alt = caption || "Tranh minh họa Kinh Pháp Cú";
            img.classList.remove("is-zoomed");
        }
        if (stage) {
            stage.classList.remove("is-zoomed");
        }
        if (cap) {
            cap.textContent = caption || "Tranh minh họa Kinh Pháp Cú";
        }
        if (zoomBtn) {
            zoomBtn.textContent = "🔍 Phóng to (+)";
        }
        box.style.display = "flex";
        document.body.classList.add("tm-kpc-modal-open");
    };

    window.tmKpcToggleLightboxZoom = function () {
        var img = document.getElementById("tm-kpc-lb-img");
        var stage = document.getElementById("tm-kpc-lb-stage");
        var zoomBtn = document.getElementById("tm-kpc-lb-zoom-btn");
        if (!img) return;
        var zoomed = img.classList.toggle("is-zoomed");
        if (stage) {
            stage.classList.toggle("is-zoomed", zoomed);
        }
        if (zoomBtn) {
            zoomBtn.textContent = zoomed ? "🔎 Thu vừa màn hình (-)" : "🔍 Phóng to (+)";
        }
    };

    window.tmKpcCloseLightbox = function () {
        var box = document.getElementById("tm-kpc-lightbox");
        if (box) {
            box.style.display = "none";
        }
        document.body.classList.remove("tm-kpc-modal-open");
    };

    /* =========================================================================
       6. SHARE KINH PHÁP CÚ VERSE MODAL (Chia sẻ bài kệ Pháp Cú)
       ========================================================================= */
    function getKpcSharePayload() {
        var vnum = kpcCurrentVerse || 1;
        var v = (kpcMasterData && kpcMasterData.verses) ? kpcMasterData.verses[String(vnum)] : null;
        var st = (v && v.story_id && kpcMasterData.stories) ? kpcMasterData.stories[v.story_id] : null;

        var u;
        try {
            u = new URL(window.location.href);
            u.searchParams.set("bai", String(vnum));
            u.hash = "";
        } catch (e) {
            u = { toString: function () { return window.location.href; } };
        }
        var shareUrl = u.toString();

        var phamTitle = v ? ("Phẩm " + (v.pham_id < 10 ? "0" + v.pham_id : v.pham_id) + ": " + v.pham_name) : "Kinh Pháp Cú";
        var storyTitle = (st && (st.story_name || st.title)) ? (st.story_name || st.title) : "";
        var vnText = (v && v.vn_lines && v.vn_lines.length) ? v.vn_lines.join("\n") : "";
        var paliText = (v && v.pali_lines && v.pali_lines.length) ? v.pali_lines.join("\n") : "";

        var title = "Kinh Pháp Cú - Bài kệ " + vnum + (storyTitle ? (" (" + storyTitle + ")") : "");
        var fullText =
            "🪷 KINH PHÁP CÚ — BÀI KỆ " + vnum + " (" + phamTitle + ")\n\n" +
            (vnText ? (vnText + "\n\n") : "") +
            (paliText ? ("📜 Pāli:\n" + paliText + "\n\n") : "") +
            (storyTitle ? ("📖 Tích truyện: " + storyTitle + "\n") : "") +
            "🔗 Đọc bài kệ & tích truyện tại: " + shareUrl;

        return {
            vnum: vnum,
            title: title,
            phamTitle: phamTitle,
            storyTitle: storyTitle,
            vnText: vnText,
            paliText: paliText,
            url: shareUrl,
            fullText: fullText
        };
    }

    function ensureKpcShareModal() {
        var modal = document.getElementById("tm-kpc-share-modal");
        if (modal) return modal;

        modal = document.createElement("div");
        modal.id = "tm-kpc-share-modal";
        modal.className = "tm-kpc-share-modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.style.display = "none";
        modal.innerHTML =
            '<div class="tm-kpc-lb-backdrop" onclick="window.tmKpcCloseShareModal()"></div>' +
            '<div class="tm-kpc-share-dialog">' +
            '  <div class="tm-kpc-share-head">' +
            '    <div class="tm-kpc-share-title" id="tm-kpc-share-title">🔗 Chia sẻ Bài Kệ Kinh Pháp Cú</div>' +
            '    <button type="button" class="tm-kpc-share-close" onclick="window.tmKpcCloseShareModal()" title="Đóng cửa sổ chia sẻ (Esc)">✕ Đóng</button>' +
            '  </div>' +
            '  <div class="tm-kpc-share-body">' +
            '    <div class="tm-kpc-share-preview" id="tm-kpc-share-preview"></div>' +
            '    <div class="tm-kpc-share-url-row">' +
            '      <input type="text" id="tm-kpc-share-url-input" class="tm-kpc-share-url-input" readonly onclick="this.select();" />' +
            '      <button type="button" class="tm-kpc-share-copy-url" onclick="window.tmKpcCopyShare(\'link\')">🔗 Chép Link</button>' +
            '    </div>' +
            '    <div class="tm-kpc-share-toast" id="tm-kpc-share-toast" style="display:none;"></div>' +
            '    <div class="tm-kpc-share-grid">' +
            '      <button type="button" class="tm-kpc-share-opt tm-kpc-share-opt-primary" onclick="window.tmKpcCopyShare(\'full\')">' +
            '        <span>📋</span> <div><strong>Sao chép Nội dung + Liên kết</strong><small>Dán ngay vào Zalo, Messenger, Ghi chú...</small></div>' +
            '      </button>' +
            '      <button type="button" class="tm-kpc-share-opt tm-kpc-share-opt-native" id="tm-kpc-share-native-btn" onclick="window.tmKpcNativeShare()">' +
            '        <span>📱</span> <div><strong>Chia sẻ nhanh qua ứng dụng...</strong><small>Mở menu chia sẻ của điện thoại / trình duyệt</small></div>' +
            '      </button>' +
            '    </div>' +
            '    <div class="tm-kpc-share-social-row">' +
            '      <a id="tm-kpc-share-fb" href="#" target="_blank" rel="noopener noreferrer" class="tm-kpc-social-btn tm-kpc-social-fb">📘 Chia sẻ Facebook</a>' +
            '      <a id="tm-kpc-share-tg" href="#" target="_blank" rel="noopener noreferrer" class="tm-kpc-social-btn tm-kpc-social-tg">✈️ Telegram</a>' +
            '      <a id="tm-kpc-share-mail" href="#" class="tm-kpc-social-btn tm-kpc-social-mail">✉️ Gửi Email</a>' +
            '    </div>' +
            '    <div class="tm-kpc-share-footer">' +
            '      <button type="button" class="tm-kpc-share-close-bottom" onclick="window.tmKpcCloseShareModal()">✕ Đóng cửa sổ chia sẻ</button>' +
            '    </div>' +
            '  </div>' +
            '</div>';
        document.body.appendChild(modal);
        return modal;
    }

    window.tmKpcOpenShareModal = function () {
        var modal = ensureKpcShareModal();
        var p = getKpcSharePayload();

        var titleEl = document.getElementById("tm-kpc-share-title");
        if (titleEl) {
            titleEl.textContent = "🔗 Chia sẻ Bài Kệ " + p.vnum + " — Kinh Pháp Cú";
        }

        var prevEl = document.getElementById("tm-kpc-share-preview");
        if (prevEl) {
            prevEl.innerHTML =
                '<div class="tm-kpc-sp-badge">' + escapeHtml(p.phamTitle) + ' • Bài kệ ' + p.vnum + '</div>' +
                '<div class="tm-kpc-sp-verse">' + escapeHtml(p.vnText).replace(/\n/g, "<br/>") + '</div>' +
                (p.storyTitle ? ('<div class="tm-kpc-sp-story">📖 Tích truyện: <strong>' + escapeHtml(p.storyTitle) + '</strong></div>') : '');
            prevEl.scrollTop = 0;
        }

        var urlInp = document.getElementById("tm-kpc-share-url-input");
        if (urlInp) {
            urlInp.value = p.url;
        }

        var toast = document.getElementById("tm-kpc-share-toast");
        if (toast) {
            toast.style.display = "none";
        }

        var fbBtn = document.getElementById("tm-kpc-share-fb");
        if (fbBtn) {
            fbBtn.href = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(p.url) + "&quote=" + encodeURIComponent(p.fullText);
        }
        var tgBtn = document.getElementById("tm-kpc-share-tg");
        if (tgBtn) {
            tgBtn.href = "https://t.me/share/url?url=" + encodeURIComponent(p.url) + "&text=" + encodeURIComponent(p.fullText);
        }
        var mailBtn = document.getElementById("tm-kpc-share-mail");
        if (mailBtn) {
            mailBtn.href = "mailto:?subject=" + encodeURIComponent(p.title) + "&body=" + encodeURIComponent(p.fullText);
        }

        var copyLinkBtn = modal.querySelector(".tm-kpc-share-copy-url");
        if (copyLinkBtn) {
            copyLinkBtn.onclick = function () { window.tmKpcCopyShare("link"); };
        }
        var copyFullBtn = modal.querySelector(".tm-kpc-share-opt-primary");
        if (copyFullBtn) {
            copyFullBtn.onclick = function () { window.tmKpcCopyShare("full"); };
        }
        var nativeBtn = document.getElementById("tm-kpc-share-native-btn");
        if (nativeBtn) {
            nativeBtn.onclick = function () { window.tmKpcNativeShare(); };
        }

        modal.style.display = "flex";
        document.body.classList.add("tm-kpc-modal-open");
    };

    window.tmKpcCloseShareModal = function () {
        var modal = document.getElementById("tm-kpc-share-modal");
        if (modal) {
            modal.style.display = "none";
        }
        document.body.classList.remove("tm-kpc-modal-open");
    };

    function showKpcShareToast(msg) {
        var toast = document.getElementById("tm-kpc-share-toast");
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = "block";
    }

    function copyTextToClipboard(text, onDone) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                if (onDone) onDone(true);
            }).catch(function () {
                fallbackCopyText(text, onDone);
            });
        } else {
            fallbackCopyText(text, onDone);
        }
    }

    function fallbackCopyText(text, onDone) {
        try {
            var ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            if (onDone) onDone(true);
        } catch (e) {
            if (onDone) onDone(false);
        }
    }

    window.tmKpcCopyShare = function (mode) {
        var p = getKpcSharePayload();
        var textToCopy = (mode === "link") ? p.url : p.fullText;
        copyTextToClipboard(textToCopy, function (ok) {
            if (ok) {
                showKpcShareToast(mode === "link"
                    ? ("✓ Đã sao chép đường dẫn Bài kệ " + p.vnum + " vào bộ nhớ tạm!")
                    : ("✓ Đã sao chép trọn vẹn Lời kệ " + p.vnum + " & liên kết! Bạn có thể dán (Paste) ngay."));
            } else {
                showKpcShareToast("⚠️ Trình duyệt chặn tự động chép. Hãy bôi đen ô liên kết phía trên để chép.");
            }
        });
    };

    window.tmKpcNativeShare = function () {
        var p = getKpcSharePayload();
        if (navigator.share) {
            navigator.share({
                title: p.title,
                text: p.fullText,
                url: p.url
            }).catch(function () {});
        } else {
            window.tmKpcCopyShare("full");
        }
    };

    function initKpcReader() {
        var app = document.getElementById("tm-kpc-reader");
        if (!app) return;

        var jsonUrl = app.getAttribute("data-json-url");
        var initVerse = parseInt(app.getAttribute("data-init-verse") || "1", 10);
        var targetVerse = getRequestedVerse(initVerse);

        fetch(jsonUrl)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                kpcMasterData = data;
                renderKpcVerseView(targetVerse, false);
            })
            .catch(function (err) {
                var stage = document.getElementById("tm-kpc-stage");
                if (stage) {
                    stage.innerHTML = '<div class="tm-media-alert">Không thể tải dữ liệu Kinh Pháp Cú: ' + escapeHtml(String(err)) + '</div>';
                }
            });

        window.addEventListener("popstate", function () {
            if (kpcMasterData) {
                var v = getRequestedVerse(1);
                renderKpcVerseView(v, false);
            }
        });

        // Keyboard left/right arrow & Escape support
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                window.tmKpcCloseLightbox();
                window.tmKpcCloseShareModal();
                return;
            }
            if (!kpcMasterData) return;
            var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : "";
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) {
                return;
            }
            var lb = document.getElementById("tm-kpc-lightbox");
            var sm = document.getElementById("tm-kpc-share-modal");
            if ((lb && lb.style.display !== "none") || (sm && sm.style.display !== "none")) {
                return;
            }
            if (e.key === "ArrowLeft") {
                window.tmKpcStep(-1);
            } else if (e.key === "ArrowRight") {
                window.tmKpcStep(1);
            }
        });
    }

    /* =========================================================================
       7. KHUYÊN NGƯỜI NIỆM PHẬT LETTER READER & TOC ([:knnpreader:] & [:knnptoc:])
       ========================================================================= */
    var knnpMasterData = null;
    var knnpCurrentLetter = 1;
    var knnpCurrentAudioIdx = 0;
    var KNNP_STORAGE_KEY = "tm_knnp_last_letter";

    function formatDurationSec(sec) {
        sec = parseInt(sec || 0, 10);
        if (!sec || sec <= 0) return "";
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
    }

    function getRequestedKnnpLetter(defaultLetter) {
        try {
            var params = new URLSearchParams(window.location.search);
            var qThu = parseInt(params.get("thu") || params.get("bai") || params.get("letter") || "", 10);
            if (!isNaN(qThu) && qThu >= 1 && qThu <= 74) {
                return qThu;
            }
            var qTrack = parseInt(params.get("track") || "", 10);
            if (!isNaN(qTrack) && knnpMasterData && knnpMasterData.track_to_letter && knnpMasterData.track_to_letter[String(qTrack)]) {
                return parseInt(knnpMasterData.track_to_letter[String(qTrack)], 10);
            }
            var hash = window.location.hash || "";
            var hm = hash.match(/#(?:thu-|bai-|letter-)?(\d{1,2})$/i);
            if (hm) {
                var hThu = parseInt(hm[1], 10);
                if (hThu >= 1 && hThu <= 74) {
                    return hThu;
                }
            }
            var saved = parseInt(localStorage.getItem(KNNP_STORAGE_KEY) || "", 10);
            if (!isNaN(saved) && saved >= 1 && saved <= 74) {
                return saved;
            }
        } catch (e) {}
        return defaultLetter || 1;
    }

    function renderKnnpParas(paras) {
        if (!paras || !paras.length) return "";
        var html = "";
        for (var i = 0; i < paras.length; i++) {
            var p = paras[i];
            if (!p) continue;
            // Check if paragraph is a greeting/salutation or subheading
            var isSalutation = (i === 0 && p.length < 95 && (/[,!]$/.test(p) || /^(Kính |Cha má|Em |Chị |Cháu |Đạo hữu|Gởi |Thư )/i.test(p)));
            var isSubhead = (p.length < 90 && /^(\(\s*[IVX]+\s*\)|\d+\s*\)|\d+\s*-\s*|Lời |Thay lời|Phát Nguyện|Văn Hồi Hướng|Mấy Dòng|Cảnh thứ )/i.test(p));
            if (isSalutation) {
                html += '<p class="tm-knnp-salutation">' + escapeHtml(p) + '</p>';
            } else if (isSubhead) {
                html += '<h3 class="tm-knnp-subhead">' + escapeHtml(p) + '</h3>';
            } else if (p.indexOf("\n") !== -1) {
                var lines = p.split("\n");
                html += '<blockquote class="tm-kpc-story-poem">';
                for (var l = 0; l < lines.length; l++) {
                    html += '<div class="tm-kpc-poem-line">' + escapeHtml(lines[l]) + '</div>';
                }
                html += '</blockquote>';
            } else {
                html += '<p class="tm-kpc-story-para tm-knnp-para">' + escapeHtml(p) + '</p>';
            }
        }
        return html;
    }

    function renderKnnpLetterView(lnum, updateHistory) {
        var app = document.getElementById("tm-knnp-reader");
        var stage = document.getElementById("tm-knnp-stage");
        if (!app || !stage || !knnpMasterData) return;

        lnum = parseInt(lnum, 10);
        if (isNaN(lnum) || lnum < 1) lnum = 1;
        if (lnum > 74) lnum = 74;
        knnpCurrentLetter = lnum;
        knnpCurrentAudioIdx = 0;

        try {
            localStorage.setItem(KNNP_STORAGE_KEY, String(lnum));
        } catch (e) {}

        if (updateHistory !== false && window.history && window.history.replaceState) {
            try {
                var u = new URL(window.location.href);
                u.searchParams.set("thu", String(lnum));
                u.searchParams.delete("bai");
                window.history.replaceState({ thu: lnum }, "", u.toString());
            } catch (e) {}
        }

        var letterSel = document.getElementById("tm-knnp-letter-select");
        if (letterSel) letterSel.value = String(lnum);

        var jumpInp = document.getElementById("tm-knnp-jump-input");
        if (jumpInp) jumpInp.value = String(lnum);

        var prevBtn = document.getElementById("tm-knnp-prev-btn");
        var nextBtn = document.getElementById("tm-knnp-next-btn");
        if (prevBtn) prevBtn.disabled = (lnum <= 1);
        if (nextBtn) nextBtn.disabled = (lnum >= 74);

        var lt = knnpMasterData.letters[String(lnum)];
        if (!lt) {
            stage.innerHTML = '<div class="tm-media-alert">Không tìm thấy nội dung Lá thư số ' + lnum + '.</div>';
            return;
        }

        var tapSel = document.getElementById("tm-knnp-tap-select");
        if (tapSel) {
            var opts = tapSel.querySelectorAll("option");
            opts.forEach(function (opt) {
                var tid = parseInt(opt.getAttribute("data-tap-id") || "0", 10);
                if (tid === lt.tap) {
                    tapSel.value = opt.value;
                }
            });
        }

        var tapObj = null;
        if (knnpMasterData.taps) {
            for (var t = 0; t < knnpMasterData.taps.length; t++) {
                if (knnpMasterData.taps[t].id === lt.tap) {
                    tapObj = knnpMasterData.taps[t];
                    break;
                }
            }
        }
        var tapName = tapObj ? tapObj.name : ("Tập " + lt.tap);
        var tapUrl = tapObj ? tapObj.tap_url : "/phat-giao/khuyen-nguoi-niem-phat";
        var pdfUrl = tapObj ? tapObj.pdf_url : "";
        var lnumPad = lnum < 10 ? ("0" + lnum) : String(lnum);

        // Build Audio & Video Media Box
        var audios = lt.audios || [];
        var videos = lt.videos || [];
        var mediaHtml = "";
        if (audios.length > 0 || videos.length > 0) {
            mediaHtml += '<div class="tm-knnp-media-bar">';
            if (audios.length > 0) {
                var firstAud = audios[0];
                var durTxt = formatDurationSec(firstAud.duration);
                var partPills = "";
                if (audios.length > 1) {
                    partPills = '<div class="tm-knnp-audio-parts">';
                    for (var a = 0; a < audios.length; a++) {
                        var actCls = (a === 0) ? " active" : "";
                        var pDur = formatDurationSec(audios[a].duration);
                        partPills +=
                            '<button type="button" class="tm-knnp-part-btn' + actCls + '" data-part-idx="' + a + '" onclick="window.tmKnnpSelectAudioPart(' + a + ')">' +
                            '🎧 Phần ' + (a + 1) + ': ' + escapeHtml(audios[a].title) + (pDur ? (' (' + pDur + ')') : '') +
                            '</button>';
                    }
                    partPills += '</div>';
                }
                mediaHtml +=
                    '<div class="tm-knnp-audio-card">' +
                    '  <div class="tm-knnp-audio-top">' +
                    '    <div class="tm-knnp-audio-label">' +
                    '      <span class="tm-knnp-audio-icon">🎧</span>' +
                    '      <div>' +
                    '        <div class="tm-knnp-audio-title" id="tm-knnp-audio-title">Pháp Âm MP3: ' + escapeHtml(firstAud.title) + (durTxt ? (' (' + durTxt + ')') : '') + '</div>' +
                    '        <div class="tm-knnp-audio-sub">Giọng đọc Pháp Âm • Khuyên Người Niệm Phật Tập ' + lt.tap + '</div>' +
                    '      </div>' +
                    '    </div>' +
                    '    <div class="tm-knnp-audio-actions">' +
                    '      <label class="tm-knnp-speed-lbl">Tốc độ:' +
                    '        <select class="tm-knnp-speed-sel" onchange="window.tmKnnpSetAudioSpeed(this.value)">' +
                    '          <option value="0.85">0.85x</option>' +
                    '          <option value="1" selected>1.0x</option>' +
                    '          <option value="1.15">1.15x</option>' +
                    '          <option value="1.25">1.25x</option>' +
                    '          <option value="1.5">1.5x</option>' +
                    '        </select>' +
                    '      </label>' +
                    '      <a id="tm-knnp-audio-dl" href="' + escapeHtml(firstAud.audio_src) + '" download target="_blank" rel="noopener noreferrer" class="tm-knnp-dl-btn" title="Tải file MP3 về máy">💾 Tải MP3</a>' +
                    (videos.length > 0
                        ? '<button type="button" class="tm-knnp-vid-toggle-btn" onclick="window.tmKnnpToggleVideo()">🎬 Xem Video YouTube</button>'
                        : '') +
                    '    </div>' +
                    '  </div>' +
                    partPills +
                    '  <audio id="tm-knnp-audio-el" class="tm-knnp-audio-el" controls preload="metadata" src="' + escapeHtml(firstAud.audio_src) + '"></audio>' +
                    '</div>';
            }
            if (videos.length > 0) {
                var v0 = videos[0];
                var vEmbed = v0.video_id ? ("https://www.youtube.com/embed/" + encodeURIComponent(v0.video_id) + "?rel=0") : "";
                mediaHtml +=
                    '<div class="tm-knnp-video-drawer" id="tm-knnp-video-drawer" style="display:none;" data-embed-url="' + escapeHtml(vEmbed) + '">' +
                    '  <div class="tm-kpc-media-head">' +
                    '    <span>🎬 Video YouTube — Lá thư số ' + lnumPad + ': ' + escapeHtml(lt.title) + '</span>' +
                    '    <a href="' + escapeHtml(v0.video_url) + '" target="_blank" rel="noopener noreferrer" class="tm-kpc-yt-ext">↗ Mở YouTube</a>' +
                    '  </div>' +
                    '  <div class="tm-knnp-video-frame-box" id="tm-knnp-video-frame-box"></div>' +
                    '</div>';
            }
            mediaHtml += '</div>';
        }

        // Preface blocks (for Letter 1, 26, 49)
        var prefaceHtml = "";
        if (lt.preface_blocks && lt.preface_blocks.length > 0) {
            for (var pb = 0; pb < lt.preface_blocks.length; pb++) {
                var blk = lt.preface_blocks[pb];
                prefaceHtml +=
                    '<details class="tm-knnp-preface-box" open>' +
                    '  <summary class="tm-knnp-preface-summary">' +
                    '    <span>📜 ' + escapeHtml(blk.title) + '</span>' +
                    '    <span class="tm-knnp-preface-hint">Bấm để thu gọn / mở rộng ▾</span>' +
                    '  </summary>' +
                    '  <div class="tm-knnp-preface-body">' +
                    renderKnnpParas(blk.paras) +
                    '  </div>' +
                    '</details>';
            }
        }

        // Closing & Dharma Quote Box
        var closingHtml = "";
        if (lt.closing) {
            closingHtml = '<div class="tm-knnp-closing">✒️ ' + escapeHtml(lt.closing) + '</div>';
        }

        var quoteHtml = "";
        if (lt.quote) {
            quoteHtml =
                '<aside class="tm-knnp-quote-box" aria-label="Lời khai thị / Pháp ngữ cuối thư">' +
                '  <div class="tm-knnp-quote-label">🪷 PHÁP NGỮ &amp; LỜI KHAI THỊ CUỐI THƯ</div>' +
                '  <div class="tm-knnp-quote-text">' + escapeHtml(lt.quote).replace(/\n/g, "<br/>") + '</div>' +
                '</aside>';
        }

        stage.innerHTML =
            prefaceHtml +
            '<article class="tm-kpc-verse-card tm-knnp-letter-card">' +
            '  <header class="tm-kpc-verse-header">' +
            '    <div class="tm-kpc-pham-badge">' + escapeHtml(tapName) + '</div>' +
            '    <div class="tm-kpc-verse-header-right">' +
            '      <div class="tm-kpc-verse-num-badge">Lá thư số <strong>' + lnumPad + '</strong> / 74</div>' +
            (pdfUrl ? '<a href="' + escapeHtml(pdfUrl) + '" target="_blank" rel="noopener noreferrer" class="tm-kpc-share-btn" title="Tải sách PDF Tập ' + lt.tap + '">📄 Sách PDF Tập ' + lt.tap + '</a>' : '') +
            '      <button type="button" class="tm-kpc-share-btn" onclick="window.tmKnnpOpenShareModal()" title="Chia sẻ Lá thư số ' + lnumPad + '">🔗 Chia sẻ lá thư</button>' +
            '    </div>' +
            '  </header>' +
            '  <h2 class="tm-kpc-verse-heading tm-knnp-letter-heading">Lá Thư Số ' + lnumPad + ': ' + escapeHtml(lt.title) + '</h2>' +
            (lt.recipient ? '<div class="tm-knnp-recipient-badge">✉️ ' + escapeHtml(lt.recipient) + ' • <em>Tác giả: Cư sĩ Diệu Âm</em></div>' : '') +
            mediaHtml +
            '  <div class="tm-knnp-letter-body">' +
            renderKnnpParas(lt.paras) +
            closingHtml +
            quoteHtml +
            '  </div>' +
            '  <div class="tm-kpc-story-footer-nav">' +
            '    <button type="button" class="tm-kpc-foot-btn" onclick="window.tmKnnpStep(-1)" ' + (lnum <= 1 ? 'disabled' : '') + '>⏮ Lá thư trước (' + (lnum > 1 ? (lnum - 1) : 1) + ')</button>' +
            '    <button type="button" class="tm-kpc-foot-btn tm-kpc-foot-top" onclick="var r=document.getElementById(\'tm-knnp-reader\');if(r)r.scrollIntoView({behavior:\'smooth\'});">↑ Lên đầu lá thư ' + lnumPad + '</button>' +
            '    <a href="' + escapeHtml(tapUrl) + '" class="tm-kpc-foot-btn" style="text-decoration:none;">🎧 Playlist Tập ' + lt.tap + '</a>' +
            '    <button type="button" class="tm-kpc-foot-btn tm-kpc-foot-share" onclick="window.tmKnnpOpenShareModal()">🔗 Chia sẻ thư ' + lnumPad + '</button>' +
            '    <button type="button" class="tm-kpc-foot-btn tm-kpc-foot-next" onclick="window.tmKnnpStep(1)" ' + (lnum >= 74 ? 'disabled' : '') + '>Lá thư tiếp (' + (lnum < 74 ? (lnum + 1) : 74) + ') ⏭</button>' +
            '  </div>' +
            '</article>';

        // Attach auto-advance to part 2 if letter has 2 audio parts
        var audioEl = document.getElementById("tm-knnp-audio-el");
        if (audioEl && audios.length > 1) {
            audioEl.addEventListener("ended", function () {
                if (knnpCurrentAudioIdx + 1 < audios.length) {
                    window.tmKnnpSelectAudioPart(knnpCurrentAudioIdx + 1, true);
                }
            });
        }
    }

    window.tmKnnpSelectAudioPart = function (partIdx, autoPlay) {
        if (!knnpMasterData) return;
        var lt = knnpMasterData.letters[String(knnpCurrentLetter)];
        if (!lt || !lt.audios || !lt.audios[partIdx]) return;
        knnpCurrentAudioIdx = partIdx;
        var aud = lt.audios[partIdx];
        var durTxt = formatDurationSec(aud.duration);

        var audioEl = document.getElementById("tm-knnp-audio-el");
        var titleEl = document.getElementById("tm-knnp-audio-title");
        var dlEl = document.getElementById("tm-knnp-audio-dl");

        if (titleEl) {
            titleEl.textContent = "Pháp Âm MP3: " + aud.title + (durTxt ? (" (" + durTxt + ")") : "");
        }
        if (dlEl) {
            dlEl.href = aud.audio_src;
        }
        var btns = document.querySelectorAll(".tm-knnp-part-btn");
        btns.forEach(function (b) {
            var bidx = parseInt(b.getAttribute("data-part-idx") || "0", 10);
            b.classList.toggle("active", bidx === partIdx);
        });
        if (audioEl) {
            audioEl.src = aud.audio_src;
            if (autoPlay !== false) {
                audioEl.play().catch(function () {});
            }
        }
    };

    window.tmKnnpSetAudioSpeed = function (rate) {
        var audioEl = document.getElementById("tm-knnp-audio-el");
        var r = parseFloat(rate || "1");
        if (audioEl && !isNaN(r)) {
            audioEl.playbackRate = r;
        }
    };

    window.tmKnnpToggleVideo = function () {
        var drawer = document.getElementById("tm-knnp-video-drawer");
        var frameBox = document.getElementById("tm-knnp-video-frame-box");
        if (!drawer || !frameBox) return;
        if (drawer.style.display === "none") {
            var embedUrl = drawer.getAttribute("data-embed-url") || "";
            if (embedUrl && !frameBox.innerHTML) {
                frameBox.innerHTML =
                    '<iframe src="' + escapeHtml(embedUrl) + '" style="width:100%;aspect-ratio:16/9;border:none;border-radius:0 0 10px 10px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" loading="lazy"></iframe>';
            }
            drawer.style.display = "block";
        } else {
            drawer.style.display = "none";
            frameBox.innerHTML = "";
        }
    };

    window.tmKnnpGoTo = function (lnum, scrollReader) {
        renderKnnpLetterView(lnum, true);
        if (scrollReader !== false) {
            var app = document.getElementById("tm-knnp-reader");
            if (app) {
                app.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }
    };

    window.tmKnnpStep = function (delta) {
        var target = knnpCurrentLetter + delta;
        if (target < 1 || target > 74) return;
        window.tmKnnpGoTo(target, true);
    };

    window.tmKnnpJumpInput = function () {
        var inp = document.getElementById("tm-knnp-jump-input");
        if (!inp) return;
        var val = parseInt(inp.value, 10);
        if (!isNaN(val) && val >= 1 && val <= 74) {
            window.tmKnnpGoTo(val, true);
        }
    };

    window.tmKnnpFilterTap = function (tapId, btnEl) {
        var pills = document.querySelectorAll("#tm-knnp-filter-pills .tm-kpc-filter-pill");
        pills.forEach(function (p) {
            p.classList.toggle("active", p === btnEl);
        });
        var secs = document.querySelectorAll("#tm-knnp-toc-sections .tm-kpc-toc-section");
        secs.forEach(function (sec) {
            var stid = sec.getAttribute("data-tap-section");
            sec.style.display = (tapId === "all" || stid === String(tapId)) ? "block" : "none";
        });
    };

    window.tmKnnpFilterToc = function (query) {
        var q = (query || "").trim().toLowerCase();
        var secs = document.querySelectorAll("#tm-knnp-toc-sections .tm-kpc-toc-section");
        secs.forEach(function (sec) {
            var items = sec.querySelectorAll(".tm-kpc-toc-item");
            var visibleCount = 0;
            items.forEach(function (it) {
                var txt = it.getAttribute("data-search") || "";
                var lnum = it.getAttribute("data-letter") || "";
                var match = !q || txt.indexOf(q) !== -1 || lnum === q;
                it.style.display = match ? "flex" : "none";
                if (match) visibleCount++;
            });
            sec.style.display = visibleCount > 0 ? "block" : "none";
        });
    };

    window.tmKnnpTocGoNum = function () {
        var app = document.getElementById("tm-knnp-toc-app");
        var inp = document.getElementById("tm-knnp-toc-num");
        if (!app || !inp) return;
        var v = parseInt(inp.value, 10);
        if (!isNaN(v) && v >= 1 && v <= 74) {
            var readerUrl = app.getAttribute("data-reader-url") || "/phat-giao/khuyen-nguoi-niem-phat/doc-khuyen-nguoi-niem-phat";
            window.location.href = readerUrl + "?thu=" + v;
        }
    };

    function getKnnpSharePayload() {
        var lnum = knnpCurrentLetter || 1;
        var lt = (knnpMasterData && knnpMasterData.letters) ? knnpMasterData.letters[String(lnum)] : null;
        var lnumPad = lnum < 10 ? ("0" + lnum) : String(lnum);

        var u;
        try {
            u = new URL(window.location.href);
            u.searchParams.set("thu", String(lnum));
            u.searchParams.delete("bai");
            u.hash = "";
        } catch (e) {
            u = { toString: function () { return window.location.href; } };
        }
        var shareUrl = u.toString();

        var tapTitle = lt ? ("Khuyên Người Niệm Phật — Tập " + lt.tap) : "Khuyên Người Niệm Phật";
        var letterTitle = lt ? lt.title : ("Lá thư số " + lnumPad);
        var recipient = (lt && lt.recipient) ? lt.recipient : "Tác giả: Cư sĩ Diệu Âm";
        var previewText = (lt && lt.quote) ? lt.quote : ((lt && lt.preview) ? lt.preview : "");

        var title = "Khuyên Người Niệm Phật - Lá thư số " + lnumPad + ": " + letterTitle;
        var fullText =
            "🪷 KHUYÊN NGƯỜI NIỆM PHẬT — LÁ THƯ SỐ " + lnumPad + " (Tập " + (lt ? lt.tap : 1) + ")\n" +
            "📖 " + letterTitle + " (" + recipient + ")\n\n" +
            (previewText ? (previewText + "\n\n") : "") +
            "🔗 Đọc toàn văn & nghe MP3 tại: " + shareUrl;

        return {
            vnum: lnum,
            title: title,
            phamTitle: tapTitle,
            storyTitle: recipient,
            vnText: letterTitle + (previewText ? ("\n\n" + previewText) : ""),
            url: shareUrl,
            fullText: fullText
        };
    }

    window.tmKnnpOpenShareModal = function () {
        var modal = ensureKpcShareModal();
        var p = getKnnpSharePayload();
        var lnumPad = p.vnum < 10 ? ("0" + p.vnum) : String(p.vnum);

        var titleEl = document.getElementById("tm-kpc-share-title");
        if (titleEl) {
            titleEl.textContent = "🔗 Chia sẻ Lá Thư Số " + lnumPad + " — Khuyên Người Niệm Phật";
        }

        var prevEl = document.getElementById("tm-kpc-share-preview");
        if (prevEl) {
            prevEl.innerHTML =
                '<div class="tm-kpc-sp-badge">' + escapeHtml(p.phamTitle) + ' • Lá thư số ' + lnumPad + '</div>' +
                '<div class="tm-kpc-sp-verse">' + escapeHtml(p.vnText).replace(/\n/g, "<br/>") + '</div>' +
                (p.storyTitle ? ('<div class="tm-kpc-sp-story">✉️ <strong>' + escapeHtml(p.storyTitle) + '</strong></div>') : '');
            prevEl.scrollTop = 0;
        }

        var urlInp = document.getElementById("tm-kpc-share-url-input");
        if (urlInp) {
            urlInp.value = p.url;
        }

        var toast = document.getElementById("tm-kpc-share-toast");
        if (toast) {
            toast.style.display = "none";
        }

        var fbBtn = document.getElementById("tm-kpc-share-fb");
        if (fbBtn) {
            fbBtn.href = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(p.url) + "&quote=" + encodeURIComponent(p.fullText);
        }
        var tgBtn = document.getElementById("tm-kpc-share-tg");
        if (tgBtn) {
            tgBtn.href = "https://t.me/share/url?url=" + encodeURIComponent(p.url) + "&text=" + encodeURIComponent(p.fullText);
        }
        var mailBtn = document.getElementById("tm-kpc-share-mail");
        if (mailBtn) {
            mailBtn.href = "mailto:?subject=" + encodeURIComponent(p.title) + "&body=" + encodeURIComponent(p.fullText);
        }

        // Override copy buttons inside modal when KNNP reader is active
        var copyLinkBtn = modal.querySelector(".tm-kpc-share-copy-url");
        if (copyLinkBtn) {
            copyLinkBtn.onclick = function () {
                copyTextToClipboard(p.url, function (ok) {
                    showKpcShareToast(ok ? ("✓ Đã sao chép đường dẫn Lá thư số " + lnumPad + "!") : "⚠️ Hãy bôi đen ô liên kết để chép.");
                });
            };
        }
        var copyFullBtn = modal.querySelector(".tm-kpc-share-opt-primary");
        if (copyFullBtn) {
            copyFullBtn.onclick = function () {
                copyTextToClipboard(p.fullText, function (ok) {
                    showKpcShareToast(ok ? ("✓ Đã sao chép trích đoạn Lá thư số " + lnumPad + " & liên kết!") : "⚠️ Hãy bôi đen ô liên kết để chép.");
                });
            };
        }
        var nativeBtn = document.getElementById("tm-kpc-share-native-btn");
        if (nativeBtn) {
            nativeBtn.onclick = function () {
                if (navigator.share) {
                    navigator.share({ title: p.title, text: p.fullText, url: p.url }).catch(function () {});
                } else {
                    copyTextToClipboard(p.fullText, function () {
                        showKpcShareToast("✓ Đã sao chép trích đoạn Lá thư số " + lnumPad + " & liên kết!");
                    });
                }
            };
        }

        modal.style.display = "flex";
        document.body.classList.add("tm-kpc-modal-open");
    };

    function initKnnpReader() {
        var app = document.getElementById("tm-knnp-reader");
        if (!app) return;

        var jsonUrl = app.getAttribute("data-json-url");
        var initLetter = parseInt(app.getAttribute("data-init-letter") || "1", 10);

        fetch(jsonUrl)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                knnpMasterData = data;
                var targetLetter = getRequestedKnnpLetter(initLetter);
                renderKnnpLetterView(targetLetter, false);
            })
            .catch(function (err) {
                var stage = document.getElementById("tm-knnp-stage");
                if (stage) {
                    stage.innerHTML = '<div class="tm-media-alert">Không thể tải dữ liệu Khuyên Người Niệm Phật: ' + escapeHtml(String(err)) + '</div>';
                }
            });

        window.addEventListener("popstate", function () {
            if (knnpMasterData) {
                var lnum = getRequestedKnnpLetter(1);
                renderKnnpLetterView(lnum, false);
            }
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                window.tmKpcCloseShareModal();
                return;
            }
            if (!knnpMasterData) return;
            var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : "";
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) {
                return;
            }
            var sm = document.getElementById("tm-kpc-share-modal");
            if (sm && sm.style.display !== "none") {
                return;
            }
            if (e.key === "ArrowLeft") {
                window.tmKnnpStep(-1);
            } else if (e.key === "ArrowRight") {
                window.tmKnnpStep(1);
            }
        });
    }
})();

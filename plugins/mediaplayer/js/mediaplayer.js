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
                html +=
                    '<figure class="tm-kpc-story-figure">' +
                    '  <img src="' + escapeHtml(b.url) + '" alt="Minh họa Tích truyện Kinh Pháp Cú" loading="lazy" />' +
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
            mediaHtml +=
                '<div class="tm-kpc-media-card tm-kpc-img-card">' +
                '  <div class="tm-kpc-media-head">🖼️ Tranh Minh Họa Bài Kệ ' + vnum + '</div>' +
                '  <div class="tm-kpc-img-wrap">' +
                '    <a href="' + escapeHtml(verseImg) + '" target="_blank" rel="noopener noreferrer" title="Bấm để xem ảnh kích thước đầy đủ">' +
                '      <img src="' + escapeHtml(verseImg) + '" alt="Tranh minh họa Kinh Pháp Cú - Bài kệ ' + vnum + '" loading="eager" />' +
                '    </a>' +
                '  </div>' +
                '</div>';
        }
        if (yt && yt.video_id) {
            var embedUrl = "https://www.youtube.com/embed/" + encodeURIComponent(yt.video_id) + "?rel=0";
            mediaHtml +=
                '<div class="tm-kpc-media-card tm-kpc-yt-card">' +
                '  <div class="tm-kpc-media-head">' +
                '    <span>🎬 Video 30s Hiểu Kinh Pháp Cú (Câu ' + vnum + ')</span>' +
                '    <a href="' + escapeHtml(yt.shorts_url || yt.video_url) + '" target="_blank" rel="noopener noreferrer" class="tm-kpc-yt-ext">↗ YouTube</a>' +
                '  </div>' +
                '  <div class="tm-kpc-yt-topic">' + escapeHtml(yt.title || "") + '</div>' +
                '  <div class="tm-kpc-yt-frame-wrap">' +
                '    <iframe src="' + embedUrl + '" title="' + escapeHtml(yt.title || ("Kinh Pháp Cú Câu " + vnum)) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>' +
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
                '    <button type="button" class="tm-kpc-foot-btn tm-kpc-foot-next" onclick="window.tmKpcStep(1)" ' + (vnum >= 423 ? 'disabled' : '') + '>Bài kệ tiếp (' + (vnum < 423 ? (vnum + 1) : 423) + ') ⏭</button>' +
                '  </div>' +
                '</section>';
        }

        stage.innerHTML =
            '<article class="tm-kpc-verse-card">' +
            '  <header class="tm-kpc-verse-header">' +
            '    <div class="tm-kpc-pham-badge">Phẩm ' + (v.pham_id < 10 ? "0" + v.pham_id : v.pham_id) + ' • ' + escapeHtml(v.pham_name) + ' (' + escapeHtml(v.pham_pali) + ')</div>' +
            '    <div class="tm-kpc-verse-num-badge">Bài kệ <strong>' + vnum + '</strong> / 423</div>' +
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

        // Keyboard left/right arrow support when not typing in an input
        document.addEventListener("keydown", function (e) {
            if (!kpcMasterData) return;
            var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : "";
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) {
                return;
            }
            if (e.key === "ArrowLeft") {
                window.tmKpcStep(-1);
            } else if (e.key === "ArrowRight") {
                window.tmKpcStep(1);
            }
        });
    }
})();

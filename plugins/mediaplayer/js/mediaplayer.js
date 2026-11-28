(function () {
    "use strict";

    function formatDur(sec) {
        sec = parseInt(sec || 0, 10);
        if (isNaN(sec) || sec <= 0) return "00:00";
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

    function updateSliderFill(slider) {
        if (!slider) return;
        var max = parseFloat(slider.max) || 100;
        var val = parseFloat(slider.value) || 0;
        var pct = max > 0 ? Math.min(100, Math.max(0, (val / max) * 100)) : 0;
        slider.style.background =
            "linear-gradient(to right, #f59e0b 0%, #f59e0b " + pct + "%, #4a3828 " + pct + "%, #4a3828 100%)";
    }

    function updatePlayBtnUI(container, isPlaying) {
        if (!container) return;
        var playBtns = container.querySelectorAll(".tm-play-btn");
        playBtns.forEach(function (btn) {
            var icon = btn.querySelector(".tm-play-icon");
            var txt = btn.querySelector(".tm-play-txt");
            if (icon) {
                icon.textContent = isPlaying ? "⏸" : "▶";
            }
            if (txt) {
                txt.textContent = isPlaying ? "Dừng" : "Phát";
            }
            btn.classList.toggle("is-playing", isPlaying);
            btn.setAttribute("title", isPlaying ? "Tạm dừng phát" : "Phát âm thanh");
        });
    }

    window.tmAudioTogglePlay = function (btn) {
        var container = btn.closest(".tm-absplayer, .tm-hub-player-deck, .tm-knnp-audio-card, .tm-floating-audio-bar, .tm-audio-box") || btn.parentElement;
        var audio = container ? container.querySelector("audio") : null;
        if (!audio) return;
        if (audio.paused) {
            audio.play().catch(function () {});
        } else {
            audio.pause();
        }
    };

    window.tmBindAudioScrubber = function (container, audioEl, knownDuration) {
        if (!container && !audioEl) return;
        if (!container && audioEl) {
            container = audioEl.closest(".tm-absplayer, .tm-hub-player-deck, .tm-knnp-audio-card, .tm-floating-audio-bar, .tm-audio-box") || audioEl.parentElement;
        }
        if (!audioEl && container) {
            audioEl = container.querySelector("audio");
        }
        if (!audioEl) return;

        var slider = container ? container.querySelector(".tm-audio-scrubber") : null;
        var curEl = container ? container.querySelector(".tm-time-cur") : null;
        var durEl = container ? container.querySelector(".tm-time-dur") : null;
        if (!slider) return;

        slider._audioEl = audioEl;
        audioEl._scrubberContainer = container;
        audioEl._scrubberSlider = slider;
        audioEl._curTimeEl = curEl;
        audioEl._durTimeEl = durEl;

        var d = knownDuration || audioEl.duration;
        if (d && !isNaN(d) && isFinite(d) && d > 0) {
            slider.max = d;
            if (durEl) durEl.textContent = formatDur(d);
        } else {
            if (durEl && (!durEl.textContent || durEl.textContent === "--:--")) durEl.textContent = "00:00";
        }
        if (audioEl.currentTime > 0) {
            slider.value = audioEl.currentTime;
            if (curEl) curEl.textContent = formatDur(audioEl.currentTime);
        }
        updateSliderFill(slider);
        updatePlayBtnUI(container, !audioEl.paused);

        if (audioEl._hasScrubberEvents) return;
        audioEl._hasScrubberEvents = true;

        audioEl.addEventListener("play", function () {
            pauseOtherAudios(audioEl);
            updatePlayBtnUI(audioEl._scrubberContainer, true);
            var pill = document.getElementById("tm-fab-resume-pill");
            if (pill && audioEl.id === "tm-fab-player") pill.style.display = "none";
            if (typeof syncMediaSessionForAudio === "function") syncMediaSessionForAudio(audioEl);
            if (typeof recordAudioProgress === "function") recordAudioProgress(audioEl, true);
        });

        audioEl.addEventListener("pause", function () {
            updatePlayBtnUI(audioEl._scrubberContainer, false);
            if (!audioEl.ended && typeof recordAudioProgress === "function") {
                recordAudioProgress(audioEl, true);
            }
        });

        audioEl.addEventListener("ended", function () {
            updatePlayBtnUI(audioEl._scrubberContainer, false);
            if (typeof clearTrackProgressOnEnded === "function") {
                clearTrackProgressOnEnded(audioEl);
            }
        });

        audioEl.addEventListener("ratechange", function () {
            if (typeof recordAudioProgress === "function") recordAudioProgress(audioEl, true);
        });

        audioEl.addEventListener("loadedmetadata", function () {
            var sl = audioEl._scrubberSlider;
            var de = audioEl._durTimeEl;
            var dur = audioEl.duration;
            if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
                if (sl) {
                    sl.max = dur;
                    updateSliderFill(sl);
                }
                if (de) de.textContent = formatDur(dur);
            }
        });

        audioEl.addEventListener("durationchange", function () {
            var sl = audioEl._scrubberSlider;
            var de = audioEl._durTimeEl;
            var dur = audioEl.duration;
            if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
                if (sl) {
                    sl.max = dur;
                    updateSliderFill(sl);
                }
                if (de) de.textContent = formatDur(dur);
            }
        });

        audioEl.addEventListener("timeupdate", function () {
            var sl = audioEl._scrubberSlider;
            var ce = audioEl._curTimeEl;
            var de = audioEl._durTimeEl;
            if (sl && !sl._isDragging) {
                var cur = audioEl.currentTime || 0;
                sl.value = cur;
                if (ce) ce.textContent = formatDur(cur);
                var dur = audioEl.duration;
                if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
                    if (parseFloat(sl.max) !== dur) sl.max = dur;
                    if (de) de.textContent = formatDur(dur);
                }
                updateSliderFill(sl);
            }
            if (typeof recordAudioProgress === "function") recordAudioProgress(audioEl, false);
        });

        audioEl.addEventListener("seeking", function () {
            var ce = audioEl._curTimeEl;
            if (ce) ce.textContent = formatDur(audioEl.currentTime);
        });

        audioEl.addEventListener("seeked", function () {
            var sl = audioEl._scrubberSlider;
            var ce = audioEl._curTimeEl;
            if (ce) ce.textContent = formatDur(audioEl.currentTime);
            if (sl && !sl._isDragging) {
                sl.value = audioEl.currentTime || 0;
                updateSliderFill(sl);
            }
            if (typeof recordAudioProgress === "function") recordAudioProgress(audioEl, true);
        });
    };

    window.tmAudioSeekInput = function (slider) {
        if (!slider) return;
        slider._isDragging = true;
        var targetSec = parseFloat(slider.value) || 0;
        var container = slider.closest(".tm-absplayer, .tm-hub-player-deck, .tm-knnp-audio-card, .tm-floating-audio-bar, .tm-audio-box, .tm-audio-scrubber-row") || slider.parentElement;
        var curEl = container ? container.querySelector(".tm-time-cur") : null;
        if (curEl) {
            curEl.textContent = formatDur(targetSec);
        }
        updateSliderFill(slider);
    };

    window.tmAudioSeekChange = function (slider) {
        if (!slider) return;
        slider._isDragging = false;
        var targetSec = parseFloat(slider.value) || 0;
        var audio = slider._audioEl;
        if (!audio) {
            var container = slider.closest(".tm-absplayer, .tm-hub-player-deck, .tm-knnp-audio-card, .tm-floating-audio-bar, .tm-audio-box") || document;
            audio = container.querySelector("audio");
        }
        if (audio) {
            try {
                if (typeof audio.fastSeek === "function") {
                    audio.fastSeek(targetSec);
                } else {
                    audio.currentTime = targetSec;
                }
            } catch (e) {
                audio.currentTime = targetSec;
            }
        }
        var container = slider.closest(".tm-absplayer, .tm-hub-player-deck, .tm-knnp-audio-card, .tm-floating-audio-bar, .tm-audio-box, .tm-audio-scrubber-row") || slider.parentElement;
        var curEl = container ? container.querySelector(".tm-time-cur") : null;
        if (curEl) {
            curEl.textContent = formatDur(targetSec);
        }
        updateSliderFill(slider);
    };

    window.tmAudioSeekBy = function (btn, deltaSeconds) {
        var container = btn.closest(".tm-absplayer, .tm-hub-player-deck, .tm-knnp-audio-card, .tm-floating-audio-bar, .tm-audio-box") || (btn.parentElement ? btn.parentElement.closest(".tm-absplayer, .tm-hub-player-deck, .tm-knnp-audio-card, .tm-floating-audio-bar, .tm-audio-box") : null);
        var audio = container ? container.querySelector("audio") : (btn.tagName === "AUDIO" ? btn : document.querySelector("audio"));
        if (!audio) return;

        var cur = audio.currentTime || 0;
        var dur = (!isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : 999999;
        var target = Math.max(0, Math.min(dur, cur + deltaSeconds));
        try {
            audio.currentTime = target;
        } catch (e) {}

        var slider = audio._scrubberSlider || (container ? container.querySelector(".tm-audio-scrubber") : null);
        if (slider) {
            slider.value = target;
            updateSliderFill(slider);
        }
        var curEl = audio._curTimeEl || (container ? container.querySelector(".tm-time-cur") : null);
        if (curEl) {
            curEl.textContent = formatDur(target);
        }
    };

    /* =========================================================================
       1. STANDALONE NATIVE ABS HTML5 PLAYLIST PLAYER ([:absplayer:] / [:embed:])
       ========================================================================= */
    function getAbsGroups(uid) {
        var box = document.getElementById(uid);
        if (!box) return [];
        if (box._parsedGroups) return box._parsedGroups;
        try {
            box._parsedGroups = JSON.parse(box.getAttribute("data-groups") || "[]");
            return box._parsedGroups;
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
                    (t.src ? ('  <a class="tm-abs-t-down" href="' + escapeHtml(t.src) + '" download target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" title="Tải file MP3">💾 Tải</a>') : '') +
                    '</div>';
            });
            listEl.innerHTML = html;
        }

        window.tmAbsPlayTrack(uid, gIdx, 0, true);
    };

    window.tmAbsPlayTrack = function (uid, gIdx, tIdx, autoPlay, startAtSec) {
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
                if (playBadge) playBadge.textContent = (autoPlay === false) ? "📌 Đã chọn" : "🔊 Đang phát";
            } else {
                r.classList.remove("active");
                if (playBadge) playBadge.textContent = "▶ Phát";
            }
        });

        var banner = box.querySelector(".tm-resume-banner");
        if (banner && autoPlay !== false) {
            banner.remove();
        }

        var audio = box.querySelector(".tm-abs-audio");
        if (audio) {
            if (audio.src !== track.src) {
                audio.src = track.src;
            }
            var speedSel = box.querySelector(".tm-abs-speed");
            if (speedSel) {
                audio.playbackRate = parseFloat(speedSel.value || "1");
            }

            var targetSeek = (typeof startAtSec === "number" && startAtSec > 0) ? startAtSec : 0;
            var autoResumed = false;
            if (!targetSeek && startAtSec !== 0 && typeof getSavedTrackProgress === "function") {
                var saved = getSavedTrackProgress(track.src);
                if (saved && saved.t > 5 && (!track.duration || saved.t < track.duration - 8)) {
                    targetSeek = saved.t;
                    autoResumed = true;
                }
            }

            if (targetSeek > 0) {
                applyAudioStartTime(audio, targetSeek);
                if (autoResumed && autoPlay !== false && window.tmShowToast) {
                    window.tmShowToast('🪷 Tiếp tục nghe từ <strong>' + formatDur(targetSeek) + '</strong>');
                }
            }

            if (autoPlay !== false) {
                audio.play().catch(function () {});
            }
            window.tmBindAudioScrubber(box, audio, track.duration);
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

            var firstDur = firstTrack.duration || 0;
            var durTxt = formatDur(firstDur);
            cardWrap.innerHTML =
                '<div class="tm-hub-player-deck">' +
                '  <div class="tm-hub-deck-top">' +
                '    <div>' +
                '      <div class="tm-hub-deck-title">' + escapeHtml(selected.title || "Tuyển tập Audio") + '</div>' +
                '      <div class="tm-hub-deck-np">Bài đang chọn: <strong class="tm-hub-np-name">' + escapeHtml(firstTrack.title) + '</strong></div>' +
                '    </div>' +
                '    <div class="tm-hub-format-bar">' + headerLinks + '</div>' +
                '  </div>' +
                '  <div class="tm-audio-scrubber-row">' +
                '    <span class="tm-audio-time tm-time-cur">00:00</span>' +
                '    <input type="range" class="tm-audio-scrubber" min="0" max="' + Math.max(100, firstDur) + '" value="0" step="0.5" aria-label="Tua đến vị trí mong muốn" title="Kéo hoặc nhấn để tua đến thời điểm mong muốn" oninput="window.tmAudioSeekInput(this)" onchange="window.tmAudioSeekChange(this)" />' +
                '    <span class="tm-audio-time tm-time-dur">' + (durTxt || "00:00") + '</span>' +
                '  </div>' +
                '  <div class="tm-hub-audio-row">' +
                '    <button type="button" class="tm-abs-btn" onclick="window.tmHubPrev(\'' + hubId + '\')">⏮ <span class="tm-btn-txt">Trước</span></button>' +
                '    <button type="button" class="tm-abs-btn tm-seek-btn" onclick="window.tmAudioSeekBy(this, -30)" title="Tua lùi 30 giây">⏪ 30s</button>' +
                '    <button type="button" class="tm-abs-btn tm-seek-btn" onclick="window.tmAudioSeekBy(this, -10)" title="Tua lùi 10 giây">⏪ 10s</button>' +
                '    <button type="button" class="tm-abs-btn tm-play-btn" onclick="window.tmAudioTogglePlay(this)" title="Phát hoặc tạm dừng"><span class="tm-play-icon">▶</span> <span class="tm-play-txt">Phát</span></button>' +
                '    <button type="button" class="tm-abs-btn tm-seek-btn" onclick="window.tmAudioSeekBy(this, 10)" title="Tua tới 10 giây">10s ⏩</button>' +
                '    <button type="button" class="tm-abs-btn tm-seek-btn" onclick="window.tmAudioSeekBy(this, 30)" title="Tua tới 30 giây">30s ⏩</button>' +
                '    <button type="button" class="tm-abs-btn" onclick="window.tmHubNext(\'' + hubId + '\')"><span class="tm-btn-txt">Tiếp</span> ⏭</button>' +
                '    <audio class="tm-hub-audio" preload="metadata" src="' + escapeHtml(firstTrack.src) + '" style="display:none;"></audio>' +
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
                window.tmBindAudioScrubber(cardWrap, audioEl, firstDur);
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
            window.tmBindAudioScrubber(hub, audio, track.duration);
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

    function normalizeViSearch(str) {
        if (!str) return "";
        var s = String(str).toLowerCase();
        try {
            s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        } catch (e) {}
        return s.replace(/đ/g, "d").trim();
    }

    window.tmSelectVideoTopic = function (boxId, topic, pillEl) {
        var box = document.getElementById(boxId);
        if (!box) return;
        box.setAttribute("data-active-topic", topic || "all");
        var pills = box.querySelectorAll(".tm-vidlist-pill");
        for (var i = 0; i < pills.length; i++) {
            pills[i].classList.toggle("active", pills[i] === pillEl);
        }
        window.tmFilterVideoList(boxId);
    };

    window.tmFilterVideoList = function (boxId) {
        var box = document.getElementById(boxId);
        if (!box) return;
        var input = box.querySelector(".tm-vidlist-search");
        var qRaw = input ? (input.value || "").trim().toLowerCase() : "";
        var qNorm = normalizeViSearch(qRaw);
        var activeTopic = box.getAttribute("data-active-topic") || "all";
        var cards = box.querySelectorAll(".tm-vidstory-card");
        var visible = 0;

        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var cTopic = c.getAttribute("data-topic") || "";
            var cSearch = c.getAttribute("data-search") || "";
            var topicOk = (activeTopic === "all" || cTopic === activeTopic);
            var searchOk = !qNorm || cSearch.indexOf(qRaw) !== -1 || cSearch.indexOf(qNorm) !== -1;
            var show = topicOk && searchOk;
            c.style.display = show ? "" : "none";
            if (show) visible += 1;
        }

        var visEl = box.querySelector(".tm-vidlist-visible");
        if (visEl) visEl.textContent = String(visible);
    };

    window.tmToggleStoryVideo = function (drawerId, embedUrl, autoPlay) {
        var drawer = document.getElementById(drawerId);
        if (!drawer) return;
        var toggleBtn = document.querySelector('[data-vid-btn="' + drawerId + '"]');
        if (drawer.style.display === "none" || !drawer.innerHTML) {
            var finalUrl = embedUrl || "";
            if (finalUrl.indexOf("youtube.com/embed/") !== -1) {
                if (finalUrl.indexOf("enablejsapi=") === -1) {
                    finalUrl += (finalUrl.indexOf("?") === -1 ? "?" : "&") + "enablejsapi=1";
                }
                if (finalUrl.indexOf("playsinline=") === -1) {
                    finalUrl += "&playsinline=1&rel=0";
                }
                if (autoPlay && finalUrl.indexOf("autoplay=") === -1) {
                    finalUrl += "&autoplay=1";
                }
            }
            var vidId = extractYoutubeIdFromUrl(finalUrl);
            var savedYt = vidId ? getSavedYtProgress(vidId) : null;
            var card = drawer.closest ? drawer.closest(".tm-story-card, .tm-vidstory-card") : null;
            var cardTitleEl = card ? card.querySelector(".tm-story-title") : null;
            var vidTitle = cardTitleEl ? cardTitleEl.textContent.trim() : document.title;

            var resumeHtml = "";
            if (savedYt && savedYt.t > 8) {
                resumeHtml =
                    '<div class="tm-resume-banner">' +
                    '  <span class="tm-resume-banner-text">↺ Lần trước đang xem đến <strong>' + formatDur(savedYt.t) + '</strong></span>' +
                    '  <div class="tm-resume-banner-actions">' +
                    '    <button type="button" class="tm-resume-btn-play" onclick="window.tmSeekYoutubeInContainer(this.closest(\'.tm-story-video-drawer\'), ' + Math.floor(savedYt.t) + '); this.closest(\'.tm-resume-banner\').remove();">▶ Xem tiếp từ ' + formatDur(savedYt.t) + '</button>' +
                    '    <button type="button" class="tm-resume-btn-reset" onclick="this.closest(\'.tm-resume-banner\').remove();">Đóng</button>' +
                    '  </div>' +
                    '</div>';
            }

            drawer.style.display = "block";
            drawer.setAttribute("data-embed-title", vidTitle);
            if (vidId) drawer.setAttribute("data-yt-id", vidId);
            drawer.innerHTML =
                resumeHtml +
                '<div class="tm-story-video-frame">' +
                '  <iframe src="' + escapeHtml(finalUrl) + '" title="' + escapeHtml(vidTitle) + '" style="width:100%; height:400px; border:none; border-radius:8px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
                '  <div class="tm-abs-controls-bar" style="margin-top:6px; justify-content:flex-end;">' +
                '    <button type="button" class="tm-abs-btn tm-btn-pip-video" onclick="window.tmDockEmbedVideo(this)" title="Thu nhỏ video xuống góc màn hình để vừa xem vừa đọc bài khác">⬇ Xem nền (Thu nhỏ)</button>' +
                '  </div>' +
                '</div>';

            if (toggleBtn) {
                toggleBtn.textContent = "✕ Thu gọn khung phim";
            }

            var ifr = drawer.querySelector("iframe");
            if (ifr && typeof registerYoutubeIframe === "function") {
                registerYoutubeIframe(ifr, vidTitle);
            }
        } else {
            drawer.style.display = "none";
            drawer.innerHTML = "";
            if (toggleBtn) {
                toggleBtn.textContent = "🎬 Xem Phim Ngay";
            }
        }
    };

    function pauseOtherAudios(exceptEl) {
        var allAud = document.querySelectorAll("audio");
        for (var i = 0; i < allAud.length; i++) {
            if (allAud[i] !== exceptEl && !allAud[i].paused) {
                allAud[i].pause();
            }
        }
    }

    function applyAudioStartTime(audioEl, sec) {
        if (!audioEl || !(sec > 0)) return;
        var applied = false;
        var trySeek = function () {
            if (applied) return;
            try {
                if (audioEl.readyState >= 1) {
                    audioEl.currentTime = sec;
                    applied = true;
                }
            } catch (err) {}
        };
        trySeek();
        if (!applied) {
            var onMeta = function () {
                applied = true;
                try { audioEl.currentTime = sec; } catch (err) {}
                audioEl.removeEventListener("loadedmetadata", onMeta);
            };
            audioEl.addEventListener("loadedmetadata", onMeta);
        }
    }

    var fabPlaylistState = null; // { groups, gIdx, tIdx, originUrl, originTitle, albumKey }

    window.tmFabSpeed = function (rate) {
        var player = document.getElementById("tm-fab-player");
        if (player) {
            player.playbackRate = parseFloat(rate) || 1.0;
        }
    };

    window.tmCloseFloatingAudio = function () {
        var bar = document.getElementById("tm-floating-audio-bar");
        var player = document.getElementById("tm-fab-player");
        if (player) {
            if (!player.paused && typeof recordAudioProgress === "function") {
                recordAudioProgress(player, true);
            }
            player.pause();
        }
        if (bar) {
            bar.style.display = "none";
        }
        if (document.body) {
            document.body.classList.remove("tm-has-floating-audio");
        }
        fabPlaylistState = null;
        bgAudioConfirmed = false;
        if (typeof dismissLastSession === "function") {
            dismissLastSession("audio");
        }
    };

    window.tmRestartFloatingAudio = function () {
        var player = document.getElementById("tm-fab-player");
        if (!player) return;
        try { player.currentTime = 0; } catch (e) {}
        var pill = document.getElementById("tm-fab-resume-pill");
        if (pill) pill.style.display = "none";
        player.play().catch(function () {});
    };

    window.tmFabStepTrack = function (delta) {
        if (!fabPlaylistState || !fabPlaylistState.groups || !fabPlaylistState.groups.length) return;
        var groups = fabPlaylistState.groups;
        var gIdx = fabPlaylistState.gIdx || 0;
        var tIdx = (fabPlaylistState.tIdx || 0) + delta;

        if (tIdx < 0) {
            if (gIdx > 0) {
                gIdx -= 1;
                var prevTracks = (groups[gIdx] && groups[gIdx].tracks) ? groups[gIdx].tracks : [];
                tIdx = Math.max(0, prevTracks.length - 1);
            } else {
                return;
            }
        } else {
            var curTracks = (groups[gIdx] && groups[gIdx].tracks) ? groups[gIdx].tracks : [];
            if (tIdx >= curTracks.length) {
                if (gIdx + 1 < groups.length) {
                    gIdx += 1;
                    tIdx = 0;
                } else {
                    return;
                }
            }
        }

        var nextGroup = groups[gIdx];
        var nextTrack = (nextGroup && nextGroup.tracks) ? nextGroup.tracks[tIdx] : null;
        if (!nextTrack || !nextTrack.src) return;

        fabPlaylistState.gIdx = gIdx;
        fabPlaylistState.tIdx = tIdx;
        var curRate = 1.0;
        var p = document.getElementById("tm-fab-player");
        if (p) curRate = p.playbackRate || 1.0;

        window.tmPlayInlineAudio(null, nextTrack.src, nextTrack.title || ("Bài " + (tIdx + 1)), 0, curRate, {
            playlistState: fabPlaylistState,
            knownDuration: nextTrack.duration || 0
        });
    };

    function ensureFloatingAudioBar() {
        var existing = document.getElementById("tm-floating-audio-bar");
        if (!existing) {
            existing = document.createElement("div");
            existing.id = "tm-floating-audio-bar";
            existing.className = "tm-floating-audio-bar";
            existing.innerHTML =
                '<div class="tm-fab-inner">' +
                '  <div class="tm-fab-top">' +
                '    <div class="tm-fab-title">🎧 <span id="tm-fab-name"></span><span id="tm-fab-resume-pill" class="tm-fab-resume-pill" style="display:none;"></span></div>' +
                '    <div class="tm-fab-top-actions">' +
                '      <a id="tm-fab-origin" class="tm-fab-origin-link" href="#" style="display:none;" title="Quay về trang bài viết gốc">↗ Bài gốc</a>' +
                '      <button type="button" id="tm-fab-restart" class="tm-fab-restart-btn" onclick="window.tmRestartFloatingAudio()" title="Nghe lại bài này từ đầu (00:00)">↺ 00:00</button>' +
                '      <select id="tm-fab-speed" class="tm-fab-speed" onchange="window.tmFabSpeed(this.value)" title="Tốc độ phát">' +
                '        <option value="0.85">0.85x</option>' +
                '        <option value="1" selected>1.0x</option>' +
                '        <option value="1.15">1.15x</option>' +
                '        <option value="1.25">1.25x</option>' +
                '        <option value="1.5">1.5x</option>' +
                '      </select>' +
                '      <a id="tm-fab-down" class="tm-fab-down" href="#" download target="_blank" rel="noopener noreferrer" title="Tải file MP3">💾</a>' +
                '      <button type="button" class="tm-fab-close" onclick="window.tmCloseFloatingAudio()" title="Đóng trình phát">✕</button>' +
                '    </div>' +
                '  </div>' +
                '  <div class="tm-audio-scrubber-row tm-fab-scrubber">' +
                '    <span class="tm-audio-time tm-time-cur">00:00</span>' +
                '    <input type="range" class="tm-audio-scrubber" min="0" max="100" value="0" step="0.5" aria-label="Tua đến vị trí mong muốn" title="Kéo hoặc nhấn để tua đến thời điểm mong muốn" oninput="window.tmAudioSeekInput(this)" onchange="window.tmAudioSeekChange(this)" />' +
                '    <span class="tm-audio-time tm-time-dur">00:00</span>' +
                '  </div>' +
                '  <div class="tm-fab-controls">' +
                '    <button type="button" id="tm-fab-prev" class="tm-fab-btn" style="display:none;" onclick="window.tmFabStepTrack(-1)" title="Bài trước trong danh sách">⏮ Trước</button>' +
                '    <button type="button" class="tm-fab-btn tm-seek-btn" onclick="window.tmAudioSeekBy(this, -30)" title="Tua lùi 30 giây">⏪ 30s</button>' +
                '    <button type="button" class="tm-fab-btn tm-seek-btn" onclick="window.tmAudioSeekBy(this, -10)" title="Tua lùi 10 giây">⏪ 10s</button>' +
                '    <button type="button" class="tm-fab-btn tm-play-btn" onclick="window.tmAudioTogglePlay(this)" title="Phát hoặc tạm dừng"><span class="tm-play-icon">▶</span> <span class="tm-play-txt">Phát</span></button>' +
                '    <button type="button" class="tm-fab-btn tm-seek-btn" onclick="window.tmAudioSeekBy(this, 10)" title="Tua tới 10 giây">10s ⏩</button>' +
                '    <button type="button" class="tm-fab-btn tm-seek-btn" onclick="window.tmAudioSeekBy(this, 30)" title="Tua tới 30 giây">30s ⏩</button>' +
                '    <button type="button" id="tm-fab-next" class="tm-fab-btn" style="display:none;" onclick="window.tmFabStepTrack(1)" title="Bài tiếp theo trong danh sách">Tiếp ⏭</button>' +
                '  </div>' +
                '  <audio id="tm-fab-player" preload="metadata" style="display:none;"></audio>' +
                '</div>';
            document.body.appendChild(existing);
            var initAud = existing.querySelector("#tm-fab-player");
            if (initAud) {
                bindFabPlaylistEnded(initAud);
            }
        }
        return existing;
    }

    function bindFabPlaylistEnded(audioEl) {
        if (!audioEl || audioEl._hasFabEnded) return;
        audioEl._hasFabEnded = true;
        audioEl.addEventListener("ended", function () {
            if (audioEl.id === "tm-fab-player" && fabPlaylistState && fabPlaylistState.groups) {
                window.tmFabStepTrack(1);
            }
        });
    }

    function syncFloatingBarHeaderMeta() {
        var prevBtn = document.getElementById("tm-fab-prev");
        var nextBtn = document.getElementById("tm-fab-next");
        var hasList = !!(fabPlaylistState && fabPlaylistState.groups && fabPlaylistState.groups.length &&
            ((fabPlaylistState.groups.length > 1) || ((fabPlaylistState.groups[0].tracks || []).length > 1)));
        if (prevBtn) prevBtn.style.display = hasList ? "inline-flex" : "none";
        if (nextBtn) nextBtn.style.display = hasList ? "inline-flex" : "none";

        var originLink = document.getElementById("tm-fab-origin");
        if (originLink) {
            var oUrl = (fabPlaylistState && fabPlaylistState.originUrl) ? fabPlaylistState.originUrl : "";
            var curPath = window.location.pathname + window.location.search;
            if (oUrl && oUrl !== curPath) {
                originLink.href = oUrl;
                originLink.style.display = "inline-flex";
            } else {
                originLink.style.display = "none";
            }
        }
    }

    window.tmPlayInlineAudio = function (btn, src, title, startTime, rate, opts) {
        opts = opts || {};
        var existing = ensureFloatingAudioBar();
        existing.style.display = "block";
        if (document.body) {
            document.body.classList.add("tm-has-floating-audio");
        }

        if (opts.playlistState) {
            fabPlaylistState = opts.playlistState;
        } else if (!opts.keepPlaylist) {
            fabPlaylistState = {
                groups: null,
                gIdx: 0,
                tIdx: 0,
                originUrl: opts.originUrl || (window.location.pathname + window.location.search),
                originTitle: document.title
            };
        }
        syncFloatingBarHeaderMeta();

        var nameEl = document.getElementById("tm-fab-name");
        if (nameEl) nameEl.textContent = title || "Đang phát MP3";
        var downEl = document.getElementById("tm-fab-down");
        if (downEl) downEl.href = src || "#";

        var resolvedStart = (typeof startTime === "number" && startTime >= 0) ? startTime : null;
        var resolvedRate = parseFloat(rate) || 0;
        var autoResumed = false;

        if (resolvedStart === null && typeof getSavedTrackProgress === "function") {
            var saved = getSavedTrackProgress(src);
            if (saved && saved.t > 5 && (!saved.d || saved.t < saved.d - 8)) {
                resolvedStart = saved.t;
                if (!resolvedRate && saved.r) resolvedRate = saved.r;
                autoResumed = true;
            }
        }
        if (!resolvedRate) resolvedRate = 1.0;

        var pill = document.getElementById("tm-fab-resume-pill");
        if (pill) {
            if (opts.paused && resolvedStart > 0) {
                pill.textContent = "↺ Tạm dừng ở " + formatDur(resolvedStart);
                pill.style.display = "inline-block";
            } else {
                pill.style.display = "none";
            }
        }

        var player = document.getElementById("tm-fab-player");
        if (player) {
            bindFabPlaylistEnded(player);
            if (!opts.paused) {
                pauseOtherAudios(player);
            }
            if (player.src !== src) {
                player.src = src;
            }
            player.playbackRate = resolvedRate;
            var speedSel = document.getElementById("tm-fab-speed");
            if (speedSel) speedSel.value = String(resolvedRate);

            if (resolvedStart && resolvedStart > 0) {
                applyAudioStartTime(player, resolvedStart);
                if (autoResumed && !opts.paused && window.tmShowToast) {
                    window.tmShowToast('🪷 Tiếp tục nghe từ <strong>' + formatDur(resolvedStart) + '</strong>');
                }
            }

            window.tmBindAudioScrubber(existing, player, opts.knownDuration || 0);
            if (resolvedStart && resolvedStart > 0) {
                var sl = existing.querySelector(".tm-audio-scrubber");
                var ce = existing.querySelector(".tm-time-cur");
                if (sl) {
                    if (opts.knownDuration && opts.knownDuration > parseFloat(sl.max || "0")) {
                        sl.max = opts.knownDuration;
                    } else if (resolvedStart > parseFloat(sl.max || "0")) {
                        sl.max = Math.max(100, resolvedStart * 1.2);
                    }
                    sl.value = resolvedStart;
                    updateSliderFill(sl);
                }
                if (ce) ce.textContent = formatDur(resolvedStart);
            }

            if (!opts.paused) {
                player.play().catch(function () {});
            }
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

    function initPageMediaWidgets(isPjaxSwap) {
        var fabAud = document.getElementById("tm-fab-player");
        var fabIsPlaying = !!(fabAud && !fabAud.paused && fabAud.currentSrc);

        var absPlayers = document.querySelectorAll(".tm-absplayer");
        absPlayers.forEach(function (box) {
            if (box.getAttribute("data-tm-abs-ready") === "1") return;
            box.setAttribute("data-tm-abs-ready", "1");
            box.setAttribute("data-cur-group", "0");
            box.setAttribute("data-cur-track", "0");
            var audio = box.querySelector(".tm-abs-audio");
            if (audio && box.id) {
                audio._absUid = box.id;
                audio.addEventListener("ended", function () {
                    if (audio.id === "tm-fab-player") return; // reparented to floating bar
                    if (audio._absUid && document.getElementById(audio._absUid)) {
                        window.tmAbsNext(audio._absUid);
                    }
                });
                var groups = getAbsGroups(box.id);
                var firstDur = (groups[0] && groups[0].tracks && groups[0].tracks[0]) ? groups[0].tracks[0].duration : 0;
                window.tmBindAudioScrubber(box, audio, firstDur);

                // Restore saved album progress (track + timestamp + speed) if not currently active in floating bar
                if (typeof restoreAbsPlayerProgress === "function") {
                    restoreAbsPlayerProgress(box, groups, fabIsPlaying ? fabAud.currentSrc : "");
                }
            }
        });

        // Auto bind any standalone audio boxes
        document.querySelectorAll(".tm-audio-box").forEach(function (box) {
            if (box.getAttribute("data-tm-audbox-ready") === "1") return;
            box.setAttribute("data-tm-audbox-ready", "1");
            var audio = box.querySelector("audio");
            if (audio) {
                window.tmBindAudioScrubber(box, audio);
                var srcEl = audio.querySelector("source");
                var rawSrc = audio.currentSrc || audio.getAttribute("src") || (srcEl ? srcEl.getAttribute("src") : "");
                if (rawSrc && typeof getSavedTrackProgress === "function") {
                    var sv = getSavedTrackProgress(rawSrc);
                    if (sv && sv.t > 5 && (!sv.d || sv.t < sv.d - 8)) {
                        applyAudioStartTime(audio, sv.t);
                    }
                }
            }
        });

        var hubs = document.querySelectorAll(".tm-mediahub");
        hubs.forEach(function (hub) {
            if (hub.id && hub.getAttribute("data-tm-hub-ready") !== "1") {
                hub.setAttribute("data-tm-hub-ready", "1");
                window.tmHubSelect(hub.id, 0);
            }
        });

        initKpcReader();
        initKnnpReader();
        if (typeof initYoutubeEmbedsOnPage === "function") {
            initYoutubeEmbedsOnPage();
        }
        syncFloatingBarHeaderMeta();

        if (!isPjaxSwap && typeof restoreFloatingSessionOnLoad === "function") {
            restoreFloatingSessionOnLoad();
        }
    }

    window.tmReinitMediaPage = function () {
        initPageMediaWidgets(true);
    };

    document.addEventListener("DOMContentLoaded", function () {
        initAudioLinkInterceptor();
        if (typeof initBackgroundMediaNavigation === "function") {
            initBackgroundMediaNavigation();
        }
        initPageMediaWidgets(false);
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
                '    <button type="button" class="tm-kpc-foot-btn tm-kpc-foot-top" onclick="var r=document.getElementById(\'tm-kpc-reader\');if(r){if(window.tmScrollToTargetFocus){window.tmScrollToTargetFocus(r,\'smooth\');}else{r.scrollIntoView({behavior:\'smooth\'});}}">↑ Lên đầu bài kệ ' + vnum + '</button>' +
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

    function scrollReaderAppToTop(appEl, behavior) {
        if (!appEl) return;
        if (typeof window.tmScrollToTargetFocus === "function") {
            window.tmScrollToTargetFocus(appEl, behavior || "smooth");
        } else {
            appEl.scrollIntoView({ behavior: behavior || "smooth", block: "start" });
        }
    }

    window.tmKpcGoTo = function (vnum, scrollReader) {
        renderKpcVerseView(vnum, true);
        if (scrollReader !== false) {
            var app = document.getElementById("tm-kpc-reader");
            scrollReaderAppToTop(app, "smooth");
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
            '      <button type="button" class="tm-kpc-share-copy-url" onclick="window.tmShareModalCopy(\'link\')">🔗 Chép Link</button>' +
            '    </div>' +
            '    <div class="tm-kpc-share-toast" id="tm-kpc-share-toast" style="display:none;"></div>' +
            '    <div class="tm-kpc-share-grid">' +
            '      <button type="button" class="tm-kpc-share-opt tm-kpc-share-opt-primary" onclick="window.tmShareModalCopy(\'full\')">' +
            '        <span>📋</span> <div><strong>Sao chép Nội dung + Liên kết</strong><small>Dán ngay vào Zalo, Messenger, Ghi chú...</small></div>' +
            '      </button>' +
            '      <button type="button" class="tm-kpc-share-opt tm-kpc-share-opt-native" id="tm-kpc-share-native-btn" onclick="window.tmShareModalNative()">' +
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

    var activeSharePayload = null;

    window.tmKpcOpenShareModal = function () {
        var modal = ensureKpcShareModal();
        var p = getKpcSharePayload();

        activeSharePayload = {
            url: p.url,
            fullText: p.fullText,
            title: p.title,
            label: "Bài kệ " + p.vnum
        };

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
            copyLinkBtn.onclick = function () { window.tmShareModalCopy("link"); };
        }
        var copyFullBtn = modal.querySelector(".tm-kpc-share-opt-primary");
        if (copyFullBtn) {
            copyFullBtn.onclick = function () { window.tmShareModalCopy("full"); };
        }
        var nativeBtn = document.getElementById("tm-kpc-share-native-btn");
        if (nativeBtn) {
            nativeBtn.onclick = function () { window.tmShareModalNative(); };
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
        if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(function () {
                if (onDone) onDone(true);
            }).catch(function () {
                fallbackCopyText(text, onDone);
            });
            return;
        }
        fallbackCopyText(text, onDone);
    }

    function fallbackCopyText(text, onDone) {
        try {
            var urlInp = document.getElementById("tm-kpc-share-url-input");
            if (urlInp && urlInp.value === text && document.body.contains(urlInp)) {
                urlInp.focus();
                urlInp.select();
                urlInp.setSelectionRange(0, 99999);
                var success = document.execCommand("copy");
                if (success) {
                    if (onDone) onDone(true);
                    return;
                }
            }

            var ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.top = "0";
            ta.style.left = "0";
            ta.style.width = "2em";
            ta.style.height = "2em";
            ta.style.padding = "0";
            ta.style.border = "none";
            ta.style.outline = "none";
            ta.style.boxShadow = "none";
            ta.style.background = "transparent";
            ta.style.opacity = "0.01";
            ta.style.zIndex = "99999";
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            ta.setSelectionRange(0, 99999);
            var ok = document.execCommand("copy");
            document.body.removeChild(ta);
            if (onDone) onDone(ok);
        } catch (e) {
            if (onDone) onDone(false);
        }
    }

    window.tmShareModalCopy = function (mode) {
        var p = activeSharePayload || (typeof getKpcSharePayload === "function" ? getKpcSharePayload() : null);
        if (!p) return;
        var textToCopy = (mode === "link") ? (p.url || window.location.href) : (p.fullText || p.url || window.location.href);
        var label = p.label || "nội dung";

        copyTextToClipboard(textToCopy, function (ok) {
            if (ok) {
                var msg = mode === "link"
                    ? ("✓ Đã sao chép liên kết " + label + " vào bộ nhớ tạm!")
                    : ("✓ Đã sao chép trọn vẹn " + label + " & liên kết! Bạn có thể dán (Paste) ngay.");
                showKpcShareToast(msg);
            } else {
                showKpcShareToast("⚠️ Trình duyệt chặn tự động chép. Hãy chọn và sao chép ô liên kết phía trên.");
            }
        });
    };

    window.tmShareModalNative = function () {
        var p = activeSharePayload || (typeof getKpcSharePayload === "function" ? getKpcSharePayload() : null);
        if (!p) return;
        var title = p.title || document.title;
        var text  = p.fullText || "";
        var url   = p.url || window.location.href;

        if (navigator.share) {
            navigator.share({
                title: title,
                text: text,
                url: url
            }).catch(function () {});
        } else {
            window.tmShareModalCopy("full");
        }
    };

    window.tmKpcCopyShare   = window.tmShareModalCopy;
    window.tmKpcNativeShare = window.tmShareModalNative;

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
                var hasExplicitVerse = /[?&](verse|ke|bai)=/i.test(window.location.search || "") || /^#(?:verse-|ke-)?\d+$/i.test(window.location.hash || "");
                if (hasExplicitVerse || (window.pageYOffset || document.documentElement.scrollTop || 0) < 90) {
                    scrollReaderAppToTop(app, "auto");
                }
            })
            .catch(function (err) {
                var stage = document.getElementById("tm-kpc-stage");
                if (stage) {
                    stage.innerHTML = '<div class="tm-media-alert">Không thể tải dữ liệu Kinh Pháp Cú: ' + escapeHtml(String(err)) + '</div>';
                }
            });

        if (!window._tmKpcGlobalEventsBound) {
            window._tmKpcGlobalEventsBound = true;
            window.addEventListener("popstate", function () {
                if (kpcMasterData && document.getElementById("tm-kpc-reader")) {
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
                if (!kpcMasterData || !document.getElementById("tm-kpc-reader")) return;
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
                    '  <div class="tm-audio-scrubber-row tm-knnp-scrubber-row">' +
                    '    <span class="tm-audio-time tm-time-cur">00:00</span>' +
                    '    <input type="range" class="tm-audio-scrubber" min="0" max="' + Math.max(100, firstAud.duration || 0) + '" value="0" step="0.5" aria-label="Tua đến vị trí mong muốn" title="Kéo hoặc nhấn để tua đến thời điểm mong muốn" oninput="window.tmAudioSeekInput(this)" onchange="window.tmAudioSeekChange(this)" />' +
                    '    <span class="tm-audio-time tm-time-dur">' + (durTxt || '00:00') + '</span>' +
                    '  </div>' +
                    '  <div class="tm-knnp-seek-toolbar">' +
                    '    <button type="button" class="tm-knnp-seek-btn" onclick="window.tmAudioSeekBy(this, -30)" title="Tua lùi 30 giây">⏪ 30s</button>' +
                    '    <button type="button" class="tm-knnp-seek-btn" onclick="window.tmAudioSeekBy(this, -10)" title="Tua lùi 10 giây">⏪ 10s</button>' +
                    '    <button type="button" class="tm-knnp-seek-btn tm-play-btn" onclick="window.tmAudioTogglePlay(this)" title="Phát hoặc tạm dừng"><span class="tm-play-icon">▶</span> <span class="tm-play-txt">Phát</span></button>' +
                    '    <button type="button" class="tm-knnp-seek-btn" onclick="window.tmAudioSeekBy(this, 10)" title="Tua tới 10 giây">10s ⏩</button>' +
                    '    <button type="button" class="tm-knnp-seek-btn" onclick="window.tmAudioSeekBy(this, 30)" title="Tua tới 30 giây">30s ⏩</button>' +
                    '  </div>' +
                    '  <audio id="tm-knnp-audio-el" class="tm-knnp-audio-el" preload="metadata" src="' + escapeHtml(firstAud.audio_src) + '" style="display:none;"></audio>' +
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

        // Preface blocks (for Letter 1, 26, 49) — collapsed by default so reader sees letter content immediately
        var prefaceHtml = "";
        if (lt.preface_blocks && lt.preface_blocks.length > 0) {
            for (var pb = 0; pb < lt.preface_blocks.length; pb++) {
                var blk = lt.preface_blocks[pb];
                prefaceHtml +=
                    '<details class="tm-knnp-preface-box">' +
                    '  <summary class="tm-knnp-preface-summary">' +
                    '    <span>📜 ' + escapeHtml(blk.title) + '</span>' +
                    '    <span class="tm-knnp-preface-hint">Bấm để mở đọc ▾</span>' +
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
            '    <button type="button" class="tm-kpc-foot-btn tm-kpc-foot-top" onclick="var r=document.getElementById(\'tm-knnp-reader\');if(r){if(window.tmScrollToTargetFocus){window.tmScrollToTargetFocus(r,\'smooth\');}else{r.scrollIntoView({behavior:\'smooth\'});}}">↑ Lên đầu lá thư ' + lnumPad + '</button>' +
            '    <a href="' + escapeHtml(tapUrl) + '" class="tm-kpc-foot-btn" style="text-decoration:none;">🎧 Playlist Tập ' + lt.tap + '</a>' +
            '    <button type="button" class="tm-kpc-foot-btn tm-kpc-foot-share" onclick="window.tmKnnpOpenShareModal()">🔗 Chia sẻ thư ' + lnumPad + '</button>' +
            '    <button type="button" class="tm-kpc-foot-btn tm-kpc-foot-next" onclick="window.tmKnnpStep(1)" ' + (lnum >= 74 ? 'disabled' : '') + '>Lá thư tiếp (' + (lnum < 74 ? (lnum + 1) : 74) + ') ⏭</button>' +
            '  </div>' +
            '</article>';

        // Update preface hint dynamically when toggled open/closed
        var prefBoxes = stage.querySelectorAll("details.tm-knnp-preface-box");
        prefBoxes.forEach(function (box) {
            box.addEventListener("toggle", function () {
                var hintEl = box.querySelector(".tm-knnp-preface-hint");
                if (hintEl) {
                    hintEl.textContent = box.open ? "Thu gọn ▴" : "Bấm để mở đọc ▾";
                }
            });
        });

        // Attach auto-advance to part 2 if letter has 2 audio parts & bind scrubber
        var audioEl = document.getElementById("tm-knnp-audio-el");
        if (audioEl) {
            var card = audioEl.closest(".tm-knnp-audio-card");
            var d0 = (audios[0] && audios[0].duration) ? audios[0].duration : 0;
            window.tmBindAudioScrubber(card, audioEl, d0);
            if (audios.length > 1) {
                audioEl.addEventListener("ended", function () {
                    if (knnpCurrentAudioIdx + 1 < audios.length) {
                        window.tmKnnpSelectAudioPart(knnpCurrentAudioIdx + 1, true);
                    }
                });
            }
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
            var card = audioEl.closest(".tm-knnp-audio-card");
            window.tmBindAudioScrubber(card, audioEl, aud.duration);
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
            scrollReaderAppToTop(app, "smooth");
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

        activeSharePayload = {
            url: p.url,
            fullText: p.fullText,
            title: p.title,
            label: "Lá thư số " + lnumPad
        };

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
            copyLinkBtn.onclick = function () { window.tmShareModalCopy("link"); };
        }
        var copyFullBtn = modal.querySelector(".tm-kpc-share-opt-primary");
        if (copyFullBtn) {
            copyFullBtn.onclick = function () { window.tmShareModalCopy("full"); };
        }
        var nativeBtn = document.getElementById("tm-kpc-share-native-btn");
        if (nativeBtn) {
            nativeBtn.onclick = function () { window.tmShareModalNative(); };
        }

        modal.style.display = "flex";
        document.body.classList.add("tm-kpc-modal-open");
    };

    window.tmBuhdOpenShareModal = function (storyTitle, storyUrl, summaryText, volTitle) {
        var modal = ensureKpcShareModal();
        volTitle = volTitle || "Báo Ứng Hiện Đời";
        storyTitle = storyTitle || "Câu chuyện nhân quả";
        var absUrl = storyUrl || window.location.href;
        if (absUrl && !absUrl.match(/^https?:\/\//i)) {
            absUrl = window.location.origin + (absUrl.charAt(0) === '/' ? '' : '/') + absUrl;
        }

        var cleanSummary = (summaryText || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        var fullText = "📖 " + volTitle + "\n" +
                       "🔹 Câu chuyện: " + storyTitle + "\n\n" +
                       (cleanSummary ? (cleanSummary + "\n\n") : "") +
                       "🔗 Đọc toàn văn & nghe audio tại: " + absUrl;

        activeSharePayload = {
            url: absUrl,
            fullText: fullText,
            title: storyTitle + " — " + volTitle,
            label: "câu chuyện: " + storyTitle
        };

        var titleEl = document.getElementById("tm-kpc-share-title");
        if (titleEl) {
            titleEl.textContent = "🔗 Chia sẻ: " + storyTitle + " — " + volTitle;
        }

        var prevEl = document.getElementById("tm-kpc-share-preview");
        if (prevEl) {
            prevEl.innerHTML =
                '<div class="tm-kpc-sp-badge">' + escapeHtml(volTitle) + '</div>' +
                '<div class="tm-kpc-sp-verse" style="font-weight:700; color:#8c2d19; font-size:1.05rem; margin-bottom:6px;">' + escapeHtml(storyTitle) + '</div>' +
                (cleanSummary ? ('<div class="tm-kpc-sp-story" style="font-size:0.92rem; line-height:1.6; max-height:160px; overflow-y:auto;">' + escapeHtml(cleanSummary) + '</div>') : '');
            prevEl.scrollTop = 0;
        }

        var urlInp = document.getElementById("tm-kpc-share-url-input");
        if (urlInp) {
            urlInp.value = absUrl;
        }

        var toast = document.getElementById("tm-kpc-share-toast");
        if (toast) {
            toast.style.display = "none";
        }

        var fbBtn = document.getElementById("tm-kpc-share-fb");
        if (fbBtn) {
            fbBtn.href = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(absUrl) + "&quote=" + encodeURIComponent(fullText);
        }
        var tgBtn = document.getElementById("tm-kpc-share-tg");
        if (tgBtn) {
            tgBtn.href = "https://t.me/share/url?url=" + encodeURIComponent(absUrl) + "&text=" + encodeURIComponent(fullText);
        }
        var mailBtn = document.getElementById("tm-kpc-share-mail");
        if (mailBtn) {
            mailBtn.href = "mailto:?subject=" + encodeURIComponent(storyTitle + " — " + volTitle) + "&body=" + encodeURIComponent(fullText);
        }

        var copyLinkBtn = modal.querySelector(".tm-kpc-share-copy-url");
        if (copyLinkBtn) {
            copyLinkBtn.onclick = function () { window.tmShareModalCopy("link"); };
        }
        var copyFullBtn = modal.querySelector(".tm-kpc-share-opt-primary");
        if (copyFullBtn) {
            copyFullBtn.onclick = function () { window.tmShareModalCopy("full"); };
        }
        var nativeBtn = document.getElementById("tm-kpc-share-native-btn");
        if (nativeBtn) {
            nativeBtn.onclick = function () { window.tmShareModalNative(); };
        }

        modal.style.display = "flex";
        document.body.classList.add("tm-kpc-modal-open");
    };

    window.tmShareStory = function (btn) {
        if (!btn) return;
        var title = btn.getAttribute("data-title") || "";
        var url = btn.getAttribute("data-url") || window.location.href;
        var summary = btn.getAttribute("data-summary") || "";
        var vol = btn.getAttribute("data-vol") || "Báo Ứng Hiện Đời";

        if (!summary) {
            var card = btn.closest ? btn.closest(".tm-story-card, .tm-story-summary") : null;
            if (card) {
                var textEl = card.querySelector(".tm-summary-text");
                if (textEl) {
                    summary = textEl.textContent || textEl.innerText || "";
                }
            }
        }
        window.tmBuhdOpenShareModal(title, url, summary, vol);
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
                var hasExplicitLetter = /[?&](thu|bai|letter|track)=/i.test(window.location.search || "") || /^#(?:thu-|bai-|letter-)?\d+$/i.test(window.location.hash || "");
                if (hasExplicitLetter || (window.pageYOffset || document.documentElement.scrollTop || 0) < 90) {
                    scrollReaderAppToTop(app, "auto");
                }
            })
            .catch(function (err) {
                var stage = document.getElementById("tm-knnp-stage");
                if (stage) {
                    stage.innerHTML = '<div class="tm-media-alert">Không thể tải dữ liệu Khuyên Người Niệm Phật: ' + escapeHtml(String(err)) + '</div>';
                }
            });

        if (!window._tmKnnpGlobalEventsBound) {
            window._tmKnnpGlobalEventsBound = true;
            window.addEventListener("popstate", function () {
                if (knnpMasterData && document.getElementById("tm-knnp-reader")) {
                    var lnum = getRequestedKnnpLetter(1);
                    renderKnnpLetterView(lnum, false);
                }
            });

            document.addEventListener("keydown", function (e) {
                if (e.key === "Escape") {
                    window.tmKpcCloseShareModal();
                    return;
                }
                if (!knnpMasterData || !document.getElementById("tm-knnp-reader")) return;
                var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : "";
                if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) {
                    return;
                }
                var sm = document.getElementById("tm-kpc-share-modal");
                if (sm && sm.style.display !== "none") {
                    return;
                }
                if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
                    var aud = document.querySelector("audio");
                    var allAud = document.querySelectorAll("audio");
                    for (var ai = 0; ai < allAud.length; ai++) {
                        if (!allAud[ai].paused) {
                            aud = allAud[ai];
                            break;
                        }
                    }
                    if (aud) {
                        e.preventDefault();
                        window.tmAudioSeekBy(aud, (e.key === "ArrowLeft") ? -10 : 10);
                        return;
                    }
                }
                if (e.key === "ArrowLeft") {
                    window.tmKnnpStep(-1);
                } else if (e.key === "ArrowRight") {
                    window.tmKnnpStep(1);
                }
            });
        }
    }

    /* =========================================================================
       6. AUDIO & ALBUM LINK INTERCEPTOR (TRÁNH REDIRECT, MỞ BẰNG MEDIAPLAYER)
       ========================================================================= */
    window.tmCloseAbsAlbumModal = function () {
        var modal = document.getElementById("tm-abs-album-modal");
        if (!modal) return;
        var aud = modal.querySelector("audio");
        if (aud && !aud.paused) {
            aud.pause();
        }
        modal.style.display = "none";
        document.body.style.overflow = "";
    };

    window.tmMinimizeAbsModalToFloating = function () {
        var modal = document.getElementById("tm-abs-album-modal");
        if (!modal) return;
        var aud = modal.querySelector("audio");
        if (aud && typeof promoteAudioToFloatingBar === "function") {
            promoteAudioToFloatingBar(aud, true);
            modal.style.display = "none";
            document.body.style.overflow = "";
            return;
        }
        var np = modal.querySelector(".tm-abs-np-title");
        var title = np ? np.textContent : "Đang phát Audio";
        var src = aud ? (aud.currentSrc || aud.getAttribute("src") || "") : "";
        var curTime = aud ? (aud.currentTime || 0) : 0;
        var rate = aud ? (aud.playbackRate || 1.0) : 1.0;
        window.tmCloseAbsAlbumModal();
        if (src) {
            window.tmPlayInlineAudio(null, src, title, curTime, rate);
        }
    };

    window.tmOpenAbsAlbumModal = function (shareId, groups, customTitle) {
        if (!groups || !groups.length) return;
        var modal = document.getElementById("tm-abs-album-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "tm-abs-album-modal";
            modal.className = "tm-abs-modal-backdrop";
            modal.innerHTML =
                '<div class="tm-abs-modal-dialog" role="dialog" aria-modal="true" aria-label="Trình phát Album">' +
                '  <div class="tm-abs-modal-header">' +
                '    <span class="tm-abs-modal-label">📻 Danh sách Album Audio</span>' +
                '    <div class="tm-abs-modal-actions">' +
                '      <button type="button" class="tm-abs-modal-min" onclick="window.tmMinimizeAbsModalToFloating()" title="Thu nhỏ xuống thanh nổi để vừa đọc vừa nghe">⬇ Thanh nổi</button>' +
                '      <button type="button" class="tm-abs-modal-close" onclick="window.tmCloseAbsAlbumModal()" title="Đóng">✕ Đóng</button>' +
                '    </div>' +
                '  </div>' +
                '  <div id="tm-abs-modal-body" class="tm-abs-modal-body"></div>' +
                '</div>';
            modal.addEventListener("click", function (ev) {
                if (ev.target === modal) {
                    window.tmCloseAbsAlbumModal();
                }
            });
            document.addEventListener("keydown", function (ev) {
                if (ev.key === "Escape" && modal.style.display === "flex") {
                    window.tmCloseAbsAlbumModal();
                }
            });
            document.body.appendChild(modal);
        }

        var body = document.getElementById("tm-abs-modal-body");
        if (!body) return;

        var uid = "tmabs_modal_" + String(shareId || "album").replace(/[^a-zA-Z0-9_]/g, "");
        var firstGroup = groups[0];
        var firstTrack = (firstGroup.tracks && firstGroup.tracks[0]) ? firstGroup.tracks[0] : null;
        if (!firstTrack) return;

        var totalCount = 0;
        for (var g = 0; g < groups.length; g++) {
            totalCount += (groups[g].tracks || []).length;
        }
        var mainTitle = customTitle || firstGroup.title || "Album Pháp Âm";
        var firstDurSec = firstTrack.duration || 0;

        var html =
            '<div class="tm-absplayer" id="' + uid + '" data-groups="' + escapeHtml(JSON.stringify(groups)) + '" data-cur-group="0" data-cur-track="0">' +
            '  <div class="tm-abs-top">' +
            '    <div class="tm-abs-info">' +
            '      <div class="tm-abs-badge-row">' +
            '        <span class="tm-abs-livebadge">● PHÁT TRỰC TIẾP MP3 (AUDIOBOOKSHELF)</span>' +
            '        <span class="tm-abs-totalbadge">Tổng số: ' + totalCount + ' bài</span>' +
            '      </div>' +
            '      <div class="tm-abs-main-title">' + escapeHtml(mainTitle) + '</div>' +
            '      <div class="tm-abs-nowplaying">Đang chọn: <strong class="tm-abs-np-title">' + escapeHtml(firstTrack.title) + '</strong></div>' +
            '    </div>' +
            '    <div class="tm-audio-scrubber-row">' +
            '      <span class="tm-audio-time tm-time-cur">00:00</span>' +
            '      <input type="range" class="tm-audio-scrubber" min="0" max="' + Math.max(100, firstDurSec) + '" value="0" step="0.5" aria-label="Tua đến vị trí mong muốn" oninput="window.tmAudioSeekInput(this)" onchange="window.tmAudioSeekChange(this)" />' +
            '      <span class="tm-audio-time tm-time-dur">' + (formatDur(firstDurSec) || "00:00") + '</span>' +
            '    </div>' +
            '    <div class="tm-abs-controls-bar">' +
            '      <button type="button" class="tm-abs-btn" onclick="window.tmAbsPrev(\'' + uid + '\')" title="Bài trước">⏮ <span class="tm-btn-txt">Trước</span></button>' +
            '      <button type="button" class="tm-abs-btn tm-seek-btn" onclick="window.tmAudioSeekBy(this, -30)" title="Tua lùi 30 giây">⏪ 30s</button>' +
            '      <button type="button" class="tm-abs-btn tm-seek-btn" onclick="window.tmAudioSeekBy(this, -10)" title="Tua lùi 10 giây">⏪ 10s</button>' +
            '      <button type="button" class="tm-abs-btn tm-play-btn" onclick="window.tmAudioTogglePlay(this)" title="Phát hoặc tạm dừng"><span class="tm-play-icon">▶</span> <span class="tm-play-txt">Phát</span></button>' +
            '      <button type="button" class="tm-abs-btn tm-seek-btn" onclick="window.tmAudioSeekBy(this, 10)" title="Tua tới 10 giây">10s ⏩</button>' +
            '      <button type="button" class="tm-abs-btn tm-seek-btn" onclick="window.tmAudioSeekBy(this, 30)" title="Tua tới 30 giây">30s ⏩</button>' +
            '      <button type="button" class="tm-abs-btn" onclick="window.tmAbsNext(\'' + uid + '\')" title="Bài tiếp theo"><span class="tm-btn-txt">Tiếp</span> ⏭</button>' +
            '      <select class="tm-abs-speed" onchange="window.tmAbsSpeed(\'' + uid + '\', this.value)" title="Tốc độ phát">' +
            '        <option value="0.85">0.85x</option>' +
            '        <option value="1" selected>1.0x</option>' +
            '        <option value="1.15">1.15x</option>' +
            '        <option value="1.25">1.25x</option>' +
            '        <option value="1.5">1.5x</option>' +
            '      </select>' +
            '      <audio class="tm-abs-audio" preload="metadata" src="' + escapeHtml(firstTrack.src) + '" style="display:none;"></audio>' +
            '    </div>' +
            '  </div>';

        if (groups.length > 1) {
            html += '<div class="tm-abs-tabs">';
            for (var gi = 0; gi < groups.length; gi++) {
                var act = (gi === 0) ? " active" : "";
                html += '<button type="button" class="tm-abs-tab' + act + '" data-gidx="' + gi + '" onclick="window.tmAbsSwitchGroup(\'' + uid + '\', ' + gi + ')">' +
                        '📁 ' + escapeHtml(groups[gi].title) + ' <span class="tm-abs-tab-count">(' + (groups[gi].tracks || []).length + ')</span>' +
                        '</button>';
            }
            html += '</div>';
        }

        html += '<div class="tm-abs-toolbar">' +
                '  <input type="search" class="tm-abs-search" placeholder="🔍 Tìm nhanh tên bài giảng / câu chuyện..." oninput="window.tmAbsFilter(\'' + uid + '\', this.value)" />' +
                '</div>' +
                '<div class="tm-abs-scroll-hint">↔ Vuốt ngang để xem đầy đủ danh sách</div>' +
                '<div class="tm-abs-tracklist">';

        for (var ti = 0; ti < firstGroup.tracks.length; ti++) {
            var t = firstGroup.tracks[ti];
            var tAct = (ti === 0) ? " active" : "";
            html += '<div class="tm-abs-track' + tAct + '" data-tidx="' + ti + '" data-title="' + escapeHtml((t.title || "").toLowerCase()) + '" onclick="window.tmAbsPlayTrack(\'' + uid + '\', 0, ' + ti + ')">' +
                    '  <span class="tm-abs-t-num">' + (ti + 1) + '</span>' +
                    '  <span class="tm-abs-t-name">' + escapeHtml(t.title) + '</span>' +
                    '  <span class="tm-abs-t-dur">' + formatDur(t.duration) + '</span>' +
                    '  <span class="tm-abs-t-play">▶ Phát</span>' +
                    '  <a class="tm-abs-t-down" href="' + escapeHtml(t.src) + '" download target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" title="Tải file MP3">💾 Tải</a>' +
                    '</div>';
        }

        html += '</div></div>';
        body.innerHTML = html;

        var box = document.getElementById(uid);
        var audio = box ? box.querySelector(".tm-abs-audio") : null;
        if (audio) {
            pauseOtherAudios(audio);
            audio.addEventListener("ended", function () {
                window.tmAbsNext(uid);
            });
            window.tmBindAudioScrubber(box, audio, firstDurSec);
        }

        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    };

    function resolveLinkTitle(link) {
        var row = link.closest ? link.closest("tr") : null;
        if (row) {
            var cells = row.querySelectorAll("td");
            var parts = [];
            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                // Bỏ qua các ô chỉ chứa nút bấm (Nghe MP3, Đọc bài, Album)
                if (cell.querySelector("a")) {
                    var onlyLinkText = cell.textContent.trim();
                    if (/^(▶|🎧|📖|📻|💾|Nghe|Đọc|Album|Tải)/i.test(onlyLinkText)) {
                        continue;
                    }
                }
                var txt = cell.textContent.replace(/\s+/g, " ").trim();
                if (txt) parts.push(txt);
                if (parts.length >= 2) break;
            }
            if (parts.length > 0) {
                return parts.join(" — ");
            }
        }

        var bq = link.closest ? link.closest("blockquote") : null;
        if (bq) {
            var prev = bq.previousElementSibling;
            while (prev) {
                if (/^H[1-4]$/.test(prev.tagName)) {
                    return prev.textContent.trim();
                }
                prev = prev.previousElementSibling;
            }
            var h1 = document.querySelector("article h1, h1");
            if (h1) return h1.textContent.trim();
        }

        var rawText = (link.textContent || "").replace(/[▶🎧📻💾]/g, "").trim();
        if (rawText && !/^(Nghe MP3|Bấm để nghe trực tiếp file MP3|Nghe)$/i.test(rawText)) {
            return rawText;
        }
        var pageH1 = document.querySelector("article h1, h1");
        return pageH1 ? pageH1.textContent.trim() : document.title;
    }

    function normalizeBuhdTitle(str) {
        if (!str) return "";
        var s = str;
        if (s.normalize) s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        s = s.replace(/[đĐ]/g, "d").toLowerCase();
        s = s.replace(/^\s*\d+\.\s*/, "");
        s = s.replace(/\s*[-_]\s*(bao ung hien doi|quyen \d+|tap \d+|hanh doan).*$/i, "");
        s = s.replace(/\bbinh\b/g, "benh");
        s = s.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
        return s;
    }

    function findBestBuhdTrack(groups, headingText) {
        if (!groups || !groups.length) return null;
        var allTracks = [];
        for (var g = 0; g < groups.length; g++) {
            var trs = groups[g].tracks || [];
            for (var i = 0; i < trs.length; i++) {
                allTracks.push(trs[i]);
            }
        }
        if (!allTracks.length) return null;

        var nh = normalizeBuhdTitle(headingText);
        if (!nh) return allTracks[0];

        if (/^(loi nguoi dich|loi tac gia|loi mo dau|loi noi dau|tu thuat)/.test(nh)) {
            for (var k = 0; k < allTracks.length; k++) {
                var nt0 = normalizeBuhdTitle(allTracks[k].title);
                if (/(loi nguoi dich|loi tac gia|loi mo dau|loi noi dau)/.test(nt0)) {
                    return allTracks[k];
                }
            }
        }

        // 1. Exact or substring match
        for (var a = 0; a < allTracks.length; a++) {
            var nt = normalizeBuhdTitle(allTracks[a].title);
            if (nt === nh || (nh.length > 4 && (nt.indexOf(nh) !== -1 || nh.indexOf(nt) !== -1))) {
                return allTracks[a];
            }
        }

        // 2. Word-overlap Dice score
        var hWords = nh.split(" ");
        var bestTrack = null;
        var bestScore = 0;
        for (var b = 0; b < allTracks.length; b++) {
            var nt2 = normalizeBuhdTitle(allTracks[b].title);
            var tWords = nt2.split(" ");
            var common = 0;
            for (var wi = 0; wi < hWords.length; wi++) {
                if (hWords[wi].length > 1 && tWords.indexOf(hWords[wi]) !== -1) {
                    common++;
                }
            }
            var score = (2 * common) / (hWords.length + tWords.length);
            if (score > bestScore) {
                bestScore = score;
                bestTrack = allTracks[b];
            }
        }
        return (bestScore >= 0.5) ? bestTrack : null;
    }

    function findNearestStoryHeading(el) {
        var cur = (el && el.closest) ? (el.closest("blockquote") || el) : el;
        while (cur) {
            if (/^H[2-4]$/.test(cur.tagName)) {
                return cur.textContent.replace(/#\s*$/, "").trim();
            }
            cur = cur.previousElementSibling;
        }
        return "";
    }

    function getLiveSharesMap() {
        var jsonEl = document.getElementById("tm-abs-shares-json");
        if (!jsonEl) return {};
        try {
            return JSON.parse(jsonEl.textContent || "{}") || {};
        } catch (err) {
            return {};
        }
    }

    function getLiveBuhdAudioMap() {
        var buhdEl = document.getElementById("tm-buhd-audio-json");
        if (!buhdEl) return {};
        try {
            return JSON.parse(buhdEl.textContent || "{}") || {};
        } catch (err) {
            return {};
        }
    }

    function initAudioLinkInterceptor() {
        if (window._tmAudioLinkInterceptorBound) return;
        window._tmAudioLinkInterceptorBound = true;

        document.addEventListener("click", function (e) {
            var link = e.target && e.target.closest ? e.target.closest("a") : null;
            if (!link) return;
            if (
                link.hasAttribute("download") ||
                link.classList.contains("tm-abs-t-down") ||
                link.classList.contains("tm-track-btn-download") ||
                link.classList.contains("tm-fab-down") ||
                link.classList.contains("tm-abs-extlink")
            ) {
                return;
            }

            var href = link.getAttribute("href") || "";
            if (!href) return;

            // 1. Link Album Audiobookshelf Share -> Mở Modal Player có danh sách đầy đủ
            var shareMatch = href.match(/audiobookshelf\/share\/([A-Za-z0-9_-]+)/);
            if (shareMatch) {
                var sharesMap = getLiveSharesMap();
                if (sharesMap[shareMatch[1]]) {
                    e.preventDefault();
                    window.tmOpenAbsAlbumModal(shareMatch[1], sharesMap[shareMatch[1]]);
                    return;
                }
            }

            // 2. Link "🎧 Nghe Audio Tập X" trong từng câu chuyện BUHD -> Phát ngay ở trang đọc bằng Floating Player
            var buhdMatch = href.match(/bao-ung-hien-doi-tuyen-tap\/bao-ung-hien-doi-tap-([1-7])\b/);
            if (buhdMatch && /nghe\s*audio/i.test(link.textContent || "")) {
                var buhdAudioMap = getLiveBuhdAudioMap();
                if (buhdAudioMap[buhdMatch[1]]) {
                    e.preventDefault();
                    var vol = buhdMatch[1];
                    var groups = buhdAudioMap[vol];
                    var heading = findNearestStoryHeading(link);
                    var matchedTrack = findBestBuhdTrack(groups, heading);
                    if (matchedTrack && matchedTrack.src) {
                        window.tmPlayInlineAudio(link, matchedTrack.src, matchedTrack.title || heading);
                    } else {
                        window.tmOpenAbsAlbumModal("buhd" + vol, groups, "Báo Ứng Hiện Đời — Tập " + vol);
                    }
                    return;
                }
            }

            // 3. Link nghe MP3 trực tiếp -> Mở Floating Audio Bar ngay trên trang
            var isAbsFile = /audiobookshelf\/api\/items\/[^/]+\/file\//.test(href);
            var isMp3Url = /\.mp3(\?.*)?$/i.test(href);
            if (isAbsFile || isMp3Url) {
                var txt = (link.textContent || "").trim();
                if (/tải\s*(file\s*)?mp3|download/i.test(txt)) {
                    return;
                }
                e.preventDefault();
                var title = resolveLinkTitle(link);
                window.tmPlayInlineAudio(link, href, title);
            }
        });
    }

    /* =====================================================================
       IMAGE GALLERY LIGHTBOX & DOWNLOAD SIZE CHOOSER (Medium vs Full Max)
       ===================================================================== */
    var galState = { uid: null, items: [], idx: 0 };

    function ensureGalleryLightbox() {
        var lb = document.getElementById("tm-gallery-lightbox");
        if (lb) return lb;
        lb = document.createElement("div");
        lb.id = "tm-gallery-lightbox";
        lb.className = "tm-gallery-lightbox";
        lb.style.display = "none";
        lb.innerHTML =
            '<div class="tm-gal-lb-backdrop" onclick="window.tmGalleryClose()"></div>' +
            '<div class="tm-gal-lb-dialog" role="dialog" aria-modal="true">' +
            '  <div class="tm-gal-lb-topbar">' +
            '    <span class="tm-gal-lb-counter" id="tm-gal-lb-counter">1 / 1</span>' +
            '    <span class="tm-gal-lb-caption" id="tm-gal-lb-caption"></span>' +
            '    <button type="button" class="tm-gal-lb-close" onclick="window.tmGalleryClose()" aria-label="Đóng">✕</button>' +
            '  </div>' +
            '  <div class="tm-gal-lb-stage">' +
            '    <button type="button" class="tm-gal-lb-nav tm-gal-lb-prev" onclick="window.tmGalleryStep(-1)" aria-label="Ảnh trước">‹</button>' +
            '    <img id="tm-gal-lb-img" class="tm-gal-lb-img" src="" alt="" />' +
            '    <button type="button" class="tm-gal-lb-nav tm-gal-lb-next" onclick="window.tmGalleryStep(1)" aria-label="Ảnh tiếp theo">›</button>' +
            '  </div>' +
            '  <div class="tm-gal-lb-footer" id="tm-gal-lb-footer"></div>' +
            '</div>';
        document.body.appendChild(lb);

        document.addEventListener("keydown", function (e) {
            var el = document.getElementById("tm-gallery-lightbox");
            if (!el || el.style.display === "none") return;
            if (e.key === "Escape") {
                window.tmGalleryClose();
            } else if (e.key === "ArrowLeft") {
                window.tmGalleryStep(-1);
            } else if (e.key === "ArrowRight") {
                window.tmGalleryStep(1);
            }
        });
        return lb;
    }

    function renderGalleryLightboxItem() {
        var item = galState.items[galState.idx];
        if (!item) return;
        var imgEl = document.getElementById("tm-gal-lb-img");
        var cntEl = document.getElementById("tm-gal-lb-counter");
        var capEl = document.getElementById("tm-gal-lb-caption");
        var ftrEl = document.getElementById("tm-gal-lb-footer");

        if (imgEl) {
            imgEl.src = item.preview || item.medium || item.thumb;
            imgEl.alt = item.caption || ("Hình ảnh " + (galState.idx + 1));
        }
        if (cntEl) cntEl.textContent = (galState.idx + 1) + " / " + galState.items.length;
        if (capEl) capEl.textContent = item.caption || "";

        if (ftrEl) {
            var html = '<div class="tm-gal-dl-group">';
            if (item.is_large || (item.medium && item.medium !== item.max)) {
                var medTxt = "⬇ Tải bản Vừa (Medium" + (item.med_label ? " • " + item.med_label : "") + ")";
                var maxTxt = "⬇ Tải bản Gốc (Full Max" + (item.max_label ? " • " + item.max_label : "") + ")";
                html += '<a class="tm-gal-dl-btn tm-gal-dl-med" style="text-decoration:none;" href="' + buildDownloadHref(item.medium) + '" download> ' + medTxt + '</a>';
                html += '<a class="tm-gal-dl-btn tm-gal-dl-max" style="text-decoration:none;" href="' + buildDownloadHref(item.max) + '" download> ' + maxTxt + '</a>';
            } else {
                var fullTxt = "⬇ Tải ảnh Gốc (Full" + (item.max_label ? " • " + item.max_label : "") + ")";
                html += '<a class="tm-gal-dl-btn tm-gal-dl-max" style="text-decoration:none;" href="' + buildDownloadHref(item.max) + '" download>' + fullTxt + '</a>';
                if (item.thumb && item.thumb !== item.max) {
                    html += '<a class="tm-gal-dl-btn tm-gal-dl-med" style="text-decoration:none;" href="' + buildDownloadHref(item.thumb) + '" download>⬇ Tải bản Nhỏ (Thumb)</a>';
                }
            }
            html += '<button type="button" class="tm-gal-dl-btn tm-gal-dl-med" id="tm-gal-share-btn" onclick="window.tmGalleryShare()">🔗 Chia sẻ ảnh</button>';
            html += '</div>';
            ftrEl.innerHTML = html;
        }
    }

    function buildDownloadHref(url) {
        return window.location.pathname + "?tm_gal_dl=1&url=" + encodeURIComponent(url);
    }

    window.tmGalleryOpen = function (uid, idx) {
        var wrapEl = document.getElementById(uid);
        var dataEl = document.getElementById("tm-gallery-data-" + uid);
        var rawJson = "";
        if (wrapEl && wrapEl.getAttribute("data-items")) {
            rawJson = wrapEl.getAttribute("data-items");
        } else if (dataEl) {
            rawJson = dataEl.textContent || "[]";
        }
        try {
            galState.items = JSON.parse(rawJson || "[]");
        } catch (e) {
            galState.items = [];
        }
        if (!galState.items.length) return;
        galState.uid = uid;
        galState.idx = Math.max(0, Math.min(idx || 0, galState.items.length - 1));
        var lb = ensureGalleryLightbox();
        lb.style.display = "flex";
        document.body.style.overflow = "hidden";
        renderGalleryLightboxItem();
    };

    document.addEventListener("click", function (e) {
        var card = e.target && e.target.closest ? e.target.closest(".tm-gallery-card[data-gal-uid]") : null;
        if (!card) return;
        e.preventDefault();
        var uid = card.getAttribute("data-gal-uid");
        var idx = parseInt(card.getAttribute("data-gal-idx") || "0", 10);
        window.tmGalleryOpen(uid, idx);
    });

    document.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        var card = e.target && e.target.closest ? e.target.closest(".tm-gallery-card[data-gal-uid]") : null;
        if (!card) return;
        e.preventDefault();
        var uid = card.getAttribute("data-gal-uid");
        var idx = parseInt(card.getAttribute("data-gal-idx") || "0", 10);
        window.tmGalleryOpen(uid, idx);
    });

    window.tmGalleryClose = function () {
        var lb = document.getElementById("tm-gallery-lightbox");
        if (lb) lb.style.display = "none";
        document.body.style.overflow = "";
    };

    window.tmGalleryStep = function (delta) {
        if (!galState.items.length) return;
        galState.idx = (galState.idx + delta + galState.items.length) % galState.items.length;
        renderGalleryLightboxItem();
    };

    window.tmGalleryShare = function () {
        var item = galState.items[galState.idx];
        if (!item) return;
        var shareUrl = window.location.origin + window.location.pathname + "?img=" + (galState.idx + 1);
        var title = (item.caption || document.title || "Hình ảnh Tịnh Độ");
        var btn = document.getElementById("tm-gal-share-btn");

        if (navigator.share) {
            navigator.share({
                title: title,
                text: title,
                url: shareUrl
            }).catch(function () {});
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(function () {
                if (btn) {
                    var old = btn.textContent;
                    btn.textContent = "✅ Đã chép link ảnh!";
                    setTimeout(function () { btn.textContent = old; }, 2000);
                }
            }).catch(function () {
                window.prompt("Sao chép liên kết ảnh:", shareUrl);
            });
        } else {
            window.prompt("Sao chép liên kết ảnh:", shareUrl);
        }
    };

    (function checkGalleryDeepLink() {
        var m = window.location.search.match(/[?&]img=(\d+)/);
        if (!m) return;
        var targetIdx = Math.max(0, parseInt(m[1], 10) - 1);
        var tryOpen = function () {
            var wrap = document.querySelector(".tm-gallery-wrap[id]");
            if (wrap) {
                window.tmGalleryOpen(wrap.id, targetIdx);
            }
        };
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", tryOpen);
        } else {
            setTimeout(tryOpen, 80);
        }
    })();

    /* =========================================================================
       8. PLAYBACK PROGRESS PERSISTENCE, FLOATING BACKGROUND MODE & PJAX ROUTER
       ========================================================================= */
    var TRACK_PROG_KEY = "tm_media_track_progress_v1";
    var ALBUM_PROG_KEY = "tm_media_album_progress_v1";
    var LAST_SESSION_KEY = "tm_media_last_session_v1";
    var YT_PROG_KEY = "tm_media_yt_progress_v1";
    var BG_PREF_SESSION_KEY = "tm_bg_nav_pref_v1";

    var bgAudioConfirmed = false;
    var bgVideoConfirmed = false;
    var lastProgressSaveTs = 0;
    var PROGRESS_CHECKPOINT_MS = 15000;
    var storageMemCache = {};
    var ytStates = {};
    var ytIframeSeq = 0;

    function readJsonStorage(key, fallback) {
        if (Object.prototype.hasOwnProperty.call(storageMemCache, key)) {
            return storageMemCache[key];
        }
        try {
            var raw = localStorage.getItem(key);
            if (!raw) {
                storageMemCache[key] = fallback;
                return fallback;
            }
            var parsed = JSON.parse(raw);
            var val = (parsed && typeof parsed === "object") ? parsed : fallback;
            storageMemCache[key] = val;
            return val;
        } catch (e) {
            return fallback;
        }
    }

    function writeJsonStorage(key, val) {
        storageMemCache[key] = val;
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {}
    }

    function normalizeTrackKey(src) {
        if (!src) return "";
        var s = String(src).trim();
        try {
            var u = new URL(s, window.location.origin);
            u.searchParams.delete("token");
            return u.origin + u.pathname + (u.search ? u.search : "");
        } catch (e) {
            return s.replace(/([?&])token=[^&]+(&|$)/, "$1").replace(/[?&]$/, "");
        }
    }

    function computeAlbumKey(groups, fallbackId) {
        if (groups && groups.length) {
            var keys = [];
            for (var i = 0; i < groups.length; i++) {
                if (groups[i] && (groups[i].key || groups[i].id)) {
                    keys.push(groups[i].key || groups[i].id);
                }
            }
            if (keys.length) return keys.join(",");
            if (groups[0] && groups[0].tracks && groups[0].tracks[0] && groups[0].tracks[0].src) {
                return "src_" + normalizeTrackKey(groups[0].tracks[0].src).slice(-60);
            }
        }
        return fallbackId || (window.location.pathname || "album");
    }

    function pruneStorageMap(mapObj, maxEntries) {
        var keys = Object.keys(mapObj || {});
        if (keys.length <= maxEntries) return mapObj;
        keys.sort(function (a, b) {
            return ((mapObj[b] && mapObj[b].u) || 0) - ((mapObj[a] && mapObj[a].u) || 0);
        });
        var trimmed = {};
        for (var i = 0; i < maxEntries; i++) {
            trimmed[keys[i]] = mapObj[keys[i]];
        }
        return trimmed;
    }

    function getSavedTrackProgress(src) {
        var k = normalizeTrackKey(src);
        if (!k) return null;
        var map = readJsonStorage(TRACK_PROG_KEY, {});
        return map[k] || null;
    }

    function getAudioContextTitle(audioEl) {
        if (!audioEl) return "Pháp âm MP3";
        if (audioEl.id === "tm-fab-player") {
            var fn = document.getElementById("tm-fab-name");
            if (fn && fn.textContent.trim()) return fn.textContent.trim();
        }
        var absBox = audioEl.closest ? audioEl.closest(".tm-absplayer") : null;
        if (absBox) {
            var np = absBox.querySelector(".tm-abs-np-title");
            if (np && np.textContent.trim()) return np.textContent.trim();
        }
        var hubBox = audioEl.closest ? audioEl.closest(".tm-mediahub") : null;
        if (hubBox) {
            var hnp = hubBox.querySelector(".tm-hub-np-name");
            if (hnp && hnp.textContent.trim()) return hnp.textContent.trim();
        }
        var knnpCard = audioEl.closest ? audioEl.closest(".tm-knnp-audio-card") : null;
        if (knnpCard) {
            var kt = knnpCard.querySelector(".tm-knnp-audio-title");
            if (kt && kt.textContent.trim()) return kt.textContent.trim();
        }
        var audBox = audioEl.closest ? audioEl.closest(".tm-audio-box") : null;
        if (audBox) {
            var at = audBox.querySelector(".tm-audio-title");
            if (at && at.textContent.trim()) return at.textContent.replace(/^🎧\s*/, "").trim();
        }
        return document.title || "Pháp âm MP3";
    }

    function recordAudioProgress(audioEl, forceImmediate) {
        if (!audioEl) return;
        var now = Date.now();
        if (!forceImmediate && (now - lastProgressSaveTs < PROGRESS_CHECKPOINT_MS)) {
            return;
        }
        lastProgressSaveTs = now;

        var src = audioEl.currentSrc || audioEl.getAttribute("src") || "";
        if (!src) {
            var sEl = audioEl.querySelector("source");
            if (sEl) src = sEl.getAttribute("src") || "";
        }
        if (!src) return;

        var cur = audioEl.currentTime || 0;
        var dur = (!isNaN(audioEl.duration) && isFinite(audioEl.duration) && audioEl.duration > 0) ? Math.round(audioEl.duration) : 0;
        var rate = audioEl.playbackRate || 1.0;
        var title = getAudioContextTitle(audioEl);
        var normKey = normalizeTrackKey(src);

        // 1. Save individual track progress if > 3s and not at the very end
        if (normKey && cur > 3 && (!dur || cur < dur - 5)) {
            var tMap = readJsonStorage(TRACK_PROG_KEY, {});
            tMap[normKey] = {
                t: Math.round(cur * 10) / 10,
                d: dur,
                r: rate,
                title: title,
                u: now
            };
            writeJsonStorage(TRACK_PROG_KEY, pruneStorageMap(tMap, 200));
        }

        // 2. Save album-level progress if inside .tm-absplayer or floating playlist
        var absBox = audioEl.closest ? audioEl.closest(".tm-absplayer") : null;
        var albumGroups = null;
        var gIdx = 0;
        var tIdx = 0;
        var albumKey = "";

        if (absBox && absBox.id) {
            albumGroups = getAbsGroups(absBox.id);
            gIdx = parseInt(absBox.getAttribute("data-cur-group") || "0", 10);
            tIdx = parseInt(absBox.getAttribute("data-cur-track") || "0", 10);
            albumKey = computeAlbumKey(albumGroups, absBox.id);
        } else if (audioEl.id === "tm-fab-player" && fabPlaylistState && fabPlaylistState.groups) {
            albumGroups = fabPlaylistState.groups;
            gIdx = fabPlaylistState.gIdx || 0;
            tIdx = fabPlaylistState.tIdx || 0;
            albumKey = fabPlaylistState.albumKey || computeAlbumKey(albumGroups, "fab");
        }

        if (albumKey && (cur > 3 || gIdx > 0 || tIdx > 0)) {
            var aMap = readJsonStorage(ALBUM_PROG_KEY, {});
            aMap[albumKey] = {
                gIdx: gIdx,
                tIdx: tIdx,
                src: src,
                t: Math.round(cur * 10) / 10,
                d: dur,
                r: rate,
                title: title,
                u: now
            };
            writeJsonStorage(ALBUM_PROG_KEY, pruneStorageMap(aMap, 60));
        }

        // 3. Save global last session if floating bar is visible or track is actively playing > 3s
        var fabBar = document.getElementById("tm-floating-audio-bar");
        var isFabOpen = !!(fabBar && fabBar.style.display !== "none" && audioEl.id === "tm-fab-player");
        if ((isFabOpen || cur > 3) && (!dur || cur < dur - 5)) {
            var totalTracks = 0;
            if (albumGroups) {
                for (var gi = 0; gi < albumGroups.length; gi++) {
                    totalTracks += ((albumGroups[gi] && albumGroups[gi].tracks) ? albumGroups[gi].tracks.length : 0);
                }
            }
            var originUrl = (fabPlaylistState && fabPlaylistState.originUrl)
                ? fabPlaylistState.originUrl
                : (window.location.pathname + window.location.search);

            writeJsonStorage(LAST_SESSION_KEY, {
                active: true,
                mode: "audio",
                src: src,
                title: title,
                t: Math.round(cur * 10) / 10,
                d: dur,
                r: rate,
                albumKey: albumKey || "",
                groups: (albumGroups && totalTracks <= 120) ? albumGroups : null,
                gIdx: gIdx,
                tIdx: tIdx,
                originUrl: originUrl,
                u: now
            });
        }
    }

    function clearTrackProgressOnEnded(audioEl) {
        if (!audioEl) return;
        var src = audioEl.currentSrc || audioEl.getAttribute("src") || "";
        var normKey = normalizeTrackKey(src);
        if (normKey) {
            var tMap = readJsonStorage(TRACK_PROG_KEY, {});
            if (tMap[normKey]) {
                delete tMap[normKey];
                writeJsonStorage(TRACK_PROG_KEY, tMap);
            }
        }
    }

    function dismissLastSession(mode) {
        var sess = readJsonStorage(LAST_SESSION_KEY, null);
        if (sess && (!mode || sess.mode === mode)) {
            sess.active = false;
            writeJsonStorage(LAST_SESSION_KEY, sess);
        }
    }

    function restoreAbsPlayerProgress(box, groups, activeFabSrc) {
        if (!box || !box.id || !groups || !groups.length) return;
        var albumKey = computeAlbumKey(groups, box.id);
        var aMap = readJsonStorage(ALBUM_PROG_KEY, {});
        var saved = aMap[albumKey];
        if (!saved) return;

        if (activeFabSrc && normalizeTrackKey(activeFabSrc) === normalizeTrackKey(saved.src)) {
            return;
        }

        var gIdx = saved.gIdx || 0;
        var tIdx = saved.tIdx || 0;
        if (!groups[gIdx] || !groups[gIdx].tracks || !groups[gIdx].tracks[tIdx]) {
            return;
        }
        if (gIdx === 0 && tIdx === 0 && !(saved.t > 5)) {
            return;
        }

        // If saved in another group tab, render that group's track rows without autoplaying
        if (gIdx > 0) {
            var g = groups[gIdx];
            var tabs = box.querySelectorAll(".tm-abs-tab");
            tabs.forEach(function (tab, i) {
                tab.classList.toggle("active", i === gIdx);
            });
            var listEl = box.querySelector(".tm-abs-tracklist");
            if (listEl && g.tracks) {
                var html = "";
                g.tracks.forEach(function (t, ti) {
                    html +=
                        '<div class="tm-abs-track' + (ti === tIdx ? " active" : "") + '" data-tidx="' + ti + '" data-title="' + escapeHtml((t.title || "").toLowerCase()) + '" onclick="window.tmAbsPlayTrack(\'' + box.id + '\', ' + gIdx + ', ' + ti + ')">' +
                        '  <span class="tm-abs-t-num">' + (ti + 1) + '</span>' +
                        '  <span class="tm-abs-t-name">' + escapeHtml(t.title) + '</span>' +
                        '  <span class="tm-abs-t-dur">' + formatDur(t.duration) + '</span>' +
                        '  <span class="tm-abs-t-play">' + (ti === tIdx ? "📌 Đã chọn" : "▶ Phát") + '</span>' +
                        (t.src ? ('  <a class="tm-abs-t-down" href="' + escapeHtml(t.src) + '" download target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" title="Tải file MP3">💾 Tải</a>') : '') +
                        '</div>';
                });
                listEl.innerHTML = html;
            }
        }

        var speedSel = box.querySelector(".tm-abs-speed");
        if (speedSel && saved.r) {
            speedSel.value = String(saved.r);
        }

        window.tmAbsPlayTrack(box.id, gIdx, tIdx, false, saved.t || 0);

        var trackObj = groups[gIdx].tracks[tIdx];
        var topArea = box.querySelector(".tm-abs-top");
        if (topArea && !topArea.querySelector(".tm-resume-banner")) {
            var banner = document.createElement("div");
            banner.className = "tm-resume-banner";
            var timeLabel = saved.t > 0 ? (" • <strong>" + formatDur(saved.t) + "</strong>") : "";
            banner.innerHTML =
                '<span class="tm-resume-banner-text">↺ Đã nhớ lần nghe trước: <strong>' + escapeHtml(trackObj.title || ("Bài " + (tIdx + 1))) + '</strong>' + timeLabel + '</span>' +
                '<div class="tm-resume-banner-actions">' +
                '  <button type="button" class="tm-resume-btn-play">▶ Nghe tiếp</button>' +
                '  <button type="button" class="tm-resume-btn-reset">↺ Nghe từ đầu</button>' +
                '</div>';

            var playBtn = banner.querySelector(".tm-resume-btn-play");
            var resetBtn = banner.querySelector(".tm-resume-btn-reset");
            if (playBtn) {
                playBtn.addEventListener("click", function () {
                    banner.remove();
                    var aud = box.querySelector(".tm-abs-audio");
                    if (aud) {
                        if (saved.t > 0) applyAudioStartTime(aud, saved.t);
                        aud.play().catch(function () {});
                    }
                });
            }
            if (resetBtn) {
                resetBtn.addEventListener("click", function () {
                    banner.remove();
                    var mapNow = readJsonStorage(ALBUM_PROG_KEY, {});
                    delete mapNow[albumKey];
                    writeJsonStorage(ALBUM_PROG_KEY, mapNow);
                    clearTrackProgressOnEnded({ currentSrc: trackObj.src });
                    if (gIdx !== 0) {
                        window.tmAbsSwitchGroup(box.id, 0);
                    } else {
                        window.tmAbsPlayTrack(box.id, 0, 0, true, 0);
                    }
                });
            }
            topArea.insertBefore(banner, topArea.firstChild);
        }
    }

    function restoreFloatingSessionOnLoad() {
        var sess = readJsonStorage(LAST_SESSION_KEY, null);
        if (!sess || !sess.active || sess.mode !== "audio" || !sess.src || !(sess.t > 4)) {
            return;
        }
        // Avoid duplicating if current page already rendered a .tm-resume-banner for this exact album/track
        var pageAbs = document.querySelectorAll(".tm-absplayer");
        for (var i = 0; i < pageAbs.length; i++) {
            var groups = getAbsGroups(pageAbs[i].id);
            var aKey = computeAlbumKey(groups, pageAbs[i].id);
            if (sess.albumKey && aKey === sess.albumKey && pageAbs[i].querySelector(".tm-resume-banner")) {
                return;
            }
        }

        window.tmPlayInlineAudio(null, sess.src, sess.title || "Pháp âm đang nghe dở", sess.t, sess.r || 1.0, {
            paused: true,
            knownDuration: sess.d || 0,
            playlistState: {
                groups: sess.groups || null,
                gIdx: sess.gIdx || 0,
                tIdx: sess.tIdx || 0,
                albumKey: sess.albumKey || "",
                originUrl: sess.originUrl || "",
                originTitle: sess.title || ""
            }
        });
    }

    function syncMediaSessionForAudio(audioEl) {
        if (!("mediaSession" in navigator) || !audioEl) return;
        try {
            var title = getAudioContextTitle(audioEl);
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: "Thư Viện Tịnh Độ Liên Hoa",
                album: "Pháp Âm Niệm Phật & Hộ Niệm"
            });
            navigator.mediaSession.setActionHandler("play", function () {
                audioEl.play().catch(function () {});
            });
            navigator.mediaSession.setActionHandler("pause", function () {
                audioEl.pause();
            });
            navigator.mediaSession.setActionHandler("seekbackward", function () {
                window.tmAudioSeekBy(audioEl, -10);
            });
            navigator.mediaSession.setActionHandler("seekforward", function () {
                window.tmAudioSeekBy(audioEl, 30);
            });
            navigator.mediaSession.setActionHandler("previoustrack", function () {
                if (audioEl.id === "tm-fab-player" && fabPlaylistState && fabPlaylistState.groups) {
                    window.tmFabStepTrack(-1);
                } else if (audioEl._absUid && document.getElementById(audioEl._absUid)) {
                    window.tmAbsPrev(audioEl._absUid);
                }
            });
            navigator.mediaSession.setActionHandler("nexttrack", function () {
                if (audioEl.id === "tm-fab-player" && fabPlaylistState && fabPlaylistState.groups) {
                    window.tmFabStepTrack(1);
                } else if (audioEl._absUid && document.getElementById(audioEl._absUid)) {
                    window.tmAbsNext(audioEl._absUid);
                }
            });
        } catch (e) {}
    }

    // Save progress immediately on tab hide / screen lock / app switch / tab close
    function flushAllMediaProgressImmediate() {
        var allAud = document.querySelectorAll("audio");
        for (var i = 0; i < allAud.length; i++) {
            if (allAud[i].currentTime > 3) {
                recordAudioProgress(allAud[i], true);
            }
        }
        var ytIds = Object.keys(ytStates);
        for (var j = 0; j < ytIds.length; j++) {
            var yst = ytStates[ytIds[j]];
            if (yst && yst.videoId && yst.currentTime > 6) {
                yst.lastSaveTs = Date.now();
                saveYtProgress(yst.videoId, yst.currentTime, yst.title);
            }
        }
    }

    window.addEventListener("pagehide", flushAllMediaProgressImmediate);
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
            flushAllMediaProgressImmediate();
        }
    });

    /* --- Zero-Gap Promotion of In-Page Audio to Floating Bar --- */
    function promoteAudioToFloatingBar(audioEl, markConfirmed) {
        if (!audioEl) return;
        if (markConfirmed) bgAudioConfirmed = true;

        if (audioEl.id === "tm-fab-player") {
            var existingBar = ensureFloatingAudioBar();
            existingBar.style.display = "block";
            if (document.body) document.body.classList.add("tm-has-floating-audio");
            syncFloatingBarHeaderMeta();
            return;
        }

        var wasPlaying = !audioEl.paused;
        var title = getAudioContextTitle(audioEl);
        var src = audioEl.currentSrc || audioEl.getAttribute("src") || "";
        var rate = audioEl.playbackRate || 1.0;
        var knownDur = (!isNaN(audioEl.duration) && isFinite(audioEl.duration) && audioEl.duration > 0) ? audioEl.duration : 0;
        var originUrl = window.location.pathname + window.location.search;

        var playlistCtx = {
            groups: null,
            gIdx: 0,
            tIdx: 0,
            albumKey: "",
            originUrl: originUrl,
            originTitle: document.title
        };

        var absBox = audioEl.closest ? audioEl.closest(".tm-absplayer") : null;
        if (absBox && absBox.id) {
            var groups = getAbsGroups(absBox.id);
            playlistCtx.groups = groups;
            playlistCtx.gIdx = parseInt(absBox.getAttribute("data-cur-group") || "0", 10);
            playlistCtx.tIdx = parseInt(absBox.getAttribute("data-cur-track") || "0", 10);
            playlistCtx.albumKey = computeAlbumKey(groups, absBox.id);
        } else {
            var hubBox = audioEl.closest ? audioEl.closest(".tm-mediahub") : null;
            if (hubBox) {
                try {
                    var hubItems = JSON.parse(hubBox.getAttribute("data-items") || "[]");
                    var curItemIdx = parseInt(hubBox.getAttribute("data-cur-item") || "0", 10);
                    var curTrackIdx = parseInt(hubBox.getAttribute("data-cur-track") || "0", 10);
                    if (hubItems[curItemIdx] && hubItems[curItemIdx].tracks) {
                        playlistCtx.groups = [{
                            key: hubBox.id || "hub",
                            id: hubBox.id || "hub",
                            title: hubItems[curItemIdx].title || "MediaHub",
                            tracks: hubItems[curItemIdx].tracks
                        }];
                        playlistCtx.gIdx = 0;
                        playlistCtx.tIdx = curTrackIdx;
                        playlistCtx.albumKey = computeAlbumKey(playlistCtx.groups, hubBox.id);
                    }
                } catch (e) {}
            }
        }

        var bar = ensureFloatingAudioBar();
        var fabInner = bar.querySelector(".tm-fab-inner");
        var oldFabPlayer = document.getElementById("tm-fab-player");

        // Leave a silent clone in the old container so in-page DOM remains valid before PJAX swap
        if (audioEl.parentNode) {
            var standIn = document.createElement("audio");
            standIn.className = audioEl.className;
            standIn.preload = "none";
            standIn.src = src;
            standIn.style.display = "none";
            audioEl.parentNode.insertBefore(standIn, audioEl);
        }

        if (oldFabPlayer && oldFabPlayer !== audioEl) {
            oldFabPlayer.pause();
            oldFabPlayer.removeAttribute("id");
            if (oldFabPlayer.parentNode) {
                oldFabPlayer.parentNode.removeChild(oldFabPlayer);
            }
        }

        audioEl.id = "tm-fab-player";
        audioEl.style.display = "none";
        fabInner.appendChild(audioEl);

        fabPlaylistState = playlistCtx;
        bar.style.display = "block";
        if (document.body) document.body.classList.add("tm-has-floating-audio");

        var nameEl = document.getElementById("tm-fab-name");
        if (nameEl) nameEl.textContent = title;
        var downEl = document.getElementById("tm-fab-down");
        if (downEl) downEl.href = src || "#";
        var speedSel = document.getElementById("tm-fab-speed");
        if (speedSel) speedSel.value = String(rate);
        var pill = document.getElementById("tm-fab-resume-pill");
        if (pill) pill.style.display = "none";

        bindFabPlaylistEnded(audioEl);
        syncFloatingBarHeaderMeta();
        window.tmBindAudioScrubber(bar, audioEl, knownDur);

        if (wasPlaying && audioEl.paused) {
            audioEl.play().catch(function () {});
        }
        recordAudioProgress(audioEl, true);
    }

    /* --- YouTube IFrame API State Tracker & Floating Mini-Video (PiP) --- */
    function extractYoutubeIdFromUrl(url) {
        if (!url) return "";
        var m = String(url).match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/);
        if (m) return m[1];
        var pl = String(url).match(/[?&]list=([A-Za-z0-9_-]+)/);
        return pl ? ("pl_" + pl[1]) : "";
    }

    function getSavedYtProgress(vidId) {
        if (!vidId) return null;
        var map = readJsonStorage(YT_PROG_KEY, {});
        return map[vidId] || null;
    }

    function saveYtProgress(vidId, sec, title) {
        if (!vidId || !(sec > 6)) return;
        var map = readJsonStorage(YT_PROG_KEY, {});
        map[vidId] = {
            t: Math.floor(sec),
            title: title || "",
            u: Date.now()
        };
        writeJsonStorage(YT_PROG_KEY, pruneStorageMap(map, 80));
    }

    function sendYoutubeHandshake(iframe) {
        if (!iframe || !iframe.contentWindow) return;
        try {
            iframe.contentWindow.postMessage(JSON.stringify({
                event: "listening",
                id: iframe.id,
                channel: "widget"
            }), "*");
            iframe.contentWindow.postMessage(JSON.stringify({
                event: "command",
                func: "addEventListener",
                args: ["onStateChange"],
                id: iframe.id,
                channel: "widget"
            }), "*");
        } catch (e) {}
    }

    function registerYoutubeIframe(iframe, fallbackTitle) {
        if (!iframe) return;
        var src = iframe.getAttribute("src") || "";
        if (src.indexOf("youtube.com/embed/") === -1 && src.indexOf("youtube-nocookie.com/embed/") === -1) {
            return;
        }
        if (!iframe.id) {
            ytIframeSeq += 1;
            iframe.id = "tm_yt_ifr_" + ytIframeSeq;
        }
        var vidId = extractYoutubeIdFromUrl(src);
        if (!ytStates[iframe.id]) {
            ytStates[iframe.id] = {
                id: iframe.id,
                videoId: vidId,
                title: fallbackTitle || iframe.getAttribute("title") || document.title,
                state: -1,
                currentTime: 0
            };
        }
        if (iframe.getAttribute("data-tm-yt-bound") !== "1") {
            iframe.setAttribute("data-tm-yt-bound", "1");
            iframe.addEventListener("load", function () {
                sendYoutubeHandshake(iframe);
            });
        }
        sendYoutubeHandshake(iframe);
    }

    window.tmSeekYoutubeInContainer = function (container, seconds) {
        if (!container) return;
        var ifr = container.querySelector("iframe");
        if (!ifr) return;
        var src = ifr.getAttribute("src") || "";
        // If iframe already loaded JS API, send seekTo + playVideo; also fallback to start= reload if unstarted
        var st = ifr.id ? ytStates[ifr.id] : null;
        if (st && st.state !== -1 && ifr.contentWindow) {
            try {
                ifr.contentWindow.postMessage(JSON.stringify({ event: "command", func: "seekTo", args: [seconds, true] }), "*");
                ifr.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
                return;
            } catch (e) {}
        }
        var cleanSrc = src.replace(/([?&])(start|autoplay)=\d+(&|$)/g, "$1").replace(/[?&]+$/, "");
        cleanSrc += (cleanSrc.indexOf("?") === -1 ? "?" : "&") + "start=" + Math.floor(seconds) + "&autoplay=1";
        ifr.setAttribute("src", cleanSrc);
    };

    function initYoutubeEmbedsOnPage() {
        var containers = document.querySelectorAll(".tm-embed-container");
        containers.forEach(function (wrap) {
            var ifr = wrap.querySelector("iframe");
            if (!ifr) return;
            var title = wrap.getAttribute("data-embed-title") || ifr.getAttribute("title") || document.title;
            registerYoutubeIframe(ifr, title);

            var vidId = wrap.getAttribute("data-yt-id") || extractYoutubeIdFromUrl(ifr.getAttribute("src") || "");
            if (vidId && !wrap.querySelector(".tm-resume-banner")) {
                var saved = getSavedYtProgress(vidId);
                if (saved && saved.t > 8) {
                    var banner = document.createElement("div");
                    banner.className = "tm-resume-banner";
                    banner.innerHTML =
                        '<span class="tm-resume-banner-text">↺ Lần trước đang xem video đến <strong>' + formatDur(saved.t) + '</strong></span>' +
                        '<div class="tm-resume-banner-actions">' +
                        '  <button type="button" class="tm-resume-btn-play">▶ Xem tiếp từ ' + formatDur(saved.t) + '</button>' +
                        '  <button type="button" class="tm-resume-btn-reset">Bỏ qua</button>' +
                        '</div>';
                    var pBtn = banner.querySelector(".tm-resume-btn-play");
                    var rBtn = banner.querySelector(".tm-resume-btn-reset");
                    if (pBtn) {
                        pBtn.addEventListener("click", function () {
                            banner.remove();
                            window.tmSeekYoutubeInContainer(wrap, saved.t);
                        });
                    }
                    if (rBtn) {
                        rBtn.addEventListener("click", function () {
                            banner.remove();
                            var m = readJsonStorage(YT_PROG_KEY, {});
                            delete m[vidId];
                            writeJsonStorage(YT_PROG_KEY, m);
                        });
                    }
                    wrap.insertBefore(banner, wrap.firstChild);
                }
            }
        });
    }

    var floatingVideoOriginUrl = "";

    function ensureFloatingVideoBox() {
        var box = document.getElementById("tm-floating-video-box");
        if (box) return box;
        box = document.createElement("div");
        box.id = "tm-floating-video-box";
        box.className = "tm-floating-video-box";
        box.style.display = "none";
        box.innerHTML =
            '<div class="tm-fv-header">' +
            '  <span class="tm-fv-title" id="tm-fv-title">🎬 Video đang phát</span>' +
            '  <div class="tm-fv-actions">' +
            '    <a id="tm-fv-origin" class="tm-fv-btn" href="#" style="display:none;" title="Quay về bài viết gốc">↗ Bài gốc</a>' +
            '    <button type="button" class="tm-fv-btn" onclick="window.tmToggleFloatingVideoSize()" title="Phóng vừa / Thu gọn khung hình">⤢</button>' +
            '    <button type="button" class="tm-fv-btn" onclick="window.tmToggleFloatingVideoCollapse()" title="Ẩn/Hiện khung hình video">―</button>' +
            '    <button type="button" class="tm-fv-btn" onclick="window.tmCloseFloatingVideo()" title="Đóng video nền">✕</button>' +
            '  </div>' +
            '</div>' +
            '<div class="tm-fv-stage" id="tm-fv-stage"></div>';
        document.body.appendChild(box);
        return box;
    }

    function syncFloatingVideoOriginBtn() {
        var originBtn = document.getElementById("tm-fv-origin");
        if (!originBtn) return;
        var cur = window.location.pathname + window.location.search;
        if (floatingVideoOriginUrl && floatingVideoOriginUrl !== cur) {
            originBtn.href = floatingVideoOriginUrl;
            originBtn.style.display = "inline-block";
        } else {
            originBtn.style.display = "none";
        }
    }

    window.tmToggleFloatingVideoSize = function () {
        var box = document.getElementById("tm-floating-video-box");
        if (!box) return;
        box.classList.remove("is-minimized");
        box.classList.toggle("is-expanded");
    };

    window.tmToggleFloatingVideoCollapse = function () {
        var box = document.getElementById("tm-floating-video-box");
        if (!box) return;
        box.classList.toggle("is-minimized");
    };

    window.tmCloseFloatingVideo = function () {
        var box = document.getElementById("tm-floating-video-box");
        var stage = document.getElementById("tm-fv-stage");
        if (stage) {
            var ifr = stage.querySelector("iframe");
            if (ifr && ifr.id && ytStates[ifr.id]) {
                saveYtProgress(ytStates[ifr.id].videoId, ytStates[ifr.id].currentTime, ytStates[ifr.id].title);
                delete ytStates[ifr.id];
            }
            stage.innerHTML = "";
        }
        if (box) {
            box.style.display = "none";
            box.classList.remove("is-expanded", "is-minimized");
        }
        bgVideoConfirmed = false;
        floatingVideoOriginUrl = "";
    };

    function dockIframeToFloatingVideo(iframeEl, customTitle) {
        if (!iframeEl) return;
        bgVideoConfirmed = true;

        var box = ensureFloatingVideoBox();
        var stage = document.getElementById("tm-fv-stage");
        if (!stage) return;

        if (stage.contains(iframeEl)) {
            box.style.display = "block";
            syncFloatingVideoOriginBtn();
            return;
        }

        var st = iframeEl.id ? ytStates[iframeEl.id] : null;
        var curSec = (st && st.currentTime > 0) ? Math.floor(st.currentTime) : 0;
        var title = customTitle || (st && st.title) || iframeEl.getAttribute("title") || document.title;
        var rawSrc = iframeEl.getAttribute("src") || "";

        floatingVideoOriginUrl = window.location.pathname + window.location.search;
        var titleEl = document.getElementById("tm-fv-title");
        if (titleEl) titleEl.textContent = "🎬 " + title;

        stage.innerHTML = "";
        box.classList.remove("is-minimized");
        box.style.display = "block";

        // Atomic moveBefore preserves live iframe state without reloading on modern Chromium!
        var movedAtomically = false;
        if (typeof stage.moveBefore === "function" && document.body.contains(iframeEl)) {
            try {
                var parentWrap = iframeEl.closest(".tm-embed-container, .tm-story-video-frame");
                stage.moveBefore(iframeEl, null);
                movedAtomically = true;
                if (parentWrap) {
                    var note = document.createElement("div");
                    note.className = "tm-resume-banner";
                    note.innerHTML = '<span class="tm-resume-banner-text">🎬 Video đang được phát ở cửa sổ thu nhỏ góc dưới màn hình.</span>';
                    parentWrap.insertBefore(note, parentWrap.firstChild);
                }
            } catch (e) {
                movedAtomically = false;
            }
        }

        if (!movedAtomically) {
            // Pause original in-page iframe & mount floating iframe seamlessly at curSec
            if (iframeEl.contentWindow) {
                try {
                    iframeEl.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
                } catch (e) {}
            }
            var newSrc = rawSrc.replace(/([?&])(start|autoplay)=\d+(&|$)/g, "$1").replace(/[?&]+$/, "");
            newSrc += (newSrc.indexOf("?") === -1 ? "?" : "&") + "autoplay=1" + (curSec > 2 ? ("&start=" + curSec) : "");
            if (newSrc.indexOf("enablejsapi=") === -1) newSrc += "&enablejsapi=1";

            var newIfr = document.createElement("iframe");
            newIfr.setAttribute("src", newSrc);
            newIfr.setAttribute("title", title);
            newIfr.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen");
            newIfr.setAttribute("allowfullscreen", "allowfullscreen");
            stage.appendChild(newIfr);
            registerYoutubeIframe(newIfr, title);
        }

        syncFloatingVideoOriginBtn();
    }

    window.tmDockEmbedVideo = function (btn) {
        if (!btn || !btn.closest) return;
        var wrap = btn.closest(".tm-embed-container, .tm-story-video-drawer, .tm-story-video-frame");
        var ifr = wrap ? wrap.querySelector("iframe") : null;
        if (!ifr) return;
        var title = wrap.getAttribute("data-embed-title") || ifr.getAttribute("title") || document.title;
        dockIframeToFloatingVideo(ifr, title);
    };

    /* --- Active Media Detection, Confirmation Modal & PJAX Seamless Router --- */
    function getActivePlayingMedia() {
        // 1. Check all HTML5 <audio> elements
        var allAud = document.querySelectorAll("audio");
        for (var i = 0; i < allAud.length; i++) {
            var a = allAud[i];
            if (!a.paused && !a.ended && (a.currentSrc || a.getAttribute("src"))) {
                return {
                    kind: "audio",
                    audioEl: a,
                    inFloatingBar: (a.id === "tm-fab-player"),
                    title: getAudioContextTitle(a),
                    timeStr: formatDur(a.currentTime || 0)
                };
            }
        }

        // 2. Check Floating Mini-Video Box if currently open
        var fvBox = document.getElementById("tm-floating-video-box");
        var fvStage = document.getElementById("tm-fv-stage");
        if (fvBox && fvBox.style.display !== "none" && fvStage && fvStage.querySelector("iframe")) {
            var fvIfr = fvStage.querySelector("iframe");
            var fvSt = fvIfr.id ? ytStates[fvIfr.id] : null;
            if (!fvSt || fvSt.state !== 2) { // unless explicitly paused
                var fvTitleEl = document.getElementById("tm-fv-title");
                return {
                    kind: "video",
                    iframeEl: fvIfr,
                    inFloatingBox: true,
                    title: fvTitleEl ? fvTitleEl.textContent.replace(/^🎬\s*/, "") : "Video Pháp Âm",
                    timeStr: (fvSt && fvSt.currentTime > 0) ? formatDur(fvSt.currentTime) : ""
                };
            }
        }

        // 3. Check in-page YouTube iframes with active PLAYING (1) or BUFFERING (3) state
        var ifrIds = Object.keys(ytStates);
        for (var k = 0; k < ifrIds.length; k++) {
            var st = ytStates[ifrIds[k]];
            var el = document.getElementById(st.id);
            if (!el || !document.body.contains(el)) {
                delete ytStates[ifrIds[k]];
                continue;
            }
            if (st.state === 1 || st.state === 3) {
                return {
                    kind: "video",
                    iframeEl: el,
                    inFloatingBox: false,
                    title: st.title || el.getAttribute("title") || document.title,
                    timeStr: st.currentTime > 0 ? formatDur(st.currentTime) : ""
                };
            }
        }

        return null;
    }

    function shouldInterceptPageLink(link, event) {
        if (!link || !event) return false;
        if (event.defaultPrevented) return false;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
        if (link.hasAttribute("download")) return false;
        var target = (link.getAttribute("target") || "").toLowerCase();
        if (target && target !== "_self") return false;

        var rawHref = link.getAttribute("href") || "";
        if (!rawHref || rawHref.charAt(0) === "#" || /^(mailto:|tel:|javascript:)/i.test(rawHref)) {
            return false;
        }

        var urlObj;
        try {
            urlObj = new URL(rawHref, window.location.origin);
        } catch (e) {
            return false;
        }

        if (urlObj.origin !== window.location.origin) return false;

        // Ignore Typemill admin / API / direct binary media routes
        if (/\/(tm|api)(\/|$)/i.test(urlObj.pathname)) return false;
        if (/\.(mp3|m4a|ogg|wav|pdf|zip|jpg|jpeg|png|webp|gif|doc|docx|epub)$/i.test(urlObj.pathname)) return false;
        if (urlObj.searchParams.has("tm_gal_dl")) return false;

        // Same page hash jump -> browser handles without unloading
        if (urlObj.pathname === window.location.pathname && urlObj.search === window.location.search && urlObj.hash) {
            return false;
        }
        // Clicking link to the exact same current URL (no hash) -> no-op or normal
        if (urlObj.href === window.location.href) {
            return false;
        }

        return urlObj;
    }

    var pjaxLoaderEl = null;
    function setPjaxLoadingBar(pct) {
        if (!pjaxLoaderEl) {
            pjaxLoaderEl = document.createElement("div");
            pjaxLoaderEl.className = "tm-pjax-loader";
            document.body.appendChild(pjaxLoaderEl);
        }
        if (pct <= 0) {
            pjaxLoaderEl.style.opacity = "0";
            setTimeout(function () { if (pjaxLoaderEl) pjaxLoaderEl.style.width = "0%"; }, 220);
        } else {
            pjaxLoaderEl.style.opacity = "1";
            pjaxLoaderEl.style.width = pct + "%";
        }
    }

    var pjaxInFlightCtrl = null;

    function pjaxNavigate(targetUrl, pushStateFlag) {
        var stage = document.getElementById("tm-pjax-stage");
        if (!stage || !window.fetch || !window.DOMParser) {
            window.location.href = targetUrl;
            return;
        }

        if (window.tmCloseSearch) window.tmCloseSearch();
        var albumModal = document.getElementById("tm-abs-album-modal");
        if (albumModal && albumModal.style.display !== "none") {
            albumModal.style.display = "none";
            document.body.style.overflow = "";
        }
        var burger = document.getElementById("burger");
        if (burger) burger.checked = false;

        if (pjaxInFlightCtrl) {
            try { pjaxInFlightCtrl.abort(); } catch (e) {}
        }
        pjaxInFlightCtrl = window.AbortController ? new AbortController() : null;

        setPjaxLoadingBar(45);

        fetch(targetUrl, {
            method: "GET",
            credentials: "same-origin",
            signal: pjaxInFlightCtrl ? pjaxInFlightCtrl.signal : undefined,
            headers: { "X-Requested-With": "TM-PJAX" }
        })
            .then(function (resp) {
                if (!resp.ok) throw new Error("HTTP " + resp.status);
                var ct = resp.headers.get("content-type") || "";
                if (ct.indexOf("text/html") === -1) throw new Error("Non-HTML response");
                setPjaxLoadingBar(80);
                return resp.text().then(function (html) {
                    return { html: html, finalUrl: resp.url || targetUrl };
                });
            })
            .then(function (res) {
                var parser = new DOMParser();
                var newDoc = parser.parseFromString(res.html, "text/html");
                var newStage = newDoc.getElementById("tm-pjax-stage");
                if (!newStage) {
                    window.location.href = targetUrl;
                    return;
                }

                // Update document title & canonical URL
                if (newDoc.title) {
                    document.title = newDoc.title;
                }
                var oldCanon = document.querySelector('link[rel="canonical"]');
                var newCanon = newDoc.querySelector('link[rel="canonical"]');
                if (oldCanon && newCanon && newCanon.href) {
                    oldCanon.href = newCanon.href;
                }

                // Sync body classes while preserving live user/media classes
                if (newDoc.body && document.body) {
                    var keepAudio = document.body.classList.contains("tm-has-floating-audio");
                    var keepNight = document.documentElement.classList.contains("tm-night-mode") || document.body.classList.contains("tm-night-mode");
                    var keepElderly = document.documentElement.classList.contains("tm-elderly-mode") || document.body.classList.contains("tm-elderly-mode");
                    document.body.className = newDoc.body.className;
                    if (keepAudio) document.body.classList.add("tm-has-floating-audio");
                    if (keepNight) document.body.classList.add("tm-night-mode");
                    if (keepElderly) document.body.classList.add("tm-elderly-mode");
                    document.body.setAttribute("data-depth", newDoc.body.getAttribute("data-depth") || "0");
                    document.body.setAttribute("data-slug", newDoc.body.getAttribute("data-slug") || "");
                    document.body.style.overflow = "";
                }

                // Sync homepage plaque strip right below .tinhdo-top-bar
                var curPlaque = document.querySelector(".tinhdo-plaque-strip");
                var newPlaque = newDoc.querySelector(".tinhdo-plaque-strip");
                var topBar = document.querySelector(".tinhdo-top-bar");
                if (newPlaque && !curPlaque && topBar && topBar.parentNode) {
                    topBar.parentNode.insertBefore(newPlaque.cloneNode(true), topBar.nextSibling);
                } else if (!newPlaque && curPlaque && curPlaque.parentNode) {
                    curPlaque.parentNode.removeChild(curPlaque);
                }

                if (pushStateFlag) {
                    try {
                        window.history.pushState({ tmPjax: true }, document.title, targetUrl);
                    } catch (e) {}
                }

                // Swap main page stage!
                stage.innerHTML = newStage.innerHTML;

                // Scroll to hash or top before smart focus runs
                var parsedTarget;
                try { parsedTarget = new URL(targetUrl, window.location.origin); } catch (e) {}
                if (parsedTarget && parsedTarget.hash && parsedTarget.hash.length > 1) {
                    var hEl = document.getElementById(decodeURIComponent(parsedTarget.hash.slice(1)));
                    if (hEl && window.tmScrollToTargetFocus) {
                        window.tmScrollToTargetFocus(hEl, "auto");
                    } else {
                        window.scrollTo(0, 0);
                    }
                } else {
                    window.scrollTo(0, 0);
                }

                // Re-initialize theme & media widgets on the newly swapped DOM
                if (typeof window.tmReinitThemePage === "function") {
                    window.tmReinitThemePage();
                }
                initPageMediaWidgets(true);
                syncFloatingVideoOriginBtn();

                setPjaxLoadingBar(100);
                setTimeout(function () { setPjaxLoadingBar(0); }, 180);
            })
            .catch(function (err) {
                setPjaxLoadingBar(0);
                if (err && err.name === "AbortError") return;
                window.location.href = targetUrl;
            });
    }

    var pendingNavState = null;

    function ensureBgConfirmModal() {
        var modal = document.getElementById("tm-bg-confirm-modal");
        if (modal) return modal;

        modal = document.createElement("div");
        modal.id = "tm-bg-confirm-modal";
        modal.className = "tm-bg-modal-backdrop";
        modal.style.display = "none";
        modal.innerHTML =
            '<div class="tm-bg-modal-card" role="dialog" aria-modal="true" aria-labelledby="tm-bg-modal-heading">' +
            '  <div class="tm-bg-modal-badge" id="tm-bg-modal-badge">🎧 Pháp âm đang phát</div>' +
            '  <h3 class="tm-bg-modal-title" id="tm-bg-modal-heading">Chuyển sang phát ở chế độ nền?</h3>' +
            '  <div class="tm-bg-modal-media-name" id="tm-bg-modal-media-name"></div>' +
            '  <p class="tm-bg-modal-desc" id="tm-bg-modal-desc">Bạn đang chuyển sang trang khác. Bạn có muốn giữ trình phát thu nhỏ để tiếp tục nghe mà không bị ngắt quãng không?</p>' +
            '  <label class="tm-bg-modal-remember">' +
            '    <input type="checkbox" id="tm-bg-modal-remember-chk" />' +
            '    <span>Tự động giữ phát nền cho các lần chuyển trang tiếp theo</span>' +
            '  </label>' +
            '  <div class="tm-bg-modal-btns">' +
            '    <button type="button" class="tm-bg-btn-primary" id="tm-bg-btn-confirm">🎧 Nghe tiếp ở chế độ nền</button>' +
            '    <div class="tm-bg-modal-subbtns">' +
            '      <button type="button" class="tm-bg-btn-stop" id="tm-bg-btn-stop">⏹ Dừng &amp; Chuyển trang</button>' +
            '      <button type="button" class="tm-bg-btn-cancel" id="tm-bg-btn-cancel">✕ Ở lại trang này</button>' +
            '    </div>' +
            '  </div>' +
            '</div>';

        document.body.appendChild(modal);

        modal.addEventListener("click", function (e) {
            if (e.target === modal) {
                closeBgConfirmModal();
            }
        });

        document.getElementById("tm-bg-btn-cancel").addEventListener("click", function () {
            closeBgConfirmModal();
        });

        document.getElementById("tm-bg-btn-confirm").addEventListener("click", function () {
            if (!pendingNavState) return;
            var st = pendingNavState;
            var chk = document.getElementById("tm-bg-modal-remember-chk");
            if (chk && chk.checked) {
                try { sessionStorage.setItem(BG_PREF_SESSION_KEY, "background"); } catch (e) {}
            }
            closeBgConfirmModal();

            if (st.media.kind === "audio" && st.media.audioEl) {
                promoteAudioToFloatingBar(st.media.audioEl, true);
            } else if (st.media.kind === "video" && st.media.iframeEl) {
                dockIframeToFloatingVideo(st.media.iframeEl, st.media.title);
            }
            pjaxNavigate(st.targetHref, true);
        });

        document.getElementById("tm-bg-btn-stop").addEventListener("click", function () {
            if (!pendingNavState) return;
            var st = pendingNavState;
            closeBgConfirmModal();

            if (st.media.kind === "audio" && st.media.audioEl) {
                recordAudioProgress(st.media.audioEl, true);
                st.media.audioEl.pause();
                if (st.media.audioEl.id === "tm-fab-player") {
                    window.tmCloseFloatingAudio();
                }
            } else if (st.media.kind === "video") {
                if (st.media.inFloatingBox) {
                    window.tmCloseFloatingVideo();
                } else if (st.media.iframeEl && st.media.iframeEl.contentWindow) {
                    try {
                        st.media.iframeEl.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
                    } catch (e) {}
                }
            }
            window.location.href = st.targetHref;
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && modal.style.display !== "none") {
                closeBgConfirmModal();
            }
        });

        return modal;
    }

    function openBgConfirmModal(activeMedia, targetHref) {
        var modal = ensureBgConfirmModal();
        pendingNavState = { media: activeMedia, targetHref: targetHref };

        var isVid = activeMedia.kind === "video";
        var badgeEl = document.getElementById("tm-bg-modal-badge");
        var headEl = document.getElementById("tm-bg-modal-heading");
        var nameEl = document.getElementById("tm-bg-modal-media-name");
        var descEl = document.getElementById("tm-bg-modal-desc");
        var confirmBtn = document.getElementById("tm-bg-btn-confirm");

        if (badgeEl) badgeEl.textContent = isVid ? "🎬 Video đang phát" : "🎧 Pháp âm đang phát";
        if (headEl) headEl.textContent = isVid ? "Tiếp tục xem Video ở chế độ nền?" : "Tiếp tục nghe Pháp âm ở chế độ nền?";
        if (nameEl) {
            nameEl.textContent = activeMedia.title + (activeMedia.timeStr ? (" • " + activeMedia.timeStr) : "");
        }
        if (descEl) {
            descEl.textContent = isVid
                ? "Bạn sắp chuyển sang trang khác. Bạn có muốn thu nhỏ video xuống góc màn hình để vừa xem/nghe tiếp vừa đọc trang mới không?"
                : "Bạn sắp chuyển sang trang khác. Bạn có muốn chuyển xuống thanh phát nền ở cuối màn hình để nghe liên tục không ngắt quãng không?";
        }
        if (confirmBtn) {
            confirmBtn.textContent = isVid ? "🎬 Xem tiếp ở chế độ nền" : "🎧 Nghe tiếp ở chế độ nền";
        }

        modal.style.display = "flex";
        if (confirmBtn) confirmBtn.focus();
    }

    function closeBgConfirmModal() {
        var modal = document.getElementById("tm-bg-confirm-modal");
        if (modal) modal.style.display = "none";
        pendingNavState = null;
    }

    function initBackgroundMediaNavigation() {
        if (window._tmBgNavInitialized) return;
        window._tmBgNavInitialized = true;

        // Listen for YouTube IFrame API postMessage state & currentTime updates
        window.addEventListener("message", function (ev) {
            if (!ev.origin || (ev.origin.indexOf("youtube.com") === -1 && ev.origin.indexOf("youtube-nocookie.com") === -1)) {
                return;
            }
            var data = ev.data;
            if (typeof data === "string") {
                try { data = JSON.parse(data); } catch (e) { return; }
            }
            if (!data || typeof data !== "object") return;

            var st = data.id ? ytStates[data.id] : null;
            if (!st) {
                // Match by source window if id was omitted
                var ids = Object.keys(ytStates);
                for (var i = 0; i < ids.length; i++) {
                    var el = document.getElementById(ids[i]);
                    if (el && el.contentWindow === ev.source) {
                        st = ytStates[ids[i]];
                        break;
                    }
                }
            }
            if (!st) return;

            if (data.event === "onStateChange" && typeof data.info === "number") {
                st.state = data.info;
                if (st.state === 2 && st.currentTime > 6) {
                    st.lastSaveTs = Date.now();
                    saveYtProgress(st.videoId, st.currentTime, st.title);
                } else if (st.state === 0 && st.videoId) {
                    var m = readJsonStorage(YT_PROG_KEY, {});
                    delete m[st.videoId];
                    writeJsonStorage(YT_PROG_KEY, m);
                }
            } else if (data.event === "infoDelivery" && data.info) {
                if (typeof data.info.playerState === "number") {
                    st.state = data.info.playerState;
                }
                if (typeof data.info.currentTime === "number" && data.info.currentTime > 0) {
                    st.currentTime = data.info.currentTime;
                    var nowYt = Date.now();
                    if (nowYt - (st.lastSaveTs || 0) >= PROGRESS_CHECKPOINT_MS) {
                        st.lastSaveTs = nowYt;
                        saveYtProgress(st.videoId, st.currentTime, st.title);
                    }
                }
                if (data.info.videoData) {
                    if (data.info.videoData.video_id && (!st.videoId || st.videoId.indexOf("pl_") === 0)) {
                        st.videoId = data.info.videoData.video_id;
                    }
                    if (data.info.videoData.title) {
                        st.title = data.info.videoData.title;
                    }
                }
            }
        });

        // Intercept internal page navigations when Audio or Video is playing
        document.addEventListener("click", function (e) {
            var link = e.target && e.target.closest ? e.target.closest("a") : null;
            var urlObj = shouldInterceptPageLink(link, e);
            if (!urlObj) return;

            var activeMedia = getActivePlayingMedia();
            if (!activeMedia) return;

            e.preventDefault();

            var sessionPref = "";
            try { sessionPref = sessionStorage.getItem(BG_PREF_SESSION_KEY) || ""; } catch (err) {}

            var alreadyConfirmedBg =
                sessionPref === "background" ||
                (activeMedia.kind === "audio" && activeMedia.inFloatingBar && bgAudioConfirmed) ||
                (activeMedia.kind === "video" && activeMedia.inFloatingBox && bgVideoConfirmed);

            if (alreadyConfirmedBg) {
                if (activeMedia.kind === "audio" && activeMedia.audioEl) {
                    promoteAudioToFloatingBar(activeMedia.audioEl, true);
                } else if (activeMedia.kind === "video" && activeMedia.iframeEl) {
                    dockIframeToFloatingVideo(activeMedia.iframeEl, activeMedia.title);
                }
                pjaxNavigate(urlObj.href, true);
            } else {
                openBgConfirmModal(activeMedia, urlObj.href);
            }
        });

        // Seamless Back/Forward browser history when background audio/video is active
        window.addEventListener("popstate", function () {
            if (document.getElementById("tm-kpc-reader") || document.getElementById("tm-knnp-reader")) {
                return;
            }
            var activeMedia = getActivePlayingMedia();
            var fabBar = document.getElementById("tm-floating-audio-bar");
            var fvBox = document.getElementById("tm-floating-video-box");
            var hasVisibleBg = !!(activeMedia ||
                (fabBar && fabBar.style.display !== "none") ||
                (fvBox && fvBox.style.display !== "none"));
            if (hasVisibleBg) {
                pjaxNavigate(window.location.href, false);
            }
        });
    }
})();

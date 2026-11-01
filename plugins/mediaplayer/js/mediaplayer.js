(function () {
    "use strict";

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

        var listEls = hub.querySelectorAll(".tm-hub-item");
        listEls.forEach(function (el, idx) {
            if (idx === index) {
                el.classList.add("active");
            } else {
                el.classList.remove("active");
            }
        });

        hub.classList.remove("menu-open");

        var mobileTitle = hub.querySelector(".tm-hub-mobiletitle");
        if (mobileTitle && selected.title) {
            mobileTitle.textContent = selected.title;
        }

        var iframeWrap = hub.querySelector(".tm-hub-iframe-wrap");
        var iframeEl = hub.querySelector(".tm-hub-iframe");
        var cardWrap = hub.querySelector(".tm-hub-card-wrap");

        if (selected.type === "audiocom_collection" || selected.mode === "external") {
            if (iframeWrap) iframeWrap.style.display = "none";
            if (iframeEl) iframeEl.src = "";
            if (cardWrap) {
                cardWrap.style.display = "block";
                var extUrl = selected.url || ("https://audio.com/quan-nguyen-duc-1/collections/" + (selected.slug || ""));
                cardWrap.innerHTML =
                    '<div class="tm-hub-ext-box">' +
                    '  <div class="tm-hub-ext-title">' + (selected.title || "Tuyển tập Audio") + '</div>' +
                    '  <div class="tm-hub-ext-desc">' + (selected.description || "Tự động chuyển bài và phát liên tục trọn bộ trên Audio.com.") + '</div>' +
                    '  <a class="tm-hub-ext-btn" href="' + extUrl + '" target="_blank" rel="noopener noreferrer">▶ Mở phát trọn bộ ngay</a>' +
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
        var hubs = document.querySelectorAll(".tm-mediahub");
        hubs.forEach(function (hub) {
            if (hub.id) {
                window.tmHubSelect(hub.id, 0);
            }
        });
    });
})();

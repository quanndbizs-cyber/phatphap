<?php

namespace Plugins\mediaplayer;

use Typemill\Plugin;

class mediaplayer extends Plugin
{
    protected $currentMeta = [];
    protected $currentItem = null;

    public static function getSubscribedEvents()
    {
        return [
            'onTwigLoaded'      => ['onTwigLoaded', 0],
            'onItemLoaded'      => ['onItemLoaded', 0],
            'onMetaLoaded'      => ['onMetaLoaded', 0],
            'onShortcodeFound'  => ['onShortcodeFound', 0],
        ];
    }

    public function onItemLoaded($item)
    {
        $this->currentItem = $item->getData();
    }

    public function onTwigLoaded()
    {
        if (!$this->adminroute || $this->editorroute) {
            $this->addCSS('/mediaplayer/css/mediaplayer.css');
            $this->addJS('/mediaplayer/js/mediaplayer.js');
        }
    }

    public function onMetaLoaded($metadata)
    {
        $this->currentMeta = $metadata->getData();
    }

    public function onShortcodeFound($shortcode)
    {
        $shortcodeArray = $shortcode->getData();
        if (!is_array($shortcodeArray) || !isset($shortcodeArray['name'])) {
            return;
        }

        $name   = $shortcodeArray['name'];
        $params = $shortcodeArray['params'] ?? [];

        # 1. Register shortcodes for Visual Editor dropdown
        if ($name === 'registershortcode') {
            $shortcodeArray['data']['embed'] = [
                'url'    => 'text',
                'title'  => 'text',
                'height' => 'text',
            ];
            $shortcodeArray['data']['mediahub'] = [
                'id'     => 'text',
                'height' => 'text',
            ];
            $shortcodeArray['data']['tracklist'] = [
                'id'   => 'text',
                'base' => 'text',
            ];
            $shortcodeArray['data']['accordion'] = [
                'title' => 'text',
                'open'  => 'text',
            ];
            $shortcodeArray['data']['/accordion'] = [];
            $shortcode->setData($shortcodeArray);
            return;
        }

        # 2. [:embed url="..." height="..." title="..." :]
        if ($name === 'embed') {
            $shortcode->stopPropagation();
            $url    = trim($params['url'] ?? '');
            $height = htmlspecialchars($params['height'] ?? '680px', ENT_QUOTES, 'UTF-8');
            $title  = htmlspecialchars($params['title'] ?? 'Media Player', ENT_QUOTES, 'UTF-8');

            $shortcode->setData($this->renderEmbedHtml($url, $height, $title));
            return;
        }

        # 3. [:mediahub id="..." height="..." :]
        if ($name === 'mediahub') {
            $shortcode->stopPropagation();
            $hubId  = $params['id'] ?? 'main';
            $height = htmlspecialchars($params['height'] ?? '680px', ENT_QUOTES, 'UTF-8');

            $shortcode->setData($this->renderMediaHub($hubId, $height));
            return;
        }

        # 4. [:tracklist id="..." base="..." :]
        if ($name === 'tracklist') {
            $shortcode->stopPropagation();
            $listId  = $params['id'] ?? 'tracks';
            $baseUrl = trim($params['base'] ?? '');

            $shortcode->setData($this->renderTracklist($listId, $baseUrl));
            return;
        }

        # 5. [:accordion title="..." open="true" :] and [:/accordion:]
        if ($name === 'accordion') {
            $shortcode->stopPropagation();
            $title  = htmlspecialchars($params['title'] ?? 'Chi tiết chương', ENT_QUOTES, 'UTF-8');
            $isOpen = isset($params['open']) && in_array(strtolower($params['open']), ['true', '1', 'yes', 'open'], true);
            $openClass = $isOpen ? ' tm-acc-open' : '';
            $iconRot   = $isOpen ? ' tm-acc-rot' : '';

            $html = '<div class="tm-accordion-item' . $openClass . '">'
                  . '<button type="button" class="tm-accordion-header" onclick="window.tmToggleAccordion(this)">'
                  . '<span class="tm-accordion-title">' . $title . '</span>'
                  . '<span class="tm-accordion-icon' . $iconRot . '">▼</span>'
                  . '</button>'
                  . '<div class="tm-accordion-body"><div class="tm-accordion-inner">';
            $shortcode->setData($html);
            return;
        }

        if ($name === '/accordion') {
            $shortcode->stopPropagation();
            $shortcode->setData('</div></div></div>');
            return;
        }
    }

    protected function normalizeEmbedUrl(string $url): array
    {
        # YouTube watch URL -> embed URL
        if (preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})%i', $url, $match)) {
            return [
                'type' => 'iframe',
                'url'  => 'https://www.youtube.com/embed/' . $match[1],
            ];
        }

        # Audio.com direct MP3 or Audio.com embed
        if (str_contains($url, 'audio.com/embed/')) {
            return [
                'type' => 'iframe',
                'url'  => $url,
            ];
        }

        # Audiobookshelf share link
        if (str_contains($url, '/audiobookshelf/share/')) {
            return [
                'type' => 'iframe',
                'url'  => $url,
            ];
        }

        # Direct MP3/OGG file
        if (preg_match('/\.(mp3|ogg|wav|m4a)(\?.*)?$/i', $url)) {
            $src = $url;
            if (!str_starts_with($url, 'http')) {
                $base = rtrim($this->urlinfo['baseurl'] ?? '', '/');
                $src  = $base . '/' . ltrim($url, '/');
            }
            return [
                'type' => 'audio',
                'url'  => $src,
            ];
        }

        return [
            'type' => 'iframe',
            'url'  => $url,
        ];
    }

    protected function renderEmbedHtml(string $url, string $height, string $title): string
    {
        if (empty($url)) {
            return '<div class="tm-media-alert">Chưa cấu hình URL cho [:embed:].</div>';
        }

        $normalized = $this->normalizeEmbedUrl($url);
        $safeUrl    = htmlspecialchars($normalized['url'], ENT_QUOTES, 'UTF-8');

        if ($normalized['type'] === 'audio') {
            return '<div class="tm-audio-box">'
                 . '<div class="tm-audio-title">🎧 ' . $title . '</div>'
                 . '<audio controls preload="metadata" style="width:100%"><source src="' . $safeUrl . '"></audio>'
                 . '</div>';
        }

        return '<div class="tm-embed-container">'
             . '<iframe src="' . $safeUrl . '" title="' . $title . '" style="width:100%; height:' . $height . '; border:none; border-radius:10px;" allow="autoplay; fullscreen" loading="lazy"></iframe>'
             . '</div>';
    }

    protected function renderMediaHub(string $hubId, string $height): string
    {
        $hubData = $this->currentMeta['mediaplayer'][$hubId] ?? ($this->currentMeta['mediaplayer'] ?? null);
        if (!$hubData || empty($hubData['items']) || !is_array($hubData['items'])) {
            return '<div class="tm-media-alert">Đang tải cấu hình danh sách phát (' . htmlspecialchars($hubId, ENT_QUOTES, 'UTF-8') . ')...</div>';
        }

        $hubTitle    = htmlspecialchars($hubData['title'] ?? 'Danh Sách Phát', ENT_QUOTES, 'UTF-8');
        $hubSubtitle = htmlspecialchars($hubData['subtitle'] ?? '', ENT_QUOTES, 'UTF-8');
        $items       = $hubData['items'];
        $uid         = 'tmhub_' . preg_replace('/[^a-zA-Z0-9_]/', '', $hubId) . '_' . substr(md5(json_encode($items)), 0, 6);

        $jsonItems   = htmlspecialchars(json_encode(array_values($items), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), ENT_QUOTES, 'UTF-8');
        $count       = count($items);

        $html = '<div class="tm-mediahub" id="' . $uid . '" data-items="' . $jsonItems . '" style="--tm-hub-height:' . $height . ';">'
              . '  <div class="tm-hub-mobilebar">'
              . '    <span class="tm-hub-mobiletitle">' . $hubTitle . '</span>'
              . '    <button type="button" class="tm-hub-mobilebtn" onclick="window.tmHubToggleMenu(\'' . $uid . '\')">Danh mục (' . $count . ') ☰</button>'
              . '  </div>'
              . '  <div class="tm-hub-body">'
              . '    <aside class="tm-hub-sidebar">'
              . '      <div class="tm-hub-header">'
              . '        <div>'
              . '          <div class="tm-hub-h-title">' . $hubTitle . '</div>'
              . ($hubSubtitle ? '<div class="tm-hub-h-sub">' . $hubSubtitle . '</div>' : '')
              . '        </div>'
              . '        <span class="tm-hub-badge">' . $count . '</span>'
              . '      </div>'
              . '      <ul class="tm-hub-list">';

        $currentSection = null;
        foreach (array_values($items) as $idx => $item) {
            $section = $item['section'] ?? null;
            if ($section && $section !== $currentSection) {
                $currentSection = $section;
                $html .= '<li class="tm-hub-section">' . htmlspecialchars($section, ENT_QUOTES, 'UTF-8') . '</li>';
            }

            $itemTitle = htmlspecialchars($item['title'] ?? ('Mục ' . ($idx + 1)), ENT_QUOTES, 'UTF-8');
            $itemSub   = htmlspecialchars($item['subtitle'] ?? ($item['duration'] ?? ''), ENT_QUOTES, 'UTF-8');
            $badge     = htmlspecialchars($item['badge'] ?? '', ENT_QUOTES, 'UTF-8');
            $activeCls = ($idx === 0) ? ' active' : '';

            $html .= '<li class="tm-hub-item' . $activeCls . '" data-idx="' . $idx . '" onclick="window.tmHubSelect(\'' . $uid . '\', ' . $idx . ')">'
                   . '  <div class="tm-hub-item-main">'
                   . '    <div class="tm-hub-item-title">' . $itemTitle . '</div>'
                   . ($itemSub ? '<div class="tm-hub-item-sub">' . $itemSub . '</div>' : '')
                   . '  </div>'
                   . ($badge ? '<span class="tm-hub-item-badge">' . $badge . '</span>' : '')
                   . '</li>';
        }

        $html .= '      </ul>'
               . '    </aside>'
               . '    <div class="tm-hub-stage">'
               . '      <div class="tm-hub-iframe-wrap"><iframe class="tm-hub-iframe" allow="autoplay; fullscreen" src=""></iframe></div>'
               . '      <div class="tm-hub-card-wrap" style="display:none;"></div>'
               . '    </div>'
               . '  </div>'
               . '</div>';

        return $html;
    }

    protected function renderTracklist(string $listId, string $baseUrl): string
    {
        $trackData = $this->currentMeta['mediaplayer'][$listId] ?? ($this->currentMeta['tracks'] ?? null);
        if (!$trackData || empty($trackData['items']) || !is_array($trackData['items'])) {
            return '<div class="tm-media-alert">Chưa có danh sách bài nghe cho [' . htmlspecialchars($listId, ENT_QUOTES, 'UTF-8') . '].</div>';
        }

        $base  = $baseUrl ?: ($trackData['base_url'] ?? '');
        $items = $trackData['items'];
        $uid   = 'tmtracks_' . substr(md5($listId . $base), 0, 6);

        $html = '<div class="tm-tracklist-box" id="' . $uid . '">'
              . '  <div class="tm-tracklist-toolbar">'
              . '    <input type="search" class="tm-tracklist-search" placeholder="🔍 Tìm nhanh tên truyện / bài giảng..." oninput="window.tmFilterTracks(\'' . $uid . '\', this.value)" />'
              . '    <span class="tm-tracklist-count">Tổng số: <strong>' . count($items) . '</strong> bài</span>'
              . '  </div>'
              . '  <div class="tm-tracklist-items">';

        foreach (array_values($items) as $i => $track) {
            $num   = $track['id'] ?? ($i + 1);
            $title = htmlspecialchars($track['title'] ?? ('Bài ' . $num), ENT_QUOTES, 'UTF-8');
            $url   = $track['url'] ?? ($base . ($track['slug'] ?? ''));
            $safeUrl = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');

            $html .= '<a class="tm-track-row" href="' . $safeUrl . '" target="_blank" rel="noopener noreferrer" data-title="' . mb_strtolower($title, 'UTF-8') . '">'
                   . '  <span class="tm-track-idx">' . htmlspecialchars((string)$num, ENT_QUOTES, 'UTF-8') . '.</span>'
                   . '  <span class="tm-track-name">' . $title . '</span>'
                   . '  <span class="tm-track-action">▶ Nghe ngay</span>'
                   . '</a>';
        }

        $html .= '  </div>'
               . '</div>';

        return $html;
    }
}

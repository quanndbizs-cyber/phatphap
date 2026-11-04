<?php

namespace Plugins\mediaplayer;

use Typemill\Plugin;

class mediaplayer extends Plugin
{
    protected $currentMeta = [];
    protected $currentItem = null;
    protected $absCatalog  = null;

    public static function getSubscribedEvents()
    {
        return [
            'onCspLoaded'       => ['onCspLoaded', 0],
            'onTwigLoaded'      => ['onTwigLoaded', 0],
            'onItemLoaded'      => ['onItemLoaded', 0],
            'onMetaLoaded'      => ['onMetaLoaded', 0],
            'onShortcodeFound'  => ['onShortcodeFound', 0],
        ];
    }

    public function onCspLoaded($csp)
    {
        $data = $csp->getData();
        if (!is_array($data)) {
            $data = [];
        }
        $data[] = 'disable';
        $csp->setData($data);
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

    protected function getAbsCatalog(): array
    {
        if ($this->absCatalog !== null) {
            return $this->absCatalog;
        }
        $path = __DIR__ . '/data/abs_catalog.json';
        if (file_exists($path)) {
            $decoded = json_decode(file_get_contents($path), true);
            if (is_array($decoded)) {
                $this->absCatalog = $decoded;
                return $this->absCatalog;
            }
        }
        $this->absCatalog = ['host' => 'https://qts-home.duckdns.org/audiobookshelf', 'token' => '', 'by_key' => [], 'by_id' => []];
        return $this->absCatalog;
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
                'abs'    => 'text',
                'title'  => 'text',
                'height' => 'text',
            ];
            $shortcodeArray['data']['absplayer'] = [
                'key'    => 'text',
                'title'  => 'text',
                'exturl' => 'text',
            ];
            $shortcodeArray['data']['mediahub'] = [
                'id'     => 'text',
                'height' => 'text',
            ];
            $shortcodeArray['data']['tracklist'] = [
                'id'   => 'text',
                'base' => 'text',
            ];
            $shortcodeArray['data']['storylist'] = [
                'id' => 'text',
            ];
            $shortcodeArray['data']['accordion'] = [
                'title' => 'text',
                'open'  => 'text',
            ];
            $shortcodeArray['data']['/accordion'] = [];
            $shortcode->setData($shortcodeArray);
            return;
        }

        # 2. [:absplayer key="dtq_hp,dtq_thlh" title="..." exturl="..." :]
        if ($name === 'absplayer') {
            $shortcode->stopPropagation();
            $keys   = trim($params['key'] ?? '');
            $title  = htmlspecialchars($params['title'] ?? 'Trình Phát Pháp Âm', ENT_QUOTES, 'UTF-8');
            $extUrl = trim($params['exturl'] ?? '');

            $shortcode->setData($this->renderAbsPlayer($keys, $title, $extUrl));
            return;
        }

        # 3. [:embed url="..." abs="..." height="..." title="..." :]
        if ($name === 'embed') {
            $shortcode->stopPropagation();
            $url    = trim($params['url'] ?? '');
            $absKey = trim($params['abs'] ?? '');
            $height = htmlspecialchars($params['height'] ?? '680px', ENT_QUOTES, 'UTF-8');
            $title  = htmlspecialchars($params['title'] ?? 'Media Player', ENT_QUOTES, 'UTF-8');

            # Automatically resolve known blocked Audio.com embeds to native ABS playlist player
            if (!$absKey) {
                $absKey = $this->detectAbsKeyFromUrl($url);
            }
            if ($absKey) {
                $shortcode->setData($this->renderAbsPlayer($absKey, $title, $url));
                return;
            }

            $shortcode->setData($this->renderEmbedHtml($url, $height, $title));
            return;
        }

        # 4. [:mediahub id="..." height="..." :]
        if ($name === 'mediahub') {
            $shortcode->stopPropagation();
            $hubId  = $params['id'] ?? 'main';
            $height = htmlspecialchars($params['height'] ?? '680px', ENT_QUOTES, 'UTF-8');

            $shortcode->setData($this->renderMediaHub($hubId, $height));
            return;
        }

        # 5. [:tracklist id="..." base="..." :]
        if ($name === 'tracklist') {
            $shortcode->stopPropagation();
            $listId  = $params['id'] ?? 'tracks';
            $baseUrl = trim($params['base'] ?? '');

            $shortcode->setData($this->renderTracklist($listId, $baseUrl));
            return;
        }

        # 5b. [:storylist id="..." :]
        if ($name === 'storylist') {
            $shortcode->stopPropagation();
            $listId = $params['id'] ?? 'stories';

            $shortcode->setData($this->renderStorylist($listId));
            return;
        }

        # 6. [:accordion title="..." open="true" :] and [:/accordion:]
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

    protected function detectAbsKeyFromUrl(string $url): string
    {
        $map = [
            '1850234961241128' => 'dtq_hp,dtq_thlh,dtq_nt',
            '1858112921898023' => 'buhd5_1,buhd5_2',
            'bao-ung-hien-djoi-tap-3' => 'buhd3',
            'bao-ung-hien-djoi-tap-4' => 'buhd4',
            'bao-ung-hien-djoi-tap-5' => 'buhd5_1,buhd5_2',
            'bao-ung-hien-djoi-tap-6' => 'buhd6',
            'bao-ung-hien-djoi-tap-7' => 'buhd7',
            'A3E3w3dOtH' => 'buhd1',
            '8CCEm8aEHY' => 'buhd2',
            'oqg9fYzPEd' => 'kt_1',
            'oIcHXafnfh' => 'kt_20',
            'Kqn5_XSXcn' => 'kt_21',
            '1UybdTQ9Rw' => 'kt_22',
            'FutMZ_tVlQ' => 'kt_23',
            'RPaSo20NhW' => 'kt_24',
            'JOF9aBUxEh' => 'kt_25',
            'b3ktD4wW9F' => 'kt_26',
            'Kg0uYNyvg4' => 'kt_27',
        ];
        foreach ($map as $needle => $key) {
            if (str_contains($url, $needle)) {
                return $key;
            }
        }
        return '';
    }

    protected function resolveAbsGroups(string $keysCsv): array
    {
        $catalog = $this->getAbsCatalog();
        $host    = rtrim($catalog['host'] ?? 'https://qts-home.duckdns.org/audiobookshelf', '/');
        $token   = $catalog['token'] ?? '';
        $byKey   = $catalog['by_key'] ?? [];
        $byId    = $catalog['by_id'] ?? [];

        $keys   = array_filter(array_map('trim', explode(',', $keysCsv)));
        $groups = [];

        foreach ($keys as $k) {
            $entry = $byKey[$k] ?? ($byId[$k] ?? null);
            if (!$entry || empty($entry['tracks'])) {
                continue;
            }
            $itemId = $entry['id'];
            $tracks = [];
            foreach ($entry['tracks'] as $t) {
                $ino   = $t['ino'];
                $fname = preg_replace('/\.(mp3|m4a|aac|ogg|wav)$/i', '', $t['filename'] ?? ('Bài ' . $t['index']));
                $tracks[] = [
                    'index'    => $t['index'],
                    'title'    => $fname,
                    'duration' => (int)($t['duration'] ?? 0),
                    'src'      => $host . '/api/items/' . $itemId . '/file/' . $ino . '?token=' . $token,
                ];
            }
            $groups[] = [
                'key'    => $k,
                'id'     => $itemId,
                'title'  => $entry['title'] ?? $k,
                'tracks' => $tracks,
            ];
        }
        return $groups;
    }

    protected function renderAbsPlayer(string $keysCsv, string $title, string $extUrl = ''): string
    {
        $groups = $this->resolveAbsGroups($keysCsv);
        if (empty($groups)) {
            return '<div class="tm-media-alert">Không tìm thấy danh sách bài nghe cho khóa [' . htmlspecialchars($keysCsv, ENT_QUOTES, 'UTF-8') . '].</div>';
        }

        $uid        = 'tmabs_' . substr(md5($keysCsv . $title), 0, 8);
        $jsonGroups = htmlspecialchars(json_encode($groups, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), ENT_QUOTES, 'UTF-8');
        $firstTrack = $groups[0]['tracks'][0] ?? null;
        $firstSrc   = htmlspecialchars($firstTrack['src'] ?? '', ENT_QUOTES, 'UTF-8');
        $firstTitle = htmlspecialchars($firstTrack['title'] ?? '', ENT_QUOTES, 'UTF-8');
        $totalCount = 0;
        foreach ($groups as $g) {
            $totalCount += count($g['tracks']);
        }

        $html = '<div class="tm-absplayer" id="' . $uid . '" data-groups="' . $jsonGroups . '">'
              . '  <div class="tm-abs-top">'
              . '    <div class="tm-abs-info">'
              . '      <div class="tm-abs-badge-row">'
              . '        <span class="tm-abs-livebadge">● PHÁT TRỰC TIẾP MP3 (AUDIOBOOKSHELF)</span>'
              . '        <span class="tm-abs-totalbadge">Tổng số: ' . $totalCount . ' bài</span>';
        if ($extUrl) {
            $safeExt = htmlspecialchars($extUrl, ENT_QUOTES, 'UTF-8');
            $extLabel = str_contains($extUrl, 'audio.com') ? '↗ Mở trên Audio.com' : '↗ Mở trang gốc';
            $html .= '   <a class="tm-abs-extlink" href="' . $safeExt . '" target="_blank" rel="noopener noreferrer">' . $extLabel . '</a>';
        }
        $html .= '      </div>'
              . '      <div class="tm-abs-main-title">' . $title . '</div>'
              . '      <div class="tm-abs-nowplaying">Đang chọn: <strong class="tm-abs-np-title">' . $firstTitle . '</strong></div>'
              . '    </div>'
              . '    <div class="tm-abs-controls-bar">'
              . '      <button type="button" class="tm-abs-btn" onclick="window.tmAbsPrev(\'' . $uid . '\')" title="Bài trước">⏮ Trước</button>'
              . '      <audio class="tm-abs-audio" controls preload="metadata" src="' . $firstSrc . '"></audio>'
              . '      <button type="button" class="tm-abs-btn" onclick="window.tmAbsNext(\'' . $uid . '\')" title="Bài tiếp theo">Tiếp ⏭</button>'
              . '      <select class="tm-abs-speed" onchange="window.tmAbsSpeed(\'' . $uid . '\', this.value)" title="Tốc độ phát">'
              . '        <option value="0.85">0.85x</option>'
              . '        <option value="1" selected>1.0x</option>'
              . '        <option value="1.15">1.15x</option>'
              . '        <option value="1.25">1.25x</option>'
              . '        <option value="1.5">1.5x</option>'
              . '      </select>'
              . '    </div>'
              . '  </div>';

        if (count($groups) > 1) {
            $html .= '  <div class="tm-abs-tabs">';
            foreach ($groups as $gIdx => $g) {
                $active = ($gIdx === 0) ? ' active' : '';
                $gTitle = htmlspecialchars($g['title'], ENT_QUOTES, 'UTF-8');
                $gCount = count($g['tracks']);
                $html .= '<button type="button" class="tm-abs-tab' . $active . '" data-gidx="' . $gIdx . '" onclick="window.tmAbsSwitchGroup(\'' . $uid . '\', ' . $gIdx . ')">'
                      . '📁 ' . $gTitle . ' <span class="tm-abs-tab-count">(' . $gCount . ')</span>'
                      . '</button>';
            }
            $html .= '  </div>';
        }

        $html .= '  <div class="tm-abs-toolbar">'
              . '    <input type="search" class="tm-abs-search" placeholder="🔍 Tìm nhanh tên bài giảng / câu chuyện..." oninput="window.tmAbsFilter(\'' . $uid . '\', this.value)" />'
              . '  </div>'
              . '  <div class="tm-abs-tracklist">';

        foreach ($groups[0]['tracks'] as $tIdx => $t) {
            $active = ($tIdx === 0) ? ' active' : '';
            $tTitle = htmlspecialchars($t['title'], ENT_QUOTES, 'UTF-8');
            $durStr = $this->formatDuration($t['duration']);
            $html .= '<div class="tm-abs-track' . $active . '" data-tidx="' . $tIdx . '" data-title="' . htmlspecialchars(mb_strtolower($t['title'], 'UTF-8'), ENT_QUOTES, 'UTF-8') . '" onclick="window.tmAbsPlayTrack(\'' . $uid . '\', 0, ' . $tIdx . ')">'
                  . '  <span class="tm-abs-t-num">' . ($tIdx + 1) . '</span>'
                  . '  <span class="tm-abs-t-name">' . $tTitle . '</span>'
                  . '  <span class="tm-abs-t-dur">' . $durStr . '</span>'
                  . '  <span class="tm-abs-t-play">▶ Phát</span>'
                  . '  <a class="tm-abs-t-down" href="' . htmlspecialchars($t['src'], ENT_QUOTES, 'UTF-8') . '" download target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" title="Tải file MP3">💾 Tải</a>'
                  . '</div>';
        }

        $html .= '  </div>'
              . '</div>';

        return $html;
    }

    protected function formatDuration(int $seconds): string
    {
        if ($seconds <= 0) {
            return '';
        }
        $h = floor($seconds / 3600);
        $m = floor(($seconds % 3600) / 60);
        $s = $seconds % 60;
        if ($h > 0) {
            return sprintf('%d:%02d:%02d', $h, $m, $s);
        }
        return sprintf('%02d:%02d', $m, $s);
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
        $rawItems    = array_values($hubData['items']);

        # Enrich each hub item with native Audiobookshelf MP3 tracks when available
        $enrichedItems = [];
        foreach ($rawItems as $item) {
            $absKey = $item['abs_key'] ?? '';
            if (!$absKey && !empty($item['url'])) {
                $absKey = $this->detectAbsKeyFromUrl($item['url']);
            }
            if (!$absKey && !empty($item['slug'])) {
                $absKey = $this->detectAbsKeyFromUrl($item['slug']);
            }
            if ($absKey) {
                $groups = $this->resolveAbsGroups($absKey);
                if (!empty($groups)) {
                    $allTracks = [];
                    foreach ($groups as $g) {
                        $prefix = (count($groups) > 1) ? ('[' . $g['title'] . '] ') : '';
                        foreach ($g['tracks'] as $t) {
                            $t['title'] = $prefix . $t['title'];
                            $allTracks[] = $t;
                        }
                    }
                    $item['tracks'] = $allTracks;
                }
            }
            $enrichedItems[] = $item;
        }

        $uid       = 'tmhub_' . preg_replace('/[^a-zA-Z0-9_]/', '', $hubId) . '_' . substr(md5(json_encode($rawItems)), 0, 6);
        $jsonItems = htmlspecialchars(json_encode($enrichedItems, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), ENT_QUOTES, 'UTF-8');
        $count     = count($enrichedItems);

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
        foreach ($enrichedItems as $idx => $item) {
            $section = $item['section'] ?? null;
            if ($section && $section !== $currentSection) {
                $currentSection = $section;
                $html .= '<li class="tm-hub-section">' . htmlspecialchars($section, ENT_QUOTES, 'UTF-8') . '</li>';
            }

            $itemTitle  = htmlspecialchars($item['title'] ?? ('Mục ' . ($idx + 1)), ENT_QUOTES, 'UTF-8');
            $trackCount = isset($item['tracks']) ? count($item['tracks']) : 0;
            $itemSub    = htmlspecialchars($item['subtitle'] ?? ($trackCount > 0 ? ($trackCount . ' bài MP3') : ($item['duration'] ?? '')), ENT_QUOTES, 'UTF-8');
            $badge      = htmlspecialchars($item['badge'] ?? ($trackCount > 0 ? ($trackCount . ' bài') : ''), ENT_QUOTES, 'UTF-8');
            $activeCls  = ($idx === 0) ? ' active' : '';

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
               . '      <div class="tm-hub-card-wrap"></div>'
               . '      <div class="tm-hub-iframe-wrap" style="display:none;"><iframe class="tm-hub-iframe" allow="autoplay; fullscreen" src=""></iframe></div>'
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

            $html .= '<div class="tm-track-row" data-title="' . htmlspecialchars(mb_strtolower($title, 'UTF-8'), ENT_QUOTES, 'UTF-8') . '">'
                   . '  <span class="tm-track-idx">' . htmlspecialchars((string)$num, ENT_QUOTES, 'UTF-8') . '.</span>'
                   . '  <span class="tm-track-name">' . $title . '</span>'
                   . '  <div class="tm-track-actions">';

            if (!empty($track['audio_src'])) {
                $safeAudio = htmlspecialchars($track['audio_src'], ENT_QUOTES, 'UTF-8');
                $html .= '<button type="button" class="tm-track-btn tm-track-btn-play" onclick="window.tmPlayInlineAudio(this, \'' . $safeAudio . '\', \'' . addslashes($title) . '\')">🎧 Nghe MP3</button>';
            }
            if ($safeUrl) {
                $html .= '<a class="tm-track-action" href="' . $safeUrl . '" target="_blank" rel="noopener noreferrer">▶ Audio.com</a>';
            }
            if (!empty($track['read_url'])) {
                $safeRead = htmlspecialchars($track['read_url'], ENT_QUOTES, 'UTF-8');
                $html .= '<a class="tm-track-btn tm-track-btn-read" href="' . $safeRead . '" target="_blank" rel="noopener noreferrer">📖 Đọc sách</a>';
            }
            if (!empty($track['video_url'])) {
                $safeVideo = htmlspecialchars($track['video_url'], ENT_QUOTES, 'UTF-8');
                $html .= '<a class="tm-track-btn tm-track-btn-video" href="' . $safeVideo . '" target="_blank" rel="noopener noreferrer">🎬 Video</a>';
            }

            $html .= '  </div>'
                   . '</div>';
        }

        $html .= '  </div>'
               . '</div>';

        return $html;
    }

    protected function renderStorylist(string $listId): string
    {
        $storyData = $this->currentMeta['mediaplayer'][$listId] ?? ($this->currentMeta['stories'] ?? null);
        if (!$storyData || empty($storyData['items']) || !is_array($storyData['items'])) {
            return '<div class="tm-media-alert">Chưa có danh sách truyện cho [' . htmlspecialchars($listId, ENT_QUOTES, 'UTF-8') . '].</div>';
        }

        $items = array_values($storyData['items']);
        $uid   = 'tmstories_' . substr(md5($listId . count($items)), 0, 6);

        $html = '<div class="tm-storylist-box" id="' . $uid . '">'
              . '  <div class="tm-tracklist-toolbar">'
              . '    <input type="search" class="tm-tracklist-search" placeholder="🔍 Tìm nhanh theo tên truyện hoặc nội dung nhân quả..." oninput="window.tmFilterStories(\'' . $uid . '\', this.value)" />'
              . '    <span class="tm-tracklist-count">Tổng số: <strong>' . count($items) . '</strong> mục truyện</span>'
              . '  </div>'
              . '  <div class="tm-storylist-items">';

        foreach ($items as $i => $st) {
            $num       = $st['id'] ?? ($i + 1);
            $title     = htmlspecialchars($st['title'] ?? ('Truyện ' . $num), ENT_QUOTES, 'UTF-8');
            $summary   = nl2br(htmlspecialchars($st['summary'] ?? '', ENT_QUOTES, 'UTF-8'));
            $searchTxt = htmlspecialchars(mb_strtolower(($st['title'] ?? '') . ' ' . ($st['summary'] ?? ''), 'UTF-8'), ENT_QUOTES, 'UTF-8');
            $vidBoxId  = $uid . '_vid_' . $i;

            $html .= '<div class="tm-story-card" data-search="' . $searchTxt . '">'
                   . '  <div class="tm-story-header">'
                   . '    <div class="tm-story-title-wrap">'
                   . '      <span class="tm-story-num">#' . htmlspecialchars((string)$num, ENT_QUOTES, 'UTF-8') . '</span>'
                   . '      <h4 class="tm-story-title">' . $title . '</h4>'
                   . '    </div>'
                   . '    <div class="tm-story-badges">';

            if (!empty($st['audio_src'])) {
                $safeAudio = htmlspecialchars($st['audio_src'], ENT_QUOTES, 'UTF-8');
                $jsTitle   = htmlspecialchars(addslashes($st['title'] ?? ('Truyện ' . $num)), ENT_QUOTES, 'UTF-8');
                $html .= '<button type="button" class="tm-track-btn tm-track-btn-play" onclick="window.tmPlayInlineAudio(this, \'' . $safeAudio . '\', \'' . $jsTitle . '\')">🎧 Nghe Audio</button>';
                $html .= '<a class="tm-track-btn tm-track-btn-download" href="' . $safeAudio . '" download target="_blank" rel="noopener noreferrer" title="Tải file MP3">💾 Tải MP3</a>';
            }

            if (!empty($st['read_url'])) {
                $safeRead  = htmlspecialchars($st['read_url'], ENT_QUOTES, 'UTF-8');
                $readLabel = htmlspecialchars($st['read_label'] ?? '📖 Sách đọc', ENT_QUOTES, 'UTF-8');
                $html .= '<a class="tm-track-btn tm-track-btn-read" href="' . $safeRead . '" target="_blank" rel="noopener noreferrer">' . $readLabel . '</a>';
            }

            if (!empty($st['pdf_url'])) {
                $safePdf = htmlspecialchars($st['pdf_url'], ENT_QUOTES, 'UTF-8');
                $html .= '<a class="tm-track-btn tm-fmt-pdf" href="' . $safePdf . '" target="_blank" rel="noopener noreferrer">📄 Bản PDF</a>';
            }

            if (!empty($st['video_url'])) {
                $safeVid = htmlspecialchars($st['video_url'], ENT_QUOTES, 'UTF-8');
                $normVid = $this->normalizeEmbedUrl($st['video_url']);
                $embedVid = htmlspecialchars($normVid['url'], ENT_QUOTES, 'UTF-8');
                $html .= '<button type="button" class="tm-track-btn tm-track-btn-video" onclick="window.tmToggleStoryVideo(\'' . $vidBoxId . '\', \'' . $embedVid . '\')">🎬 Xem Video</button>';
                $html .= '<a class="tm-track-action" href="' . $safeVid . '" target="_blank" rel="noopener noreferrer" title="Mở YouTube trong tab mới">↗ YouTube</a>';
            }

            $html .= '    </div>'
                   . '  </div>';

            if ($summary) {
                $html .= '  <div class="tm-story-summary">' . $summary . '</div>';
            }

            if (!empty($st['video_url'])) {
                $html .= '  <div class="tm-story-video-drawer" id="' . $vidBoxId . '" style="display:none;"></div>';
            }

            $html .= '</div>';
        }

        $html .= '  </div>'
               . '</div>';

        return $html;
    }
}

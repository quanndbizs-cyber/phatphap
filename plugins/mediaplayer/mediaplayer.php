<?php

namespace Plugins\mediaplayer;

use Typemill\Plugin;

class mediaplayer extends Plugin
{
    protected $currentMeta    = [];
    protected $currentItem     = null;
    protected $absCatalog      = null;
    protected $playerRendered  = false;

    public static function getSubscribedEvents()
    {
        return [
            'onCspLoaded'       => ['onCspLoaded', 0],
            'onTwigLoaded'      => ['onTwigLoaded', 0],
            'onItemLoaded'      => ['onItemLoaded', 0],
            'onMetaLoaded'      => ['onMetaLoaded', 0],
            'onHtmlLoaded'      => ['onHtmlLoaded', 0],
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
            $this->addCSS('/mediaplayer/css/mediaplayer.css?20261109a');
            $this->addJS('/mediaplayer/js/mediaplayer.js?20261109a');
        }
    }

    public function onMetaLoaded($metadata)
    {
        $this->currentMeta = $metadata->getData();
        if (!is_array($this->currentMeta)) {
            $this->currentMeta = [];
        }

        # If user configured raw YAML stories in the backend meta tab, parse it
        $rawYaml = $this->currentMeta['mediaplayer']['stories_yaml'] ?? null;
        if (!empty($rawYaml) && is_string($rawYaml)) {
            try {
                $parsed = \Symfony\Component\Yaml\Yaml::parse($rawYaml);
                if (is_array($parsed)) {
                    if (isset($parsed['items']) && is_array($parsed['items'])) {
                        $this->currentMeta['mediaplayer']['stories'] = $parsed;
                    } elseif (array_is_list($parsed)) {
                        $this->currentMeta['mediaplayer']['stories'] = ['items' => $parsed];
                    } else {
                        $this->currentMeta['mediaplayer']['stories'] = $parsed;
                    }
                }
            } catch (\Throwable $e) {
                // Ignore parse errors, let page render safely
            }
        }
    }

    public function onHtmlLoaded($html)
    {
        $mode = $this->currentMeta['mediaplayer']['player_mode'] ?? 'none';
        if ($mode === 'none' || empty($mode) || $this->playerRendered) {
            return;
        }

        $key    = trim($this->currentMeta['mediaplayer']['abs_key'] ?? ($this->currentMeta['mediaplayer']['key'] ?? ''));
        $title  = trim($this->currentMeta['mediaplayer']['title'] ?? ($this->currentMeta['meta']['title'] ?? 'Trình Phát Pháp Âm'));
        $extUrl = trim($this->currentMeta['mediaplayer']['exturl'] ?? '');

        if (!$key && !$extUrl) {
            return;
        }

        $rendered = '';
        if (str_starts_with($mode, 'buhdview')) {
            $rendered = $this->renderBuhdView($key, 'stories', $title, $extUrl);
        } elseif (str_starts_with($mode, 'absplayer')) {
            $rendered = $this->renderAbsPlayer($key, $title, $extUrl);
        }

        if ($rendered) {
            $contentHtml = $html->getData();
            if (str_ends_with($mode, '_top')) {
                $html->setData($rendered . $contentHtml);
            } else {
                $html->setData($contentHtml . $rendered);
            }
            $this->playerRendered = true;
        }
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
            $shortcodeArray['data']['kpcreader'] = [
                'verse'   => 'text',
                'toc_url' => 'text',
            ];
            $shortcodeArray['data']['kpctoc'] = [
                'reader_url' => 'text',
                'mode'       => 'text',
            ];
            $shortcode->setData($shortcodeArray);
            return;
        }

        # 1b. [:kpcreader verse="1" toc_url="/phat-giao/kinh-phap-cu/muc-luc-kinh-phap-cu" :]
        if ($name === 'kpcreader') {
            $shortcode->stopPropagation();
            $this->playerRendered = true;
            $verse  = (int)($params['verse'] ?? 1);
            if ($verse < 1 || $verse > 423) {
                $verse = 1;
            }
            $tocUrl = trim($params['toc_url'] ?? '/phat-giao/kinh-phap-cu/muc-luc-kinh-phap-cu');
            $shortcode->setData($this->renderKpcReader($verse, $tocUrl));
            return;
        }

        # 1c. [:kpctoc reader_url="/phat-giao/kinh-phap-cu/doc-kinh-phap-cu" mode="full" :]
        if ($name === 'kpctoc') {
            $shortcode->stopPropagation();
            $readerUrl = trim($params['reader_url'] ?? '/phat-giao/kinh-phap-cu/doc-kinh-phap-cu');
            $mode      = trim($params['mode'] ?? 'full');
            $shortcode->setData($this->renderKpcToc($readerUrl, $mode));
            return;
        }

        # 2. [:absplayer key="dtq_hp,dtq_thlh" title="..." exturl="..." :]
        if ($name === 'absplayer') {
            $shortcode->stopPropagation();
            $this->playerRendered = true;
            $keys   = trim($params['key'] ?? ($this->currentMeta['mediaplayer']['abs_key'] ?? ($this->currentMeta['mediaplayer']['key'] ?? '')));
            $title  = htmlspecialchars($params['title'] ?? ($this->currentMeta['mediaplayer']['title'] ?? ($this->currentMeta['meta']['title'] ?? 'Trình Phát Pháp Âm')), ENT_QUOTES, 'UTF-8');
            $extUrl = trim($params['exturl'] ?? ($this->currentMeta['mediaplayer']['exturl'] ?? ''));

            $shortcode->setData($this->renderAbsPlayer($keys, $title, $extUrl));
            return;
        }

        # 3. [:embed url="..." abs="..." height="..." title="..." :]
        if ($name === 'embed') {
            $shortcode->stopPropagation();
            $this->playerRendered = true;
            $url    = trim($params['url'] ?? ($this->currentMeta['mediaplayer']['exturl'] ?? ''));
            $absKey = trim($params['abs'] ?? ($this->currentMeta['mediaplayer']['abs_key'] ?? ''));
            $height = htmlspecialchars($params['height'] ?? '680px', ENT_QUOTES, 'UTF-8');
            $title  = htmlspecialchars($params['title'] ?? ($this->currentMeta['mediaplayer']['title'] ?? 'Media Player'), ENT_QUOTES, 'UTF-8');

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
            $this->playerRendered = true;
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

        # 5c. [:buhdview key="..." stories="..." title="..." exturl="..." :]
        if ($name === 'buhdview') {
            $shortcode->stopPropagation();
            $this->playerRendered = true;
            $key     = trim($params['key'] ?? ($this->currentMeta['mediaplayer']['abs_key'] ?? ($this->currentMeta['mediaplayer']['key'] ?? '')));
            $stories = trim($params['stories'] ?? 'stories');
            $title   = trim($params['title'] ?? ($this->currentMeta['mediaplayer']['title'] ?? ($this->currentMeta['meta']['title'] ?? 'Báo Ứng Hiện Đời')));
            $extUrl  = trim($params['exturl'] ?? ($this->currentMeta['mediaplayer']['exturl'] ?? ''));

            $shortcode->setData($this->renderBuhdView($key, $stories, $title, $extUrl));
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
                $ino   = $t['ino'] ?? '';
                $fname = preg_replace('/\.(mp3|m4a|aac|ogg|wav)$/i', '', $t['filename'] ?? ($t['title'] ?? ('Bài ' . $t['index'])));
                $src   = $t['src'] ?? ($t['url'] ?? ($ino ? ($host . '/api/items/' . $itemId . '/file/' . $ino . '?token=' . $token) : ''));
                $tracks[] = [
                    'index'    => $t['index'],
                    'title'    => $fname,
                    'duration' => (int)($t['duration'] ?? 0),
                    'src'      => $src,
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

        $isAbsSource = str_contains($firstSrc, 'audiobookshelf');
        $badgeText   = $isAbsSource ? '● PHÁT TRỰC TIẾP MP3 (AUDIOBOOKSHELF)' : '● PHÁT TRỰC TIẾP MP3';

        $html = '<div class="tm-absplayer" id="' . $uid . '" data-groups="' . $jsonGroups . '">'
              . '  <div class="tm-abs-top">'
              . '    <div class="tm-abs-info">'
              . '      <div class="tm-abs-badge-row">'
              . '        <span class="tm-abs-livebadge">' . $badgeText . '</span>'
              . '        <span class="tm-abs-totalbadge">Tổng số: ' . $totalCount . ' bài</span>';
        if ($extUrl) {
            $safeExt = htmlspecialchars($this->qualifyUrl($extUrl), ENT_QUOTES, 'UTF-8');
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

    protected function qualifyUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '' || preg_match('#^(https?:)?//#i', $url) || str_starts_with($url, '#') || str_starts_with($url, 'mailto:') || str_starts_with($url, 'tel:') || str_starts_with($url, 'javascript:')) {
            return $url;
        }

        $base = rtrim($this->urlinfo['baseurl'] ?? '', '/');
        if ($base === '') {
            return $url;
        }

        # If base contains a subpath, e.g. https://domain.com/phatphap
        # and url already begins with /phatphap/, don't double prefix
        $basePath = parse_url($base, PHP_URL_PATH);
        if (!empty($basePath) && $basePath !== '/') {
            $basePath = rtrim($basePath, '/');
            if (str_starts_with($url, $basePath . '/') || $url === $basePath) {
                $schemeHost = preg_replace('#' . preg_quote($basePath, '#') . '$#', '', $base);
                return rtrim($schemeHost, '/') . '/' . ltrim($url, '/');
            }
        }

        return $base . '/' . ltrim($url, '/');
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
            return [
                'type' => 'audio',
                'url'  => $this->qualifyUrl($url),
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
            if (!empty($item['read_url'])) {
                $item['read_url'] = $this->qualifyUrl($item['read_url']);
            }
            if (!empty($item['pdf_url'])) {
                $item['pdf_url'] = $this->qualifyUrl($item['pdf_url']);
            }
            if (!empty($item['audio_src'])) {
                $item['audio_src'] = $this->qualifyUrl($item['audio_src']);
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
                $safeAudio = htmlspecialchars($this->qualifyUrl($track['audio_src']), ENT_QUOTES, 'UTF-8');
                $html .= '<button type="button" class="tm-track-btn tm-track-btn-play" onclick="window.tmPlayInlineAudio(this, \'' . $safeAudio . '\', \'' . addslashes($title) . '\')">🎧 Nghe MP3</button>';
            }
            if ($safeUrl) {
                $html .= '<a class="tm-track-action" href="' . $safeUrl . '" target="_blank" rel="noopener noreferrer">▶ Audio.com</a>';
            }
            if (!empty($track['read_url'])) {
                $safeRead = htmlspecialchars($this->qualifyUrl($track['read_url']), ENT_QUOTES, 'UTF-8');
                $html .= '<a class="tm-track-btn tm-track-btn-read" href="' . $safeRead . '" target="_blank" rel="noopener noreferrer">📖 Đọc sách</a>';
            }
            if (!empty($track['video_url'])) {
                $safeVideo = htmlspecialchars($this->qualifyUrl($track['video_url']), ENT_QUOTES, 'UTF-8');
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

            $html .= '<div class="tm-story-card" id="truyen-' . $num . '" data-search="' . $searchTxt . '">'
                   . '  <div class="tm-story-header">'
                   . '    <div class="tm-story-title-wrap">'
                   . '      <span class="tm-story-num">#' . htmlspecialchars((string)$num, ENT_QUOTES, 'UTF-8') . '</span>'
                   . '      <h4 class="tm-story-title">' . $title . '</h4>'
                   . '    </div>'
                   . '    <div class="tm-story-badges">';

            if (!empty($st['audio_src'])) {
                $safeAudio = htmlspecialchars($this->qualifyUrl($st['audio_src']), ENT_QUOTES, 'UTF-8');
                $jsTitle   = htmlspecialchars(addslashes($st['title'] ?? ('Truyện ' . $num)), ENT_QUOTES, 'UTF-8');
                $html .= '<button type="button" class="tm-track-btn tm-track-btn-play" onclick="window.tmPlayInlineAudio(this, \'' . $safeAudio . '\', \'' . $jsTitle . '\')">🎧 Nghe Audio</button>';
                $html .= '<a class="tm-track-btn tm-track-btn-download" href="' . $safeAudio . '" download target="_blank" rel="noopener noreferrer" title="Tải file MP3">💾 Tải MP3</a>';
            }

            $itemReadUrl = !empty($st['read_url']) ? $st['read_url'] : ($this->currentMeta['mediaplayer']['read_url'] ?? '');
            if (!empty($itemReadUrl)) {
                $safeRead  = htmlspecialchars($this->qualifyUrl($itemReadUrl), ENT_QUOTES, 'UTF-8');
                $readLabel = htmlspecialchars($st['read_label'] ?? '📖 Sách đọc', ENT_QUOTES, 'UTF-8');
                $html .= '<a class="tm-track-btn tm-track-btn-read" href="' . $safeRead . '" target="_blank" rel="noopener noreferrer">' . $readLabel . '</a>';
            }

            $itemPdfUrl = !empty($st['pdf_url']) ? $st['pdf_url'] : ($this->currentMeta['mediaplayer']['pdf_url'] ?? '');
            if (!empty($itemPdfUrl)) {
                $safePdf = htmlspecialchars($this->qualifyUrl($itemPdfUrl), ENT_QUOTES, 'UTF-8');
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
                $rawSummary = trim(strip_tags($st['summary'] ?? ''));
                $lineCount  = count(explode("\n", $rawSummary));
                $isLong     = ($lineCount > 3) || (mb_strlen($rawSummary, 'UTF-8') > 160);

                if ($isLong) {
                    $html .= '  <div class="tm-story-summary tm-summary-collapsible" onclick="window.tmToggleSummary(this)" title="Bấm để xem đầy đủ hoặc thu gọn tóm tắt">'
                           . '    <div class="tm-summary-text">' . $summary . '</div>'
                           . '    <div class="tm-summary-toggle-row"><span class="tm-summary-toggle-btn">Xem thêm ▾</span></div>'
                           . '  </div>';
                } else {
                    $html .= '  <div class="tm-story-summary">'
                           . '    <div class="tm-summary-text">' . $summary . '</div>'
                           . '  </div>';
                }
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

    protected function renderBuhdView(string $keysCsv, string $storyListId, string $title, string $extUrl): string
    {
        $audioHtml   = $this->renderAbsPlayer($keysCsv, $title, $extUrl);
        $storiesHtml = $this->renderStorylist($storyListId);

        $groups = $this->resolveAbsGroups($keysCsv);
        $audioCount = 0;
        foreach ($groups as $g) {
            $audioCount += count($g['tracks'] ?? []);
        }

        $storyData  = $this->currentMeta['mediaplayer'][$storyListId] ?? ($this->currentMeta['stories'] ?? null);
        $storyCount = (!empty($storyData['items']) && is_array($storyData['items'])) ? count($storyData['items']) : 0;

        $uid = 'tmbuhd_' . substr(md5($keysCsv . $storyListId . $title), 0, 8);

        $audioBadge = $audioCount > 0 ? ('<span class="tm-buhd-tab-count">' . $audioCount . ' bài</span>') : '';
        $storyBadge = $storyCount > 0 ? ('<span class="tm-buhd-tab-count">' . $storyCount . ' mục</span>') : '';

        $html = '<div class="tm-buhdview" id="' . $uid . '">'
              . '  <div class="tm-buhdview-tabs" role="tablist">'
              . '    <button type="button" class="tm-buhdview-tab active" data-tab="audio" role="tab" aria-selected="true" onclick="window.tmSwitchBuhdTab(' . "'" . $uid . "'" . ', ' . "'audio'" . ')">'
              . '      <span class="tm-buhd-tab-icon">🎧</span>'
              . '      <span>Nghe Audio MP3</span> ' . $audioBadge
              . '    </button>'
              . '    <button type="button" class="tm-buhdview-tab" data-tab="stories" role="tab" aria-selected="false" onclick="window.tmSwitchBuhdTab(' . "'" . $uid . "'" . ', ' . "'stories'" . ')">'
              . '      <span class="tm-buhd-tab-icon">📖</span>'
              . '      <span>Tóm Tắt &amp; Đọc Sách / Video</span> ' . $storyBadge
              . '    </button>'
              . '  </div>'
              . '  <div class="tm-buhdview-panes">'
              . '    <div class="tm-buhdview-pane active" data-pane="audio">'
              .        $audioHtml
              . '    </div>'
              . '    <div class="tm-buhdview-pane" data-pane="stories" style="display:none;">'
              .        $storiesHtml
              . '    </div>'
              . '  </div>'
              . '</div>';

        return $html;
    }

    protected function getKpcIndex(): array
    {
        $path = __DIR__ . '/data/kpc_index.json';
        if (file_exists($path)) {
            $decoded = json_decode(file_get_contents($path), true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
        return ['meta' => [], 'phams' => [], 'toc' => []];
    }

    protected function renderKpcReader(int $initialVerse, string $tocUrl): string
    {
        $idxData = $this->getKpcIndex();
        $phams   = $idxData['phams'] ?? [];
        $toc     = $idxData['toc'] ?? [];

        $masterJsonUrl = htmlspecialchars($this->qualifyUrl('/media/files/kinh-phap-cu/kpc_master.json'), ENT_QUOTES, 'UTF-8');
        $safeTocUrl    = htmlspecialchars($this->qualifyUrl($tocUrl), ENT_QUOTES, 'UTF-8');
        $introUrl      = htmlspecialchars($this->qualifyUrl('/phat-giao/kinh-phap-cu'), ENT_QUOTES, 'UTF-8');

        # Build Pham <option> list and quick jump <option> list
        $phamOptions = '';
        foreach ($phams as $p) {
            $pid    = (int)($p['id'] ?? 1);
            $pname  = htmlspecialchars($p['name'] ?? '', ENT_QUOTES, 'UTF-8');
            $vstart = (int)($p['verse_start'] ?? 1);
            $vend   = (int)($p['verse_end'] ?? 20);
            $phamOptions .= '<option value="' . $vstart . '" data-pham-id="' . $pid . '" data-start="' . $vstart . '" data-end="' . $vend . '">'
                          . sprintf('%02d. %s (Kệ %d–%d)', $pid, $pname, $vstart, $vend)
                          . '</option>';
        }

        $verseOptions = '';
        foreach ($toc as $item) {
            $vnum  = (int)($item['num'] ?? 1);
            $fline = htmlspecialchars(mb_strimwidth($item['first_line'] ?? '', 0, 48, '…', 'UTF-8'), ENT_QUOTES, 'UTF-8');
            $sel   = ($vnum === $initialVerse) ? ' selected' : '';
            $verseOptions .= '<option value="' . $vnum . '"' . $sel . '>Bài kệ ' . $vnum . ' — ' . $fline . '</option>';
        }

        $html = '<div class="tm-kpc-reader-app" id="tm-kpc-reader" data-json-url="' . $masterJsonUrl . '" data-toc-url="' . $safeTocUrl . '" data-intro-url="' . $introUrl . '" data-init-verse="' . $initialVerse . '">'
              . '  <div class="tm-kpc-top-strip">'
              . '    <div class="tm-kpc-top-left">'
              . '      <a href="' . $introUrl . '" class="tm-kpc-pill-link" title="Về trang Giới thiệu Kinh Pháp Cú">☸ Giới thiệu</a>'
              . '      <a href="' . $safeTocUrl . '" class="tm-kpc-pill-link tm-kpc-pill-toc" title="Mở trang Mục Lục riêng (26 Phẩm &amp; 423 Bài Kệ)">📑 Mục lục (423 bài)</a>'
              . '    </div>'
              . '    <div class="tm-kpc-top-right">'
              . '      <label for="tm-kpc-pham-select" class="tm-kpc-sr-only">Chọn Phẩm</label>'
              . '      <select id="tm-kpc-pham-select" class="tm-kpc-select tm-kpc-pham-select" onchange="window.tmKpcGoTo(this.value)" title="Chuyển nhanh theo 26 Phẩm">'
              .          $phamOptions
              . '      </select>'
              . '    </div>'
              . '  </div>'
              . '  <div class="tm-kpc-stage" id="tm-kpc-stage">'
              . '    <div class="tm-kpc-loading">🪷 Đang tải bài kệ &amp; tích truyện Kinh Pháp Cú...</div>'
              . '  </div>'
              . '  <nav class="tm-kpc-sticky-bar" id="tm-kpc-sticky-bar" aria-label="Điều hướng bài kệ Kinh Pháp Cú">'
              . '    <div class="tm-kpc-sticky-inner">'
              . '      <button type="button" class="tm-kpc-nav-btn tm-kpc-prev-btn" id="tm-kpc-prev-btn" onclick="window.tmKpcStep(-1)" title="Bài kệ trước (Phím mũi tên trái ←)">'
              . '        <span class="tm-kpc-nav-arrow">⏮</span> <span class="tm-kpc-nav-txt">Bài trước</span>'
              . '      </button>'
              . '      <div class="tm-kpc-jump-group">'
              . '        <a href="' . $safeTocUrl . '" class="tm-kpc-toc-btn" title="Vào trang Mục Lục riêng để chọn bài bất kỳ">'
              . '          <span>📑</span> <span class="tm-kpc-toc-txt">Mục lục</span>'
              . '        </a>'
              . '        <select id="tm-kpc-verse-select" class="tm-kpc-verse-select" onchange="window.tmKpcGoTo(this.value)" aria-label="Chọn nhanh bài kệ từ 1 đến 423">'
              .            $verseOptions
              . '        </select>'
              . '        <div class="tm-kpc-num-jump">'
              . '          <input type="number" id="tm-kpc-jump-input" class="tm-kpc-jump-input" min="1" max="423" placeholder="1-423" aria-label="Nhập số bài kệ (1-423)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();window.tmKpcJumpInput();}" />'
              . '          <button type="button" class="tm-kpc-jump-go" onclick="window.tmKpcJumpInput()" title="Chuyển tới bài kệ này">Đến</button>'
              . '        </div>'
              . '      </div>'
              . '      <button type="button" class="tm-kpc-nav-btn tm-kpc-next-btn" id="tm-kpc-next-btn" onclick="window.tmKpcStep(1)" title="Bài kệ tiếp theo (Phím mũi tên phải →)">'
              . '        <span class="tm-kpc-nav-txt">Bài sau</span> <span class="tm-kpc-nav-arrow">⏭</span>'
              . '      </button>'
              . '    </div>'
              . '  </nav>'
              . '</div>';

        return $html;
    }

    protected function renderKpcToc(string $readerUrl, string $mode = 'full'): string
    {
        $idxData       = $this->getKpcIndex();
        $phams         = $idxData['phams'] ?? [];
        $toc           = $idxData['toc'] ?? [];
        $safeReaderUrl = htmlspecialchars($this->qualifyUrl($readerUrl), ENT_QUOTES, 'UTF-8');

        if ($mode === 'overview') {
            # Compact 26-Pham overview grid for the Introduction page
            $html = '<div class="tm-kpc-pham-grid">';
            foreach ($phams as $p) {
                $pid    = (int)($p['id'] ?? 1);
                $pname  = htmlspecialchars($p['name'] ?? '', ENT_QUOTES, 'UTF-8');
                $ppali  = htmlspecialchars($p['pali'] ?? '', ENT_QUOTES, 'UTF-8');
                $vstart = (int)($p['verse_start'] ?? 1);
                $vend   = (int)($p['verse_end'] ?? 20);
                $vcount = (int)($p['verse_count'] ?? ($vend - $vstart + 1));

                $html .= '<a href="' . $safeReaderUrl . '?bai=' . $vstart . '" class="tm-kpc-pham-card">'
                       . '  <div class="tm-kpc-pham-card-top">'
                       . '    <span class="tm-kpc-pham-num">Phẩm ' . sprintf('%02d', $pid) . '</span>'
                       . '    <span class="tm-kpc-pham-range">Kệ ' . $vstart . '–' . $vend . ' (' . $vcount . ' câu)</span>'
                       . '  </div>'
                       . '  <div class="tm-kpc-pham-title">' . $pname . '</div>'
                       . '  <div class="tm-kpc-pham-pali">' . $ppali . '</div>'
                       . '</a>';
            }
            $html .= '</div>';
            return $html;
        }

        # Group toc verses by pham_id
        $byPham = [];
        foreach ($toc as $v) {
            $pid = (int)($v['pham_id'] ?? 1);
            $byPham[$pid][] = $v;
        }

        $phamFilterPills = '<button type="button" class="tm-kpc-filter-pill active" data-pham="all" onclick="window.tmKpcFilterPham(\'all\', this)">Tất cả 26 Phẩm (423 bài)</button>';
        foreach ($phams as $p) {
            $pid   = (int)($p['id'] ?? 1);
            $pname = htmlspecialchars($p['name'] ?? '', ENT_QUOTES, 'UTF-8');
            $vstart = (int)($p['verse_start'] ?? 1);
            $vend   = (int)($p['verse_end'] ?? 20);
            $phamFilterPills .= '<button type="button" class="tm-kpc-filter-pill" data-pham="' . $pid . '" onclick="window.tmKpcFilterPham(\'' . $pid . '\', this)">'
                              . sprintf('%02d. %s (%d–%d)', $pid, $pname, $vstart, $vend)
                              . '</button>';
        }

        $html = '<div class="tm-kpc-toc-app" id="tm-kpc-toc-app" data-reader-url="' . $safeReaderUrl . '">'
              . '  <div class="tm-kpc-toc-controls">'
              . '    <div class="tm-kpc-toc-search-row">'
              . '      <input type="search" id="tm-kpc-toc-search" class="tm-kpc-toc-search" placeholder="🔍 Tìm theo số bài kệ (1–423), lời kệ hoặc tên tích truyện (vd: Cakkhupāla, 183, vô thường)..." oninput="window.tmKpcFilterToc(this.value)" />'
              . '      <div class="tm-kpc-toc-quickjump">'
              . '        <input type="number" id="tm-kpc-toc-num" class="tm-kpc-jump-input" min="1" max="423" placeholder="Số bài (1-423)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();window.tmKpcTocGoNum();}" />'
              . '        <button type="button" class="tm-kpc-jump-go" onclick="window.tmKpcTocGoNum()">Đọc ngay →</button>'
              . '      </div>'
              . '    </div>'
              . '    <div class="tm-kpc-filter-pills" id="tm-kpc-filter-pills">'
              .        $phamFilterPills
              . '    </div>'
              . '  </div>'
              . '  <div class="tm-kpc-toc-sections" id="tm-kpc-toc-sections">';

        foreach ($phams as $p) {
            $pid    = (int)($p['id'] ?? 1);
            $pname  = htmlspecialchars($p['name'] ?? '', ENT_QUOTES, 'UTF-8');
            $ppali  = htmlspecialchars($p['pali'] ?? '', ENT_QUOTES, 'UTF-8');
            $vstart = (int)($p['verse_start'] ?? 1);
            $vend   = (int)($p['verse_end'] ?? 20);
            $vlist  = $byPham[$pid] ?? [];

            $html .= '<section class="tm-kpc-toc-section" data-pham-section="' . $pid . '" id="pham-' . $pid . '">'
                   . '  <div class="tm-kpc-toc-sec-header">'
                   . '    <div>'
                   . '      <span class="tm-kpc-sec-badge">Phẩm ' . sprintf('%02d', $pid) . ' • ' . $ppali . '</span>'
                   . '      <h3 class="tm-kpc-sec-title">' . $pname . ' <small>(Bài kệ ' . $vstart . ' – ' . $vend . ')</small></h3>'
                   . '    </div>'
                   . '    <a href="' . $safeReaderUrl . '?bai=' . $vstart . '" class="tm-kpc-sec-readbtn">Đọc từ kệ ' . $vstart . ' →</a>'
                   . '  </div>'
                   . '  <div class="tm-kpc-toc-grid">';

            foreach ($vlist as $v) {
                $vnum      = (int)($v['num'] ?? 1);
                $preview   = htmlspecialchars($v['vn_preview'] ?? ($v['first_line'] ?? ''), ENT_QUOTES, 'UTF-8');
                $storyName = htmlspecialchars($v['story_name'] ?? '', ENT_QUOTES, 'UTF-8');
                $hasVideo  = !empty($v['has_video']);
                $searchStr = htmlspecialchars(mb_strtolower($vnum . ' ' . ($v['vn_preview'] ?? '') . ' ' . ($v['story_name'] ?? '') . ' ' . $pname, 'UTF-8'), ENT_QUOTES, 'UTF-8');

                $html .= '<a href="' . $safeReaderUrl . '?bai=' . $vnum . '" class="tm-kpc-toc-item" data-verse="' . $vnum . '" data-search="' . $searchStr . '">'
                       . '  <div class="tm-kpc-toc-item-top">'
                       . '    <span class="tm-kpc-toc-vnum">Bài kệ ' . $vnum . '</span>'
                       . '    <span class="tm-kpc-toc-icons">'
                       .        '🖼️' . ($hasVideo ? ' 🎬' : '')
                       . '    </span>'
                       . '  </div>'
                       . '  <div class="tm-kpc-toc-vtext">' . $preview . '</div>'
                       . ($storyName ? '<div class="tm-kpc-toc-story">📖 Tích truyện: <strong>' . $storyName . '</strong></div>' : '')
                       . '</a>';
            }

            $html .= '  </div>'
                   . '</section>';
        }

        $html .= '  </div>'
               . '</div>';

        return $html;
    }
}

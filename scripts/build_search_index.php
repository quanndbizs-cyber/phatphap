<?php
/**
 * Tịnh Độ Liên Hoa - Search Index Generator
 * Scans all markdown content across the system and builds a comprehensive search index.
 */

declare(strict_types=1);

$baseDir = dirname(__DIR__);
$contentDir = $baseDir . '/content';
$outputFile = $baseDir . '/themes/tinhdo/js/search-index.json';

if (!is_dir($contentDir)) {
    fwrite(STDERR, "Lỗi: Không tìm thấy thư mục content: $contentDir\n");
    exit(1);
}

function removeVietnameseAccents(string $str): string
{
    $accents = [
        'à'=>'a','á'=>'a','ả'=>'a','ã'=>'a','ạ'=>'a','ă'=>'a','ằ'=>'a','ắ'=>'a','ẳ'=>'a','ẵ'=>'a','ặ'=>'a','â'=>'a','ầ'=>'a','ấ'=>'a','ẩ'=>'a','ẫ'=>'a','ậ'=>'a',
        'è'=>'e','é'=>'e','ẻ'=>'e','ẽ'=>'e','ẹ'=>'e','ê'=>'e','ề'=>'e','ế'=>'e','ể'=>'e','ễ'=>'e','ệ'=>'e',
        'ì'=>'i','í'=>'i','ỉ'=>'i','ĩ'=>'i','ị'=>'i',
        'ò'=>'o','ó'=>'o','ỏ'=>'o','õ'=>'o','ọ'=>'o','ô'=>'o','ồ'=>'o','ố'=>'o','ổ'=>'o','ỗ'=>'o','ộ'=>'o','ơ'=>'o','ờ'=>'o','ớ'=>'o','ở'=>'o','ỡ'=>'o','ợ'=>'o',
        'ù'=>'u','ú'=>'u','ủ'=>'u','ũ'=>'u','ụ'=>'u','ư'=>'u','ừ'=>'u','ứ'=>'u','ử'=>'u','ữ'=>'u','ự'=>'u',
        'ỳ'=>'y','ý'=>'y','ỷ'=>'y','ỹ'=>'y','ỵ'=>'y',
        'đ'=>'d',
        'À'=>'A','Á'=>'A','Ả'=>'A','Ã'=>'A','Ạ'=>'A','Ă'=>'A','Ằ'=>'A','Ắ'=>'A','Ẳ'=>'A','Ẵ'=>'A','Ặ'=>'A','Â'=>'A','Ầ'=>'A','Ấ'=>'A','Ẩ'=>'A','Ẫ'=>'A','Ậ'=>'A',
        'È'=>'E','É'=>'E','Ẻ'=>'E','Ẽ'=>'E','Ẹ'=>'E','Ê'=>'E','Ề'=>'E','Ế'=>'E','Ể'=>'E','Ễ'=>'E','Ệ'=>'E',
        'Ì'=>'I','Í'=>'I','Ỉ'=>'I','Ĩ'=>'I','Ị'=>'I',
        'Ò'=>'O','Ó'=>'O','Ỏ'=>'O','Õ'=>'O','Ọ'=>'O','Ô'=>'O','Ồ'=>'O','Ố'=>'O','Ổ'=>'O','Ỗ'=>'O','Ộ'=>'O','Ơ'=>'O','Ờ'=>'O','Ớ'=>'O','Ở'=>'O','Ỡ'=>'O','Ợ'=>'O',
        'Ù'=>'U','Ú'=>'U','Ủ'=>'U','Ũ'=>'U','Ụ'=>'U','Ư'=>'U','Ừ'=>'U','Ứ'=>'U','Ử'=>'U','Ữ'=>'U','Ự'=>'U',
        'Ỳ'=>'Y','Ý'=>'Y','Ỷ'=>'Y','Ỹ'=>'Y','Ỵ'=>'Y',
        'Đ'=>'D'
    ];
    return strtr($str, $accents);
}

function cleanMarkdownSnippet(string $text, int $maxLen = 220): string
{
    // Remove markdown links [text](url) -> text
    $text = preg_replace('/\[([^\]]+)\]\([^\)]+\)/', '$1', $text);
    // Remove images ![alt](url)
    $text = preg_replace('/!\[[^\]]*\]\([^\)]+\)/', '', $text);
    // Remove heading anchors {#id}
    $text = preg_replace('/\{\s*#[^}]+\}/', '', $text);
    // Remove blockquotes >
    $text = preg_replace('/^[>\s]+/m', '', $text);
    // Remove html tags
    $text = strip_tags($text);
    // Remove bold/italic markers
    $text = str_replace(['**', '__', '*', '_', '`', '#', '❖', '蓮花'], '', $text);
    // Collapse whitespace
    $text = trim(preg_replace('/\s+/', ' ', $text));
    
    if (mb_strlen($text, 'UTF-8') > $maxLen) {
        $text = mb_substr($text, 0, $maxLen, 'UTF-8') . '...';
    }
    return $text;
}

$categoryMap = [
    '01-phat-giao' => 'Pháp Môn Tịnh Độ',
    '02-nhan-qua'  => 'Nhân Quả & Nghiệp Báo',
    '03-giao-duc'  => 'Giáo Dục & Trí Tuệ',
    '04-thong-bao' => 'Thông Báo',
];

$categorySlugMap = [
    '01-phat-giao' => 'phat-giao',
    '02-nhan-qua'  => 'nhan-qua',
    '03-giao-duc'  => 'giao-duc',
    '04-thong-bao' => 'thong-bao',
];

$items = [];
$rdi = new RecursiveDirectoryIterator($contentDir, RecursiveDirectoryIterator::SKIP_DOTS);
$rii = new RecursiveIteratorIterator($rdi);

foreach ($rii as $fileInfo) {
    if ($fileInfo->getExtension() !== 'md') {
        continue;
    }

    $filePath = $fileInfo->getPathname();
    $relPath  = substr($filePath, strlen($contentDir) + 1);
    
    // Ignore drafts or hidden folders
    if (str_contains($relPath, 'drafts') || str_starts_with($fileInfo->getFilename(), '.')) {
        continue;
    }

    $parts = explode(DIRECTORY_SEPARATOR, $relPath);
    $folderKey = $parts[0] ?? '';
    $category = $categoryMap[$folderKey] ?? 'Phật Pháp';

    // Calculate typemill relative URL
    // e.g. 02-nhan-qua/13-cac-kinh-ve-nhan-qua.md -> /nhan-qua/cac-kinh-ve-nhan-qua
    $urlParts = [];
    foreach ($parts as $p) {
        if ($p === 'index.md') {
            continue;
        }
        $slug = preg_replace('/^\d+-/', '', basename($p, '.md'));
        if (!empty($slug)) {
            $urlParts[] = $slug;
        }
    }
    $pageUrl = '/' . implode('/', $urlParts);
    if ($pageUrl === '') {
        $pageUrl = '/';
    }

    $rawContent = file_get_contents($filePath);
    if ($rawContent === false) {
        continue;
    }

    // Extract Page Title
    $pageTitle = '';
    if (preg_match('/^#\s+(.+)$/m', $rawContent, $m)) {
        $pageTitle = trim(preg_replace('/\{\s*#[^}]+\}/', '', $m[1]));
    }
    if ($pageTitle === '') {
        // Try YAML
        $yamlPath = substr($filePath, 0, -3) . '.yaml';
        if (file_exists($yamlPath)) {
            $yaml = @file_get_contents($yamlPath);
            if ($yaml && preg_match('/^title:\s*[\'"]?([^\r\n\'"]+)/m', $yaml, $ym)) {
                $pageTitle = trim($ym[1]);
            }
        }
    }
    if ($pageTitle === '') {
        $pageTitle = basename($pageUrl);
    }

    // Get page description / introduction snippet
    $introSnippet = '';
    $lines = explode("\n", $rawContent);
    $collected = [];
    foreach ($lines as $line) {
        $trim = trim($line);
        if ($trim === '' || str_starts_with($trim, '#') || str_starts_with($trim, '[:') || str_starts_with($trim, '---')) {
            continue;
        }
        $collected[] = $trim;
        if (count($collected) >= 3) break;
    }
    $introSnippet = cleanMarkdownSnippet(implode(' ', $collected), 250);

    // 1. Add Main Page Entry
    $items[] = [
        'id'       => 'p_' . md5($pageUrl),
        'title'    => $pageTitle,
        'url'      => $pageUrl,
        'category' => $category,
        'parent'   => $category,
        'snippet'  => $introSnippet,
        'type'     => 'page',
        'norm'     => strtolower(removeVietnameseAccents($pageTitle . ' ' . $category . ' ' . $introSnippet)),
    ];

    // 2. Parse sub-headings (## Heading { #id })
    // Regex matches ## Title {#anchor}
    if (preg_match_all('/^##\s+([^#\n\r]+?)(?:\{\s*#([a-zA-Z0-9_\-]+)\s*\})?$/m', $rawContent, $hMatches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE)) {
        $totalHeadings = count($hMatches);
        for ($i = 0; $i < $totalHeadings; $i++) {
            $hTitle = trim($hMatches[$i][1][0]);
            $hAnchor = !empty($hMatches[$i][2][0]) ? $hMatches[$i][2][0] : '';
            
            // If no explicit anchor, generate slug
            if ($hAnchor === '') {
                $hAnchor = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', removeVietnameseAccents($hTitle)), '-'));
            }

            // Extract content between this heading and next heading
            $startPos = $hMatches[$i][0][1] + strlen($hMatches[$i][0][0]);
            $endPos = ($i + 1 < $totalHeadings) ? $hMatches[$i + 1][0][1] : strlen($rawContent);
            $sectionBody = substr($rawContent, $startPos, $endPos - $startPos);
            $sectionSnippet = cleanMarkdownSnippet($sectionBody, 250);

            // Ignore meta headings like "Lời Nói Đầu", "Mục Lục", etc. if too trivial, or keep them
            if (mb_strlen($hTitle, 'UTF-8') < 3) continue;

            $items[] = [
                'id'       => 'h_' . md5($pageUrl . '#' . $hAnchor),
                'title'    => $hTitle,
                'url'      => $pageUrl . '#' . $hAnchor,
                'category' => $category,
                'parent'   => $pageTitle,
                'snippet'  => $sectionSnippet,
                'type'     => 'chapter',
                'norm'     => strtolower(removeVietnameseAccents($hTitle . ' ' . $pageTitle . ' ' . $category . ' ' . $sectionSnippet)),
            ];
        }
    }
}

// 3. Index Kinh Pháp Cú (423 verses & stories) if kpc_index.json exists
$kpcIndexFile = $baseDir . '/plugins/mediaplayer/data/kpc_index.json';
if (file_exists($kpcIndexFile)) {
    $kpcData = json_decode(file_get_contents($kpcIndexFile), true);
    if (is_array($kpcData) && !empty($kpcData['toc'])) {
        $phamMap = [];
        foreach ($kpcData['phams'] ?? [] as $p) {
            $phamMap[(int)$p['id']] = $p['name'] ?? '';
        }
        foreach ($kpcData['toc'] as $v) {
            $vnum      = (int)($v['num'] ?? 0);
            $pid       = (int)($v['pham_id'] ?? 1);
            $pname     = $phamMap[$pid] ?? 'Kinh Pháp Cú';
            $storyName = $v['story_name'] ?? '';
            $preview   = $v['vn_preview'] ?? ($v['first_line'] ?? '');
            $vTitle    = 'Kinh Pháp Cú — Bài kệ ' . $vnum . ($storyName ? (' (' . $storyName . ')') : '');
            $vUrl      = '/phat-giao/kinh-phap-cu/doc-kinh-phap-cu?bai=' . $vnum;
            $vSnippet  = $pname . ' • ' . $preview . ($storyName ? (' • Tích truyện: ' . $storyName) : '');
            $items[] = [
                'id'       => 'kpc_' . $vnum,
                'title'    => $vTitle,
                'url'      => $vUrl,
                'category' => 'Kinh Pháp Cú',
                'parent'   => $pname,
                'snippet'  => $vSnippet,
                'type'     => 'chapter',
                'norm'     => strtolower(removeVietnameseAccents($vTitle . ' ' . $vSnippet)),
            ];
        }
    }
}

// 4. Index Khuyên Người Niệm Phật (74 letters across 4 volumes) if knnp_index.json exists
$knnpIndexFile = $baseDir . '/plugins/mediaplayer/data/knnp_index.json';
if (file_exists($knnpIndexFile)) {
    $knnpData = json_decode(file_get_contents($knnpIndexFile), true);
    if (is_array($knnpData) && !empty($knnpData['toc'])) {
        $tapMap = [];
        foreach ($knnpData['taps'] ?? [] as $t) {
            $tapMap[(int)$t['id']] = $t['name'] ?? ('Tập ' . (int)$t['id']);
        }
        foreach ($knnpData['toc'] as $l) {
            $lnum      = (int)($l['num'] ?? 0);
            $tid       = (int)($l['tap'] ?? 1);
            $tname     = $tapMap[$tid] ?? ('Khuyên Người Niệm Phật — Tập ' . $tid);
            $lTitleRaw = $l['title'] ?? '';
            $recipient = $l['recipient'] ?? '';
            $preview   = $l['preview'] ?? '';
            $quote     = $l['quote'] ?? '';
            $padNum    = str_pad((string)$lnum, 2, '0', STR_PAD_LEFT);
            $lTitle    = 'Khuyên Người Niệm Phật — Lá thư số ' . $padNum . ': ' . $lTitleRaw;
            $lUrl      = '/phat-giao/khuyen-nguoi-niem-phat/doc-khuyen-nguoi-niem-phat?thu=' . $lnum;
            $lSnippet  = $tname . ($recipient ? (' • ' . $recipient) : '') . ' • ' . $preview;
            $items[] = [
                'id'       => 'knnp_' . $lnum,
                'title'    => $lTitle,
                'url'      => $lUrl,
                'category' => 'Khuyên Người Niệm Phật',
                'parent'   => $tname,
                'snippet'  => $lSnippet,
                'type'     => 'chapter',
                'norm'     => strtolower(removeVietnameseAccents($lTitle . ' ' . $lSnippet . ' ' . $quote)),
            ];
        }
    }
}

// Write JSON output
$dir = dirname($outputFile);
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$payload = [
    'generatedAt' => date('c'),
    'total'       => count($items),
    'items'       => $items,
];

file_put_contents($outputFile, json_encode($payload, JSON_UNESCAPED_UNICODE));
echo "✓ Đã tạo thành công Search Index: " . count($items) . " mục tại: $outputFile\n";

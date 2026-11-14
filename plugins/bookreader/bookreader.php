<?php

namespace Plugins\bookreader;

use Typemill\Plugin;

class bookreader extends Plugin
{
    public static function getSubscribedEvents()
    {
        return [
            'onTwigLoaded' => ['onTwigLoaded', 0],
        ];
    }

    public function onTwigLoaded()
    {
        if (!$this->adminroute || $this->editorroute) {
            $settings = $this->getPluginSettings('bookreader') ?: [];
            
            // Check if plugin is explicitly disabled
            if (isset($settings['active']) && $settings['active'] === false) {
                return;
            }

            $this->addCSS('/bookreader/css/bookreader.css?20261112a');
            $this->addJS('/bookreader/js/bookreader.js?20261112a');

            $config = [
                'defaultSide' => $settings['defaultSide'] ?? 'right',
                'draggable'   => $settings['draggable'] ?? true,
                'showSearch'  => $settings['showSearch'] ?? true,
                'showProgress'=> $settings['showProgress'] ?? true,
                'minHeadings' => (int)($settings['minHeadings'] ?? 2),
            ];

            $this->addInlineJS('window.TmBookReaderConfig = ' . json_encode($config) . ';');
        }
    }
}

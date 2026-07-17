// ==UserScript==
// @name         快捷互动 Loader (QuickInteraction Loader)
// @name:zh      快捷互动 Loader
// @namespace    https://github.com/heitaoplay/QuickInteraction
// @version      1.0.1
// @description  BC 快捷互动的极简加载器。真正的脚本代码托管在 GitHub，每次刷新页面都会自动拉取最新版，无需在油猴里手动点「更新」。
// @author       Tao MUSE
// @homepageURL  https://github.com/heitaoplay/QuickInteraction
// @updateURL    https://raw.githubusercontent.com/heitaoplay/QuickInteraction/main/loader.user.js
// @downloadURL  https://raw.githubusercontent.com/heitaoplay/QuickInteraction/main/loader.user.js
// @include      /^https:\/\/(www\.)?bondage(projects\.elementfx|-(europe|asia))\.com\/.*/
// @grant        none
// @require      https://awdrrawd.github.io/liko-Plugin-Repository/Plugins/expand/bcmodsdk.js
// @run-at       document-end
// ==/UserScript==

/*
 * 设计说明（Loader 模式 / 方案 A）
 * ───────────────────────────────────────────────────────────
 * 本文件故意保持极简、几乎永不改变。它只做一件事：
 *   把真正的脚本（quick-interaction.user.js）以 <script> 形式注入页面，
 *   并加上时间戳缓存破坏符（?v=Date.now()），保证每次刷新页面都拉取最新版。
 *
 * 真正的业务逻辑全部在 quick-interaction.user.js 里，由仓库 push 即更新。
 * 这样用户只需安装一次本 Loader，之后「刷新页面 = 最新代码」，
 * 不再需要去油猴里手动点更新，也不依赖油猴的自动更新轮询。
 *
 * bcModSdk 通过 @require 注入为全局变量，主脚本内部已用
 * waitFor(() => typeof bcModSdk !== 'undefined') 兜底，时序安全。
 */

(function () {
    'use strict';

    // 真正的主脚本地址（与仓库 @downloadURL 保持一致）
    var MAIN_URL = 'https://raw.githubusercontent.com/heitaoplay/QuickInteraction/main/quick-interaction.user.js';

    // bcModSdk 由 @require 注入，确保挂到 window 上供主脚本使用
    if (typeof bcModSdk !== 'undefined') {
        window.bcModSdk = bcModSdk;
    }
    if (typeof window.bcModSdk === 'undefined') {
        console.error('[XSAct-QA Loader] bcModSdk 未加载，主脚本无法启动');
        return;
    }

    // 时间戳破坏缓存：每次刷新都拉最新版
    var url = MAIN_URL + '?v=' + Date.now();

    var s = document.createElement('script');
    s.src = url;
    s.onerror = function () {
        console.error('[XSAct-QA Loader] 主脚本加载失败，请确认网络可访问 raw.githubusercontent.com');
    };
    (document.head || document.documentElement).appendChild(s);
})();

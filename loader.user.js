// ==UserScript==
// @name         快捷互动 Loader (QuickInteraction Loader)
// @name:zh      快捷互动 Loader
// @namespace    https://github.com/heitaoplay/QuickInteraction
// @version      1.1.0
// @description  BC 快捷互动的极简加载器（RW 风格）。真正的脚本代码自包含在 GitHub Pages 上，每次刷新页面都通过 import() 拉最新版，无需手动点油猴更新。
// @author       Tao MUSE
// @homepageURL  https://github.com/heitaoplay/QuickInteraction
// @updateURL    https://raw.githubusercontent.com/heitaoplay/QuickInteraction/main/loader.user.js
// @downloadURL  https://raw.githubusercontent.com/heitaoplay/QuickInteraction/main/loader.user.js
// @match        https://bondageprojects.elementfx.com/*
// @match        https://www.bondageprojects.elementfx.com/*
// @match        https://bondage-europe.com/*
// @match        https://www.bondage-europe.com/*
// @match        https://bondageprojects.com/*
// @match        https://www.bondageprojects.com/*
// @match        https://bondage-asia.com/*
// @match        https://www.bondage-asia.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

/*
 * RW 风格加载器（方案 B / 正统做法）
 * ───────────────────────────────────────────────────────────
 * 本文件故意保持极简、几乎永不改变。它只做一件事：
 *   通过 import() 动态加载真正自包含的脚本（assets/main.js）。
 *
 * assets/main.js 由 GitHub Actions 在每次 push 时自动构建并部署到
 * GitHub Pages（https://heitaoplay.github.io/QuickInteraction/），
 * 内部已打包 bcModSdk + 全部业务逻辑，运行时零外部依赖。
 *
 * 因此：
 *   - 用户只需安装一次本 Loader（从 raw 链接，油猴原生支持）；
 *   - 之后「刷新页面 = 最新代码」，不依赖油猴轮询、不依赖 raw CDN 重定向；
 *   - 主脚本通过 ?v=Date.now() 破坏缓存，保证每次刷新都拉最新构建。
 */
import('https://heitaoplay.github.io/QuickInteraction/assets/main.js?v=' + Date.now());

// ==UserScript==
// @name         快捷互动 (QuickInteraction)
// @name:zh      快捷互动
// @namespace    https://github.com/heitaoplay/QuickInteraction
// @version      0.7.17
// @description  Bondage Club - 统一动作操作台。一键进入动作模式，在聊天室场景内直接点人物部位选动作，绕过原生5步嵌套菜单。
// @author       Tao MUSE
// @homepageURL  https://github.com/heitaoplay/QuickInteraction
// @updateURL    https://github.com/heitaoplay/QuickInteraction/raw/main/quick-interaction.user.js
// @downloadURL  https://github.com/heitaoplay/QuickInteraction/raw/main/quick-interaction.user.js
// @include      /^https:\/\/(www\.)?bondage(projects\.elementfx|-(europe|asia))\.com\/.*/
// @grant        none
// @require      https://awdrrawd.github.io/liko-Plugin-Repository/Plugins/expand/bcmodsdk.js
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ════════════════════════════════════════════════════════════════════════
    // 防重复加载
    // ════════════════════════════════════════════════════════════════════════
    if (window.__XSActQA_Loaded__) {
        console.warn('[XSAct-QA] 已加载，跳过');
        return;
    }
    window.__XSActQA_Loaded__ = true;

    // ════════════════════════════════════════════════════════════════════════
    // 调试开关与日志封装
    // 发布版设 DEBUG = false，所有 logD 静默；仅 console.warn/error 用于真实异常。
    // 排障时临时改 DEBUG = true 即可恢复全部内部日志。
    // ════════════════════════════════════════════════════════════════════════
    const DEBUG = false;
    function logD() {
        if (!DEBUG) return;
        var args = ['[XSAct-QA]'];
        for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
        console.log.apply(console, args);
    }

    const VERSION = '0.7.17';

    // ── 存储键 ──
    const S_ENABLED = 'xsact_qa_enabled';
    const S_FAVS = 'xsact_qa_favorites';
    const S_PRESETS = 'xsact_qa_presets';
    const S_LAST = 'xsact_qa_last_action';
    const S_COMBOS = 'xsact_qa_combos';
    const S_POS = 'xsact_qa_panel_pos';
    const S_SIZE = 'xsact_qa_panel_size';
    const S_MODE = 'xsact_qa_panel_mode';
    const S_SELF = 'xsact_qa_self_mode';
    const S_SHOW_NAMES = 'xsact_qa_show_names';
    const S_TOGGLE_POS = 'xsact_qa_toggle_pos';

    // ── 集中状态（单一数据源，消除散落全局变量）──
    const state = {
        modApi: null,                 // bcModSdk 注册句柄
        isActive: false,              // 动作模式是否激活
        theme: 'dark',                // 当前主题 id（dark | light）
        selectedTarget: null,         // 当前选中目标 Character
        selectedPart: null,           // 当前选中部位 ItemGroup
        selectedAction: null,         // 当前选中动作名
        selectedActionItem: null,     // 当前选中动作绑定的道具
        panelMode: 'part',            // 'part'=单部位 | 'combo'=自定义组合
        showNames: false,             // 是否显示角色名字浮层
        allModeActive: false,         // 全员范围开关
        favModeActive: false,         // 收藏模式开关
        selfModeActive: false,        // 自己模式开关
        combos: [],                   // 自定义组合
        editingComboId: null,         // 正在编辑的组合 id
        favorites: [],                // 收藏动作名
        presets: [],                  // 预留预设
        lastAction: null,             // 上次执行的动作
        toggleBtnDrawn: false,        // 浮动开关是否已绘制
        // ── UI / 渲染缓存 ──
        actionPanelEl: null,          // 右侧面板 DOM
        bodyGrids: new Map(),         // Character -> 身体线框元素
        nameOverlays: new Map(),      // Character -> 名字浮层元素
        toggleBtnEl: null,            // 浮动开关 DOM
        charAnchor: {},               // 角色真实绘制坐标 {MN:{x,y,zoom,t}}
        cachedRect: null,             // 画布屏幕矩形缓存
        cachedScaleX: 1,
        cachedScaleY: 1,
        refreshInterval: null,        // 线框刷新定时器
        lastLayoutCount: 0,           // 上次布局角色数
        toggleDragged: false          // 本次按下闪电按钮是否已拖动
    };

    // ════════════════════════════════════════════════════════════════════════
    // 部位定义（BC Target_Group 映射）
    // ════════════════════════════════════════════════════════════════════════
    const BODY_PARTS = [
        { group: 'ItemHead', label: '头', icon: '🗣' },
        { group: 'ItemNose', label: '鼻', icon: '👃' },
        { group: 'ItemEars', label: '耳', icon: '👂' },
        { group: 'ItemHood', label: '头套', icon: '🎭' },
        { group: 'ItemMouth', label: '口', icon: '👄' },
        { group: 'ItemMouth2', label: '口2', icon: '👄' },
        { group: 'ItemMouth3', label: '口3', icon: '👄' },
        { group: 'ItemNeck', label: '颈', icon: '🔗' },
        { group: 'ItemNeckAccessories', label: '颈饰', icon: '🔗' },
        { group: 'ItemNeckRestraints', label: '颈束', icon: '🔗' },
        { group: 'ItemNipples', label: '乳', icon: '☁' },
        { group: 'ItemNipplesPiercings', label: '乳穿', icon: '💎' },
        { group: 'ItemBreast', label: '胸', icon: '🫂' },
        { group: 'ItemTorso', label: '躯干', icon: '👕' },
        { group: 'ItemTorso2', label: '腹', icon: '👕' },
        { group: 'ItemArms', label: '手臂', icon: '💪' },
        { group: 'ItemHands', label: '手', icon: '✋' },
        { group: 'ItemPelvis', label: '腰臀', icon: '〰' },
        { group: 'ItemVulva', label: '私处', icon: '🌸' },
        { group: 'ItemVulvaPiercings', label: '阴穿', icon: '💎' },
        { group: 'ItemButt', label: '臀后', icon: '🍑' },
        { group: 'ItemLegs', label: '腿', icon: '🦵' },
        { group: 'ItemFeet', label: '脚', icon: '👢' },
        { group: 'ItemBoots', label: '靴', icon: '🥾' },
    ];

    // 合成子部位 → 字典翻译主部位映射（BC 字典键只以主部位命名，如 ItemMouth2 查 Label-ChatOther-ItemMouth-*）
    const SUBPART_TO_BASE = {
        'ItemMouth2': 'ItemMouth',
        'ItemMouth3': 'ItemMouth',
        'ItemNeckAccessories': 'ItemNeck',
        'ItemNeckRestraints': 'ItemNeck',
        'ItemNipplesPiercings': 'ItemNipples',
        'ItemTorso2': 'ItemTorso'
    };

    // ════════════════════════════════════════════════════════════════════════
    // 部位线框 —— 直接采用 BC 原生 AssetGroup[].Zone 矩形（角色本地 500×1000 空间）
    // 这是 BC 自己定位「点身体选部位」的真值坐标（见 BondageClub/Scripts/Dialog.js
    // DialogClickedInZone / DialogGetCharacterZone），解剖正确且互不重叠。
    // 每个部位可能有多个 Zone（如双臂/双手分左右），每个 Zone 生成一个可点击热区。
    // ════════════════════════════════════════════════════════════════════════

    // 角色本地包围盒（asset 坐标系 500×1000，覆盖整具身体）
    const BODY_AX0 = 0, BODY_AX1 = 500;   // 水平 [0,500]
    const BODY_AY0 = 0, BODY_AY1 = 1000;  // 垂直 [0,1000]

    // 固定线框高度：所有角色统一用 asset 1000 高度，不随站起/蹲下/身高变化。
    // 底部锚定在角色脚底（BODY_AY1=1000），向上延伸，避免上排角色蹲下时压到下排。
    const GRID_FIXED_HEIGHT = 1000;

    // 缓存：family|group -> Zone 矩形数组 [[X,Y,W,H], ...]
    var _zoneCache = {};
    function getPartZones(C, groupName) {
        var family = (C && C.AssetFamily) || (typeof Player !== 'undefined' && Player.AssetFamily) || 'Female3DCG';
        var key = family + '|' + groupName;
        if (_zoneCache[key]) return _zoneCache[key];
        var zones = null;
        try {
            if (typeof AssetGroupGet === 'function') {
                var grp = AssetGroupGet(family, groupName);
                if (grp && Array.isArray(grp.Zone) && grp.Zone.length) {
                    zones = grp.Zone.map(function(z) { return [z[0], z[1], z[2], z[3]]; });
                }
            }
        } catch (e) { zones = null; }
        // 回退：极少数部位在 AssetGroup 里没有 Zone 时，按 BODY_PARTS 均分（几乎不会触发）
        if (!zones) {
            var i = -1;
            for (var k = 0; k < BODY_PARTS.length; k++) { if (BODY_PARTS[k].group === groupName) { i = k; break; } }
            if (i < 0) i = 0;
            zones = [[BODY_AX0, (i / BODY_PARTS.length) * BODY_AY1,
                      BODY_AX1 - BODY_AX0, BODY_AY1 / BODY_PARTS.length]];
        }
        _zoneCache[key] = zones;
        return zones;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 工具函数
    // ════════════════════════════════════════════════════════════════════════
    function waitFor(fn, timeout) {
        timeout = timeout || 120000;
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const check = () => {
                try {
                    if (fn()) resolve(true);
                    else if (Date.now() - start > timeout) reject(new Error('waitFor timeout'));
                    else setTimeout(check, 100);
                } catch (e) {
                    if (Date.now() - start > timeout) reject(e);
                    else setTimeout(check, 100);
                }
            };
            check();
        });
    }

    function loadStorage(key, fallback) {
        try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
        catch (e) { console.error('[XSAct-QA] 读取存储失败 ' + key + ':', e); return fallback; }
    }
    function saveStorage(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); }
        catch (e) { console.error('[XSAct-QA] 写入存储失败 ' + key + ':', e); }
    }

    // ── 主题 / 设置键 ──
    const S_THEME = 'xsact_qa_theme';
    const MOD_NS  = 'XSAct_QA';

    // 主题定义：仅保留深色 / 浅色两套，强调色固定玫红
    const THEMES = [
        { id:'dark',  name:'深色', base:'dark' },
        { id:'light', name:'浅色', base:'light' }
    ];
    function getTheme(id) {
        for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
        return THEMES[0];
    }

    // ── 服务器（游戏账号）持久化：写入 Player.OnlineSettings.ExtensionSettings ──
    // 注意：BC 的 ServerAccountUpdate 是 AccountUpdater 实例，不是函数；
    // 正确同步方式是 ServerAccountUpdate.QueueData({ OnlineSettings: Player.OnlineSettings })，
    // 其内部自带 ~2s 防抖合并，且未登录（CharacterID===""）时自动跳过。
    function getServerStore() {
        try {
            if (typeof Player === 'undefined' || !Player.OnlineSettings) return null;
            if (!Player.OnlineSettings.ExtensionSettings) Player.OnlineSettings.ExtensionSettings = {};
            if (!Player.OnlineSettings.ExtensionSettings[MOD_NS]) Player.OnlineSettings.ExtensionSettings[MOD_NS] = {};
            return Player.OnlineSettings.ExtensionSettings[MOD_NS];
        } catch (e) { return null; }
    }
    function saveToServer(key, val) {
        var store = getServerStore();
        if (!store) return; // 玩家未登录或无法访问账号：仅落 localStorage（persist 已做）
        store[key] = val;
        try {
            if (typeof ServerAccountUpdate !== 'undefined' && ServerAccountUpdate && typeof ServerAccountUpdate.QueueData === 'function') {
                ServerAccountUpdate.QueueData({ OnlineSettings: Player.OnlineSettings });
            }
        } catch (_) {}
    }
    function loadFromServer(key, fallback) {
        var store = getServerStore();
        if (!store || !(key in store)) return fallback;
        return store[key];
    }
    // 统一持久化：本地 + 服务器（服务器优先回读，跨设备生效）
    function persist(key, val) {
        saveStorage(key, val);
        saveToServer(key, val);
    }
    function loadSetting(key, fallback) {
        var s = loadFromServer(key, undefined);
        if (s !== undefined) return s;
        return loadStorage(key, fallback);
    }

    // ── 主题应用 ──
    function applyTheme(themeId) {
        var t = getTheme(themeId);
        state.theme = t.id;
        document.documentElement.setAttribute('data-xsact-theme', t.id);
    }
    function toggleTheme() {
        var next = (state.theme === 'dark') ? 'light' : 'dark';
        applyTheme(next);
        persist(S_THEME, next);
        toast('已切换为' + (next === 'dark' ? '深色' : '浅色') + '主题', accentColor());
    }

    /** 获取动作列表（按部位过滤 + 前置条件实时校验） */
    /**
     * 获取指定部位「当前可执行的」动作列表（实时）。
     * 主数据源：BC 原生 ActivityAllowedForGroup(C, Group) — 返回该角色在指定部位
     * 此刻能执行的所有动作（含 echo-activity-ext 扩展），权威且不包含前置条件不满足的。
     * 翻译名从 BC_Interactive_Index 或 ActivityDictionaryText 获取。
     * fallback 才用 BC_Interactive_Index / ActivityFemale3DCG 全量列表。
     */
    function getActionsForPart(partGroup, targetChar) {
        targetChar = targetChar || state.selectedTarget;
        var actions = [];

        // ── 方案 A（推荐）：BC 原生实时可用列表 ──
        if (targetChar && typeof ActivityAllowedForGroup === 'function') {
            try {
                var allowed = ActivityAllowedForGroup(targetChar, partGroup);
                if (Array.isArray(allowed) && allowed.length > 0) {
                    actions = allowed.map(function(a) {
                        var name = a.Activity ? (a.Activity.Name || '') : (a.Name || '');
                        return { Name: name, translatedName: getActivityLabelFallback(name, partGroup), Item: a.Item || null };
                    }).filter(function(a) { return a.Name; });
                }
            } catch (e) {
                console.warn('[XSAct-QA] ActivityAllowedForGroup 失败，改用全量列表:', e.message);
            }
        }

        // ── 方案 B：BC_Interactive_Index 精选索引（无实时过滤）──
        if (actions.length === 0 && window.BC_Interactive_Index && window.BC_Interactive_Index.Interactive_Index) {
            actions = window.BC_Interactive_Index.Interactive_Index.filter(function(act) {
                return act.Target_Group === partGroup;
            }).map(function(act) {
                return {
                    Name: act.activityName || '',
                    translatedName: act.translatedactivity || act.activityName || '',
                    Item: null
                };
            });
        }

        // ── 方案 C：fallback 从 ActivityFemale3DCG 原始数组构建 ──
        if (actions.length === 0 && window.ActivityFemale3DCG) {
            var raw = window.ActivityFemale3DCG.filter(function(a) {
                if (!a.Name || !a.Target) return false;
                var targets = Array.isArray(a.Target) ? a.Target : [a.Target];
                if (targets.indexOf(partGroup) !== -1) return true;
                if (a.TargetSelf === true) return targets.indexOf(partGroup) !== -1;
                var selfT = Array.isArray(a.TargetSelf) ? a.TargetSelf : (a.TargetSelf ? [a.TargetSelf] : []);
                return selfT.indexOf(partGroup) !== -1;
            });
            actions = raw.map(function(a) {
                return { Name: a.Name || '', translatedName: getActivityLabelFallback(a.Name, partGroup), Item: null };
            });
        }

        // 去重 + 过滤无效条目 + 过滤真实部位无翻译的（避免聊天消息乱码）
        var seen = {};
        return actions.filter(function(a) {
            if (!a.Name || a.Name.indexOf('MISSING') !== -1 ||
                (a.translatedName && a.translatedName.indexOf('[STRING_RETRIEVAL_FAILED]') !== -1)) return false;
            if (!shouldKeepAction(a.Name, partGroup)) return false;
            if (seen[a.Name]) return false;
            seen[a.Name] = true;
            return true;
        });
    }

    /** 获取动作显示名（兼容两种数据源） */
    function getActivityLabel(name, targetGroup) {
        if (!name) return '';
        // 如果动作对象带翻译名就直接用
        if (name.translatedName) return name.translatedName;
        return getActivityLabelFallback(name, targetGroup);
    }

    /** 回退翻译：BC Dictionary 查询或去前缀 */
    function getActivityLabelFallback(name, targetGroup) {
        if (!name) return '';
        if (typeof window.ActivityDictionaryText !== 'function') {
            if (name.indexOf('XSAct_') === 0) return name.substring(6);
            return name;
        }
        function tryKey(g) {
            var k = 'Label-ChatOther-' + g + '-' + name;
            var t = window.ActivityDictionaryText(k);
            if (t && t.indexOf('[STRING_RETRIEVAL_FAILED]') === -1 &&
                t.indexOf('MISSING ACTIVITY') === -1) return t;
            return null;
        }
        var result = tryKey(targetGroup || '');
        if (result) return result;
        // 合成子部位 fallback 到主部位字典键
        if (targetGroup && SUBPART_TO_BASE[targetGroup]) {
            result = tryKey(SUBPART_TO_BASE[targetGroup]);
            if (result) return result;
        }
        if (name.indexOf('XSAct_') === 0) return name.substring(6);
        return name;
    }

    /** 检查某个动作在「真实部位」上是否有 BC 字典翻译；合成子部位查不到时 fallback 到主部位。
     *  避免发送出去后显示乱码，也避免子部位的英文动作被误删。 */
    function hasActivityLabel(name, targetGroup) {
        if (!name || !targetGroup) return false;
        if (typeof window.ActivityDictionaryText !== 'function') return true; // 无法判断时放行
        function keyOk(g) {
            var k = 'Label-ChatOther-' + g + '-' + name;
            var t = window.ActivityDictionaryText(k);
            return t && t.indexOf('[STRING_RETRIEVAL_FAILED]') === -1 && t.indexOf('MISSING ACTIVITY') === -1;
        }
        if (keyOk(targetGroup)) return true;
        if (SUBPART_TO_BASE[targetGroup] && keyOk(SUBPART_TO_BASE[targetGroup])) return true;
        return false;
    }

    /**
     * 判断一个动作是否应保留在列表中。
     * - 名字里含「MISSING / [STRING_RETRIEVAL_FAILED]」的乱码动作一律丢弃。
     * - ECHO 情绪拓展的中文动作名（如「张开嘴」「流口水」）以及本插件自定义 XSAct_ 动作：
     *   名字本身就是可读标签，BC 执行时会正常显示，直接放行（不再要求 Label-ChatOther 翻译，
     *   因为 ECHO 的"自我类"动作往往没注册该键，导致被误删）。
     * - 其余纯英文动作：仍要求有 Label-ChatOther 翻译，避免聊天消息出现乱码。
     */
    function shouldKeepAction(name, targetGroup) {
        if (!name) return false;
        if (name.indexOf('MISSING') !== -1) return false;
        if (name.indexOf('[STRING_RETRIEVAL_FAILED]') !== -1) return false;
        if (/[一-鿿]/.test(name) || name.indexOf('XSAct_') === 0) return true;
        return hasActivityLabel(name, targetGroup);
    }

    /** 获取房间内其他角色列表 */
    function getRoomCharacters() {
        if (typeof ChatRoomCharacter === 'undefined' || !Array.isArray(ChatRoomCharacter)) return [];
        return ChatRoomCharacter.filter(function(c) {
            return c && c.IsPlayer() === false && c.MemberNumber && c.MemberNumber !== Player.MemberNumber;
        });
    }

    /* ══════════════════════════════════════════════════════════════
       动作执行 — 参考 PAT All 的 makeActivityPacket + ServerSend 模式
       ══════════════════════════════════════════════════════════════ */

    /**
     * 为 ActivityAsset 寻找最合理的 fallback 物品。
     * 某些动作（如 echo-activity-ext 的"看看裙底"）消息模板引用了 ActivityAsset，
     * 但 ActivityAllowedForGroup 未返回 Item，且目标部位本身没有穿着物。
     * 此时从目标角色的外观中找最相关的衣物作为兜底。
     */
    function findBestItemForActivityAsset(targetChar, group) {
        if (!targetChar || !targetChar.Appearance) return null;
        var items = targetChar.Appearance;
        var lowerGroups = ['ItemButt', 'ItemPelvis', 'ItemLegs', 'ItemVulva', 'ItemVulvaPiercings'];
        var upperGroups = ['ItemBreast', 'ItemNipples', 'ItemNipplesPiercings', 'ItemTorso', 'ItemTorso2', 'ItemArms'];

        // 1. 优先返回当前动作部位本身的穿着物（如 ItemPelvis 上的丁字裤）。
        // 这样"看裙底"等动作会先显示贴身衣物，而不是外层裙子。
        if (typeof InventoryGet === 'function') {
            var direct = InventoryGet(targetChar, group);
            if (direct) return direct;
        }

        // 2. 当前部位没有时，对下体动作按"贴身衣物→外层衣物"兜底。
        // 内裤在 Panties 组（包括 ECHO 自定义 Panties_xxx），裙装/裤装在 ClothLower/Cloth/SuitLower。
        if (lowerGroups.indexOf(group) !== -1) {
            var panties = items.find(function(i) {
                return i && i.Asset && i.Asset.Group && /Panties/i.test(i.Asset.Group.Name);
            });
            if (panties) return panties;
            var lower = items.find(function(i) {
                return i && i.Asset && i.Asset.Group && /ClothLower/i.test(i.Asset.Group.Name);
            });
            if (lower) return lower;
            var cloth = items.find(function(i) {
                return i && i.Asset && i.Asset.Group && /Cloth/i.test(i.Asset.Group.Name) && !/Accessory/i.test(i.Asset.Group.Name);
            });
            if (cloth) return cloth;
            var suit = items.find(function(i) {
                return i && i.Asset && i.Asset.Group && /SuitLower/i.test(i.Asset.Group.Name);
            });
            if (suit) return suit;
        }

        // 3. 上半身动作按上衣兜底
        if (upperGroups.indexOf(group) !== -1) {
            var top = items.find(function(i) {
                return i && i.Asset && i.Asset.Group && /Cloth/i.test(i.Asset.Group.Name) && !/Accessory/i.test(i.Asset.Group.Name);
            });
            if (top) return top;
            var suitTop = items.find(function(i) {
                return i && i.Asset && i.Asset.Group && /Suit/i.test(i.Asset.Group.Name);
            });
            if (suitTop) return suitTop;
        }

        return null;
    }

    /** 根据目标（自己/他人）选择正确的聊天消息翻译键：ChatSelf 或 ChatOther
     *  对自我动作优先使用 ChatSelf-xxx，缺失时回退 ChatOther；对他人固定 ChatOther。
     */
    function resolveContentKey(group, name, targetChar) {
        var isSelf = targetChar && Player && targetChar.MemberNumber === Player.MemberNumber;
        function firstExisting(prefix) {
            var order = [group];
            if (SUBPART_TO_BASE[group]) order.push(SUBPART_TO_BASE[group]);
            if (typeof ActivityDictionaryText !== 'function') return prefix + '-' + order[0] + '-' + name;
            for (var i = 0; i < order.length; i++) {
                var k = prefix + '-' + order[i] + '-' + name;
                var t = ActivityDictionaryText(k);
                if (t && t.indexOf('MISSING') === -1 && t.indexOf('[STRING_RETRIEVAL_FAILED]') === -1) return k;
            }
            return prefix + '-' + order[0] + '-' + name;
        }
        if (!isSelf) return firstExisting('ChatOther');
        var selfKey = firstExisting('ChatSelf');
        var otherKey = firstExisting('ChatOther');
        if (typeof ActivityDictionaryText !== 'function') return selfKey;
        var selfText = ActivityDictionaryText(selfKey);
        var otherText = ActivityDictionaryText(otherKey);
        var selfMissing = !selfText || selfText.indexOf('MISSING') !== -1;
        var otherMissing = !otherText || otherText.indexOf('MISSING') !== -1;
        if (!selfMissing) return selfKey;
        if (!otherMissing) return otherKey;
        return selfKey;
    }

    /**
     * 构建标准活动包（与 PAT All v3.0 同款格式）。
     * @param {Character} targetChar - 目标角色对象
     * @param {string} group - 部位 Group 名（如 ItemBreast）
     * @param {string} name - 动作原始名（如 ItemBreastCaress）
     * @param {Item|null} activityItem - ActivityAllowedForGroup 返回的绑定道具（可选）
     */
    function makeActivityPacket(targetChar, group, name, activityItem) {
        var targetMN = targetChar && targetChar.MemberNumber;
        // PAT All 同款：Dictionary 初始不含 ActivityName（最后 push，顺序敏感！）
        var packet = {
            Content: resolveContentKey(group, name, targetChar),
            Type: 'Activity',
            Dictionary: [
                { SourceCharacter: Player.MemberNumber },
                { TargetCharacter: targetMN },
                { Tag: 'FocusAssetGroup', FocusGroupName: group }
            ]
        };

        // 绑定道具（优先用 ActivityAllowedForGroup 返回的真实 Item，
        // 其次从目标角色外观中找最相关衣物作为 ActivityAsset 兜底，
        // 再正则兜底手持/吃东西类动作）
        var item = activityItem || null;
        if (!item && targetChar) {
            item = findBestItemForActivityAsset(targetChar, group);
        }
        if (!item && typeof InventoryGet === 'function') {
            var isLscgEatChew = /^LSCG_(Eat|Chew)/i.test(name) || /EatItem$/i.test(name) || /ThrowItem$/i.test(name);
            var isHand = /^ItemHand/i.test(name);
            if (isLscgEatChew) {
                var tc = (typeof ChatRoomCharacter !== 'undefined' && Array.isArray(ChatRoomCharacter))
                    ? ChatRoomCharacter.find(function(c) { return c.MemberNumber === targetMN; }) : null;
                if (tc) item = InventoryGet(tc, 'ItemHandheld');
            } else if (isHand) {
                item = InventoryGet(Player, 'ItemHandheld');
            }
        }
        if (item && item.Asset) {
            var aa = { Tag: 'ActivityAsset', AssetName: item.Asset.Name, GroupName: item.Asset.Group ? item.Asset.Group.Name : 'ItemHandheld' };
            if (item.CraftName || (item.Craft && item.Craft.Name))
                aa.CraftName = item.CraftName || item.Craft.Name;
            packet.Dictionary.push(aa);
            logD('ActivityAsset 已加入:', aa.AssetName, aa.GroupName, 'CraftName:', aa.CraftName || '无');
        } else {
            logD('未生成 ActivityAsset:', name, group, 'item存在=', !!item, 'Asset存在=', !!(item && item.Asset));
        }

        // ActivityName 放最后（PAT All 做法）
        packet.Dictionary.push({ ActivityName: name });
        return packet;
    }

    /** 记录上次动作（抽取公共代码） */
    function recordLastAction(name, targetMN, part, dict) {
        state.lastAction = { name: name, targetMN: targetMN, dict: dict, part: part, time: Date.now() };
        saveStorage(S_LAST, state.lastAction);
    }

    /** 从 ActivityAllowedForGroup 结果中按名字查找动作（统一解析 a.Activity?.Name）
     * @returns 匹配的动作项（含 .Item）或 null */
    function findAllowedActivity(char, group, name) {
        if (typeof ActivityAllowedForGroup !== 'function') return null;
        try {
            var allowed = ActivityAllowedForGroup(char, group);
            if (!Array.isArray(allowed)) return null;
            return allowed.find(function(a) {
                var n = a.Activity ? a.Activity.Name : a.Name;
                return n === name;
            }) || null;
        } catch (_) {
            return null; // 单目标/部位查询异常视为不可用，由调用方跳过或提示
        }
    }

    /** 组合执行间隔归一化（缺失/非法时回退 160ms） */
    function comboDelay(combo) {
        return (combo && typeof combo.delay === 'number' && combo.delay >= 0) ? combo.delay : 160;
    }

    /** 把选中目标排到数组首位（其余保持原序），用于「全员」执行时优先作用于当前目标 */
    function orderBySelectedTarget(chars) {
        var ordered = (chars || []).slice();
        if (state.selectedTarget && state.selectedTarget.MemberNumber) {
            var mn = state.selectedTarget.MemberNumber;
            ordered.sort(function(a, b) { return (a.MemberNumber === mn) ? -1 : 0; });
        }
        return ordered;
    }

    /** 执行动作（ServerSend 优先，失败降级 ActivityRun）
     * @param {string} [groupOverride] 指定部位 Group（全身模式逐部位执行时用），缺省用 state.selectedPart */
    function executeAction(charObj, activityName, activityItem, groupOverride) {
        if (!charObj || !activityName) return false;
        var name = String(activityName || '');
        var group = String(groupOverride || state.selectedPart || '');
        if (!name || !group) return false;

        try {
            var packet = makeActivityPacket(charObj, group, name, activityItem);
            if (!packet) { toast('该动作需要特定道具', '#FF5C5C'); return false; }
            // 实时可用性预校验（findAllowedActivity 内部已处理 ActivityAllowedForGroup 缺失）
            if (!findAllowedActivity(charObj, group, name)) {
                toast('该动作当前不可用', '#FF5C5C'); return false;
            }
            // 方案 A：ServerSend（标准方式）
            // 设置目标聚焦部位：Prank 等自定义动作（如 Liko_CutClothes）的回调依赖
            // target.FocusGroup?.Name 决定作用部位。原生 UI 点击时会自动设置该值，
            // 但本插件直接发包不经过那一步，需手动补上，发完立即还原。
            var prevFocus = charObj.FocusGroup;
            var focusGroupObj = null;
            if (typeof AssetGroup !== 'undefined' && Array.isArray(AssetGroup)) {
                focusGroupObj = AssetGroup.find(function(g) { return g && g.Name === group; });
            }
            try {
                charObj.FocusGroup = focusGroupObj || { Name: group };
                ServerSend('ChatRoomChat', packet);
                recordLastAction(name, charObj.MemberNumber, group, packet.Dictionary);
                return true;
            } catch (sendErr) {
                console.warn('[XSAct-QA] ServerSend 失败，尝试 ActivityRun 降级:', sendErr.message);
            } finally {
                charObj.FocusGroup = prevFocus;
            }
            // 方案 B：ActivityRun 降级（使用原生逻辑构造字典，参数需与签名一致）
            if (typeof ActivityRun === 'function' && typeof ActivityGetGroupOrMirror === 'function' && typeof AssetAllActivities === 'function') {
                try {
                    var targetGroup = ActivityGetGroupOrMirror(charObj.AssetFamily, group);
                    var allActs = AssetAllActivities(charObj.AssetFamily);
                    var activityObj = allActs.find(function(a) { return a.Name === name; });
                    if (targetGroup && activityObj) {
                        ActivityRun(Player, charObj, targetGroup, { Activity: activityObj, Item: activityItem }, true);
                        recordLastAction(name, charObj.MemberNumber, group, null);
                        return true;
                    }
                } catch (runErr) { console.error('[XSAct-QA] ActivityRun 也失败:', runErr.message); }
            }
            toast('该动作暂不可用', '#FF5C5C');
            return false;
        } catch (e) {
            console.error('[XSAct-QA] 执行动作异常:', e);
            toast('执行失败: ' + e.message, '#FF5C5C');
            return false;
        }
    }

    /** 对房间内所有其他成员执行同一动作（PAT ALL 同款广播） */
    function executeActionAll() {
        if (!state.selectedAction || !state.selectedPart) { toast('请先选择一个动作', '#FF5C5C'); return; }
        var chars = getRoomCharacters();
        if (!Array.isArray(chars) || chars.length === 0) { toast('房间内没有其他人', '#888'); return; }

        // 如果当前选中了目标，则把目标排到第一个执行，其余随后
        var ordered = orderBySelectedTarget(chars);

        var name = String(state.selectedAction);
        var group = String(state.selectedPart);
        var success = 0;
        var delay = 120; // ms，避免触发服务器/本地 anti-spam
        var index = 0;

        function next() {
            if (index >= ordered.length || !state.isActive) return;
            var c = ordered[index++];
            // 预先检查该目标当前是否真的可做这个动作
            var item = null;
            var found = findAllowedActivity(c, group, name);
            if (!found) return next();
            item = found.Item || null;
            if (executeAction(c, name, item || state.selectedActionItem)) success++;
            setTimeout(next, delay);
        }
        next();
        toast('开始对所有成员执行：' + getActivityLabel(name, group), '#FF5C7A');
    }

    /* ══════════════════════════════════════════════════════════════
       自定义组合 —— 用户手动把「单部位 + 动作」拼成组合，一键顺序执行。
       比自动按动作名聚合更准确，可跨部位、跨动作自由组合。
       ══════════════════════════════════════════════════════════════ */

    function generateId() { return 'cmb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
    function saveCombos() { persist(S_COMBOS, state.combos); }
    function getCombo(id) { return state.combos.find(function(c) { return c.id === id; }); }

    function addCombo(name) {
        var combo = { id: generateId(), name: String(name || '新组合'), items: [], delay: 160 };
        state.combos.push(combo);
        saveCombos();
        return combo;
    }
    function deleteCombo(id) {
        state.combos = state.combos.filter(function(c) { return c.id !== id; });
        if (state.editingComboId === id) state.editingComboId = null;
        saveCombos();
    }
    function renameCombo(id, name) {
        var c = getCombo(id);
        if (c) { c.name = String(name || c.name); saveCombos(); }
    }
    function addComboItem(comboId, group, action, label, item) {
        var c = getCombo(comboId);
        if (!c) return;
        c.items.push({ group: group, action: action, label: label, item: item || null });
        saveCombos();
    }
    function removeComboItem(comboId, index) {
        var c = getCombo(comboId);
        if (!c) return;
        c.items.splice(index, 1);
        saveCombos();
    }
    function moveComboItem(comboId, fromIndex, toIndex) {
        var c = getCombo(comboId);
        if (!c) return;
        var item = c.items.splice(fromIndex, 1)[0];
        c.items.splice(toIndex, 0, item);
        saveCombos();
    }
    function startEditCombo(id) {
        if (!getCombo(id)) return;
        state.editingComboId = id;
        renderPanel();
    }
    function stopEditCombo() {
        state.editingComboId = null;
        renderPanel();
    }

    /** 执行一个组合（对单个目标按条目顺序执行） */
    function runComboOnTarget(charObj, combo) {
        if (!charObj || !combo || !combo.items.length) return;
        var items = combo.items.slice();
        var i = 0, success = 0, delay = comboDelay(combo);
        function next() {
            if (i >= items.length || !state.isActive) return;
            var it = items[i++];
            // 执行前校验该动作在当前目标该部位是否仍可用，并取最新道具
            var item = it.item || null;
            var found = findAllowedActivity(charObj, it.group, it.action);
            if (found) item = found.Item || item;
            if (executeAction(charObj, it.action, item, it.group)) success++;
            setTimeout(next, delay);
        }
        next();
        toast('执行组合「' + combo.name + '」· ' + items.length + ' 步', '#FF5C7A');
    }

    /** 对房间内所有其他成员执行同一组合 */
    function runComboAll(combo) {
        if (!combo || !combo.items.length) { toast('组合为空', '#FF5C5C'); return; }
        var chars = getRoomCharacters();
        if (!Array.isArray(chars) || chars.length === 0) { toast('房间内没有其他人', '#888'); return; }
        var ordered = orderBySelectedTarget(chars);
        var ci = 0;
        function nextChar() {
            if (ci >= ordered.length || !state.isActive) return;
            var c = ordered[ci++];
            runComboOnTarget(c, combo);
            var d = comboDelay(combo);
            setTimeout(nextChar, combo.items.length * d + 300);
        }
        nextChar();
        toast('开始对所有人执行组合「' + combo.name + '」', '#FF5C7A');
    }

    /** 切换「全部」范围开关，并更新按钮视觉 */
    function toggleAllMode() {
        state.allModeActive = !state.allModeActive;
        updateAllButtonVisual();
        toast(state.allModeActive ? '全员范围：开启' : '全员范围：关闭',
              state.allModeActive ? '#E8B339' : '#888');
    }
    function updateAllButtonVisual() {
        if (!state.actionPanelEl) return;
        var btn = state.actionPanelEl.querySelector('#xsact-all-btn');
        if (btn) btn.classList.toggle('on', state.allModeActive);
    }

    /** 收藏模式：点击动作时加入/取消收藏 */
    function toggleFavMode() {
        state.favModeActive = !state.favModeActive;
        updateFavButtonVisual();
        if (state.actionPanelEl) {
            var body = state.actionPanelEl.querySelector('#xsact-action-list');
            if (body) body.classList.toggle('fav-active', state.favModeActive);
        }
        toast(state.favModeActive ? '收藏模式：开启 · 点击动作加入收藏' : '收藏模式：关闭',
              state.favModeActive ? '#E8B339' : '#888');
    }
    function updateFavButtonVisual() {
        if (!state.actionPanelEl) return;
        var btn = state.actionPanelEl.querySelector('#xsact-fav-btn');
        if (!btn) return;
        btn.classList.toggle('on', state.favModeActive);
        var ico = btn.querySelector('.xsact-ico');
        if (ico) ico.outerHTML = svgIcon(state.favModeActive ? 'starFill' : 'star', 14);
    }
    function toggleFavoriteAction(name, btn) {
        var idx = state.favorites.indexOf(name);
        if (idx === -1) {
            state.favorites.push(name);
            toast('已收藏：' + getActivityLabel(name, state.selectedPart || ''), '#E8B339');
        } else {
            state.favorites.splice(idx, 1);
            toast('取消收藏', '#888');
        }
        persist(S_FAVS, state.favorites);
        if (btn && state.selectedPart) {
            btn.classList.toggle('fav', idx === -1);
            var star = btn.querySelector('.xsact-action-star');
            if (idx === -1) {
                if (!star) {
                    star = document.createElement('span');
                    star.className = 'xsact-action-star';
                    star.innerHTML = svgIcon('starFill', 13);
                    btn.appendChild(star);
                }
            } else if (star) {
                star.remove();
            }
        } else if (state.selectedTarget && state.selectedPart) {
            updateActionPanel(state.selectedTarget, state.selectedPart);
        }
    }

    /** 切换「自己」模式：开启后可选中并对自己执行动作 */
    function toggleSelfMode() {
        state.selfModeActive = !state.selfModeActive;
        persist(S_SELF, state.selfModeActive);
        updateSelfButtonVisual();
        if (state.isActive) refreshBodyGrids();
        toast(state.selfModeActive ? '自己模式：开启 · 现在可以点击自己身体' : '自己模式：关闭',
              state.selfModeActive ? '#46E0A0' : '#888');
    }
    function updateSelfButtonVisual() {
        if (!state.actionPanelEl) return;
        var btn = state.actionPanelEl.querySelector('#xsact-self-btn');
        if (btn) btn.classList.toggle('on', state.selfModeActive);
    }

    /** 切换「名字显示」开关：开启后在角色上方显示名字浮层 */
    function toggleShowNames() {
        state.showNames = !state.showNames;
        persist(S_SHOW_NAMES, state.showNames);
        updateShowNamesButtonVisual();
        if (state.isActive) refreshBodyGrids();
        toast(state.showNames ? '名字显示：开启' : '名字显示：关闭',
              state.showNames ? '#46E0A0' : '#888');
    }
    function updateShowNamesButtonVisual() {
        if (!state.actionPanelEl) return;
        var btn = state.actionPanelEl.querySelector('#xsact-names-btn');
        if (btn) btn.classList.toggle('on', state.showNames);
    }

    /** 清空全部收藏动作 */
    function clearAllFavorites() {
        if (!Array.isArray(state.favorites) || state.favorites.length === 0) { toast('当前没有收藏动作', '#888'); return; }
        if (!confirm('确定清空全部收藏动作吗？')) return;
        state.favorites = [];
        persist(S_FAVS, state.favorites);
        renderPanel();
        toast('已清空全部收藏', '#888');
    }

    /** Toast 提示 */
    function toast(msg, color) {
        color = color || '#FF5C7A';
        try {
            if (window.Liko && window.Liko.__Sys_Toast__) {
                window.Liko.__Sys_Toast__(msg, 2000, color);
                return;
            }
        } catch (_) {}
        // fallback: 创建简单提示
        var el = document.getElementById('xsact-qa-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'xsact-qa-toast';
            el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:99999;padding:8px 16px;border-radius:8px;font-size:13px;color:#fff;font-family:-apple-system,sans-serif;pointer-events:none;transition:opacity 0.3s;';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.background = color;
        el.style.opacity = '1';
        clearTimeout(el._timer);
        el._timer = setTimeout(() => { el.style.opacity = '0'; }, 2000);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 切换按钮（DOM 固定定位，永远可见）
    // ════════════════════════════════════════════════════════════════════════

    /** 创建 DOM 切换按钮 */
    function createToggleButton() {
        if (state.toggleBtnEl) return;
        state.toggleBtnEl = document.createElement('button');
        state.toggleBtnEl.id = 'xsact-toggle-btn';
        state.toggleBtnEl.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>';
        state.toggleBtnEl.title = state.isActive ? '退出快速动作模式' : '开启快速动作模式';
        state.toggleBtnEl.addEventListener('click', function(e) {
            if (state.toggleDragged) {
                e.stopPropagation();
                e.preventDefault();
                state.toggleDragged = false;
                return;
            }
            e.stopPropagation();
            toggleActionMode();
            updateToggleBtnStyle();
        });
        document.body.appendChild(state.toggleBtnEl);
        applyTogglePosition();
        makeToggleDraggable();
        updateToggleBtnStyle();
    }

    /** 读取并应用保存的闪电按钮位置 */
    function applyTogglePosition() {
        var btn = state.toggleBtnEl;
        if (!btn) return;
        var pos = loadSetting(S_TOGGLE_POS, null);
        if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
            btn.style.left = pos.left + 'px';
            btn.style.top = pos.top + 'px';
            btn.style.right = 'auto';
            btn.style.bottom = 'auto';
        }
    }

    /** 持久化闪电按钮位置 */
    function persistTogglePosition() {
        var btn = state.toggleBtnEl;
        if (!btn) return;
        var rect = btn.getBoundingClientRect();
        persist(S_TOGGLE_POS, { left: Math.round(rect.left), top: Math.round(rect.top) });
    }

    /** 让闪电按钮可拖拽；短按仍是打开/关闭，拖动则不触发打开 */
    function makeToggleDraggable() {
        var btn = state.toggleBtnEl;
        if (!btn) return;
        var startX, startY, startLeft, startTop;
        var DRAG_THRESHOLD = 5;

        function onDown(e) {
            var ev = e.touches ? e.touches[0] : e;
            startX = ev.clientX;
            startY = ev.clientY;
            state.toggleDragged = false;
            var rect = btn.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onUp);
        }

        function onMove(e) {
            var ev = e.touches ? e.touches[0] : e;
            var dx = ev.clientX - startX;
            var dy = ev.clientY - startY;
            if (!state.toggleDragged && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
                state.toggleDragged = true;
            }
            if (state.toggleDragged) {
                e.preventDefault();
                btn.style.left = Math.max(0, Math.min(window.innerWidth - btn.offsetWidth, startLeft + dx)) + 'px';
                btn.style.top = Math.max(0, Math.min(window.innerHeight - btn.offsetHeight, startTop + dy)) + 'px';
                btn.style.right = 'auto';
                btn.style.bottom = 'auto';
            }
        }

        function onUp(e) {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
            if (state.toggleDragged) {
                e.preventDefault();
                e.stopPropagation();
                persistTogglePosition();
            }
        }

        btn.addEventListener('mousedown', onDown);
        btn.addEventListener('touchstart', onDown, { passive: false });
    }

    /** 更新按钮外观状态 */
    function updateToggleBtnStyle() {
        if (!state.toggleBtnEl) return;
        if (state.isActive) {
            state.toggleBtnEl.classList.add('active');
            state.toggleBtnEl.title = '退出快速动作模式 · 已激活';
        } else {
            state.toggleBtnEl.classList.remove('active');
            state.toggleBtnEl.title = '开启快速动作模式';
        }
    }

    /** 兼容旧接口：DrawProcess hook 调用（确保聊天室内闪电图标常驻可见） */
    function drawToggleButton() {
        // 按钮可能被意外移出 DOM，或仅被隐藏 —— 两种情况都要恢复
        if (!state.toggleBtnEl || !document.body.contains(state.toggleBtnEl)) {
            state.toggleBtnEl = null;
            createToggleButton();
        }
        if (state.toggleBtnEl) {
            state.toggleBtnEl.style.display = '';
        }
    }

    /** 可见性守卫：聊天室内确保按钮存在且可见，离开界面则隐藏。
     *  不依赖 DrawProcess hook（BC 打包后 hookFunction 对该转发函数无效）。 */
    function guardToggleVisibility() {
        if (typeof CurrentScreen === 'undefined') return;
        if (CurrentScreen === 'ChatRoom') {
            drawToggleButton();                 // 创建(若需) + 恢复 display
        } else if (state.toggleBtnEl) {
            state.toggleBtnEl.style.display = 'none';
        }
    }
    function startVisibilityGuard() {
        if (window.__XSActQA_VisGuard) { try { clearInterval(window.__XSActQA_VisGuard); } catch (_) {} }
        window.__XSActQA_VisGuard = setInterval(guardToggleVisibility, 500);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 动作模式 UI — 核心
    // ════════════════════════════════════════════════════════════════════════

    /**
     * 进入/退出动作模式
     */
    function toggleActionMode() {
        state.isActive = !state.isActive;
        persist(S_ENABLED, state.isActive);

        if (state.isActive) enterActionMode();
        else exitActionMode();

        drawToggleButton();
    }

    function enterActionMode() {
        logD('进入动作模式');
        state.isActive = true;
        persist(S_ENABLED, true);

        // 防御：清除所有残留的旧 UI（重复注入/历史模块可能导致多份面板），
        // 确保单实例，避免动作被写进隐藏的旧面板
        document.querySelectorAll('#xsact-qa-overlay').forEach(function(el) { el.remove(); });
        document.querySelectorAll('#xsact-qa-panel').forEach(function(el) { el.remove(); });
        state.actionPanelEl = null;

        // 创建右侧面板
        if (!state.actionPanelEl) {
            state.actionPanelEl = document.createElement('div');
            state.actionPanelEl.id = 'xsact-qa-panel';
            state.actionPanelEl.innerHTML = buildPanelHTML();
            document.body.appendChild(state.actionPanelEl);
            bindPanelEvents(state.actionPanelEl);
            makeDraggable(state.actionPanelEl);
            makeResizable(state.actionPanelEl);
        }
        // 恢复上次使用的模式（首次无记录则默认「单部位」）
        var savedMode = loadSetting(S_MODE, 'part');
        if (!/^(part|combo)$/.test(savedMode)) savedMode = 'part';
        state.panelMode = savedMode;
        state.actionPanelEl.querySelectorAll('.xsact-mode-tab').forEach(function(tab) {
            tab.classList.toggle('active', tab.dataset.mode === state.panelMode);
        });
        state.actionPanelEl.style.display = '';
        applyPanelSize();
        applyPanelPosition();
        renderPanel();

        // 恢复自己模式开关状态
        try { state.selfModeActive = loadSetting(S_SELF, false); } catch (_) {}
        updateSelfButtonVisual();

        // 恢复名字显示开关状态（新装默认关闭）
        try { state.showNames = loadSetting(S_SHOW_NAMES, false); } catch (_) {}
        updateShowNamesButtonVisual();

        // 为每个角色创建身体部位浮动网格
        refreshBodyGrids();
        updateAllButtonVisual();
        updateFavButtonVisual();

        toast('动作模式已开启', '#FF5C7A');
    }

    function exitActionMode() {
        logD('退出动作模式');

        if (state.actionPanelEl) {
            state.actionPanelEl.style.display = 'none';
        }

        // 清除所有浮动网格
        clearBodyGrids();

        state.selectedTarget = null;
        state.selectedPart = null;
        state.selectedAction = null;
        state.selectedActionItem = null;
        state.editingComboId = null;
        state.allModeActive = false;

        toast('已退出动作模式', '#888');
    }

    /** 构建右侧面板 HTML */
    function buildPanelHTML() {
        return '\
<div class="xsact-qa-panel-inner">\
  <div class="xsact-qa-panel-header" id="xsact-panel-header">\
    <span class="xsact-panel-grip" id="xsact-drag-grip" title="拖动面板">' + svgIcon('grip', 16) + '</span>\
    <span id="xsact-panel-title">选择部位...</span>\
    <span class="xsact-panel-head-actions">\
      <button class="xsact-qa-mini-btn" id="xsact-theme-btn" title="切换深色/浅色主题"><span class="xsact-theme-icon sun">' + svgIcon('sun', 15) + '</span><span class="xsact-theme-icon moon">' + svgIcon('moon', 15) + '</span></button>\
      <button class="xsact-qa-mini-btn" id="xsact-refresh-btn" title="刷新当前部位/人物的动作列表状态">' + svgIcon('refresh', 15) + '</button>\
      <button class="xsact-qa-mini-btn" id="xsact-exit-panel-btn" title="退出快速动作模式 (Esc)">' + svgIcon('close', 15) + '</button>\
    </span>\
  </div>\
  <div class="xsact-qa-mode-tabs">\
    <button class="xsact-mode-tab active" data-mode="part" title="单部位动作：点人物部位后直接触发">' + svgIcon('target', 14) + '<span>动作</span></button>\
    <button class="xsact-mode-tab" data-mode="combo" title="组合动作：手动拼装多部位动作并一键执行">' + svgIcon('layers', 14) + '<span>组合动作</span></button>\
  </div>\
  <div class="xsact-qa-panel-body" id="xsact-action-list">\
    <div class="xsact-qa-empty">请先点击人物身上的部位</div>\
  </div>\
  <div class="xsact-qa-panel-footer">\
    <button class="xsact-qa-mini-btn xsact-toggle-pill" id="xsact-self-btn" title="切换自己模式：开启后可选中并对自己执行动作">' + svgIcon('user', 14) + '<span>自己</span><span class="xsact-pill-dot"></span></button>\
    <button class="xsact-qa-mini-btn xsact-toggle-pill" id="xsact-names-btn" title="切换名字显示：开启后在角色上方显示名字浮层">' + svgIcon('tag', 14) + '<span>名字</span><span class="xsact-pill-dot"></span></button>\
    <button class="xsact-qa-mini-btn xsact-toggle-pill" id="xsact-all-btn" title="切换全员范围：开启后，动作将对房间内所有人执行">' + svgIcon('users', 14) + '<span>全员</span><span class="xsact-pill-dot"></span></button>\
    <button class="xsact-qa-mini-btn xsact-toggle-pill" id="xsact-fav-btn" title="收藏模式：开启后点击动作会加入/取消收藏">' + svgIcon('star', 14) + '<span>收藏</span><span class="xsact-pill-dot"></span></button>\
    <button class="xsact-qa-mini-btn" id="xsact-fav-clear-btn" title="清空全部收藏动作">' + svgIcon('trash', 14) + '</button>\
    <button class="xsact-qa-mini-btn" id="xsact-x3-btn" title="连续3次">' + svgIcon('bolt', 14) + '<span>×3</span></button>\
  </div>\
  <div class="xsact-qa-state.presets-bar" id="xsact-state.presets-bar"></div>\
  <div class="xsact-resize-handle" id="xsact-resize-handle" title="拖动缩放面板">' + svgIcon('resize', 14) + '</div>\
</div>';
    }

    // ════════════════════════════════════════════════════════════════════════
    // 身体部位浮动网格
    // ════════════════════════════════════════════════════════════════════════

    /**
     * 获取房间内"真实成员"的绘制布局（逻辑坐标）
     * 使用 ChatRoomCharacter（权威成员列表）交叉校验，避免 Drawlist 含离场/NPC 角色
     */
    function getCharLayout() {
        var layout = [];
        try {
            if (typeof ChatRoomCharacter === 'undefined' || !Array.isArray(ChatRoomCharacter)) return layout;

            // 收集房间内真实成员 MemberNumber 集合（交叉校验，排除离场/NPC）
            var memberMNs = {};
            ChatRoomCharacter.forEach(function(c) {
                if (c && c.MemberNumber) memberMNs[c.MemberNumber] = true;
            });

            var now = Date.now();

            // ① 优先用 DrawCharacter 记录的真实绘制坐标（每帧刷新，含活动位移）
            var anchorMap = {};
            ChatRoomCharacter.forEach(function(c) {
                if (!c || c.MemberNumber == null) return;
                var a = state.charAnchor[c.MemberNumber];
                if (a && (now - a.t < 1000)) anchorMap[c.MemberNumber] = a;
            });

            // ② 退回：ChatRoomCharacterViewLoopCharacters 提供的坐标
            var loopMap = {};
            if (typeof ChatRoomCharacterViewLoopCharacters === 'function') {
                ChatRoomCharacterViewLoopCharacters(function(idx, cx, cy, space, zoom) {
                    var cc = (typeof ChatRoomCharacterDrawlist !== 'undefined' && ChatRoomCharacterDrawlist)
                        ? ChatRoomCharacterDrawlist[idx] : null;
                    if (cc && cc.MemberNumber != null) loopMap[cc.MemberNumber] = { x: cx, y: cy, zoom: zoom };
                    return '';
                });
            }

            // 身体线框使用固定槽位坐标（绝对位置），不跟随拥抱/位移动画的临时绘制位置。
            // 这样即使角色拥抱时绘制位置重叠，线框仍保持左右错开、高度不变。
            ChatRoomCharacter.forEach(function(c) {
                if (!c || c.MemberNumber == null || !memberMNs[c.MemberNumber]) return;
                var loop = loopMap[c.MemberNumber];
                var anchor = anchorMap[c.MemberNumber];
                if (!loop && !anchor) return;
                // 优先固定槽位坐标（loop），缺失才回退到真实绘制坐标（anchor）
                var useX = loop || anchor;
                var useY = loop || anchor;
                layout.push({ char: c, x: useX.x, y: useY.y, zoom: (loop ? loop.zoom : (anchor ? anchor.zoom : 1)), src: loop ? 'loop' : 'anchor' });
            });
        } catch (e) {
            console.warn('[XSAct-QA] getCharLayout 失败:', e);
        }
        return layout;
    }

    // ════════════════════════════════════════════════════════════════════════
    // BC 画布坐标换算（借鉴 BC-HSC geometry.js 的精准做法）
    // ════════════════════════════════════════════════════════════════════════
    const BC_CANVAS_W = 2000;
    const BC_CANVAS_H = 1000;

    // 画布矩形缓存（getBoundingClientRect 较贵，按帧/resize 刷新）已并入 state

    function refreshCanvasCache() {
        try {
            var canvas = document.getElementById('MainCanvas') || document.querySelector('canvas');
            if (!canvas) { state.cachedRect = null; return; }
            state.cachedRect = canvas.getBoundingClientRect();
            state.cachedScaleX = state.cachedRect.width / BC_CANVAS_W;
            state.cachedScaleY = state.cachedRect.height / BC_CANVAS_H;
        } catch (e) { /* ignore */ }
    }

    /** BC 画布坐标(2000x1000) → 屏幕像素坐标 */
    function bcToScreen(bcX, bcY) {
        if (!state.cachedRect) return { x: window.innerWidth * 0.25, y: window.innerHeight * 0.25, sx: state.cachedScaleX, sy: state.cachedScaleY };
        return {
            x: state.cachedRect.left + bcX * state.cachedScaleX,
            y: state.cachedRect.top + bcY * state.cachedScaleY,
            sx: state.cachedScaleX,
            sy: state.cachedScaleY
        };
    }

    /**
     * 角色 asset 坐标(ax, ay) → BC 画布坐标。
     * asset 空间：宽 500、高 1000，角色居中于 x=250。
     * 优先用 BC 原生 CharacterAppearanceXOffset/YOffset（含身高/姿势 OverrideHeight 等），
     * 任何身高/姿势（跪/趴/抱）都正确，绝不与原生脱节。
     */
    function bodyAssetToBc(ax, ay, C, dp) {
        var ratio = (C && typeof C.HeightRatio === 'number') ? C.HeightRatio : 1;
        var prop  = (C && typeof C.HeightRatioProportion === 'number') ? C.HeightRatioProportion : 1;
        var hMod  = (C && typeof C.HeightModifier === 'number') ? C.HeightModifier : 0;
        var xOff, yOff;
        if (typeof CharacterAppearanceXOffset === 'function') {
            try { xOff = CharacterAppearanceXOffset(C, ratio); } catch (_) { xOff = 500 * (1 - ratio) / 2; }
        } else { xOff = 500 * (1 - ratio) / 2; }
        if (typeof CharacterAppearanceYOffset === 'function') {
            try { yOff = CharacterAppearanceYOffset(C, ratio); } catch (_) { yOff = 1000 * (1 - ratio) * prop - hMod * ratio; }
        } else { yOff = 1000 * (1 - ratio) * prop - hMod * ratio; }
        var z = dp.zoom;
        return {
            x: dp.x + z * (xOff + ax * ratio),
            y: dp.y + z * (yOff + ay * ratio)
        };
    }

    /** 创建角色的身体部位线框网格（覆盖在角色身上） */
    /** 创建角色的身体部位线框（覆盖在角色身上，按 BC 原生 Zone 画热区） */
    function createBodyGrid(entry) {
        var charObj = entry.char;
        if (state.bodyGrids.has(charObj)) return state.bodyGrids.get(charObj);

        var grid = document.createElement('div');
        grid.className = 'xsact-body-grid' + (charObj.IsPlayer && charObj.IsPlayer() ? ' self' : '');
        grid.dataset.mn = charObj.MemberNumber;

        // 每个部位 + 每个 Zone 生成一个绝对定位热区（百分比摆放，分辨率无关）
        BODY_PARTS.forEach(function(part) {
            var zones = getPartZones(charObj, part.group);
            zones.forEach(function(z) {
                var btn = document.createElement('button');
                btn.className = 'xsact-part-btn';
                btn.dataset.group = part.group;
                btn.dataset.targetMn = charObj.MemberNumber;
                // 在容器(0-500 × 0-1000)内的百分比定位
                btn.style.left   = (z[0] / 500 * 100) + '%';
                btn.style.top    = (z[1] / 1000 * 100) + '%';
                btn.style.width  = (z[2] / 500 * 100) + '%';
                btn.style.height = (z[3] / 1000 * 100) + '%';
                btn.title = part.label + '（' + part.group + '）';
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    selectTargetAndPart(charObj, part.group);
                    bringGridToFront(grid);
                });
                grid.appendChild(btn);
            });
        });

        // 点击网格空白区域也提升层级
        grid.addEventListener('click', function(e) {
            if (e.target === grid) bringGridToFront(grid);
        });

        document.body.appendChild(grid);
        state.bodyGrids.set(charObj, grid);

        refreshCanvasCache();
        positionGrid(grid, entry);
        return grid;
    }

    /**
     * 根据角色布局定位线框容器。
     * 水平方向仍按角色实际宽度缩放；
     * 垂直方向固定高度，顶部锚定在角色「槽位顶部」(entry.y)，不随蹲姿/身高下移，
     * 避免人多了上下两排时，上排蹲下压到下排。
     */
    /**
     * 计算角色身体线框在屏幕上的矩形位置（供线框和名字浮层共用）
     */
    function getGridScreenRect(entry) {
        var C = entry.char;
        var dp = { x: entry.x, y: entry.y, zoom: entry.zoom };
        var sc = bcToScreen(0, 0); // 取画布→屏幕缩放因子

        // 水平：按实际角色宽度（xOff + ratio）计算，保持左右覆盖
        var left  = bodyAssetToBc(BODY_AX0, BODY_AY1, C, dp);
        var right = bodyAssetToBc(BODY_AX1, BODY_AY1, C, dp);
        var sL = bcToScreen(left.x, left.y);
        var sR = bcToScreen(right.x, right.y);
        var width = Math.abs(sR.x - sL.x);
        var centerX = (sL.x + sR.x) / 2;

        // 垂直：固定高度，顶部锚定在角色槽位顶部(entry.y)，忽略蹲姿导致的 yOff 下移
        var top = bcToScreen(entry.x, entry.y).y;
        var height = entry.zoom * GRID_FIXED_HEIGHT * sc.sy;

        return { left: centerX - width / 2, top: top, right: centerX + width / 2, bottom: top + height, width: width, height: height, centerX: centerX };
    }

    function positionGrid(grid, entry) {
        var rect = getGridScreenRect(entry);
        var shift = entry.overlapShift || 0;
        grid.style.width = rect.width + 'px';
        grid.style.height = rect.height + 'px';
        grid.style.left = (rect.left + shift) + 'px';
        grid.style.top = rect.top + 'px';
    }

    /** 取 BC 真实人物昵称（优先 Nickname，与游戏内 CharacterNickname 一致） */
    function characterDisplayName(charObj) {
        if (!charObj) return '???';
        if (typeof CharacterNickname === 'function') return CharacterNickname(charObj);
        return charObj.Nickname || charObj.Name || '???';
    }

    /** 创建角色名字浮层（放在独立视口层，避免被画布/窗口边缘裁切） */
    function createNameOverlay(entry) {
        var charObj = entry.char;
        if (state.nameOverlays.has(charObj)) return state.nameOverlays.get(charObj);
        var layer = document.getElementById('xsact-name-layer');
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'xsact-name-layer';
            layer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:90002;';
            document.body.appendChild(layer);
        }
        var overlay = document.createElement('div');
        overlay.className = 'xsact-name-overlay' + (charObj.IsPlayer && charObj.IsPlayer() ? ' self' : '');
        overlay.textContent = characterDisplayName(charObj);
        overlay.dataset.mn = charObj.MemberNumber;
        overlay.style.display = state.showNames ? '' : 'none';
        layer.appendChild(overlay);
        state.nameOverlays.set(charObj, overlay);
        positionNameOverlay(overlay, entry);
        return overlay;
    }

    function positionNameOverlay(overlay, entry) {
        var rect = getGridScreenRect(entry);
        var shift = entry.overlapShift || 0;
        var labelHeight = overlay.offsetHeight || 24;
        // 对齐 BC 原版名字基线：原版名字绘制在角色头顶（rect.top）附近，
        // 房间人数 > 5 时再上移 4px（Drawing.js 的 NameOffset）。
        // 把标签底部贴到这条基线，使我们的标签直接盖住原版名字。
        var roomBig = (typeof ChatRoomCharacter !== 'undefined' && ChatRoomCharacter.length > 5);
        var nameOffset = roomBig ? -4 : 0;
        var nameBaseline = rect.top - Math.round(rect.height / 50) + nameOffset;
        var top = nameBaseline - labelHeight;
        // 若上方超出视口，则 fallback 到角色下方
        if (top < 8) {
            top = rect.bottom + 6;
        }
        overlay.style.left = (rect.centerX + shift) + 'px';
        overlay.style.top = top + 'px';
        overlay.style.transform = 'translateX(-50%)';
    }

    /** 将指定网格提升到最前（解决人物重叠时的选择问题） */
    var _gridZTop = 89999;
    function bringGridToFront(grid) {
        if (!grid) return;
        _gridZTop += 1;
        grid.style.zIndex = _gridZTop;
        // 同时降低其他网格
        state.bodyGrids.forEach(function(g) {
            if (g !== grid && g.style.zIndex > 90000) {
                g.style.zIndex = 89999;
            }
        });
    }

    /** 更新所有角色的身体网格与名字浮层 */
    function refreshBodyGrids() {
        clearBodyGrids();
        var layout = getCharLayout();
        var shifts = computeOverlapShifts(layout);
        layout.forEach(function(entry) {
            var isPlayer = entry.char.IsPlayer && entry.char.IsPlayer();
            if (isPlayer && !state.selfModeActive) return; // 未开启自己模式时跳过自己
            entry.overlapShift = shifts.get(entry.char.MemberNumber) || 0;
            createBodyGrid(entry);
            if (state.showNames) createNameOverlay(entry);
        });
    }

    /** 当两个角色拥抱/位置严重重叠时，给被遮挡的网格加一个水平偏移，避免线框完全糊在一起。
     *  规则：只处理真正大面积重叠（>50%），忽略正常并肩站位；最大偏移约一个角色宽度，
     *  确保拥抱者能完整错开；每帧重算，玩家自己也参与避让。 */
    function computeOverlapShifts(layout) {
        var shifts = new Map();
        if (!layout || layout.length < 2) return shifts;

        var rects = layout.map(function(entry) {
            return { entry: entry, rect: getGridScreenRect(entry), mn: entry.char.MemberNumber };
        });
        rects.sort(function(a, b) { return a.rect.left - b.rect.left; });
        var screenW = window.innerWidth || 1920;
        var maxShiftBase = 70;      // 最小偏移幅度
        var overlapThreshold = 0.5; // 只有>50%面积重叠才推（拥抱级）
        var spacing = 16;           // 推开后留出的间距

        for (var i = 1; i < rects.length; i++) {
            var cur = rects[i];
            var curShift = 0;
            for (var j = 0; j < i; j++) {
                var prev = rects[j];
                var prevShift = shifts.get(prev.mn) || 0;
                if (rectsOverlap(prev.rect, cur.rect, overlapThreshold)) {
                    var desired = prev.rect.left + prevShift + prev.rect.width + spacing;
                    var need = desired - cur.rect.left;
                    if (need > curShift) curShift = need;
                }
            }
            if (curShift > 0) {
                // 关键修复：偏移幅度必须 ≥ 线框宽度 + 间距，才能把拥抱/重叠的两人“完整错开”。
                // 之前用 width*0.55（约 70px）小于线框实际宽度（约 72~80px），推完仍重叠；
                // v0.7.9 的 max(width*0.5, 80) 恰好够，这里改成 width+spacing 保证任何宽度都能彻底分离。
                var maxShift = cur.rect.width + spacing;
                curShift = Math.min(curShift, maxShift);
                // 限制在屏幕右边界内（仅在确实会越界时收紧，不因此残留重叠）
                var maxRight = screenW - 10;
                var desiredRight = cur.rect.left + curShift + cur.rect.width;
                if (desiredRight > maxRight) {
                    curShift = Math.max(0, maxRight - cur.rect.left - cur.rect.width);
                }
                if (curShift > 0) shifts.set(cur.mn, curShift);
            }
        }
        return shifts;
    }

    function rectsOverlap(a, b, threshold) {
        var xOverlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        var yOverlap = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        var aArea = a.width * a.height;
        var bArea = b.width * b.height;
        if (aArea <= 0 || bArea <= 0) return false;
        return (xOverlap * yOverlap) / Math.min(aArea, bArea) > threshold;
    }

    /** 清除所有浮动网格与名字浮层 */
    function clearBodyGrids() {
        state.bodyGrids.forEach(function(grid) {
            if (grid && grid.parentNode) grid.parentNode.removeChild(grid);
        });
        state.bodyGrids.clear();
        state.nameOverlays.forEach(function(el) {
            if (el && el.parentNode) el.parentNode.removeChild(el);
        });
        state.nameOverlays.clear();
        var layer = document.getElementById('xsact-name-layer');
        if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    }

    /** 选中目标和部位 */
    function selectTargetAndPart(charObj, partGroup) {
        state.selectedTarget = charObj;
        state.selectedPart = partGroup;

        // 高亮选中的网格
        state.bodyGrids.forEach(function(grid, c) {
            var isSelected = (c.MemberNumber === charObj.MemberNumber);
            grid.classList.toggle('selected', isSelected);
            grid.querySelectorAll('.xsact-part-btn').forEach(function(btn) {
                btn.classList.toggle('active', isSelected && btn.dataset.group === partGroup);
            });
        });

        // 更新右侧面板（按当前模式分派）
        renderPanel();
    }

    // ════════════════════════════════════════════════════════════════════════
    // 右侧动作面板
    // ════════════════════════════════════════════════════════════════════════

    /** 面板渲染分派：根据 state.panelMode 渲染「单部位」或「自定义组合」 */
    function renderPanel() {
        if (!state.actionPanelEl) return;
        updateAllButtonVisual();
        updateFavButtonVisual();
        if (!state.selectedTarget) {
            var listEl0 = state.actionPanelEl.querySelector('#xsact-action-list');
            var titleEl0 = state.actionPanelEl.querySelector('#xsact-panel-title');
            if (titleEl0) titleEl0.textContent = (state.panelMode === 'combo') ? '选择人物...' : '选择动作...';
            if (listEl0) listEl0.innerHTML = '<div class="xsact-qa-empty">请先点击人物身上的部位</div>';
            return;
        }
        if (state.panelMode === 'combo') updateComboPanel(state.selectedTarget);
        else updateActionPanel(state.selectedTarget, state.selectedPart);
    }

    /** 切换面板模式（部位 / 自定义组合） */
    function setPanelMode(mode) {
        if (!/^(part|combo)$/.test(mode)) return;
        state.panelMode = mode;
        persist(S_MODE, mode);
        if (state.actionPanelEl) {
            state.actionPanelEl.querySelectorAll('.xsact-mode-tab').forEach(function(tab) {
                tab.classList.toggle('active', tab.dataset.mode === mode);
            });
        }
        renderPanel();
    }

    /** 刷新面板状态（用于刷新按钮）：重新读取当前部位/人物的可执行动作或组合列表 */
    function refreshPanelState() {
        if (!state.actionPanelEl || !state.selectedTarget) { toast('请先选择一个人物部位', '#888'); return; }
        if (state.panelMode === 'combo') {
            // 重新从存储加载组合，并刷新视图
            try { state.combos = loadSetting(S_COMBOS, []); } catch (_) {}
            updateComboPanel(state.selectedTarget);
            toast('组合列表已刷新', '#FF5C7A');
        } else {
            // 重新渲染当前部位动作列表（ActivityAllowedForGroup 会实时重新计算）
            updateActionPanel(state.selectedTarget, state.selectedPart);
            toast('动作列表已刷新', '#FF5C7A');
        }
    }

    /** 自定义组合面板：列表视图 或 编辑视图 */
    function updateComboPanel(charObj) {
        if (!state.actionPanelEl) return;
        var titleEl = state.actionPanelEl.querySelector('#xsact-panel-title');
        var listEl = state.actionPanelEl.querySelector('#xsact-action-list');
        var allBtn = state.actionPanelEl.querySelector('#xsact-all-btn');
        if (!titleEl || !listEl) return;

        if (state.editingComboId) {
            // ── 编辑视图 ──
            var combo = getCombo(state.editingComboId);
            if (!combo) { state.editingComboId = null; updateComboPanel(charObj); return; }
            titleEl.textContent = '编辑：' + combo.name;
            if (allBtn) allBtn.disabled = false;

            var html = '<div class="xsact-combo-editor">';
            // 名称输入
            html += '<div class="xsact-combo-field"><input type="text" id="xsact-combo-name" value="' +
                escapeHtml(combo.name) + '" placeholder="组合名称"></div>';
            // 动作间隔（延迟）滑块
            var curDelay = comboDelay(combo);
            html += '<div class="xsact-combo-field xsact-combo-delay">' +
                '<label>动作间隔 <span id="xsact-delay-val">' + curDelay + '</span>ms</label>' +
                '<input type="range" id="xsact-combo-delay" min="50" max="2000" step="50" value="' + curDelay + '">' +
                '</div>';
            // 条目列表
            if (!combo.items.length) {
                html += '<div class="xsact-qa-empty">请到「动作」模式，点击动作旁的「加入」按钮添加</div>';
            } else {
                html += '<div class="xsact-combo-items">';
                combo.items.forEach(function(it, idx) {
                    var partLbl = (BODY_PARTS.find(function(p) { return p.group === it.group; }) || {}).label || it.group;
                    html += '<div class="xsact-combo-item" data-idx="' + idx + '">' +
                        '<span class="xsact-combo-item-num">' + (idx + 1) + '</span>' +
                        '<span class="xsact-combo-item-part">' + escapeHtml(partLbl) + '</span>' +
                        '<span class="xsact-combo-item-action">' + escapeHtml(it.label || it.action) + '</span>' +
                        '<button class="xsact-combo-item-up" title="上移">' + svgIcon('up', 13) + '</button>' +
                        '<button class="xsact-combo-item-down" title="下移">' + svgIcon('down', 13) + '</button>' +
                        '<button class="xsact-combo-item-del" title="删除">' + svgIcon('close', 13) + '</button>' +
                        '</div>';
                });
                html += '</div>';
            }
            // 操作按钮
            html += '<div class="xsact-combo-actions">' +
                '<button class="xsact-combo-save-btn">保存</button>' +
                '<button class="xsact-combo-cancel-btn">返回</button>' +
                '</div>';
            html += '</div>';
            listEl.innerHTML = html;

            // 绑定
            var nameInput = listEl.querySelector('#xsact-combo-name');
            if (nameInput) nameInput.addEventListener('change', function() { renameCombo(combo.id, nameInput.value); titleEl.textContent = '编辑：' + combo.name; });
            // 延迟滑块
            var delayInput = listEl.querySelector('#xsact-combo-delay');
            var delayVal = listEl.querySelector('#xsact-delay-val');
            if (delayInput) delayInput.addEventListener('input', function() {
                var v = parseInt(delayInput.value, 10) || 160;
                if (delayVal) delayVal.textContent = v;
                combo.delay = v;
                saveCombos();
            });
            listEl.querySelectorAll('.xsact-combo-item-del').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var idx = parseInt(btn.closest('.xsact-combo-item').dataset.idx, 10);
                    removeComboItem(combo.id, idx);
                    updateComboPanel(charObj);
                });
            });
            listEl.querySelectorAll('.xsact-combo-item-up').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var idx = parseInt(btn.closest('.xsact-combo-item').dataset.idx, 10);
                    if (idx > 0) { moveComboItem(combo.id, idx, idx - 1); updateComboPanel(charObj); }
                });
            });
            listEl.querySelectorAll('.xsact-combo-item-down').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var idx = parseInt(btn.closest('.xsact-combo-item').dataset.idx, 10);
                    if (idx < combo.items.length - 1) { moveComboItem(combo.id, idx, idx + 1); updateComboPanel(charObj); }
                });
            });
            var saveBtn = listEl.querySelector('.xsact-combo-save-btn');
            if (saveBtn) saveBtn.addEventListener('click', function() { stopEditCombo(); toast('组合已保存', '#46E0A0'); });
            var cancelBtn = listEl.querySelector('.xsact-combo-cancel-btn');
            if (cancelBtn) cancelBtn.addEventListener('click', stopEditCombo);
            return;
        }

        // ── 列表视图 ──
        titleEl.textContent = (characterDisplayName(charObj) || '?') + ' → 组合动作';
        if (allBtn) allBtn.disabled = false;

        var html = '';
        if (!state.combos.length) {
            html = '<div class="xsact-qa-empty">暂无组合。点击下方「新建组合」，然后到「动作」模式点击动作旁的「加入」按钮添加动作。</div>';
        } else {
            state.combos.forEach(function(c) {
                html += '<div class="xsact-combo-card" data-id="' + c.id + '">' +
                    '<div class="xsact-combo-info">' +
                    '<span class="xsact-combo-name">' + escapeHtml(c.name) + '</span>' +
                    '<span class="xsact-combo-count">' + c.items.length + ' 步</span>' +
                    '</div>' +
                    '<div class="xsact-combo-btns">' +
                    '<button class="xsact-combo-run" title="执行">' + svgIcon('play', 14) + '</button>' +
                    '<button class="xsact-combo-edit" title="编辑">' + svgIcon('pencil', 14) + '</button>' +
                    '<button class="xsact-combo-delete" title="删除">' + svgIcon('trash', 14) + '</button>' +
                    '</div>' +
                    '</div>';
            });
        }
        html += '<button class="xsact-combo-new-btn" id="xsact-new-combo-btn">' + svgIcon('plus', 15) + '新建组合</button>';
        listEl.innerHTML = html;

        listEl.querySelectorAll('.xsact-combo-run').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var id = btn.closest('.xsact-combo-card').dataset.id;
                var c = getCombo(id);
                if (!c || !c.items.length) return;
                if (state.allModeActive) runComboAll(c);
                else runComboOnTarget(charObj, c);
            });
        });
        listEl.querySelectorAll('.xsact-combo-edit').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                startEditCombo(btn.closest('.xsact-combo-card').dataset.id);
            });
        });
        listEl.querySelectorAll('.xsact-combo-delete').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var id = btn.closest('.xsact-combo-card').dataset.id;
                if (confirm('确定删除这个组合吗？')) { deleteCombo(id); updateComboPanel(charObj); }
            });
        });
        var newBtn = listEl.querySelector('#xsact-new-combo-btn');
        if (newBtn) newBtn.addEventListener('click', function() {
            var c = addCombo('新组合');
            startEditCombo(c.id);
        });
    }

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, function(m) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
        });
    }

    /** 统一内联 SVG 图标（无 emoji）。stroke 继承 currentColor。 */
    function svgIcon(name, size) {
        size = size || 16;
        var P = {
            close:    '<path d="M6 6l12 12M18 6L6 18"/>',
            refresh:  '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
            play:     '<path d="M7 4l13 8-13 8z"/>',
            star:     '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.9 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
            starFill: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
            plus:     '<path d="M12 5v14M5 12h14"/>',
            trash:    '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
            pencil:   '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
            up:       '<path d="M6 14l6-6 6 6"/>',
            down:     '<path d="M6 10l6 6 6-6"/>',
            grip:     '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
            check:    '<path d="M5 12l5 5 9-11"/>',
            bolt:     '<path d="M13 2 4 14h7l-1 8 10-12h-7z"/>',
            resize:   '<path d="M22 2L2 22M16 22h6v-6"/>',
            users:    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
            target:   '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
            tag:      '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>',
            zap:      '<polygon points="13 2 4 14 11 14 10 22 20 10 13 10"/>',
            layers:   '<path d="M12 3L2 9l10 6 10-6-10-6z"/><path d="M2 15l10 6 10-6"/>',
            user:     '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
            settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
            sun:      '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
            moon:     '<path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>'
        };
        var inner = P[name] || '';
        return '<svg class="xsact-ico" viewBox="0 0 24 24" width="' + size + '" height="' + size +
            '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            inner + '</svg>';
    }

    function updateActionPanel(charObj, partGroup) {
        // 用模块持有的面板引用查询，避免重复注入时 getElementById 命中隐藏旧面板
        if (!state.actionPanelEl) return;
        var titleEl = state.actionPanelEl.querySelector('#xsact-panel-title');
        var listEl = state.actionPanelEl.querySelector('#xsact-action-list');
        var allBtn = state.actionPanelEl.querySelector('#xsact-all-btn');

        if (!titleEl || !listEl) return;

        var partLabel = BODY_PARTS.find(function(p) { return p.group === partGroup; });
        titleEl.textContent = (characterDisplayName(charObj) || '?') + ' → ' + (partLabel ? partLabel.label : partGroup);

        var actions = getActionsForPart(partGroup, charObj);
        if (actions.length === 0) {
            listEl.innerHTML = '<div class="xsact-qa-empty">该部位暂无可用动作</div>';
            if (allBtn) allBtn.disabled = true;
            return;
        }

        if (allBtn) allBtn.disabled = false;
        var html = '';
        var isEditing = !!state.editingComboId;
        actions.forEach(function(act) {
            var lbl = getActivityLabel(act.Name, partGroup);
            var isFav = state.favorites.indexOf(act.Name) !== -1;
            html += '<div class="xsact-action-row' + (isEditing ? ' editing' : '') + '" data-name="' + act.Name + '">' +
                '<button class="xsact-action-btn' + (isFav ? ' fav' : '') + '" data-name="' + act.Name + '" title="' + act.Name + '">' +
                '<span class="xsact-action-label">' + lbl + '</span>' +
                (isFav ? '<span class="xsact-action-star">' + svgIcon('starFill', 13) + '</span>' : '') +
                '</button>';
            if (isEditing) {
                html += '<button class="xsact-add-to-combo" title="加入当前组合">' + svgIcon('plus', 16) + '</button>';
            }
            html += '</div>';
        });
        listEl.innerHTML = html;

        // 绑定动作按钮点击：收藏模式下加入/取消收藏，否则执行
        listEl.querySelectorAll('.xsact-action-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var actName = btn.dataset.name;
                var act = actions.find(function(a) { return a.Name === actName; }) || { Name: actName, Item: null };
                state.selectedAction = actName;
                state.selectedActionItem = act.Item || null;
                listEl.querySelectorAll('.xsact-action-btn').forEach(b => b.classList.remove('sel'));
                btn.classList.add('sel');

                if (state.favModeActive) {
                    toggleFavoriteAction(actName, btn);
                    return;
                }

                if (state.allModeActive) executeActionAll();
                else { executeAction(charObj, actName, state.selectedActionItem); toast('已执行：' + getActivityLabel(actName, partGroup), '#46E0A0'); }
            });
        });

        // 绑定「加入组合」点击（编辑模式）
        if (isEditing) {
            listEl.querySelectorAll('.xsact-add-to-combo').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var actName = btn.parentNode.dataset.name;
                    var act = actions.find(function(a) { return a.Name === actName; }) || { Name: actName, Item: null, translatedName: actName };
                    var lbl = act.translatedName || getActivityLabel(act.Name, partGroup);
                    addComboItem(state.editingComboId, partGroup, act.Name, lbl, act.Item || null);
                    toast('已加入「' + getCombo(state.editingComboId).name + '」', '#46E0A0');
                });
            });
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 事件绑定
    // ════════════════════════════════════════════════════════════════════════

    /** 把面板恢复到上次拖拽保存的位置（无记录则用默认右上角） */
    function applyPanelPosition() {
        if (!state.actionPanelEl) return;
        var saved = loadSetting(S_POS, null);
        if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
            state.actionPanelEl.style.right = 'auto';
            state.actionPanelEl.style.bottom = 'auto';
            state.actionPanelEl.style.left = saved.left + 'px';
            state.actionPanelEl.style.top = saved.top + 'px';
        }
    }

    /** 保存面板位置（拖拽结束调用） */
    function savePanelPosition() {
        if (!state.actionPanelEl) return;
        var r = state.actionPanelEl.getBoundingClientRect();
        persist(S_POS, { left: Math.round(r.left), top: Math.round(r.top) });
    }

    /** 应用保存的面板尺寸 */
    function applyPanelSize() {
        if (!state.actionPanelEl) return;
        var saved = loadSetting(S_SIZE, null);
        if (saved && typeof saved.width === 'number' && typeof saved.height === 'number') {
            state.actionPanelEl.style.width = Math.max(220, Math.min(560, saved.width)) + 'px';
            state.actionPanelEl.style.height = Math.max(300, Math.min(window.innerHeight - 60, saved.height)) + 'px';
        }
    }

    /** 保存面板尺寸（缩放结束调用） */
    function savePanelSize() {
        if (!state.actionPanelEl) return;
        persist(S_SIZE, { width: Math.round(state.actionPanelEl.offsetWidth), height: Math.round(state.actionPanelEl.offsetHeight) });
    }

    /** 让面板右下角可缩放 */
    function makeResizable(panel) {
        var handle = panel.querySelector('#xsact-resize-handle');
        if (!handle) return;
        var resizing = false, sx = 0, sy = 0, ow = 0, oh = 0;

        function onMove(e) {
            if (!resizing) return;
            var nw = ow + (e.clientX - sx);
            var nh = oh + (e.clientY - sy);
            nw = Math.max(220, Math.min(560, nw));
            nh = Math.max(300, Math.min(window.innerHeight - 60, nh));
            panel.style.width = nw + 'px';
            panel.style.height = nh + 'px';
        }
        function onUp() {
            if (!resizing) return;
            resizing = false;
            handle.classList.remove('resizing');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            savePanelSize();
        }
        handle.addEventListener('mousedown', function(e) {
            resizing = true;
            sx = e.clientX; sy = e.clientY;
            ow = panel.offsetWidth; oh = panel.offsetHeight;
            handle.classList.add('resizing');
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            e.preventDefault();
            e.stopPropagation();
        });
    }

    /** 让面板标题栏可拖拽 */
    function makeDraggable(panel) {
        var header = panel.querySelector('#xsact-panel-header');
        if (!header) return;
        var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;

        function onMove(e) {
            if (!dragging) return;
            var nx = ox + (e.clientX - sx);
            var ny = oy + (e.clientY - sy);
            // 限制在视口内
            var w = panel.offsetWidth, h = panel.offsetHeight;
            nx = Math.max(4, Math.min(nx, window.innerWidth - w - 4));
            ny = Math.max(4, Math.min(ny, window.innerHeight - h - 4));
            panel.style.left = nx + 'px';
            panel.style.top = ny + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        }
        function onUp() {
            if (!dragging) return;
            dragging = false;
            header.classList.remove('dragging');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            savePanelPosition();
        }
        header.addEventListener('mousedown', function(e) {
            // 标题栏上的按钮不触发拖拽
            if (e.target.closest('button')) return;
            dragging = true;
            sx = e.clientX; sy = e.clientY;
            var r = panel.getBoundingClientRect();
            ox = r.left; oy = r.top;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            header.classList.add('dragging');
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            e.preventDefault();
        });
    }

    function bindPanelEvents(panel) {
        // 退出按钮（面板上的 ✕）
        var exitBtn = panel.querySelector('#xsact-exit-panel-btn');
        if (exitBtn) exitBtn.addEventListener('click', function() { toggleActionMode(); });

        // 刷新按钮：重新渲染当前面板状态（单部位刷新动作列表，组合模式刷新组合列表）
        var refreshBtn = panel.querySelector('#xsact-refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', refreshPanelState);

        // 模式切换标签（动作 / 组合动作）
        panel.querySelectorAll('.xsact-mode-tab').forEach(function(tab) {
            tab.addEventListener('click', function() { setPanelMode(tab.dataset.mode); });
        });

        // 全员执行按钮：切换全员范围开关
        var allBtn = panel.querySelector('#xsact-all-btn');
        if (allBtn) allBtn.addEventListener('click', toggleAllMode);

        // 自己模式按钮
        var selfBtn = panel.querySelector('#xsact-self-btn');
        if (selfBtn) selfBtn.addEventListener('click', toggleSelfMode);

        // 名字显示按钮
        var namesBtn = panel.querySelector('#xsact-names-btn');
        if (namesBtn) namesBtn.addEventListener('click', toggleShowNames);

        // ×3 连打
        var x3Btn = panel.querySelector('#xsact-x3-btn');
        if (x3Btn) x3Btn.addEventListener('click', function() {
            if (!state.selectedTarget || !state.selectedAction) return;
            var count = 0;
            var doIt = function() {
                if (count < 3 && state.isActive) {
                    executeAction(state.selectedTarget, state.selectedAction);
                    count++;
                    setTimeout(doIt, 300);
                }
            };
            doIt();
        });

        // 收藏按钮：切换收藏模式
        var favBtn = panel.querySelector('#xsact-fav-btn');
        if (favBtn) favBtn.addEventListener('click', toggleFavMode);

        // 清空收藏按钮
        var favClearBtn = panel.querySelector('#xsact-fav-clear-btn');
        if (favClearBtn) favClearBtn.addEventListener('click', clearAllFavorites);

        // 主题切换按钮（太阳/月亮）
        var themeBtn = panel.querySelector('#xsact-theme-btn');
        if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    }

    /** 取当前主题强调色（用于 toast 等需要真实颜色值的场景） */
    function accentColor() {
        try { return getComputedStyle(document.documentElement).getPropertyValue('--xs-accent').trim() || '#FF5C7A'; }
        catch (e) { return '#FF5C7A'; }
    }

    /** 重复上次动作 */
    function repeatLastAction() {
        if (!state.lastAction) { toast('没有上次的动作记录', '#888'); return; }
        var target = (ChatRoomCharacter || []).find(function(c) {
            return c && c.MemberNumber === state.lastAction.targetMN;
        });
        if (!target) { toast('目标不在房间内', '#FF5C5C'); return; }
        state.selectedTarget = target;
        state.selectedPart = state.lastAction.part || '';
        state.selectedAction = state.lastAction.name;
        executeAction(target, state.lastAction.name);
        toast('重复：' + state.lastAction.name, '#FF5C7A');
    }

    // ════════════════════════════════════════════════════════════════════════
    // CSS 样式注入
    // ════════════════════════════════════════════════════════════════════════

    // 生成主题调色板 CSS（只保留 dark/light 两套）
    function buildThemeVarsCSS() {
        var DARK = {
            bg:'rgba(20,23,28,0.98)', bg2:'#1C2027', border:'rgba(255,255,255,0.08)',
            borderStrong:'rgba(255,255,255,0.18)', text:'#E7E9EE', textDim:'#9AA1AD',
            textFaint:'#5F6672', hover:'#232833', shadow:'0 14px 44px rgba(0,0,0,0.55)',
            scroll:'#3A3F49', blur:'blur(10px)', inputBg:'#10131A',
            btnBg:'rgba(255,255,255,0.05)', nameShadow:'rgba(255,92,122,0.45)'
        };
        var LIGHT = {
            bg:'rgba(255,252,253,0.97)', bg2:'#F1F0F4', border:'rgba(28,22,32,0.10)',
            borderStrong:'rgba(28,22,32,0.22)', text:'#2A2F3A', textDim:'#6B7480',
            textFaint:'#9AA3AF', hover:'#E4E2EA', shadow:'0 14px 40px rgba(60,40,80,0.18)',
            scroll:'#C9CCD3', blur:'blur(14px)', inputBg:'#FFFFFF',
            btnBg:'rgba(28,22,32,0.05)', nameShadow:'rgba(255,92,122,0.35)'
        };
        var ACCENT = '#FF5C7A', ACCENT_RGB = '255,92,122';
        // 默认回退（置于最前）：:root 与 [data-xsact-theme] 特异性相同(0,1,0)，
        // 必须让主题规则靠后、优先生效；属性缺失时才回退到这里。
        var blocks = [':root{' +
            '--xs-accent:' + ACCENT + ';--xs-accent-rgb:' + ACCENT_RGB + ';--xs-accent-soft:rgba(' + ACCENT_RGB + ',0.14);--xs-accent-text:#D6336C;' +
            '--xs-panel-bg:' + LIGHT.bg + ';--xs-panel-bg-2:' + LIGHT.bg2 + ';--xs-border:' + LIGHT.border + ';' +
            '--xs-border-strong:' + LIGHT.borderStrong + ';--xs-text:' + LIGHT.text + ';--xs-text-dim:' + LIGHT.textDim + ';--xs-text-faint:' + LIGHT.textFaint + ';' +
            '--xs-hover:' + LIGHT.hover + ';--xs-shadow:' + LIGHT.shadow + ';--xs-scroll:' + LIGHT.scroll + ';--xs-blur:' + LIGHT.blur + ';' +
            '--xs-input-bg:' + LIGHT.inputBg + ';--xs-btn-bg:' + LIGHT.btnBg + ';--xs-name-shadow:' + LIGHT.nameShadow + ';' +
        '}'];
        THEMES.forEach(function(t) {
            var p = (t.base === 'light') ? LIGHT : DARK;
            var accentText = (t.base === 'light') ? '#D6336C' : '#FFD6DF';
            blocks.push('[data-xsact-theme="' + t.id + '"]{' +
                '--xs-accent:' + ACCENT + ';' +
                '--xs-accent-rgb:' + ACCENT_RGB + ';' +
                '--xs-accent-soft:rgba(' + ACCENT_RGB + ',0.14);' +
                '--xs-accent-text:' + accentText + ';' +
                '--xs-panel-bg:' + p.bg + ';' +
                '--xs-panel-bg-2:' + p.bg2 + ';' +
                '--xs-border:' + p.border + ';' +
                '--xs-border-strong:' + p.borderStrong + ';' +
                '--xs-text:' + p.text + ';' +
                '--xs-text-dim:' + p.textDim + ';' +
                '--xs-text-faint:' + p.textFaint + ';' +
                '--xs-hover:' + p.hover + ';' +
                '--xs-shadow:' + p.shadow + ';' +
                '--xs-scroll:' + p.scroll + ';' +
                '--xs-blur:' + p.blur + ';' +
                '--xs-input-bg:' + p.inputBg + ';' +
                '--xs-btn-bg:' + p.btnBg + ';' +
                '--xs-name-shadow:' + p.nameShadow + ';' +
            '}');
        });
        return blocks.join('\n');
    }

    function injectStyles() {
        // 清理任何残留的旧样式表：历史上多次热注入可能留下了无 id 的 <style>，
        // 把 #xsact-qa-panel 的 background 写死成字面量，盖过本脚本的主题变量，
        // 导致主题切换“看似没反应”。凡含本面板选择器且非本脚本样式表的一律移除。
        try {
            Array.prototype.forEach.call(document.querySelectorAll('style'), function(s) {
                if (s.id !== 'xsact-qa-styles' && s.textContent && s.textContent.indexOf('#xsact-qa-panel') !== -1) {
                    s.parentNode && s.parentNode.removeChild(s);
                }
            });
        } catch (_) {}
        // 已存在则覆盖内容：避免旧版本残留的样式表（只有 dark-rose 等旧主题名）
        // 导致新版 data-xsact-theme="dark/light" 匹配不到规则、主题切换失效。
        var css = document.getElementById('xsact-qa-styles');
        if (!css) {
            css = document.createElement('style');
            css.id = 'xsact-qa-styles';
            document.head.appendChild(css);
        }
        css.textContent = [
            buildThemeVarsCSS(),
            /* 统一图标基样式 */
            '.xsact-ico{display:block;flex-shrink:0;}',

            /* ===== DOM 切换按钮（固定右下角，永远可见） ===== */
            '#xsact-toggle-btn{',
            '  position:fixed;bottom:72px;right:16px;z-index:100000;',
            '  width:44px;height:44px;border-radius:13px;',
            '  background:rgb(var(--xs-accent-rgb) / 0.85);border:2px solid rgb(var(--xs-accent-rgb) / 0.5);',
            '  color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;',
            '  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
            '  box-shadow:0 4px 16px var(--xs-shadow),0 0 8px rgb(var(--xs-accent-rgb) / 0.2);',
            '  transition:all 0.2s ease;outline:none;',
            '}',
            '#xsact-toggle-btn:hover{',
            '  background:rgb(var(--xs-accent-rgb) / 1);border-color:var(--xs-accent);',
            '  box-shadow:0 6px 24px var(--xs-shadow),0 0 16px rgb(var(--xs-accent-rgb) / 0.4);',
            '  transform:scale(1.08);',
            '}',
            '#xsact-toggle-btn.active{',
            '  background:rgba(70,224,160,0.9);border-color:#46E0A0;',
            '  box-shadow:0 4px 16px rgba(70,224,160,0.3),0 0 12px rgba(70,224,160,0.4);',
            '}',
            '#xsact-toggle-btn.active:hover{',
            '  background:#46E0A0;transform:scale(1.08);',
            '}',

            /* ===== 右侧面板（暗色战术操作台） ===== */
            '#xsact-qa-panel{',
            '  position:fixed;top:48px;right:12px;width:300px;height:520px;z-index:90000;',
            '  background:var(--xs-panel-bg);border-radius:14px;',
            '  border:1px solid var(--xs-border);',
            '  display:flex;flex-direction:column;overflow:hidden;',
            '  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
            '  box-shadow:0 14px 44px var(--xs-shadow);',
            '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;',
            '  min-width:220px;min-height:300px;max-width:560px;max-height:86vh;',
            '}',
            '.xsact-qa-panel-inner{display:flex;flex-direction:column;height:100%;}',

            /* 标题栏 = 拖拽手柄 */
            '.xsact-qa-panel-header{',
            '  display:flex;justify-content:space-between;align-items:center;gap:8px;',
            '  padding:11px 12px 9px;border-bottom:1px solid var(--xs-border);',
            '  cursor:grab;user-select:none;-webkit-user-select:none;',
            '}',
            '.xsact-qa-panel-header.dragging{cursor:grabbing;}',
            '.xsact-panel-grip{color:var(--xs-text-faint);display:flex;transition:color .15s;}',
            '.xsact-qa-panel-header.dragging .xsact-panel-grip{color:var(--xs-accent);}',
            '#xsact-panel-title{',
            '  flex:1;min-width:0;font-size:13px;font-weight:600;color:var(--xs-text);',
            '  letter-spacing:0.3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
            '}',
            '.xsact-panel-head-actions{display:flex;gap:5px;flex-shrink:0;}',

            /* 模式切换标签 */
            '.xsact-qa-mode-tabs{',
            '  display:flex;gap:6px;padding:9px 12px 5px;',
            '}',
            '.xsact-mode-tab{',
            '  flex:1;padding:8px 8px;font-size:12px;cursor:pointer;',
            '  background:var(--xs-btn-bg);border:1px solid var(--xs-border);',
            '  border-radius:8px;color:var(--xs-text-dim);transition:all 0.15s ease;',
            '  display:flex;align-items:center;justify-content:center;gap:6px;',
            '}',
            '.xsact-mode-tab .xsact-ico{width:14px;height:14px;stroke-width:2.2px;}',
            '.xsact-mode-tab:hover{color:var(--xs-text);border-color:var(--xs-border-strong);}',
            '.xsact-mode-tab.active{',
            '  background:rgb(var(--xs-accent-rgb) / 0.14);border-color:var(--xs-accent);color:var(--xs-accent-text);font-weight:600;',
            '}',

            /* 类型计数徽标 */
            '.xsact-type-count{',
            '  margin-left:auto;min-width:20px;text-align:center;',
            '  font-size:11px;font-weight:700;color:var(--xs-accent-text);',
            '  background:rgb(var(--xs-accent-rgb) / 0.16);border-radius:9px;padding:1px 7px;',
            '}',

            '.xsact-qa-panel-body{',
            '  flex:1;overflow-y:auto;padding:10px 12px;',
            '  scrollbar-width:thin;scrollbar-color:var(--xs-scroll) transparent;',
            '  display:grid;grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));gap:6px;',
            '  align-content:start;',
            '}',
            '.xsact-qa-empty{',
            '  color:var(--xs-text-faint);text-align:center;padding:42px 14px;font-size:12px;line-height:1.6;grid-column:1 / -1;',
            '}',

            /* 动作按钮 */
            '.xsact-action-btn{',
            '  display:flex;align-items:center;gap:8px;',
            '  width:100%;padding:10px 11px;',
            '  background:var(--xs-panel-bg-2);border:1px solid var(--xs-border);',
            '  border-left:2px solid transparent;',
            '  border-radius:8px;color:var(--xs-text-dim);font-size:12.5px;cursor:pointer;',
            '  transition:background .15s ease,border-color .15s ease,color .15s ease,box-shadow .15s ease;text-align:left;',
            '}',
            '.xsact-action-btn:hover{',
            '  background:var(--xs-hover);border-color:var(--xs-border-strong);color:var(--xs-text);',
            '}', 
            '.xsact-action-btn.sel{',
            '  background:rgb(var(--xs-accent-rgb) / 0.12);border-color:var(--xs-accent);border-left-color:var(--xs-accent);color:var(--xs-accent-text);',
            '}',
            '.xsact-action-btn.fav{',
            '  background:rgba(232,179,57,0.12);border-color:rgba(232,179,57,0.55);border-left-color:#E8B339;color:#FCEBC0;',
            '  box-shadow:0 0 0 1px rgba(232,179,57,0.08) inset,0 0 12px rgba(232,179,57,0.15);',
            '}',
            '.xsact-action-btn.fav:hover{',
            '  background:rgba(232,179,57,0.20);border-color:rgba(232,179,57,0.75);color:#fff;',
            '}',
            '.xsact-action-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.xsact-action-star{color:#E8B339;display:flex;filter:drop-shadow(0 0 4px rgba(232,179,57,0.7));}',

            /* 动作行 + 加入组合按钮 */
            '.xsact-action-row{',
            '  display:flex;align-items:center;gap:6px;min-width:0;',
            '}',
            '.xsact-action-row .xsact-action-btn{flex:1;margin-bottom:0;width:auto;min-width:0;height:100%;}',
            '.xsact-add-to-combo{',
            '  width:30px;height:30px;flex-shrink:0;',
            '  background:rgba(70,224,160,0.12);border:1px solid rgba(70,224,160,0.4);',
            '  border-radius:8px;color:#46E0A0;cursor:pointer;',
            '  display:flex;align-items:center;justify-content:center;transition:all 0.15s ease;',
            '}',
            '.xsact-add-to-combo:hover{background:rgba(70,224,160,0.24);border-color:#46E0A0;color:#CFFAE8;}',

            /* 自定义组合卡片 */
            '.xsact-combo-card{',
            '  grid-column:1 / -1;',
            '  display:flex;justify-content:space-between;align-items:center;',
            '  padding:11px 12px;margin-bottom:7px;',
            '  background:var(--xs-panel-bg-2);border:1px solid var(--xs-border);',
            '  border-radius:9px;color:var(--xs-text-dim);',
            '}',
            '.xsact-combo-info{display:flex;flex-direction:column;gap:2px;min-width:0;}',
            '.xsact-combo-name{font-size:13px;font-weight:600;color:var(--xs-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.xsact-combo-count{font-size:11px;color:var(--xs-text-faint);}',
            '.xsact-combo-btns{display:flex;gap:6px;}',
            '.xsact-combo-btns button{',
            '  width:30px;height:30px;border-radius:7px;cursor:pointer;',
            '  background:var(--xs-btn-bg);border:1px solid var(--xs-border-strong);',
            '  color:var(--xs-text-dim);display:flex;align-items:center;justify-content:center;transition:all 0.15s ease;',
            '}',
            '.xsact-combo-run:hover{background:rgb(var(--xs-accent-rgb) / 0.18);border-color:var(--xs-accent);color:var(--xs-accent-text);}',
            '.xsact-combo-edit:hover{background:rgba(70,224,160,0.16);border-color:#46E0A0;color:#CFFAE8;}',
            '.xsact-combo-delete:hover{background:rgba(255,92,92,0.16);border-color:#FF5C5C;color:#FFB3B3;}',

            '.xsact-combo-new-btn{',
            '  grid-column:1 / -1;',
            '  width:100%;padding:10px;margin-top:7px;',
            '  background:rgb(var(--xs-accent-rgb) / 0.08);border:1px dashed rgb(var(--xs-accent-rgb) / 0.4);',
            '  border-radius:8px;color:var(--xs-accent-text);font-size:12.5px;cursor:pointer;',
            '  display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s ease;',
            '}',
            '.xsact-combo-new-btn:hover{background:rgb(var(--xs-accent-rgb) / 0.16);color:#fff;}',

            /* 预设栏 */
            '.xsact-combo-editor{grid-column:1 / -1;display:flex;flex-direction:column;gap:11px;}',
            '.xsact-combo-field input{',
            '  width:100%;padding:8px 10px;box-sizing:border-box;',
            '  background:var(--xs-input-bg);border:1px solid var(--xs-border-strong);',
            '  border-radius:7px;color:var(--xs-text);font-size:13px;',
            '}',
            '.xsact-combo-field input:focus{outline:none;border-color:var(--xs-accent);}',
            '.xsact-combo-delay label{display:block;font-size:12px;color:var(--xs-text-dim);margin-bottom:6px;}',
            '.xsact-combo-delay #xsact-delay-val{color:var(--xs-accent);font-weight:700;}',
            '.xsact-combo-delay input[type=range]{width:100%;accent-color:var(--xs-accent);height:4px;cursor:pointer;}',
            '.xsact-combo-items{',
            '  display:flex;flex-direction:column;gap:6px;max-height:230px;overflow-y:auto;',
            '  scrollbar-width:thin;scrollbar-color:var(--xs-scroll) transparent;',
            '}',
            '.xsact-combo-item{',
            '  display:flex;align-items:center;gap:7px;padding:8px;',
            '  background:var(--xs-panel-bg-2);border:1px solid var(--xs-border);',
            '  border-radius:7px;font-size:12px;color:var(--xs-text-dim);',
            '}',
            '.xsact-combo-item-num{',
            '  min-width:18px;text-align:center;font-size:10px;font-weight:700;',
            '  color:var(--xs-accent-text);background:rgb(var(--xs-accent-rgb) / 0.16);border-radius:5px;padding:1px 0;',
            '}',
            '.xsact-combo-item-part{',
            '  min-width:42px;color:var(--xs-text-faint);font-weight:500;',
            '}',
            '.xsact-combo-item-action{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.xsact-combo-item button{',
            '  width:24px;height:24px;padding:0;border-radius:6px;cursor:pointer;',
            '  background:var(--xs-btn-bg);border:1px solid var(--xs-border-strong);',
            '  color:var(--xs-text-dim);display:flex;align-items:center;justify-content:center;transition:all 0.15s ease;',
            '}',
            '.xsact-combo-item-up:hover,.xsact-combo-item-down:hover{border-color:var(--xs-accent);color:var(--xs-accent-text);}',
            '.xsact-combo-item-del:hover{border-color:#FF5C5C;color:#FFB3B3;}',
            '.xsact-combo-actions{display:flex;gap:8px;}',
            '.xsact-combo-actions button{flex:1;padding:9px;border-radius:7px;cursor:pointer;font-size:13px;border:none;color:var(--xs-text);}',
            '.xsact-combo-save-btn{background:#46E0A0;color:#fff;}',
            '.xsact-combo-save-btn:hover{background:#2FC989;}',
            '.xsact-combo-cancel-btn{background:var(--xs-border);color:var(--xs-text);}',
            '.xsact-combo-cancel-btn:hover{background:var(--xs-border-strong);}',

            /* 底部操作栏 */
            '.xsact-qa-panel-footer{',
            '  display:flex;align-items:center;gap:7px;padding:11px 12px;border-top:1px solid var(--xs-border);',
            '}',
            '.xsact-qa-mini-btn{',
            '  background:var(--xs-btn-bg);border:1px solid var(--xs-border);',
            '  border-radius:8px;padding:8px 10px;font-size:12px;color:var(--xs-text-dim);cursor:pointer;',
            '  display:flex;align-items:center;justify-content:center;gap:6px;transition:background .15s,border-color .15s,color .15s,box-shadow .15s;',
            '}',
            '.xsact-qa-mini-btn:hover{background:var(--xs-hover);border-color:var(--xs-border-strong);color:var(--xs-text);}',
            '#xsact-refresh-btn,#xsact-exit-panel-btn{padding:0;width:28px;height:28px;}',
            '#xsact-x3-btn{padding:8px 10px;min-width:34px;}',
            '.xsact-toggle-pill{gap:5px;padding:8px 10px;}',
            '.xsact-toggle-pill .xsact-ico{width:14px;height:14px;stroke-width:2.2px;}',
            '.xsact-pill-dot{width:7px;height:7px;border-radius:50%;background:var(--xs-text-faint);border:1px solid var(--xs-border-strong);transition:background .15s,box-shadow .15s,border-color .15s;}',
            '.xsact-qa-mini-btn.on{color:#E8B339;border-color:rgba(232,179,57,0.6);background:rgba(232,179,57,0.12);box-shadow:0 0 10px rgba(232,179,57,0.12);}',
            '.xsact-toggle-pill.on .xsact-pill-dot{background:#E8B339;border-color:#E8B339;box-shadow:0 0 8px rgba(232,179,57,0.7);}',
            '#xsact-fav-btn.on{color:#E8B339;background:rgba(232,179,57,0.12);border-color:rgba(232,179,57,0.6);}',
            '#xsact-fav-btn.on .xsact-pill-dot{background:#E8B339;border-color:#E8B339;}',
            '#xsact-self-btn.on{color:#46E0A0;border-color:rgba(70,224,160,0.6);background:rgba(70,224,160,0.12);}',
            '#xsact-self-btn.on .xsact-pill-dot{background:#46E0A0;border-color:#46E0A0;box-shadow:0 0 8px rgba(70,224,160,0.7);}',
            '#xsact-fav-clear-btn{padding:0;width:28px;height:28px;color:var(--xs-text-dim);}',
            '#xsact-fav-clear-btn:hover{background:rgba(255,92,92,0.12);border-color:rgba(255,92,92,0.5);color:#FFB3B3;}',

            /* 预设栏 */
            '.xsact-qa-panel-body.fav-active .xsact-action-btn:hover{',
            '  border-style:dashed;border-color:rgba(232,179,57,0.7);',
            '}',
            '.xsact-qa-state.presets-bar{grid-column:1 / -1;padding:6px 12px 10px;display:flex;flex-wrap:wrap;gap:4px;}',

            '.xsact-resize-handle{',
            '  position:absolute;right:4px;bottom:4px;width:18px;height:18px;',
            '  display:flex;align-items:flex-end;justify-content:flex-end;',
            '  color:var(--xs-text-faint);cursor:nwse-resize;z-index:10;transition:color .15s;',
            '  pointer-events:auto;',
            '}',
            '.xsact-resize-handle:hover{color:var(--xs-accent);}',
            '.xsact-resize-handle.resizing{color:var(--xs-accent);}',
            '.xsact-resize-handle .xsact-ico{width:14px;height:14px;}',

            /* ===== 浮动身体网格（霓虹线框，按 BC 原生 Zone 定位） ===== */
            '.xsact-body-grid{',
            '  position:absolute;z-index:89999;pointer-events:none;',
            '  background:transparent !important;',
            '}',
            '.xsact-part-btn{',
            '  position:absolute;padding:0;margin:0;',
            '  background:transparent;color:transparent;font-size:0;border:none;',
            '  cursor:pointer;transition:box-shadow 0.12s ease;box-sizing:border-box;',
            '  pointer-events:auto;',
            '  box-shadow:inset 0 0 0 2px rgba(77,248,255,0.55),',
            '             0 0 6px rgba(77,248,255,0.18);',
            '}',
            '.xsact-part-btn:hover{',
            '  box-shadow:inset 0 0 0 3px rgba(77,248,255,1),',
            '             0 0 18px rgba(77,248,255,0.6),0 0 36px rgba(77,248,255,0.2);',
            '}',
            '.xsact-part-btn.active{',
            '  box-shadow:inset 0 0 0 3.5px rgba(255,51,102,1),',
            '             0 0 22px rgba(255,51,102,0.75),0 0 44px rgba(255,51,102,0.35),',
            '             inset 0 0 24px rgba(255,51,102,0.12);',
            '}',
            '.xsact-part-btn.active:hover{',
            '  box-shadow:inset 0 0 0 4.5px #FF3366,',
            '             0 0 30px rgba(255,51,102,1),0 0 60px rgba(255,51,102,0.45);',
            '}',
            '.xsact-grid-name{display:none;}', // 旧名字标签已迁移到独立视口层

            /* 自己模式：给玩家自己的身体线框加个绿色边框提示 */
            '.xsact-body-grid.self .xsact-part-btn{',
            '  box-shadow:inset 0 0 0 2px rgba(70,224,160,0.65),',
            '             0 0 6px rgba(70,224,160,0.25);',
            '}',
            '.xsact-body-grid.self .xsact-part-btn:hover{',
            '  box-shadow:inset 0 0 0 3px rgba(70,224,160,1),',
            '             0 0 18px rgba(70,224,160,0.55),0 0 36px rgba(70,224,160,0.25);',
            '}',
            '.xsact-name-overlay{',
            '  position:absolute;top:0;left:0;transform:translateX(-50%);',
            '  font-size:15px;font-weight:800;color:var(--xs-text);',
            '  background:var(--xs-panel-bg);padding:3px 12px;border-radius:10px;',
            '  transition:background-color .3s ease,border-color .3s ease;',
            '  border:1.5px solid var(--xs-accent);',
            '  text-shadow:0 1px 2px rgb(0 0 0 / 0.45);',
            '  box-shadow:0 0 12px rgb(var(--xs-accent-rgb) / 0.45);',
            '  white-space:nowrap;letter-spacing:1px;',
            '  pointer-events:none;',
            '}',
            '.xsact-name-overlay.self{',
            '  border-color:#46E0A0;',
            '  box-shadow:0 0 12px rgba(70,224,160,0.45);',
            '}',

            /* ===== 滚动条 ===== */
            '.xsact-qa-panel-body::-webkit-scrollbar{width:6px;}',
            '.xsact-qa-panel-body::-webkit-scrollbar-track{background:transparent;}',
            '.xsact-qa-panel-body::-webkit-scrollbar-thumb{background:var(--xs-scroll);border-radius:3px;}',

            /* ===== 主题色切换过渡 ===== */
            '#xsact-qa-panel,#xsact-toggle-btn,.xsact-name-overlay{',
            '  transition:background-color .3s ease,border-color .3s ease,color .3s ease,box-shadow .3s ease;',
            '}',
            '#xsact-qa-panel{animation:xsact-pop-in .28s cubic-bezier(.16,1,.3,1);}',

            /* ===== 过渡动画 ===== */
            '@keyframes xsact-pop-in{from{opacity:0;transform:translateY(-8px) scale(.98);}to{opacity:1;transform:none;}}',
            '@keyframes xsact-fade-in{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}',
            '.xsact-action-btn,.xsact-combo-card{animation:xsact-fade-in .22s ease both;}',

            /* 主题切换按钮图标显隐 */
            '#xsact-theme-btn .xsact-theme-icon{display:none;}',
            '[data-xsact-theme="dark"] #xsact-theme-btn .sun{display:block;}',
            '[data-xsact-theme="light"] #xsact-theme-btn .moon{display:block;}',
        ].join('\n');
        document.head.appendChild(css);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Hook 系统
    // ════════════════════════════════════════════════════════════════════════

    function setupHooks() {
        if (!state.modApi) return;

        // ── Hook: DrawCharacter —— 记录每个角色「真实绘制坐标」(BC-HSC 同款做法) ──
        // DrawCharacter(Character, X, Y, Zoom, ...) 的 X/Y/Zoom 是角色最终画上去的位置，
        // 含 ECHO 贴贴等活动的 X 位移，比 ChatRoomCharacterViewLoopCharacters 更准。
        // 这是线框能精确贴合人物模型的关键。
        try {
            state.modApi.hookFunction('DrawCharacter', 1, function(args, next) {
                var r = next(args);
                try {
                    var C = args[0], X = args[1], Y = args[2], Zoom = args[3];
                    if (C && C.MemberNumber != null && typeof X === 'number' &&
                        typeof CurrentScreen !== 'undefined' && CurrentScreen === 'ChatRoom') {
                        state.charAnchor[C.MemberNumber] = { x: X, y: Y, zoom: Zoom, t: Date.now() };
                    }
                } catch (_) {}
                return r;
            });
        } catch (e) {
            console.warn('[XSAct-QA] DrawCharacter 锚点 hook 失败:', e.message);
        }

        // Hook: DrawProcess — 每帧在主聊天界面确保切换按钮常驻
        state.modApi.hookFunction('DrawProcess', 4, function(args, next) {
            var result = next(args);
            try {
                if (typeof CurrentScreen !== 'undefined') {
                    if (CurrentScreen === 'ChatRoom') {
                        drawToggleButton();
                    } else if (state.toggleBtnEl) {
                        state.toggleBtnEl.style.display = 'none';
                    }
                }
            } catch (_) {}
            return result;
        });

        // 窗口尺寸变化 → 刷新画布矩形缓存
        try {
            window.addEventListener('resize', function() { refreshCanvasCache(); });
        } catch (_) {}

        // Hook: ChatRoomClick — 按钮已改为 DOM 元素，此处仅保留扩展点
        state.modApi.hookFunction('ChatRoomClick', 4, function(args, next) {
            // DOM 按钮(#xsact-toggle-btn) 自行处理点击事件，无需在此拦截
            return next(args);
        });

        // Hook: ActivityRun — 记录每次执行的上下文
        state.modApi.hookFunction('ActivityRun', 0, function(args, next) {
            var actName = args[0];
            var targetChar = args[1];
            if (targetChar && actName) {
                state.lastAction = {
                    name: actName,
                    targetMN: targetChar.MemberNumber,
                    dict: args[2] || {},
                    part: state.selectedPart || '',
                    time: Date.now()
                };
                saveStorage(S_LAST, state.lastAction);
            }
            next(args);
        });

        // Hook: ChatRoomMenuDraw — 动作模式下同步更新浮动网格位置（跟随角色）
        state.modApi.hookFunction('ChatRoomMenuDraw', 0, function(args, next) {
            var result = next(args);
            if (state.isActive) updateGridPositions();
            return result;
        });

        // 全局键盘: Esc 退出
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && state.isActive) {
                e.preventDefault();
                e.stopPropagation();
                toggleActionMode();
            }
        });

        // 定时刷新：检测新进入房间的角色（每 3 秒）
        function startRefreshTimer() {
            stopRefreshTimer();
            // 仅做兜底刷新：每帧 ChatRoomMenuDraw 已调用 updateGridPositions（其内部用
            // state.lastLayoutCount 正确判断人数变化并重建）。这里不能再用自己的
            // bodyGrids.size 与 layout.length 比较来触发 refreshBodyGrids，否则 selfMode
            // 关闭时玩家网格不计入 bodyGrids.size，导致 6 !== 7 永远成立，每 3 秒强制重建
            // 一次、线框瞬间跳动。
            state.refreshInterval = setInterval(function() {
                if (state.isActive) updateGridPositions();
            }, 3000);
        }
        function stopRefreshTimer() {
            if (state.refreshInterval) { clearInterval(state.refreshInterval); state.refreshInterval = null; }
        }

        // Hook ServerSend: 监听房间进出事件
        state.modApi.hookFunction('ServerSend', 0, function(args, next) {
            var data = args[0];
            if (data && (data.Type === 'Action' || data.Type === 'Activity')) {
                setTimeout(function() {
                    if (state.isActive) refreshBodyGrids();
                }, 500);
            }
            return next(args);
        });

        // 将定时器控制绑定到 enter/exit
        var _baseEnter = enterActionMode;
        enterActionMode = function() { _baseEnter(); startRefreshTimer(); };
        var _baseExit = exitActionMode;
        exitActionMode = function() { _baseExit(); stopRefreshTimer(); };
    }

    /** 更新浮动网格位置（跟随角色移动/人数变化） */
    function updateGridPositions() {
        refreshCanvasCache(); // 每帧刷新画布矩形缓存（一次即可）
        var layout = getCharLayout();
        // 如果人数变化，重建
        if (layout.length !== state.lastLayoutCount) {
            state.lastLayoutCount = layout.length;
            refreshBodyGrids();
            return;
        }
        var shifts = computeOverlapShifts(layout);
        layout.forEach(function(entry) {
            entry.overlapShift = shifts.get(entry.char.MemberNumber) || 0;
            var grid = state.bodyGrids.get(entry.char);
            if (grid) positionGrid(grid, entry);
            if (state.showNames && !state.nameOverlays.has(entry.char)) createNameOverlay(entry);
            var overlay = state.nameOverlays.get(entry.char);
            if (overlay) positionNameOverlay(overlay, entry);
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 设置页面注册
    // ════════════════════════════════════════════════════════════════════════

    function registerSettings() {
        if (typeof PreferenceRegisterExtensionSetting === 'undefined') return;
        PreferenceRegisterExtensionSetting({
            Identifier: 'XSAct_QA',
            ButtonText: '快速动作',
            Image: 'Icons/End.png',
            load: function() {},
            run: function() {
                // 显示设置子页
                DrawText('快速动作 操作台', 1800, 150, 'Black', 'Gray');
                var enabled = !!loadSetting(S_ENABLED, false);
                DrawButton(1815, 190, 380, 30, enabled ? '已开启 (点击关闭)' : '默认开启', '#White', '', () => {
                    if (state.isActive) exitActionMode();
                    else enterActionMode();
                }, '', '', enabled);
                DrawButton(1815, 230, 90, 90, '', '#White', 'Icons/Exit.png', T.back);
                if (MouseIn(1815, 230, 90, 90)) PreferenceExit();
            },
            click: function() {},
            unload: function() {},
            exit: function() {}
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 初始化入口
    // ════════════════════════════════════════════════════════════════════════

    async function main() {
        logD('v' + VERSION + ' 初始化...');

        // Phase 1: 等 bcModSdk
        await waitFor(function() { return typeof bcModSdk !== 'undefined'; });

        // 注册 mod（允许重复注册时复用）
        try {
            state.modApi = bcModSdk.registerMod({
                name: '快捷互动',
                fullName: 'Quick Action Launcher',
                version: VERSION,
                repository: '统一动作操作台'
            });
            logD('state.modApi 注册完成');
        } catch (regErr) {
            // 已注册过（热重注入场景）：尝试从已有 mods 中取回
            console.warn('[XSAct-QA] registerMod 异常（可能已注册）:', regErr.message);
            try {
                var mods = bcModSdk.getModsInfo ? bcModSdk.getModsInfo() : [];
                for (var mi = 0; mi < mods.length; mi++) {
                    if (mods[mi].name === '快捷互动') { state.modApi = mods[mi]; break; }
                }
            } catch (_) {}
            if (!state.modApi) state.modApi = {}; // 降级：无 state.modApi 但继续运行
        }

        // Phase 2: 等玩家登入
        await waitFor(function() {
            try { return Player && typeof Player.MemberNumber === 'number'; }
            catch (_) { return false; }
        });
        logD('玩家已登入:', Player.AccountName || Player.Name);

        // 加载存储
        try { state.isActive = loadSetting(S_ENABLED, false); } catch (_) {}
        try { state.selfModeActive = loadSetting(S_SELF, false); } catch (_) {}
        try { state.favorites = loadSetting(S_FAVS, []); } catch (_) {}
        try { state.presets = loadSetting(S_PRESETS, []); } catch (_) {}
        try { state.lastAction = loadStorage(S_LAST, null); } catch (_) {}
        try { state.combos = loadSetting(S_COMBOS, []); } catch (_) {}
        try { state.showNames = loadSetting(S_SHOW_NAMES, false); } catch (_) {}

        // 恢复主题设置（优先读游戏账号，回退本地）
        try { state.theme = loadSetting(S_THEME, 'dark'); } catch (_) {}
        try { applyTheme(state.theme); } catch (_) {}

        // 注入样式
        try { injectStyles(); } catch (e) { console.warn('[XSAct-QA] injectStyles 失败:', e); }

        // 注册设置
        try { registerSettings(); } catch (e) { console.warn('[XSAct-QA] registerSettings 失败:', e); }

        // 安装 hooks
        try { setupHooks(); } catch (e) { console.error('[XSAct-QA] setupHooks 失败:', e); }

        // 若设置默认开启，且当前在聊天室，自动进入动作模式
        if (state.isActive && typeof CurrentScreen !== 'undefined' && CurrentScreen === 'ChatRoom') {
            try { enterActionMode(); } catch (e) { console.warn('[XSAct-QA] 自动进入动作模式失败:', e); }
        }

        // 聊天室内确保浮动开关（闪电图标）常驻可见；用轮询守卫，离开/回到聊天室都能正确恢复
        if (typeof CurrentScreen !== 'undefined') {
            try { startVisibilityGuard(); guardToggleVisibility(); } catch (e) { console.warn('[XSAct-QA] 启动浮动开关守卫失败:', e); }
        }

        // 暴露调试/控制接口（无论前面是否出错，必须暴露）
        window.__XSActQA = {
            toggle: toggleActionMode,
            enter: enterActionMode,
            exit: exitActionMode,
            getLayout: getCharLayout,
            refreshGrids: refreshBodyGrids,
            selectPart: selectTargetAndPart,
            setMode: setPanelMode,
            getCombos: function() { return state.combos.slice(); },
            addCombo: addCombo,
            deleteCombo: deleteCombo,
            addComboItem: addComboItem,
            removeComboItem: removeComboItem,
            startEditCombo: startEditCombo,
            stopEditCombo: stopEditCombo,
            runCombo: runComboOnTarget,
            runComboAll: runComboAll,
            isActive: function() { return state.isActive; },
            get panelMode() { return state.panelMode; },
            get allModeActive() { return state.allModeActive; },
            get favModeActive() { return state.favModeActive; },
            get selfModeActive() { return state.selfModeActive; },
            toggleAllMode: toggleAllMode,
            toggleFavMode: toggleFavMode,
            toggleSelfMode: toggleSelfMode,
            clearAllFavorites: clearAllFavorites,
            // ── 主题切换 ──
            toggleTheme: toggleTheme,
            setTheme: function(id) { applyTheme(id); persist(S_THEME, id); return state.theme; },
            getTheme: function() { return state.theme; },
            get editingComboId() { return state.editingComboId; },
            get selectedTarget() { return state.selectedTarget; },
            get selectedPart() { return state.selectedPart; },
            makeActivityPacket: makeActivityPacket,
            findBestItemForActivityAsset: findBestItemForActivityAsset,
            version: VERSION
        };

        logD('✅ 初始化完成 · 版本 ' + VERSION);
    }

    // 启动
    main().catch(function(err) {
        console.error('[XSAct-QA] 初始化失败:', err);
    });

})();

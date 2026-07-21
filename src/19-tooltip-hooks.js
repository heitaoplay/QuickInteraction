    function initTooltip() {
        if (window.__xsactTooltipReady) return;
        window.__xsactTooltipReady = true;

        var tip = document.createElement('div');
        tip.className = 'xsact-tooltip';
        tip.setAttribute('role', 'tooltip');
        tip.style.visibility = 'hidden';
        document.body.appendChild(tip);

        var currentEl = null;
        var showTimer = null;
        var SHOW_DELAY = 120;

        function isPluginTip(el) {
            return !!(el && el.closest && el.closest('#xsact-qa-panel, #xsact-toggle-btn, .xsact-update-banner'));
        }
        function getText(el) {
            var dt = el.getAttribute('data-tooltip');
            if (dt && dt.trim()) return dt;
            var t = el.getAttribute('title');
            return (t && t.trim()) ? t : '';
        }
        function render(el) {
            var raw = getText(el);
            if (!raw) { tip.innerHTML = ''; return; }
            var type = el.getAttribute('data-tooltip-type');
            tip.className = 'xsact-tooltip' + (type ? ' is-' + type : '');
            var parts = raw.split('@@');
            var html = '<span class="xsact-tt-title">' + escapeHtml(parts[0]) + '</span>';
            if (parts[1]) html += '<span class="xsact-tt-sub">' + escapeHtml(parts[1]) + '</span>';
            tip.innerHTML = html;
        }
        function position(el) {
            var r = el.getBoundingClientRect();
            var tr = tip.getBoundingClientRect();
            var gap = 8;
            var top = r.top - tr.height - gap;
            var left = r.left + r.width / 2 - tr.width / 2;
            if (top < 4) top = r.bottom + gap;
            if (left < 4) left = 4;
            if (left + tr.width > window.innerWidth - 4) left = window.innerWidth - tr.width - 4;
            if (top + tr.height > window.innerHeight - 4) top = window.innerHeight - tr.height - 4;
            tip.style.top = top + 'px';
            tip.style.left = left + 'px';
        }
        function show(el) {
            if (!isPluginTip(el)) return;
            var raw = getText(el);
            if (!raw) return;
            render(el); // 必须在抑制 title 之前渲染，否则 getText 会读到被清空的 title
            // 用空格占位抑制原生 title（属性仍存在于 DOM，closest 继续匹配；外部读取不受影响）
            if (el.getAttribute('title') && el.getAttribute('title').trim() !== '') {
                el.__xsTitle = el.getAttribute('title');
                el.setAttribute('title', ' ');
            }
            position(el);
            tip.style.visibility = 'visible';
            void tip.offsetWidth; // 强制 reflow 以触发过渡
            tip.classList.add('show');
            currentEl = el;
        }
        function hide() {
            if (showTimer) { clearTimeout(showTimer); showTimer = null; }
            tip.classList.remove('show');
            tip.style.visibility = 'hidden';
            if (currentEl && currentEl.__xsTitle != null) {
                // 仅当逻辑未在 hover 期间改写过 title 时才还原，避免覆盖动态更新
                if (!currentEl.getAttribute('title') || currentEl.getAttribute('title').trim() === '') {
                    currentEl.setAttribute('title', currentEl.__xsTitle);
                }
                currentEl.__xsTitle = null;
            }
            currentEl = null;
        }
        document.addEventListener('mouseover', function(e) {
            if (!e.target || !e.target.closest) return;
            var el = e.target.closest('[data-tooltip],[title]');
            if (el && isPluginTip(el)) {
                if (showTimer) { clearTimeout(showTimer); showTimer = null; }
                if (el !== currentEl) {
                    if (currentEl) hide();
                    showTimer = setTimeout(function() { show(el); }, SHOW_DELAY);
                }
            } else if (currentEl) {
                hide();
            }
        });
        document.addEventListener('mouseout', function(e) {
            if (showTimer) { clearTimeout(showTimer); showTimer = null; }
            var to = e.relatedTarget;
            if (!to || !to.closest) { hide(); return; }
            var el = to.closest('[data-tooltip],[title]');
            if (!el || !isPluginTip(el)) hide();
        });
        window.addEventListener('scroll', function() { if (currentEl) hide(); }, true);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Hook 系统
    // ════════════════════════════════════════════════════════════════════════

    function setupHooks() {
        if (!state.modApi) return;

        // ── Hook: ActivityAllowedForGroup —— 屏蔽 echo 端已导入的同名原始动作 ──
        // 用户把 echo 动作导入到本插件后，会生成 XSQAct_ 前缀的新 Activity。
        // 这里把 echo 原始 Activity（Name 在 echoSuppressed 集合中）过滤掉，
        // 确保插件动作列表和 BC 原生动作列表都不出现重复项。
        try {
            state.modApi.hookFunction('ActivityAllowedForGroup', 0, function(args, next) {
                var result = next(args);
                if (!state.echoSuppressed || state.echoSuppressed.size === 0 || !Array.isArray(result)) return result;
                return result.filter(function(item) {
                    var nm = (item && item.Activity && item.Activity.Name) || (item && item.Name);
                    return !caIsEchoSuppressed(nm);
                });
            });
        } catch (e) {
            console.warn('[XSAct-QA] ActivityAllowedForGroup hook 失败:', e.message);
        }

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
                } catch (e) { reportHookError('DrawCharacter锚点', e); }
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
            } catch (e) { reportHookError('DrawProcess', e); }
            return result;
        });

        // 窗口尺寸变化 → 刷新画布矩形缓存
        try {
            window.addEventListener('resize', function() { refreshCanvasCache(); });
        } catch (_) { /* 忽略：注册 resize 监听失败无影响 */ }

        // Hook: ChatRoomClick — 按钮已改为 DOM 元素，此处仅保留扩展点
        state.modApi.hookFunction('ChatRoomClick', 4, function(args, next) {
            // DOM 按钮(#xsact-toggle-btn) 自行处理点击事件，无需在此拦截
            return next(args);
        });

        // Hook: ActivityRun — 记录每次执行的上下文
        state.modApi.hookFunction('ActivityRun', 0, function(args, next) {
            try {
                var sourceChar = args[0];
                var targetChar = args[1];
                var group = args[2];
                var itemActivity = args[3] || {};
                var actName = (itemActivity.Activity && itemActivity.Activity.Name) || '';
                if (targetChar && actName) {
                    state.lastAction = {
                        name: actName,
                        targetMN: targetChar.MemberNumber,
                        part: (group && group.Name) || state.selectedPart || '',
                        time: Date.now()
                    };
                    saveStorage(S_LAST, state.lastAction);
                }
            } catch (e) { console.warn('[XSAct-QA] ActivityRun hook 记录失败:', e.message); }
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
                // 兜底：绘制异常绝不能再冒泡杀掉 BC 主渲染循环（曾导致进入子页后整页卡死）。
                try {
                    DrawText('快速动作 操作台', 1800, 150, 'Black', 'Gray');
                    var enabled = !!loadSetting(S_ENABLED, false);
                    // 注意 DrawButton 签名：X,Y,W,H,Text,Color,Image,Tooltip,Callback
                    // 点击回调必须放在第 9 个参数（之前错放在 Tooltip 位导致切换按钮完全无效）
                    DrawButton(1815, 190, 380, 30, enabled ? '已开启 (点击关闭)' : '默认开启', '#White', '', '', function() {
                        if (state.isActive) exitActionMode();
                        else enterActionMode();
                    });
                    // 返回按钮：回调 = PreferenceExit（由 BC 在真正点击时触发，不再依赖每帧 MouseIn 探测）
                    DrawButton(1815, 230, 90, 90, '', '#White', 'Icons/Exit.png', (typeof T !== 'undefined' && T.Back) ? T.Back : '返回', PreferenceExit);
                } catch (e) {
                    console.error('[XSAct-QA] 扩展设置子页绘制异常（已隔离，不影响游戏）:', e && e.message);
                }
            },
            click: function() {},
            unload: function() {},
            exit: function() {}
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 更新 / 公告检测（脚本内 5 分钟轮询，玩家端收得到，无需刷新页面）
    // ════════════════════════════════════════════════════════════════════════


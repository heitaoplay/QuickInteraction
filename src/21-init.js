    /* ===== 15. 启动与初始化 ===== */
    async function main() {
        logD('v' + VERSION + ' 初始化...');

        // 热重注入（CDP 反复注入测试）场景：若上一轮实例仍挂在 window.__XSActQA，
        // 先卸载其 bcModSdk 注册，避免 "it is already loaded" 导致本次 registerMod 失败、
        // 进而 setupHooks 拿不到 modApi（降级成空对象）→ 面板/动作列表无法渲染。
        try {
            if (window.__XSActQA && window.__XSActQA.state && window.__XSActQA.state.modApi &&
                typeof window.__XSActQA.state.modApi.unload === 'function') {
                window.__XSActQA.state.modApi.unload();
            }
        } catch (_) { /* 卸载旧实例失败不阻塞本次启动 */ }

        // Phase 1: 等 bcModSdk
        await waitFor(function() { return typeof bcModSdk !== 'undefined'; });

        // 注册 mod（允许重复注册时复用）
        try {
            state.modApi = bcModSdk.registerMod({
                name: '快捷互动',
                fullName: 'Quick Action Launcher',
                version: VERSION,
                repository: '统一动作操作台'
            }, { allowReplace: true }); // allowReplace：支持 CDP 反复注入测试时干净替换旧实例
            logD('state.modApi 注册完成');
        } catch (regErr) {
            // 已注册过（热重注入场景）：尝试从已有 mods 中取回
            console.warn('[XSAct-QA] registerMod 异常（可能已注册）:', regErr.message);
            try {
                var mods = bcModSdk.getModsInfo ? bcModSdk.getModsInfo() : [];
                for (var mi = 0; mi < mods.length; mi++) {
                    if (mods[mi].name === '快捷互动') { state.modApi = mods[mi]; break; }
                }
            } catch (_) { /* 忽略：取回已注册 mod 失败则降级为空对象继续运行 */ }
            if (!state.modApi) state.modApi = {}; // 降级：无 state.modApi 但继续运行
        }

        // Phase 2: 等玩家登入
        await waitFor(function() {
            try { return Player && typeof Player.MemberNumber === 'number'; }
            catch (_) { return false; }
        });
        logD('玩家已登入:', Player.AccountName || Player.Name);

        // 修补 ActivityDictionaryText（LSCG 等 mod 文本解析兜底，详见 patchActivityDictionaryText 注释）
        try { patchActivityDictionaryText(); } catch (e) { console.warn('[XSAct-QA] patchActivityDictionaryText 失败:', e); }

        // 加载存储
        state.isActive = loadSetting(S_ENABLED, false);
        state.selfModeActive = loadSetting(S_SELF, false);
        state.favorites = loadSetting(S_FAVS, []);
        migrateFavorites(); // 旧版纯动作名 → 部位复合键（一次性迁移）
        state.presets = loadSetting(S_PRESETS, []);
        state.lastAction = loadStorage(S_LAST, null);
        state.combos = loadSetting(S_COMBOS, []);
        loadCustomActions();
        registerAllCustomActions(); // 重新注册已存自定义动作到 BC，使本会话内可执行

        // 恢复主题设置（优先读游戏账号，回退本地）
        state.theme = loadSetting(S_THEME, 'dark');
        applyTheme(state.theme);

        // 注入样式
        try { injectStyles(); } catch (e) { console.warn('[XSAct-QA] injectStyles 失败:', e); }

        // 自定义 tooltip（替换原生 title，仅作用于本插件 UI）
        try { initTooltip(); } catch (e) { console.warn('[XSAct-QA] initTooltip 失败:', e); }

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

        // 启动更新/公告检测（脚本内 5 分钟轮询，玩家端收到，无需刷新页面）
        try { startUpdateChecker(); } catch (e) { console.warn('[XSAct-QA] 启动更新检测失败:', e); }

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
            get favorites() { return state.favorites.slice(); },
            favKey: function(partGroup, name) { return partGroup + '|' + name; },
            // ── 自定义动作 / echo 屏蔽调试 ──
            state: state,
            getCustomActions: function() { return state.customActions.slice(); },
            getEchoData: caGetEchoData,
            getEchoSuppressed: function() { return Array.from(state.echoSuppressed); },
            importFromEcho: importCustomFromEcho,
            rebuildEchoSuppressed: rebuildEchoSuppressed,
            removeSuppressedEchoActivities: caRemoveSuppressedEchoActivities,
            cleanupEchoData: caCleanupEchoData,
            upsertCustom: upsertCustom,
            deleteCustom: deleteCustom,
            caHash: caHash,
            caActivityName: caActivityName,
            caFindByActivityName: caFindByActivityName,
            caBuildActivityDef: caBuildActivityDef,
            caDetectSource: caDetectSource,
            updateActionPanel: updateActionPanel,
            getActionsForPart: getActionsForPart,
            isEchoSuppressed: caIsEchoSuppressed,
            // ── 主题切换 ──
            toggleTheme: toggleTheme,
            setTheme: function(id) { applyTheme(id); persist(S_THEME, id); return state.theme; },
            getTheme: function() { return state.theme; },
            get editingComboId() { return state.editingComboId; },
            get selectedTarget() { return state.selectedTarget; },
            get selectedPart() { return state.selectedPart; },
            makeActivityPacket: makeActivityPacket,
            findBestItemForActivityAsset: findBestItemForActivityAsset,
            version: VERSION,
            // ── 更新 / 公告 ──
            checkUpdate: checkUpdate,
            showUpdateBanner: showUpdateBanner,
            showAnnounceBanner: showAnnounceBanner,
            hideUpdateBanner: hideUpdateBanner
        };

        logD('✅ 初始化完成 · 版本 ' + VERSION);
    }

    // 启动
    main().catch(function(err) {
        console.error('[XSAct-QA] 初始化失败:', err);
    });

})();

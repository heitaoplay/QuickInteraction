    /* ===== 7. 模式切换（全员 / 收藏 / 自己） ===== */
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
    function toggleFavoriteAction(partGroup, name, btn) {
        var key = partGroup + '|' + name;
        var idx = state.favorites.indexOf(key);
        if (idx === -1) {
            state.favorites.push(key);
            toast('已收藏：' + getActivityLabel(name, partGroup), '#E8B339');
        } else {
            state.favorites.splice(idx, 1);
            toast('取消收藏', '#888');
        }
        persist(S_FAVS, state.favorites);
        if (btn) {
            var added = idx === -1;
            btn.classList.toggle('fav', added);
            var star = btn.querySelector('.xsact-action-star');
            if (added) {
                if (!star) {
                    star = document.createElement('span');
                    star.className = 'xsact-action-star';
                    star.innerHTML = svgIcon('starFill', 13);
                    btn.appendChild(star);
                }
            } else if (star) {
                star.remove();
            }
        } else if (state.selectedTarget && state.selectedPart && state.panelMode === 'part') {
            updateActionPanel(state.selectedTarget, state.selectedPart);
        }
    }

    /** 切换自己模式 */
    function toggleSelfMode() {
        state.selfModeActive = !state.selfModeActive;
        persist(S_SELF, state.selfModeActive);
        updateSelfButtonVisual();
        if (state.isActive) refreshBodyGrids();
        toast(state.selfModeActive ? '自己模式：开启' : '自己模式：关闭',
              state.selfModeActive ? '#46E0A0' : '#888');
    }
    function updateSelfButtonVisual() {
        if (!state.actionPanelEl) return;
        var btn = state.actionPanelEl.querySelector('#xsact-self-btn');
        if (btn) btn.classList.toggle('on', state.selfModeActive);
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
    /* ===== 8. 提示与反馈 ===== */
    function toast(msg, color) {
        color = color || '#FF5C7A';
        try {
            if (window.Liko && window.Liko.__Sys_Toast__) {
                window.Liko.__Sys_Toast__(msg, 2000, color);
                return;
            }
        } catch (_) { /* 忽略：Liko toast 不可用时下方 DOM 兜底仍执行 */ }
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

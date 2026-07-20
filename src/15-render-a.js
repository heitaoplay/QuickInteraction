    /* ===== 14. 面板渲染与模式 ===== */
    function renderPanel() {
        if (!state.actionPanelEl) return;
        var listEl = state.actionPanelEl.querySelector('#xsact-action-list');
        var titleEl = state.actionPanelEl.querySelector('#xsact-panel-title');
        if (listEl) {
            listEl.classList.toggle('xsact-custom-mode', state.panelMode === 'custom');
            listEl.classList.toggle('xsact-combo-mode', state.panelMode === 'combo');
        }
        updateAllButtonVisual();
        updateFavButtonVisual();

        // 「我的动作」「组合动作」可独立展开，无需先选中人物或身体部位
        if (state.panelMode === 'custom') {
            updateCustomActionPanel(state.selectedTarget);   // charObj 可能为 null
            return;
        }
        if (state.panelMode === 'combo') {
            updateComboPanel(state.selectedTarget);          // charObj 可能为 null
            return;
        }

        // 「动作」模式：必须先选中人物与身体部位
        if (!state.selectedTarget) {
            if (titleEl) titleEl.textContent = '选择动作...';
            if (listEl) listEl.innerHTML = '<div class="xsact-qa-empty">点击左侧 ◀ 按钮选择人物和部位</div>';
            return;
        }
        if (!state.selectedPart) {
            if (titleEl) titleEl.textContent = (characterDisplayName(state.selectedTarget) || '?') + ' → 选择部位';
            if (listEl) listEl.innerHTML = '<div class="xsact-qa-empty">请在左侧人物浮层选择身体部位</div>';
            return;
        }
        updateActionPanel(state.selectedTarget, state.selectedPart);
    }

    /** 切换面板模式（部位 / 自定义组合） */
    function setPanelMode(mode) {
        if (!/^(part|combo|custom)$/.test(mode)) return;
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
        if (!state.actionPanelEl) { toast('请先开启动作模式', '#888'); return; }
        if (state.panelMode === 'custom') {
            updateCustomActionPanel(state.selectedTarget);
            toast('我的动作列表已刷新', '#FF5C7A');
        } else if (state.panelMode === 'combo') {
            // 重新从存储加载组合，并刷新视图
            state.combos = loadSetting(S_COMBOS, []);
            updateComboPanel(state.selectedTarget);
            toast('组合列表已刷新', '#FF5C7A');
        } else {
            // 「动作」模式才需要选中人物 + 部位
            if (!state.selectedTarget || !state.selectedPart) { toast('请先选择一个人物部位', '#888'); return; }
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
                        '<button class="xsact-combo-item-del" title="删除" data-tooltip-type="danger">' + svgIcon('close', 13) + '</button>' +
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
        titleEl.textContent = (charObj ? characterDisplayName(charObj) + ' → ' : '') + '组合动作';
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
                    '<button class="xsact-combo-delete" title="删除" data-tooltip-type="danger">' + svgIcon('trash', 14) + '</button>' +
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
                if (state.allModeActive) { runComboAll(c); return; }
                if (!charObj) { toast('请先在左侧选择人物', '#FF5C5C'); return; }
                runComboOnTarget(charObj, c);
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


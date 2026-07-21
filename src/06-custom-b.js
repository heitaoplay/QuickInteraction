    function updateCustomActionPanel(charObj) {
        if (!state.actionPanelEl) return;
        var titleEl = state.actionPanelEl.querySelector('#xsact-panel-title');
        var listEl = state.actionPanelEl.querySelector('#xsact-action-list');
        if (!titleEl || !listEl) return;
        var allBtn = state.actionPanelEl.querySelector('#xsact-all-btn');
        if (allBtn) allBtn.disabled = true; // 自定义动作语义明确，不支持全员广播

        if (state.editingCustomId) {
            var act = getCustom(state.editingCustomId);
            if (!act) { state.editingCustomId = null; updateCustomActionPanel(charObj); return; }
            renderCustomEditor(act, charObj, listEl, titleEl);
            return;
        }

        // ── 列表视图 ──
        titleEl.textContent = (charObj ? characterDisplayName(charObj) + ' → ' : '') + '我的动作（测试版）';
        var html = '';
        var acts = state.customActions;
        var editMode = state.caEditMode;
        var selSet = {};
        (state.caSelected || []).forEach(function(id){ selSet[id] = true; });
        var allOn = acts.length > 0 && acts.every(function(a){ return a.visible !== false; });

        html += '<div class="xsact-ca-view">';
        // 工具栏
        html += '<div class="xsact-ca-toolbar">' +
            '<input type="text" id="xsact-ca-search" class="xsact-ca-search' + (editMode ? ' is-hidden' : '') + '" placeholder="搜索动作...">' +
            '<div class="xsact-ca-toolbar-btns">' +
            '<button class="xsact-ca-new" id="xsact-ca-new" title="新建">' + svgIcon('plus', 14) + '<span>新建</span></button>' +
            '<div class="xsact-ca-import-wrap">' +
            '<button class="xsact-ca-import" id="xsact-ca-import" title="导入" data-tooltip="导入@@从 echo/回声 或本地 JSON 导入自定义动作">' + svgIcon('download', 14) + '</button>' +
            '<div class="xsact-ca-import-menu hidden" id="xsact-ca-import-menu">' +
            '<button data-import="echo">从 echo/回声 导入</button>' +
            '<button data-import="file">从本地 JSON 导入</button>' +
            '</div>' +
            '<input type="file" id="xsact-ca-file-input" class="xsact-ca-file-input" accept="application/json,.json">' +
            '</div>' +
            '<button class="xsact-ca-export" id="xsact-ca-export" title="导出为 JSON">' + svgIcon('upload', 14) + '</button>' +
            '<button class="xsact-ca-editmode' + (editMode ? ' is-active' : '') + '" id="xsact-ca-editmode" title="' + (editMode ? '完成编辑' : '编辑模式：拖动排序与批量管理') + '">' + svgIcon('bulkEdit', 16) + '</button>' +
            '<button class="xsact-ca-toggleall' + (allOn ? ' is-on' : '') + '" id="xsact-ca-toggleall" title="' + (allOn ? '当前全部开启，点击全部关闭' : '当前全部关闭，点击全部开启') + '">' + svgIcon(allOn ? 'toggleOn' : 'toggleOff', 16) + '</button>' +
            '</div></div>';

        // 编辑模式批量栏
        if (editMode) {
            html += '<div class="xsact-ca-batchbar" id="xsact-ca-batchbar">' +
                '<button class="xsact-ca-select-all" id="xsact-ca-select-all">全选</button>' +
                '<span class="xsact-ca-selected-count" id="xsact-ca-selected-count">已选 0 个</span>' +
                '<div class="xsact-ca-batch-actions">' +
                '<button id="xsact-ca-batch-close" disabled>批量关闭</button>' +
                '<button id="xsact-ca-batch-delete" class="xsact-ca-batch-del" disabled>批量删除</button>' +
                '</div></div>';
        }

        html += '<div class="xsact-ca-beta">自定义动作功能当前为【测试版(Beta)】，仍在开发中，可能存在不稳定或未完善之处，建议谨慎使用并及时反馈问题。</div>';

        // 迁移提示：原 echo/回声 中仍有动作数据 → 提供一键清理入口
        try {
            var _echoData = caGetEchoData();
            var _hasEchoSrc = state.customActions.some(function(a) { return a.source === 'echo'; });
            if (_echoData && Object.keys(_echoData).length && _hasEchoSrc) {
                html += '<div class="xsact-ca-echo-clean" id="xsact-ca-echo-clean">' +
                    '<div class="xsact-ca-echo-clean-text">检测到原 echo/回声 中仍有 <b>' + Object.keys(_echoData).length + '</b> 个自定义动作数据。迁移完成后建议清理，避免动作重复显示与使用后乱码。</div>' +
                    '<button class="xsact-ca-echo-clean-btn" id="xsact-ca-echo-clean-btn" type="button">清理原 echo 数据</button>' +
                '</div>';
            }
        } catch (e) {}

        if (!acts.length) {
            html += '<div class="xsact-qa-empty xsact-ca-empty">还没有自定义动作。点「新建」创建，或点「导入」从 echo/回声 迁移。</div>';
        } else {
            html += '<div class="xsact-ca-list' + (editMode ? ' is-editing' : '') + '">';
            acts.forEach(function(a) {
                var scopeBadge = a.scope === 'self' ? '<span class="xsact-ca-badge self">仅自己</span>'
                    : a.scope === 'other' ? '<span class="xsact-ca-badge other">仅他人</span>'
                    : '<span class="xsact-ca-badge any">皆可</span>';
                var sourceBadge = a.source === 'echo' ? '<span class="xsact-ca-src echo" title="来自 echo/回声 导入">echo</span>' : '<span class="xsact-ca-src native" title="本插件创建">QiAct</span>';
                var partLbl = (BODY_PARTS.find(function(p) { return p.group === a.group; }) || {}).label || a.group;
                var isVisible = a.visible !== false;
                var isSel = !!selSet[a.id];
                if (editMode) {
                    html += '<div class="xsact-ca-card is-edit' + (isSel ? ' is-selected' : '') + (isVisible ? '' : ' is-hidden') + '" data-id="' + a.id + '" draggable="true">' +
                        '<span class="xsact-ca-handle" title="拖动排序">' + svgIcon('grip', 14) + '</span>' +
                        '<div class="xsact-ca-info">' +
                            '<div class="xsact-ca-title">' +
                                '<span class="xsact-ca-name">' + escapeHtml(a.name) + '</span>' +
                                scopeBadge + sourceBadge +
                            '</div>' +
                            '<div class="xsact-ca-meta">' +
                                '<span class="xsact-ca-part">' + escapeHtml(partLbl) + '</span>' +
                                '<span class="xsact-ca-vis-dot ' + (isVisible ? 'on' : 'off') + '">' + (isVisible ? '显示中' : '已隐藏') + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<span class="xsact-ca-check" aria-hidden="true">' + svgIcon('check', 14) + '</span>' +
                    '</div>';
                } else {
                    html += '<div class="xsact-ca-card' + (isVisible ? '' : ' is-hidden') + '" data-id="' + a.id + '">' +
                        '<div class="xsact-ca-info">' +
                            '<div class="xsact-ca-title">' +
                                '<span class="xsact-ca-name">' + escapeHtml(a.name) + '</span>' +
                                scopeBadge + sourceBadge +
                            '</div>' +
                            '<div class="xsact-ca-meta">' +
                                '<label class="xsact-ca-toggle" title="在「动作」面板和 BC 原生动作列表中显示">' +
                                    '<input type="checkbox" class="xsact-ca-visible" data-id="' + a.id + '"' + (isVisible ? ' checked' : '') + '>' +
                                    '<span class="xsact-ca-toggle-track"></span>' +
                                    '<span class="xsact-ca-toggle-label">' + (isVisible ? '显示' : '隐藏') + '</span>' +
                                '</label>' +
                                '<span class="xsact-ca-part">' + escapeHtml(partLbl) + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="xsact-ca-btns">' +
                            '<button class="xsact-ca-run" title="对当前目标执行" data-id="' + a.id + '">' + svgIcon('play', 14) + '</button>' +
                            '<button class="xsact-ca-edit" title="编辑" data-id="' + a.id + '">' + svgIcon('pencil', 14) + '</button>' +
                            '<button class="xsact-ca-delete" title="删除" data-tooltip-type="danger" data-id="' + a.id + '">' + svgIcon('trash', 14) + '</button>' +
                        '</div>' +
                    '</div>';
                }
            });
            html += '</div>';
        }
        html += '</div>';
        listEl.innerHTML = html;

        var newBtn = listEl.querySelector('#xsact-ca-new');
        if (newBtn) newBtn.addEventListener('click', function() {
            state.editingCustomId = caNewId();
            var draft = { id: state.editingCustomId, name: '', scope: 'other', group: 'ItemMouth', dialog: '', dialogSelf: '', createdAt: Date.now(), source: 'native', visible: true };
            renderCustomEditor(draft, charObj, listEl, titleEl);
        });
        var importBtn = listEl.querySelector('#xsact-ca-import');
        var importMenu = listEl.querySelector('#xsact-ca-import-menu');
        if (importBtn && importMenu) {
            importBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                importMenu.classList.toggle('hidden');
            });
            importMenu.querySelectorAll('button').forEach(function(mb) {
                mb.addEventListener('click', function(e) {
                    e.stopPropagation();
                    importMenu.classList.add('hidden');
                    var mode = mb.dataset.import;
                    if (mode === 'echo') { importCustomFromEcho(); }
                    else if (mode === 'file') { listEl.querySelector('#xsact-ca-file-input').click(); }
                });
            });
            var closeMenu = function(ev) { if (!importMenu.contains(ev.target) && !importBtn.contains(ev.target)) importMenu.classList.add('hidden'); };
            state.actionPanelEl.addEventListener('click', closeMenu);
        }
        var fileInput = listEl.querySelector('#xsact-ca-file-input');
        if (fileInput) fileInput.addEventListener('change', function() {
            var file = fileInput.files && fileInput.files[0];
            if (file) importCustomFromFile(file);
            fileInput.value = '';
        });
        var exportBtn = listEl.querySelector('#xsact-ca-export');
        if (exportBtn) exportBtn.addEventListener('click', exportCustomActions);
        var echoCleanBtn = listEl.querySelector('#xsact-ca-echo-clean-btn');
        if (echoCleanBtn) echoCleanBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (confirm('确定清理原 echo/回声 中的自定义动作数据吗？\n仅删除其「动作数据」，不影响本插件与其他配置（清理后系统更稳定）。')) {
                caCleanupEchoData();
            }
        });
        var searchInput = listEl.querySelector('#xsact-ca-search');
        if (searchInput) searchInput.addEventListener('input', function() {
            var q = searchInput.value.trim().toLowerCase();
            listEl.querySelectorAll('.xsact-ca-card').forEach(function(card) {
                var nm = (card.querySelector('.xsact-ca-name') || {}).textContent || '';
                card.style.display = (!q || nm.toLowerCase().indexOf(q) !== -1) ? '' : 'none';
            });
        });

        // 编辑模式按钮（进入 / 退出）
        var editModeBtn = listEl.querySelector('#xsact-ca-editmode');
        if (editModeBtn) editModeBtn.addEventListener('click', function() {
            state.caEditMode = !state.caEditMode;
            state.caSelected = [];
            updateCustomActionPanel(charObj);
        });

        // 一键切换所有开关：当前若全部已开启则全部关闭，否则全部开启
        var toggleAllBtn = listEl.querySelector('#xsact-ca-toggleall');
        if (toggleAllBtn) toggleAllBtn.addEventListener('click', function() {
            var turnOn = !allOn;
            acts.forEach(function(a) {
                a.visible = turnOn;
                caRegister(a);
            });
            saveCustomActions();
            updateCustomActionPanel(charObj);
            toast(turnOn ? '已开启全部 ' + acts.length + ' 个动作' : '已关闭全部 ' + acts.length + ' 个动作', turnOn ? '#46E0A0' : '#888');
        });

        // 非编辑模式：执行 / 编辑 / 删除 / 开关
        listEl.querySelectorAll('.xsact-ca-run').forEach(function(btn) {
            btn.addEventListener('click', function(e) { e.stopPropagation(); runCustomAction(btn.dataset.id, charObj); });
        });
        listEl.querySelectorAll('.xsact-ca-edit').forEach(function(btn) {
            btn.addEventListener('click', function(e) { e.stopPropagation(); state.editingCustomId = btn.dataset.id; updateCustomActionPanel(charObj); });
        });
        listEl.querySelectorAll('.xsact-ca-delete').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var id = btn.dataset.id;
                var a = getCustom(id);
                if (a && confirm('确定删除自定义动作「' + a.name + '」吗？')) { deleteCustom(id); updateCustomActionPanel(charObj); toast('已删除', '#888'); }
            });
        });
        listEl.querySelectorAll('.xsact-ca-visible').forEach(function(chk) {
            chk.addEventListener('change', function() {
                var id = chk.dataset.id;
                var a = getCustom(id);
                if (!a) return;
                a.visible = !!chk.checked;
                saveCustomActions();
                caRegister(a);
                updateCustomActionPanel(charObj);
                toast(a.visible ? '已显示「' + a.name + '」' : '已隐藏「' + a.name + '」', a.visible ? '#46E0A0' : '#888');
            });
        });

        // 编辑模式：批量栏 + 点击选中 + 拖拽排序
        if (editMode) {
            var selectAllBtn = listEl.querySelector('#xsact-ca-select-all');
            var selectedCountEl = listEl.querySelector('#xsact-ca-selected-count');
            var batchCloseBtn = listEl.querySelector('#xsact-ca-batch-close');
            var batchDeleteBtn = listEl.querySelector('#xsact-ca-batch-delete');
            function syncSel() {
                var cards = listEl.querySelectorAll('.xsact-ca-card.is-edit');
                cards.forEach(function(card) {
                    var id = card.dataset.id;
                    if (state.caSelected.indexOf(id) !== -1) card.classList.add('is-selected');
                    else card.classList.remove('is-selected');
                });
                if (selectedCountEl) selectedCountEl.textContent = '已选 ' + state.caSelected.length + ' 个';
                if (batchCloseBtn) batchCloseBtn.disabled = state.caSelected.length === 0;
                if (batchDeleteBtn) batchDeleteBtn.disabled = state.caSelected.length === 0;
                if (selectAllBtn) selectAllBtn.textContent = (state.caSelected.length > 0 && state.caSelected.length === cards.length) ? '取消全选' : '全选';
            }
            if (selectAllBtn) selectAllBtn.addEventListener('click', function() {
                var cards = Array.from(listEl.querySelectorAll('.xsact-ca-card.is-edit'));
                var allSelected = state.caSelected.length > 0 && state.caSelected.length === cards.length;
                state.caSelected = allSelected ? [] : cards.map(function(c){ return c.dataset.id; });
                syncSel();
            });
            listEl.querySelectorAll('.xsact-ca-card.is-edit').forEach(function(card) {
                card.addEventListener('click', function(e) {
                    if (e.target.closest('.xsact-ca-handle')) return; // 拖拽手柄不触发选中
                    var id = card.dataset.id;
                    var idx = state.caSelected.indexOf(id);
                    if (idx === -1) state.caSelected.push(id);
                    else state.caSelected.splice(idx, 1);
                    syncSel();
                });
            });
            if (batchCloseBtn) batchCloseBtn.addEventListener('click', function() {
                if (!state.caSelected.length) return;
                state.caSelected.slice().forEach(function(id) {
                    var a = getCustom(id);
                    if (!a) return;
                    a.visible = false;
                    caRegister(a);
                });
                saveCustomActions();
                updateCustomActionPanel(charObj);
                toast('已批量关闭 ' + state.caSelected.length + ' 个动作', '#888');
            });
            if (batchDeleteBtn) batchDeleteBtn.addEventListener('click', function() {
                if (!state.caSelected.length) return;
                var names = state.caSelected.map(function(id) { var a = getCustom(id); return a ? a.name : ''; }).filter(Boolean).join('、');
                if (!confirm('确定批量删除以下 ' + state.caSelected.length + ' 个动作吗？\n' + names)) return;
                state.caSelected.slice().forEach(function(id) { deleteCustom(id); });
                state.caSelected = [];
                updateCustomActionPanel(charObj);
                toast('已批量删除 ' + state.caSelected.length + ' 个动作', '#FF5C5C');
            });

            // 拖拽排序
            var dragList = listEl.querySelector('.xsact-ca-list.is-editing');
            if (dragList) {
                var dragEl = null;
                dragList.addEventListener('dragstart', function(e) {
                    var card = e.target.closest('.xsact-ca-card.is-edit');
                    if (!card) return;
                    dragEl = card;
                    state.caDragId = card.dataset.id;
                    e.dataTransfer.effectAllowed = 'move';
                    try { e.dataTransfer.setData('text/plain', card.dataset.id); } catch (err) { console.warn('[QiAct] 拖拽 setData 失败（已忽略）:', err && err.message); }
                    setTimeout(function(){ if (dragEl) dragEl.classList.add('dragging'); }, 0);
                });
                dragList.addEventListener('dragover', function(e) {
                    if (!dragEl) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    var after = getCaDragAfter(dragList, e.clientY);
                    if (after == null) dragList.appendChild(dragEl);
                    else dragList.insertBefore(dragEl, after);
                });
                dragList.addEventListener('drop', function(e) { if (dragEl) e.preventDefault(); });
                dragList.addEventListener('dragend', function() {
                    if (!dragEl) return;
                    dragEl.classList.remove('dragging');
                    dragEl = null;
                    var ids = Array.from(dragList.querySelectorAll('.xsact-ca-card.is-edit')).map(function(c){ return c.dataset.id; });
                    state.customActions.sort(function(a, b){ return ids.indexOf(a.id) - ids.indexOf(b.id); });
                    saveCustomActions();
                    updateCustomActionPanel(charObj);
                });
            }
            syncSel();
        }
    }

    /** 自定义动作列表拖拽排序：根据鼠标 Y 坐标计算插入位置
     *  （返回应插入其前的元素；null 表示插入到末尾）。 */

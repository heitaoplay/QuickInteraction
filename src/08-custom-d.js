    function runCustomAction(id, charObj) {
        var act = getCustom(id);
        if (!act) return;
        if (!charObj) { toast('请先在左侧选择人物', '#FF5C5C'); return; }
        var name = caActivityName(act);
        var ok = executeAction(charObj, name, null, act.group);
        if (ok) toast('执行：' + act.name, '#FF5C7A');
    }

    /** 从 echo/回声(echo-activity-ext) 导入动作数据 */
    function importCustomFromEcho() {
        try {
            var ext = Player && Player.ExtensionSettings;
            if (!ext) { toast('读取扩展设置失败', '#FF5C5C'); return; }
            var echoKey = Object.keys(ext).find(function(k) { return k.indexOf('ECHO') === 0; });
            if (!echoKey || !ext[echoKey] || !ext[echoKey]['动作数据']) {
                toast('未找到 echo/回声 的动作数据', '#FF5C5C'); return;
            }
            var data = ext[echoKey]['动作数据'];
            var keys = Object.keys(data);
            var imported = 0;
            keys.forEach(function(k) {
                var item = data[k];
                if (!item || !item.Name) return;
                var hasTarget = !!item.Target;
                var hasTargetSelf = !!item.TargetSelf;
                var scope = (hasTarget && hasTargetSelf) ? 'any' : hasTargetSelf ? 'self' : 'other';
                var group = item.Target || item.TargetSelf || 'ItemMouth';
                var dialog = item.Dialog || item.Name || '';
                var dialogSelf = item.DialogSelf || '';
                // echo/回声 使用裸 SourceCharacter/TargetCharacter 占位符；统一成花括号格式
                function normalizeEchoPlaceholder(s) { return typeof s === 'string' ? s.replace(/SourceCharacter/g, '{SourceCharacter}').replace(/TargetCharacter/g, '{TargetCharacter}') : s; }
                // 解析 echo 条目的显示名与真实 Activity Name：key / item.Name 可能是中文显示名 ↔ 原始名 任意组合
                var resolved = caResolveEchoNames(k, item.Name);
                var displayName = resolved.displayName;
                var rawName = resolved.rawName;
                // 在注册表里找到这个 echo 动作的真实 Activity.Name（通常带随机后缀，如 笨蛋笨Luzi_xw58d）
                var foundRawNames = caFindEchoNamesInRegistry(item, k, group);
                // 如果 rawName 看起来就是原始 Activity 名，也直接加进去
                if (caLooksLikeRawActivityName(rawName)) foundRawNames.add(rawName);
                if (caLooksLikeRawActivityName(k) && k !== rawName) foundRawNames.add(k);
                var primaryEchoName = foundRawNames.values().next().value || rawName;

                // 去重：同名同部位已存在则更新，避免重复导入导致屏蔽集合/注册表混乱
                var existing = state.customActions.find(function(a) { return a.name === displayName && a.group === group; });
                if (existing) {
                    caUnregister(existing);
                    existing.scope = scope;
                    existing.dialog = normalizeEchoPlaceholder(dialog);
                    existing.dialogSelf = normalizeEchoPlaceholder(dialogSelf);
                    existing.source = 'echo';
                    existing.echoName = primaryEchoName;
                    existing.echoNames = Array.from(foundRawNames);
                    if (typeof existing.visible !== 'boolean') existing.visible = true;
                    upsertCustom(existing);
                } else {
                    var ca = {
                        id: caNewId(),
                        name: displayName,
                        scope: scope,
                        group: group,
                        dialog: normalizeEchoPlaceholder(dialog),
                        dialogSelf: normalizeEchoPlaceholder(dialogSelf),
                        createdAt: Date.now(),
                        source: 'echo',
                        visible: true,
                        echoName: primaryEchoName, // 记录真实 echo 注册名，用于后续启动时重新屏蔽
                        echoNames: Array.from(foundRawNames) // 记录所有可能的原始名，防止漏网
                    };
                    upsertCustom(ca);
                }
                foundRawNames.forEach(caSuppressEchoName);
                // 把 rawName 的中文前缀也加入屏蔽，防止 echo 动态注册同一中文名的其他变体
                var rawPrefix = caExtractChinesePrefix(rawName);
                if (rawPrefix) caSuppressEchoName(rawPrefix);
                var displayPrefix = caExtractChinesePrefix(displayName);
                if (displayPrefix) caSuppressEchoName(displayPrefix);
                caSuppressEchoName(displayName);
                caSuppressEchoName(rawName);
                imported++;
            });
            // 导入完成后，立即屏蔽 echo 端已存在的同名原始动作，并刷新当前面板（custom 面板）
            caRemoveSuppressedEchoActivities();
            updateCustomActionPanel(state.selectedTarget);
            toast('已从 echo/回声 导入 ' + imported + ' 个动作', '#46E0A0');
        } catch (e) {
            console.warn('[XSAct-QA] 导入 echo/回声 动作失败:', e.message);
            toast('导入失败：' + e.message, '#FF5C5C');
        }
    }

    /** 导出自定义动作为 JSON 文件 */
    function exportCustomActions() {
        try {
            var data = JSON.stringify(state.customActions, null, 2);
            var blob = new Blob([data], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'xsact_custom_actions.json';
            a.click();
            URL.revokeObjectURL(url);
            toast('已导出 ' + state.customActions.length + ' 个动作', '#46E0A0');
        } catch (e) {
            console.warn('[XSAct-QA] 导出自定义动作失败:', e.message);
            toast('导出失败：' + e.message, '#FF5C5C');
        }
    }

    /** 从本地 JSON 文件导入自定义动作 */
    function importCustomFromFile(file) {
        try {
            var reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    var json = ev.target.result;
                    var arr = JSON.parse(json);
                    if (!Array.isArray(arr)) { toast('文件格式错误：应为动作对象数组', '#FF5C5C'); return; }
                    var imported = 0, updated = 0;
                    arr.forEach(function(item) {
                        if (!item || !item.name || !item.group) return;
                        var source = item.source || 'native';
                        var dialog = typeof item.dialog === 'string' ? item.dialog : (item.Dialog || '');
                        var dialogSelf = typeof item.dialogSelf === 'string' ? item.dialogSelf : (item.DialogSelf || '');
                        var scope = item.scope || 'other';
                        var visible = typeof item.visible === 'boolean' ? item.visible : true;
                        var existing = state.customActions.find(function(a) { return a.name === item.name && a.group === item.group; });
                        if (existing) {
                            caUnregister(existing);
                            existing.scope = scope;
                            existing.dialog = dialog;
                            existing.dialogSelf = dialogSelf;
                            existing.visible = visible;
                            if (item.source) existing.source = item.source;
                            if (item.echoName) existing.echoName = item.echoName;
                            if (Array.isArray(item.echoNames)) existing.echoNames = item.echoNames.slice();
                            upsertCustom(existing);
                            updated++;
                        } else {
                            var ca = {
                                id: caNewId(),
                                name: item.name,
                                scope: scope,
                                group: item.group,
                                dialog: dialog,
                                dialogSelf: dialogSelf,
                                createdAt: item.createdAt || Date.now(),
                                source: source,
                                visible: visible,
                                echoName: item.echoName || null,
                                echoNames: Array.isArray(item.echoNames) ? item.echoNames.slice() : []
                            };
                            upsertCustom(ca);
                            imported++;
                        }
                    });
                    registerAllCustomActions();
                    updateCustomActionPanel(state.selectedTarget);
                    toast('导入完成：新增 ' + imported + ' 个，更新 ' + updated + ' 个', '#46E0A0');
                } catch (inner) {
                    console.warn('[XSAct-QA] 解析 JSON 失败:', inner.message);
                    toast('JSON 解析失败：' + inner.message, '#FF5C5C');
                }
            };
            reader.onerror = function() { toast('读取文件失败', '#FF5C5C'); };
            reader.readAsText(file);
        } catch (e) {
            console.warn('[XSAct-QA] 导入本地文件失败:', e.message);
            toast('导入失败：' + e.message, '#FF5C5C');
        }
    }

    /** 启动时重新注册所有已存自定义动作到 BC（使本会话内可执行） */
    function registerAllCustomActions() {
        // 清理：移除 BC 注册表中不在当前自定义动作列表里的 XSQAct_ / XSAct_CA_ 残留条目
        // （防止旧版本残留、重复注入或重复注册导致动作面板显示 CA_xxx 裸 ID；
        //   XSAct_CA_ 为早期版本前缀，部分第三方 mod（小酥的動作拓展）会遍历 XSAct* 活动，
        //   旧前缀与其冲突导致原生动作界面崩溃，升级后必须清除。）
        try {
            var fam = (Player && Player.AssetFamily) || 'Female3DCG';
            var acts = caRawAllActivities(fam);
            var validNames = new Set();
            state.customActions.forEach(function(a) { validNames.add(caActivityName(a)); });
            var OLD_PREFIXES = ['XSAct_CA_', CA_PREFIX];
            var isStale = function(name) {
                return OLD_PREFIXES.some(function(p) { return name.indexOf(p) === 0; });
            };
            if (Array.isArray(acts)) {
                for (var i = acts.length - 1; i >= 0; i--) {
                    var a = acts[i];
                    if (a && a.Name && isStale(a.Name) && !validNames.has(a.Name)) {
                        acts.splice(i, 1);
                    }
                }
            }
            // 同步清理排序索引数组中的残留条目
            if (Array.isArray(ActivityFemale3DCGOrdering)) {
                for (var j = ActivityFemale3DCGOrdering.length - 1; j >= 0; j--) {
                    var nm = ActivityFemale3DCGOrdering[j];
                    if (nm && isStale(nm) && !validNames.has(nm)) {
                        ActivityFemale3DCGOrdering.splice(j, 1);
                    }
                }
            }
        } catch (e) { console.warn('[XSAct-QA] 清理自定义动作残留失败:', e.message); }
        state.customActions.forEach(function(act) { caRegister(act); });
    }

    /** 切换「全部」范围开关，并更新按钮视觉 */

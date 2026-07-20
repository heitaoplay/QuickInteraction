    /* ===== 11. 主面板 UI（HTML 结构） ===== */
    function buildPanelHTML() {
        return '\
<div class="xsact-qa-panel-inner">\
  <div class="xsact-qa-panel-header" id="xsact-panel-header">\
    <span class="xsact-panel-grip" id="xsact-drag-grip" title="拖动面板">' + svgIcon('grip', 16) + '</span>\
    <span id="xsact-panel-title">选择动作...</span>\
    <span class="xsact-panel-head-actions">\
      <button class="xsact-qa-mini-btn" id="xsact-theme-btn" title="切换深色/浅色主题"><span class="xsact-theme-icon sun">' + svgIcon('sun', 15) + '</span><span class="xsact-theme-icon moon">' + svgIcon('moon', 15) + '</span></button>\
      <button class="xsact-qa-mini-btn" id="xsact-refresh-btn" title="刷新当前部位/人物的动作列表状态">' + svgIcon('refresh', 15) + '</button>\
      <button class="xsact-qa-mini-btn" id="xsact-exit-panel-btn" title="退出快速动作模式 (Esc)">' + svgIcon('close', 15) + '</button>\
    </span>\
  </div>\
  <div class="xsact-update-banner" id="xsact-update-banner" style="display:none;"></div>\
  <div class="xsact-qa-panel-content">\
    <div class="xsact-qa-panel-main">\
      <div class="xsact-qa-mode-tabs">\
        <button class="xsact-mode-tab active" data-mode="part" title="单部位动作：点人物部位后直接触发">' + svgIcon('target', 14) + '<span>动作</span></button>\
        <button class="xsact-mode-tab" data-mode="combo" title="组合动作：手动拼装多部位动作并一键执行">' + svgIcon('layers', 14) + '<span>组合动作</span></button>\
        <button class="xsact-mode-tab" data-mode="custom" title="我的动作：创建/管理自定义动作（替代 echo/回声）。当前为测试版(Beta)">' + svgIcon('custom', 14) + '<span>我的动作</span><span class="xsact-beta-badge">测试版</span></button>\
      </div>\
      <div class="xsact-qa-panel-body" id="xsact-action-list">\
        <div class="xsact-qa-empty">点击左侧 ◀ 按钮选择人物和部位</div>\
      </div>\
    </div>\
  </div>\
  <div class="xsact-qa-panel-footer">\
    <button class="xsact-qa-mini-btn xsact-toggle-pill" id="xsact-self-btn" title="切换自己模式">' + svgIcon('user', 14) + '<span>自己</span><span class="xsact-pill-dot"></span></button>\
    <button class="xsact-qa-mini-btn xsact-toggle-pill" id="xsact-all-btn" title="切换全员范围：开启后，动作将对房间内所有人执行">' + svgIcon('users', 14) + '<span>全员</span><span class="xsact-pill-dot"></span></button>\
    <button class="xsact-qa-mini-btn xsact-toggle-pill" id="xsact-fav-btn" title="收藏模式：开启后点击动作会加入/取消收藏">' + svgIcon('star', 14) + '<span>收藏</span><span class="xsact-pill-dot"></span></button>\
    <button class="xsact-qa-mini-btn" id="xsact-fav-clear-btn" title="清空全部收藏动作" data-tooltip-type="danger">' + svgIcon('favRemove', 14) + '</button>\
    <button class="xsact-qa-mini-btn" id="xsact-x3-btn" title="连续3次">' + svgIcon('bolt', 14) + '<span>×3</span></button>\
    <span class="xsact-version-tag" title="当前插件版本">v' + VERSION + '</span>\
  </div>\
  <div class="xsact-qa-state.presets-bar" id="xsact-state.presets-bar"></div>\
  <div class="xsact-resize-handle" id="xsact-resize-handle" title="拖动缩放面板">' + svgIcon('resize', 14) + '</div>\
</div>\
<div class="xsact-char-popover" id="xsact-char-popover" style="display:none;">\
  <div class="xsact-char-popover-header">\
    <button class="xsact-char-popover-back" id="xsact-char-popover-back" title="返回人物列表">&#8249;</button>\
    <span class="xsact-char-popover-title" id="xsact-char-popover-title">人物列表</span>\
    <button class="xsact-char-popover-close" id="xsact-char-popover-close" title="关闭" data-tooltip-type="danger">×</button>\
  </div>\
  <div class="xsact-char-popover-body" id="xsact-char-popover-body"></div>\
</div>\
<div id="xsact-char-popover-tab" title="人物列表">' + svgIcon('triangle-left', 12) + '</div>\
<div id="xsact-popover-connector"></div>';
    }

    // ════════════════════════════════════════════════════════════════════════
    // 身体部位浮动网格
    // ════════════════════════════════════════════════════════════════════════

    /**
     * 获取房间内"真实成员"的绘制布局（逻辑坐标）
     * 使用 ChatRoomCharacter（权威成员列表）交叉校验，避免 Drawlist 含离场/NPC 角色
     */

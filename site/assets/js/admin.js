const app = document.getElementById('app');

const state = {
  session: null,
  activeModule: 'dashboard',
  flash: null,
  cache: {}
};

const modules = {
  dashboard: { label: '总览', kind: 'dashboard' },
  settings: { label: '全局设置', kind: 'settings' },
  'pricing-plans': {
    label: '价格计划',
    kind: 'crud',
    endpoint: '/api/pricing-plans',
    singular: '价格计划',
    fields: [
      { name: 'sort_order', label: '排序', type: 'number' },
      { name: 'name', label: '名称', type: 'text', required: true },
      { name: 'audience', label: '目标人群', type: 'text' },
      { name: 'price_label', label: '价格展示', type: 'text' },
      { name: 'billing_cycle', label: '计费说明', type: 'text' },
      { name: 'highlights_json', label: '卖点 JSON', type: 'json' },
      { name: 'cta_text', label: 'CTA 文案', type: 'text' },
      { name: 'cta_url', label: 'CTA 链接', type: 'text' },
      { name: 'is_active', label: '启用', type: 'checkbox' }
    ],
    columns: ['id', 'sort_order', 'name', 'price_label', 'is_active']
  },
  'landing-pages': {
    label: '方案 / 行业页',
    kind: 'crud',
    endpoint: '/api/landing-pages',
    singular: '页面',
    fields: [
      { name: 'page_type', label: '页面类型', type: 'select', options: ['home', 'solution', 'industry', 'compare', 'geo'] },
      { name: 'slug', label: 'Slug', type: 'text', required: true },
      { name: 'title', label: '标题', type: 'text', required: true },
      { name: 'subtitle', label: '副标题', type: 'textarea' },
      { name: 'summary', label: '摘要', type: 'textarea' },
      { name: 'target_keyword', label: '目标关键词', type: 'text' },
      { name: 'meta_title', label: 'Meta Title', type: 'text' },
      { name: 'meta_description', label: 'Meta Description', type: 'textarea' },
      { name: 'hero_json', label: 'Hero JSON', type: 'json' },
      { name: 'sections_json', label: 'Sections JSON', type: 'json' },
      { name: 'faq_json', label: 'FAQ JSON', type: 'json' },
      { name: 'schema_type', label: 'Schema 类型', type: 'text' },
      { name: 'status', label: '状态', type: 'select', options: ['published', 'draft'] },
      { name: 'published_at', label: '发布时间', type: 'datetime-local' }
    ],
    columns: ['id', 'page_type', 'slug', 'title', 'status', 'updated_at']
  },
  articles: {
    label: '文章系统',
    kind: 'crud',
    endpoint: '/api/articles',
    singular: '文章',
    fields: [
      { name: 'slug', label: 'Slug', type: 'text', required: true },
      { name: 'title', label: '标题', type: 'text', required: true },
      { name: 'excerpt', label: '摘要', type: 'textarea' },
      { name: 'content_md', label: 'Markdown 正文', type: 'markdown' },
      { name: 'cover_url', label: '封面链接', type: 'text' },
      { name: 'author_name', label: '作者', type: 'text' },
      { name: 'category', label: '分类', type: 'text' },
      { name: 'tags_json', label: '标签 JSON', type: 'json' },
      { name: 'target_keyword', label: '目标关键词', type: 'text' },
      { name: 'meta_title', label: 'Meta Title', type: 'text' },
      { name: 'meta_description', label: 'Meta Description', type: 'textarea' },
      { name: 'status', label: '状态', type: 'select', options: ['published', 'draft'] },
      { name: 'published_at', label: '发布时间', type: 'datetime-local' }
    ],
    columns: ['id', 'title', 'category', 'status', 'published_at']
  },
  'faq-items': {
    label: 'FAQ',
    kind: 'crud',
    endpoint: '/api/faq-items',
    singular: 'FAQ',
    fields: [
      { name: 'scope', label: '作用范围', type: 'select', options: ['global', 'solution', 'industry', 'page'] },
      { name: 'scope_slug', label: '范围 Slug', type: 'text' },
      { name: 'question', label: '问题', type: 'text', required: true },
      { name: 'answer', label: '答案', type: 'textarea', required: true },
      { name: 'sort_order', label: '排序', type: 'number' },
      { name: 'is_active', label: '启用', type: 'checkbox' }
    ],
    columns: ['id', 'scope', 'scope_slug', 'question', 'is_active']
  },
  'outbound-links': {
    label: '外链资源池',
    kind: 'crud',
    endpoint: '/api/outbound-links',
    singular: '外链',
    fields: [
      { name: 'label', label: '名称', type: 'text', required: true },
      { name: 'url', label: '链接', type: 'text', required: true },
      { name: 'category', label: '分类', type: 'text' },
      { name: 'keywords_json', label: '关键词 JSON', type: 'json' },
      { name: 'placement', label: '挂载位置', type: 'select', options: ['article', 'footer'] },
      { name: 'authority_score', label: '权威分', type: 'number' },
      { name: 'is_active', label: '启用', type: 'checkbox' }
    ],
    columns: ['id', 'label', 'category', 'placement', 'authority_score', 'is_active']
  },
  plugins: {
    label: '插件区块',
    kind: 'crud',
    endpoint: '/api/plugins',
    singular: '插件',
    allowImport: true,
    fields: [
      { name: 'name', label: '名称', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text', required: true },
      { name: 'slot', label: '挂载槽位', type: 'text', required: true },
      { name: 'kind', label: '类型', type: 'select', options: ['stat-grid', 'cta-strip', 'custom-html'] },
      { name: 'title', label: '标题', type: 'text' },
      { name: 'config_json', label: '配置 JSON', type: 'json' },
      { name: 'html_template', label: 'HTML 模板', type: 'textarea' },
      { name: 'css_text', label: '自定义 CSS', type: 'textarea' },
      { name: 'js_text', label: '自定义 JS（需在设置开启）', type: 'textarea' },
      { name: 'is_active', label: '启用', type: 'checkbox' }
    ],
    columns: ['id', 'slot', 'name', 'kind', 'is_active', 'updated_at']
  },
  leads: { label: '线索 CRM', kind: 'leads' },
  media: { label: '媒体上传', kind: 'media' },
  password: { label: '修改密码', kind: 'password' }
};

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function formatDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function safeJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function prettyJson(value, fallback = {}) {
  if (value === null || value === undefined || value === '') return JSON.stringify(fallback, null, 2);
  if (typeof value === 'string') {
    const parsed = safeJson(value, null);
    if (parsed === null) return value;
    return JSON.stringify(parsed, null, 2);
  }
  return JSON.stringify(value, null, 2);
}

function showFlash(message, type = 'success') {
  state.flash = { message, type };
  render();
  setTimeout(() => {
    if (state.flash?.message === message) {
      state.flash = null;
      render();
    }
  }, 2800);
}

async function api(path, options = {}) {
  const config = { method: 'GET', ...options };
  const headers = new Headers(config.headers || {});
  if (state.session?.csrfToken && ['POST', 'PUT', 'DELETE'].includes(config.method)) {
    headers.set('x-csrf-token', state.session.csrfToken);
  }
  if (config.body && !(config.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
    config.body = JSON.stringify(config.body);
  }
  const response = await fetch(path, { ...config, headers });
  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || '请求失败');
    error.response = response;
    error.data = data;
    throw error;
  }
  return data;
}

async function loadSession() {
  try {
    const data = await api('/api/auth/me');
    state.session = data.admin;
  } catch {
    state.session = null;
  }
}

function renderFlash() {
  if (!state.flash) return '';
  return `<div class="flash-message ${escapeHtml(state.flash.type)}">${escapeHtml(state.flash.message)}</div>`;
}

function renderLogin() {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="brand">
          <span class="brand-mark">A</span>
          <span>
            <strong>管理员后台</strong>
            <small>Cloudflare Pages / D1 / R2</small>
          </span>
        </div>
        <h1>登录 CMS / CRM / SEO 后台</h1>
        <p>首次部署默认账号：<strong>admin</strong>，默认密码：<strong>ChangeMe123!</strong>。登录后请立即修改。</p>
        ${renderFlash()}
        <form class="login-form" id="login-form">
          <label>账号<input name="username" value="admin" placeholder="admin"></label>
          <label>密码<input name="password" type="password" value="ChangeMe123!" placeholder="请输入密码"></label>
          <div class="login-actions">
            <button class="button primary" type="submit">登录后台</button>
          </div>
        </form>
        <p class="login-hint">后台包含：全局设置、价格计划、方案页、文章、FAQ、线索 CRM、外链资源池、插件区块、媒体上传。</p>
      </div>
    </div>
  `;
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = '登录中...';
  try {
    const body = Object.fromEntries(new FormData(form).entries());
    const data = await api('/api/auth/login', { method: 'POST', body });
    state.session = data.admin;
    state.cache = {};
    showFlash('登录成功。');
    render();
    await loadModuleData('dashboard', true);
  } catch (error) {
    showFlash(error.message || '登录失败。', 'error');
  } finally {
    submit.disabled = false;
    submit.textContent = '登录后台';
  }
}

function getModuleTitle(key) {
  return modules[key]?.label || '后台';
}

function renderSidebar() {
  return `
    <aside class="admin-sidebar">
      <a class="brand" href="/" target="_blank" rel="noopener">
        <span class="brand-mark">A</span>
        <span>
          <strong>AICL 出海增长站</strong>
          <small>管理员后台</small>
        </span>
      </a>
      <h2>后台模块</h2>
      <div class="admin-menu">
        ${Object.entries(modules).map(([key, module]) => `
          <button type="button" data-module="${key}" class="${state.activeModule === key ? 'active' : ''}">${escapeHtml(module.label)}</button>
        `).join('')}
      </div>
    </aside>
  `;
}

function renderTopbar() {
  return `
    <div class="admin-topbar">
      <div>
        <div class="eyebrow">${escapeHtml(state.session?.role || 'admin')}</div>
        <h1>${escapeHtml(getModuleTitle(state.activeModule))}</h1>
      </div>
      <div class="topbar-actions">
        <span class="status-pill">${escapeHtml(state.session?.displayName || state.session?.username || '')}</span>
        <button class="button ghost" type="button" id="refresh-module">刷新</button>
        <button class="button ghost" type="button" id="logout-button">退出</button>
      </div>
    </div>
  `;
}

function renderShell(innerHtml) {
  app.innerHTML = `
    <div class="container">
      <div class="admin-shell">
        ${renderSidebar()}
        <main class="admin-main">
          ${renderTopbar()}
          ${state.session?.mustResetPassword ? '<div class="notice-bar">默认密码仍未修改，请尽快到“修改密码”模块更改。</div>' : ''}
          ${renderFlash()}
          <div id="module-view">${innerHtml}</div>
        </main>
      </div>
    </div>
  `;
  bindShellEvents();
}

function bindShellEvents() {
  app.querySelectorAll('[data-module]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.activeModule = button.getAttribute('data-module');
      render();
      await loadModuleData(state.activeModule);
    });
  });
  document.getElementById('logout-button')?.addEventListener('click', handleLogout);
  document.getElementById('refresh-module')?.addEventListener('click', async () => {
    await loadModuleData(state.activeModule, true);
  });
}

async function handleLogout() {
  try {
    await api('/api/auth/logout', { method: 'POST', body: {} });
  } catch {}
  state.session = null;
  state.cache = {};
  render();
}

async function loadModuleData(moduleKey, force = false) {
  const module = modules[moduleKey];
  if (!module) return;
  if (!force && state.cache[moduleKey]) {
    render();
    bindModuleEvents(moduleKey);
    return;
  }
  try {
    if (module.kind === 'dashboard') {
      state.cache[moduleKey] = await api('/api/dashboard');
    } else if (module.kind === 'settings') {
      state.cache[moduleKey] = await api('/api/settings');
    } else if (module.kind === 'crud') {
      state.cache[moduleKey] = await api(module.endpoint);
    } else if (module.kind === 'leads') {
      state.cache[moduleKey] = await api('/api/leads');
    } else if (module.kind === 'media') {
      state.cache[moduleKey] = await api('/api/uploads');
    } else if (module.kind === 'password') {
      state.cache[moduleKey] = { ok: true };
    }
    if (state.cache[moduleKey]?.session?.csrfToken) {
      state.session = { ...state.session, csrfToken: state.cache[moduleKey].session.csrfToken, mustResetPassword: !!state.cache[moduleKey].session.mustResetPassword };
    }
    render();
    bindModuleEvents(moduleKey);
  } catch (error) {
    if (error.response?.status === 401) {
      state.session = null;
      state.cache = {};
      render();
      return;
    }
    showFlash(error.message || '加载失败。', 'error');
  }
}

function renderDashboardModule() {
  const data = state.cache.dashboard;
  if (!data) return '<div class="empty-state">正在加载总览...</div>';
  const metrics = [
    ['文章数', data.counts.articles.total],
    ['页面数', data.counts.pages.total],
    ['线索数', data.counts.leads.total],
    ['启用插件', data.counts.plugins.total]
  ];
  return `
    <section class="dashboard-grid">
      ${metrics.map(([label, value]) => `<article class="metric-card"><span class="eyebrow">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('')}
    </section>
    <section class="panel-grid">
      <div class="list-panel section-card">
        <h2>最近线索</h2>
        ${data.latestLeads?.length ? `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>时间</th><th>姓名</th><th>来源页</th><th>状态</th></tr></thead>
              <tbody>
                ${data.latestLeads.map((item) => `<tr><td>${escapeHtml(formatDate(item.created_at))}</td><td>${escapeHtml(item.name || '-')}</td><td>${escapeHtml(item.source_page || '-')}</td><td>${escapeHtml(item.status)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty-state">暂无线索。</div>'}
      </div>
      <div class="list-panel section-card">
        <h2>最近文章</h2>
        ${data.latestArticles?.length ? `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>标题</th><th>状态</th><th>发布时间</th></tr></thead>
              <tbody>
                ${data.latestArticles.map((item) => `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(formatDate(item.published_at))}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty-state">暂无文章。</div>'}
      </div>
    </section>
  `;
}

function renderSettingsModule() {
  const data = state.cache.settings;
  if (!data) return '<div class="empty-state">正在加载设置...</div>';
  const global = data.settings.global;
  const proofPoints = prettyJson(data.settings.proofPoints, []);
  const fields = [
    ['brandName', '品牌名'], ['siteName', '站点名称'], ['siteUrl', '站点 URL'], ['legalName', '法定名称'],
    ['heroTitle', '首页主标题'], ['heroSubtitle', '首页副标题'], ['companySummary', '公司摘要'], ['trustSummary', '可信卖点摘要'],
    ['telegramUrl', 'Telegram 链接'], ['whatsappUrl', 'WhatsApp 链接'], ['wechatId', '微信号'], ['organizationEmail', '邮箱'],
    ['organizationPhone', '电话'], ['primaryCtaText', '主 CTA 文案'], ['secondaryCtaText', '次 CTA 文案'], ['defaultMetaTitle', '默认 Meta Title'],
    ['defaultMetaDescription', '默认 Meta Description'], ['defaultKeywords', '默认关键词'], ['resourceLinkIntro', '外链资源池说明'], ['geoSummary', 'GEO 摘要'],
    ['footerNote', '页脚说明'], ['enableCustomScripts', '允许插件自定义脚本']
  ];
  return `
    <section class="form-panel section-card">
      <h2>全局设置</h2>
      <form class="form-grid columns-2" id="settings-form">
        ${fields.map(([name, label]) => {
          const value = global[name];
          if (name === 'enableCustomScripts') {
            return `<label><span>${escapeHtml(label)}</span><select name="${name}"><option value="false" ${!value ? 'selected' : ''}>关闭</option><option value="true" ${value ? 'selected' : ''}>开启</option></select></label>`;
          }
          const isLong = ['heroSubtitle', 'companySummary', 'defaultMetaDescription', 'resourceLinkIntro', 'geoSummary', 'footerNote'].includes(name);
          return `<label><span>${escapeHtml(label)}</span>${isLong ? `<textarea name="${name}">${escapeHtml(value || '')}</textarea>` : `<input name="${name}" value="${escapeHtml(value || '')}">`}</label>`;
        }).join('')}
        <label style="grid-column:1/-1;"><span>可信证明 JSON</span><textarea class="json-field" name="proof_points">${escapeHtml(proofPoints)}</textarea></label>
        <div class="form-actions" style="grid-column:1/-1;"><button class="button primary" type="submit">保存设置</button></div>
      </form>
    </section>
  `;
}

function defaultJsonForField(fieldName = '') {
  return ['highlights_json', 'faq_json', 'tags_json', 'keywords_json', 'sections_json', 'proof_points'].includes(fieldName)
    ? '[]'
    : '{}';
}

function newItemForModule(moduleKey) {
  const module = modules[moduleKey];
  const item = {};
  module.fields.forEach((field) => {
    if (field.type === 'checkbox') item[field.name] = false;
    else if (field.type === 'json') item[field.name] = defaultJsonForField(field.name);
    else if (field.type === 'select') item[field.name] = field.options?.[0] || '';
    else if (field.type === 'datetime-local') item[field.name] = '';
    else item[field.name] = '';
  });
  return item;
}

function renderField(field, value) {
  if (field.type === 'textarea' || field.type === 'markdown') {
    return `<label><span>${escapeHtml(field.label)}</span><textarea name="${field.name}" class="${field.type === 'markdown' ? 'json-field' : ''}">${escapeHtml(value || '')}</textarea></label>`;
  }
  if (field.type === 'json') {
    return `<label><span>${escapeHtml(field.label)}</span><textarea class="json-field" name="${field.name}">${escapeHtml(prettyJson(value, {}))}</textarea></label>`;
  }
  if (field.type === 'checkbox') {
    return `<label><span>${escapeHtml(field.label)}</span><select name="${field.name}"><option value="true" ${value ? 'selected' : ''}>是</option><option value="false" ${!value ? 'selected' : ''}>否</option></select></label>`;
  }
  if (field.type === 'select') {
    return `<label><span>${escapeHtml(field.label)}</span><select name="${field.name}">${field.options.map((option) => `<option value="${escapeHtml(option)}" ${String(value) === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></label>`;
  }
  if (field.type === 'datetime-local') {
    return `<label><span>${escapeHtml(field.label)}</span><input type="datetime-local" name="${field.name}" value="${escapeHtml(formatDatetimeLocal(value))}"></label>`;
  }
  return `<label><span>${escapeHtml(field.label)}</span><input type="${field.type === 'number' ? 'number' : 'text'}" name="${field.name}" value="${escapeHtml(value || '')}" ${field.required ? 'required' : ''}></label>`;
}

function renderCrudModule(moduleKey) {
  const module = modules[moduleKey];
  const data = state.cache[moduleKey];
  if (!data) return '<div class="empty-state">正在加载数据...</div>';
  const items = data.items || [];
  const hasSelectedId = Object.prototype.hasOwnProperty.call(data, 'selectedId');
  const selectedId = hasSelectedId ? data.selectedId : (items[0] ? items[0].id : null);
  const selected = data.draft || items.find((item) => item.id === selectedId) || newItemForModule(moduleKey);
  const selectedLabel = selected.id ? `编辑 ${module.singular}` : `新增 ${module.singular}`;

  return `
    <section class="panel-grid">
      <div class="list-panel section-card">
        <div class="admin-topbar" style="margin-bottom:16px;">
          <h2>${escapeHtml(module.label)}列表</h2>
          <div class="inline-actions">
            <button type="button" data-action="new-item">新增</button>
            ${module.allowImport ? '<button type="button" data-action="import-json">导入 JSON</button>' : ''}
          </div>
        </div>
        ${module.allowImport ? '<input type="file" id="plugin-import" accept="application/json" hidden>' : ''}
        ${items.length ? `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr>${module.columns.map((col) => `<th>${escapeHtml(col)}</th>`).join('')}<th>操作</th></tr></thead>
              <tbody>
                ${items.map((item) => `
                  <tr>
                    ${module.columns.map((col) => `<td>${escapeHtml(col.includes('at') ? formatDate(item[col]) : (typeof item[col] === 'string' || typeof item[col] === 'number' ? item[col] : String(item[col] ?? '')))}</td>`).join('')}
                    <td>
                      <div class="inline-actions">
                        <button type="button" data-action="edit-item" data-id="${item.id}">编辑</button>
                        <button type="button" data-action="delete-item" data-id="${item.id}">删除</button>
                      </div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty-state">暂无数据，点击“新增”创建。</div>'}
      </div>
      <div class="form-panel section-card">
        <h2>${escapeHtml(selectedLabel)}</h2>
        <form class="form-grid" data-module-form="${moduleKey}">
          <input type="hidden" name="id" value="${escapeHtml(selected.id || '')}">
          ${module.fields.map((field) => renderField(field, selected[field.name])).join('')}
          <div class="form-actions">
            <button class="button primary" type="submit">保存</button>
            ${selected.id ? '<button class="button ghost" type="button" data-action="clone-item">复制为新项</button>' : ''}
          </div>
        </form>
      </div>
    </section>
  `;
}

function renderLeadsModule() {
  const data = state.cache.leads;
  if (!data) return '<div class="empty-state">正在加载线索...</div>';
  const items = data.items || [];
  const selectedId = data.selectedId || (items[0] ? items[0].id : null);
  const selected = items.find((item) => item.id === selectedId) || null;
  return `
    <section class="panel-grid">
      <div class="list-panel section-card">
        <div class="admin-topbar" style="margin-bottom:16px;">
          <h2>线索列表</h2>
          <div class="inline-actions"><a class="button ghost" href="/api/export/leads.csv" target="_blank" rel="noopener">导出 CSV</a></div>
        </div>
        ${items.length ? `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>时间</th><th>姓名</th><th>公司</th><th>来源页</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                ${items.map((item) => `
                  <tr>
                    <td>${escapeHtml(formatDate(item.created_at))}</td>
                    <td>${escapeHtml(item.name || '-')}</td>
                    <td>${escapeHtml(item.company || '-')}</td>
                    <td>${escapeHtml(item.source_page || '-')}</td>
                    <td>${escapeHtml(item.status || 'new')}</td>
                    <td><button type="button" data-action="select-lead" data-id="${item.id}">查看 / 更新</button></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty-state">暂无线索。</div>'}
      </div>
      <div class="form-panel section-card">
        <h2>线索详情</h2>
        ${selected ? `
          <form class="form-grid" id="lead-form">
            <input type="hidden" name="id" value="${selected.id}">
            <div class="tag-row">
              <span class="status-pill">来源页：${escapeHtml(selected.source_page || '-')}</span>
              <span class="status-pill">UTM：${escapeHtml(selected.utm_source || '-')}</span>
            </div>
            <pre class="json-preview">${escapeHtml(JSON.stringify({
              name: selected.name,
              company: selected.company,
              email: selected.email,
              phone: selected.phone,
              whatsapp: selected.whatsapp,
              telegram: selected.telegram,
              wechat: selected.wechat,
              preferred_channel: selected.preferred_channel,
              message: selected.message,
              referrer: selected.referrer
            }, null, 2))}</pre>
            <label><span>状态</span><select name="status">${['new', 'contacted', 'qualified', 'won', 'lost'].map((option) => `<option value="${option}" ${selected.status === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
            <label><span>备注</span><textarea name="notes">${escapeHtml(selected.notes || '')}</textarea></label>
            <div class="form-actions"><button class="button primary" type="submit">更新线索</button></div>
          </form>
        ` : '<div class="empty-state">请选择一条线索。</div>'}
      </div>
    </section>
  `;
}

function renderMediaModule() {
  const data = state.cache.media;
  const items = data?.items || [];
  return `
    <section class="panel-grid">
      <div class="form-panel section-card">
        <h2>上传媒体到 R2</h2>
        <p class="muted">如果 Cloudflare 项目已绑定 <code>MEDIA_BUCKET</code>，上传后会得到可用于页面和文章的 URL。</p>
        <form id="media-form" class="form-grid">
          <label><span>选择文件</span><input type="file" name="file" required></label>
          <label><span>Alt 文本</span><input type="text" name="alt_text" placeholder="图片说明"></label>
          <div class="form-actions"><button class="button primary" type="submit">上传</button></div>
        </form>
      </div>
      <div class="list-panel section-card">
        <h2>已上传媒体</h2>
        ${items.length ? `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>文件名</th><th>Key</th><th>时间</th><th>操作</th></tr></thead>
              <tbody>
                ${items.map((item) => `
                  <tr>
                    <td>${escapeHtml(item.file_name)}</td>
                    <td>${escapeHtml(item.file_key)}</td>
                    <td>${escapeHtml(formatDate(item.created_at))}</td>
                    <td><div class="inline-actions"><a href="/media/${encodeURIComponent(item.file_key)}" target="_blank" rel="noopener">查看</a><button type="button" data-action="delete-media" data-id="${item.id}">删除</button></div></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty-state">暂无媒体文件。</div>'}
      </div>
    </section>
  `;
}

function renderPasswordModule() {
  return `
    <section class="form-panel section-card password-form">
      <h2>修改管理员密码</h2>
      <form id="password-form" class="form-grid" style="max-width:620px;">
        <label><span>当前密码</span><input type="password" name="currentPassword" required></label>
        <label><span>新密码</span><input type="password" name="newPassword" required minlength="8"></label>
        <div class="form-actions"><button class="button primary" type="submit">更新密码</button></div>
      </form>
    </section>
  `;
}

function renderActiveModule() {
  const module = modules[state.activeModule];
  if (!module) return '<div class="empty-state">模块不存在。</div>';
  if (module.kind === 'dashboard') return renderDashboardModule();
  if (module.kind === 'settings') return renderSettingsModule();
  if (module.kind === 'crud') return renderCrudModule(state.activeModule);
  if (module.kind === 'leads') return renderLeadsModule();
  if (module.kind === 'media') return renderMediaModule();
  if (module.kind === 'password') return renderPasswordModule();
  return '<div class="empty-state">暂不支持此模块。</div>';
}

function render() {
  if (!state.session) {
    renderLogin();
    return;
  }
  renderShell(renderActiveModule());
}

function getFormDataObject(form, moduleKey) {
  const module = modules[moduleKey];
  const formData = new FormData(form);
  const data = {};
  for (const field of module.fields) {
    const value = formData.get(field.name);
    if (field.type === 'checkbox') {
      data[field.name] = value === 'true';
    } else if (field.type === 'number') {
      data[field.name] = Number(value || 0);
    } else if (field.type === 'json') {
      const raw = String(value || '').trim();
      const fallback = defaultJsonForField(field.name);
      try {
        JSON.parse(raw || fallback);
      } catch {
        throw new Error(`${field.label} 不是合法 JSON`);
      }
      data[field.name] = raw || fallback;
    } else {
      data[field.name] = String(value || '');
    }
  }
  return data;
}

function bindModuleEvents(moduleKey) {
  const module = modules[moduleKey];
  if (!module) return;

  if (module.kind === 'settings') {
    document.getElementById('settings-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const formData = new FormData(event.currentTarget);
        const global = {};
        for (const [key, value] of formData.entries()) {
          if (key === 'proof_points') continue;
          global[key] = key === 'enableCustomScripts' ? value === 'true' : String(value);
        }
        const proofPoints = JSON.parse(String(formData.get('proof_points') || '[]'));
        state.cache.settings = await api('/api/settings', { method: 'PUT', body: { global, proofPoints } });
        if (state.cache.settings?.settings?.global) {
          state.session = { ...state.session, mustResetPassword: !!state.cache.settings.session?.mustResetPassword };
        }
        showFlash('设置已保存。');
        render();
        bindModuleEvents(moduleKey);
      } catch (error) {
        showFlash(error.message || '保存失败。', 'error');
      }
    });
    return;
  }

  if (module.kind === 'crud') {
    const data = state.cache[moduleKey];
    document.querySelector('[data-action="new-item"]')?.addEventListener('click', () => {
      state.cache[moduleKey] = { ...data, selectedId: null, draft: newItemForModule(moduleKey) };
      render();
      bindModuleEvents(moduleKey);
    });
    document.querySelectorAll('[data-action="edit-item"]').forEach((button) => {
      button.addEventListener('click', () => {
        state.cache[moduleKey] = { ...data, selectedId: Number(button.dataset.id), draft: null };
        render();
        bindModuleEvents(moduleKey);
      });
    });
    document.querySelectorAll('[data-action="delete-item"]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!confirm('确认删除这条记录吗？')) return;
        try {
          await api(`${module.endpoint}/${button.dataset.id}`, { method: 'DELETE' });
          showFlash('已删除。');
          await loadModuleData(moduleKey, true);
        } catch (error) {
          showFlash(error.message || '删除失败。', 'error');
        }
      });
    });
    document.querySelector('[data-action="clone-item"]')?.addEventListener('click', () => {
      const selected = (data.items || []).find((item) => item.id === data.selectedId);
      if (!selected) return;
      const cloned = { ...selected };
      delete cloned.id;
      delete cloned.created_at;
      delete cloned.updated_at;
      state.cache[moduleKey] = { ...data, selectedId: null, draft: cloned };
      render();
      bindModuleEvents(moduleKey);
    });
    if (module.allowImport) {
      document.querySelector('[data-action="import-json"]')?.addEventListener('click', () => document.getElementById('plugin-import')?.click());
      document.getElementById('plugin-import')?.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          const normalized = { ...newItemForModule(moduleKey), ...parsed };
          delete normalized.id;
          delete normalized.created_at;
          delete normalized.updated_at;
          state.cache[moduleKey] = { ...data, selectedId: null, draft: normalized };
          render();
          bindModuleEvents(moduleKey);
          event.target.value = '';
          showFlash('JSON 已导入到表单。');
        } catch (error) {
          showFlash(error.message || 'JSON 导入失败。', 'error');
        }
      });
    }
    document.querySelector(`[data-module-form="${moduleKey}"]`)?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const form = event.currentTarget;
        const id = form.elements.id?.value;
        const payload = getFormDataObject(form, moduleKey);
        if (id) {
          await api(`${module.endpoint}/${id}`, { method: 'PUT', body: payload });
          showFlash('已更新。');
        } else {
          await api(module.endpoint, { method: 'POST', body: payload });
          showFlash('已创建。');
        }
        await loadModuleData(moduleKey, true);
      } catch (error) {
        showFlash(error.message || '保存失败。', 'error');
      }
    });
    return;
  }

  if (module.kind === 'leads') {
    const data = state.cache.leads;
    document.querySelectorAll('[data-action="select-lead"]').forEach((button) => {
      button.addEventListener('click', () => {
        state.cache.leads = { ...data, selectedId: Number(button.dataset.id) };
        render();
        bindModuleEvents(moduleKey);
      });
    });
    document.getElementById('lead-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const formData = new FormData(event.currentTarget);
        const id = formData.get('id');
        await api(`/api/leads/${id}`, { method: 'PUT', body: { status: formData.get('status'), notes: formData.get('notes') } });
        showFlash('线索已更新。');
        await loadModuleData(moduleKey, true);
      } catch (error) {
        showFlash(error.message || '更新失败。', 'error');
      }
    });
    return;
  }

  if (module.kind === 'media') {
    document.getElementById('media-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = '上传中...';
      try {
        await api('/api/media', { method: 'POST', body: formData });
        showFlash('媒体已上传。');
        form.reset();
        await loadModuleData(moduleKey, true);
      } catch (error) {
        showFlash(error.message || '上传失败。', 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = '上传';
      }
    });
    document.querySelectorAll('[data-action="delete-media"]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!confirm('确认删除该媒体文件吗？')) return;
        try {
          await api(`/api/media/${button.dataset.id}`, { method: 'DELETE' });
          showFlash('媒体已删除。');
          await loadModuleData(moduleKey, true);
        } catch (error) {
          showFlash(error.message || '删除失败。', 'error');
        }
      });
    });
    return;
  }

  if (module.kind === 'password') {
    document.getElementById('password-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const formData = new FormData(event.currentTarget);
        await api('/api/admin/change-password', { method: 'POST', body: { currentPassword: formData.get('currentPassword'), newPassword: formData.get('newPassword') } });
        showFlash('密码已更新。');
        state.session = { ...state.session, mustResetPassword: false };
        event.currentTarget.reset();
        render();
        bindModuleEvents(moduleKey);
      } catch (error) {
        showFlash(error.message || '修改失败。', 'error');
      }
    });
  }
}

(async function init() {
  await loadSession();
  render();
  if (state.session) {
    await loadModuleData(state.activeModule, true);
  }
})();

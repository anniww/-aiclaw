const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'ChangeMe123!';
const DEFAULT_ADMIN_DISPLAY_NAME = 'Super Admin';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();
let initPromise;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin',
  must_reset_password INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  csrf_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pricing_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  audience TEXT,
  price_label TEXT,
  billing_cycle TEXT,
  highlights_json TEXT,
  cta_text TEXT,
  cta_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS landing_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_type TEXT NOT NULL DEFAULT 'solution',
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  summary TEXT,
  target_keyword TEXT,
  meta_title TEXT,
  meta_description TEXT,
  hero_json TEXT,
  sections_json TEXT,
  faq_json TEXT,
  schema_type TEXT NOT NULL DEFAULT 'Service',
  status TEXT NOT NULL DEFAULT 'published',
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content_md TEXT,
  cover_url TEXT,
  author_name TEXT,
  category TEXT,
  tags_json TEXT,
  target_keyword TEXT,
  meta_title TEXT,
  meta_description TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS faq_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL DEFAULT 'global',
  scope_slug TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_page TEXT,
  name TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  telegram TEXT,
  wechat TEXT,
  message TEXT,
  preferred_channel TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbound_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT,
  keywords_json TEXT,
  placement TEXT NOT NULL DEFAULT 'article',
  is_active INTEGER NOT NULL DEFAULT 1,
  authority_score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plugins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  slot TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT,
  config_json TEXT,
  html_template TEXT,
  css_text TEXT,
  js_text TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  size INTEGER,
  alt_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_status_date ON articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_type_status ON landing_pages(page_type, status);
CREATE INDEX IF NOT EXISTS idx_faq_scope ON faq_items(scope, scope_slug);
CREATE INDEX IF NOT EXISTS idx_leads_status_date ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugins_slot_active ON plugins(slot, is_active);
`;

const DEFAULT_GLOBAL_SETTINGS = {
  brandName: 'AI外贸出海获客软件',
  legalName: 'AI外贸出海获客软件',
  siteName: 'aiclawchuhai.shop',
  siteUrl: 'https://aiclawchuhai.shop',
  heroKicker: 'AI 全渠道聚合拓客 SaaS',
  heroTitle: '让搜索流量、社媒流量和广告流量一起为你的外贸询盘负责',
  heroSubtitle: '这不是一张临时单页，而是一套面向长期运营的官网系统：前台可做 SEO / GEO / 文章矩阵，后台可做 CMS / CRM / 价格管理 / 外链池 / 插件化区块更新。',
  companySummary: '基于资料梳理：10年技术沉淀、3000平办公场地、百人AI研发团队、数百人服务团队，聚焦全渠道聚合获客的软件研发与服务。',
  trustSummary: '支持 TikTok、WhatsApp、社媒矩阵、AI广告、AI客服与 Google AI SEO 组合式增长。',
  primaryCtaText: 'Telegram 立即咨询',
  primaryCtaUrl: 'https://t.me/aiclawchuhai',
  secondaryCtaText: 'WhatsApp 立即咨询',
  secondaryCtaUrl: 'https://wa.me/85252195605',
  telegramUrl: 'https://t.me/aiclawchuhai',
  whatsappUrl: 'https://wa.me/85252195605',
  whatsappDisplay: '+852 5219 5605',
  wechatId: '17276592029',
  leadFormHeadline: '告诉我们你的产品、市场和获客目标',
  leadFormDescription: '提交后可直接跳转 Telegram / WhatsApp，也会进入后台 CRM 线索池，方便继续跟进。',
  defaultMetaTitle: 'AI外贸获客软件 | TikTok / WhatsApp / 社媒矩阵 / AI广告 / AI客服',
  defaultMetaDescription: '面向外贸和出海业务的 AI 获客软件官网。支持 TikTok AI 拓客、WhatsApp AI 采集筛选群发、社媒矩阵、AI广告、AI客服、文章 SEO / GEO、管理员后台、CMS、CRM、价格管理与插件化区块。',
  defaultKeywords: 'AI外贸获客软件,外贸拓客系统,TikTok拓客,WhatsApp获客,社媒矩阵,AI广告,AI客服,Google AI SEO,GEO,Cloudflare Pages',
  organizationEmail: 'contact@aiclawchuhai.shop',
  organizationPhone: '+852 5219 5605',
  footerNote: '本系统面向长期搜索排名与持续询盘转化设计，支持 Cloudflare Pages + D1 + R2 架构。',
  adminNotice: '首次部署后请使用默认管理员账号登录并立即修改密码。',
  enableCustomScripts: false,
  resourceLinkIntro: '这里展示的是可由后台维护的外链资源池。建议只放与你业务强相关、且权威可信的外部资源，而不是堆砌无关链接。',
  geoSummary: '站点同时为传统搜索引擎和 AI 检索引擎准备了结构化问答、定义块、FAQ、llms.txt、RSS、Sitemap 与语义聚类落地页。'
};

const DEFAULT_PROOF_POINTS = [
  { value: '10年', label: '技术沉淀' },
  { value: '3000平', label: '办公场地' },
  { value: '100人+', label: 'AI研发团队' },
  { value: '数百人', label: '服务团队' },
  { value: '200+国家', label: '目标市场覆盖' },
  { value: '109种语言', label: '多语言匹配' },
  { value: '软件著作权', label: '合规基础' },
  { value: 'ISO', label: '安全信息认证' }
];

const DEFAULT_PRICING = [
  {
    sort_order: 1,
    name: '基础获客版',
    audience: '想先把站点与询盘闭环跑起来的团队',
    price_label: '后台自定义',
    billing_cycle: '按年 / 按项目均可配置',
    highlights_json: JSON.stringify(['SEO / GEO 官网', '文章系统', '线索表单 + CRM', 'Telegram / WhatsApp / 微信引流', '基础外链资源池']),
    cta_text: '咨询基础方案',
    cta_url: 'https://t.me/aiclawchuhai',
    is_active: 1
  },
  {
    sort_order: 2,
    name: '增长转化版',
    audience: '已有流量，想把 TikTok / WhatsApp / 广告 / 社媒矩阵串起来的团队',
    price_label: '后台自定义',
    billing_cycle: '按年',
    highlights_json: JSON.stringify(['解决方案页矩阵', '广告引流页', 'FAQ / 文章集群', '站内外链自动分发', '更细的线索标签与跟进记录']),
    cta_text: '咨询增长方案',
    cta_url: 'https://wa.me/85252195605',
    is_active: 1
  },
  {
    sort_order: 3,
    name: '全渠道旗舰版',
    audience: '要长期 SEO 排名 + 广告转化 + 多落地页矩阵的团队',
    price_label: '后台自定义',
    billing_cycle: '按年 / 私有化',
    highlights_json: JSON.stringify(['首页 + 方案页 + 行业页 + 博客矩阵', '插件化区块', 'R2 媒体管理', '管理员权限体系', '适合 GitHub + Cloudflare Pages 长期运营']),
    cta_text: '咨询旗舰方案',
    cta_url: 'https://t.me/aiclawchuhai',
    is_active: 1
  }
];

const DEFAULT_LANDING_PAGES = [
  {
    page_type: 'home',
    slug: 'home',
    title: 'AI外贸获客软件官网',
    subtitle: '适合长期搜索排名、询盘转化、内容增长和管理员持续维护的出海官网系统。',
    summary: '把 TikTok、WhatsApp、社媒矩阵、AI广告、AI客服、文章 SEO / GEO 和 CRM 统一到一个长期运行的网站里。',
    target_keyword: 'AI外贸获客软件',
    meta_title: 'AI外贸获客软件官网｜SEO / GEO / TikTok / WhatsApp / AI广告 / CRM',
    meta_description: 'AI外贸获客软件官网模板与后台系统，适合 GitHub + Cloudflare Pages 部署。支持 CMS、CRM、SEO、GEO、文章矩阵、价格管理、插件化区块。',
    hero_json: JSON.stringify({
      badge: '长期运行，不是临时站',
      quickAnswer: '如果你卖的是 AI 外贸获客软件，你的官网核心任务不是“看起来高级”，而是“持续收录 + 精准转化 + 后台可迭代”。',
      definition: '本网站以全渠道 AI 拓客资料为底稿，重构为一个更适合搜索收录、AI 检索与询盘转化的长期运营型官网。',
      bullets: ['文章、方案页、FAQ、行业页一起做收录', '后台可改价格、改文案、改外链、改区块', '线索自动进入 CRM，并保留来源页与 UTM'],
      ctaPrimaryText: '查看核心方案',
      ctaPrimaryUrl: '/solutions/ai-foreign-trade-growth-platform',
      ctaSecondaryText: '直接沟通',
      ctaSecondaryUrl: 'https://wa.me/85252195605'
    }),
    sections_json: JSON.stringify([
      {
        type: 'pain-points',
        title: '你的官网为什么不赚钱',
        items: [
          '流量来了，但没有把访客导向 Telegram / WhatsApp / 微信。',
          '页面只讲功能，不讲场景，不做搜索问题承接。',
          '没有文章系统、FAQ、行业页、对比页，搜索引擎和 AI 都抓不到足够语义信号。',
          '没有后台统一管理价格、外链、插件区块和线索状态，后续越做越乱。'
        ]
      },
      {
        type: 'feature-grid',
        title: '你真正需要的一套官网系统',
        items: [
          { title: 'CMS 内容后台', desc: '可管理首页、方案页、文章、FAQ、价格表与外链池。' },
          { title: 'CRM 线索管理', desc: '记录来源页、UTM、留言内容、跟进状态和备注。' },
          { title: 'SEO / GEO', desc: 'Sitemap、RSS、llms.txt、FAQ 结构化数据、Answer Block 一并准备。' },
          { title: '插件化区块', desc: '可上传 JSON 插件，更新某个页面区块，不必改整站代码。' },
          { title: 'Cloudflare Pages 架构', desc: '适合 GitHub 版本管理、全球访问、长期运行。' },
          { title: '多渠道引流', desc: 'Telegram、WhatsApp、微信三端都可以在前台持续承接。' }
        ]
      },
      {
        type: 'workflow',
        title: '官网与产品能力如何衔接',
        items: ['搜索关键词进入文章或方案页', '页面内容解释产品价值并筛选意向', 'CTA 直达 Telegram / WhatsApp / 微信', '线索写入 CRM，方便后续分配与跟进', '后台再用 TikTok / 社媒矩阵 / 广告放大流量']
      }
    ]),
    faq_json: JSON.stringify([]),
    schema_type: 'SoftwareApplication',
    status: 'published'
  },
  {
    page_type: 'solution',
    slug: 'ai-foreign-trade-growth-platform',
    title: 'AI全渠道聚合拓客 SaaS 平台',
    subtitle: '用一个官网讲清楚你卖的不是单点工具，而是全链路增长系统。',
    summary: '围绕 TikTok AI 拓客、WhatsApp AI 生态、社媒 AI 矩阵、AI广告和 AI客服，搭建更适合搜索排名与询盘转化的官网入口。',
    target_keyword: 'AI全渠道聚合拓客 SaaS',
    meta_title: 'AI全渠道聚合拓客 SaaS｜适合外贸企业的官网、内容与询盘闭环',
    meta_description: '把 TikTok、WhatsApp、社媒矩阵、广告、AI客服整合到一个对搜索友好的官网叙事中，用方案页承接高意向询盘。',
    hero_json: JSON.stringify({
      badge: '核心总入口',
      quickAnswer: '先卖“系统”，再卖“模块”，搜索流量更容易理解你到底解决什么问题。',
      definition: '全渠道聚合拓客 SaaS 平台，是把短视频矩阵、社媒矩阵、广告、客服、线索承接、内容收录都打通的一整套获客系统。',
      bullets: ['适合主页或核心方案页', '能把分散资料收束成统一商业表达', '方便延展多个子方案页'],
      targetAudience: ['需要长期 SEO 排名的团队', '正在投 TikTok / Facebook / WhatsApp 广告的团队', '想做矩阵化内容获客的团队']
    }),
    sections_json: JSON.stringify([
      {
        type: 'feature-grid',
        title: '资料里最值得放大的六个核心模块',
        items: [
          { title: 'TikTok AI拓客', desc: '短视频翻译、混剪、数字人、矩阵发布、强私、AI智播。' },
          { title: 'WhatsApp AI生态', desc: '采集、筛选、群发、超级号、API客服、超链闭环。' },
          { title: '社媒 AI 矩阵', desc: 'Facebook、Instagram、Twitter、Telegram、YouTube、Google AI SEO。' },
          { title: 'AI广告增长', desc: '直连 WhatsApp 广告与 FB / TikTok 二筛广告。' },
          { title: 'AI客服', desc: '多语言翻译、快捷回复、分流、智能体、广告回传。' },
          { title: '内容与收录', desc: '官网、文章、FAQ、行业页、外链池，持续吃搜索流量。' }
        ]
      },
      {
        type: 'comparison',
        title: '为什么不能只做一张单页',
        rows: [
          ['单页展示', '信息集中，但搜索入口少、迭代弱、无法持续扩词'],
          ['方案页矩阵', '每个模块都能独立拿词，兼顾 SEO 与转化'],
          ['文章 + FAQ + 行业页', '适合做长尾词、AI检索、问题型流量'],
          ['后台可维护体系', '价格、外链、插件区块、线索状态都能持续更新']
        ]
      },
      {
        type: 'cta-strip',
        title: '你卖的是 AI 外贸获客系统，官网就应该长成系统型资产',
        description: '这类官网不是一次性交付，而是持续上新页面、持续扩词、持续承接询盘。'
      }
    ]),
    faq_json: JSON.stringify([]),
    schema_type: 'SoftwareApplication',
    status: 'published'
  },
  {
    page_type: 'solution',
    slug: 'tiktok-ai-lead-generation',
    title: 'TikTok AI 拓客方案',
    subtitle: '把 TikTok 相关能力从“功能列表”改写成更容易成交的搜索落地页。',
    summary: '围绕 AI视频翻译、批量混剪、换脸、数字人、矩阵发布、强私与 AI智播，形成 TikTok 外贸获客的搜索承接页。',
    target_keyword: 'TikTok AI 拓客',
    meta_title: 'TikTok AI 拓客｜矩阵翻译、混剪、数字人、强私到 WhatsApp',
    meta_description: '适合外贸企业的 TikTok AI 拓客方案页：从视频生产、矩阵发布到私信导流 WhatsApp，承接搜索与广告流量。',
    hero_json: JSON.stringify({
      badge: 'TikTok 模块',
      quickAnswer: 'TikTok 页面不能只写“我们能发视频”，而要写“如何从内容生产一直做到 WhatsApp 承接”。',
      definition: 'TikTok AI 拓客是通过 AIGC 视频生成、矩阵发布、AI 智播和私信导流，把短视频流量变成可跟进线索。',
      bullets: ['AI短视频翻译', 'AI批量混剪', 'AI换脸 / 数字人', '官方 API / 真机矩阵发布', 'TikTok 强私导流 WhatsApp']
    }),
    sections_json: JSON.stringify([
      {
        type: 'process',
        title: '页面应该怎么讲 TikTok 获客闭环',
        items: ['导入原视频或产品链接', 'AI 生成多语言短视频', '矩阵账号批量发布', '强私或评论区导流到 WhatsApp', '进入 CRM 持续跟进']
      },
      {
        type: 'feature-grid',
        title: '适合放进页面的 TikTok 能力点',
        items: [
          { title: '翻译与本地化', desc: '把抖音 / 中文内容转成适合 TikTok 海外分发的多语版本。' },
          { title: '批量混剪', desc: '自动去重、拉开原创度，扩大素材产能。' },
          { title: '数字人视频', desc: '导入产品图或链接即可快速生成出海短视频素材。' },
          { title: '矩阵发布', desc: '适合多账号运营、持续曝光和内容测试。' }
        ]
      }
    ]),
    faq_json: JSON.stringify([]),
    schema_type: 'Service',
    status: 'published'
  },
  {
    page_type: 'solution',
    slug: 'whatsapp-ai-lead-generation',
    title: 'WhatsApp AI 采集筛选群发方案',
    subtitle: '把 WhatsApp 从“沟通工具”变成可被搜索的获客系统。',
    summary: '适合写成一个高转化方案页，突出全球号码采集、活跃度筛选、群发、超级号、API客服、超链跳转与多语言 AI 沟通。',
    target_keyword: 'WhatsApp AI 获客',
    meta_title: 'WhatsApp AI 获客｜采集、筛选、群发、AI客服与 CRM 线索闭环',
    meta_description: '用 WhatsApp AI 采集、筛选、群发、超级号、API客服和超链功能，把流量转成可以持续跟进的询盘资产。',
    hero_json: JSON.stringify({
      badge: 'WhatsApp 模块',
      quickAnswer: '高意向线索最适合直接进入 WhatsApp，但官网要先解释你如何拿到、筛选并跟进这些线索。',
      definition: 'WhatsApp AI 获客，是通过多渠道数据采集、活跃度筛选、群发触达、客服翻译和链接承接构成的完整系统。',
      bullets: ['全球号码与活跃号采集', '国家 / 城市 / 语言维度筛选', '群发与 API 客服', '超级号与广告回传', '跳转任意链接的超链功能']
    }),
    sections_json: JSON.stringify([
      {
        type: 'feature-grid',
        title: '为什么这个页面值得单独做',
        items: [
          { title: '收录词多', desc: 'WhatsApp 采集、WhatsApp 筛选、WhatsApp 群发、WhatsApp AI客服都能独立承接。' },
          { title: '转化链短', desc: '用户点击后就能直接打开 WhatsApp 沟通。' },
          { title: '和 CRM 天然连接', desc: '所有表单与按钮点击都能在后台留痕。' },
          { title: '能承接广告流量', desc: '尤其适合 WhatsApp 直连广告与二筛广告页面。' }
        ]
      },
      {
        type: 'pain-points',
        title: '客户搜索这类方案时通常在担心什么',
        items: ['采集到的号码是否精准', '是否能筛出活跃用户', '群发会不会很重人工', '客服能否多语言同步跟进', '广告流量如何直达 WhatsApp']
      }
    ]),
    faq_json: JSON.stringify([]),
    schema_type: 'Service',
    status: 'published'
  },
  {
    page_type: 'solution',
    slug: 'social-media-ai-matrix',
    title: '社媒 AI 矩阵与 Google AI SEO 方案',
    subtitle: '不是单平台拉粉，而是把多个社媒平台与搜索入口一起做。',
    summary: 'Facebook、Instagram、Twitter、Telegram、YouTube、Google AI SEO 等能力，可以拆成内容型矩阵页与数据采集型矩阵页。',
    target_keyword: '社媒 AI 矩阵',
    meta_title: '社媒 AI 矩阵｜Facebook / Instagram / Twitter / Telegram / Google AI SEO',
    meta_description: '围绕多平台采集、RPA矩阵、邮件短信触达、Google AI SEO 和矩阵运营，搭建更适合外贸搜索增长的社媒方案页。',
    hero_json: JSON.stringify({
      badge: '社媒矩阵模块',
      quickAnswer: '如果你想拿“社媒获客”相关搜索词，就需要把矩阵、采集、SEO、群发拆成更清晰的页面结构。',
      definition: '社媒 AI 矩阵，是以 AI 采集 + RPA 执行 + 多账号矩阵为核心，把社媒触达和搜索分发合并的一种获客模型。',
      bullets: ['Facebook / Instagram / Twitter 采集', 'Telegram / YouTube 采集', '安卓矩阵 / 指纹矩阵 / iOS 真机矩阵', 'Google AI SEO 与国际外链']
    }),
    sections_json: JSON.stringify([
      {
        type: 'feature-grid',
        title: '搜索流量更喜欢这种表达',
        items: [
          { title: '平台维度清晰', desc: '每个平台都能扩展独立子页与案例页。' },
          { title: '问题导向明确', desc: '采集、霸屏、群发、SEO 各自对应不同搜索意图。' },
          { title: '外链资源池好承接', desc: '更适合自动挂载行业资源与权威参考链接。' },
          { title: '方便长期扩站', desc: '后续可继续做 Telegram、LinkedIn、Google 等专题页。' }
        ]
      }
    ]),
    faq_json: JSON.stringify([]),
    schema_type: 'Service',
    status: 'published'
  },
  {
    page_type: 'solution',
    slug: 'ai-advertising-whatsapp-funnel',
    title: 'AI 广告与 WhatsApp 转化漏斗方案',
    subtitle: '把投放页从“素材展示”改写成“广告到私域”的闭环页。',
    summary: '围绕 WhatsApp 直连广告、Facebook AI 二筛广告、TikTok AI 二筛广告，把广告触达、智能筛选、线索回传写成可转化的方案页。',
    target_keyword: 'AI 广告 WhatsApp 转化',
    meta_title: 'AI广告与 WhatsApp 转化｜直连广告、二筛广告、Messenger / TikTok 私信筛选',
    meta_description: '把 WhatsApp 直连广告、Facebook 与 TikTok AI 二筛广告做成方案页，承接投放意图词与高意向流量。',
    hero_json: JSON.stringify({
      badge: '广告模块',
      quickAnswer: '广告页最怕只讲“会投放”，真正能打动客户的是“怎么把流量筛到 WhatsApp 并证明 ROI”。',
      definition: 'AI 广告方案页的核心，不是展示后台截图，而是解释你的广告如何通过智能筛选进入更高意向的沟通链路。',
      bullets: ['筛选同行素材', 'AI生成广告文案与素材', 'Messenger / TikTok 私信二筛', '高质量粉丝导入 WhatsApp']
    }),
    sections_json: JSON.stringify([
      {
        type: 'comparison',
        title: '为什么广告页也要做 SEO / GEO',
        rows: [
          ['只投广告', '预算一停，页面就没有新增访问'],
          ['广告 + 搜索方案页', '可以同时接搜索意图词和广告流量，降低获客波动'],
          ['广告 + CRM 后台', '广告点击、咨询来源、转化备注能回到统一线索池']
        ]
      },
      {
        type: 'process',
        title: '页面里的理想叙事顺序',
        items: ['展示广告前的筛选逻辑', '解释 AI 生成创意与定向方式', '说明二筛机制如何过滤低质流量', '把最终沟通场景落到 WhatsApp', '附上 FAQ 处理 ROI、质量与跟进问题']
      }
    ]),
    faq_json: JSON.stringify([]),
    schema_type: 'Service',
    status: 'published'
  },
  {
    page_type: 'solution',
    slug: 'ai-customer-service-whatsapp',
    title: 'WhatsApp AI 客服与多语言询盘转化方案',
    subtitle: '把“有人回复”升级成“有系统地转化询盘”。',
    summary: '适合放大超级号、API客服、快捷回复、实时翻译、智能体、多端协同与广告回传能力，承接客服型搜索词与售前沟通流量。',
    target_keyword: 'WhatsApp AI 客服',
    meta_title: 'WhatsApp AI客服｜多语言翻译、智能分流、广告回传与询盘跟进',
    meta_description: '围绕 WhatsApp 超级号、API客服、智能体、多语言翻译和广告回传，打造适合外贸询盘转化的客服方案页。',
    hero_json: JSON.stringify({
      badge: '客服模块',
      quickAnswer: '外贸官网的最后一公里，不是“表单提交成功”，而是“线索进入可持续回复的多语言客服系统”。',
      definition: 'WhatsApp AI 客服，是结合翻译、快捷回复、智能体、分流、广告回传与多账号管理的询盘转化中枢。',
      bullets: ['超级号：翻译 / 快捷回复 / 广告回传', 'API 客服：智能体 / 分流回复 / APP端', '超链：群发消息跳转任意链接']
    }),
    sections_json: JSON.stringify([
      {
        type: 'feature-grid',
        title: '为什么客服页值得拿来吃搜索流量',
        items: [
          { title: '贴近成交', desc: '客户搜索客服类词时，通常已经接近采购决策。' },
          { title: '高频问题集中', desc: '翻译、分流、回传、快捷回复都可展开 FAQ。' },
          { title: '可承接多端 CTA', desc: 'Telegram、WhatsApp、微信都能同步挂载。' },
          { title: '易形成案例页', desc: '适合按行业沉淀客服场景案例。' }
        ]
      }
    ]),
    faq_json: JSON.stringify([]),
    schema_type: 'Service',
    status: 'published'
  },
  {
    page_type: 'solution',
    slug: 'google-ai-seo-geo',
    title: 'Google AI SEO / GEO 官网增长方案',
    subtitle: '为了搜索引擎收录，也为了 AI 检索系统更快理解你。',
    summary: '围绕 llms.txt、FAQ、语义聚类页面、结构化数据、外链资源池、内容矩阵和可持续更新的后台，构建更适合长期排名的出海官网。',
    target_keyword: 'Google AI SEO GEO',
    meta_title: 'Google AI SEO / GEO｜适合 AI 外贸获客软件的长期排名官网',
    meta_description: '把 SEO 与 GEO 统一起来：用文章、FAQ、方案页、行业页、外链资源池、Sitemap、RSS、llms.txt 帮助搜索与 AI 检索更快理解官网。',
    hero_json: JSON.stringify({
      badge: 'SEO / GEO 模块',
      quickAnswer: '想要官网长期排名，不能只做 meta 标签，而要做完整的页面体系和后台更新能力。',
      definition: '这里的 GEO 指生成式引擎优化：让 AI 检索系统更容易抓到你的定义、答案、场景、FAQ、结构化数据和可信链接。',
      bullets: ['主页 + 方案页 + 文章页 + FAQ + 行业页', 'Sitemap / RSS / llms.txt', '语义化问答块与定义块', '可被后台持续更新的内容结构']
    }),
    sections_json: JSON.stringify([
      {
        type: 'feature-grid',
        title: '这个页面要承接的核心搜索意图',
        items: [
          { title: 'AI外贸官网怎么做 SEO', desc: '解释页面结构与关键词集群。' },
          { title: 'GEO 怎么做', desc: '解释 AI 检索为什么需要定义、FAQ、答案块和规范文件。' },
          { title: 'Cloudflare Pages 能否做后台', desc: '解释 D1 / R2 / Pages Functions 如何支撑长期运营。' },
          { title: '代码如何自动加外链', desc: '解释外链池如何基于分类与关键词注入到页面中。' }
        ]
      }
    ]),
    faq_json: JSON.stringify([]),
    schema_type: 'Service',
    status: 'published'
  },
  {
    page_type: 'industry',
    slug: 'wigs-industry-lead-generation',
    title: '假发行业 AI 外贸获客方案',
    subtitle: '适合展示广告与客服案例，也适合做行业词落地。',
    summary: '围绕假发行业的短视频内容、广告素材、WhatsApp 询盘与客服跟进，搭建行业型获客页面。',
    target_keyword: '假发行业外贸获客',
    meta_title: '假发行业 AI 外贸获客方案｜TikTok + WhatsApp + AI广告 + 客服',
    meta_description: '针对假发行业的外贸获客方案页，适合做行业词 SEO / GEO 以及广告落地页。',
    hero_json: JSON.stringify({
      badge: '行业页',
      quickAnswer: '行业页的价值在于让搜索词更垂直，也让案例更可信。',
      definition: '假发行业页面建议用“内容展示 + 广告转化 + WhatsApp 跟进 + AI客服”四段式结构。',
      bullets: ['行业关键词更聚焦', '容易放案例和素材', '转化动作更具体']
    }),
    sections_json: JSON.stringify([
      {
        type: 'pain-points',
        title: '这个行业常见的页面问题',
        items: ['只放产品图，没有流量入口设计', '广告与站点内容脱节', '没有把 WhatsApp 作为核心转化动作', '客服跟进缺少多语言与快捷回复能力']
      }
    ]),
    faq_json: JSON.stringify([]),
    schema_type: 'Service',
    status: 'published'
  },
  {
    page_type: 'industry',
    slug: 'cosmetics-industry-lead-generation',
    title: '化妆品行业 AI 外贸获客方案',
    subtitle: '适合做社媒矩阵、广告、内容与客服联动。',
    summary: '化妆品行业适合借助短视频、社媒矩阵、广告与 WhatsApp 形成更快的询盘闭环。',
    target_keyword: '化妆品行业外贸获客',
    meta_title: '化妆品行业 AI 外贸获客方案｜社媒矩阵 + 广告 + WhatsApp',
    meta_description: '面向化妆品行业的外贸获客落地页，适合做行业词收录与转化承接。',
    hero_json: JSON.stringify({
      badge: '行业页',
      quickAnswer: '化妆品类搜索词更看重内容展示和转化动作的衔接。',
      definition: '这类页面建议突出视频素材生产、社媒矩阵霸屏、广告导流和客服跟进。',
      bullets: ['适合短视频内容获客', '适合广告二筛', '适合多语言客服']
    }),
    sections_json: JSON.stringify([]),
    faq_json: JSON.stringify([]),
    schema_type: 'Service',
    status: 'published'
  },
  {
    page_type: 'industry',
    slug: 'machinery-industry-lead-generation',
    title: '机械行业 AI 外贸获客方案',
    subtitle: '适合用 Google AI SEO、社媒矩阵与 WhatsApp 询盘做高客单线索。',
    summary: '机械行业的页面更需要解决高客单、长决策周期、跨语言沟通和高质量询盘筛选。',
    target_keyword: '机械行业外贸获客',
    meta_title: '机械行业 AI 外贸获客方案｜Google AI SEO + 社媒矩阵 + WhatsApp',
    meta_description: '机械行业外贸获客方案页，适合承接高客单搜索流量与长线询盘跟进。',
    hero_json: JSON.stringify({
      badge: '行业页',
      quickAnswer: '高客单行业更适合“搜索教育 + WhatsApp 深沟通 + CRM 线索沉淀”的页面架构。',
      definition: '机械行业页面建议强调全球市场、精准采集、询盘筛选、多语言客服与内容解释能力。',
      bullets: ['更强调精准线索', '更强调多语言沟通', '更适合做 FAQ 和场景页']
    }),
    sections_json: JSON.stringify([]),
    faq_json: JSON.stringify([]),
    schema_type: 'Service',
    status: 'published'
  }
];

const DEFAULT_ARTICLES = [
  {
    slug: 'ai-waimao-huoke-ruanjian-shi-shenme',
    title: 'AI外贸获客软件是什么？官网应该怎么讲，才能拿到搜索排名和真实询盘',
    excerpt: '这篇文章用官网搭建视角解释：什么是 AI 外贸获客软件，为什么单页不够，为什么需要文章、FAQ、方案页和 CRM 后台一起工作。',
    content_md: `## 先说结论

AI外贸获客软件，不应该被官网写成“一个功能列表”，而应该被写成“一个持续获客系统”。

对搜索引擎来说，它需要看到：你解决的场景、你覆盖的平台、你如何转化线索、你是否有持续更新能力。

对潜在客户来说，他更关心的是：**你能不能帮我找到客户、把流量接住、把询盘转起来。**

## 为什么很多官网不转化

- 页面只堆模块名，没有解释获客闭环。
- 没有文章页和 FAQ，无法承接问题型搜索。
- 没有行业页和方案页，搜索意图过于混杂。
- 没有后台，价格、内容、线索、外链都无法持续维护。

## 一个更适合长期运营的官网应该包含什么

### 1. 首页讲清系统价值
首页负责解释你卖的是整体方案，而不是某个单点工具。

### 2. 方案页负责拿高意向关键词
例如：TikTok AI 拓客、WhatsApp AI 获客、AI广告转化、AI客服、Google AI SEO。

### 3. 文章页负责拿问题词
文章适合承接“是什么、怎么做、为什么、对比、案例、行业应用”等长尾搜索。

### 4. FAQ 和结构化数据负责提升 AI 检索理解
FAQ、定义块、答案块、Sitemap、RSS、llms.txt，都是帮助搜索和 AI 检索理解你网站的基础设施。

### 5. 后台负责长期更新
长期排名的网站，一定不是一次性交付的。你需要一个后台，持续改内容、改价格、改区块、改外链、跟进线索。

## 为什么你更适合做系统型官网

如果你的产品本身就包含 TikTok、WhatsApp、社媒矩阵、广告、AI客服，那么搜索引擎最喜欢的不是一张页面讲完所有内容，而是一个清晰的站点结构。

## 最后

如果你想要的是“看起来不错”的页面，单页就够了。
如果你想要的是“长期收录 + 长期获客 + 长期维护”，那就必须把官网做成系统。`,
    cover_url: '',
    author_name: 'AICL 出海增长团队',
    category: '官网策略',
    tags_json: JSON.stringify(['AI外贸获客软件', 'SEO', 'GEO', 'CMS', 'CRM']),
    target_keyword: 'AI外贸获客软件',
    meta_title: 'AI外贸获客软件是什么？官网怎么做才能拿到搜索排名与询盘',
    meta_description: '从官网结构、SEO / GEO、方案页、文章页、FAQ、后台维护和线索 CRM 的角度，解释 AI 外贸获客软件应该怎样展示。',
    status: 'published'
  },
  {
    slug: 'tiktok-ai-huoke-daowhatsapp-bihuan',
    title: 'TikTok AI 拓客如何把流量导到 WhatsApp：更适合成交的落地页应该怎么写',
    excerpt: '很多 TikTok 页面只会说发视频，这篇文章从视频生产、矩阵发布、强私导流和 WhatsApp 跟进四步拆解。',
    content_md: `## 为什么 TikTok 页面常常有播放没转化

原因不是没有流量，而是没有把页面写成“从内容到沟通”的闭环。

## 一条更适合成交的叙事线

1. **AI 生产内容**：翻译、混剪、换脸、数字人、链接生成视频。
2. **矩阵化发布**：多账号、多语言、多场景持续测试。
3. **强私与评论导流**：把有兴趣的人导到更适合深沟通的 WhatsApp。
4. **客服 / CRM 跟进**：把沟通过程沉淀下来，而不是聊完就算。

## 为什么这个主题值得单独做页面

- 可以承接 TikTok 获客、TikTok 外贸、TikTok 导 WhatsApp 等词。
- 页面既能给搜索引擎看，也能给广告流量看。
- 和案例、行业页结合之后，非常适合扩站。

## 页面里要写什么

### 写“闭环”而不是写“发布”
你真正卖的不是发视频能力，而是用 TikTok 获取客户的能力。

### 写“场景”而不是写“术语”
客户更想知道：如果我是做假发、化妆品、机械、B2B 制造，我应该怎么用。

### 写“转化动作”而不是写“按钮”
最好的 CTA，不是“联系我们”，而是明确告诉用户可以直接去 Telegram、WhatsApp 或提交表单进入 CRM。

## 最后

TikTok 页面一旦写对，它不仅是介绍页，还是增长页、转化页和搜索页。`,
    cover_url: '',
    author_name: 'AICL 出海增长团队',
    category: 'TikTok 获客',
    tags_json: JSON.stringify(['TikTok', 'WhatsApp', 'AI视频', '外贸获客']),
    target_keyword: 'TikTok AI 拓客',
    meta_title: 'TikTok AI 拓客如何导流到 WhatsApp：外贸落地页写法',
    meta_description: '从视频生产、矩阵发布、强私导流到 WhatsApp 跟进，讲清楚 TikTok AI 拓客页面为什么要按闭环来写。',
    status: 'published'
  },
  {
    slug: 'whatsapp-ai-caiji-shaixuan-qunfa-zenmezuo',
    title: 'WhatsApp AI 采集、筛选、群发怎么做，官网页应该突出哪些关键词和转化动作',
    excerpt: '如果你卖的是 WhatsApp 获客系统，这篇文章可以直接作为内容页和 FAQ 的骨架。',
    content_md: `## 用户真正想搜的不是“工具”，而是“线索能不能来”

围绕 WhatsApp 的搜索，大多集中在以下几类：

- 怎么采集号码
- 怎么筛选活跃度
- 怎么群发
- 如何用 API 客服回复
- 如何把广告流量导到 WhatsApp

## 官网内容应该怎么写

### 先解释数据入口
号码、地区、语言、行业、社媒数据、商业数据、海关数据都可以是解释入口。

### 再解释筛选逻辑
不是拿到号码就结束，而是要解释如何筛选活跃度与匹配度。

### 再解释触达与跟进
群发只是开始，后面要接超级号、API 客服、快捷回复、多语言翻译与 CRM 记录。

## 为什么 WhatsApp 页面适合拿来做搜索转化

- 词多，意图明确。
- CTA 自然，跳转动作短。
- 页面既能做方案页，也能做行业页与广告页。

## 文章可以怎么拆

1. WhatsApp AI 采集是什么
2. WhatsApp 活跃号怎么筛选
3. WhatsApp 群发有哪些场景
4. WhatsApp AI 客服如何提升转化
5. WhatsApp 广告怎么做闭环

## 最后

任何一个页面，如果最终不能把用户导到 WhatsApp 或写入 CRM，就只完成了展示，没有完成增长。`,
    cover_url: '',
    author_name: 'AICL 出海增长团队',
    category: 'WhatsApp 获客',
    tags_json: JSON.stringify(['WhatsApp', '号码采集', 'AI筛选', '群发', 'AI客服']),
    target_keyword: 'WhatsApp AI 获客',
    meta_title: 'WhatsApp AI 采集、筛选、群发怎么做？官网关键词与转化动作拆解',
    meta_description: '从号码采集、活跃度筛选、群发、API 客服和广告闭环，解释 WhatsApp AI 获客型官网该如何布局内容。',
    status: 'published'
  },
  {
    slug: 'facebook-tiktok-ai-guanggao-er-shai-zhuanhua',
    title: 'Facebook / TikTok AI 二筛广告，为什么更适合做成“广告 + WhatsApp”转化页',
    excerpt: '广告不是单独存在的。真正有转化价值的是：广告触达、AI 二筛、WhatsApp 承接、CRM 跟进。',
    content_md: `## 为什么很多广告页讲不清楚

因为它们把重点放在“投放后台”，而不是“线索质量”。

## 什么是二筛广告

二筛的核心是：第一层让广告接触到目标人群，第二层再用智能体、私信或 Messenger 互动筛掉低质量流量。

## 为什么它适合配合 WhatsApp

- WhatsApp 更适合深沟通。
- 用户从广告跳过来之后，路径更短。
- 后台可以记录来源页、留言与跟进状态。

## 页面里应该回答的问题

### 1. 为什么不是所有点击都值得跟进
解释 AI 二筛如何筛掉低质互动。

### 2. 广告素材怎么来
解释如何筛选同行素材、生成广告创意、提高冷启动效率。

### 3. 最终怎样回到成交链路
解释为什么要落到 WhatsApp 和 CRM。

## 做成搜索页的价值

就算广告预算波动，这个页面仍然可以承接“Facebook 二筛广告”“TikTok AI 广告”“WhatsApp 直连广告”等搜索意图。`,
    cover_url: '',
    author_name: 'AICL 出海增长团队',
    category: 'AI广告',
    tags_json: JSON.stringify(['Facebook 广告', 'TikTok 广告', 'AI 二筛', 'WhatsApp']),
    target_keyword: 'AI 广告 WhatsApp 转化',
    meta_title: 'Facebook / TikTok AI 二筛广告：更适合 WhatsApp 转化的页面写法',
    meta_description: '把 AI 二筛广告写成可承接搜索与广告流量的方案页，用 WhatsApp 与 CRM 构建更完整的转化闭环。',
    status: 'published'
  },
  {
    slug: 'google-ai-seo-geo-waimao-guanwang',
    title: 'Google AI SEO / GEO 怎么做：AI 外贸获客官网为什么要有 FAQ、llms.txt、外链池和语义页面',
    excerpt: '如果你要做 AI 检索友好型官网，这篇文章会告诉你：为什么只改标题和描述是不够的。',
    content_md: `## SEO 和 GEO 不冲突

SEO 解决的是搜索结果排名，GEO 解决的是 AI 检索系统如何更快理解你的站点内容。

## 一个 AI 检索友好型官网至少要有这些

- 主页：解释你卖什么。
- 方案页：解释每个模块解决什么问题。
- 文章页：承接问题型搜索。
- FAQ：给搜索和 AI 一个更干净的问答结构。
- 行业页：承接更垂直的需求。
- Sitemap / RSS / llms.txt：提供规范化入口。

## 什么叫“语义页面”

语义页面不是堆关键词，而是围绕一个主题持续解释定义、场景、对比、流程、问题和答案。

## 为什么还要做外链池

外链池不是为了刷，而是为了让站点具备更清晰的资源引用能力。建议只保留权威、相关、可信的资源。

## 为什么后台很重要

GEO 最大的问题不是“第一次怎么做”，而是“以后怎么持续更新”。所以你需要后台，而不是靠改源码维持站点。`,
    cover_url: '',
    author_name: 'AICL 出海增长团队',
    category: 'SEO / GEO',
    tags_json: JSON.stringify(['SEO', 'GEO', 'Google AI SEO', 'llms.txt', 'FAQ']),
    target_keyword: 'Google AI SEO GEO',
    meta_title: 'Google AI SEO / GEO 怎么做？AI 外贸官网需要 FAQ、llms.txt、语义页面',
    meta_description: '讲清楚 AI 外贸获客官网为什么需要 FAQ、llms.txt、外链池、文章矩阵和后台持续更新能力。',
    status: 'published'
  },
  {
    slug: 'ai-kefu-duoyuyan-xunpan-zhuanhua',
    title: 'AI 客服、多语言翻译与询盘转化：为什么客服页是外贸官网的最后一公里',
    excerpt: '客服页不只是售后，它更像官网转化的底盘。尤其是当你的 CTA 都导向 Telegram、WhatsApp 与微信时。',
    content_md: `## 询盘不是表单结束，而是沟通开始

很多官网把表单提交成功当成终点，但真正的转化发生在后面的沟通里。

## 为什么 AI 客服值得做成独立页面

- 搜索意图更接近成交。
- 多语言需求强。
- 和 WhatsApp / Telegram 直接衔接。

## 一个更好的客服页应该包含什么

### 1. 快捷回复与多语言翻译
让客户知道沟通不会卡在语言上。

### 2. 智能体与分流
让客户知道不是所有咨询都要靠人工重复处理。

### 3. 广告回传与来源识别
让客户知道每条线索来自哪里。

### 4. CRM 跟进
让客户知道信息不会丢失，团队可以继续跟进。

## 最后

如果首页负责解释价值，方案页负责解释模块，文章负责承接问题，那么客服页负责把“想了解”推进到“开始沟通”。`,
    cover_url: '',
    author_name: 'AICL 出海增长团队',
    category: 'AI 客服',
    tags_json: JSON.stringify(['AI客服', '多语言翻译', 'WhatsApp', 'CRM', '询盘转化']),
    target_keyword: 'WhatsApp AI 客服',
    meta_title: 'AI 客服、多语言翻译与询盘转化：外贸官网的最后一公里',
    meta_description: '解释为什么 AI 客服页是 Telegram / WhatsApp / 微信导流后的关键转化节点，以及如何把询盘沉淀到 CRM。',
    status: 'published'
  }
];

const DEFAULT_FAQS = [
  { scope: 'global', scope_slug: '', question: '这套官网适合什么类型的企业？', answer: '适合卖 AI 外贸获客软件、出海 SaaS、外贸营销服务、跨境社媒获客方案的团队，尤其适合需要长期搜索排名与内容增长的企业。', sort_order: 1, is_active: 1 },
  { scope: 'global', scope_slug: '', question: '为什么不是做一个简单单页？', answer: '因为单页更像展示物料，而不是长期增长资产。要做搜索排名与 AI 检索，必须要有文章、FAQ、方案页、行业页和后台持续更新能力。', sort_order: 2, is_active: 1 },
  { scope: 'global', scope_slug: '', question: '后台能改价格吗？', answer: '可以。价格表已做成后台可维护模块，你可以在管理员面板直接修改价格名称、说明、CTA 与展示顺序。', sort_order: 3, is_active: 1 },
  { scope: 'global', scope_slug: '', question: '支持 GitHub + Cloudflare Pages 吗？', answer: '支持。项目已按 Cloudflare Pages + Pages Functions + D1 + R2 的长期运行架构设计，适合 GitHub 管理与持续部署。', sort_order: 4, is_active: 1 },
  { scope: 'global', scope_slug: '', question: '插件上传是什么意思？', answer: '本项目实现的是适合长期运维的区块插件机制：可以在后台导入 JSON / HTML 结构化插件，更新某个页面模块，不必整体改代码。默认不开放任意执行型脚本，以保证安全。', sort_order: 5, is_active: 1 },
  { scope: 'global', scope_slug: '', question: 'CRM 里会记录什么？', answer: '会记录来源页、UTM、联系方式、留言、状态、备注和更新时间，方便后续销售跟进。', sort_order: 6, is_active: 1 },
  { scope: 'solution', scope_slug: 'tiktok-ai-lead-generation', question: 'TikTok 页面为什么还要做 SEO？', answer: '因为 TikTok 获客相关搜索词很多，方案页既能承接搜索意图，也能作为广告落地页，提高整体内容资产价值。', sort_order: 1, is_active: 1 },
  { scope: 'solution', scope_slug: 'whatsapp-ai-lead-generation', question: 'WhatsApp 页面为什么容易转化？', answer: '因为点击动作短，客户可以直接进入沟通，同时后台还能记录线索来源与留言，适合形成快速转化闭环。', sort_order: 1, is_active: 1 },
  { scope: 'solution', scope_slug: 'google-ai-seo-geo', question: 'GEO 具体体现在哪些页面元素？', answer: '主要体现在 FAQ、定义块、答案块、结构化数据、llms.txt、RSS、Sitemap 和语义清晰的内容结构。', sort_order: 1, is_active: 1 },
  { scope: 'solution', scope_slug: 'ai-advertising-whatsapp-funnel', question: 'AI 二筛广告为什么比普通广告页更适合写成方案页？', answer: '因为它能解释高质量线索是如何筛出来并进入 WhatsApp 的，这个叙事天然更适合拿搜索词与高意向询盘。', sort_order: 1, is_active: 1 }
];

const DEFAULT_OUTBOUND_LINKS = [
  { label: 'Google Search Central', url: 'https://developers.google.com/search', category: 'seo', keywords_json: JSON.stringify(['SEO', 'Google AI SEO', '收录']), placement: 'article', is_active: 1, authority_score: 95 },
  { label: 'Cloudflare Pages Docs', url: 'https://developers.cloudflare.com/pages/', category: 'cloudflare', keywords_json: JSON.stringify(['Cloudflare Pages', '部署', 'Pages Functions']), placement: 'article', is_active: 1, authority_score: 90 },
  { label: 'WhatsApp Business', url: 'https://www.whatsapp.com/business', category: 'whatsapp', keywords_json: JSON.stringify(['WhatsApp', '客服', '获客']), placement: 'article', is_active: 1, authority_score: 88 },
  { label: 'TikTok for Business', url: 'https://ads.tiktok.com/business/en', category: 'tiktok', keywords_json: JSON.stringify(['TikTok', '广告', '获客']), placement: 'article', is_active: 1, authority_score: 86 },
  { label: 'Meta for Business', url: 'https://www.facebook.com/business/', category: 'ads', keywords_json: JSON.stringify(['Facebook', '广告', '二筛']), placement: 'article', is_active: 1, authority_score: 86 },
  { label: 'Schema.org', url: 'https://schema.org', category: 'seo', keywords_json: JSON.stringify(['Schema', '结构化数据', 'GEO']), placement: 'footer', is_active: 1, authority_score: 84 }
];

const DEFAULT_PLUGINS = [
  {
    name: '首页可信证明条',
    slug: 'home-proof-strip',
    slot: 'home.afterHero',
    kind: 'stat-grid',
    title: '为什么这个站点更适合长期排名',
    config_json: JSON.stringify({
      items: [
        { value: '方案页 + 文章页', label: '同时承接高意向词与问题词' },
        { value: '后台可维护', label: '价格、FAQ、插件区块可持续更新' },
        { value: '线索回流 CRM', label: '所有咨询不会停留在聊天工具里' },
        { value: 'Cloudflare 架构', label: '适合长期全球访问与快速响应' }
      ]
    }),
    html_template: '',
    css_text: '',
    js_text: '',
    is_active: 1
  },
  {
    name: '全局底部 CTA',
    slug: 'global-bottom-cta',
    slot: 'global.bottomCTA',
    kind: 'cta-strip',
    title: '准备把官网做成长期增长资产了吗？',
    config_json: JSON.stringify({
      description: '你可以直接进入 Telegram / WhatsApp，也可以先提交需求进入后台 CRM。',
      ctaText: '进入 Telegram',
      ctaUrl: 'https://t.me/aiclawchuhai'
    }),
    html_template: '',
    css_text: '',
    js_text: '',
    is_active: 1
  }
];

const CRUD_RESOURCES = {
  'pricing-plans': {
    table: 'pricing_plans',
    pk: 'id',
    allowed: ['sort_order', 'name', 'audience', 'price_label', 'billing_cycle', 'highlights_json', 'cta_text', 'cta_url', 'is_active'],
    orderBy: 'sort_order ASC, id DESC',
    jsonFields: ['highlights_json']
  },
  'landing-pages': {
    table: 'landing_pages',
    pk: 'id',
    allowed: ['page_type', 'slug', 'title', 'subtitle', 'summary', 'target_keyword', 'meta_title', 'meta_description', 'hero_json', 'sections_json', 'faq_json', 'schema_type', 'status', 'published_at'],
    orderBy: 'updated_at DESC',
    jsonFields: ['hero_json', 'sections_json', 'faq_json']
  },
  articles: {
    table: 'articles',
    pk: 'id',
    allowed: ['slug', 'title', 'excerpt', 'content_md', 'cover_url', 'author_name', 'category', 'tags_json', 'target_keyword', 'meta_title', 'meta_description', 'status', 'published_at'],
    orderBy: 'published_at DESC, id DESC',
    jsonFields: ['tags_json']
  },
  'faq-items': {
    table: 'faq_items',
    pk: 'id',
    allowed: ['scope', 'scope_slug', 'question', 'answer', 'sort_order', 'is_active'],
    orderBy: 'scope ASC, scope_slug ASC, sort_order ASC, id ASC',
    jsonFields: []
  },
  'outbound-links': {
    table: 'outbound_links',
    pk: 'id',
    allowed: ['label', 'url', 'category', 'keywords_json', 'placement', 'is_active', 'authority_score'],
    orderBy: 'authority_score DESC, id DESC',
    jsonFields: ['keywords_json']
  },
  plugins: {
    table: 'plugins',
    pk: 'id',
    allowed: ['name', 'slug', 'slot', 'kind', 'title', 'config_json', 'html_template', 'css_text', 'js_text', 'is_active'],
    orderBy: 'updated_at DESC',
    jsonFields: ['config_json']
  }
};

function nowIso() {
  return new Date().toISOString();
}

function addDays(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function randomId(length = 24) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, length * 2);
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toBooleanNumber(value) {
  return value ? 1 : 0;
}

function normalizeDate(value) {
  if (!value) return nowIso();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return nowIso();
  return date.toISOString();
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const items = cookie.split(';').map((part) => part.trim()).filter(Boolean);
  for (const item of items) {
    const index = item.indexOf('=');
    if (index === -1) continue;
    const key = item.slice(0, index);
    if (key === name) return decodeURIComponent(item.slice(index + 1));
  }
  return '';
}

function buildCookie(name, value, maxAge = SESSION_MAX_AGE) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function jsonResponse(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data, null, 2), { ...init, headers });
}

function htmlResponse(html, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(html, { ...init, headers });
}

function xmlResponse(xml, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/xml; charset=utf-8');
  return new Response(xml, { ...init, headers });
}

function textResponse(text, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'text/plain; charset=utf-8');
  return new Response(text, { ...init, headers });
}

async function pbkdf2Hex(password, salt, iterations = 120000) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, salt, expectedHash) {
  const hash = await pbkdf2Hex(password, salt);
  return hash === expectedHash;
}

async function dbGet(env, sql, params = []) {
  return env.DB.prepare(sql).bind(...params).first();
}

async function dbAll(env, sql, params = []) {
  const result = await env.DB.prepare(sql).bind(...params).all();
  return result.results || [];
}

async function dbRun(env, sql, params = []) {
  return env.DB.prepare(sql).bind(...params).run();
}

async function upsertSetting(env, key, value) {
  await dbRun(env, 'INSERT OR REPLACE INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)', [key, typeof value === 'string' ? value : JSON.stringify(value), nowIso()]);
}

async function getSettings(env) {
  const rows = await dbAll(env, 'SELECT key, value FROM site_settings');
  const map = {};
  for (const row of rows) {
    if (row.key === 'global' || row.key === 'proof_points') {
      map[row.key] = safeJsonParse(row.value, row.key === 'proof_points' ? [] : {});
    } else {
      map[row.key] = row.value;
    }
  }
  return {
    global: { ...DEFAULT_GLOBAL_SETTINGS, ...(map.global || {}) },
    proofPoints: Array.isArray(map.proof_points) && map.proof_points.length ? map.proof_points : DEFAULT_PROOF_POINTS
  };
}

async function seedArray(env, table, uniqueKey, items) {
  for (const item of items) {
    const existing = await dbGet(env, `SELECT ${uniqueKey} FROM ${table} WHERE ${uniqueKey} = ?`, [item[uniqueKey]]);
    if (existing) continue;
    const keys = Object.keys(item);
    const now = nowIso();
    const values = keys.map((key) => item[key]);
    const extraKeys = ['created_at', 'updated_at', ...(table === 'landing_pages' || table === 'articles' ? [] : [])];
    const columns = [...keys, 'created_at', 'updated_at'];
    const placeholders = columns.map(() => '?').join(', ');
    await dbRun(env, `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, [...values, now, now]);
  }
}

async function ensureInitialized(env) {
  if (!env.DB) return;
  if (!initPromise) {
    initPromise = (async () => {
      await env.DB.exec(SCHEMA_SQL);
      const bootstrapped = await dbGet(env, 'SELECT value FROM site_settings WHERE key = ?', ['bootstrapped']);
      if (!bootstrapped) {
        await upsertSetting(env, 'global', DEFAULT_GLOBAL_SETTINGS);
        await upsertSetting(env, 'proof_points', DEFAULT_PROOF_POINTS);
        await seedArray(env, 'pricing_plans', 'name', DEFAULT_PRICING);
        await seedArray(env, 'landing_pages', 'slug', DEFAULT_LANDING_PAGES.map((page) => ({ ...page, published_at: nowIso() })));
        await seedArray(env, 'articles', 'slug', DEFAULT_ARTICLES.map((article) => ({ ...article, published_at: nowIso() })));
        await seedArray(env, 'faq_items', 'question', DEFAULT_FAQS);
        await seedArray(env, 'outbound_links', 'url', DEFAULT_OUTBOUND_LINKS);
        await seedArray(env, 'plugins', 'slug', DEFAULT_PLUGINS);
        await upsertSetting(env, 'bootstrapped', '1');
      }
      const admin = await dbGet(env, 'SELECT id FROM admins LIMIT 1');
      if (!admin) {
        const salt = randomId(16);
        const hash = await pbkdf2Hex(DEFAULT_ADMIN_PASSWORD, salt);
        const now = nowIso();
        await dbRun(env, 'INSERT INTO admins (username, display_name, password_hash, password_salt, role, must_reset_password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_DISPLAY_NAME, hash, salt, 'super_admin', 1, now, now]);
      }
    })();
  }
  return initPromise;
}

async function getSession(env, request) {
  const sessionId = getCookie(request, 'aiclaw_session');
  if (!sessionId) return null;
  const session = await dbGet(env, `
    SELECT sessions.id, sessions.csrf_token, sessions.expires_at, admins.id as admin_id, admins.username, admins.display_name, admins.role, admins.must_reset_password
    FROM sessions
    JOIN admins ON admins.id = sessions.admin_id
    WHERE sessions.id = ?
  `, [sessionId]);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await dbRun(env, 'DELETE FROM sessions WHERE id = ?', [sessionId]);
    return null;
  }
  return session;
}

async function requireAdmin(env, request, { write = false } = {}) {
  const session = await getSession(env, request);
  if (!session) return { ok: false, response: jsonResponse({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 }) };
  if (write) {
    const csrfToken = request.headers.get('x-csrf-token') || '';
    if (!csrfToken || csrfToken !== session.csrf_token) {
      return { ok: false, response: jsonResponse({ ok: false, error: 'INVALID_CSRF' }, { status: 403 }) };
    }
  }
  return { ok: true, session };
}

function parseRequestPath(url) {
  return url.pathname.replace(/\/+$/, '') || '/';
}

async function parseJsonBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return {};
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function normalizeForStorage(resource, body) {
  const config = CRUD_RESOURCES[resource];
  const payload = {};
  for (const field of config.allowed) {
    if (!(field in body)) continue;
    let value = body[field];
    if (config.jsonFields.includes(field)) {
      if (typeof value === 'string') {
        payload[field] = value;
      } else {
        payload[field] = JSON.stringify(value ?? null);
      }
      continue;
    }
    if (field === 'is_active') {
      payload[field] = toBooleanNumber(Boolean(value));
      continue;
    }
    if (field === 'sort_order' || field === 'authority_score') {
      payload[field] = Number(value || 0);
      continue;
    }
    if (field === 'published_at') {
      payload[field] = normalizeDate(value);
      continue;
    }
    payload[field] = typeof value === 'string' ? value.trim() : value;
  }

  if ('slug' in config.allowed && !payload.slug) {
    payload.slug = slugify(payload.title || payload.name || randomId(6));
  }
  if ('published_at' in config.allowed && !payload.published_at) {
    payload.published_at = nowIso();
  }
  return payload;
}

async function listResource(env, resource) {
  const config = CRUD_RESOURCES[resource];
  return dbAll(env, `SELECT * FROM ${config.table} ORDER BY ${config.orderBy}`);
}

async function getResourceItem(env, resource, id) {
  const config = CRUD_RESOURCES[resource];
  return dbGet(env, `SELECT * FROM ${config.table} WHERE ${config.pk} = ?`, [id]);
}

async function createResourceItem(env, resource, body) {
  const config = CRUD_RESOURCES[resource];
  const payload = normalizeForStorage(resource, body);
  const now = nowIso();
  const columns = [...Object.keys(payload), 'created_at', 'updated_at'];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [...Object.values(payload), now, now];
  const result = await dbRun(env, `INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
  return getResourceItem(env, resource, result.meta.last_row_id);
}

async function updateResourceItem(env, resource, id, body) {
  const config = CRUD_RESOURCES[resource];
  const payload = normalizeForStorage(resource, body);
  const columns = Object.keys(payload);
  if (!columns.length) {
    return getResourceItem(env, resource, id);
  }
  const assignments = [...columns.map((col) => `${col} = ?`), 'updated_at = ?'];
  const values = [...columns.map((col) => payload[col]), nowIso(), id];
  await dbRun(env, `UPDATE ${config.table} SET ${assignments.join(', ')} WHERE ${config.pk} = ?`, values);
  return getResourceItem(env, resource, id);
}

async function deleteResourceItem(env, resource, id) {
  const config = CRUD_RESOURCES[resource];
  await dbRun(env, `DELETE FROM ${config.table} WHERE ${config.pk} = ?`, [id]);
}

function summarizeLeadSource(url) {
  const pathname = new URL(url).pathname;
  return pathname === '/' ? 'home' : pathname.replace(/^\//, '');
}

async function handleLeadCapture(request, env) {
  const body = await parseJsonBody(request);
  const now = nowIso();
  if (!body.email && !body.phone && !body.whatsapp && !body.telegram && !body.wechat) {
    return jsonResponse({ ok: false, error: 'MISSING_CONTACT', message: '请至少填写一种联系方式。' }, { status: 400 });
  }
  await dbRun(env, `
    INSERT INTO leads (
      source_page, name, company, email, phone, whatsapp, telegram, wechat, message,
      preferred_channel, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      referrer, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    body.source_page || '/',
    body.name || '',
    body.company || '',
    body.email || '',
    body.phone || '',
    body.whatsapp || '',
    body.telegram || '',
    body.wechat || '',
    body.message || '',
    body.preferred_channel || '',
    body.utm_source || '',
    body.utm_medium || '',
    body.utm_campaign || '',
    body.utm_term || '',
    body.utm_content || '',
    body.referrer || '',
    'new',
    '',
    now,
    now
  ]);
  const settings = await getSettings(env);
  return jsonResponse({
    ok: true,
    message: '线索已提交，已进入后台 CRM。',
    next: {
      telegramUrl: settings.global.telegramUrl,
      whatsappUrl: settings.global.whatsappUrl,
      wechatId: settings.global.wechatId
    }
  });
}

async function handleLeadAdmin(request, env, url) {
  if (request.method === 'GET') {
    const auth = await requireAdmin(env, request);
    if (!auth.ok) return auth.response;
    const leads = await dbAll(env, 'SELECT * FROM leads ORDER BY created_at DESC');
    return jsonResponse({ ok: true, items: leads, session: { csrfToken: auth.session.csrf_token } });
  }

  if (request.method === 'PUT') {
    const auth = await requireAdmin(env, request, { write: true });
    if (!auth.ok) return auth.response;
    const match = url.pathname.match(/^\/api\/leads\/(\d+)$/);
    if (!match) return jsonResponse({ ok: false, error: 'MISSING_ID' }, { status: 400 });
    const body = await parseJsonBody(request);
    await dbRun(env, 'UPDATE leads SET status = ?, notes = ?, updated_at = ? WHERE id = ?', [body.status || 'new', body.notes || '', nowIso(), match[1]]);
    const item = await dbGet(env, 'SELECT * FROM leads WHERE id = ?', [match[1]]);
    return jsonResponse({ ok: true, item });
  }

  return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}

async function handleMedia(request, env, url) {
  if (request.method === 'POST') {
    const auth = await requireAdmin(env, request, { write: true });
    if (!auth.ok) return auth.response;
    if (!env.MEDIA_BUCKET) {
      return jsonResponse({ ok: false, error: 'NO_MEDIA_BUCKET', message: '未绑定 R2 MEDIA_BUCKET，媒体上传功能不可用。' }, { status: 400 });
    }
    const formData = await request.formData();
    const file = formData.get('file');
    const alt = String(formData.get('alt_text') || '');
    if (!file || typeof file === 'string') {
      return jsonResponse({ ok: false, error: 'NO_FILE' }, { status: 400 });
    }
    const ext = (file.name && file.name.includes('.')) ? file.name.slice(file.name.lastIndexOf('.')) : '';
    const key = `${Date.now()}-${slugify(file.name || 'upload')}${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    await env.MEDIA_BUCKET.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' }
    });
    const now = nowIso();
    const result = await dbRun(env, 'INSERT INTO uploads (file_name, file_key, mime_type, size, alt_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [file.name || key, key, file.type || 'application/octet-stream', file.size || 0, alt, now, now]);
    return jsonResponse({
      ok: true,
      item: {
        id: result.meta.last_row_id,
        file_name: file.name || key,
        file_key: key,
        mime_type: file.type || 'application/octet-stream',
        size: file.size || 0,
        alt_text: alt,
        url: `/media/${encodeURIComponent(key)}`
      }
    });
  }

  if (request.method === 'GET') {
    const auth = await requireAdmin(env, request);
    if (!auth.ok) return auth.response;
    const items = await dbAll(env, 'SELECT * FROM uploads ORDER BY created_at DESC');
    return jsonResponse({ ok: true, items });
  }

  if (request.method === 'DELETE') {
    const auth = await requireAdmin(env, request, { write: true });
    if (!auth.ok) return auth.response;
    const match = url.pathname.match(/^\/api\/media\/(\d+)$/);
    if (!match) return jsonResponse({ ok: false, error: 'MISSING_ID' }, { status: 400 });
    const item = await dbGet(env, 'SELECT * FROM uploads WHERE id = ?', [match[1]]);
    if (!item) return jsonResponse({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    if (env.MEDIA_BUCKET) {
      await env.MEDIA_BUCKET.delete(item.file_key);
    }
    await dbRun(env, 'DELETE FROM uploads WHERE id = ?', [match[1]]);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}

async function handleSettings(request, env) {
  if (request.method === 'GET') {
    const auth = await requireAdmin(env, request);
    if (!auth.ok) return auth.response;
    const settings = await getSettings(env);
    return jsonResponse({ ok: true, settings, session: { csrfToken: auth.session.csrf_token, mustResetPassword: !!auth.session.must_reset_password } });
  }

  if (request.method === 'PUT') {
    const auth = await requireAdmin(env, request, { write: true });
    if (!auth.ok) return auth.response;
    const body = await parseJsonBody(request);
    await upsertSetting(env, 'global', { ...DEFAULT_GLOBAL_SETTINGS, ...(body.global || {}) });
    if (Array.isArray(body.proofPoints)) {
      await upsertSetting(env, 'proof_points', body.proofPoints);
    }
    const settings = await getSettings(env);
    return jsonResponse({ ok: true, settings });
  }

  return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}

async function handleDashboard(request, env) {
  const auth = await requireAdmin(env, request);
  if (!auth.ok) return auth.response;
  const counts = {
    articles: await dbGet(env, 'SELECT COUNT(*) as total FROM articles'),
    pages: await dbGet(env, 'SELECT COUNT(*) as total FROM landing_pages'),
    leads: await dbGet(env, 'SELECT COUNT(*) as total FROM leads'),
    plugins: await dbGet(env, 'SELECT COUNT(*) as total FROM plugins WHERE is_active = 1'),
    faqs: await dbGet(env, 'SELECT COUNT(*) as total FROM faq_items WHERE is_active = 1')
  };
  const latestLeads = await dbAll(env, 'SELECT * FROM leads ORDER BY created_at DESC LIMIT 5');
  const latestArticles = await dbAll(env, 'SELECT id, slug, title, published_at, status FROM articles ORDER BY published_at DESC LIMIT 5');
  return jsonResponse({ ok: true, counts, latestLeads, latestArticles, session: { csrfToken: auth.session.csrf_token, mustResetPassword: !!auth.session.must_reset_password } });
}

async function handleAuth(request, env, url) {
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const body = await parseJsonBody(request);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const admin = await dbGet(env, 'SELECT * FROM admins WHERE username = ?', [username]);
    if (!admin) {
      return jsonResponse({ ok: false, error: 'INVALID_CREDENTIALS', message: '账号或密码错误。' }, { status: 401 });
    }
    const passed = await verifyPassword(password, admin.password_salt, admin.password_hash);
    if (!passed) {
      return jsonResponse({ ok: false, error: 'INVALID_CREDENTIALS', message: '账号或密码错误。' }, { status: 401 });
    }
    const sessionId = randomId(24);
    const csrfToken = randomId(16);
    const expiresAt = addDays(7);
    await dbRun(env, 'INSERT INTO sessions (id, admin_id, csrf_token, ip_address, user_agent, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [sessionId, admin.id, csrfToken, request.headers.get('cf-connecting-ip') || '', request.headers.get('user-agent') || '', expiresAt, nowIso()]);
    return jsonResponse({
      ok: true,
      admin: {
        username: admin.username,
        displayName: admin.display_name,
        role: admin.role,
        mustResetPassword: !!admin.must_reset_password,
        csrfToken
      }
    }, { headers: { 'Set-Cookie': buildCookie('aiclaw_session', sessionId) } });
  }

  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    const session = await getSession(env, request);
    if (!session) return jsonResponse({ ok: false, authenticated: false }, { status: 401 });
    return jsonResponse({
      ok: true,
      authenticated: true,
      admin: {
        username: session.username,
        displayName: session.display_name,
        role: session.role,
        mustResetPassword: !!session.must_reset_password,
        csrfToken: session.csrf_token
      }
    });
  }

  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    const session = await getSession(env, request);
    if (session) {
      await dbRun(env, 'DELETE FROM sessions WHERE id = ?', [session.id]);
    }
    return jsonResponse({ ok: true }, { headers: { 'Set-Cookie': clearCookie('aiclaw_session') } });
  }

  if (url.pathname === '/api/admin/change-password' && request.method === 'POST') {
    const auth = await requireAdmin(env, request, { write: true });
    if (!auth.ok) return auth.response;
    const body = await parseJsonBody(request);
    const current = String(body.currentPassword || '');
    const next = String(body.newPassword || '');
    if (next.length < 8) {
      return jsonResponse({ ok: false, error: 'WEAK_PASSWORD', message: '新密码至少 8 位。' }, { status: 400 });
    }
    const admin = await dbGet(env, 'SELECT * FROM admins WHERE id = ?', [auth.session.admin_id]);
    const currentPassed = await verifyPassword(current, admin.password_salt, admin.password_hash);
    if (!currentPassed) {
      return jsonResponse({ ok: false, error: 'INVALID_CURRENT_PASSWORD', message: '当前密码错误。' }, { status: 400 });
    }
    const salt = randomId(16);
    const hash = await pbkdf2Hex(next, salt);
    await dbRun(env, 'UPDATE admins SET password_hash = ?, password_salt = ?, must_reset_password = 0, updated_at = ? WHERE id = ?', [hash, salt, nowIso(), auth.session.admin_id]);
    return jsonResponse({ ok: true, message: '密码已更新。' });
  }

  return null;
}

function isUnsafeSlug(pathPart) {
  return pathPart.includes('..') || pathPart.includes('\\');
}

async function handleCrud(request, env, url) {
  const match = url.pathname.match(/^\/api\/(pricing-plans|landing-pages|articles|faq-items|outbound-links|plugins)(?:\/(\d+))?$/);
  if (!match) return null;
  const resource = match[1];
  const id = match[2];
  const write = ['POST', 'PUT', 'DELETE'].includes(request.method);
  const auth = await requireAdmin(env, request, { write });
  if (!auth.ok) return auth.response;

  if (request.method === 'GET') {
    if (id) {
      const item = await getResourceItem(env, resource, id);
      return jsonResponse({ ok: true, item, session: { csrfToken: auth.session.csrf_token } });
    }
    const items = await listResource(env, resource);
    return jsonResponse({ ok: true, items, session: { csrfToken: auth.session.csrf_token } });
  }

  if (request.method === 'POST') {
    const body = await parseJsonBody(request);
    const item = await createResourceItem(env, resource, body);
    return jsonResponse({ ok: true, item });
  }

  if (request.method === 'PUT') {
    if (!id) return jsonResponse({ ok: false, error: 'MISSING_ID' }, { status: 400 });
    const body = await parseJsonBody(request);
    const item = await updateResourceItem(env, resource, id, body);
    return jsonResponse({ ok: true, item });
  }

  if (request.method === 'DELETE') {
    if (!id) return jsonResponse({ ok: false, error: 'MISSING_ID' }, { status: 400 });
    await deleteResourceItem(env, resource, id);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}

async function handleUploadsList(request, env) {
  const auth = await requireAdmin(env, request);
  if (!auth.ok) return auth.response;
  const items = await dbAll(env, 'SELECT * FROM uploads ORDER BY created_at DESC');
  return jsonResponse({ ok: true, items, session: { csrfToken: auth.session.csrf_token } });
}

async function handleLeadExport(request, env) {
  const auth = await requireAdmin(env, request);
  if (!auth.ok) return auth.response;
  const leads = await dbAll(env, 'SELECT * FROM leads ORDER BY created_at DESC');
  const header = ['id', 'created_at', 'status', 'name', 'company', 'email', 'phone', 'whatsapp', 'telegram', 'wechat', 'preferred_channel', 'source_page', 'utm_source', 'utm_medium', 'utm_campaign', 'message', 'notes'];
  const rows = [header.join(',')];
  for (const lead of leads) {
    rows.push(header.map((key) => `"${String(lead[key] || '').replace(/"/g, '""')}"`).join(','));
  }
  const headers = new Headers({
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': 'attachment; filename="leads.csv"'
  });
  return new Response(rows.join('\n'), { headers });
}

async function handleApi(request, env) {
  const url = new URL(request.url);

  const authResponse = await handleAuth(request, env, url);
  if (authResponse) return authResponse;

  if (url.pathname === '/api/dashboard') {
    return handleDashboard(request, env);
  }

  if (url.pathname === '/api/settings') {
    return handleSettings(request, env);
  }

  if (url.pathname === '/api/leads' && request.method === 'POST') {
    return handleLeadCapture(request, env);
  }
  if (url.pathname === '/api/leads' || /^\/api\/leads\/\d+$/.test(url.pathname)) {
    return handleLeadAdmin(request, env, url);
  }

  if (url.pathname === '/api/media' || /^\/api\/media\/\d+$/.test(url.pathname)) {
    return handleMedia(request, env, url);
  }

  if (url.pathname === '/api/uploads' && request.method === 'GET') {
    return handleUploadsList(request, env);
  }

  if (url.pathname === '/api/export/leads.csv' && request.method === 'GET') {
    return handleLeadExport(request, env);
  }

  const crudResponse = await handleCrud(request, env, url);
  if (crudResponse) return crudResponse;

  return jsonResponse({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
}

function inferSiteOrigin(url, settings) {
  const configured = settings.global.siteUrl || '';
  if (configured.startsWith('http://') || configured.startsWith('https://')) return configured.replace(/\/$/, '');
  return `${url.protocol}//${url.host}`;
}

function renderJsonLd(schema) {
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function renderMeta({ title, description, canonical, image, keywords, schema = [] }) {
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta name="keywords" content="${escapeHtml(keywords || '')}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`
  ];
  if (image) {
    tags.push(`<meta property="og:image" content="${escapeHtml(image)}">`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(image)}">`);
  }
  for (const item of schema) {
    tags.push(renderJsonLd(item));
  }
  return tags.join('\n');
}

function renderNavigation(settings) {
  return `
    <header class="site-header">
      <div class="container nav-wrap">
        <a class="brand" href="/">
          <span class="brand-mark">A</span>
          <span>
            <strong>${escapeHtml(settings.global.brandName)}</strong>
            <small>${escapeHtml(settings.global.siteName)}</small>
          </span>
        </a>
        <button class="nav-toggle" type="button" data-nav-toggle aria-label="切换菜单">☰</button>
        <nav class="nav" data-nav>
          <a href="/solutions/ai-foreign-trade-growth-platform">核心方案</a>
          <a href="/solutions/google-ai-seo-geo">SEO / GEO</a>
          <a href="/blog">文章</a>
          <a href="/contact">咨询</a>
          <a class="nav-cta" href="${escapeHtml(settings.global.telegramUrl)}" target="_blank" rel="noopener">Telegram</a>
        </nav>
      </div>
    </header>
  `;
}

function renderFooter(settings) {
  return `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div>
          <h3>${escapeHtml(settings.global.brandName)}</h3>
          <p>${escapeHtml(settings.global.footerNote)}</p>
          <p class="muted">${escapeHtml(settings.global.companySummary)}</p>
        </div>
        <div>
          <h4>核心入口</h4>
          <ul>
            <li><a href="/solutions/ai-foreign-trade-growth-platform">AI全渠道聚合拓客 SaaS</a></li>
            <li><a href="/solutions/tiktok-ai-lead-generation">TikTok AI 拓客</a></li>
            <li><a href="/solutions/whatsapp-ai-lead-generation">WhatsApp AI 获客</a></li>
            <li><a href="/solutions/google-ai-seo-geo">Google AI SEO / GEO</a></li>
          </ul>
        </div>
        <div>
          <h4>咨询通道</h4>
          <ul>
            <li><a href="${escapeHtml(settings.global.telegramUrl)}" target="_blank" rel="noopener">Telegram</a></li>
            <li><a href="${escapeHtml(settings.global.whatsappUrl)}" target="_blank" rel="noopener">WhatsApp</a></li>
            <li><button class="link-button" type="button" data-copy="${escapeHtml(settings.global.wechatId)}">复制微信：${escapeHtml(settings.global.wechatId)}</button></li>
            <li><a href="mailto:${escapeHtml(settings.global.organizationEmail)}">${escapeHtml(settings.global.organizationEmail)}</a></li>
          </ul>
        </div>
      </div>
    </footer>
  `;
}

function renderFloatingContacts(settings) {
  return `
    <div class="floating-contacts">
      <a href="${escapeHtml(settings.global.telegramUrl)}" target="_blank" rel="noopener">TG</a>
      <a href="${escapeHtml(settings.global.whatsappUrl)}" target="_blank" rel="noopener">WS</a>
      <button type="button" data-copy="${escapeHtml(settings.global.wechatId)}">WX</button>
    </div>
  `;
}

function renderLeadForm(settings, sourcePath = '/') {
  return `
    <section class="lead-form-section section-card">
      <div class="lead-form-copy">
        <span class="eyebrow">线索表单 + CRM</span>
        <h2>${escapeHtml(settings.global.leadFormHeadline)}</h2>
        <p>${escapeHtml(settings.global.leadFormDescription)}</p>
        <ul class="bullet-list compact">
          <li>提交后自动记录来源页与 UTM</li>
          <li>可直接跳转 Telegram / WhatsApp</li>
          <li>后台 CRM 可继续跟进状态与备注</li>
        </ul>
      </div>
      <form class="lead-form" data-lead-form>
        <input type="hidden" name="source_page" value="${escapeHtml(sourcePath)}">
        <div class="field-row">
          <label>姓名<input name="name" placeholder="你的称呼"></label>
          <label>公司<input name="company" placeholder="公司名称"></label>
        </div>
        <div class="field-row">
          <label>邮箱<input name="email" type="email" placeholder="邮箱"></label>
          <label>电话 / WhatsApp<input name="whatsapp" placeholder="WhatsApp 或手机号"></label>
        </div>
        <div class="field-row">
          <label>Telegram<input name="telegram" placeholder="Telegram 用户名"></label>
          <label>微信<input name="wechat" placeholder="微信号"></label>
        </div>
        <label>你希望我们重点帮你解决什么？
          <textarea name="message" rows="5" placeholder="例如：我要做 AI 外贸获客软件官网，重点要 SEO / GEO 排名，想把流量导到 WhatsApp。"></textarea>
        </label>
        <label>优先沟通渠道
          <select name="preferred_channel">
            <option value="Telegram">Telegram</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="微信">微信</option>
            <option value="邮箱">邮箱</option>
          </select>
        </label>
        <button class="button primary" type="submit">提交并进入沟通</button>
        <p class="form-hint">提交代表你同意我们通过你填写的方式继续联系你。</p>
      </form>
    </section>
  `;
}

function renderProofPoints(settings) {
  return `
    <div class="proof-grid">
      ${settings.proofPoints.map((item) => `
        <article class="proof-card">
          <strong>${escapeHtml(item.value)}</strong>
          <span>${escapeHtml(item.label)}</span>
        </article>
      `).join('')}
    </div>
  `;
}

function renderSectionBlocks(blocks = []) {
  return blocks.map((block) => {
    if (block.type === 'pain-points') {
      return `
        <section class="content-section section-card">
          <div class="section-head">
            <span class="eyebrow">问题场景</span>
            <h2>${escapeHtml(block.title || '')}</h2>
          </div>
          <ul class="problem-list">
            ${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </section>
      `;
    }
    if (block.type === 'feature-grid') {
      return `
        <section class="content-section section-card">
          <div class="section-head">
            <span class="eyebrow">能力模块</span>
            <h2>${escapeHtml(block.title || '')}</h2>
          </div>
          <div class="card-grid two-up">
            ${(block.items || []).map((item) => `
              <article class="mini-card">
                <h3>${escapeHtml(item.title || '')}</h3>
                <p>${escapeHtml(item.desc || '')}</p>
              </article>
            `).join('')}
          </div>
        </section>
      `;
    }
    if (block.type === 'workflow' || block.type === 'process') {
      return `
        <section class="content-section section-card">
          <div class="section-head">
            <span class="eyebrow">流程</span>
            <h2>${escapeHtml(block.title || '')}</h2>
          </div>
          <ol class="step-list">
            ${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ol>
        </section>
      `;
    }
    if (block.type === 'comparison') {
      return `
        <section class="content-section section-card">
          <div class="section-head">
            <span class="eyebrow">对比</span>
            <h2>${escapeHtml(block.title || '')}</h2>
          </div>
          <div class="comparison-table">
            ${(block.rows || []).map((row) => `
              <div class="comparison-row">
                <div>${escapeHtml(row[0] || '')}</div>
                <div>${escapeHtml(row[1] || '')}</div>
              </div>
            `).join('')}
          </div>
        </section>
      `;
    }
    if (block.type === 'cta-strip') {
      return `
        <section class="content-section cta-strip section-card">
          <div>
            <span class="eyebrow">行动建议</span>
            <h2>${escapeHtml(block.title || '')}</h2>
            <p>${escapeHtml(block.description || '')}</p>
          </div>
          <div class="cta-actions">
            <a class="button primary" href="https://t.me/aiclawchuhai" target="_blank" rel="noopener">Telegram 咨询</a>
            <a class="button ghost" href="https://wa.me/85252195605" target="_blank" rel="noopener">WhatsApp 咨询</a>
          </div>
        </section>
      `;
    }
    return '';
  }).join('');
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '';
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function renderArticleCards(articles = []) {
  if (!articles.length) return '<p class="muted">暂无文章。</p>';
  return `
    <div class="card-grid three-up">
      ${articles.map((article) => `
        <article class="article-card">
          <span class="pill">${escapeHtml(article.category || '文章')}</span>
          <h3><a href="/blog/${escapeHtml(article.slug)}">${escapeHtml(article.title)}</a></h3>
          <p>${escapeHtml(article.excerpt || '')}</p>
          <div class="meta-row">
            <span>${escapeHtml(article.author_name || '')}</span>
            <time datetime="${escapeHtml(article.published_at)}">${escapeHtml(formatDate(article.published_at))}</time>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderPricingCards(plans = []) {
  if (!plans.length) return '';
  return `
    <section class="content-section section-card" id="pricing">
      <div class="section-head">
        <span class="eyebrow">价格模块</span>
        <h2>价格由后台维护，你只负责成交</h2>
        <p>你可以在管理员后台随时修改价格名称、说明、展示顺序和 CTA，不需要改源码。</p>
      </div>
      <div class="card-grid three-up">
        ${plans.map((plan) => `
          <article class="pricing-card ${plan.sort_order === 2 ? 'pricing-highlight' : ''}">
            <span class="pill">${escapeHtml(plan.audience || '')}</span>
            <h3>${escapeHtml(plan.name || '')}</h3>
            <div class="pricing-value">${escapeHtml(plan.price_label || '联系后台设置')}</div>
            <p>${escapeHtml(plan.billing_cycle || '')}</p>
            <ul class="bullet-list compact">
              ${(safeJsonParse(plan.highlights_json, []) || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
            <a class="button ${plan.sort_order === 2 ? 'primary' : 'ghost'}" href="${escapeHtml(plan.cta_url || '#')}" target="_blank" rel="noopener">${escapeHtml(plan.cta_text || '咨询')}</a>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderFaqs(faqs = []) {
  if (!faqs.length) return '';
  return `
    <section class="content-section section-card" id="faq">
      <div class="section-head">
        <span class="eyebrow">FAQ</span>
        <h2>常见问题</h2>
      </div>
      <div class="faq-list">
        ${faqs.map((faq) => `
          <details class="faq-item">
            <summary>${escapeHtml(faq.question)}</summary>
            <p>${escapeHtml(faq.answer)}</p>
          </details>
        `).join('')}
      </div>
    </section>
  `;
}

function renderResourceLinks(settings, links = []) {
  if (!links.length) return '';
  return `
    <aside class="resource-links section-card">
      <div class="section-head">
        <span class="eyebrow">外链资源池</span>
        <h2>可由后台自动维护的相关资源</h2>
        <p>${escapeHtml(settings.global.resourceLinkIntro)}</p>
      </div>
      <ul class="resource-list">
        ${links.map((link) => `<li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a><span>${escapeHtml(link.category || '')}</span></li>`).join('')}
      </ul>
    </aside>
  `;
}

function renderBreadcrumbs(items = []) {
  return `
    <nav class="breadcrumbs" aria-label="面包屑">
      ${items.map((item, index) => item.url ? `<a href="${escapeHtml(item.url)}">${escapeHtml(item.label)}</a>` : `<span>${escapeHtml(item.label)}</span>`).join('<span>/</span>')}
    </nav>
  `;
}

function inlineMarkdown(text = '') {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function markdownToHtml(markdown = '') {
  const lines = String(markdown).replace(/\r/g, '').split('\n');
  const html = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeLists();
      continue;
    }
    if (/^###\s+/.test(line)) {
      closeLists();
      html.push(`<h3>${inlineMarkdown(line.replace(/^###\s+/, ''))}</h3>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      closeLists();
      html.push(`<h2>${inlineMarkdown(line.replace(/^##\s+/, ''))}</h2>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      closeLists();
      html.push(`<h1>${inlineMarkdown(line.replace(/^#\s+/, ''))}</h1>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inUl) {
        closeLists();
        inUl = true;
        html.push('<ul>');
      }
      html.push(`<li>${inlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (!inOl) {
        closeLists();
        inOl = true;
        html.push('<ol>');
      }
      html.push(`<li>${inlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>`);
      continue;
    }
    closeLists();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  closeLists();
  return html.join('\n');
}

async function getLatestArticles(env, limit = 3) {
  return dbAll(env, 'SELECT * FROM articles WHERE status = ? ORDER BY published_at DESC LIMIT ?', ['published', limit]);
}

async function getActivePricing(env) {
  return dbAll(env, 'SELECT * FROM pricing_plans WHERE is_active = 1 ORDER BY sort_order ASC, id DESC');
}

async function getFaqsForPage(env, scope, slug, limit = 10) {
  if (scope && slug) {
    const scoped = await dbAll(env, 'SELECT * FROM faq_items WHERE is_active = 1 AND scope = ? AND scope_slug = ? ORDER BY sort_order ASC, id ASC LIMIT ?', [scope, slug, limit]);
    if (scoped.length) return scoped;
  }
  return dbAll(env, 'SELECT * FROM faq_items WHERE is_active = 1 AND scope = ? ORDER BY sort_order ASC, id ASC LIMIT ?', ['global', limit]);
}

async function getPublishedPages(env, type = 'solution', limit = 6) {
  return dbAll(env, 'SELECT * FROM landing_pages WHERE status = ? AND page_type = ? ORDER BY updated_at DESC LIMIT ?', ['published', type, limit]);
}

async function getPageBySlug(env, slug) {
  return dbGet(env, 'SELECT * FROM landing_pages WHERE slug = ? AND status = ?', [slug, 'published']);
}

async function getArticleBySlug(env, slug) {
  return dbGet(env, 'SELECT * FROM articles WHERE slug = ? AND status = ?', [slug, 'published']);
}

async function getRelatedPagesByKeyword(env, keyword, limit = 3) {
  if (!keyword) return [];
  return dbAll(env, 'SELECT slug, title, subtitle, summary, page_type FROM landing_pages WHERE status = ? AND target_keyword LIKE ? LIMIT ?', ['published', `%${keyword}%`, limit]);
}

async function pickOutboundLinks(env, keyword = '', placement = 'article', limit = 4) {
  const links = await dbAll(env, 'SELECT * FROM outbound_links WHERE is_active = 1 AND placement IN (?, ?) ORDER BY authority_score DESC, id DESC', [placement, 'footer']);
  if (!keyword) return links.slice(0, limit);
  const normalized = keyword.toLowerCase();
  const scored = links.map((link) => {
    const keywords = safeJsonParse(link.keywords_json, []) || [];
    const score = keywords.some((entry) => normalized.includes(String(entry).toLowerCase()) || String(entry).toLowerCase().includes(normalized)) ? 1 : 0;
    return { link, score };
  }).sort((a, b) => b.score - a.score || (b.link.authority_score || 0) - (a.link.authority_score || 0));
  return scored.slice(0, limit).map((item) => item.link);
}

async function getPluginsBySlot(env, slot) {
  return dbAll(env, 'SELECT * FROM plugins WHERE is_active = 1 AND slot = ? ORDER BY updated_at DESC', [slot]);
}

function renderPlugins(plugins = [], settings) {
  if (!plugins.length) return '';
  const allowScripts = !!settings.global.enableCustomScripts;
  return plugins.map((plugin) => {
    const config = safeJsonParse(plugin.config_json, {});
    const css = plugin.css_text ? `<style>${plugin.css_text}</style>` : '';
    const js = allowScripts && plugin.js_text ? `<script type="module">${plugin.js_text}</script>` : '';
    if (plugin.kind === 'stat-grid') {
      return `${css}
        <section class="content-section section-card plugin-block">
          <div class="section-head">
            <span class="eyebrow">插件区块</span>
            <h2>${escapeHtml(plugin.title || plugin.name)}</h2>
          </div>
          <div class="proof-grid">
            ${(config.items || []).map((item) => `<article class="proof-card"><strong>${escapeHtml(item.value || '')}</strong><span>${escapeHtml(item.label || '')}</span></article>`).join('')}
          </div>
        </section>
      ${js}`;
    }
    if (plugin.kind === 'cta-strip') {
      return `${css}
        <section class="content-section section-card cta-strip plugin-block">
          <div>
            <span class="eyebrow">插件区块</span>
            <h2>${escapeHtml(plugin.title || plugin.name)}</h2>
            <p>${escapeHtml(config.description || '')}</p>
          </div>
          <div class="cta-actions">
            <a class="button primary" href="${escapeHtml(config.ctaUrl || settings.global.telegramUrl)}" target="_blank" rel="noopener">${escapeHtml(config.ctaText || '立即咨询')}</a>
          </div>
        </section>
      ${js}`;
    }
    if (plugin.kind === 'custom-html' && plugin.html_template) {
      return `${css}<section class="content-section section-card plugin-block">${plugin.html_template}</section>${js}`;
    }
    return '';
  }).join('');
}

function normalizePagePath(page) {
  if (page.page_type === 'home' || page.slug === 'home') return '/';
  if (page.page_type === 'industry') return `/industries/${page.slug}`;
  if (page.page_type === 'compare') return `/compare/${page.slug}`;
  if (page.page_type === 'geo') return `/geo/${page.slug}`;
  return `/solutions/${page.slug}`;
}

function renderSolutionCards(pages = []) {
  if (!pages.length) return '';
  return `
    <section class="content-section section-card">
      <div class="section-head">
        <span class="eyebrow">方案页矩阵</span>
        <h2>比单页更值钱的，是可扩展的方案页矩阵</h2>
        <p>每个模块都能独立拿词、独立做 CTA、独立做 FAQ，也更容易被搜索引擎和 AI 检索理解。</p>
      </div>
      <div class="card-grid three-up">
        ${pages.map((page) => `
          <article class="solution-card">
            <span class="pill">${escapeHtml(page.page_type === 'industry' ? '行业页' : '方案页')}</span>
            <h3><a href="${escapeHtml(normalizePagePath(page))}">${escapeHtml(page.title)}</a></h3>
            <p>${escapeHtml(page.summary || page.subtitle || '')}</p>
            <a class="text-link" href="${escapeHtml(normalizePagePath(page))}">查看详情 →</a>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderWorkflowOverview() {
  const steps = [
    '文章 / FAQ / 方案页承接搜索与 AI 检索',
    'TikTok / 社媒矩阵 / 广告页扩大量级流量',
    'CTA 统一导向 Telegram / WhatsApp / 微信',
    '线索写入 CRM，记录来源页和 UTM',
    'AI 客服、多语言翻译与分流跟进推进转化'
  ];
  return `
    <section class="content-section section-card workflow-overview">
      <div class="section-head">
        <span class="eyebrow">工作原理</span>
        <h2>让官网成为整套 AI 外贸获客系统的前门</h2>
        <p>官网负责解释价值、拿搜索词、承接咨询；产品后台负责放大流量、筛选线索和持续转化。</p>
      </div>
      <ol class="step-list">
        ${steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
      </ol>
    </section>
  `;
}

function renderGeoSeoSection(settings) {
  return `
    <section class="content-section section-card seo-geo-section">
      <div class="section-head">
        <span class="eyebrow">SEO / GEO</span>
        <h2>这个站点为什么更适合搜索引擎和 AI 检索收录</h2>
      </div>
      <div class="card-grid two-up">
        <article class="mini-card">
          <h3>SEO 结构</h3>
          <p>主页、方案页、文章页、FAQ、行业页、站点地图与 RSS 一起工作，而不是只靠首页吃词。</p>
        </article>
        <article class="mini-card">
          <h3>GEO 结构</h3>
          <p>${escapeHtml(settings.global.geoSummary)}</p>
        </article>
        <article class="mini-card">
          <h3>外链池</h3>
          <p>代码已内置后台可维护的相关资源池，可以按分类和关键词自动挂载到文章和页脚。</p>
        </article>
        <article class="mini-card">
          <h3>后台持续更新</h3>
          <p>站点内置管理员后台，支持价格、文章、FAQ、方案页、线索、插件区块的持续更新。</p>
        </article>
      </div>
    </section>
  `;
}

function renderContactPageBody(settings) {
  return `
    <section class="hero hero-simple">
      <div class="container hero-grid single">
        <div>
          <span class="eyebrow">立即沟通</span>
          <h1>选择你最方便的沟通方式</h1>
          <p>${escapeHtml(settings.global.trustSummary)}</p>
          <div class="cta-actions">
            <a class="button primary" href="${escapeHtml(settings.global.telegramUrl)}" target="_blank" rel="noopener">Telegram</a>
            <a class="button ghost" href="${escapeHtml(settings.global.whatsappUrl)}" target="_blank" rel="noopener">WhatsApp</a>
            <button class="button ghost" type="button" data-copy="${escapeHtml(settings.global.wechatId)}">复制微信</button>
          </div>
        </div>
      </div>
    </section>
    <main class="container page-main">
      ${renderLeadForm(settings, '/contact')}
    </main>
  `;
}

function renderLayout({ settings, url, title, description, path, body, schema = [], keywords = '', image = '' }) {
  const origin = inferSiteOrigin(url, settings);
  const canonical = `${origin}${path === '/' ? '' : path}`;
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.global.brandName,
    url: origin,
    email: settings.global.organizationEmail,
    telephone: settings.global.organizationPhone,
    sameAs: [settings.global.telegramUrl, settings.global.whatsappUrl]
  };
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0b1220">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="/assets/css/app.css">
  ${renderMeta({ title, description, canonical, image, keywords: keywords || settings.global.defaultKeywords, schema: [organizationSchema, ...schema] })}
</head>
<body>
  ${renderNavigation(settings)}
  ${body}
  ${renderFooter(settings)}
  ${renderFloatingContacts(settings)}
  <script type="module" src="/assets/js/site.js"></script>
</body>
</html>`;
}

async function renderHome(url, env) {
  const settings = await getSettings(env);
  const homePage = await getPageBySlug(env, 'home');
  const hero = safeJsonParse(homePage?.hero_json, {});
  const sections = safeJsonParse(homePage?.sections_json, []);
  const solutionPages = await getPublishedPages(env, 'solution', 6);
  const industryPages = await getPublishedPages(env, 'industry', 3);
  const articles = await getLatestArticles(env, 6);
  const pricing = await getActivePricing(env);
  const faqs = await getFaqsForPage(env, 'global', '', 6);
  const links = await pickOutboundLinks(env, 'SEO Cloudflare WhatsApp TikTok', 'footer', 4);
  const homePlugins = await getPluginsBySlot(env, 'home.afterHero');
  const bottomPlugins = await getPluginsBySlot(env, 'global.bottomCTA');

  const body = `
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">${escapeHtml(homePage?.title || settings.global.heroKicker)}</span>
          <h1>${escapeHtml(settings.global.heroTitle)}</h1>
          <p class="hero-subtitle">${escapeHtml(settings.global.heroSubtitle)}</p>
          <p class="hero-answer"><strong>30 秒答案：</strong>${escapeHtml(hero.quickAnswer || '')}</p>
          <p class="hero-definition">${escapeHtml(hero.definition || '')}</p>
          <ul class="bullet-list">
            ${(hero.bullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
          <div class="cta-actions">
            <a class="button primary" href="${escapeHtml(hero.ctaPrimaryUrl || settings.global.primaryCtaUrl)}">${escapeHtml(hero.ctaPrimaryText || settings.global.primaryCtaText)}</a>
            <a class="button ghost" href="${escapeHtml(hero.ctaSecondaryUrl || settings.global.secondaryCtaUrl)}">${escapeHtml(hero.ctaSecondaryText || settings.global.secondaryCtaText)}</a>
          </div>
        </div>
        <div class="hero-panel section-card">
          <span class="eyebrow">资料精炼后的核心卖点</span>
          <h2>${escapeHtml(settings.global.trustSummary)}</h2>
          <p>${escapeHtml(settings.global.companySummary)}</p>
          ${renderProofPoints(settings)}
        </div>
      </div>
    </section>
    <main class="container page-main">
      ${renderPlugins(homePlugins, settings)}
      ${renderSectionBlocks(sections)}
      ${renderWorkflowOverview()}
      ${renderSolutionCards(solutionPages)}
      ${renderSolutionCards(industryPages)}
      ${renderGeoSeoSection(settings)}
      <section class="content-section section-card">
        <div class="section-head">
          <span class="eyebrow">内容矩阵</span>
          <h2>文章不是装饰，而是拿搜索词和 AI 检索入口的底盘</h2>
        </div>
        ${renderArticleCards(articles)}
      </section>
      ${renderPricingCards(pricing)}
      ${renderFaqs(faqs)}
      ${renderResourceLinks(settings, links)}
      ${renderLeadForm(settings, '/')}
      ${renderPlugins(bottomPlugins, settings)}
    </main>
  `;

  const origin = inferSiteOrigin(url, settings);
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: settings.global.brandName,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Cloudflare Pages / Browser',
      description: settings.global.defaultMetaDescription,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock'
      },
      url: origin
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } }))
    }
  ];

  return htmlResponse(renderLayout({
    settings,
    url,
    title: homePage?.meta_title || settings.global.defaultMetaTitle,
    description: homePage?.meta_description || settings.global.defaultMetaDescription,
    path: '/',
    body,
    schema,
    keywords: settings.global.defaultKeywords
  }), { headers: { 'cache-control': 'public, max-age=300' } });
}

function buildFaqSchema(faqs) {
  if (!faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } }))
  };
}

async function renderLandingPage(url, env, page) {
  const settings = await getSettings(env);
  const hero = safeJsonParse(page.hero_json, {});
  const sections = safeJsonParse(page.sections_json, []);
  const faqs = await getFaqsForPage(env, page.page_type, page.slug, 8);
  const relatedArticles = await getLatestArticles(env, 3);
  const relatedPages = await getRelatedPagesByKeyword(env, page.target_keyword, 4);
  const links = await pickOutboundLinks(env, page.target_keyword, 'article', 4);
  const pagePlugins = await getPluginsBySlot(env, `${page.slug}.afterHero`);
  const globalPlugins = await getPluginsBySlot(env, 'global.bottomCTA');
  const path = normalizePagePath(page);
  const breadcrumbs = [
    { label: '首页', url: '/' },
    { label: page.page_type === 'industry' ? '行业页' : '方案页', url: page.page_type === 'industry' ? '/#industry' : '/#solutions' },
    { label: page.title }
  ];
  const body = `
    <section class="hero hero-simple">
      <div class="container hero-grid single">
        <div class="hero-copy">
          ${renderBreadcrumbs(breadcrumbs)}
          <span class="eyebrow">${escapeHtml(page.page_type === 'industry' ? '行业增长页' : '解决方案页')}</span>
          <h1>${escapeHtml(page.title)}</h1>
          <p class="hero-subtitle">${escapeHtml(page.subtitle || page.summary || '')}</p>
          <p class="hero-answer"><strong>AI 检索摘要：</strong>${escapeHtml(hero.quickAnswer || page.summary || '')}</p>
          <p class="hero-definition">${escapeHtml(hero.definition || '')}</p>
          <ul class="bullet-list">
            ${(hero.bullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
          <div class="cta-actions">
            <a class="button primary" href="${escapeHtml(settings.global.telegramUrl)}" target="_blank" rel="noopener">Telegram 咨询</a>
            <a class="button ghost" href="${escapeHtml(settings.global.whatsappUrl)}" target="_blank" rel="noopener">WhatsApp 咨询</a>
          </div>
        </div>
      </div>
    </section>
    <main class="container page-main">
      ${renderPlugins(pagePlugins, settings)}
      ${renderSectionBlocks(sections)}
      ${relatedPages.length ? `<section class="content-section section-card"><div class="section-head"><span class="eyebrow">相关页面</span><h2>同主题页面推荐</h2></div>${renderSolutionCards(relatedPages.filter((item) => item.slug !== page.slug))}</section>` : ''}
      ${renderFaqs(faqs)}
      ${renderResourceLinks(settings, links)}
      <section class="content-section section-card">
        <div class="section-head">
          <span class="eyebrow">相关内容</span>
          <h2>可以继续扩展的文章入口</h2>
        </div>
        ${renderArticleCards(relatedArticles)}
      </section>
      ${renderLeadForm(settings, path)}
      ${renderPlugins(globalPlugins, settings)}
    </main>
  `;

  const pathValue = normalizePagePath(page);
  const origin = inferSiteOrigin(url, settings);
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': page.schema_type || 'Service',
      name: page.title,
      description: page.meta_description || page.summary,
      provider: {
        '@type': 'Organization',
        name: settings.global.brandName,
        url: origin
      },
      areaServed: 'Global',
      url: `${origin}${pathValue === '/' ? '' : pathValue}`
    }
  ];
  const faqSchema = buildFaqSchema(faqs);
  if (faqSchema) schema.push(faqSchema);
  return htmlResponse(renderLayout({
    settings,
    url,
    title: page.meta_title || `${page.title} | ${settings.global.brandName}`,
    description: page.meta_description || page.summary || settings.global.defaultMetaDescription,
    path: pathValue,
    body,
    schema,
    keywords: `${page.target_keyword || ''},${settings.global.defaultKeywords}`
  }), { headers: { 'cache-control': 'public, max-age=300' } });
}

async function renderBlogIndex(url, env) {
  const settings = await getSettings(env);
  const articles = await dbAll(env, 'SELECT * FROM articles WHERE status = ? ORDER BY published_at DESC', ['published']);
  const links = await pickOutboundLinks(env, 'SEO GEO 内容', 'article', 4);
  const body = `
    <section class="hero hero-simple">
      <div class="container hero-grid single">
        <div class="hero-copy">
          ${renderBreadcrumbs([{ label: '首页', url: '/' }, { label: '文章' }])}
          <span class="eyebrow">内容中心</span>
          <h1>文章矩阵：用问题型内容拿搜索词</h1>
          <p class="hero-subtitle">文章不是补充，而是网站长期 SEO / GEO 的主体。建议围绕“是什么、怎么做、对比、案例、行业”持续扩站。</p>
        </div>
      </div>
    </section>
    <main class="container page-main">
      <section class="content-section section-card">
        ${renderArticleCards(articles)}
      </section>
      ${renderResourceLinks(settings, links)}
      ${renderLeadForm(settings, '/blog')}
    </main>
  `;
  return htmlResponse(renderLayout({
    settings,
    url,
    title: `文章中心 | ${settings.global.brandName}`,
    description: '围绕 AI 外贸获客软件、TikTok、WhatsApp、社媒矩阵、AI广告、AI客服、SEO / GEO 的内容中心。',
    path: '/blog',
    body,
    schema: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: '文章中心' }],
    keywords: settings.global.defaultKeywords
  }), { headers: { 'cache-control': 'public, max-age=300' } });
}

async function renderArticlePage(url, env, article) {
  const settings = await getSettings(env);
  const articleHtml = markdownToHtml(article.content_md || '');
  const faqs = await getFaqsForPage(env, 'global', '', 4);
  const relatedPages = (await getRelatedPagesByKeyword(env, article.target_keyword, 4)).filter((page) => page.slug !== 'home');
  const relatedArticles = (await getLatestArticles(env, 4)).filter((item) => item.slug !== article.slug).slice(0, 3);
  const links = await pickOutboundLinks(env, article.target_keyword, 'article', 4);
  const body = `
    <section class="hero hero-simple article-hero">
      <div class="container hero-grid single">
        <div class="hero-copy">
          ${renderBreadcrumbs([{ label: '首页', url: '/' }, { label: '文章', url: '/blog' }, { label: article.title }])}
          <span class="eyebrow">${escapeHtml(article.category || '文章')}</span>
          <h1>${escapeHtml(article.title)}</h1>
          <p class="hero-subtitle">${escapeHtml(article.excerpt || '')}</p>
          <div class="meta-row inline"><span>${escapeHtml(article.author_name || '')}</span><time datetime="${escapeHtml(article.published_at)}">${escapeHtml(formatDate(article.published_at))}</time></div>
        </div>
      </div>
    </section>
    <main class="container page-main article-layout">
      <article class="article-content section-card prose">
        <div class="summary-box">
          <strong>AI 检索摘要：</strong>
          <p>${escapeHtml(article.excerpt || '')}</p>
        </div>
        ${articleHtml}
      </article>
      <aside class="article-sidebar">
        ${relatedPages.length ? `<div class="section-card sticky-card"><span class="eyebrow">相关方案页</span><div class="stack-links">${relatedPages.map((page) => `<a href="${escapeHtml(normalizePagePath(page))}">${escapeHtml(page.title)}</a>`).join('')}</div></div>` : ''}
        ${renderResourceLinks(settings, links)}
      </aside>
      <div class="article-bottom">
        ${renderFaqs(faqs)}
        ${relatedArticles.length ? `<section class="content-section section-card"><div class="section-head"><span class="eyebrow">相关阅读</span><h2>继续扩展这组搜索词</h2></div>${renderArticleCards(relatedArticles)}</section>` : ''}
        ${renderLeadForm(settings, `/blog/${article.slug}`)}
      </div>
    </main>
  `;
  const origin = inferSiteOrigin(url, settings);
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.excerpt,
      author: { '@type': 'Person', name: article.author_name || settings.global.brandName },
      datePublished: article.published_at,
      dateModified: article.updated_at,
      mainEntityOfPage: `${origin}/blog/${article.slug}`,
      publisher: { '@type': 'Organization', name: settings.global.brandName }
    }
  ];
  const faqSchema = buildFaqSchema(faqs);
  if (faqSchema) schema.push(faqSchema);
  return htmlResponse(renderLayout({
    settings,
    url,
    title: article.meta_title || `${article.title} | ${settings.global.brandName}`,
    description: article.meta_description || article.excerpt || settings.global.defaultMetaDescription,
    path: `/blog/${article.slug}`,
    body,
    schema,
    keywords: `${article.target_keyword || ''},${settings.global.defaultKeywords}`
  }), { headers: { 'cache-control': 'public, max-age=300' } });
}

async function renderContactPage(url, env) {
  const settings = await getSettings(env);
  return htmlResponse(renderLayout({
    settings,
    url,
    title: `联系咨询 | ${settings.global.brandName}`,
    description: '通过 Telegram、WhatsApp、微信或表单与我们联系，线索会自动进入后台 CRM。',
    path: '/contact',
    body: renderContactPageBody(settings),
    schema: [{ '@context': 'https://schema.org', '@type': 'ContactPage', name: '联系咨询' }],
    keywords: settings.global.defaultKeywords
  }));
}

async function renderRobots(url, env) {
  const settings = await getSettings(env);
  const origin = inferSiteOrigin(url, settings);
  return textResponse(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
}

async function renderLlms(url, env) {
  const settings = await getSettings(env);
  const origin = inferSiteOrigin(url, settings);
  const pages = await dbAll(env, 'SELECT title, slug, page_type, summary FROM landing_pages WHERE status = ? ORDER BY updated_at DESC LIMIT 8', ['published']);
  const articles = await getLatestArticles(env, 8);
  const pageLines = pages.map((page) => `- ${page.title}: ${origin}${normalizePagePath(page)} — ${page.summary || ''}`);
  const articleLines = articles.map((article) => `- ${article.title}: ${origin}/blog/${article.slug} — ${article.excerpt || ''}`);
  return textResponse(`# ${settings.global.brandName}\n\n> ${settings.global.defaultMetaDescription}\n\n## Site summary\n${settings.global.geoSummary}\n\n## Core pages\n${pageLines.join('\n')}\n\n## Articles\n${articleLines.join('\n')}\n\n## Contact\n- Telegram: ${settings.global.telegramUrl}\n- WhatsApp: ${settings.global.whatsappUrl}\n- WeChat: ${settings.global.wechatId}\n`);
}

async function renderFeed(url, env) {
  const settings = await getSettings(env);
  const origin = inferSiteOrigin(url, settings);
  const articles = await getLatestArticles(env, 20);
  const items = articles.map((article) => `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${origin}/blog/${article.slug}</link>
      <guid>${origin}/blog/${article.slug}</guid>
      <pubDate>${new Date(article.published_at).toUTCString()}</pubDate>
      <description><![CDATA[${article.excerpt || ''}]]></description>
    </item>
  `).join('');
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>${escapeHtml(settings.global.brandName)}</title>
      <link>${origin}</link>
      <description>${escapeHtml(settings.global.defaultMetaDescription)}</description>
      ${items}
    </channel>
  </rss>`);
}

async function renderSitemap(url, env) {
  const settings = await getSettings(env);
  const origin = inferSiteOrigin(url, settings);
  const pages = await dbAll(env, 'SELECT slug, page_type, updated_at FROM landing_pages WHERE status = ?', ['published']);
  const articles = await dbAll(env, 'SELECT slug, updated_at FROM articles WHERE status = ?', ['published']);
  const urls = [
    { loc: `${origin}/`, lastmod: nowIso() },
    { loc: `${origin}/blog`, lastmod: nowIso() },
    { loc: `${origin}/contact`, lastmod: nowIso() },
    ...pages.map((page) => ({ loc: `${origin}${normalizePagePath(page) === '/' ? '' : normalizePagePath(page)}`, lastmod: page.updated_at || nowIso() })),
    ...articles.map((article) => ({ loc: `${origin}/blog/${article.slug}`, lastmod: article.updated_at || nowIso() }))
  ];
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls.map((entry) => `<url><loc>${entry.loc}</loc><lastmod>${entry.lastmod}</lastmod></url>`).join('')}
  </urlset>`);
}

function renderSetupPage(request) {
  const url = new URL(request.url);
  return htmlResponse(`<!doctype html>
  <html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cloudflare D1 未绑定</title><style>body{font-family:Inter,system-ui,sans-serif;background:#0b1220;color:#fff;padding:40px}code{background:#111827;padding:2px 6px;border-radius:6px}</style></head>
  <body>
    <h1>站点已上传，但还没有绑定 D1 数据库</h1>
    <p>请先在 Cloudflare Pages 项目里创建并绑定 <code>DB</code>（D1），可选绑定 <code>MEDIA_BUCKET</code>（R2）。然后重新部署即可完成自动初始化。</p>
    <p>你当前访问的是：${escapeHtml(url.host)}</p>
  </body></html>`, { status: 500 });
}

async function maybeServeMedia(path, env) {
  if (!env.MEDIA_BUCKET) return null;
  const key = decodeURIComponent(path.replace(/^\/media\//, ''));
  if (!key || isUnsafeSlug(key)) return null;
  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) return null;
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=3600');
  return new Response(object.body, { headers });
}

function notFoundPage(url) {
  return htmlResponse(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>页面未找到</title><link rel="stylesheet" href="/assets/css/app.css"></head><body><main class="container page-main"><section class="section-card"><h1>页面未找到</h1><p>返回首页继续查看方案页、文章和咨询入口。</p><a class="button primary" href="/">返回首页</a></section></main></body></html>`, { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/assets/') || url.pathname === '/favicon.svg' || url.pathname === '/manifest.webmanifest' || url.pathname.startsWith('/admin/')) {
      return env.ASSETS.fetch(request);
    }

    if (!env.DB) {
      return renderSetupPage(request);
    }

    await ensureInitialized(env);

    if (url.pathname.startsWith('/media/')) {
      const mediaResponse = await maybeServeMedia(url.pathname, env);
      if (mediaResponse) return mediaResponse;
    }

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    const path = parseRequestPath(url);
    if (path === '/robots.txt') return renderRobots(url, env);
    if (path === '/sitemap.xml') return renderSitemap(url, env);
    if (path === '/feed.xml') return renderFeed(url, env);
    if (path === '/llms.txt') return renderLlms(url, env);
    if (path === '/admin') {
      return env.ASSETS.fetch(new Request(`${url.origin}/admin/index.html`, request));
    }
    if (path === '/') return renderHome(url, env);
    if (path === '/blog') return renderBlogIndex(url, env);
    if (path === '/contact') return renderContactPage(url, env);

    const blogMatch = path.match(/^\/blog\/([^/]+)$/);
    if (blogMatch) {
      const article = await getArticleBySlug(env, blogMatch[1]);
      if (article) return renderArticlePage(url, env, article);
      return notFoundPage(url);
    }

    const solutionMatch = path.match(/^\/(solutions|industries|compare|geo)\/([^/]+)$/);
    if (solutionMatch) {
      const page = await getPageBySlug(env, solutionMatch[2]);
      if (page) return renderLandingPage(url, env, page);
      return notFoundPage(url);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;
    return notFoundPage(url);
  }
};

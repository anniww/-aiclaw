# aiclawchuhai.shop - Cloudflare Pages 长期运营版官网

这是一个为 **AI 外贸获客软件** 定制的长期运营站点，不是临时单页。

## 你现在拿到的是什么
- 前台官网：SEO / GEO / 文章 / 方案页 / 行业页 / 联系页
- 管理后台：CMS / CRM / SEO / FAQ / 外链资源池 / 插件区块 / 媒体上传
- Cloudflare Pages 高兼容结构：静态资源 + `_worker.js` 全站路由
- 数据层：D1（必须）+ R2（可选，但推荐）
- 自动生成：robots.txt / sitemap.xml / feed.xml / llms.txt

## 默认联系入口
- Telegram: https://t.me/aiclawchuhai
- WhatsApp: https://wa.me/85252195605
- 微信: 17276592029

## 默认管理员
- 用户名：`admin`
- 密码：`ChangeMe123!`

> 首次登录后务必立刻修改密码。

## 目录说明
- `site/`：Cloudflare Pages 的站点输出目录
- `site/_worker.js`：全站路由、API、页面渲染、D1/R2 操作
- `site/admin/`：后台登录页
- `site/assets/`：前台与后台共用 CSS / JS
- `plugin-examples/`：示例插件 JSON，可导入后台“插件区块”模块
- `docs/资料分析与建站定位.md`：基于资料的定位梳理
- `wrangler.jsonc`：最小可用 Pages 配置（只声明输出目录）
- `wrangler.bindings.example.jsonc`：包含 D1 / R2 绑定示例

## 快速部署到 GitHub + Cloudflare Pages
### 1）上传仓库
把整个仓库上传到 GitHub。

### 2）创建 Cloudflare Pages 项目
在 Cloudflare Pages 中连接你的 GitHub 仓库。

建议：
- Framework preset: `None`
- Build command: 留空
- Build output directory: `site`

### 3）绑定 D1（必须）
创建一个 D1 数据库，例如：`aiclawchuhai-db`

然后到 Pages 项目设置里绑定：
- Binding name: `DB`
- Type: `D1 database`

### 4）绑定 R2（推荐）
创建一个 R2 bucket，例如：`aiclawchuhai-media`

然后绑定：
- Binding name: `MEDIA_BUCKET`
- Type: `R2 bucket`

如果不绑定 R2：
- 网站仍可运行
- 但后台“媒体上传”不可用

### 5）自定义域名
把 `aiclawchuhai.shop` 绑定到这个 Pages 项目。

## 首次运行会发生什么
第一次请求时，系统会自动：
- 创建数据表
- 写入默认站点设置
- 写入默认价格计划
- 写入默认方案页 / 行业页 / 文章 / FAQ / 外链资源 / 插件示例
- 创建默认管理员账号

## 后台能改什么
### 全局设置
- 品牌名
- 站点标题与描述
- SEO 关键词
- Telegram / WhatsApp / 微信
- 页脚说明
- GEO 摘要

### 价格计划
- 套餐名称
- 价格展示
- 计费说明
- CTA 按钮

### 方案 / 行业页
- slug
- 页面类型
- 标题、副标题、摘要
- target keyword
- meta title / meta description
- hero JSON
- sections JSON
- FAQ JSON

### 文章系统
- markdown 正文
- 封面图链接
- 分类、标签
- 发布状态、发布时间

### FAQ
- 全局 FAQ
- 方案页 FAQ
- 行业页 FAQ

### 外链资源池
- 名称
- URL
- 分类
- 关键词 JSON
- 展示位置

### 插件区块
这是“受控插件”，不是上传任意服务器程序。
你可以通过 JSON 配置给站点增加区块，例如：
- 数据统计条
- 强 CTA 横条
- 自定义 HTML 模块

导入方式：
1. 后台登录
2. 打开“插件区块”
3. 点击“导入 JSON”
4. 选择 `plugin-examples/` 内的示例文件，或你自己的 JSON

### 线索 CRM
前台提交表单后会自动记录：
- 来源页
- UTM 参数
- 联系方式
- 留言内容
- 跟进状态
- 备注

## 本站已经做好的搜索基础设施
- 首页 + 方案页 + 行业页 + 文章页 + 联系页
- FAQ 结构化内容
- 语义化 Answer / Definition / Problem / Workflow 模块
- robots.txt
- sitemap.xml
- feed.xml
- llms.txt
- JSON-LD
- 后台可持续更新内容

## 本站为什么更适合长期排名
因为它不是把 PDF 照搬上网页，而是把内容重新整理成搜索引擎和 AI 检索都更容易理解的结构：
- 主词
- 方案词
- 行业词
- 问题词
- FAQ
- 外链资源池
- 持续更新文章

## 本地预览（可选）
如果你想在本地跑：
1. 安装 Node.js
2. 安装 Wrangler
3. 运行：

```bash
npx wrangler pages dev ./site
```

如果你想本地测试 D1 / R2，请参考 `wrangler.bindings.example.jsonc` 补齐绑定信息。

## 推荐的上线后动作
1. 先改后台默认密码
2. 先改品牌名、联系方式、价格文案
3. 补 20~50 篇围绕外贸获客的文章
4. 按行业新建更多行业页
5. 按国家 / 场景扩充 GEO 页
6. 维护外链资源池，只保留高相关外链

## 注意
- 本项目已实现“可导入的区块插件”，但没有做“上传任意可执行服务器插件”，这是出于安全性与 Cloudflare Pages 运行方式考虑。
- 若你以后要接更复杂的多用户权限、销售管道自动化、邮件通知、支付订阅，再继续扩展 D1 表结构即可。

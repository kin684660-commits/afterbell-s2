# Afterbell 部署与回滚

## 当前验收地址

https://afterbell.43.167.174.154.nip.io/

2026-10-03 已验证首页、实际模型研究的 NDJSON 流、保存、Markdown 导出及跨访客访问拒绝。本轮东京服务器已独立运行并重新验收；此前临时隧道仅为本机演示。运行密钥通过腾讯云隐藏参数配置，没有公开上传环境文件或旧数据库。

## 推荐稳定托管

可以部署到用户已有 Linux 服务器，也可以选择 Render 的 Docker Web Service。项目已提供 Dockerfile、compose.yaml 和 render.yaml。Render 默认临时文件系统，免费实例会休眠且不支持持久磁盘；保持当前 SQLite 研究记录需要付费实例与持久磁盘。Render 部署配置只是待执行方案，未创建付费服务，也没有扣费。官方说明：https://render.com/docs/disks 和 https://render.com/docs/free。

1. 私有 GitHub 仓库保存代码；只授权托管服务访问这一仓库，不公开源码。
2. 在控制台设置 DeepSeek 地址、模型名、密钥；密钥仅作为运行环境变量，不作 Docker 构建参数，不上传 .env.local。
3. 设置 AFTERBELL_PUBLIC_DEMO=1；生成不少于32字符的独立 AFTERBELL_SESSION_SECRET；保持一次部署一个实例。
4. 为 /app/data 挂载持久磁盘，数据库设为 /app/data/afterbell.sqlite。
5. 发布后在独立浏览器验证真实研究、刷新历史、导出以及另一个访客无法读到记录。
6. 限额默认每天20次、同时2次、每个访客一分钟1次。当前限额保存在单进程内，重启会重置，匿名访客可更换会话；上线后仍需平台预算告警与边缘限流，不能把它描述为严格账单预算。

东京使用官方Node24运行镜像及云端standalone构建，真实取数、DeepSeek调用和保存导出已验收；来源仍可能限流。

## 已有服务器

复制 .env.production.example 为 .env.production，按控制台/服务器安全输入密钥与会话秘密，限制文件权限。执行 docker compose up -d --build。默认应用仅绑定127.0.0.1:3000；在既有反向代理上启用 HTTPS，转发到该地址，允许长响应/关闭代理缓冲（研究为 NDJSON，而非 SSE）。不开启交易权限。

SQLite 单实例持久化。备份须使用 SQLite backup 接口或停服务后复制完整数据库，不能只复制运行中的主文件而丢掉 WAL。发布前备份；回滚使用之前镜像与保留的磁盘。停止服务和撤销隧道均可关闭公开访问；保留原始本地开发库。

## 隐私与边界

公共模式使用签名、HttpOnly、SameSite=Lax 的访客 Cookie，按访客隔离查询、历史和导出。另一个访客猜中记录ID也返回404。清除 Cookie 后不能恢复旧记录；这不是账户系统。研究问题会发送到 DeepSeek，公开资料会发送至该模型用于分析；不要填写账户凭据或私人持仓明细。真实来源服务仍有失败、延迟未知和许可/SLA待核实的限制。

## 2026-10-04 东京部署验收

核对时间：2026-10-04（北京时间）。

已完成腾讯云东京实例部署，HTTPS Demo：https://afterbell.43.167.174.154.nip.io/
参赛材料：https://afterbell.43.167.174.154.nip.io/submission/index.html

用户授权安装官方 TAT 并重启后，TAT 已在线、实例已完成普通重启。未重置服务器密码。部署前磁盘剩36GB，部署后35GB；2GB物理内存，部署后可用约640MB、2GB交换空间未使用。应用实测约99MB，限制384MB、CPU0.5核；构建采用Webpack单工作进程，限制768MB并通过类型检查。首轮Turbopack构建被终止，已由低内存构建解决。

独立项目：/opt/afterbell-s2/releases/20261004-0135；SQLite持久目录：/opt/afterbell-s2/data。运行配置 /opt/afterbell-s2/runtime.env 为root权限600，通过腾讯云TAT隐藏参数传输，不放入源码或公开材料。原本的Caddy配置先备份到Caddyfile.before-afterbell-20261004，再追加独立域名并验证、平滑重载。其他虚拟主机保留；四个已有容器均在运行。应用3008只绑定既有Docker桥地址，经Caddy提供HTTPS。

验收：浏览器HTTPS和本机公网请求通过；真实NVDA研究30.3秒、13份实际证据、9/16工具成功、DeepSeek调用与引用复核完成，结论wait、记录partial。保存、Markdown/JSON导出通过，跨访客读取返回404，模拟模式返回400。官方部分服务仍不可用，不能把部署完成描述为数据层全部补齐。新增Nasdaq备用来源解决东京Yahoo 429时原生股取数；日期级观测不冒充实时或具体成交时刻。三标的云端取数核对均成功。软件测试31项通过，不等于投研准确率。

HTTPS采用nip.io解析域名，依赖该免费DNS服务；未购买托管。它现在由云端独立运行，不依赖本机临时隧道。建议正式比赛长期使用自己域名；当前没有提供域名，未擅改用户DNS。

回滚：使用 /opt/afterbell-s2/releases/20261004-0050/compose.yaml 执行同项目Docker Compose up，保留研究数据。首版没有Nasdaq备用来源。只撤回Afterbell的Caddy域名块时需保留其他现有配置；不能直接恢复旧备份而覆盖部署后他人新增配置。

未执行报名提交、X发布、公开源码。需要用户补队伍名称、联系人和X实际发布链接；独立准确性评估与3名真实用户验证仍待完成。

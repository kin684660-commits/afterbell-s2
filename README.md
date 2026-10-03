# Afterbell

美股收盘后，先核实事件，再形成判断。Afterbell 为研究科技股事件的个人交易者提供官方证据、业务与资产影响链、原生股及股票永续检查、反证和等待条件。证据不足时明确返回暂无法判断；人作最终决策。

Evidence-first after-hours US equity research. AI Trading Desk / Information Extraction & Signal Generation.

公开仓库：https://github.com/kin684660-commits/afterbell-s2 · 团队：杉研 Afterbell · MIT 开源

## 当前交付状态

本地真实在线研究已贯通：DeepSeek、公司/政策官方资料、原生 Nasdaq 股票快照、Bitget 官方只读 SDK 的股票永续身份/报价/盘口/价格序列。首页不提供模拟数据。东京 HTTPS Demo 已上线并完成真实研究、保存和导出验收。获奖与投资效果未验证。

基本面备用来源已修复：三个标的均实际取得 SEC XBRL 财务披露和 Nasdaq 公司资料、盈利一致预期（财季/财年、EPS 均值、高低区间、分析师数量）。SEC 单季数据仅选择70–110日披露，年初至今累计不冒充单季；缺失季度不推算。Nasdaq 预期更新日期与会计口径未提供，营收一致预期尚未取得，不计算 beat/miss。美国财政部日收益率提供宏观备用背景；原服务错误保留。

## 运行

要求 Node.js 24+、npm。SQLite 使用 Node 内置模块，开发服务仅绑定本机。

```sh
npm ci
cp .env.example .env.local
# 在编辑器内填写 AFTERBELL_API_KEY，不要发送到聊天或提交 Git
npm run dev
```

打开 http://127.0.0.1:3000。首页仅运行真实在线研究；无模型密钥会显示明确失败，不使用假模型结果。历史案例仅供独立测试脚本验证。

DeepSeek defaults: `AFTERBELL_API_BASE=https://api.deepseek.com`, `AFTERBELL_MODEL=deepseek-flash`. 可在环境中改变模型。配置后重新启动服务。

## 模式与来源

- Online: latest company/Federal Reserve feeds, or a specified allowlisted official URL; server-side model reasoning.
- Evaluation only: ten retrospective official events for actual model comparison, plus ten explicitly synthetic failure fixtures for software tests. Neither appears as live product data.
- Bitget equity MCP: discover `guide`/`do_query`, query quote/profile/income/ratios/consensus/history. The upstream backend returned 503 during verification; failures are visible.
- Official Bitget Skill + Agent SDK: discover public `market` actions with `readOnly: true`, verify online stock-perpetual instrument identity, fetch tickers, top-five orderbook and 48 hourly candles. No account modules or credentials are configured.
- Official `bitget-signal` macro-analyst/news-briefing: actual rates/news MCP calls. Current responses were empty/error-only and are rejected as unavailable.
- Native equity fallback: Yahoo Finance native EQUITY/Nasdaq/USD identity and 5-day hourly history validated for all three symbols; on failure, actual Nasdaq common-stock dollar quotes are checked with explicit date-only precision and unavailable candles. Quote observation time is retained; delay is unknown and weekend prices are previous-session snapshots. This unofficial public endpoint has no SLA; a licensed feed remains a production requirement.
- Native shares and stock perpetuals are displayed separately. Actual perpetual bid/ask/depth are snapshots, not guaranteed fills. No redeemable-token mapping or cross-market arbitrage is assumed.
- SEC Companyfacts structured financial discovery is implemented for the three verified issuer CIKs. This is not a full 8-K document search. Configure `AFTERBELL_SEC_USER_AGENT` with a real contact address for deployment.

## Structure

`app/`: UI and server routes. `lib/`: evidence retrieval, MCP, model, guardrails, cases and SQLite. `tests/`: failure and provenance checks. `scripts/`: retrospective capture and evaluation. `docs/`: submission drafts, actual-video script and user study protocol.

## Interfaces

- `POST /api/research`: question, symbol (AAPL/MSFT/NVDA), mode (live only; case replay is rejected by HTTP), officialSourceUrl, useModel, language (zh/en). Returns persisted run and status; runs execute within the request in this local version.
- `GET /api/research`: recent runs, isolated by signed visitor session in public mode.
- `GET /api/research/:id`: status, evidence, market, analysis, errors, engine, timing and token usage.
- `GET /api/research/:id/export`: Markdown; add `?format=json` for structured record.

Public demo mode implements signed visitor sessions, per-owner record isolation, process-local admission limits and a separate public database. It is not an account system; restarting resets the limiter. See docs/DEPLOYMENT_ZH.md for persistent storage and deployment limits.

## Verification

```sh
npm test
npm run build
# Small-memory servers: npm run build:low-memory
npm run evaluate
npm run capture:sources
npm run compare
```

`evaluate` checks deterministic replay behavior only. `compare` makes up to 40 real model calls for 20 paired scenarios; set `AFTERBELL_EVAL_LIMIT=3` for a smaller run. Only real-event cases enter model comparison. Calls may incur provider charges. Token usage is observed; cost is left unknown until provider billing is verified. Human review is required for factual accuracy and risk-recognition scores.

## Important limits

- Exact-quote matching proves quote provenance, not semantic truth or completeness.
- A second model call reviews complete factual claim-to-excerpt support. Rejected claims are removed and dependent summary/hypotheses suppressed; reviewer failure hides draft claims. This is same-model review, not independent fact checking. Review counts/reasons and token usage are exported.
- Calendar covers scheduled NYSE equity sessions for 2026–2028; extraordinary closures and instrument-specific schedules remain unverified.
- Retrospective captures do not prevent a model from knowing later outcomes. No backtest, return or investment-performance claim.
- Prompt-injection resistance is constrained by a research-only architecture with no account tools; real model robustness still needs evaluation.
- Ten real model pairs have been collected; see docs/EVALUATION.md for observed structural checks and their limits. Three-user study and independent accuracy review remain pending. The Chinese tutorial and logged-out public access checks were completed during the October 3 sprint.
- Source publication is authorized under the MIT license. Credentials, session secrets, SQLite databases and private registration information are excluded. Competition submission is performed by the team owner.

See docs/SUBMISSION.md for honest submission draft and docs/USER_STUDY.md for the validation protocol.

## Upgraded product behavior

Live progress streams over NDJSON when requested, preserving evidence before inference. User horizon/risk preference shapes the prompt. Output includes concise decision brief, event/business/asset chain, bull/bear hypotheses, counter-evidence, falsifiable conditions and follow-up research. The server binds model-selected quotation IDs to actual acquired excerpts and rejects fabricated IDs. Provenance is checked; semantic support still needs review. Markdown/JSON include native and perpetual snapshots, evidence timestamps/hashes and tool traces.

## Demo and competition materials

- Team: 杉研 Afterbell (Cedar)
- Track: AI Trading Desk · 信息提炼与信号生成
- Demo: https://afterbell.43.167.174.154.nip.io/
- Materials and Chinese tutorial: https://afterbell.43.167.174.154.nip.io/submission/index.html
- Actual Tokyo research record: [Markdown](https://afterbell.43.167.174.154.nip.io/submission/tokyo-research.md) / [JSON](https://afterbell.43.167.174.154.nip.io/submission/tokyo-research.json)
- Product introduction and video: https://x.com/Cedar_0x/status/2106448781239857187

Tokyo deployment verified on October 4, 2026 (UTC+8). It runs independently of the development Mac. Node24 standalone runs with persistent SQLite and HTTPS behind Caddy. Public access depends on the server and the free nip.io DNS service. See [deployment and rollback](docs/DEPLOYMENT_ZH.md).

Observed live NVDA task: 30.3 seconds, 13 acquired evidence items, 9/16 tool calls successful, engine `llm`, status `partial`, conclusion `wait`. Historical report snapshots are not current quotes. Yahoo rate limits fall back to actual Nasdaq common-stock quotes; date-only observations never invent intraday time or candles. Some upstream services remain unavailable, and public data licensing, delay and SLA are not fully verified.

31 software tests pass. Independent research accuracy assessment and real-user validation remain pending; software checks are not investment-performance evidence. No trade execution or account permissions.

## License and data

Source code is available under [MIT](LICENSE). The 143-second tutorial is hosted at the linked public demo and X post; the video binary is excluded from this source release. Third-party packages retain their own licenses. External source excerpts, provider responses and research snapshots remain subject to their respective owners' rights and terms; the code license does not grant market-data redistribution rights or a production data entitlement. Use the dated snapshots for reviewing provenance and methodology, not as live trading data.

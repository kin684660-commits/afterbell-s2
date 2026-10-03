# Afterbell — submission draft

Track: AI Trading Desk · Information Extraction & Signal Generation

## 1. Thesis

US equities have scheduled market hours, while events continue outside them. Afterbell helps a human researcher distinguish an official event, a business implication and an executable market opportunity. These are separate claims requiring separate evidence. The product preserves evidence timestamps and refuses to manufacture executable pricing or token mappings.

## 2. Target user and product value

The initial user is an individual US-equity investor who needs to review company and macro events outside regular hours, particularly across time zones. The first scope is AAPL, MSFT and NVDA. The value hypothesis is faster evidence-based review with fewer unsupported conclusions; this has not yet been confirmed by a real-user study.

## 3. Validation and metrics

Twenty source-linked scenarios exist: ten official historical events and ten explicitly synthetic stress conditions. Captures are retrospective, not point-in-time historical snapshots. Deterministic replay checks validate plumbing, not model quality. Ten real DeepSeek model pairs and three live asset workflows have been executed. Structured/quotation validation passed in the reported ten-pair run; this is not a factual-accuracy score or a blinded review. Three-person user testing remains pending. No returns, Sharpe, user count, retention or cost claims are made.

## 4. Progress

Implemented: Next.js/TypeScript interface, Chinese/English controls, SQLite persistence, official feeds, specified official URL retrieval, Bitget read-only MCP catalog discovery and quote query, DeepSeek-compatible model adapter, citation ID and exact-quote validation, NYSE schedule handling, replay, JSON and Markdown export. Real model execution is verified. The upgraded interface includes live progress, asset/horizon/risk settings, reasoning chain, counter-theses and follow-up research. Official Agent SDK public reads return actual stock-perpetual identity, quotes, book and hourly history. Native equity fallback returns Nasdaq/USD snapshots; its observation time and unknown delay are explicit. Bitget's quote backend returned an upstream 503 during inspection. Public deployment, repository creation and real-user validation remain pending.

## 5. Deliverables

Local source project, README, tests, retrospective source captures, evaluation tools, user-study protocol, demo recording script and X draft. Replace this paragraph with verified public links only after deployment and access checks.

## 6. View on AI trading

An LLM is useful for synthesizing evidence and expressing competing explanations. It does not convert stale prices or missing expectations into a verified trade. Research abstention, provenance and a human decision boundary are intentional product behaviors.

## Role of the LLM

DeepSeek is configured for extraction and event/business/asset reasoning. The server calls DeepSeek for evidence synthesis and competing explanations. It selects acquired quote IDs; the server binds the original excerpts. A structured response is not proof of semantic correctness. No Qwen usage is claimed.

## Release checklist

- Verify updated deadline with current official announcement.
- Complete independent blinded factual/risk review; real calls and ten-pair collection are completed.
- Finish user study or disclose its actual shortfall.
- Obtain approval for public repository and deployment.
- Check Demo from a logged-out browser.
- Record actual research flow, including missing-data behavior.
- Publish compliant X post only with authorization.
- Fill six-part project description directly in the submission form.
# 最新能力补充（2026-10-03）

原生行情以外的研究资料已增加真实备用接入：SEC GAAP 财务披露、Nasdaq 公司与行业资料、EPS 一致预期区间和数量、美国财政部日收益率。三个标的基本面与预期均已实取验证；原始官方 Skill 服务失败与备用来源成功分开记录，不将备用数据冒充 Bitget MCP 数据。模型引用经过原文绑定及第二次语义复核；复核不充分时主动移除陈述、撤回综合结论。语义复核仍是同模型复核，不能据此宣称事实准确率100%。营收预期、预期更新时间及会计口径仍有明确限制。

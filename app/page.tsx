"use client";
import { useEffect, useState } from "react";
import { MarketView } from "./market-view";
import { FundamentalView } from "./fundamental-view";
import type { Run } from "@/lib/types";
export default function Page() {
  const [language, setLanguage] = useState<"zh" | "en">("zh");
  const zh = language === "zh";
  const [symbol, setSymbol] = useState<"AAPL" | "MSFT" | "NVDA">("NVDA");
  const mode = "live" as const;
  const [question, setQuestion] = useState(
    "休市后的这项公告如何影响我的持仓？哪些信息还需要核实？",
  );
  const [officialSourceUrl, setOfficialSourceUrl] = useState("");
  const useModel = true;
  const [horizon, setHorizon] = useState("next-session");
  const [riskPreference, setRiskPreference] = useState("balanced");
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(false);
  const [history, setHistory] = useState<
    { id: string; symbol: string; question: string }[]
  >([]);
  const t = (cn: string, en: string) => (zh ? cn : en);
  async function refresh() {
    const [config, runs] = await Promise.all([
      fetch("/api/config").then((r) => r.json()),
      fetch("/api/research").then((r) => r.json()),
    ]);
    setConfigured(config.modelConfigured);
    setHistory(
      runs.filter((r: { engine: string; mode: string }) => r.mode === "live"),
    );
  }
  useEffect(() => {
    refresh().catch(() => setError("Unable to load server status"));
  }, []);
  async function submit() {
    setBusy(true);
    setError("");
    setRun(null);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          question,
          symbol,
          mode,
          language,
          useModel,
          horizon,
          riskPreference,
          officialSourceUrl: officialSourceUrl || undefined,
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) if (line.trim()) setRun(JSON.parse(line));
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <header>
        <a className="logo" href="/">
          afterbell<span>◒</span>
        </a>
        <div className="header-right">
          <span className="status">
            ● {t("投研 · 人作决策", "Research · Human decisions")}
          </span>
          <button onClick={() => setLanguage(zh ? "en" : "zh")}>
            {zh ? "EN" : "中文"}
          </button>
        </div>
      </header>
      <section className="hero">
        <img className="hero-art" src="/images/after-hours.png" alt="" />
        <div className="hero-content">
          <div className="eyebrow">WHEN THE BELL STOPS, CONTEXT DOESN’T.</div>
          <h1>
            {t(
              "收盘之后，\n判断之前。",
              "After the close.\nBefore the decision.",
            )}
          </h1>
          <p>
            {t(
              "核实事件，追踪证据，检查风险。给每一个判断，留下可复核的依据。",
              "Verify events. Trace evidence. Check risk. Make every conclusion reviewable.",
            )}
          </p>
          <div className="hero-tags">
            <span>AI TRADING DESK</span>
            <span>READ-ONLY</span>
            <span>AAPL / MSFT / NVDA</span>
          </div>
        </div>
      </section>
      <section className="capability-strip">
        <span>01 / {t("真实事件与市场", "Real events & market")}</span>
        <span>02 / {t("可追溯推理链", "Traceable reasoning")}</span>
        <span>03 / {t("可证伪判断", "Falsifiable judgment")}</span>
      </section>
      <section className="workspace">
        <aside>
          <div className="section-label">
            01 / {t("提出问题", "RESEARCH QUESTION")}
          </div>
          <label>{t("关注标的", "Asset")}</label>
          <div className="assets">
            {(["AAPL", "MSFT", "NVDA"] as const).map((s) => (
              <button
                key={s}
                className={symbol === s ? "active" : ""}
                onClick={() => {
                  setSymbol(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="live-tag">● {t("真实在线研究", "LIVE RESEARCH")}</div>
          <label>{t("决策窗口", "Decision horizon")}</label>
          <select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            aria-label={t("决策窗口", "Decision horizon")}
          >
            <option value="next-session">
              {t("下一个交易时段", "Next session")}
            </option>
            <option value="one-week">{t("未来一周", "One week")}</option>
            <option value="one-month">{t("未来一个月", "One month")}</option>
          </select>
          <label>{t("风险偏好", "Risk preference")}</label>
          <select
            value={riskPreference}
            onChange={(e) => setRiskPreference(e.target.value)}
            aria-label={t("风险偏好", "Risk preference")}
          >
            <option value="conservative">
              {t("保守：优先确认风险", "Conservative")}
            </option>
            <option value="balanced">
              {t("均衡：比较正反逻辑", "Balanced")}
            </option>
            <option value="aggressive">
              {t("积极：关注催化条件", "Aggressive")}
            </option>
          </select>
          <label htmlFor="source-url">
            {t("指定官方事件链接（可选）", "Official event URL (optional)")}
          </label>
          <input
            id="source-url"
            type="url"
            value={officialSourceUrl}
            onChange={(e) => setOfficialSourceUrl(e.target.value)}
            placeholder="https://…"
          />
          <label>
            {t("你需要判断什么？", "What do you need to understand?")}
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={2000}
          />
          <button
            className="primary"
            disabled={busy || question.trim().length < 8}
            onClick={submit}
          >
            {busy
              ? t("正在核验证据…", "Checking evidence…")
              : t("开始研究 ↗", "Start research ↗")}
          </button>
          <p className="note">
            {t(
              "获取官方公告、Bitget 美股数据及官方宏观/新闻 Skill。取数失败和报价过期会明确显示；不生成模拟数据。",
              "Official releases, Bitget equity data and macro/news Skills. Failures and stale observations stay explicit; no simulated data.",
            )}
          </p>
          <div className="model-status">
            {configured
              ? t("模型已配置", "Model configured")
              : t("模型尚未配置", "Model not configured")}
          </div>
        </aside>
        <div className="results">
          <div className="section-label">
            02 / {t("研究记录", "RESEARCH RECORD")}
          </div>
          {error && <div className="alert">{error}</div>}
          {!run && (
            <div className="empty">
              <img
                className="empty-art"
                src="/images/evidence-lens.png"
                alt=""
              />
              <h2>
                {busy
                  ? t("证据先行。", "Evidence first.")
                  : t("从一个具体问题开始", "Start with one concrete question")}
              </h2>
              <p>
                {t(
                  "分析将在此展示事实、推断、反证与等待条件。",
                  "Facts, inferences, counter-evidence and wait conditions will appear here.",
                )}
              </p>
              <div className="steps">
                <span>01 Evidence</span>
                <span>02 Impact</span>
                <span>03 Boundaries</span>
              </div>
            </div>
          )}
          {run && (
            <>
              <div className="pipeline">
                {Array.from(
                  new Map(run.stages?.map((s) => [s.name, s])).values(),
                ).map((stage, i) => (
                  <div key={i} className={`stage ${stage.status}`}>
                    <span>
                      {stage.status === "running"
                        ? "◌"
                        : stage.status === "failed"
                          ? "!"
                          : "✓"}
                    </span>
                    <div>
                      <b>
                        {stage.name === "evidence"
                          ? t("取证与数据", "Evidence & data")
                          : stage.name === "analysis"
                            ? t("推理与核验", "Reason & validate")
                            : t("保存与导出", "Save & export")}
                      </b>
                      <small>{stage.detail}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="run-head">
                <span className="badge">
                  {run.input.symbol} / {run.engine} / {run.status}
                </span>
                <span>{(run.durationMs / 1000).toFixed(1)}s</span>
              </div>
              <p className="hint">
                {t("研究创建时间", "Research created")}: {run.createdAt}
                <br />
                {t("下方行情为本次取证快照，不是持续更新的报价。", "Market data below is a captured research snapshot, not a continuously updating quote.")}
              </p>
              {run.errors.length > 0 && (
                <div className="alert">{run.errors.join(" · ")}</div>
              )}
              <section className="executive">
                <div className="section-label">
                  {t("判断摘要", "DECISION BRIEF")}
                </div>
                <p>
                  {run.analysis?.summary ||
                    t(
                      "分析正在进行，结论尚未完成。",
                      "Analysis in progress; no completed conclusion yet.",
                    )}
                </p>
              </section>
              <div className="decision">
                {t("结论", "Conclusion")} /{" "}
                {run.analysis?.conclusion === "insufficient"
                  ? t("暂无法判断交易行动", "Insufficient for a trade decision")
                  : t("等待核验", "Wait for verification")}
              </div>
              <MarketView run={run} zh={zh} />
              <FundamentalView run={run} zh={zh} />
              {run.analysis?.citationReview && (
                <p className="market-caution">
                  {t("引用语义复核", "Quotation review")}:{" "}
                  {run.analysis.citationReview.status === "reviewed"
                    ? t(
                        `检查 ${run.analysis.citationReview.checked} 项，移除 ${run.analysis.citationReview.removed} 项；同一模型复核，并非独立事实审计。`,
                        `Checked ${run.analysis.citationReview.checked}, removed ${run.analysis.citationReview.removed}; same-model review, not independent fact checking.`,
                      )
                    : t(
                        "未完成；草稿陈述已隐藏，可重试研究。",
                        "Unavailable; draft claims suppressed. Retry research.",
                      )}
                </p>
              )}
              {run.tools && run.tools.length > 0 && (
                <section className="panel">
                  <h3>{t("真实工具调用", "Actual tool calls")}</h3>
                  <div className="tool-grid">
                    {run.tools.map((tool, i) => (
                      <details className={`tool ${tool.status}`} key={i}>
                        <summary>
                          <span>{tool.status === "success" ? "✓" : "!"}</span>{" "}
                          {tool.label}
                          <small>
                            {tool.status === "success"
                              ? t("已获取", "Received")
                              : t("不可用", "Unavailable")}{" "}
                            · {(tool.durationMs / 1000).toFixed(1)}s
                          </small>
                        </summary>
                        <p>{tool.skill}</p>
                        {tool.error && <p>{tool.error}</p>}
                        <code>{tool.tool}</code>
                        <p>{tool.endpoint}</p>
                        <pre>{JSON.stringify(tool.arguments, null, 2)}</pre>
                      </details>
                    ))}
                  </div>
                  <p className="muted">
                    {t(
                      "调用成功仅证明取到了响应。日期、统计口径与可交易性仍须核实。",
                      "A successful call proves receipt, not freshness, metric comparability or executability.",
                    )}
                  </p>
                </section>
              )}
              {run.analysis && (
                <>
                  {!!run.analysis.impactChain?.length && (
                    <section className="panel impact">
                      <h3>
                        {t(
                          "事件 → 业务 → 资产：推理链",
                          "Event → business → asset",
                        )}
                      </h3>
                      {run.analysis.impactChain.map((c, i) => (
                        <article className="impact-row" key={i}>
                          <div className="impact-num">0{i + 1}</div>
                          <div>
                            <h4>{c.text}</h4>
                            <div className="chain-grid">
                              <div>
                                <small>
                                  {t("业务传导", "Business effect")}
                                </small>
                                <p>{c.businessEffect}</p>
                              </div>
                              <div>
                                <small>
                                  {t(
                                    "资产关联 · 推断",
                                    "Asset relevance · inference",
                                  )}
                                </small>
                                <p>{c.assetEffect}</p>
                              </div>
                            </div>
                            <p className="uncertainty">
                              {t("不确定性", "Uncertainty")}: {c.uncertainty}
                            </p>
                            <p>
                              <b>{t("检验条件", "Falsifiable test")}</b> /{" "}
                              {c.test}
                            </p>
                            <blockquote>
                              {c.quote}{" "}
                              <small>{c.evidenceIds.join(" · ")}</small>
                            </blockquote>
                          </div>
                        </article>
                      ))}
                    </section>
                  )}
                  {(run.analysis.bullCase || run.analysis.bearCase) && (
                    <div className="grid">
                      <section className="panel">
                        <h3>{t("上行情景 · 假设", "Bull hypothesis")}</h3>
                        <p>{run.analysis.bullCase}</p>
                      </section>
                      <section className="panel">
                        <h3>{t("下行情景 · 假设", "Bear hypothesis")}</h3>
                        <p>{run.analysis.bearCase}</p>
                      </section>
                    </div>
                  )}
                  {(
                    [
                      ["facts", "已核实事实", "Facts"],
                      ["inferences", "影响推断", "Inferences"],
                      ["counterEvidence", "反证", "Counter-evidence"],
                    ] as const
                  ).map(([key, cn, en]) => (
                    <section className="panel" key={key}>
                      <details open={key !== "facts"}>
                        <summary className="claim-heading">
                          {t(cn, en)} · {run.analysis![key].length}
                        </summary>
                        {run.analysis![key].length ? (
                          run.analysis![key].map((c, i) => (
                            <p key={i}>
                              {c.text}{" "}
                              <small>{c.evidenceIds.join(" · ")}</small>
                              <blockquote>{c.quote}</blockquote>
                            </p>
                          ))
                        ) : (
                          <p className="muted">
                            {t(
                              "没有生成此类结论",
                              "No claims in this category",
                            )}
                          </p>
                        )}
                      </details>
                    </section>
                  ))}
                  <div className="grid">
                    {(
                      [
                        ["waitConditions", "等待条件", "Wait conditions"],
                        ["invalidationConditions", "失效条件", "Invalidation"],
                        ["watchIndicators", "观察指标", "Watch indicators"],
                        ["limitations", "局限", "Limitations"],
                      ] as const
                    ).map(([key, cn, en]) => (
                      <section className="panel" key={key}>
                        <h3>{t(cn, en)}</h3>
                        <ul>
                          {run.analysis![key].map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </>
              )}
              <section className="panel">
                <h3>{t("官方美股 MCP 数据层", "Official equity MCP layer")}</h3>
                <p>
                  {run.market?.provider ||
                    t("行情检查尚未完成", "Market check pending")}{" "}
                  · {run.market?.status || "unavailable"}
                </p>
                <p className="muted">
                  {run.market?.warnings.join(" ") ||
                    t(
                      "未验证可交易价格、点差、深度或代币映射。",
                      "No executable quote, spread, depth or token mapping verified.",
                    )}
                </p>
                {run.market?.raw != null && (
                  <details>
                    <summary>
                      {t("查看供应商原始响应", "Provider response")}
                    </summary>
                    <pre>{JSON.stringify(run.market.raw, null, 2)}</pre>
                  </details>
                )}
              </section>
              <section className="panel">
                <h3>{t("证据与时间线", "Evidence & timeline")}</h3>
                {run.evidence.map((e) => (
                  <div className="evidence" key={e.id}>
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {e.title} ↗
                    </a>
                    <small>
                      {e.id} · {e.kind} · {t("发布", "Published")}:{" "}
                      {e.publishedAt || "unknown"}
                      <br />
                      {t("获取", "Retrieved")}: {e.retrievedAt}
                    </small>
                    <p>{e.warnings.join(" ")}</p>
                    <details>
                      <summary>{t("来源文本", "Source text")}</summary>
                      <p>{e.text}</p>
                      <small>SHA256 {e.hash}</small>
                    </details>
                  </div>
                ))}
              </section>
              {run.analysis?.decisionQuestion && (
                <section className="followup">
                  <b>{t("下一步要核实", "Next research question")}</b>
                  <p>{run.analysis.decisionQuestion}</p>
                  <button
                    onClick={() => {
                      setQuestion(run.analysis!.decisionQuestion);
                      window.scrollTo({ top: 400, behavior: "smooth" });
                    }}
                  >
                    {t("继续研究这个问题 ↗", "Research this question ↗")}
                  </button>
                </section>
              )}
              <div className="exports">
                <a href={`/api/research/${run.id}/export`}>Markdown ↓</a>
                <a href={`/api/research/${run.id}/export?format=json`}>
                  JSON ↓
                </a>
              </div>
            </>
          )}
        </div>
      </section>
      <section className="history">
        <div className="section-label">
          03 / {t("最近的研究", "RECENT RESEARCH")}
        </div>
        {history.map((h) => (
          <button
            key={h.id}
            disabled={busy}
            onClick={async () => {
              try {
                const response = await fetch(`/api/research/${h.id}`);
                if (!response.ok) throw new Error("Saved research unavailable");
                const saved: Run = await response.json();
                setRun(saved);
                setSymbol(saved.input.symbol);
                setQuestion(saved.input.question);
                setHorizon(saved.input.horizon || "next-session");
                setRiskPreference(saved.input.riskPreference || "balanced");
                setOfficialSourceUrl(saved.input.officialSourceUrl || "");
                setLanguage(saved.input.language || "zh");
                setError("");
              } catch {
                setError(t("保存的研究暂无法读取，请重试。", "Unable to load saved research. Please retry."));
              }
            }}
          >
            <b>{h.symbol}</b>
            <span>{h.question}</span>
            <span>↗</span>
          </button>
        ))}
      </section>
      <footer>
        AFTERBELL /{" "}
        {t(
          "科技股事件投研 · 真实取数 · 人类作最终决策",
          "Technology equity research · Actual data · Human decisions",
        )}
        <span>2026 · S2</span>
      </footer>
    </main>
  );
}

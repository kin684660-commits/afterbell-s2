import { nativeContext } from "./native";
import { venueContext } from "./venue";
import { researchContext } from "./context";
import { fundamentalContext } from "./fundamentals";
import { macroContext } from "./macro";
import { randomUUID } from "node:crypto";
import { cases } from "./cases";
import { officialSources, retrieve } from "./sources";
import { scenario } from "./scenarios";
import { bitgetMarket } from "./mcp";
import { analyze } from "./model";
import { save } from "./store";
import type { ResearchInput, Run } from "./types";
export async function research(
  input: ResearchInput,
  onProgress?: (run: Run) => void,
  owner = "__local__",
) {
  const start = Date.now();
  const run: Run = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "running",
    input,
    evidence: [],
    market: null,
    analysis: null,
    errors: [],
    engine: "none",
    durationMs: 0,
    usage: null,
    stages: [],
    tools: [],
  };
  function stage(
    name: string,
    status: "running" | "complete" | "failed",
    detail: string,
  ) {
    run.stages!.push({ name, status, detail, at: new Date().toISOString() });
    save(run, owner);
    onProgress?.(run);
  }
  save(run, owner);
  try {
    stage("evidence", "running", "正在获取真实证据与市场资料");
    if (input.mode === "case") {
      const { c, evidence, market } = scenario(
        input.caseId || "",
        input.symbol,
      );
      run.engine = "case-replay";
      run.evidence = evidence;
      run.market = market;
      run.analysis = {
        summary: c.excerpt,
        impactChain: [],
        bullCase: "",
        bearCase: "",
        decisionQuestion: "",
        facts: [
          {
            text: c.excerpt,
            evidenceIds: ["e-case"],
            quote: run.evidence[0].text.slice(0, 200),
          },
        ],
        inferences: [],
        counterEvidence: [],
        invalidationConditions: [
          "New official clarification changes the interpretation.",
        ],
        watchIndicators: [
          "Obtain contemporaneous expectations and executable market data.",
        ],
        waitConditions: [c.expected],
        conclusion: "insufficient",
        limitations: [
          "Deterministic replay; no model invocation, quote, backtest or user validation.",
          "This source excerpt was curated retrospectively; it is not an as-of evidence capture.",
        ],
      };
      run.status = "complete";
      if (input.useModel) {
        const result = await analyze(input, run.evidence, run.market);
        run.analysis = result.analysis;
        run.usage = result.usage;
        run.engine = "llm";
      }
    } else {
      const [sources, market, context, venue, native, fundamentals, macro] =
        await Promise.all([
          input.officialSourceUrl
            ? retrieve(input.officialSourceUrl).then((e) => ({
                evidence: [e],
                errors: [],
              }))
            : officialSources(input.symbol),
          bitgetMarket(input.symbol),
          researchContext(input.symbol),
          venueContext(input.symbol),
          nativeContext(input.symbol),
          fundamentalContext(input.symbol),
          macroContext(),
        ]);
      run.evidence = [
        ...sources.evidence,
        ...context.evidence,
        ...venue.evidence,
        ...native.evidence,
        ...fundamentals.evidence,
        ...macro.evidence,
      ];
      run.tools = [
        ...context.traces,
        ...venue.traces,
        native.trace,
        ...fundamentals.traces,
        macro.trace,
      ];
      run.fundamentals = fundamentals.bundle;
      run.macro = macro.data;
      run.venue = venue.venue;
      run.native = native.native;
      run.errors = sources.errors;
      run.market = market;
      stage(
        "evidence",
        "complete",
        `${run.evidence.length} 份实际资料；${run.tools.filter((t) => t.status === "success").length}/${run.tools.length} 工具取数成功`,
      );
      stage("analysis", "running", "模型推理、反证与引用核验");
      if (!run.evidence.length)
        throw new Error("No official evidence retrieved");
      const result = await analyze(input, run.evidence, market);
      run.analysis = result.analysis;
      run.usage = result.usage;
      run.engine = "llm";
      if (run.analysis.citationReview?.status === "unavailable") {
        run.errors.push("引用语义复核不可用，草稿陈述已隐藏；可重试研究。");
        stage("analysis", "failed", "引用语义复核未完成，真实资料已保留");
      } else
        stage(
          "analysis",
          "complete",
          `结构与原文引用已校验；语义复核移除 ${run.analysis.citationReview?.removed || 0} 项，仍需人工审阅`,
        );
      if (run.tools.some((t) => t.status === "failed"))
        run.errors.push(
          "部分原始数据服务失败；SEC/Nasdaq 备用来源的取得情况见工具状态，未补齐的字段继续保留限制。",
        );
      run.status =
        run.errors.length ||
        market.status === "unavailable" ||
        context.traces.some((t) => t.status === "failed")
          ? "partial"
          : "complete";
    }
  } catch (e) {
    run.status = run.evidence.length ? "partial" : "failed";
    run.errors.push(e instanceof Error ? e.message : "Research failed");
    stage("analysis", "failed", "研究未完整完成，已获取资料保留");
  }
  run.durationMs = Date.now() - start;
  stage("saved", "complete", "研究记录与导出已保存");
  save(run, owner);
  onProgress?.(run);
  return run;
}

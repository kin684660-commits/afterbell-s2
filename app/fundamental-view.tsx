import type { Run } from "@/lib/types";
export function FundamentalView({ run, zh }: { run: Run; zh: boolean }) {
  const f = run.fundamentals;
  if (!f) return null;
  const t = (cn: string, en: string) => (zh ? cn : en);
  const labels: Record<string, string> = {
    revenue: t("营收", "Revenue"),
    netIncome: t("净利润", "Net income"),
    dilutedEPS: t("稀释每股收益", "Diluted EPS"),
    assets: t("总资产", "Assets"),
    equity: t("股东权益", "Equity"),
  };
  return (
    <section className="financial-view">
      {run.macro && (
        <div className="market-caution">
          <strong>
            {t("美国财政部日收益率", "US Treasury daily par yields")}
          </strong>{" "}
          · {run.macro.observedDate}
          <p>
            {Object.entries(run.macro.rates)
              .map(([term, rate]) => `${term}: ${rate}%`)
              .join(" · ")}
          </p>
          <small>
            {t(
              "日度参考值；不等于联邦基金政策利率或可成交债券价格。",
              "Daily estimates; not the Fed policy rate or executable bond prices.",
            )}
          </small>
        </div>
      )}
      <h3>{t("业绩与预期：分开核验", "REPORTED FINANCIALS & EXPECTATIONS")}</h3>
      <p>
        {f.companyName || f.symbol} · {f.industry || "—"} · {f.sector || "—"}
      </p>
      <div className="financial-table">
        <table>
          <caption>
            {t(
              "SEC 原始申报 · 已披露 GAAP 数据",
              "SEC filings · reported GAAP financials",
            )}
          </caption>
          <thead>
            <tr>
              <th>{t("指标", "Metric")}</th>
              <th>{t("期间", "Period")}</th>
              <th>{t("披露值", "Reported")}</th>
              <th>{t("申报", "Filing")}</th>
            </tr>
          </thead>
          <tbody>
            {f.financials.map((x, i) => (
              <tr key={i}>
                <td>{labels[x.metric]}</td>
                <td>
                  {x.start ? `${x.start} → ` : ""}
                  {x.end}
                  <br />
                  <small>
                    {t(
                      x.period === "quarter"
                        ? "单季度"
                        : x.period === "annual"
                          ? "全年"
                          : "期末时点",
                      x.period,
                    )}
                  </small>
                </td>
                <td>
                  {x.unit === "USD"
                    ? `${(x.value / 1e9).toFixed(3)} ${t("十亿美元", "billion USD")}`
                    : `${x.value} USD/share`}
                </td>
                <td>
                  <a href={x.filingUrl} target="_blank" rel="noreferrer">
                    {x.form} · {x.filed}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!f.financials.length && (
          <p>{t("SEC 数据暂不可用", "SEC data unavailable")}</p>
        )}
      </div>
      <div className="financial-table">
        <table>
          <caption>
            {t(
              "Nasdaq 盈利一致预期 · 未来预测",
              "Nasdaq consensus EPS · forecasts",
            )}
          </caption>
          <thead>
            <tr>
              <th>{t("财务期间", "Fiscal period")}</th>
              <th>{t("EPS 均值", "Consensus EPS")}</th>
              <th>{t("低 / 高", "Low / High")}</th>
              <th>{t("分析师数量", "Estimates")}</th>
            </tr>
          </thead>
          <tbody>
            {f.consensus.map((x, i) => (
              <tr key={i}>
                <td>
                  {x.fiscalEnd}
                  <br />
                  <small>
                    {t(x.period === "quarter" ? "季度" : "年度", x.period)}
                  </small>
                </td>
                <td>{x.eps} USD/share</td>
                <td>
                  {x.low ?? "—"} / {x.high ?? "—"}
                </td>
                <td>{x.analysts}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!f.consensus.length && (
          <p>{t("一致预期暂不可用", "Consensus unavailable")}</p>
        )}
      </div>
      <p className="quote-time">
        {t("应用获取时间", "Retrieved")}: {f.retrievedAt}
        <br />
        {t("预期更新时间", "Estimate update")}:{" "}
        {f.consensusAsOf || t("来源未提供", "not supplied")}
      </p>
      <p className="market-caution">
        {t(
          "实际业绩与预期必须对应相同期间、相同会计口径。Nasdaq 预期口径与更新时间未核实；没有取得营收一致预期，不能据此计算超预期幅度。SEC 申报为历史背景，不替代最新事件证据。",
          "Actuals and estimates require identical periods and accounting basis. Nasdaq estimate basis and update time are unverified; revenue consensus unavailable. No beat/miss calculation. SEC disclosures are historical context, not new event evidence.",
        )}
      </p>
    </section>
  );
}

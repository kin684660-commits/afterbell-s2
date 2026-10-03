import type { Run } from "@/lib/types";
function Chart({
  points,
  label,
}: {
  points: { at: string; close: number }[];
  label: string;
}) {
  if (points.length < 2)
    return <p>价格序列不可用 / Price series unavailable</p>;
  const values = points.map((p) => p.close),
    low = Math.min(...values),
    high = Math.max(...values),
    span = high - low || 1;
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * 600).toFixed(1)},${(100 - ((p.close - low) / span) * 85).toFixed(1)}`,
    )
    .join(" ");
  return (
    <figure className="price-chart">
      <svg viewBox="0 0 600 110" role="img" aria-label={label}>
        <path d={path + " L600,110 L0,110 Z"} fill="#d8f06a" opacity=".3" />
        <path d={path} fill="none" stroke="#32614b" strokeWidth="2" />
      </svg>
      <figcaption>
        <span>{points[0].at.slice(0, 16)} UTC</span>
        <span>{points.at(-1)!.at.slice(0, 16)} UTC</span>
      </figcaption>
      <small>
        {label} · {low.toFixed(2)}–{high.toFixed(2)}
      </small>
    </figure>
  );
}
export function MarketView({ run, zh }: { run: Run; zh: boolean }) {
  const t = (cn: string, en: string) => (zh ? cn : en);
  const n = run.native,
    v = run.venue;
  if (!n && !v) return null;
  return (
    <section className="market-view">
      <div className="section-label">
        {t("原生股与衍生品：分开核验", "NATIVE EQUITY & DERIVATIVES")}
      </div>
      <div className="market-columns">
        <article className="quote-card">
          <div className="quote-label">
            {t("原生美股", "Native US equity")} · {n?.exchange || "—"}
          </div>
          {n ? (
            <>
              <div className="quote-price">
                {n.price.toFixed(2)} <small>USD</small>
              </div>
              <p>
                {n.name} · {n.symbol}
              </p>
              <span className="quote-note">
                {t(
                  "最近常规时段价格 · 延迟未确认",
                  "Last regular-session price · delay unverified",
                )}
              </span>
              <p className="quote-time">
                {t("观测", "Observed")}: {n.observedAt}
                <br />
                {t("获取", "Fetched")}: {n.retrievedAt}
                <br />
                {t("交易时段", "Session")}: {n.session}
              </p>
              <Chart
                points={n.candles}
                label={t(
                  "实际原生股 5 日小时价格",
                  "Actual native equity · 5-day hourly prices",
                )}
              />
            </>
          ) : (
            <p>{t("原生股行情暂不可用", "Native quote unavailable")}</p>
          )}
        </article>
        <article className="quote-card derivative">
          <div className="quote-label">
            {t("Bitget 股票类永续合约", "Bitget stock perpetual")} ·{" "}
            {v?.symbol || "—"}
          </div>
          {v ? (
            <>
              <div className="quote-price">
                {v.last.toFixed(2)} <small>{v.quoteCurrency}</small>
              </div>
              <p>
                {t(
                  "已核验合约身份 · 不代表股票所有权",
                  "Verified contract identity · no share ownership",
                )}
              </p>
              <div className="quote-stats">
                <div>
                  <small>{t("买价 / 卖价", "Bid / Ask")}</small>
                  <b>
                    {v.bid.toFixed(2)} / {v.ask.toFixed(2)}
                  </b>
                </div>
                <div>
                  <small>{t("快照点差", "Snapshot spread")}</small>
                  <b>{v.spreadBps.toFixed(2)} bps</b>
                </div>
                <div>
                  <small>{t("24h成交额", "24h turnover")}</small>
                  <b>
                    {v.turnover24h?.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    }) ?? "—"}{" "}
                    {v.quoteCurrency}
                  </b>
                </div>
                <div>
                  <small>{t("获取时的报价状态", "Quote status at retrieval")}</small>
                  <b>{v.freshness}</b>
                </div>
              </div>
              <p className="quote-time">
                {t("报价观测", "Quote observed")}: {v.observedAt}
                <br />
                {t("盘口观测", "Book observed")}:{" "}
                {v.bookObservedAt || t("未返回", "Unavailable")}
              </p>
              <Chart
                points={v.candles}
                label={t(
                  "实际合约近 48h 小时价格",
                  "Actual perpetual · last 48h hourly prices",
                )}
              />
              <details>
                <summary>
                  {t("查看实际前五档盘口", "Actual top-five book")}
                </summary>
                <table>
                  <thead>
                    <tr>
                      <th>{t("买价 / 数量", "Bid / size")}</th>
                      <th>{t("卖价 / 数量", "Ask / size")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(
                      { length: Math.max(v.bids.length, v.asks.length) },
                      (_, i) => (
                        <tr key={i}>
                          <td>
                            {v.bids[i]?.price ?? "—"} /{" "}
                            {v.bids[i]?.quantity ?? "—"}
                          </td>
                          <td>
                            {v.asks[i]?.price ?? "—"} /{" "}
                            {v.asks[i]?.quantity ?? "—"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </details>
            </>
          ) : (
            <p>{t("永续合约报价暂不可用", "Perpetual quote unavailable")}</p>
          )}
        </article>
      </div>
      <div className="basis-warning">
        {t(
          "两个价格的时间、币种和资产权利不同，不计算跨市场溢价或套利。原生股采用 Yahoo / Nasdaq 实际备用来源，具体来源与日期精度见证据；报价延迟与执行条件未核实。",
          "Prices differ in observation time, currency and asset rights. No cross-market premium or arbitrage is calculated. Actual Yahoo / Nasdaq fallback source and date precision are recorded in evidence; delay and execution conditions unverified.",
        )}
      </div>
    </section>
  );
}

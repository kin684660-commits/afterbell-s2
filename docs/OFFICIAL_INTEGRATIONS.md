# Official integrations and actual-data boundary

## 2026-10-03 fallback repair

All AAPL/MSFT/NVDA SEC Companyfacts, Nasdaq company-profile and earnings-forecast requests returned usable actual data. These are separate fallback sources, not successful Bitget MCP calls. SEC period-specific GAAP revenue/net income/diluted EPS and balance-sheet facts retain accession numbers, filing dates and original units. Nasdaq EPS forecasts retain fiscal-end dates, ranges and estimate counts; update time and accounting basis were not supplied. Revenue consensus remains unavailable. No GAAP/non-GAAP surprise is calculated. See [SEC API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) and [Nasdaq earnings](https://www.nasdaq.com/market-activity/stocks/nvda/earnings).

The official [Treasury XML feed](https://home.treasury.gov/treasury-daily-interest-rate-xml-feed) returned actual dated par yields as a fallback for failed signal rates. It is daily yield context, not the Federal Reserve policy rate or a live executable bond quote. Official company/Fed feeds already provide primary news; the failed signal news aggregator is not represented as working.

The original service observations below remain valid. Provider failures are retained alongside the successful fallbacks.

Source: [S2 Chinese handbook](https://bitget-ai.gitbook.io/bitgetai_hackathons2/base-camp-hackathon-s2-cn), inspected 2026-10-03. Track: AI Trading Desk / 信息提炼与信号生成. The product is technology-equity event research for a human investor across time zones, with explicit decision horizon and risk preference.

| Layer                                | Official source / implementation                                                                              | Actual observation                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Equity fundamentals and expectations | `https://agent.bitget.com/mcp`, discover equity catalog                                                       | Quote/profile/income/ratios/consensus/history backend returned upstream 503. No invented substitute fundamentals                                                      |
| Exchange market                      | [Bitget Skill](https://github.com/Bitget-AI/agent-skill), [Agent SDK](https://github.com/Bitget-AI/agent-sdk) | `market.instruments`, `tickers`, `orderbook`, `candles` return actual stock-perpetual data for all three assets. `modules:market`, `readOnly:true`, credentials empty |
| Macro/news Skills                    | [bitget-signal](https://github.com/Bitget-AI/bitget-signal), macro-analyst / news-briefing                    | Discover and actual `rates_yields` / `news_feed` calls implemented. Current responses contain no usable observations; classified unavailable                          |
| Native equity fallback               | Yahoo Finance native chart response                                                                           | EQUITY identity, Nasdaq exchange, USD, observation time and five-day hourly closes validated. Unknown delay, no guaranteed execution, no production SLA               |
| Event evidence                       | Company/Federal Reserve allowlisted official pages and feeds                                                  | Actual acquired body text, publication metadata, retrieval time and hash. Website/marketing assertions remain attributed, not independently established               |
| Model                                | DeepSeek server-side API                                                                                      | Real authenticated calls, quote-ID selection, structural and exact-text binding validation                                                                            |

No account authorization, trading, wallet action or publishing is part of the application. No macro figure, consensus, valuation, token redemption right or executable liquidity is synthesized to fill a failed response. A stock perpetual is not a native share or a redeemable stock token. USD and USDT are kept separate. Asynchronous observation times block cross-market premium/arbitrage claims.

The five installed signal Skills are not five working integrations: only macro-analyst/news-briefing workflows are implemented, and their actual data availability is shown. All provider failures remain in the research record. No functionality credit is inferred from installing a package alone.

Official handbook currently displays Sept 27 submission dates and Oct 8 awards; the user's Oct 8 extension remains a separate planning assumption pending a newer official announcement. The document is source material, not authorization to post, publish, trade or grant account access.

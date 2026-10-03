import { mkdirSync, writeFileSync } from "node:fs";
import { cases } from "../lib/cases";
import { retrieve } from "../lib/sources";
async function main() {
  mkdirSync("data/sources", { recursive: true });
  let count = 0;
  for (const c of cases.filter((c) => !c.synthetic)) {
    try {
      const e = await retrieve(c.url);
      writeFileSync(`data/sources/${c.id}.json`, JSON.stringify(e, null, 2));
      count++;
    } catch {
      console.log(`${c.id}: unavailable; not captured`);
    }
  }
  console.log(
    `${count}/10 official pages captured retrospectively; not historical as-of snapshots.`,
  );
}
main();

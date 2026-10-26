#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
try {
  if (process.argv.length !== 3 || process.argv[2] !== "shop-setup")
    throw new Error("Usage: node .agents/scripts/cleanup-skill.mjs shop-setup");
  const helper = new URL(
    "../skills/shop-setup/scripts/complete.mjs",
    import.meta.url,
  );
  if (!existsSync(helper)) {
    const state = JSON.parse(
      readFileSync(join(root, ".agents/state/shop-setup.json"), "utf8"),
    );
    if (
      state.status !== "complete" ||
      existsSync(join(root, ".agents/skills/shop-setup")) ||
      existsSync(join(root, ".claude/skills/shop-setup"))
    )
      throw new Error("Incomplete setup; restore the skill before continuing");
    console.log("Shop setup already completed");
  } else {
    const { completeShop } = await import(helper.href);
    console.log(JSON.stringify(completeShop({ root })));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

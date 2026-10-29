#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
try {
  if (process.argv.length !== 3 || process.argv[2] !== "course-setup")
    throw new Error("Usage: node .agents/scripts/cleanup-skill.mjs course-setup");
  const helper = new URL(
    "../skills/course-setup/scripts/complete.mjs",
    import.meta.url,
  );
  if (!existsSync(helper)) {
    const state = JSON.parse(
      readFileSync(join(root, ".agents/state/course-setup.json"), "utf8"),
    );
    if (
      state.status !== "complete" ||
      existsSync(join(root, ".agents/skills/course-setup")) ||
      existsSync(join(root, ".claude/skills/course-setup"))
    )
      throw new Error("Incomplete setup; restore the skill before continuing");
    console.log("Course setup already completed");
  } else {
    const { completeCourse } = await import(helper.href);
    console.log(JSON.stringify(completeCourse({ root })));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

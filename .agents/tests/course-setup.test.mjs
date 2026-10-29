import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const helper = new URL(
  "../skills/course-setup/scripts/complete.mjs",
  import.meta.url,
);
// Generated projects retain general tests after this one-time skill removes itself.
const installed = existsSync(helper);
const completeCourse = installed
  ? (await import(helper.href)).completeCourse
  : null;
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "course-setup-"));
  const write = (name, contents) => {
    mkdirSync(join(root, name, ".."), { recursive: true });
    writeFileSync(join(root, name), contents);
  };
  write(".agents/skills/course-setup/assets/reference.webp", "reference");
  write(".claude/skills/course-setup/SKILL.md", "stub");
  write(".agents/skills/seo-optimize/SKILL.md", "keep");
  write("src/services/app/page/home/index.tsx", "export default () => null");
  write("src/stories/course/home.stories.tsx", "export const Default = {}");
  write("public/brand.webp", "used asset");
  const state = {
    status: "ready",
    brand: "Own brand",
    visualReview: true,
    pages: ["src/services/app/page/home/index.tsx"],
    stories: ["src/stories/course/home.stories.tsx"],
    resources: { database: "deferred-by-user", storage: "deferred-by-user" },
  };
  write(".agents/state/course-setup.json", JSON.stringify(state));
  return {
    root,
    write,
    state,
    close: () => rmSync(root, { recursive: true, force: true }),
  };
}
test(
  "success removes only one-time skill and stub after all checks; retry is harmless",
  { skip: !installed },
  () => {
    const f = fixture();
    try {
      const called = [];
      completeCourse({
        root: f.root,
        run: (name) => {
          called.push(name);
          return { status: 0 };
        },
      });
      assert.deepEqual(called, ["validate", "agents:test", "storybook:build"]);
      assert.ok(!existsSync(join(f.root, ".agents/skills/course-setup")));
      for (const name of [
        "src/services/app/page/home/index.tsx",
        "src/stories/course/home.stories.tsx",
        "public/brand.webp",
        ".agents/skills/seo-optimize/SKILL.md",
      ])
        assert.ok(existsSync(join(f.root, name)));
      assert.equal(
        JSON.parse(readFileSync(join(f.root, ".agents/state/course-setup.json")))
          .status,
        "complete",
      );
      assert.equal(
        completeCourse({
          root: f.root,
          run: () => {
            throw new Error("must not rerun");
          },
        }).status,
        "already-complete",
      );
    } finally {
      f.close();
    }
  },
);
test(
  "every failed check leaves the skill, reference assets and progress untouched",
  { skip: !installed },
  () => {
    for (const failure of ["validate", "agents:test", "storybook:build"]) {
      const f = fixture();
      try {
        assert.throws(
          () =>
            completeCourse({
              root: f.root,
              run: (name) => ({ status: name === failure ? 1 : 0 }),
            }),
          /Validation failed/,
        );
        assert.ok(
          existsSync(
            join(f.root, ".agents/skills/course-setup/assets/reference.webp"),
          ),
        );
        assert.equal(
          JSON.parse(
            readFileSync(join(f.root, ".agents/state/course-setup.json")),
          ).status,
          "ready",
        );
      } finally {
        f.close();
      }
    }
  },
);
test(
  "pending resources, unfinished work, escaped artifacts and used reference imports block deletion",
  { skip: !installed },
  () => {
    for (const mode of [
      "resource",
      "unfinished",
      "escape",
      "used",
      "persistent",
      "symlink",
    ]) {
      const f = fixture();
      try {
        if (mode === "resource") f.state.resources.storage = "pending";
        if (mode === "unfinished") f.state.status = "in-progress";
        if (mode === "escape")
          f.state.pages = ["src/services/app/page/../../../../outside.tsx"];
        if (mode === "used")
          f.write(
            "src/app/use.tsx",
            "const image='.agents/skills/course-setup/assets/reference.webp'",
          );
        if (mode === "persistent")
          f.write(
            ".agents/skills/seo-optimize/SKILL.md",
            "Use ../course-setup/assets/reference.webp",
          );
        if (mode === "symlink") {
          rmSync(join(f.root, ".agents/skills/course-setup"), {
            recursive: true,
          });
          symlinkSync(
            join(f.root, "public"),
            join(f.root, ".agents/skills/course-setup"),
          );
        }
        f.write(".agents/state/course-setup.json", JSON.stringify(f.state));
        assert.throws(() =>
          completeCourse({ root: f.root, run: () => ({ status: 0 }) }),
        );
        assert.ok(existsSync(join(f.root, "public/brand.webp")));
        assert.ok(
          existsSync(join(f.root, ".claude/skills/course-setup/SKILL.md")),
        );
      } finally {
        f.close();
      }
    }
  },
);
for (const remote of [
  "https://github.com/comwit/template.git",
  "git@github.com:comwit/template.git",
  "https://github.com/comwit/template-course.git",
]) test(`maintained source remote ${remote} cannot self-delete`, { skip: !installed }, () => {
  const f = fixture();
  try {
    execFileSync("git", ["init", "-q", f.root]);
    execFileSync("git", ["-C", f.root, "checkout", "-b", "codex/maintenance"], { stdio: "ignore" });
    execFileSync("git", ["-C", f.root, "remote", "add", "origin", remote]);
    assert.throws(() => completeCourse({ root: f.root, run: () => { throw new Error("must not run"); } }), /maintained template/);
    assert.ok(existsSync(join(f.root, ".agents/skills/course-setup/assets/reference.webp")));
  } finally {
    f.close();
  }
});

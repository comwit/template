import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configureAdminPath } from "../scripts/setup-admin-path.mjs";
function fixture(
  env = 'OTHER="leave this unchanged"\nNEXT_PUBLIC_ADMIN_BASE_PATH=\n',
) {
  const root = mkdtempSync(join(tmpdir(), "course-admin-path-"));
  writeFileSync(join(root, ".env"), env);
  const route = join(root, "src/app/(app)/products");
  mkdirSync(route, { recursive: true });
  writeFileSync(join(route, "page.tsx"), "export default null");
  return {
    root,
    read: () => readFileSync(join(root, ".env"), "utf8"),
    close: () => rmSync(root, { recursive: true, force: true }),
  };
}
test("initializes one stable ten-character hex suffix without changing other env values", () => {
  const f = fixture();
  try {
    const result = configureAdminPath(f.root);
    assert.match(result.path, /^\/관리자-[0-9a-f]{10}$/);
    assert.match(f.read(), /^OTHER="leave this unchanged"\n/);
    const after = f.read();
    assert.equal(configureAdminPath(f.root).path, result.path);
    assert.equal(f.read(), after);
  } finally {
    f.close();
  }
});
test("preserves custom local and injected final paths; explicit choice is normalized", () => {
  const f = fixture('OTHER=value\nNEXT_PUBLIC_ADMIN_BASE_PATH="/기존-경로"\n');
  try {
    const before = f.read();
    assert.equal(configureAdminPath(f.root).path, "/기존-경로");
    assert.equal(f.read(), before);
    assert.equal(
      configureAdminPath(f.root, { environmentValue: "/빌드-설정" }).path,
      "/빌드-설정",
    );
    assert.equal(f.read(), before);
    assert.throws(
      () =>
        configureAdminPath(f.root, {
          requestedPath: "/변경",
          environmentValue: "/빌드-설정",
        }),
      /injected/,
    );
    assert.equal(
      configureAdminPath(f.root, { requestedPath: "운영실/" }).path,
      "/운영실",
    );
    assert.equal(
      f.read(),
      'OTHER=value\nNEXT_PUBLIC_ADMIN_BASE_PATH="/운영실"\n',
    );
  } finally {
    f.close();
  }
});
test("reserved, conflicting and ambiguous paths fail before writing", () => {
  for (const value of [
    "/admin",
    "/api/private",
    "/_next",
    "/products",
    "/products/admin",
    "//external.test",
    "/../escape",
    "/control?x=1",
  ]) {
    const f = fixture();
    try {
      const before = f.read();
      assert.throws(() => configureAdminPath(f.root, { requestedPath: value }));
      assert.equal(f.read(), before);
    } finally {
      f.close();
    }
  }
  const f = fixture(
    "NEXT_PUBLIC_ADMIN_BASE_PATH=/a\nNEXT_PUBLIC_ADMIN_BASE_PATH=/b\n",
  );
  try {
    assert.throws(() => configureAdminPath(f.root), /duplicate/);
  } finally {
    f.close();
  }
});

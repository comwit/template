import { build } from "esbuild";
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );
// Bundle only static Drizzle table definitions: no db client, environment or network.
const result = await build({
  stdin: {
    contents: `
    import * as schema from './src/server/db/schema.ts';
    import { is, Table, getTableName } from 'drizzle-orm';
    import { getTableConfig } from 'drizzle-orm/sqlite-core';
    export default Object.values(schema).filter(t => is(t, Table)).map(t => {
      const c = getTableConfig(t);
      return {name:c.name, columns:c.columns.map(x => ({name:x.name,type:x.getSQLType(),nullable:!x.notNull,primaryKey:x.primary})),
        foreignKeys:c.foreignKeys.map(f => {const r=f.reference();return {name:f.getName(),columns:r.columns.map(x=>x.name),targetTable:getTableName(r.foreignTable),targetColumns:r.foreignColumns.map(x=>x.name),onDelete:f.onDelete,onUpdate:f.onUpdate}}),
        indexes:c.indexes.map(i=>({name:i.config.name,unique:i.config.unique,columns:i.config.columns.map(x=>x.name??'(expression)')}))};
    }).sort((a,b)=>a.name.localeCompare(b.name));`,
    resolveDir: root,
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const { default: tables } = await import(
  "data:text/javascript;base64," +
    Buffer.from(result.outputFiles[0].text).toString("base64")
);
const schemaFiles = [
  "src/server/db/schema.ts",
  "src/server/db/plugin/auth/app-schema.ts",
  "src/server/db/plugin/auth/admin-schema.ts",
];
const routes = files(join(root, "src/app"))
  .filter((p) => p.endsWith("/page.tsx"))
  .map((p) => {
    const file = relative(root, p).replaceAll("\\", "/");
    const parts = relative(join(root, "src/app"), p).split("/").slice(0, -1);
    const intercepted = parts.some((s) => /^\(\.\)/.test(s));
    const path =
      "/" +
      parts
        .filter((s) => !/^\([^)]*\)$/.test(s))
        .map((s) => s.replace(/^\(\.\)/, ""))
        .join("/");
    return { file, path, intercepted };
  })
  .sort((a, b) => a.path.localeCompare(b.path));
const output = {
  schemaFiles: Object.fromEntries(
    schemaFiles.map((p) => [
      p,
      createHash("sha256")
        .update(readFileSync(join(root, p)))
        .digest("hex"),
    ]),
  ),
  tables,
  routes,
};
const destination = resolve(root, "docs/shop-reference.json");
if (process.argv.includes("--check")) {
  if (
    readFileSync(destination, "utf8") !==
    JSON.stringify(output, null, 2) + "\n"
  )
    throw new Error("Shop reference is stale; run pnpm reference:generate");
} else {
  mkdirSync(resolve(root, "docs"), { recursive: true });
  writeFileSync(destination, JSON.stringify(output, null, 2) + "\n");
}
console.log(
  `Shop reference: ${tables.length} tables, ${tables.reduce((n, t) => n + t.foreignKeys.length, 0)} foreign keys, ${routes.length} route entries.`,
);

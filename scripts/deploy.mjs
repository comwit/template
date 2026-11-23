// `pnpm run deploy` — validate, build and deploy this app to Comwit Cloud in one safe command.
// (`pnpm deploy` without `run` is a different pnpm built-in.)
//
// 1. Reads only COMWIT_PROJECT, COMWIT_APP and COMWIT_EXECUTION_ENV (process env, then .env).
//    Nothing else from .env is loaded, and no value besides the project/app ids is printed.
// 2. A hosted (sandbox) session deploys with the on-screen Deploy button instead.
// 3. Deploys only committed and pushed work.
// 4. Runs `pnpm run validate`, removes dist/brrrd, runs `pnpm run build` without NODE_ENV,
//    and stops at the first failure so a stale package is never uploaded.
// 5. `comwit deploy --project <P> --app <A> --package ./dist/brrrd`, then prints the app link.
//
// `--dry-run` runs steps 1–3 and prints what would run.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { appLink, childEnv, gitProblem, isSafeId, resolveDeployEnv } from "./deploy-lib.mjs";

const root = resolve(import.meta.dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const windows = process.platform === "win32";
const packageDir = join(root, "dist/brrrd");

function stop(message, code = 1) {
  console.error(`\n배포를 멈췄어요. ${message}`);
  process.exit(code);
}

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return { ok: result.status === 0, raw: result.stdout ?? "", out: (result.stdout ?? "").trim() };
}

function onPath(command) {
  const names = windows ? [`${command}.exe`, `${command}.cmd`, command] : [command];
  return (process.env.PATH ?? "").split(delimiter).some((dir) => dir && names.some((name) => existsSync(join(dir, name))));
}

function run(command, args, env) {
  console.log(`\n$ ${[command, ...args].join(" ")}`);
  // Argument arrays only; a shell is used on Windows solely so .cmd shims resolve.
  return spawnSync(command, args, { cwd: root, env, stdio: "inherit", shell: windows });
}

// 1. Project and app ids
const envFile = join(root, ".env");
const { project, app, executionEnv } = resolveDeployEnv(
  process.env,
  existsSync(envFile) ? readFileSync(envFile, "utf8") : "",
);

// 2. Hosted sessions use the Deploy button
if (executionEnv === "sandbox") {
  stop("호스팅된 세션(sandbox)에서는 화면의 Deploy 버튼으로 배포해요. 버튼을 눌러 주세요.");
}

const missing = [!project && "COMWIT_PROJECT", !app && "COMWIT_APP"].filter(Boolean);
if (missing.length > 0) {
  stop(
    [
      `${missing.join(", ")} 값이 없어요(환경 변수나 .env).`,
      "README.md의 'Local environment contract' 안내대로 `comwit login`으로 로그인하고 프로젝트 설정을 마치면 .env에 채워져요.",
      "COMWIT_APP은 Comwit에서 앱을 만든 뒤에 생겨요.",
    ].join("\n"),
  );
}
for (const [key, value] of [["COMWIT_PROJECT", project], ["COMWIT_APP", app]]) {
  if (!isSafeId(value)) stop(`${key} 값이 ID 형식이 아니에요. .env를 확인하세요.`);
}
console.log(`프로젝트 ${project} / 앱 ${app}`);

// 3. Only committed and pushed work
if (!git(["rev-parse", "--is-inside-work-tree"]).ok) {
  stop("Git 저장소가 아니거나 git을 찾을 수 없어요. 커밋하고 push한 코드만 배포해요.");
}
const branch = git(["symbolic-ref", "--short", "-q", "HEAD"]).out;
const upstreamRef = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
const upstream = upstreamRef.ok ? upstreamRef.out : null;
const ahead = upstream ? Number(git(["rev-list", "--count", "@{u}..HEAD"]).out) || 0 : 0;
const problem = gitProblem({ porcelain: git(["status", "--porcelain"]).raw, branch, upstream, ahead });
if (problem) stop(problem);
console.log(`Git: ${branch} 브랜치가 깨끗하고 ${upstream}에 push돼 있어요.`);

const deployArgs = ["deploy", "--project", project, "--app", app, "--package", "./dist/brrrd"];

if (dryRun) {
  console.log("\n--dry-run: 아래 순서로 실행할 거예요(NODE_ENV는 빼고, .env는 불러오지 않아요).");
  console.log("  pnpm run validate");
  console.log("  rm -rf dist/brrrd");
  console.log("  pnpm run build");
  console.log(`  comwit ${deployArgs.join(" ")}${onPath("comwit") ? "" : "   (comwit CLI를 PATH에서 찾지 못했어요)"}`);
  console.log(`  → ${appLink(app)}`);
  process.exit(0);
}

// 5 (checked early so a missing CLI does not cost a full build)
const installHint =
  "Comwit CLI를 설치해 PATH에 추가하고(https://docs.cloud.comwit.io) `comwit login`으로 로그인한 뒤 다시 실행하세요.";
if (!onPath("comwit")) stop(`comwit CLI를 찾을 수 없어요. ${installHint}`);

// 4. Validate and build without NODE_ENV
const env = childEnv(process.env);
const validate = run("pnpm", ["run", "validate"], env);
if (validate.status !== 0) stop("검사(pnpm run validate)가 실패했어요. 원인을 고친 뒤 다시 실행하세요.", validate.status || 1);

rmSync(packageDir, { recursive: true, force: true });
const build = run("pnpm", ["run", "build"], env);
if (build.status !== 0) stop("빌드(pnpm run build)가 실패했어요. 원인을 고친 뒤 다시 실행하세요.", build.status || 1);
if (!existsSync(join(packageDir, "manifest.json"))) {
  stop("빌드는 끝났지만 dist/brrrd/manifest.json이 없어요. next.config.ts의 brrrd 어댑터 설정을 확인하세요.");
}

// 5. Deploy
const deploy = run("comwit", deployArgs, env);
if (deploy.error?.code === "ENOENT") stop(`comwit CLI를 실행할 수 없어요. ${installHint}`);
if (deploy.status !== 0) {
  stop("comwit deploy가 실패했어요. 로그인이 만료됐다면 `comwit login` 후 다시 실행하세요.", deploy.status || 1);
}

// 6. Link
console.log(`\n배포했어요: ${appLink(app)}`);

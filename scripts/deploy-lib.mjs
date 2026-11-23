// Pure helpers for scripts/deploy.mjs, kept apart so unit tests can import them without
// starting a deploy.

/** The only keys deploy ever reads; nothing else from `.env` is loaded anywhere. */
export const DEPLOY_ENV_KEYS = ["COMWIT_PROJECT", "COMWIT_APP", "COMWIT_EXECUTION_ENV"];

function unquote(raw) {
  const value = raw.trim();
  const quote = value[0];
  if (quote === '"' || quote === "'" || quote === "`") {
    const end = value.indexOf(quote, 1);
    if (end > 0) {
      const inner = value.slice(1, end);
      return quote === '"' ? inner.replace(/\\n/g, "\n").replace(/\\(["\\])/g, "$1") : inner;
    }
  }
  // Unquoted: a ` #` starts an inline comment.
  return value.replace(/\s+#.*$/, "").trim();
}

/**
 * Reads `keys` from dotenv source text. Handles blank lines, `#` comments, an `export ` prefix,
 * quoted values and inline comments; the last assignment of a key wins. Other keys are skipped.
 */
export function readEnvKeys(source, keys = DEPLOY_ENV_KEYS) {
  const wanted = new Set(keys);
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match || !wanted.has(match[1])) continue;
    values[match[1]] = unquote(match[2]);
  }
  return values;
}

/** Process env wins over `.env`; an empty value counts as missing. */
export function resolveDeployEnv(processEnv, envFileSource = "") {
  const fromFile = readEnvKeys(envFileSource);
  const pick = (key) => {
    const own = processEnv[key]?.trim();
    if (own) return own;
    return fromFile[key]?.trim() || "";
  };
  return {
    project: pick("COMWIT_PROJECT"),
    app: pick("COMWIT_APP"),
    executionEnv: pick("COMWIT_EXECUTION_ENV"),
  };
}

/** Project/app ids go into CLI arguments, so they must look like ids and never like flags. */
export function isSafeId(value) {
  return /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value);
}

/** `https://<app without svc_>.app.comwit.link` */
export function appLink(app) {
  return `https://${app.replace(/^svc_/, "")}.app.comwit.link`;
}

/** The environment children run with: the caller's own, minus NODE_ENV so `next build` picks its own. */
export function childEnv(processEnv) {
  const env = { ...processEnv };
  delete env.NODE_ENV;
  return env;
}

/**
 * Deploy only work that is committed and pushed. Returns a Korean message describing why not,
 * or null when the tree is clean and the branch is not ahead of its upstream.
 * `upstream` is null when the branch tracks no remote branch; `ahead` is the commit count past it.
 */
export function gitProblem({ porcelain, branch, upstream, ahead }) {
  const changes = porcelain.split("\n").filter((line) => line.trim());
  if (changes.length > 0) {
    const shown = changes.slice(0, 20).map((line) => `  ${line}`);
    if (changes.length > 20) shown.push(`  … 외 ${changes.length - 20}개`);
    return [
      "커밋하지 않은 변경이 있어요. 커밋하고 push한 뒤 다시 배포하세요:",
      ...shown,
    ].join("\n");
  }
  if (!branch) {
    return "지금 어떤 브랜치에도 있지 않아요(detached HEAD). 브랜치로 돌아가 커밋을 push한 뒤 다시 배포하세요.";
  }
  if (!upstream) {
    return [
      `'${branch}' 브랜치가 원격 브랜치와 연결돼 있지 않아 push됐는지 확인할 수 없어요.`,
      `push한 뒤 다시 배포하세요: git push -u origin ${branch}`,
    ].join("\n");
  }
  if (ahead > 0) {
    return `push하지 않은 커밋이 ${ahead}개 있어요(${upstream}보다 앞섬). git push 후 다시 배포하세요.`;
  }
  return null;
}

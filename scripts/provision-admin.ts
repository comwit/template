import "server-only";
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { config } from "../src/server/config";
import { createAdminAuthForProvisioning } from "../src/server/auth/admin";

// This command is never invoked during setup, build, deployment, or server startup.
// The operator explicitly supplies both desired credentials through the ignored .env.
async function provision() {
  const credentials = z
    .object({ email: z.string().email(), password: z.string().min(8).max(128) })
    .safeParse({
      email: config.ADMIN_INITIAL_EMAIL,
      password: config.ADMIN_INITIAL_PASSWORD,
    });
  if (!credentials.success)
    throw new Error(
      "ADMIN_INITIAL_EMAIL과 ADMIN_INITIAL_PASSWORD를 .env에 설정해주세요. 비밀번호는 8~128자입니다.",
    );
  const auth = await createAdminAuthForProvisioning();
  await auth.api.createUser({
    body: {
      email: credentials.data.email,
      password: credentials.data.password,
      name: "관리자",
      role: "admin",
    },
  });
  const env = readFileSync(".env", "utf8").replace(
    /^ADMIN_INITIAL_(?:EMAIL|PASSWORD)=.*\r?\n?/gm,
    "",
  );
  writeFileSync(".env", env, { mode: 0o600 });
  console.log(
    "관리자 계정 생성 완료. 일회용 초기 계정 환경변수를 .env에서 제거했습니다.",
  );
}
try {
  await provision();
} catch {
  console.error(
    "관리자 계정을 만들지 못했습니다. 초기 계정 환경변수와 중복 이메일을 확인해주세요. 비밀 값은 출력하지 않습니다.",
  );
  process.exitCode = 1;
}

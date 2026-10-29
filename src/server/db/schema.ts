/**
 * Drizzle 스키마 배럴. 테이블은 도메인별로 `./tables/*.ts` 에 두고 여기서 전부 내보낸다.
 * 새 도메인(예: 커뮤니티 게시판, 라이브 세션)을 붙일 때는 `tables/<domain>.ts` 를 만들고 아래에 한 줄을 더한다.
 * `drizzle.config.ts` 는 이 파일 하나만 가리키므로 `pnpm drizzle-kit generate` 가 전체를 본다.
 */
export * from "./plugin/auth/app-schema";
export * from "./plugin/auth/admin-schema";
export * from "./tables/catalog-schema";
export * from "./tables/products-schema";
export * from "./tables/enrollments-schema";
export * from "./tables/coupons-schema";
export * from "./tables/commerce-schema";
export * from "./tables/community-schema";
export * from "./tables/content-schema";
export * from "./tables/operations-schema";

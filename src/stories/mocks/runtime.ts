import { fn } from "storybook/test";
import {
  parseServerFnWire,
  stringifyServerFnWire,
} from "@/lib/server-action/protocol";
import type { ListFilter } from "@/lib/commerce";
import type { Pageable, PageRequest } from "@/server/repository/types";
import { createMockData, type MockData } from "./data";

export type ApiMockOptions = {
  mode?: "ready" | "empty" | "error" | "loading";
  delay?: number;
  data?: Partial<MockData>;
};

let data = createMockData();
let options: ApiMockOptions = {};
const resets: (() => void)[] = [];

/** Reset both response data and function overrides before each story. */
export function resetApiMocks(next: ApiMockOptions = {}) {
  resets.forEach((reset) => reset());
  data = createMockData();
  options = next;
  if (next.mode === "empty") {
    Object.assign(data, {
      products: [],
      categories: [],
      orders: [],
      payments: [],
      customers: [],
      notifications: [],
      movements: {},
      cart: {},
    });
    data.dashboard = {
      products: 0,
      orders: 0,
      grossLabel: "0원",
      netLabel: "0원",
      refundedLabel: "0원",
      lowStock: 0,
      needsReview: 0,
      recent: [],
    };
  }
  Object.assign(data, structuredClone(next.data ?? {}));
}

export function getMockSessions() {
  return { appUser: data.appUser, adminUser: data.adminUser };
}

export function mockApi<F extends (...args: never[]) => Promise<unknown>>(
  implementation: (
    db: MockData,
    ...args: Parameters<F>
  ) => Awaited<ReturnType<F>> | Promise<Awaited<ReturnType<F>>>,
) {
  const mock = fn(
    async (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> => {
      // Capture this story's data before awaiting, so an old request cannot mutate the next story.
      const current = data;
      const behavior = options;
      // Mirror the real transport: state may supply reactive proxies. Snapshot the
      // request before awaiting and return plain wire values, never retained proxies.
      const request = parseServerFnWire<Parameters<F>>(
        stringifyServerFnWire(args),
      );
      if (behavior.mode === "loading")
        return new Promise<Awaited<ReturnType<F>>>(() => {});
      if (behavior.delay)
        await new Promise((resolve) => setTimeout(resolve, behavior.delay));
      if (behavior.mode === "error")
        throw new Error("스토리북 API 오류 예시입니다.");
      return parseServerFnWire<Awaited<ReturnType<F>>>(
        stringifyServerFnWire(await implementation(current, ...request)),
      );
    },
  );
  resets.push(() => mock.mockReset());
  return mock;
}

export function findItem<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((entry) => entry.id === id);
  if (!item) throw new Error("항목을 찾을 수 없습니다.");
  return item;
}

export function list<T extends object>(
  items: T[],
  filter: ListFilter,
  request: PageRequest,
): Pageable<T> {
  const search = filter.search.trim().toLowerCase();
  const matches = items.filter(
    (item) =>
      (!filter.status || ("status" in item && item.status === filter.status)) &&
      (!search || JSON.stringify(item).toLowerCase().includes(search)),
  );
  const page = Math.max(1, request.page);
  const limit = Math.max(1, request.limit);
  return {
    items: matches.slice((page - 1) * limit, page * limit),
    total: matches.length,
    page,
    limit,
    totalPages: Math.ceil(matches.length / limit),
  };
}

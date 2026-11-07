/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Suspense } from "react";
import CourseDetail, {
  CourseDetailSkeleton,
} from "@/services/app/page/course-detail";
import { CourseList } from "@/services/app/page/courses";
import { useCatalog } from "@/services/app/state/catalog";
import { catalog } from "../mocks/app-api/catalog";
import { course } from "../fixtures";

/** `/courses/[id]` 라우트와 같은 경계: 스켈레톤 fallback. 없는 강의는 오류가 아니라 null 데이터라 화면이 안내한다. */
function Route({ courseId }: { courseId: string }) {
  return (
    <Suspense fallback={<CourseDetailSkeleton />}>
      <CourseDetail courseId={courseId} />
    </Suspense>
  );
}

/**
 * 목록 → 상세. 숨긴 목록이 먼저 받아지면 그 첫 항목의 상세를 연다 — 실제 앱에서 카드 <Link> 를 누른 상태와 같다.
 * 상세 API 는 beforeEach 에서 영원히 대기시키므로, 보이는 제목·가격·요약은 전부 모델 `seed`(목록 항목)에서 온 것이다.
 */
function FromListRoute() {
  const firstId = useCatalog((state) => state.list.data.items[0]?.id ?? null);
  return (
    <>
      <div hidden>
        <Suspense fallback={null}>
          <CourseList />
        </Suspense>
      </div>
      {firstId ? <Route courseId={firstId} /> : <CourseDetailSkeleton />}
    </>
  );
}

const MISSING_ID = "00000000-0000-4000-8000-000000000000";

const meta = {
  id: "course-detail",
  title: "강의/강의 상세",
  component: Route,
  args: { courseId: course.id },
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: `/courses/${course.id}` },
    },
  },
  tags: ["!autodocs"],
} satisfies Meta<typeof Route>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: "직접 진입" };

export const FromList: Story = {
  name: "목록에서 진입",
  render: () => <FromListRoute />,
  beforeEach: () => {
    catalog.find.mockImplementation(() => new Promise(() => {}));
  },
};

export const Loading: Story = {
  name: "로딩",
  parameters: { apiMock: { mode: "loading" } },
};

export const NotFound: Story = {
  name: "없는 강의",
  args: { courseId: MISSING_ID },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: `/courses/${MISSING_ID}` } },
  },
};

/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Component, Suspense, type ReactNode } from "react";
import CourseDetail, {
  CourseDetailSkeleton,
  CourseNotFound,
} from "@/services/app/page/course-detail";
import { course } from "../fixtures";

/** 라우트의 `error.tsx`·notFound 와 같은 역할 — `.suspend()` 가 던진 오류를 안내 화면으로 받는다. */
class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <CourseNotFound /> : this.props.children;
  }
}

/** `/courses/[id]` 라우트와 같은 경계: 스켈레톤 fallback + 오류 경계. */
function Route({ courseId }: { courseId: string }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CourseDetailSkeleton />}>
        <CourseDetail courseId={courseId} />
      </Suspense>
    </RouteErrorBoundary>
  );
}

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

export const Loading: Story = {
  name: "로딩",
  parameters: { apiMock: { mode: "loading" } },
};

export const NotFound: Story = {
  name: "없는 강의",
  parameters: { apiMock: { mode: "error" } },
};

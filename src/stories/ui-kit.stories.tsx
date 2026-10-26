/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import { Alert } from "@/lib/components/ui/alert";
import {
  StatusBadge,
  QueryMessage,
} from "@/services/admin/_components/commerce";
const meta = { title: "공통/UI", component: Button } satisfies Meta<
  typeof Button
>;
export default meta;
type Story = StoryObj;
export const Actions: Story = {
  name: "버튼",
  render: () => (
    <div className="flex flex-wrap gap-4 p-8">
      <Button>저장</Button>
      <Button variant="outline">취소</Button>
      <Button variant="destructive">환불</Button>
      <Button disabled>처리 중</Button>
    </div>
  ),
};
export const Statuses: Story = {
  name: "운영 상태",
  render: () => (
    <div className="flex flex-wrap gap-4 p-8">
      <StatusBadge status="paid" label="결제 완료" />
      <StatusBadge status="unknown" label="확인 필요" />
      <StatusBadge status="refunded" label="전액 환불" />
      <StatusBadge status="pending" label="결제 대기" />
    </div>
  ),
};
export const Fields: Story = {
  name: "입력과 오류",
  render: () => (
    <div className="max-w-md space-y-5 p-8">
      <TextField label="SKU 코드" required>
        <Input placeholder="TEE-BLACK-M" />
      </TextField>
      <Alert tone="destructive">SKU 코드와 옵션 조합이 중복됩니다.</Alert>
      <TextField label="판매가" helperText="원 단위 정수로 입력하세요.">
        <Input type="number" placeholder="29000" />
      </TextField>
    </div>
  ),
};
export const Loading: Story = {
  name: "조회 로딩",
  render: () => (
    <div className="p-8">
      <QueryMessage isLoading isError={false}>
        {null}
      </QueryMessage>
    </div>
  ),
};
export const Error: Story = {
  name: "조회 오류와 재시도",
  render: () => (
    <div className="p-8">
      <QueryMessage
        isLoading={false}
        isError
        error="데이터를 불러오지 못했습니다."
        onRetry={fn()}
      >
        {null}
      </QueryMessage>
    </div>
  ),
};

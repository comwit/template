import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, within } from 'storybook/test'
import Dashboard from '../../../src/services/admin/page/dashboard'
import { adminRoutes } from '../../../src/lib/admin-routes'

const meta = {
  id: 'admin-dashboard',
  title: '어드민/사용자 관리',
  component: Dashboard,
  parameters: { nextjs: { navigation: { pathname: adminRoutes.dashboard } } },
} satisfies Meta<typeof Dashboard>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = { name: '기본' }
export const LastPage: Story = {
  name: '마지막 페이지',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: '다음 페이지' }))
    await expect(canvas.getByText('user6@example.com')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: '다음 페이지' }))
    await expect(canvas.getByText('user11@example.com')).toBeVisible()
    await expect(canvas.getByText('user12@example.com')).toBeVisible()
    await expect(canvas.queryByText('user1@example.com')).not.toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: '다음 페이지' })).toBeDisabled()
  },
}

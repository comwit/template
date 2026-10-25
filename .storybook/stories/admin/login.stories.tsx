import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, within } from 'storybook/test'
import Login from '../../../src/services/admin/page/login'
import { adminRoutes } from '../../../src/lib/admin-routes'

const meta = {
  id: 'admin-login',
  title: '어드민/로그인',
  component: Login,
  parameters: { nextjs: { navigation: { pathname: adminRoutes.login } } },
} satisfies Meta<typeof Login>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = { name: '기본' }
export const Filled: Story = {
  name: '입력 완료',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('이메일', { exact: false }), 'admin@example.com')
    await userEvent.type(canvas.getByLabelText('비밀번호', { exact: false }), 'example-password')
    await expect(canvas.getByLabelText('이메일', { exact: false })).toHaveValue('admin@example.com')
    await expect(canvas.getByRole('button', { name: '로그인' })).toBeEnabled()
  },
}

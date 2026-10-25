import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { DesignSystemPage } from './catalogue'

const meta = { title: '디자인 시스템', id: 'design-system', component: DesignSystemPage } satisfies Meta<typeof DesignSystemPage>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  name: '전체',
  render: (args, context) => <DesignSystemPage {...args} showTitle={context.viewMode !== 'docs'} />,
}
export const DateInputInteraction: Story = {
  name: '날짜 선택',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const form = canvas.getByRole('form', { name: '날짜 입력' }) as HTMLFormElement
    const fields = within(form)
    const start = form.elements.namedItem('start') as HTMLInputElement
    const end = form.elements.namedItem('end') as HTMLInputElement
    const startTrigger = fields.getByLabelText(/^시작일/)

    await expect(startTrigger.tagName).toBe('BUTTON')
    await expect(fields.getByLabelText('선택 불가')).toBeDisabled()
    await userEvent.click(fields.getByLabelText('확정일'))
    await expect(page.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(startTrigger)
    let dialog = within(await page.findByRole('dialog'))
    await expect(dialog.getAllByRole('button', { name: '30' }).some(button => button.hasAttribute('disabled'))).toBe(true)
    await userEvent.click(dialog.getByRole('button', { name: '21' }))
    await waitFor(() => expect(start.value).toBe('2026-10-21'))
    await waitFor(() => expect(page.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(startTrigger).toHaveTextContent('21')

    await userEvent.click(fields.getByLabelText('종료일'))
    dialog = within(await page.findByRole('dialog'))
    await userEvent.click(dialog.getByRole('button', { name: '22' }))
    await waitFor(() => expect(end.value).toBe('2026-10-22'))
    await waitFor(() => expect(page.queryByRole('dialog')).not.toBeInTheDocument())
    await userEvent.click(fields.getByRole('button', { name: '날짜 저장' }))
    await expect(fields.getByLabelText('저장한 날짜')).toHaveTextContent('2026-10-21 / 2026-10-22')
    await expect(new FormData(form).has('disabled')).toBe(false)

    await userEvent.click(fields.getByRole('button', { name: '날짜 초기화' }))
    await waitFor(() => expect(end.value).toBe('2026-10-25'))
    await expect(fields.getByLabelText('종료일')).toHaveTextContent('25')
    await expect(start.value).toBe('2026-10-20')

    await userEvent.click(startTrigger)
    dialog = within(await page.findByRole('dialog'))
    await userEvent.click(dialog.getByRole('button', { name: '지우기' }))
    await waitFor(() => expect(start.value).toBe(''))
    await waitFor(() => expect(page.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(start.validity.valueMissing).toBe(true)
    start.focus()
    await expect(startTrigger).toHaveFocus()
    await userEvent.click(fields.getByRole('button', { name: '날짜 초기화' }))
  },
}

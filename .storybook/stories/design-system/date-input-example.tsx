import { useState } from 'react'
import { Input } from '../../../src/lib/components/ui/input'
import { Button } from '../../../src/lib/components/ui/button'
import { TextField } from '../../../src/lib/components/ui/text-field'

export function DateInputExample() {
  const [date, setDate] = useState('2026-10-20')
  const [saved, setSaved] = useState('')

  return <form aria-label="날짜 입력" className="grid gap-4" onReset={() => {
    setDate('2026-10-20')
    setSaved('')
  }} onSubmit={event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaved(`${data.get('start')} / ${data.get('end')}`)
  }}>
    <TextField label="시작일" required helperText="2026년 10월 안에서 선택">
      <Input type="date" name="start" required value={date} min="2026-10-01" max="2026-10-31"
        onChange={event => setDate(event.currentTarget.value)} />
    </TextField>
    <TextField label="종료일">
      <Input type="date" name="end" defaultValue="2026-10-25" />
    </TextField>
    <div className="grid grid-cols-2 gap-4">
      <TextField label="확정일"><Input type="date" name="fixed" defaultValue="2026-10-20" readOnly /></TextField>
      <TextField label="선택 불가" disabled><Input type="date" name="disabled" defaultValue="2026-10-20" /></TextField>
    </div>
    <div className="flex gap-2">
      <Button type="reset" variant="outline">날짜 초기화</Button>
      <Button type="submit">날짜 저장</Button>
    </div>
    {saved && <output aria-label="저장한 날짜">{saved}</output>}
  </form>
}

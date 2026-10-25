import { useEffect, useState, type ReactNode } from 'react'
import { DateInputExample } from './date-input-example'
import { Button } from '../../../src/lib/components/ui/button'
import { Input } from '../../../src/lib/components/ui/input'
import { Alert } from '../../../src/lib/components/ui/alert'
import { Chip } from '../../../src/lib/components/ui/chip'
import { TextField } from '../../../src/lib/components/ui/text-field'
import { Checkbox } from '../../../src/lib/components/ui/checkbox'
import { Switch } from '../../../src/lib/components/ui/switch'
import { EmptyState } from '../../../src/lib/components/ui/empty-state'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../src/lib/components/ui/table'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../../../src/lib/components/ui/dialog'
import { Textarea } from '../../../src/lib/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/lib/components/ui/select'
import { RadioGroup, RadioGroupItem } from '../../../src/lib/components/ui/radio-group'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../src/lib/components/ui/tabs'
import { Skeleton } from '../../../src/lib/components/ui/skeleton'
import styles from './overview.module.css'

const sections = [
  ['colors', '색상'], ['typography', '타이포그래피'], ['controls', '컴포넌트'],
  ['patterns', '화면 패턴'], ['feedback', '상태'], ['material', '형태와 모션'],
] as const
const surfaces = [
  ['기본 배경', '--background', '--foreground'],
  ['보조 배경', '--muted', '--foreground'],
  ['브랜드', '--primary', '--primary-foreground'],
  ['브랜드의 옅은 면', '--primary-surface', '--primary-ink'],
] as const
const tones = [
  ['success', '완료'], ['warning', '주의'], ['destructive', '오류'], ['info', '안내'],
] as const
const typeScale = [
  ['text-display-xl', '페이지의 첫인상'], ['text-display-md', '중요한 내용을 먼저'],
  ['text-title-lg', '정보를 묶는 섹션 제목'], ['text-title-md', '항목을 구분하는 제목'],
  ['text-body', '문장을 편안하게 읽을 수 있는 본문입니다.'],
  ['text-body-sm', '목록과 표에서 읽는 간결한 정보'],
  ['text-label', '동작을 분명하게'], ['text-caption', '필드 도움말과 날짜'],
] as const
const specimens = [
  { name: '프로젝트 소개', date: '2026. 10. 20.', status: '완료', tone: 'success' },
  { name: '서비스 이용 안내', date: '2026. 10. 19.', status: '검토 중', tone: 'warning' },
  { name: '자주 묻는 질문', date: '2026. 10. 18.', status: '초안', tone: 'info' },
] as const

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className={styles.section}>
    <h2 className={styles.sectionTitle}>{title}</h2>
    <div className={styles.sectionContent}>{children}</div>
  </section>
}

function Sample({ label, children }: { label: string; children: ReactNode }) {
  return <figure className={styles.sample}>
    <figcaption>{label}</figcaption>
    <div className={styles.sampleBody}>{children}</div>
  </figure>
}

function EditExample() {
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState(false)
  const error = submitted && !name.trim() ? '이름을 입력해주세요.' : undefined
  return <form className={styles.form} onSubmit={(event) => {
    event.preventDefault()
    setSubmitted(true)
    setSaved(Boolean(name.trim()))
  }}>
    <TextField label="프로젝트 이름" required error={error}>
      <Input value={name} placeholder="새 프로젝트" onChange={(event) => { setName(event.target.value); setSaved(false) }} />
    </TextField>
    <TextField label="이메일 오류 예시" error="이메일 형식을 확인해주세요.">
      <Input defaultValue="hello@" />
    </TextField>
    <TextField label="프로젝트 ID" disabled>
      <Input defaultValue="project-001" />
    </TextField>
    <label className={styles.choice}><Switch defaultChecked />이메일 알림</label>
    <div className={styles.actions}>
      <Button type="reset" variant="outline" onClick={() => { setName(''); setSubmitted(false); setSaved(false) }}>초기화</Button>
      <Button type="submit">저장</Button>
    </div>
    {saved && <Alert tone="success">저장했어요.</Alert>}
  </form>
}

function ConfirmExample() {
  return <Dialog>
    <DialogTrigger asChild><Button variant="outline">확인창 열기</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>변경 내용을 적용할까요?</DialogTitle>
        <DialogDescription>이 예시는 실제 데이터를 변경하지 않습니다.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
        <DialogClose asChild><Button>적용</Button></DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}

export function DesignSystemPage({ showTitle = true }: { showTitle?: boolean }) {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const element = document.documentElement
    const previous = element.classList.contains('dark')
    element.classList.toggle('dark', dark)
    return () => { element.classList.toggle('dark', previous) }
  }, [dark])
  return (
    <main className={`${styles.page}${dark ? ' dark' : ''}`}>
      <header className={styles.cover}>
        <div className={styles.coverHeading}>
          {showTitle && <h1>디자인 시스템</h1>}
          <Button variant="outline" aria-pressed={dark} onClick={() => setDark(!dark)}>{dark ? '라이트 모드' : '다크 모드'}</Button>
        </div>
        <nav aria-label="디자인 시스템 섹션" className={styles.contents}>
          {sections.map(([id, title]) => <a key={id} href={`#${id}`}>{title}</a>)}
        </nav>
      </header>

      <Section id="colors" title="색상">
        <div className={styles.swatches}>{surfaces.map(([label, token, ink]) =>
          <figure key={token} className={styles.swatch}>
            <div style={{ background: `var(${token})`, color: `var(${ink})` }}><span>가 Aa</span></div>
            <figcaption>{label}<code>{token}</code></figcaption>
          </figure>,
        )}</div>
        <div className={styles.inkScale}>
          {['foreground', 'soft-foreground', 'muted-foreground', 'subtle-foreground', 'disabled-foreground'].map((token) =>
            <div key={token}><span style={{ color: `var(--${token})` }}>가</span><code>--{token}</code></div>,
          )}
        </div>
        <div className={styles.swatches}>{tones.map(([tone, label]) =>
          <figure key={tone} className={styles.swatch}>
            <div style={{ background: `var(--${tone})`, color: `var(--${tone}-foreground)` }}><span>{label}</span></div>
            <div className={styles.tint} style={{ background: `var(--${tone}-surface)`, color: `var(--${tone}-surface-foreground)` }}>{label}</div>
            <figcaption><Chip tone={tone}>{label}</Chip><code>--{tone}</code></figcaption>
          </figure>,
        )}</div>
      </Section>

      <Section id="typography" title="타이포그래피">
        <div className={styles.typeHero}><span>읽기 좋은 글자</span><div>보통 <strong>굵게</strong></div></div>
        {typeScale.map(([token, text]) => <div key={token} className={styles.typeRow}><code>{token}</code><p className={token}>{text}</p></div>)}
      </Section>

      <Section id="controls" title="컴포넌트">
        <Sample label="버튼">
          <div className={styles.wrap}><Button>저장</Button><Button variant="secondary">미리보기</Button><Button variant="outline">취소</Button><Button variant="ghost">더 보기</Button><Button variant="destructive">삭제</Button><Button disabled>사용 불가</Button></div>
        </Sample>
        <div className={styles.pair}>
          <Sample label="체크박스"><div className={styles.choices}><label className={styles.choice}><Checkbox />선택 전</label><label className={styles.choice}><Checkbox defaultChecked />선택됨</label><label className={styles.choice}><Checkbox disabled />선택 불가</label></div></Sample>
          <Sample label="스위치"><div className={styles.choices}><label className={styles.choice}><Switch defaultChecked />알림 켜짐</label><label className={styles.choice}><Switch />알림 꺼짐</label><label className={styles.choice}><Switch disabled />설정 불가</label></div></Sample>
        </div>
        <div className={styles.pair}>
          <Sample label="입력">
            <div className={styles.choices}>
              <TextField label="이름"><Input placeholder="이름을 입력하세요" /></TextField>
              <TextField label="이메일" error="이메일 형식을 확인해주세요."><Input defaultValue="hello@" /></TextField>
              <TextField label="프로젝트 ID" disabled><Input defaultValue="project-001" /></TextField>
            </div>
          </Sample>
          <Sample label="여러 줄 입력"><TextField label="메모"><Textarea placeholder="내용을 입력하세요" /></TextField></Sample>
          <Sample label="선택 목록">
            <Select defaultValue="draft">
              <SelectTrigger aria-label="문서 상태"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="draft">초안</SelectItem><SelectItem value="review">검토 중</SelectItem><SelectItem value="done">완료</SelectItem></SelectContent>
            </Select>
          </Sample>
          <Sample label="라디오">
            <RadioGroup defaultValue="all" aria-label="알림 범위">
              <label className={styles.choice}><RadioGroupItem value="all" />모든 알림</label>
              <label className={styles.choice}><RadioGroupItem value="important" />중요한 알림만</label>
              <label className={styles.choice}><RadioGroupItem value="off" disabled />알림 끄기</label>
            </RadioGroup>
          </Sample>
        </div>
        <Sample label="탭">
          <Tabs defaultValue="overview">
            <TabsList aria-label="프로젝트 정보"><TabsTrigger value="overview">개요</TabsTrigger><TabsTrigger value="history">변경 내역</TabsTrigger><TabsTrigger value="members" disabled>멤버</TabsTrigger></TabsList>
            <TabsContent value="overview"><p className="text-body text-soft-foreground">프로젝트 소개</p></TabsContent>
            <TabsContent value="history"><p className="text-body text-soft-foreground">프로젝트 이름을 변경했어요.</p></TabsContent>
          </Tabs>
        </Sample>
        <Sample label="날짜 선택"><DateInputExample /></Sample>
      </Section>

      <Section id="patterns" title="화면 패턴">
        <div className={styles.pair}>
          <Sample label="입력 · 검증 · 저장 피드백"><EditExample /></Sample>
          <Sample label="콘텐츠 목록">
            <Table><TableHeader><TableRow><TableHead>이름</TableHead><TableHead>수정일</TableHead><TableHead>상태</TableHead></TableRow></TableHeader><TableBody>
              {specimens.map((item) => <TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell>{item.date}</TableCell><TableCell><Chip tone={item.tone}>{item.status}</Chip></TableCell></TableRow>)}
            </TableBody></Table>
            <div className={styles.actions}><ConfirmExample /></div>
          </Sample>
        </div>
      </Section>

      <Section id="feedback" title="상태">
        <div className={styles.pair}>
          <Sample label="빈 화면"><EmptyState title="아직 등록된 내용이 없어요" description="새 항목을 등록하면 여기에 표시됩니다." /></Sample>
          <Sample label="불러오는 중"><div className={styles.choices} role="status" aria-label="불러오는 중"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div></Sample>
          <Sample label="결과와 오류"><div className={styles.choices}><Alert tone="success">변경 내용을 저장했어요.</Alert><Alert tone="warning">입력 내용을 한 번 더 확인해주세요.</Alert><Alert tone="destructive">저장하지 못했어요. 다시 시도해주세요.</Alert><Alert tone="info">최근 변경 내용을 확인할 수 있어요.</Alert></div></Sample>
        </div>
      </Section>

      <Section id="material" title="형태와 모션">
        <div className={styles.materials}>
          <Sample label="컨트롤 · rounded-control"><div className={`${styles.shape} rounded-control border border-border`} /></Sample>
          <Sample label="카드 · rounded-card"><div className={`${styles.shape} rounded-card border border-border`} /></Sample>
          <Sample label="그림자 · shadow-card"><div className={`${styles.shape} rounded-card shadow-card`} /></Sample>
        </div>
        <Sample label="포커스 또는 올려보기 · --duration-slow"><Button variant="outline" className={styles.motion}>부드러운 전환<span aria-hidden="true" /></Button></Sample>
      </Section>
      
    </main>
  )
}


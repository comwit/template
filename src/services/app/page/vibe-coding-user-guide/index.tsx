"use client"

/**
 * Placeholder home before the first request.
 * Its only purpose is to show what users can ask to build.
 * A real request replaces src/app/(app)/page.tsx with the actual home.
 */

/** List only skills actually installed in .claude/skills/; never promise unavailable features. */
const CAPABILITIES: { title: string; say: string; desc: string }[] = [
  {
    title: "데이터 저장",
    say: "회원 정보를 저장하고 싶어요",
    desc: "데이터베이스를 붙이고 목록·상세 화면까지 이어 만듭니다.",
  },
  {
    title: "로그인 · 회원가입",
    say: "로그인 기능 넣어주세요",
    desc: "이메일·소셜 로그인부터, 로그인한 사람만 볼 수 있는 페이지까지.",
  },
  {
    title: "사진 · 파일 업로드",
    say: "프로필 사진을 올릴 수 있게 해주세요",
    desc: "이미지와 파일을 올리고 화면에 보여줍니다.",
  },
  {
    title: "검색엔진 노출",
    say: "구글에 잘 뜨게 해주세요",
    desc: "제목·설명·공유 미리보기 이미지·사이트맵을 한 번에 챙깁니다.",
  },
  {
    title: "코드 정리",
    say: "리팩토링 해주세요",
    desc: "쌓인 코드를 규칙에 맞게 정리합니다. 화면은 그대로예요.",
  },
]

export default function VibeCodingUserGuide() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 px-6 py-20">
      <header className="flex flex-col gap-3">
        <h1 className="text-display-md text-foreground">무엇을 만들까요?</h1>
        <p className="text-body text-soft-foreground">
          만들고 싶은 걸 채팅창에 말씀해 주세요. 화면부터 만들고, 필요해지면
          아래 것들을 하나씩 붙여 나갑니다.
        </p>
      </header>

      <dl className="flex flex-col">
        {CAPABILITIES.map((c) => (
          <div
            key={c.title}
            className="flex flex-col gap-1 border-t border-border py-5 sm:flex-row sm:gap-6"
          >
            <dt className="text-title-sm text-foreground sm:w-40 sm:shrink-0">
              {c.title}
            </dt>
            <dd className="flex flex-col gap-1">
              <p className="text-body-sm text-foreground">&ldquo;{c.say}&rdquo;</p>
              <p className="text-body-sm text-soft-foreground">{c.desc}</p>
            </dd>
          </div>
        ))}
      </dl>

      {/* Keep element-selection guidance because react-grab is mounted in the root layout. */}
      <footer className="flex flex-col gap-2 border-t border-border pt-5">
        <p className="text-body-sm text-soft-foreground">
          고칠 부분을 정확히 짚으려면, 미리보기에서 그 영역을 클릭한 뒤 아래를
          누르고 채팅창에 붙여넣으세요.
        </p>
        <p className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
          <Kbd>Cmd</Kbd>
          <span>+</span>
          <Kbd>C</Kbd>
          <span className="mx-1">·</span>
          <Kbd>Ctrl</Kbd>
          <span>+</span>
          <Kbd>C</Kbd>
          <span>(윈도우)</span>
        </p>
      </footer>
    </main>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-caption text-foreground">
      {children}
    </kbd>
  )
}

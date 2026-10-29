"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEnrollments } from "@/services/app/state/enrollments";
import { siteText, courseText } from "@/lib/ui-text";
import { Button } from "@/lib/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/components/ui/select";
import { LessonPlayer } from "./lesson-player";
import { LessonList } from "./lesson-list";
import { QnaPanel } from "./qna-panel";
import { ReviewForm } from "./review-form";

// 강의실. 파생 프로젝트는 구성을 바꿔도 저장 흐름은 유지한다(page.ai.md).
// 읽는 상태: useEnrollments player(.load(courseId)), error. 액션: saveProgress.
// 현재 레슨 = URL lessonId ?? 이어보기(lastLessonId) ?? 첫 레슨. URL 에 레슨이 없으면 router.replace 로 맞춘다.
// 진도 저장: 재생 중 10초마다 + 일시정지·종료(completed)·레슨 전환·탭 숨김(visibilitychange). 결과로 목록 체크·진도율·수료증 링크가 바로 바뀐다.
const SAVE_INTERVAL_MS = 10_000;
const RATES = ["0.75", "1", "1.25", "1.5", "2"] as const;

export default function Learn({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId?: string;
}) {
  const router = useRouter();
  const [rate, setRate] = useState("1");
  const enrollments = useEnrollments((state) => ({
    player: state.player.load(courseId),
    error: state.error,
    actions: state.actions,
  }));
  const player = enrollments.player.data;
  const lessons = player ? player.sections.flatMap((section) => section.lessons) : [];
  const requestedId =
    lessonId && lessons.some((lesson) => lesson.id === lessonId) ? lessonId : null;
  const resumeId =
    player?.lastLessonId && lessons.some((lesson) => lesson.id === player.lastLessonId)
      ? player.lastLessonId
      : (lessons[0]?.id ?? null);
  const currentId = requestedId ?? resumeId;
  const index = lessons.findIndex((lesson) => lesson.id === currentId);
  const lesson = index >= 0 ? lessons[index] : null;
  const previous = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const entry = player?.progress.find((p) => p.lessonId === currentId) ?? null;
  // 완료한 레슨은 처음부터, 아니면 이어서.
  const startAt = entry && !entry.completed ? entry.positionSeconds : 0;

  // URL 에 레슨이 없거나(이어보기) 사라진 레슨이면 실제 레슨 주소로 바꾼다.
  useEffect(() => {
    if (!player || !currentId || currentId === lessonId) return;
    router.replace(`/learn/${courseId}/${currentId}`);
  }, [player, currentId, lessonId, courseId, router]);

  // 저장 스로틀 상태는 ref 로 둔다 — visibilitychange·레슨 전환 cleanup 이 오래된 클로저를 보지 않도록.
  const positionRef = useRef(0);
  const dirtyRef = useRef(false);
  const lastSavedRef = useRef(0);
  const lessonRef = useRef<string | null>(null);
  const actionsRef = useRef(enrollments.actions);
  useEffect(() => {
    actionsRef.current = enrollments.actions;
  }, [enrollments.actions]);
  const save = useCallback((completed = false) => {
    const id = lessonRef.current;
    if (!id) return;
    if (!dirtyRef.current && !completed) return;
    dirtyRef.current = false;
    lastSavedRef.current = Date.now();
    void actionsRef.current.saveProgress({
      lessonId: id,
      positionSeconds: positionRef.current,
      completed,
    });
  }, []);

  // 레슨이 바뀌면 이전 레슨 위치를 저장하고 ref 를 초기화한다.
  const lessonKey = lesson?.id ?? null;
  useEffect(() => {
    lessonRef.current = lessonKey;
    positionRef.current = 0;
    dirtyRef.current = false;
    lastSavedRef.current = Date.now();
    return () => save();
  }, [lessonKey, save]);

  // 탭을 숨기거나 떠날 때(beforeunload 대신 visibilitychange) 저장.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [save]);

  const onProgress = (position: number) => {
    positionRef.current = Math.max(positionRef.current, position);
    dirtyRef.current = true;
    if (Date.now() - lastSavedRef.current >= SAVE_INTERVAL_MS) save();
  };
  const onPause = (position: number) => {
    positionRef.current = Math.max(positionRef.current, position);
    dirtyRef.current = true;
    save();
  };
  const onEnded = (position: number) => {
    positionRef.current = Math.max(positionRef.current, position);
    dirtyRef.current = true;
    save(true);
  };

  if (enrollments.player.isError)
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-16">
        <h1 className="text-display-sm text-balance">{siteText.pages["learn"]}</h1>
        <p className="mt-8 text-body text-destructive">
          {enrollments.player.error}{" "}
          <Link href="/login" className="underline">
            {siteText.pages["login"]}
          </Link>{" "}
          <Link href={`/courses/${courseId}`} className="underline">
            {siteText.pages["course-detail"]}
          </Link>
        </p>
      </main>
    );
  if (enrollments.player.isLoading || !player)
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-16">
        <h1 className="text-display-sm text-balance">{siteText.pages["learn"]}</h1>
        <p className="mt-8 text-body text-muted-foreground">{courseText.loading}</p>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <p className="text-body-sm text-muted-foreground">
        {siteText.pages["learn"]} ·{" "}
        <Link href={`/courses/${player.course.id}`} className="underline">
          {player.course.title}
        </Link>
      </p>
      <p className="mt-1 text-body">
        진도 {player.progressPercent}% ({player.completedLessons}/{player.lessonCount})
        {player.certificateId ? (
          <Link
            href={`/account/certificates/${player.certificateId}`}
            className="ml-3 underline"
          >
            {siteText.pages["certificate"]}
          </Link>
        ) : null}
      </p>
      {enrollments.error ? (
        <p className="mt-1 text-body-sm text-destructive">{enrollments.error}</p>
      ) : null}

      <div className="mt-6 grid gap-8 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside>
          <LessonList
            courseId={courseId}
            sections={player.sections}
            progress={player.progress}
            currentId={currentId}
          />
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          {lesson ? (
            <>
              <h1 className="text-display-sm text-balance">{lesson.title}</h1>
              {lesson.video ? (
                <LessonPlayer
                  key={lesson.id}
                  video={lesson.video}
                  startAt={startAt}
                  playbackRate={Number(rate)}
                  onProgress={onProgress}
                  onPause={onPause}
                  onEnded={onEnded}
                />
              ) : (
                <p className="text-body-sm text-muted-foreground">
                  이 레슨에는 영상이 없습니다.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={rate} onValueChange={setRate}>
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!lesson.video ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={entry?.completed}
                    onClick={() => onEnded(0)}
                  >
                    {entry?.completed ? "완료함" : "완료로 표시"}
                  </Button>
                ) : null}
                <span className="grow" />
                {previous ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/learn/${courseId}/${previous.id}`}>이전 레슨</Link>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" disabled>
                    이전 레슨
                  </Button>
                )}
                {next ? (
                  <Button asChild size="sm">
                    <Link href={`/learn/${courseId}/${next.id}`}>다음 레슨</Link>
                  </Button>
                ) : (
                  <Button type="button" size="sm" disabled>
                    다음 레슨
                  </Button>
                )}
              </div>
              {lesson.content ? (
                <div
                  className="text-body"
                  dangerouslySetInnerHTML={{ __html: lesson.content }}
                />
              ) : null}
            </>
          ) : (
            <p className="text-body text-muted-foreground">
              아직 레슨이 없는 강의입니다.
            </p>
          )}

          <QnaPanel courseId={courseId} lessonId={lesson?.id ?? null} />
          <ReviewForm courseId={courseId} />
        </section>
      </div>
    </main>
  );
}

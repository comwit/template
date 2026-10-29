"use client";

import { useEffect, useRef } from "react";
import type { VideoView } from "@/services/app/state/enrollments";

/**
 * 레슨 영상 플레이어. 상태를 읽지 않는 순수 컴포넌트라 강의실·상세(미리보기) 어디서든 쓴다.
 *   - youtube: IFrame API 스크립트를 한 번만 주입하고 `YT.Player` 로 그린다. 재생 중 1초마다 getCurrentTime() 을 올린다.
 *   - url: `<video>` 를 그리고 timeupdate 를 1초 단위로 올린다.
 * 저장 주기(10초·일시정지·종료·레슨 전환)는 부모가 정한다. 레슨이 바뀌면 `key={lesson.id}` 로 다시 마운트한다.
 */
export type LessonPlayerProps = {
  video: VideoView;
  /** 이어보기 시작 위치(초) */
  startAt?: number;
  playbackRate?: number;
  onProgress?: (positionSeconds: number) => void;
  onPause?: (positionSeconds: number) => void;
  onEnded?: (positionSeconds: number) => void;
  className?: string;
};

// ── YouTube IFrame API 최소 타입 ─────────────────────────────────
type YTPlayer = {
  getCurrentTime(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate(rate: number): void;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YTPlayer }) => void;
        onStateChange?: (event: { data: number; target: YTPlayer }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}
const YT_SCRIPT = "https://www.youtube.com/iframe_api";
let youtubeReady: Promise<YTNamespace> | null = null;
function loadYouTube(): Promise<YTNamespace> {
  if (youtubeReady) return youtubeReady;
  youtubeReady = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.querySelector(`script[src="${YT_SCRIPT}"]`)) {
      const script = document.createElement("script");
      script.src = YT_SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return youtubeReady;
}

export function LessonPlayer({
  video,
  startAt = 0,
  playbackRate = 1,
  onProgress,
  onPause,
  onEnded,
  className,
}: LessonPlayerProps) {
  // 최신 콜백을 ref 로 들고 있어 플레이어 생성 effect 가 콜백 identity 에 묶이지 않는다.
  const callbacks = useRef({ onProgress, onPause, onEnded });
  useEffect(() => {
    callbacks.current = { onProgress, onPause, onEnded };
  });
  const startAtRef = useRef(startAt);
  const rateRef = useRef(playbackRate);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytRef = useRef<YTPlayer | null>(null);
  const lastSecondRef = useRef(-1);

  const embedId = video.provider === "youtube" ? video.embedId : null;

  // youtube — 플레이어 생성·폴링·정리
  useEffect(() => {
    if (video.provider !== "youtube" || !embedId) return;
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const stopPolling = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const host = document.createElement("div");
    container.appendChild(host);
    loadYouTube().then((YT) => {
      if (disposed) return;
      ytRef.current = new YT.Player(host, {
        videoId: embedId,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0,
          modestbranding: 1,
          start: Math.floor(startAtRef.current),
        },
        events: {
          onReady: (event) => {
            if (startAtRef.current > 0)
              event.target.seekTo(Math.floor(startAtRef.current), true);
            event.target.setPlaybackRate(rateRef.current);
          },
          onStateChange: (event) => {
            const position = Math.floor(event.target.getCurrentTime());
            if (event.data === YT.PlayerState.PLAYING) {
              stopPolling();
              timer = setInterval(() => {
                const player = ytRef.current;
                if (!player) return;
                const second = Math.floor(player.getCurrentTime());
                if (second === lastSecondRef.current) return;
                lastSecondRef.current = second;
                callbacks.current.onProgress?.(second);
              }, 1000);
            } else if (event.data === YT.PlayerState.PAUSED) {
              stopPolling();
              callbacks.current.onPause?.(position);
            } else if (event.data === YT.PlayerState.ENDED) {
              stopPolling();
              callbacks.current.onEnded?.(position);
            } else {
              stopPolling();
            }
          },
        },
      });
    });
    return () => {
      disposed = true;
      stopPolling();
      try {
        ytRef.current?.destroy();
      } catch {
        /* 이미 제거됨 */
      }
      ytRef.current = null;
      container.replaceChildren();
    };
  }, [video.provider, embedId]);

  // 재생 속도 — youtube 는 API, url 은 요소 속성
  useEffect(() => {
    rateRef.current = playbackRate;
    ytRef.current?.setPlaybackRate(playbackRate);
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  if (video.provider === "youtube") {
    if (!embedId)
      return (
        <p className="text-body-sm text-muted-foreground">
          재생할 수 없는 유튜브 주소입니다.
        </p>
      );
    return (
      <div
        ref={containerRef}
        className={className ?? "aspect-video w-full bg-black [&>div]:h-full [&>iframe]:h-full [&>iframe]:w-full"}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      src={video.url}
      className={className ?? "aspect-video w-full bg-black"}
      onLoadedMetadata={(event) => {
        const element = event.currentTarget;
        element.playbackRate = rateRef.current;
        if (startAtRef.current > 0 && element.duration > startAtRef.current)
          element.currentTime = startAtRef.current;
      }}
      onTimeUpdate={(event) => {
        const second = Math.floor(event.currentTarget.currentTime);
        if (second === lastSecondRef.current) return;
        lastSecondRef.current = second;
        callbacks.current.onProgress?.(second);
      }}
      onPause={(event) =>
        callbacks.current.onPause?.(Math.floor(event.currentTarget.currentTime))
      }
      onEnded={(event) =>
        callbacks.current.onEnded?.(Math.floor(event.currentTarget.currentTime))
      }
    />
  );
}

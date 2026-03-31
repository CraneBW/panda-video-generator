/**
 * Compositions supported by `pnpm run render:composition -- <id>`.
 * Keep IDs in sync with `src/remotion/Root.tsx` and `scripts/run-render-composition.mjs`.
 * Only entries that work with `remotion render` (not `remotion still`).
 *
 * Comment out entries below to hide them from /scripts/step-3 (CLI whitelist unchanged).
 */

/** Must match `ALLOWED` in `scripts/run-render-composition.mjs`. */
export const RENDER_COMPOSITION_CLI_IDS = new Set([
  "Intro",
  "Video",
  "Content",
  "Intro-Vertical",
  "Video-Vertical",
  "Content-Vertical",
  "Cover",
]);

/** Basename (no extension) for `output/video/<name>.mp4`; aligned with run-render-composition.mjs. */
export function outputVideoBasenameForComposition(compositionId: string): string {
  return compositionId === "Video"
    ? "video"
    : compositionId.replace(/[^a-zA-Z0-9-]/g, "-");
}
export type RemotionRenderOption = {
  id: string;
  labelZh: string;
  hintZh?: string;
};

export const REMOTION_RENDER_OPTIONS: RemotionRenderOption[] = [
  {
    id: "Video",
    labelZh: "完整成片（横屏）",
    hintZh: "Cover + Intro + Content，默认使用 public/tts",
  },
  {
    id: "Video-Vertical",
    labelZh: "完整成片（竖屏）",
    hintZh: "竖屏版 Video",
  },
  // {
  //   id: "Content",
  //   labelZh: "仅内容段（横屏）",
  //   hintZh: "无完整片头结构，常用于调试字幕",
  // },
  // {
  //   id: "Content-Vertical",
  //   labelZh: "仅内容段（竖屏）",
  // },
  // {
  //   id: "Intro",
  //   labelZh: "片头（横屏）",
  //   hintZh: "固定时长，见 types/constants",
  // },
  // {
  //   id: "Intro-Vertical",
  //   labelZh: "片头（竖屏）",
  // },
  // {
  //   id: "Cover",
  //   labelZh: "封面段落（约 1s）",
  // },
];

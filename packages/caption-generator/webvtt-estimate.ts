/**
 * Build WebVTT from a narration script: paragraphs get duration from character count (Chinese-oriented default).
 */

const DEFAULT_SEC_PER_CHAR = 0.12;

function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function scriptToEstimatedWebVtt(
  scriptText: string,
  secPerChar: number = DEFAULT_SEC_PER_CHAR,
): string {
  const paragraphs = scriptText
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const lines: string[] = ['WEBVTT', ''];
  let start = 0;
  for (const para of paragraphs) {
    const duration = Math.max(2, Math.min(12, para.length * secPerChar));
    const end = start + duration;
    lines.push(`${formatVttTime(start)} --> ${formatVttTime(end)}`);
    lines.push(para);
    lines.push('');
    start = end;
  }
  return lines.join('\n');
}

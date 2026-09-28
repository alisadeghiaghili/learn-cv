/** Share helpers + coffee button HTML. */

export const REPO_URL = "https://github.com/alisadeghiaghili/learn-cv";
export const LIVE_URL = "https://alisadeghiaghili.github.io/learn-cv/";

export const COFFEE_BUTTON_HTML = `
<p>
<a href="https://linktr.ee/aliaghili" target="_blank" rel="noopener noreferrer">Support the author · linktr.ee/aliaghili</a>
</p>
`.trim();

export async function shareWithClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function buildShareTargets(levelId: string | null): string {
  const base = LIVE_URL;
  const url = levelId ? `${base}?level=${encodeURIComponent(levelId)}&NODEMO` : `${base}?NODEMO`;
  return `LearnCV — Computer Vision lab\n${url}\n${REPO_URL}`;
}

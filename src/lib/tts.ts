// Audio is fetched via a Supabase Edge Function — the ElevenLabs key never
// leaves the server. Falls back to the free Web Speech API if Supabase is
// not configured (e.g. during local dev without credentials).

const audioCache = new Map<string, ArrayBuffer>();
let currentAudio: HTMLAudioElement | null = null;
let currentController: AbortController | null = null;

// ── Supabase Edge Function proxy ─────────────────────────────────────────────

async function fetchViaEdge(text: string): Promise<ArrayBuffer> {
  const cached = audioCache.get(text);
  if (cached) return cached;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  currentController = new AbortController();
  const res = await fetch(`${supabaseUrl}/functions/v1/tts`, {
    method: 'POST',
    signal: currentController.signal,
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`TTS proxy error ${res.status}: ${msg}`);
  }

  const buffer = await res.arrayBuffer();
  audioCache.set(text, buffer);
  return buffer;
}

function playBuffer(buffer: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;

    audio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); currentAudio = null; reject(new Error('Playback failed')); };
    audio.play().catch(reject);
  });
}

// ── Web Speech API fallback ──────────────────────────────────────────────────

let voicesReady = false;

function ensureVoices(): Promise<void> {
  if (voicesReady || window.speechSynthesis.getVoices().length > 0) {
    voicesReady = true;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.speechSynthesis.onvoiceschanged = () => { voicesReady = true; resolve(); };
    setTimeout(resolve, 500);
  });
}

async function webSpeak(text: string): Promise<void> {
  await ensureVoices();
  window.speechSynthesis.cancel();
  return new Promise((resolve, reject) => {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.rate = 0.88;
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang === 'en-US' && v.localService) ??
      voices.find((v) => v.lang === 'en-US') ??
      voices[0] ?? null;
    if (voice) utt.voice = voice;
    utt.onend = () => resolve();
    utt.onerror = (e) => { if (e.error === 'interrupted') resolve(); else reject(e); };
    window.speechSynthesis.speak(utt);
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function speak(text: string): Promise<void> {
  cancelSpeech();

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  const isConfigured = supabaseUrl.length > 0 && !supabaseUrl.startsWith('https://your-');

  if (isConfigured) {
    return fetchViaEdge(text).then(playBuffer).catch(() => webSpeak(text));
  }
  return webSpeak(text);
}

export function cancelSpeech(): void {
  currentController?.abort();
  currentController = null;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }

  window.speechSynthesis.cancel();
}

const audioCache = new Map<string, ArrayBuffer>();
let currentAudio: HTMLAudioElement | null = null;
let currentController: AbortController | null = null;

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

export async function speak(text: string): Promise<void> {
  cancelSpeech();
  return fetchViaEdge(text).then(playBuffer);
}

export function cancelSpeech(): void {
  currentController?.abort();
  currentController = null;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
}

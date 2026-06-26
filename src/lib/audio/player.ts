import { browser } from "$app/environment";

type AudioOptions = {
  src: string;
  volume?: number;
  failureMessage: string;
  warn?: (message: string, error: unknown) => void;
};

type AudioSequenceOptions = {
  sources: string[];
  intervalMs?: number;
  volume?: number;
  failureMessage: string;
  warn?: (message: string, error: unknown) => void;
};

export type KokoAudio = {
  load: () => void;
  play: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  dispose: () => void;
};

export function createKokoAudio({
  src,
  volume = 1,
  failureMessage,
  warn = console.warn,
}: AudioOptions): KokoAudio {
  let audio: HTMLAudioElement | undefined;
  let currentVolume = clampVolume(volume);

  function getAudio() {
    if (!browser) {
      return undefined;
    }

    if (!audio) {
      audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = currentVolume;
    }

    return audio;
  }

  return {
    load() {
      getAudio()?.load();
    },
    play() {
      const element = getAudio();

      if (!element) {
        return;
      }

      element.currentTime = 0;
      void element.play().catch((error: unknown) => {
        warn(failureMessage, error);
      });
    },
    stop() {
      if (!audio) {
        return;
      }

      audio.pause();
      audio.currentTime = 0;
    },
    setVolume(volume) {
      currentVolume = clampVolume(volume);

      if (audio) {
        audio.volume = currentVolume;
      }
    },
    dispose() {
      this.stop();
      audio = undefined;
    },
  };
}

export function createKokoAudioSequence({
  sources,
  intervalMs = 1000,
  volume = 1,
  failureMessage,
  warn = console.warn,
}: AudioSequenceOptions): KokoAudio {
  let audio: HTMLAudioElement | undefined;
  let audioInterval: ReturnType<typeof setInterval> | undefined;
  let currentIndex = 0;
  let playing = false;
  let currentVolume = clampVolume(volume);

  function getAudio() {
    if (!browser) {
      return undefined;
    }

    if (!audio && sources[0]) {
      audio = new Audio(sources[0]);
      audio.preload = "auto";
      audio.volume = currentVolume;
    }

    return audio;
  }

  function playCurrent() {
    const element = getAudio();

    if (!element) {
      return;
    }

    element.pause();
    element.src = sources[currentIndex];
    element.currentTime = 0;
    element.volume = currentVolume;
    void element.play().catch((error: unknown) => {
      stopPlayback();
      warn(failureMessage, error);
    });
  }

  function playNext() {
    if (!playing || sources.length === 0) {
      return;
    }

    currentIndex = (currentIndex + 1) % sources.length;
    playCurrent();
  }

  function stopPlayback() {
    playing = false;

    if (audioInterval) {
      clearInterval(audioInterval);
      audioInterval = undefined;
    }

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  return {
    load() {
      getAudio()?.load();
    },
    play() {
      if (playing) {
        return;
      }

      playing = true;
      currentIndex = 0;
      playCurrent();
      audioInterval = setInterval(playNext, intervalMs);
    },
    stop() {
      stopPlayback();
    },
    setVolume(volume) {
      currentVolume = clampVolume(volume);

      if (audio) {
        audio.volume = currentVolume;
      }
    },
    dispose() {
      this.stop();
      audio = undefined;
    },
  };
}

function clampVolume(volume: number) {
  return Math.min(1, Math.max(0, volume));
}

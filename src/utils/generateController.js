/**
 * Controller for generation process with pause/resume/stop and progress.
 */
export function createGenerateController() {
  let _paused = false;
  let _aborted = false;
  let _resumeResolve = null;

  return {
    get paused() { return _paused; },
    get aborted() { return _aborted; },

    pause() {
      _paused = true;
    },

    resume() {
      _paused = false;
      if (_resumeResolve) {
        _resumeResolve();
        _resumeResolve = null;
      }
    },

    stop() {
      _aborted = true;
      // Also resume if paused, so the loop can exit
      if (_resumeResolve) {
        _resumeResolve();
        _resumeResolve = null;
      }
    },

    /** Call at checkpoints — waits if paused, throws if aborted */
    async checkpoint() {
      if (_aborted) throw new AbortError();
      if (_paused) {
        await new Promise((resolve) => { _resumeResolve = resolve; });
        if (_aborted) throw new AbortError();
      }
    },
  };
}

export class AbortError extends Error {
  constructor() {
    super('Generation cancelled');
    this.name = 'AbortError';
  }
}

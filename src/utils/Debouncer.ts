export class Debouncer {
  timeoutRef: NodeJS.Timeout | null = null;
  debounceTimeMs: number;
  isRunning = false;

  constructor(ms: number) {
    this.debounceTimeMs = ms;
  }

  debounce(callback: () => any): void {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
    }

    this.timeoutRef = setTimeout(async () => {
      if (this.isRunning) {
        return this.debounce(callback);
      }

      this.isRunning = true;
      try {
        await callback();
      } catch (err) {
        console.error(err);
      }
      this.isRunning = false;
    }, this.debounceTimeMs);
  }
}

import { Disposable, IDisposable } from './Disposable';

/**
 * A typed event.
 */
export interface Event<T> {
  /**
   *
   * @param listener The listener function will be called when the event happens.
   * @return a disposable to remove the listener again.
   */
  (listener: (e: T) => void): IDisposable;
}

/**
 * Waits for the event to fire, then resolves the promise once finished
 */
export function listenOnce<T>(event: Event<T>): Promise<T> {
  return new Promise((resolve) => {
    const disposable = event((result) => {
      disposable.dispose();
      resolve(result);
    });
  });
}

export class Emitter<T> implements IDisposable {
  private registeredListeners = new Set<(e: T) => void>();
  private _event: Event<T> | undefined;

  get event(): Event<T> {
    if (!this._event) {
      this._event = (listener: (e: T) => void) => {
        this.registeredListeners.add(listener);

        return Disposable.create(() => {
          this.registeredListeners.delete(listener);
        });
      };
    }

    return this._event;
  }

  /** Invoke all listeners registered to this event. */
  fire(event: T): void {
    this.registeredListeners.forEach((listener) => {
      listener(event);
    });
  }

  dispose(): void {
    this.registeredListeners = new Set();
  }
}

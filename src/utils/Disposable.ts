import { Emitter } from './emitter';

export interface IDisposable {
  /**
   * Dispose this object.
   */
  dispose(): void;
}

export class Disposable implements IDisposable {
  private onWillDisposeEmitter = new Emitter<null>();
  public onWillDispose = this.onWillDisposeEmitter.event;

  private onDidDisposeEmitter = new Emitter<null>();
  public onDidDispose = this.onDidDisposeEmitter.event;

  protected toDispose: IDisposable[] = [];
  public isDisposed = false;

  public onDispose(cb: () => void): void {
    this.toDispose.push(Disposable.create(cb));
  }

  public dispose(): void {
    if (this.isDisposed) return;

    this.onWillDisposeEmitter.fire(null);
    this.isDisposed = true;
    this.toDispose.forEach((disposable) => {
      disposable.dispose();
    });
    this.onDidDisposeEmitter.fire(null);

    this.onWillDisposeEmitter.dispose();
    this.onDidDisposeEmitter.dispose();
  }

  public static is(arg: any): arg is Disposable {
    return typeof arg['dispose'] === 'function';
  }

  public static create(cb: () => void): IDisposable {
    return {
      dispose: cb,
    };
  }
}

/**
 * A store where you can track multiple disposables. Mostly a utility.
 */
export class DisposableStore implements IDisposable {
  static DISABLE_DISPOSED_WARNING = false;

  private _toDispose = new Set<IDisposable>();
  private _isDisposed = false;

  /**
   * Dispose of all registered disposables and mark this object as disposed.
   *
   * Any future disposables added to this object will be disposed of on `add`.
   */
  public dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;
    this.clear();
  }

  /**
   * Dispose of all registered disposables but do not mark this object as disposed.
   */
  public clear(): void {
    try {
      for (const disposable of this._toDispose.values()) {
        disposable.dispose();
      }
    } finally {
      this._toDispose.clear();
    }
  }

  public add<T extends IDisposable>(o: T): T {
    if (!o) {
      return o;
    }
    if ((o as unknown as DisposableStore) === this) {
      throw new Error('Cannot register a disposable on itself!');
    }

    if (this._isDisposed) {
      if (!DisposableStore.DISABLE_DISPOSED_WARNING) {
        console.warn(
          new Error(
            'Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!'
          ).stack
        );
      }
    } else {
      this._toDispose.add(o);
    }

    return o;
  }
}

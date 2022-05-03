import { IntegrationError } from '../errors/IntegrationError';
import { IFrameParentMessageBus } from '../protocol/iframe';

type LoadIntegrationFn = () => Promise<any>;

type IntegrationsKeys = 'react-devtools-legacy' | 'react-devtools-latest';

const INTEGRATION_LIST = new Map<IntegrationsKeys, LoadIntegrationFn>([
  ['react-devtools-legacy', () => import('./react-devtools-legacy')],
  ['react-devtools-latest', () => import('./react-devtools-latest')],
]);

export class Integrations {
  private registry = INTEGRATION_LIST;

  private messageBus: IFrameParentMessageBus;
  private iframeWindow: Window | null;

  constructor(iframeWindow: Window | null, messageBus: IFrameParentMessageBus) {
    this.iframeWindow = iframeWindow;
    this.messageBus = messageBus;
  }

  async load(key: IntegrationsKeys): Promise<undefined | Error> {
    if (this.registry.has(key)) {
      try {
        const win = this.iframeWindow;
        const winEval = win.eval;
        const loader = this.registry.get(key);

        window.addEventListener('message', (evt) => {
          if (evt.source === win) {
            console.log('Forward to parent', evt.data);
            window.parent.postMessage(evt.data);
          } else if (evt.source === window.parent) {
            console.log('Forward to iframe', evt.data);
            win.postMessage(evt.data);
          }
        });

        winEval.call(
          win,
          `(function $integration_loader(loader, integrations) {
            loader().then((value) => value.default(integrations));
        })`
        )(loader, this);

        return;
      } catch (err) {
        throw new IntegrationError(err instanceof Error ? err.message : (err as string), key);
      }
    }

    throw new IntegrationError(`The integration "${key}" was not found.`, key);
  }
}

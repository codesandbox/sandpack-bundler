import { IFrameParentMessageBus } from '../protocol/iframe';

type LoadIntegrationFn = () => Promise<any>;

const INTEGRATION_LIST = new Map<string, LoadIntegrationFn>([
  ['foo', () => import('./foo')],
  ['foo', () => import('./foo')],
]);

export class Integrations {
  private messageBus: IFrameParentMessageBus;
  private registry = INTEGRATION_LIST;

  constructor(messageBus: IFrameParentMessageBus) {
    this.messageBus = messageBus;
  }

  async load(key: string): Promise<undefined> {
    if (this.registry.has(key)) {
      try {
        const { default: integrationModule } = await this.registry.get(key)?.();
        return integrationModule(this);
      } catch {
        // TODO: integration error
      }
    }

    return Promise.reject('The integration was not found.');
  }
}

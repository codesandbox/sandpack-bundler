import { BundlerError } from '../errors/BundlerError';
import { IntegrationError } from '../errors/IntegrationError';
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

  async load(key: string): Promise<undefined | Error> {
    if (this.registry.has(key)) {
      try {
        const { default: integrationModule } = await this.registry.get(key)?.();
        return integrationModule(this);
      } catch (err) {
        return new IntegrationError(err as Error, key);
      }
    }

    return new IntegrationError('The integration was not found.', key);
  }
}

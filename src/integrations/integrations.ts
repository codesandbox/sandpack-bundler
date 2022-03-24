import { IntegrationError } from '../errors/IntegrationError';
import { IFrameParentMessageBus } from '../protocol/iframe';

type LoadIntegrationFn = () => Promise<any>;

type IntegrationsKeys = 'react-devtools-legacy' | 'react-devtools-latest';

const INTEGRATION_LIST = new Map<IntegrationsKeys, LoadIntegrationFn>([
  ['react-devtools-legacy', () => import('./react-devtools-legacy')],
  ['react-devtools-latest', () => import('./react-devtools-latest')],
]);

export class Integrations {
  private messageBus: IFrameParentMessageBus;
  private registry = INTEGRATION_LIST;

  constructor(messageBus: IFrameParentMessageBus) {
    this.messageBus = messageBus;
  }

  async load(key: IntegrationsKeys): Promise<undefined | Error> {
    if (this.registry.has(key)) {
      try {
        const { default: integrationModule } = await this.registry.get(key)?.();
        return integrationModule(this);
      } catch (err) {
        throw new IntegrationError(err instanceof Error ? err.message : (err as string), key);
      }
    }

    throw new IntegrationError(`The integration "${key}" was not found.`, key);
  }
}

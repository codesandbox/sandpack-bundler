import { IntegrationError } from '../errors/IntegrationError';
import { IFrameParentMessageBus } from '../protocol/iframe';

type LoadIntegrationFn = () => Promise<any>;

type IntegrationsKeys = 'react-devtools-legacy' | 'foo';

const INTEGRATION_LIST = new Map<IntegrationsKeys, LoadIntegrationFn>([
  ['react-devtools-legacy', () => import('./react-devtools-legacy')],
  ['foo', () => import('./foo')],
]);

export class Integrations {
  private messageBus: IFrameParentMessageBus;
  private registry = INTEGRATION_LIST;

  constructor(messageBus: IFrameParentMessageBus) {
    this.messageBus = messageBus;
  }

<<<<<<< HEAD
  async load(key: string): Promise<undefined | Error> {
=======
  async load(key: IntegrationsKeys): Promise<undefined | BundlerError> {
>>>>>>> 104ce76 (init)
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

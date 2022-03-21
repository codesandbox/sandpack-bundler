import uuid from 'uuid';

import { IFrameParentMessageBus } from '../../../../protocol/iframe';

export async function initializeReactDevToolsLatest(messageBus: IFrameParentMessageBus) {
  if (!window.opener) {
    const uid = uuid.v1();

    const wall = {
      listen(listener) {
        window.addEventListener('message', (event) => {
          if (event.data.uid === uid) {
            listener(event.data);
          }
        });
      },
      send(event, payload) {
        window.parent.postMessage({ event, payload, uid }, '*');
      },
    };

    const {
      activate: activateBackend,
      createBridge: createBackendBridge,
      initialize: initializeBackend,
    } = await import('react-devtools-inline/backend');

    // The dispatch needs to happen before initializing, so that the backend can already listen
    messageBus.sendMessage('activate-react-devtools', uid);

    // @ts-ignore
    if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined') {
      try {
        // @ts-ignore We need to make sure that the existing chrome extension doesn't interfere
        delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      } catch (e) {
        /* ignore */
      }
    }
    // Call this before importing React (or any other packages that might import React).
    initializeBackend(window);
    activateBackend(window, {
      bridge: createBackendBridge(window, wall),
    });
  }
}

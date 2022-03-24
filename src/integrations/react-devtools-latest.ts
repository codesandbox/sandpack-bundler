import { activate, createBridge, initialize } from 'react-devtools-inline/backend';

import { IFrameParentMessageBus } from '../protocol/iframe';

function initIntegration({ messageBus }: { messageBus: IFrameParentMessageBus }) {
  if (!window.opener) {
    const uid = Date.now().toString(16);

    const wall = {
      listen(listener: any) {
        window.addEventListener('message', (event) => {
          if (event.data.uid === uid) {
            listener(event.data);
          }
        });
      },
      send(event: any, payload: any) {
        window.parent.postMessage({ event, payload, uid }, '*');
      },
    };

    // The dispatch needs to happen before initializing, so that the backend can already listen
    messageBus.sendMessage('activate-react-devtools', { uid });

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
    initialize(window);
    activate(window, {
      bridge: createBridge(window, wall),
    });
  }
}

export default initIntegration;

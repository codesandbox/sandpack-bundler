import { activate, initialize } from 'react-devtools-inline_legacy/backend';

import { IFrameParentMessageBus } from '../protocol/iframe';

function initIntegration({ messageBus }: { messageBus: IFrameParentMessageBus }) {
  if (!window.opener) {
    // The dispatch needs to happen before initializing, so that the backend can already listen
    messageBus.sendMessage('activate-react-devtools');

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
    activate(window);
  }
}

export default initIntegration;

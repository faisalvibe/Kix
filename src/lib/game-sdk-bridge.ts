import type { GameSDKContext } from "./types";

/**
 * Injects the GameSDK bridge script into the game iframe.
 * This script is prepended to the game's HTML to provide the SDK context.
 */
export function createSDKBridgeScript(context: GameSDKContext): string {
  return `
    <script>
      (function() {
        window.__KIX_CONTEXT__ = ${JSON.stringify(context)};

        // Listen for SDK lifecycle commands from parent
        window.addEventListener('message', function(event) {
          if (!event.data || !event.data.type) return;
          var sdk = window.GameSDK;
          if (!sdk) return;

          switch (event.data.type) {
            case 'kix:start':
              if (typeof sdk.start === 'function') sdk.start();
              break;
            case 'kix:pause':
              if (typeof sdk.pause === 'function') sdk.pause();
              break;
            case 'kix:resume':
              if (typeof sdk.resume === 'function') sdk.resume();
              break;
            case 'kix:destroy':
              if (typeof sdk.destroy === 'function') sdk.destroy();
              break;
          }
        });

        // Notify parent when game is ready
        window.addEventListener('load', function() {
          var sdk = window.GameSDK;
          if (sdk && typeof sdk.init === 'function') {
            sdk.init(window.__KIX_CONTEXT__);
            window.parent.postMessage({ type: 'kix:ready' }, '*');
          } else {
            window.parent.postMessage({ type: 'kix:no-sdk' }, '*');
          }
        });
      })();
    </script>
  `;
}

export {};

declare global {
  interface Window {
    PaystackPop?: {
      setup: (
        opts: Record<string, unknown>
      ) => { openIframe: () => void };
    };
    paystackLoaded?: boolean;
  }
}

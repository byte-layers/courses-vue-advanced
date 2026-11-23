// Réglages communs à tous les tests Vitest.
// jsdom n'implémente pas tout ce que Vuetify attend ; des faux minimalistes suffisent.

// Utilisé par les composants qui observent leur taille (pas exigé par tous les composants Vuetify).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

// Utilisé par les couches flottantes (v-dialog, v-menu, v-snackbar...) : sans lui, « visualViewport is not defined ».
if (!('visualViewport' in globalThis)) {
  Object.defineProperty(globalThis, 'visualViewport', {
    value: {
      width: 1024,
      height: 768,
      offsetLeft: 0,
      offsetTop: 0,
      scale: 1,
      addEventListener() {},
      removeEventListener() {},
    },
  })
}

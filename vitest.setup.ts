import "@testing-library/jest-dom/vitest"

// jsdom no implementa estas APIs que usan @base-ui/react (Select/Dialog) y sonner.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}

for (const method of ["hasPointerCapture", "setPointerCapture", "releasePointerCapture"] as const) {
  if (!Element.prototype[method]) {
    Element.prototype[method] = (() => false) as never
  }
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

declare global {
  interface NodeEventMap {
    xxx: Event
  }
}

interface Node extends EventTarget {
  appendChild<T extends Node>(child: T): T
  removeChild<T extends Node>(child: T): T

  addEventListener<K extends keyof NodeEventMap>(
    type: K,
    listener: (this: Node, ev: NodeEventMap[K],) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof NodeEventMap>(
    type: K,
    listener: (this: Node, ev: NodeEventMap[K],) => void,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

abstract class Node extends EventTarget { }

interface Element extends Node {
  readonly path: string
}

class Element extends Node {
  constructor(readonly path: string) {
    super()
  }
}

class Core extends Node {
  readonly path = '/'
  #elements: Element[] = []

  getElementByPath(path: string): Element {
    const absolute = path.startsWith(this.path) ? path : this.path + path
    const exists = this.#elements.find(v => v.path === absolute)
    if (exists) return exists
    const element = this.createElement(absolute)
    this.#elements.push(element)
    return element
  }

  createElement(path: string): Element {
    return new Element(path)
  }
}

export const core = new Core()

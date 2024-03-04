const nodes: PathNode[] = [];

declare global {
  interface PathEventMap {
    [k: string]: Event;
  }
}

const _stopPropagationFlag = Symbol("[[stopPropagationFlag]]");
export class PathEvent extends Event {
  [_stopPropagationFlag] = false;
  stopPropagation(): void {
    this[_stopPropagationFlag] = true;
  }
}

export class PathNode extends EventTarget {
  constructor(public readonly path: string = "/") {
    super();
    const exists = nodes.some((v) => v.path === path);
    if (exists) return exists;
    nodes.push(this);
  }

  #captures = new EventTarget();

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (typeof options === "object" && options.capture)
      this.#captures.addEventListener(type, listener, options);
    else super.addEventListener(type, listener, options);
  }

  dispatchEvent(event: Event): boolean {
    if (!(event instanceof PathEvent)) return super.dispatchEvent(event);
    const targets = nodes.filter((v) => v.#capture(this));
    targets.sort((a, b) => a.path.length - b.path.length);
    for (const v of targets) {
      if (event[_stopPropagationFlag]) return event.defaultPrevented;
      v.#captures.dispatchEvent(event);
    }
    for (const v of targets.reverse()) {
      if (event[_stopPropagationFlag]) return event.defaultPrevented;
      v.#dispatch(event);
    }
    return event.defaultPrevented;
  }

  #capture(source: PathNode): boolean {
    return source.path.startsWith(this.path);
  }

  #dispatch(event: Event): boolean {
    return super.dispatchEvent(event);
  }
}

export interface PathNode {
  addEventListener<K extends keyof PathEventMap>(
    type: K,
    listener: (ev: PathEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;

  removeEventListener<K extends keyof PathEventMap>(
    type: K,
    listener: (ev: PathEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void;
}

import { expect } from "https://deno.land/std@0.210.0/expect/mod.ts";

Deno.test("URL -> index loop", () => {
  const url = "/xxx/yyy/zzz";

  function xxx(url: string) {
    const index = url.lastIndexOf("/");
    if (index < 0) return;
    const path = url.slice(0, index);
    console.log(path, path + "/");
    xxx(path);
  }
  xxx(url);
});

Deno.test("stopPropagation", () => {
  const ev = new Event("xxx");
  addEventListener("xxx", (ev) => {
    console.log(1);
    ev.stopImmediatePropagation();
  });
  let called = false;
  addEventListener("xxx", () => {
    console.log(2);
    called = true;
  });
  dispatchEvent(ev);
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      console.log("called", called);
      called ? reject() : resolve();
    }, 1000)
  );
});

Deno.test("phase", () => {
  addEventListener("phase", (ev) => console.log("normal", ev.eventPhase));
  addEventListener("phase", (ev) => console.log("capture", ev.eventPhase), {
    capture: true,
  });
  addEventListener("phase", (ev) => console.log("passive", ev.eventPhase), {
    passive: true,
  });
  dispatchEvent(new Event("phase", { bubbles: true }));
});

Deno.test("catch", async () => {
  function xxx() {
    throw Error("throw");
  }
  async function yyy() {
    xxx();
  }
  await expect(yyy().catch(() => false)).resolves.toBe(false);
});

Deno.test("switch", () => {
  function xx(x: string): string {
    console.log("case", x);
    return x;
  }
  function zzz(x: string) {
    switch (x) {
      case xx("xx"):
        console.log("xx");
        break;
      case xx("yy"):
        console.log("yy");
        break;
    }
  }
  zzz("yy");
  zzz("yy");
});

Deno.test("then, catch", async () => {
  expect(
    await Promise.resolve("{}")
      .then(JSON.parse)
      .catch(() => undefined)
  ).toEqual({});
  expect(
    await Promise.reject()
      .then(JSON.parse)
      .catch(() => undefined)
  ).toBe(undefined);
  expect(
    await Promise.resolve("{")
      .then(JSON.parse)
      .catch(() => undefined)
  ).toBe(undefined);
});

Deno.test("null object", () => {
  expect(JSON.stringify({})).toHaveLength(2);
});

Deno.test("event rejection", () => {
  const resolves: string[] = [];
  const target = new (class extends EventTarget {
    addEventListener(
      type: string,
      listener: EventListener,
      options?: boolean | AddEventListenerOptions | undefined
    ): void {
      const wrapper = (ev: Event) => {
        try {
          listener(ev);
        } catch (error) {
          this.dispatchEvent(new ErrorEvent("error", { error }));
        }
      };
      return super.addEventListener(type, wrapper, options);
    }
  })();
  target.addEventListener("unhandledrejection", (ev) => {
    resolves.push("unhandledrejection");
    ev.preventDefault();
  });
  target.addEventListener("error", (ev) => {
    resolves.push("error");
    ev.preventDefault();
  });
  addEventListener("unhandledrejection", (ev) => {
    resolves.push("global unhandledrejection");
    ev.preventDefault();
  });
  addEventListener("error", (ev) => {
    resolves.push("global error");
    ev.preventDefault();
  });

  target.addEventListener("xxx", () => {
    throw Error("xxx");
  });
  target.dispatchEvent(new Event("xxx"));
  expect(resolves).toEqual(["error"]);
});

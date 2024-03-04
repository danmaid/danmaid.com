const store = "https://danmaid.com";

export async function post(request: Request): Promise<Response> {
  const url = store + new URL(request.url).pathname;
  const { default: fn } = await import(url);
  return fn(request);
}

export async function post2(request: Request): Promise<Response> {
  const recipe = await request.json();
  const { default: fn } = await import(new URL(recipe.exec, store).href);
  return fn(request);
}

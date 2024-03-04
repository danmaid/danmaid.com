deno test `
  --allow-read --allow-run --allow-net `
  --location https://localhost `
  --cert localhost.crt `
  spec.ts $args

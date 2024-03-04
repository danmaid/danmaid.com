addEventListener("request", (ev) => {
  console.info(
    new Date(ev.timeStamp),
    ev.type,
    ev.id,
    ":=",
    ev.request.method,
    ev.request.url,
    ev.info.remoteAddr
  );
});
addEventListener("response", (ev) => {
  console.info(
    new Date(ev.timeStamp),
    ev.type,
    ev.request,
    "=>",
    ev.response.status
  );
});

GET https://danmaid.com/xyz
PUT https://danmaid.com/xyz

self.danmaid.com with query
self.danmaid.com/a
self.danmaid.com/aaaa
self.danmaid.com/mx
self.danmaid.com/ns

PUT self.danmaid.com/a
  type: text/plain
  body: 192.168.0.1

GET self.danmaid.com/a
  accept: text/plain
  body: 192.168.0.1

on put self.danmaid.com/a
  type: text/plain
  body: 192.168.0.1
  () => register-route53

danmaid.com/a
danmaid.com/aaaa

danmaid.com NS @self
@self danmaid.com A DynamicIP
@self danmaid.com AAAA DynamicIP

self.danmaid.com NS @self
@self self.danmaid.com A DynamicIP
@self self.danmaid.com AAAA DynamicIP

@ACME GET http://danmaid.com/... => certbot
@ACME GET http://self.danmaid.com/... => certbot


update danmaid.com AAAA DynamicIP
update dev.danmaid.com AAAA DynamicIP
update self.danmaid.com AAAA DynamicIP

authorize cert

update danmaid.com A DynamicIP
update dev.danmaid.com A DynamicIP
update self.danmaid.com A DynamicIP

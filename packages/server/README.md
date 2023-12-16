シンプルな HTTP サーバ

- with content negotiation

データ表現

- xxx
- xxx.text.html
- xxx.application.json
- xxx.application.vnd.danmaid.transaction.json

- xxx/

  - text/
    - html
  - application/
    - json -> vnd.danmaid.transaction+json
    - vnd.danmaid.transaction+json
  - default -> text/html

- yyy.js/

  - text/
    - javascript
  - default -> text/javascript

- zzz

```
PUT /xxx Content-Type: text/html
PUT /xxx Content-Type: application/vnd.danmaid.transaction+json
PUT /xxx Content-Type: application/json Content-Location: application/vnd.danmaid.transaction+json
PUT /xxx Content-Type: */* Content-Location: text/html

GET /xxx Accept: */* => 200 Content-Type: text/html Content-Location: text/html
GET /xxx Accept: text/* => 200 Content-Type: text/html Content-Location: text/html
GET /xxx Accept: text/html => 200 Content-Type: text/html
GET /xxx Accept: application/json => 200 Content-Type: application/vnd.danmaid.transaction+json Content-Location: application/vnd.danmaid.transaction+json

GET /xxx/ => 200 Content-Type: application/vnd.danmaid.index+json

PUT /yyy.js Content-Type: text/javascript
PUT /yyy.js Content-Type: */* Content-Location: text/javascript
GET /yyy.js => 200 Content-Type: text/javascript Content-Location: text/javascript

GET /yyy.js/ => 200 Content-Type: application/vnd.danmaid.index+json

PUT /zzz
GET /zzz => 200

GET /zzz/ => 404

GET / Accept: appplication/json => 200 Content-Type: application/vnd.danmaid.index+json

type Index = { id: string; children?: Index[]; location?: string }[];
```

```yaml
connections: # type Connection
  - xxx: { local: {}, remote: {} }
  - yyy: { local: {}, remote: {} }
  - aaa: { local: {}, remote: {} }
  - bbb: { local: {}, remote: {} }
sessions: # type Session
  - xxx
  - yyy
logs: # type Log
  - xxx
  - yyy

processes/{id}:
  log: xxx => 301 /logs/xxx
  error: xxx => 301 /logs/xxx
  info: xxx => /logs/xxx
  warn: xxx => /logs/xxx
  debug: xxx => /logs/xxx
  logs: []
  connections: []
  sessions: []
servers/{id}:
  process: xxx => 301 /processes/xxx
  connections:
    - xxx => 301 /connections/xxx
    - yyy => 301 /connections/yyy
  sessions:
    - xxx => 301 /sessions/xxx
    - yyy => 301 /sessions/yyy
  access_log: xxx => 301 /log/xxx
  error_log: xxx => 301 /logs/xxx
clients/{id}:
  process: xxx => 301 /processes/xxx
  connections:
    - aaa
    - bbb
  sessions:
    - xxx
    - yyy
```

```
POST /processes/
POST /logs/ links: [processes/xxx]
PUT /processes/xxx { log, error, info, warn, debug }
POST /servers/ links: [processes/xxx]
POST /clients/ links: [processes/xxx]
POST /connections/ links: [processes/xxx, servers/xxx]
POST /connections/ links: [processes/xxx, clients/xxx]
POST /sessions/ links: [processes/xxx, servers/xxx, connections/xxx]
```

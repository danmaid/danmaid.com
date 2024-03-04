import { Peer } from './Peer'

interface View {
  url: string
}

export class Remote extends Peer<string, View> {
  source: EventSource
  constructor(url: string) {
    super()
    this.source = new EventSource(url)
  }
}
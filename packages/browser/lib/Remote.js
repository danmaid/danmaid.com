import { Peer } from './Peer';
export class Remote extends Peer {
    source;
    constructor(url) {
        super();
        this.source = new EventSource(url);
    }
}

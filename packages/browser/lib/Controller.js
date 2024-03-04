import { Job } from './Job';
export class Controller {
    map = new Map();
    queues = new Map();
    enqueue(key, fn) {
        const job = new Job(() => fn(key, this.map.get(key)));
        const queue = this.queues.get(key);
        queue ? queue.push(job) : this.queues.set(key, [job]);
    }
    sequentialRun(key) {
        this.lock(key, async () => {
            const job = this.queues.get(key)?.shift();
            await job?.exec().catch(() => undefined);
        });
    }
    lastOnlyRun(key) {
        this.lock(key, async () => {
            const queue = this.queues.get(key);
            const job = queue?.pop();
            queue?.splice(0);
            await job?.exec().catch(() => undefined);
        });
    }
    locks = new Set();
    async lock(key, fn) {
        if (this.locks.has(key))
            return;
        this.locks.add(key);
        await fn().catch(() => undefined);
        this.locks.delete(key);
    }
    async create(key, fn) {
        const value = await fn();
        this.set(key, value);
    }
    async delete(key, fn) {
        const value = this.map.get(key);
        if (value && this.map.delete(key))
            await fn(value);
    }
    set(key, value) {
        this.map.set(key, value);
        this.map.set(value, key);
    }
    has(key) {
        return this.map.has(key);
    }
}

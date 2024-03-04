export class Job {
    fn;
    constructor(fn) {
        this.fn = fn;
    }
    cancel() {
        this.reject(Error('cancel'));
    }
    async exec() {
        try {
            const result = await this.fn();
            this.resolve(result);
        }
        catch (err) {
            this.reject(err);
        }
        return this.result;
    }
    result = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
    });
    resolve;
    reject;
}

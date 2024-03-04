export class Job<T extends () => any = () => void> {
  constructor(public fn: T) { }
  cancel() {
    this.reject(Error('cancel'));
  }
  async exec() {
    try {
      const result = await this.fn();
      this.resolve(result);
    } catch (err) {
      this.reject(err);
    }
    return this.result;
  }

  result = new Promise<ReturnType<T>>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
  resolve!: (value: ReturnType<T>) => void;
  reject!: (reason?: any) => void;
}

export class DefaultMap extends Map {
    factory;
    constructor(factory) {
        super();
        this.factory = factory;
    }
    get(key) {
        const value = super.get(key);
        if (value)
            return value;
        const v = this.factory();
        this.set(key, v);
        return v;
    }
}

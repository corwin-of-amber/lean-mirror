
class Future<A> {

    promise: Promise<A>;
    _resolve: (value : A | PromiseLike<A>) => void;
    _reject: (reason? : any) => void;
    _done: boolean;
    _success: boolean;

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
        this._done = false;
        this._success = false;
    }

    resolve(val:A)  { if (!this._done) { this._done = this._success = true; this._resolve(val); } }
    reject(err?)    { if (!this._done) { this._done = true; this._reject(err); } }

    then<T>(cont: (v: A) => T) {
        return this.promise.then(cont);
    }

    isDone()        { return this._done; }
    isSuccessful()  { return this._success; }
    isFailed()      { return this._done && !this._success; }
}


export { Future }
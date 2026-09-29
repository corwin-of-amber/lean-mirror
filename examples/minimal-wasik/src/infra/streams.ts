import { Future } from "./future";


interface DuplexStream<In, Out=In> {
    write(data: In): void
    read(): AsyncGenerator<Awaited<Out>>
}


class AsyncQueue<E> {
    elems: E[] = []
    cv = new ConditionVariable

    cork: boolean = false

    push(e: E) {
        this.elems.push(e);
        this.cv.notifyAll();
    }

    async pop(): Promise<E> {
        let bite = await this.popEye();
        if (bite.done) throw new EOI();
        else return bite.value;
    }

    async popEye(): Promise<{done: false, value: E} | {done: true}> {
        while (this.elems.length === 0) {
            if (this.cork) return {done: true};
            await this.cv.wait();
        }
        return {done: false, value: this.elems.shift() as E};
    }

    end() {
        this.cork = true;
        this.cv.notifyAll();
    }

    async *consume(): AsyncGenerator<E> {
        while (true) {
            let bite = await this.popEye();
            if (bite.done) break;
            else yield bite.value;
        }
    }
}

class EOI { }


class ConditionVariable {
    waiting: Future<void>[] = []

    wait() {
        let fut = new Future<void>;
        this.waiting.push(fut);
        return fut.promise;
    }

    notifyAll() {
        let p: Future<void> | undefined;
        while (p = this.waiting.pop())
            p.resolve();
    }
}


export { DuplexStream, AsyncQueue }
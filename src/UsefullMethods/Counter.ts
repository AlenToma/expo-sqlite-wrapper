export default class Counter<T>{
    items: T[];
    currentIndex = -1;
    constructor(items: T[]) {
        this.items = items;
    }

    get length() {
        return this.items.length;
    }

    get hasNext() {
        return this.currentIndex + 1 < this.items.length;
    }

    get hasPrev() {
        return this.currentIndex - 1 >= 0;
    }

    get hasCurrent() {
        if (this.currentIndex >= 0 && this.currentIndex < this.items.length)
            return true
        return false;
    }

    get next() {
        if (this.hasNext) {
            this.currentIndex++;
            return this.items[this.currentIndex];
        }
        return undefined;
    }

    get prev() {
        if (this.hasPrev) {
            return this.items[this.currentIndex - 1];
        }
        return undefined;
    }


    get current() {
        return this.items[this.currentIndex];
    }

    index(index: number) {
        if (index >= 0 && index < this.items.length)
            return this.items[index];
        return undefined;
    }
}
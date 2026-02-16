import { HeaderComponent, HeaderRegistryItem } from './types';

class HeaderRegistry {
    private headers: Map<string, HeaderRegistryItem>;

    constructor() {
        this.headers = new Map<string, HeaderRegistryItem>();
    }

    register(id: string, component: HeaderComponent, description?: string): void {
        this.headers.set(id, { id, component, description });
    }

    get(id: string): HeaderComponent | undefined {
        const item = this.headers.get(id);
        return item ? item.component : undefined;
    }

    has(id: string): boolean {
        return this.headers.has(id);
    }

    getAll(): HeaderRegistryItem[] {
        return Array.from(this.headers.values());
    }

    clear(): void {
        this.headers.clear();
    }
}

const instance = new HeaderRegistry();
export default instance;

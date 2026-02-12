// src/components/shared/header/__tests__/HeaderRegistry.test.ts
import React from 'react';
import HeaderRegistry from '../HeaderRegistry';
import { HeaderProps } from '../types';

// Mock Header Component
const MockHeader: React.FC<HeaderProps> = () => <div>Mock Header</div>;

describe('HeaderRegistry', () => {
    beforeEach(() => {
        HeaderRegistry.clear();
    });

    it('should be defined', () => {
        expect(HeaderRegistry).toBeDefined();
    });

    it('should allow registering a header component', () => {
        HeaderRegistry.register('mock-header', MockHeader);
        expect(HeaderRegistry.has('mock-header')).toBe(true);
    });

    it('should retrieve a registered header component', () => {
        HeaderRegistry.register('mock-header', MockHeader);
        const RetrievedHeader = HeaderRegistry.get('mock-header');
        expect(RetrievedHeader).toBe(MockHeader);
    });

    it('should return undefined or default for unknown header', () => {
        const RetrievedHeader = HeaderRegistry.get('unknown-header');
        expect(RetrievedHeader).toBeUndefined();
    });
    
    it('should allow getting all registered headers', () => {
        HeaderRegistry.register('header1', MockHeader);
        HeaderRegistry.register('header2', MockHeader);
        
        const headers = HeaderRegistry.getAll();
        expect(headers.length).toBe(2);
        expect(headers.find(h => h.id === 'header1')).toBeDefined();
        expect(headers.find(h => h.id === 'header2')).toBeDefined();
    });

    it('should prevent overwriting an existing key without permission (or maybe allow it? Let\'s assume LIFO/overwrite for now)', () => {
        const AnotherMockHeader: React.FC<HeaderProps> = () => <div>Another Mock Header</div>;
        HeaderRegistry.register('mock-header', MockHeader);
        HeaderRegistry.register('mock-header', AnotherMockHeader);
        
        expect(HeaderRegistry.get('mock-header')).toBe(AnotherMockHeader);
    });
});

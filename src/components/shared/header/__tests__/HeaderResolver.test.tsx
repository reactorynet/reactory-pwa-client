import React from 'react';
import { render, screen } from '@testing-library/react';
import HeaderResolver from '../HeaderResolver';
import HeaderRegistry from '../HeaderRegistry';

// Mocks
const DefaultHeaderMock = () => <div data-testid="default-header">Default Header</div>;
const CustomHeaderMock = () => <div data-testid="custom-header">Custom Header</div>;

describe('HeaderResolver', () => {
    beforeAll(() => {
        HeaderRegistry.register('default', DefaultHeaderMock);
        HeaderRegistry.register('custom', CustomHeaderMock);
    });

    afterAll(() => {
        HeaderRegistry.clear();
    });

    it('renders default header when no key is provided', () => {
        // @ts-ignore
        render(<HeaderResolver reactory={{}} />);
        expect(screen.getByTestId('default-header')).toBeInTheDocument();
    });

    it('renders custom header when key is provided', () => {
        // @ts-ignore
        render(<HeaderResolver headerKey="custom" reactory={{}} />);
        expect(screen.getByTestId('custom-header')).toBeInTheDocument();
    });

    it('falls back to default header when invalid key is provided', () => {
        // @ts-ignore
        render(<HeaderResolver headerKey="invalid" reactory={{}} />);
        expect(screen.getByTestId('default-header')).toBeInTheDocument();
    });
});

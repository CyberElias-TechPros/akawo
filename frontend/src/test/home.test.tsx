import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home';
import { mockApi, render, screen } from './helpers';

describe('Home page', () => {
    it('renders the hero, how-it-works steps and CTAs', () => {
        mockApi({});
        render(
            <MemoryRouter>
                <Home />
            </MemoryRouter>,
        );

        expect(screen.getByText(/Save together/i)).toBeInTheDocument();
        expect(screen.getByText(/Nigerian savings, rebuilt/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Open your account/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /I already have one/i })).toBeInTheDocument();
        expect(screen.getByText('Create a contribution')).toBeInTheDocument();
        expect(screen.getByText('Pay your way')).toBeInTheDocument();
        expect(screen.getByText('Verify once, trust always')).toBeInTheDocument();
        expect(screen.getByText(/Your first contribution is one minute away\./i)).toBeInTheDocument();
    });
});

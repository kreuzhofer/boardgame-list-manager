import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordScreen } from '../PasswordScreen';

describe('PasswordScreen', () => {
  it('toggles password visibility with an inline icon button', () => {
    render(<PasswordScreen onAuthenticated={vi.fn()} />);

    const passwordInput = screen.getByLabelText('Passwort eingeben') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const showButton = screen.getByRole('button', { name: 'Passwort anzeigen' });
    const showIcon = showButton.querySelector('img') as HTMLImageElement;
    expect(showButton).not.toHaveTextContent('Anzeigen');
    expect(showIcon).toBeTruthy();
    expect(showIcon.src).toContain('/eye-closed.svg');

    fireEvent.click(showButton);
    expect(passwordInput.type).toBe('text');

    const hideButton = screen.getByRole('button', { name: 'Passwort verbergen' });
    const hideIcon = hideButton.querySelector('img') as HTMLImageElement;
    expect(hideButton).not.toHaveTextContent('Verbergen');
    expect(hideIcon).toBeTruthy();
    expect(hideIcon.src).toContain('/eye-open.svg');

    fireEvent.click(hideButton);
    expect(passwordInput.type).toBe('password');
  });
});

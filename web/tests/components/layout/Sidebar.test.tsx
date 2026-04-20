import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/authStore';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>
  );

describe('Sidebar', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('renders the three default sections', () => {
    renderAt('/dashboard');
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Connect')).toBeInTheDocument();
    expect(screen.getByText('Intelligence')).toBeInTheDocument();
  });

  it('renders the Home nav row', () => {
    renderAt('/dashboard');
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('marks the Home row as active when on /dashboard', () => {
    renderAt('/dashboard');
    const row = screen.getByText('Home').closest('a')!;
    expect(row.className).toContain('bg-blue-soft');
  });

  it('marks the Connections row as active when on /connections', () => {
    renderAt('/connections');
    const row = screen.getByText('Connections').closest('a')!;
    expect(row.className).toContain('bg-blue-soft');
  });

  it('renders Settings in the footer', () => {
    renderAt('/settings');
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows the user row when authenticated', () => {
    useAuthStore.setState({
      user: {
        id: 'u_1',
        email: 'jane@example.com',
        name: 'Jane Doe',
        role: 'owner',
        is_active: true,
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    renderAt('/dashboard');
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Log out')).toBeInTheDocument();
  });

  it('does not render the user row when unauthenticated', () => {
    renderAt('/dashboard');
    expect(screen.queryByLabelText('Log out')).toBeNull();
  });
});

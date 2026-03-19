import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import {
  EmptyState,
  NoWorkflowsEmptyState,
  NoConnectionsEmptyState,
  NoSearchResultsEmptyState,
} from '@/components/shared/EmptyState';
import { FolderOpen } from 'lucide-react';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('EmptyState', () => {
  describe('rendering', () => {
    it('should render title', () => {
      renderWithRouter(
        <EmptyState title="No items" description="There are no items to display" />
      );

      expect(screen.getByText('No items')).toBeInTheDocument();
    });

    it('should render description', () => {
      renderWithRouter(
        <EmptyState title="No items" description="There are no items to display" />
      );

      expect(screen.getByText('There are no items to display')).toBeInTheDocument();
    });

    it('should render icon when provided', () => {
      renderWithRouter(
        <EmptyState
          title="No items"
          description="Description"
          icon={<FolderOpen data-testid="empty-icon" />}
        />
      );

      expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
    });

    it('should not render icon container when icon is not provided', () => {
      renderWithRouter(
        <EmptyState title="No items" description="Description" />
      );

      // Icon container should not exist
      const iconContainer = document.querySelector('.rounded-full.bg-slate-100');
      expect(iconContainer).not.toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('should render with default size (md)', () => {
      const { container } = renderWithRouter(
        <EmptyState title="Title" description="Description" />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('py-12');
    });

    it('should render with sm size', () => {
      const { container } = renderWithRouter(
        <EmptyState title="Title" description="Description" size="sm" />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('py-8');
    });

    it('should render with lg size', () => {
      const { container } = renderWithRouter(
        <EmptyState title="Title" description="Description" size="lg" />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('py-16');
    });

    it('should apply correct icon size for sm', () => {
      renderWithRouter(
        <EmptyState
          title="Title"
          description="Description"
          size="sm"
          icon={<FolderOpen />}
        />
      );

      const iconContainer = document.querySelector('.rounded-full.bg-slate-100');
      expect(iconContainer).toHaveClass('w-12', 'h-12');
    });

    it('should apply correct icon size for lg', () => {
      renderWithRouter(
        <EmptyState
          title="Title"
          description="Description"
          size="lg"
          icon={<FolderOpen />}
        />
      );

      const iconContainer = document.querySelector('.rounded-full.bg-slate-100');
      expect(iconContainer).toHaveClass('w-20', 'h-20');
    });
  });

  describe('actions', () => {
    it('should render primary action button', () => {
      const onClick = vi.fn();
      renderWithRouter(
        <EmptyState
          title="Title"
          description="Description"
          action={{ label: 'Add Item', onClick }}
        />
      );

      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
    });

    it('should call action onClick when clicked', () => {
      const onClick = vi.fn();
      renderWithRouter(
        <EmptyState
          title="Title"
          description="Description"
          action={{ label: 'Add Item', onClick }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should render secondary action button', () => {
      const secondaryOnClick = vi.fn();
      renderWithRouter(
        <EmptyState
          title="Title"
          description="Description"
          secondaryAction={{ label: 'Learn More', onClick: secondaryOnClick }}
        />
      );

      expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument();
    });

    it('should render both primary and secondary actions', () => {
      const primaryOnClick = vi.fn();
      const secondaryOnClick = vi.fn();
      renderWithRouter(
        <EmptyState
          title="Title"
          description="Description"
          action={{ label: 'Primary', onClick: primaryOnClick }}
          secondaryAction={{ label: 'Secondary', onClick: secondaryOnClick }}
        />
      );

      expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
    });

    it('should apply custom variant to action button', () => {
      const onClick = vi.fn();
      renderWithRouter(
        <EmptyState
          title="Title"
          description="Description"
          action={{ label: 'Secondary Action', onClick, variant: 'secondary' }}
        />
      );

      const button = screen.getByRole('button', { name: 'Secondary Action' });
      expect(button).toHaveClass('btn-secondary');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = renderWithRouter(
        <EmptyState
          title="Title"
          description="Description"
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('NoWorkflowsEmptyState', () => {
  it('should render correct title', () => {
    renderWithRouter(
      <NoWorkflowsEmptyState onCreateWorkflow={vi.fn()} />
    );

    expect(screen.getByText('No workflows yet')).toBeInTheDocument();
  });

  it('should render correct description', () => {
    renderWithRouter(
      <NoWorkflowsEmptyState onCreateWorkflow={vi.fn()} />
    );

    expect(
      screen.getByText(/Create your first automated workflow/i)
    ).toBeInTheDocument();
  });

  it('should call onCreateWorkflow when primary button is clicked', () => {
    const onCreateWorkflow = vi.fn();
    renderWithRouter(
      <NoWorkflowsEmptyState onCreateWorkflow={onCreateWorkflow} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create Workflow' }));

    expect(onCreateWorkflow).toHaveBeenCalledTimes(1);
  });

  it('should render Browse Templates button when onBrowseTemplates is provided', () => {
    renderWithRouter(
      <NoWorkflowsEmptyState
        onCreateWorkflow={vi.fn()}
        onBrowseTemplates={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Browse Templates' })).toBeInTheDocument();
  });

  it('should not render Browse Templates button when onBrowseTemplates is not provided', () => {
    renderWithRouter(
      <NoWorkflowsEmptyState onCreateWorkflow={vi.fn()} />
    );

    expect(screen.queryByRole('button', { name: 'Browse Templates' })).not.toBeInTheDocument();
  });

  it('should call onBrowseTemplates when secondary button is clicked', () => {
    const onBrowseTemplates = vi.fn();
    renderWithRouter(
      <NoWorkflowsEmptyState
        onCreateWorkflow={vi.fn()}
        onBrowseTemplates={onBrowseTemplates}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Browse Templates' }));

    expect(onBrowseTemplates).toHaveBeenCalledTimes(1);
  });
});

describe('NoConnectionsEmptyState', () => {
  it('should render correct title', () => {
    renderWithRouter(
      <NoConnectionsEmptyState onAddConnection={vi.fn()} />
    );

    expect(screen.getByText('No connections configured')).toBeInTheDocument();
  });

  it('should render correct description', () => {
    renderWithRouter(
      <NoConnectionsEmptyState onAddConnection={vi.fn()} />
    );

    expect(
      screen.getByText(/Connect to your data sources/i)
    ).toBeInTheDocument();
  });

  it('should call onAddConnection when button is clicked', () => {
    const onAddConnection = vi.fn();
    renderWithRouter(
      <NoConnectionsEmptyState onAddConnection={onAddConnection} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Connection' }));

    expect(onAddConnection).toHaveBeenCalledTimes(1);
  });
});

describe('NoSearchResultsEmptyState', () => {
  it('should render correct title', () => {
    renderWithRouter(
      <NoSearchResultsEmptyState searchTerm="test" onClearSearch={vi.fn()} />
    );

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('should render description with search term', () => {
    renderWithRouter(
      <NoSearchResultsEmptyState searchTerm="workflow-123" onClearSearch={vi.fn()} />
    );

    expect(
      screen.getByText(/No items match "workflow-123"/i)
    ).toBeInTheDocument();
  });

  it('should call onClearSearch when button is clicked', () => {
    const onClearSearch = vi.fn();
    renderWithRouter(
      <NoSearchResultsEmptyState searchTerm="test" onClearSearch={onClearSearch} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));

    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it('should use sm size', () => {
    const { container } = renderWithRouter(
      <NoSearchResultsEmptyState searchTerm="test" onClearSearch={vi.fn()} />
    );

    // NoSearchResultsEmptyState uses size="sm"
    expect(container.querySelector('.py-8')).toBeInTheDocument();
  });
});

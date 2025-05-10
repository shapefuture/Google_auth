import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectSettingsModal } from './project-settings-modal';
import { validateProjectId } from '@/lib/project-utils';

// Mock the project-utils module
jest.mock('@/lib/project-utils', () => ({
  validateProjectId: jest.fn(),
}));

// Mock the use-toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

describe('ProjectSettingsModal', () => {
  const mockSetUserProject = jest.fn();
  const defaultProps = {
    userProject: null,
    setUserProject: mockSetUserProject,
    open: true,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (validateProjectId as jest.Mock).mockResolvedValue({
      valid: true,
      message: 'Project validated successfully',
    });
  });

  it('renders correctly when no project is linked', () => {
    render(<ProjectSettingsModal {...defaultProps} />);
    
    expect(screen.getByText('Google Cloud Project Settings')).toBeInTheDocument();
    expect(screen.getByText('Link your Google Cloud Project to use the Gemini API with your own quota and billing.')).toBeInTheDocument();
    expect(screen.getByLabelText('Google Cloud Project ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /validate & save/i })).toBeInTheDocument();
    expect(screen.queryByText('Project Linked')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlink project/i })).not.toBeInTheDocument();
  });

  it('renders correctly when a project is linked', () => {
    render(<ProjectSettingsModal {...defaultProps} userProject="test-project-123" />);
    
    expect(screen.getByText('Project Linked')).toBeInTheDocument();
    expect(screen.getByText('Currently using project: test-project-123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unlink project/i })).toBeInTheDocument();
  });

  it('validates and saves the project ID when the Validate & Save button is clicked', async () => {
    render(<ProjectSettingsModal {...defaultProps} />);
    
    const input = screen.getByLabelText('Google Cloud Project ID');
    fireEvent.change(input, { target: { value: 'test-project-123' } });
    
    const validateButton = screen.getByRole('button', { name: /validate & save/i });
    fireEvent.click(validateButton);
    
    expect(validateProjectId).toHaveBeenCalledWith('test-project-123');
    
    await waitFor(() => {
      expect(mockSetUserProject).toHaveBeenCalledWith('test-project-123');
    });
  });

  it('shows error message when project validation fails', async () => {
    (validateProjectId as jest.Mock).mockResolvedValue({
      valid: false,
      message: 'Invalid Project ID',
      details: ['Project IDs must be 6-30 characters'],
    });
    
    render(<ProjectSettingsModal {...defaultProps} />);
    
    const input = screen.getByLabelText('Google Cloud Project ID');
    fireEvent.change(input, { target: { value: 'bad' } });
    
    const validateButton = screen.getByRole('button', { name: /validate & save/i });
    fireEvent.click(validateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid Project ID')).toBeInTheDocument();
      expect(screen.getByText('Project IDs must be 6-30 characters')).toBeInTheDocument();
      expect(mockSetUserProject).not.toHaveBeenCalled();
    });
  });

  it('clears the project when the Unlink Project button is clicked', () => {
    render(<ProjectSettingsModal {...defaultProps} userProject="test-project-123" />);
    
    const unlinkButton = screen.getByRole('button', { name: /unlink project/i });
    fireEvent.click(unlinkButton);
    
    expect(mockSetUserProject).toHaveBeenCalledWith(null);
  });
});
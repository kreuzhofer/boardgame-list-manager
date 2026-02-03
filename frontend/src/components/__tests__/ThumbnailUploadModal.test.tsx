import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThumbnailUploadModal } from '../ThumbnailUploadModal';

// Mock the API client
vi.mock('../../api/client', () => ({
  thumbnailsApi: {
    upload: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

import { thumbnailsApi, ApiError } from '../../api/client';

/**
 * Unit tests for ThumbnailUploadModal component
 * Validates: Requirements 7.1, 7.2, 7.3, 7.7
 */
describe('ThumbnailUploadModal', () => {
  const defaultProps = {
    gameId: 'test-game-id',
    gameName: 'Test Game',
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    userId: 'test-user-id',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(<ThumbnailUploadModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Bild hochladen')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      expect(screen.getByText('Bild hochladen')).toBeInTheDocument();
    });

    it('displays game name in modal body', () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      expect(screen.getByText(/Test Game/)).toBeInTheDocument();
    });

    it('displays file input with correct accept types (Requirement 7.1)', () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      const input = document.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
    });

    it('displays allowed formats info', () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      expect(screen.getByText(/Erlaubte Formate: JPEG, PNG, WebP, GIF/)).toBeInTheDocument();
    });
  });

  describe('file selection', () => {
    it('shows file name after selection', async () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      });
    });

    it('shows file size after selection', async () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      const file = new File(['test content'], 'test-image.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText(/Dateigröße:/)).toBeInTheDocument();
      });
    });

    it('shows warning for files larger than 5 MB (Requirement 7.3)', async () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      // Create a file larger than 5 MB
      const largeContent = new Array(6 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large-image.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText(/Datei zu groß/)).toBeInTheDocument();
      });
    });

    it('shows error for invalid file type', async () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText(/Ungültiger Dateityp/)).toBeInTheDocument();
      });
    });
  });

  describe('cancel button (Requirement 7.7)', () => {
    it('calls onClose when cancel button is clicked', () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Abbrechen'));
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Schließen'));
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('upload button', () => {
    it('is disabled when no file is selected', () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      const uploadButton = screen.getByText('Hochladen');
      expect(uploadButton).toBeDisabled();
    });

    it('is disabled when file is too large', async () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      const largeContent = new Array(6 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large-image.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        const uploadButton = screen.getByText('Hochladen');
        expect(uploadButton).toBeDisabled();
      });
    });

    it('is enabled when valid file is selected', async () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        const uploadButton = screen.getByText('Hochladen');
        expect(uploadButton).not.toBeDisabled();
      });
    });
  });

  describe('upload flow', () => {
    it('calls API and onSuccess on successful upload', async () => {
      (thumbnailsApi.upload as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Hochladen')).not.toBeDisabled();
      });
      
      fireEvent.click(screen.getByText('Hochladen'));
      
      await waitFor(() => {
        expect(thumbnailsApi.upload).toHaveBeenCalledWith(
          'test-game-id',
          expect.any(File),
          'test-user-id'
        );
        expect(defaultProps.onSuccess).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('shows error message on upload failure', async () => {
      (thumbnailsApi.upload as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ApiError('Bildverarbeitung fehlgeschlagen.', 'PROCESSING_ERROR')
      );
      
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Hochladen')).not.toBeDisabled();
      });
      
      fireEvent.click(screen.getByText('Hochladen'));
      
      await waitFor(() => {
        expect(screen.getByText('Bildverarbeitung fehlgeschlagen.')).toBeInTheDocument();
      });
    });

    it('shows loading state during upload (Requirement 7.4)', async () => {
      let resolveUpload: () => void;
      const uploadPromise = new Promise<{ success: boolean }>((resolve) => {
        resolveUpload = () => resolve({ success: true });
      });
      (thumbnailsApi.upload as ReturnType<typeof vi.fn>).mockReturnValue(uploadPromise);
      
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Hochladen')).not.toBeDisabled();
      });
      
      fireEvent.click(screen.getByText('Hochladen'));
      
      await waitFor(() => {
        expect(screen.getByText('Hochladen...')).toBeInTheDocument();
      });
      
      resolveUpload!();
    });
  });

  describe('touch targets', () => {
    it('has minimum 44px touch targets for buttons', () => {
      render(<ThumbnailUploadModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('Abbrechen');
      const uploadButton = screen.getByText('Hochladen');
      const closeButton = screen.getByLabelText('Schließen');
      
      expect(cancelButton).toHaveClass('min-h-[44px]');
      expect(uploadButton).toHaveClass('min-h-[44px]');
      expect(closeButton).toHaveClass('min-h-[44px]');
    });
  });
});

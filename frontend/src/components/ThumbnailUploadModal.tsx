/**
 * ThumbnailUploadModal component
 * Modal for uploading custom thumbnails for non-BGG games
 * Uses createPortal for proper modal rendering
 * All UI text in German
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { thumbnailsApi, ApiError } from '../api/client';

interface ThumbnailUploadModalProps {
  gameId: string;
  gameName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ThumbnailUploadModal({
  gameId,
  gameName,
  isOpen,
  onClose,
  onSuccess,
  userId,
}: ThumbnailUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);

    if (!file) {
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Ungültiger Dateityp. Erlaubt: JPEG, PNG, WebP, GIF.');
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      await thumbnailsApi.upload(gameId, selectedFile, userId);
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
      }
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, gameId, userId, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    if (isUploading) return;
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    onClose();
  }, [isUploading, onClose]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isFileTooLarge = selectedFile ? selectedFile.size > MAX_FILE_SIZE : false;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Bild hochladen</h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Schließen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <p className="text-gray-700 mb-4">
            Wähle ein Bild für <strong>"{gameName}"</strong>
          </p>

          {/* File input */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
              id="thumbnail-upload"
            />
            <label
              htmlFor="thumbnail-upload"
              className="block w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors min-h-[44px]"
            >
              <span className="text-gray-600">
                {selectedFile ? selectedFile.name : 'Klicke hier um ein Bild auszuwählen'}
              </span>
            </label>
          </div>

          {/* Preview */}
          {preview && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Vorschau:</p>
              <div className="flex justify-center">
                <img
                  src={preview}
                  alt="Vorschau"
                  className="max-w-full max-h-48 rounded border border-gray-200"
                />
              </div>
            </div>
          )}

          {/* File size info */}
          {selectedFile && (
            <div className={`text-sm mb-4 ${isFileTooLarge ? 'text-red-600' : 'text-gray-500'}`}>
              Dateigröße: {formatFileSize(selectedFile.size)}
              {isFileTooLarge && (
                <span className="block mt-1 font-medium">
                  ⚠️ Datei zu groß. Maximal 5 MB erlaubt.
                </span>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-4">
              {error}
            </div>
          )}

          {/* Allowed formats info */}
          <p className="text-xs text-gray-400">
            Erlaubte Formate: JPEG, PNG, WebP, GIF (max. 5 MB)
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 min-h-[44px]"
          >
            Abbrechen
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || !selectedFile || isFileTooLarge}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Hochladen...
              </>
            ) : (
              'Hochladen'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ThumbnailUploadModal;

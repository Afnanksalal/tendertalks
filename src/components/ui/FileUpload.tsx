import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Image, Video, Music } from 'lucide-react';

interface FileUploadProps {
  accept?: Record<string, string[]>;
  maxSize?: number;
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  preview?: string;
  label?: string;
  helperText?: string;
  error?: string;
  type?: 'image' | 'video' | 'audio' | 'any';
}

const typeConfig = {
  image: {
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    icon: Image,
    text: 'Drop image here or click to upload',
  },
  video: {
    accept: { 'video/*': ['.mp4', '.webm', '.mov'] },
    icon: Video,
    text: 'Drop video here or click to upload',
  },
  audio: {
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'] },
    icon: Music,
    text: 'Drop audio file here or click to upload',
  },
  any: {
    accept: {},
    icon: File,
    text: 'Drop file here or click to upload',
  },
};

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  maxSize = 100 * 1024 * 1024, // 100MB default
  onFileSelect,
  onFileRemove,
  preview,
  label,
  helperText,
  error,
  type = 'any',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const config = typeConfig[type];

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: accept || config.accept,
    maxSize,
    multiple: false,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    onFileRemove?.();
  };

  const Icon = config.icon;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive ? 'border-neon-cyan bg-neon-cyan/10' : 'border-white/20 hover:border-white/40'}
          ${error ? 'border-red-500' : ''}
        `}
      >
        <input {...getInputProps()} />

        {preview || selectedFile ? (
          <div className="relative">
            {type === 'image' && preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 mx-auto rounded-lg object-contain"
              />
            ) : (
              <div className="flex items-center justify-center gap-3 py-4">
                <Icon className="w-8 h-8 text-neon-cyan" />
                <span className="text-white font-medium">
                  {selectedFile?.name || 'File selected'}
                </span>
              </div>
            )}
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="py-4">
            <Upload className="w-10 h-10 mx-auto text-slate-500 mb-3" />
            <p className="text-slate-400 mb-1">{config.text}</p>
            <p className="text-xs text-slate-500">
              Max size: {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        )}
      </div>

      {fileRejections.length > 0 && (
        <p className="mt-1.5 text-sm text-red-400">
          {fileRejections[0].errors[0].message}
        </p>
      )}
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
};

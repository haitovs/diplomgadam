import { useState, useRef, useCallback } from 'react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label = 'Surat' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Diňe surat faýllary rugsat berilýär');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Faýl ululygy 5MB-dan köp bolmaly däl');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      onChange(data.url);
    } catch {
      setError('Ýüklemek başa barmady');
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }, [upload]);

  return (
    <div>
      <label className="block text-slate-300 mb-1 text-sm">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-colors ${
          dragOver
            ? 'border-orange-400 bg-orange-500/10'
            : 'border-slate-600 hover:border-slate-500 bg-slate-900'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {value ? (
          <div className="relative group">
            <img
              src={value}
              alt="Preview"
              className="w-full h-40 object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600"
              >
                Çalyş
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(''); }}
                className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
              >
                Aýyr
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
            {uploading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Ýüklenýär...</span>
              </div>
            ) : (
              <>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Suraty süýräň ýa-da saýlaň</span>
                <span className="text-xs text-slate-500">JPG, PNG, WebP · Maks 5MB</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* URL input fallback */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ýa-da URL giriziň..."
        className="w-full mt-2 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
      />

      {error && <p className="mt-1 text-red-400 text-xs">{error}</p>}
    </div>
  );
}

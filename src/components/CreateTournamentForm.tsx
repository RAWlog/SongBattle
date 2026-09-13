'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { importPlaylist } from '@/app/actions/importPlaylist';
import { importCsv } from '@/app/actions/importCsv';
import { Button } from '@/components/ui/button';

export function CreateTournamentForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await importPlaylist(url);
    
    if (res.success && res.tournamentId) {
      router.push(`/tournament/${res.tournamentId}`);
    } else {
      setError(res.error || 'Failed to import playlist');
      setLoading(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    const res = await importCsv(formData);

    if (res.success && res.tournamentId) {
      router.push(`/tournament/${res.tournamentId}`);
    } else {
      setError(res.error || 'Failed to import CSV');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleUrlImport} className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2 text-zinc-300">Fast Import (Max 100 tracks)</p>
          <input
            type="url"
            placeholder="Spotify Playlist URL"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-3 rounded-md bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <Button 
          type="submit" 
          variant="default"
          className="w-full font-bold h-12"
          disabled={loading}
        >
          {loading ? 'IMPORTING...' : 'IMPORT URL'}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-900 px-2 text-zinc-500 font-bold">Or</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1 text-zinc-300">Unlimited Tracks Import</p>
          <p className="text-xs text-zinc-500 mb-3">
            Export your playlist to CSV using <a href="https://exportify.net/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">Exportify</a> and upload it here.
          </p>
        </div>
        <input 
          type="file" 
          accept=".csv" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleCsvUpload}
        />
        <Button 
          type="button" 
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full font-bold h-12 border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800 hover:text-white"
          disabled={loading}
        >
          {loading ? 'UPLOADING...' : 'UPLOAD CSV FILE'}
        </Button>
      </div>

      {error && <p className="text-red-400 text-sm text-center font-medium bg-red-950/50 p-2 rounded">{error}</p>}
    </div>
  );
}

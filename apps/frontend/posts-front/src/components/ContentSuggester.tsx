'use client';
import { useState } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

interface Suggestion { title: string; content: string; hashtags: string[]; }

interface Props { brandName: string; network: string; onSelect: (content: string) => void; }

export function ContentSuggester({ brandName, network, onSelect }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ai/suggest-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, network, topic: 'contenido general', tone: 'profesional' }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      if (data.error) setError(data.error);
    } catch {
      setError('Sugerencias no disponibles temporalmente');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <Button onClick={suggest} disabled={loading} variant="outlined" size="small">
        {loading ? <CircularProgress size={16} /> : '✨ Sugerir contenido con IA'}
      </Button>
      {error && <Typography variant="caption" color="error">{error}</Typography>}
      {suggestions.map((s, i) => (
        <Card key={i} sx={{ mt: 1, cursor: 'pointer' }} onClick={() => onSelect(s.content)}>
          <CardContent>
            <Typography variant="subtitle2">{s.title}</Typography>
            <Typography variant="body2" color="text.secondary">{s.content}</Typography>
            <Typography variant="caption">{s.hashtags.join(' ')}</Typography>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

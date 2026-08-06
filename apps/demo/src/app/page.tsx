'use client';
import { useState } from 'react';

export default function Home() {
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch('/api/generate', { method: 'POST' });
    if (res.status === 402) {
      alert('x402 Payment Required! Freighter wallet should intercept here.');
      // In a real integration, the x402 client-side interceptor handles this automatically
      setLoading(false);
      return;
    }
    const data = await res.json();
    setImage(data.url);
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8">AI Image Generator</h1>
      <button 
        onClick={generate} 
        disabled={loading}
        className="px-6 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Image (5 XLM)'}
      </button>
      {image && <img src={image} alt="Generated AI" className="mt-8 rounded-xl max-w-md shadow-2xl" />}
    </div>
  );
}

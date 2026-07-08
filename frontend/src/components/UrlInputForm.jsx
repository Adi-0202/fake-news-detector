import { useState, useRef } from 'react';
import { API_BASE_URL } from '../config';

const TABS = [
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: 'pdf',
    label: 'PDF',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
      </svg>
    ),
  },
  {
    id: 'image',
    label: 'Image',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
];

// ── RECTIFIED: Destructured onAuthFailure callback hook from system context props ──
export default function UrlInputForm({ onResult, token, onAuthFailure }) {
  const [activeTab, setActiveTab] = useState('text');
  const [text, setText] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pdfRef = useRef(null);
  const imageRef = useRef(null);

  const reset = () => {
    setText(''); setPdfFile(null); setImageFile(null);
    if (pdfRef.current) pdfRef.current.value = '';
    if (imageRef.current) imageRef.current.value = '';
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    let endpoint = `${API_BASE_URL}/analyze`;
    let options = {};
    let sourceLabel = '';

    try {
      if (activeTab === 'text') {
        if (!text.trim()) { setError('Please enter some text.'); setLoading(false); return; }
        sourceLabel = 'Raw Text Entry';
        
        options = {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ 
            url: '', 
            text: text.trim() 
          }),
        };
      } else if (activeTab === 'pdf') {
        if (!pdfFile) { setError('Please select a PDF file.'); setLoading(false); return; }
        endpoint = `${API_BASE_URL}/analyze/pdf`;
        sourceLabel = `PDF: ${pdfFile.name}`;
        
        const fd = new FormData(); 
        fd.append('file', pdfFile);
        
        options = { 
          method: 'POST', 
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd 
        };
      } else if (activeTab === 'image') {
        if (!imageFile) { setError('Please select an image.'); setLoading(false); return; }
        endpoint = `${API_BASE_URL}/analyze/image`;
        sourceLabel = `Image: ${imageFile.name}`;
        
        const fd = new FormData(); 
        fd.append('file', imageFile);
        
        options = { 
          method: 'POST', 
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd 
        };
      }

      const res = await fetch(endpoint, options);
      
      // ── RECTIFIED: Intercept background token expiration events instantly ──
      if (res.status === 401) {
        if (onAuthFailure) {
          onAuthFailure();
        }
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("FastAPI Validation Failure Details:", errorData);
        
        if (errorData.detail && Array.isArray(errorData.detail)) {
          throw new Error(`Validation Error: ${errorData.detail[0].msg}`);
        }
        throw new Error(errorData.detail || `Server error: ${res.status}`);
      }
      
      const data = await res.json();

      onResult({
        id: Date.now(),
        title: data.title || 'Analysis Report',
        overall_verdict: data.overall_verdict || 'UNVERIFIED',
        overall_explanation: data.overall_explanation || 'No explanation returned.',
        claims: data.claims || [],
        url: data.source_url || sourceLabel,
        timestamp: new Date().toLocaleString(),
      });

      reset();
    } catch (err) {
      setError(err.message || 'Connection failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(t.id); setError(''); }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      /* Input box */
      <div className="input-box">

        {/* Text */}
        {activeTab === 'text' && (
          <>
            <textarea
              className="fi"
              rows={6}
              placeholder="Paste claim, headline, or article text…"
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <button className="sub-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? <><span className="spinner" /> Processing…</> : <><RunIcon /> Analyze Text</>}
            </button>
          </>
        )}

        {/* PDF */}
        {activeTab === 'pdf' && (
          <>
            <div className="dropzone">
              <input ref={pdfRef} type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
              <div className="dz-icon"><FileIcon size={16} /></div>
              {pdfFile
                ? <div className="dz-chosen">↳ {pdfFile.name}</div>
                : <><div className="dz-lbl">Drop PDF here</div><div className="dz-sub">or click · .pdf only</div></>
              }
            </div>
            <button className="sub-btn" onClick={handleSubmit} disabled={loading || !pdfFile}>
              {loading ? <><span className="spinner" /> Parsing…</> : <><RunIcon /> Analyze PDF</>}
            </button>
          </>
        )}

        {/* Image */}
        {activeTab === 'image' && (
          <>
            <div className="dropzone">
              <input ref={imageRef} type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
              <div className="dz-icon"><ImageIcon size={16} /></div>
              {imageFile
                ? <div className="dz-chosen">↳ {imageFile.name}</div>
                : <><div className="dz-lbl">Upload screenshot or image</div><div className="dz-sub">PNG, JPG, WEBP</div></>
              }
            </div>
            <button className="sub-btn" onClick={handleSubmit} disabled={loading || !imageFile}>
              {loading ? <><span className="spinner" /> Running OCR…</> : <><RunIcon /> Extract &amp; Verify</>}
            </button>
          </>
        )}

        {error && (
          <div className="err-bar">
            <WarnIcon /> {error}
          </div>
        )}
      </div>
    </>
  );
}

function RunIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  );
}

function FileIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

function ImageIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
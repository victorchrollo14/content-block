import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useQuotes, useBlockedSites, useImages } from '../lib/data';
import { insforge } from '../lib/insforge';
import './Dashboard.css';

type Tab = 'quotes' | 'sites' | 'images' | 'settings';

export function Dashboard() {
  const [tab, setTab] = useState<Tab>('quotes');
  const { user, signOut } = useAuth();
  const quotes = useQuotes();
  const sites = useBlockedSites();
  const images = useImages();

  const copyToken = async () => {
    const { data } = await insforge.auth.getCurrentSession();
    if (data?.session?.accessToken) {
      await navigator.clipboard.writeText(data.session.accessToken);
      alert('Token copied! Paste it in the extension popup.');
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Kaizen</h1>
        <div className="header-right">
          <button onClick={copyToken} className="token-btn">Copy Token</button>
          <span className="user-email">{user?.email}</span>
          <button onClick={signOut} className="logout-btn">Sign Out</button>
        </div>
      </header>

      <nav className="dashboard-tabs">
        <button className={tab === 'quotes' ? 'active' : ''} onClick={() => setTab('quotes')}>
          Quotes
        </button>
        <button className={tab === 'sites' ? 'active' : ''} onClick={() => setTab('sites')}>
          Blocked Sites
        </button>
        <button className={tab === 'images' ? 'active' : ''} onClick={() => setTab('images')}>
          Images
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          Extension
        </button>
      </nav>

      <main className="dashboard-content">
        {tab === 'quotes' && <QuotesTab {...quotes} />}
        {tab === 'sites' && <SitesTab {...sites} />}
        {tab === 'images' && <ImagesTab {...images} />}
        {tab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

function QuotesTab({ quotes, loading, addQuote, deleteQuote, toggleQuote }: ReturnType<typeof useQuotes>) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      addQuote(input.trim());
      setInput('');
    }
  };

  return (
    <div className="tab-panel">
      <div className="add-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Enter a motivational quote..."
        />
        <button onClick={handleAdd}>Add Quote</button>
      </div>

      {loading ? <p>Loading...</p> : (
        <ul className="item-list">
          {quotes.length === 0 ? <li className="empty">No quotes yet. Add one above.</li> : quotes.map(q => (
            <li key={q.id} className={!q.is_active ? 'inactive' : ''}>
              <span>{q.text}</span>
              <div className="actions">
                <button onClick={() => toggleQuote(q.id, !q.is_active)}>
                  {q.is_active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => deleteQuote(q.id)} className="delete">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SitesTab({ sites, loading, addSite, deleteSite, toggleSite }: ReturnType<typeof useBlockedSites>) {
  const [domain, setDomain] = useState('');
  const [blockType, setBlockType] = useState('full');
  const [limit, setLimit] = useState<string>('30');

  const handleAdd = () => {
    if (domain.trim()) {
      addSite(domain.trim(), blockType, parseInt(limit) || 30);
      setDomain('');
    }
  };

  return (
    <div className="tab-panel">
      <div className="add-row site-add">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="domain.com"
        />
        <select value={blockType} onChange={(e) => setBlockType(e.target.value)}>
          <option value="full">Full Block</option>
          <option value="limited">Time Limited</option>
        </select>
        {blockType === 'limited' && (
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            min="1"
            placeholder="Seconds"
          />
        )}
        <button onClick={handleAdd}>Add Site</button>
      </div>

      {loading ? <p>Loading...</p> : (
        <ul className="item-list">
          {sites.length === 0 ? <li className="empty">No sites blocked. Add one above.</li> : sites.map(s => (
            <li key={s.id} className={!s.is_active ? 'inactive' : ''}>
              <div className="site-info">
                <span className="domain">{s.domain}</span>
                <span className="site-type">{s.block_type === 'full' ? 'Full Block' : `${s.limit_seconds}s limit`}</span>
              </div>
              <div className="actions">
                <button onClick={() => toggleSite(s.id, !s.is_active)}>
                  {s.is_active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => deleteSite(s.id)} className="delete">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ImagesTab({ images, loading, addImage, deleteImage, toggleImage }: ReturnType<typeof useImages>) {
  const [url, setUrl] = useState('');

  const handleAdd = () => {
    if (url.trim() && url.startsWith('http')) {
      addImage(url.trim());
      setUrl('');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data } = await insforge.storage.from('kaizen-images').uploadAuto(file);
    if (data?.url) {
      addImage(data.url, data.key);
    }
  };

  return (
    <div className="tab-panel">
      <div className="add-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="https://...jpg"
        />
        <button onClick={handleAdd}>Add URL</button>
        <label className="upload-label">
          Upload
          <input type="file" accept="image/*" onChange={handleUpload} hidden />
        </label>
      </div>

      {loading ? <p>Loading...</p> : (
        <div className="images-grid">
          {images.length === 0 ? <p className="empty">No images yet. Add one above.</p> : images.map(img => (
            <div key={img.id} className={`image-card ${!img.is_active ? 'inactive' : ''}`}>
              <img src={img.url} alt="Motivation" />
              <div className="image-actions">
                <button onClick={() => toggleImage(img.id, !img.is_active)}>
                  {img.is_active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => deleteImage(img.id)} className="delete">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const copyToken = async () => {
    const { data } = await insforge.auth.getCurrentSession();
    if (data?.session?.accessToken) {
      await navigator.clipboard.writeText(data.session.accessToken);
      alert('Token copied to clipboard!');
    }
  };

  return (
    <div className="tab-panel">
      <h2>Chrome Extension Setup</h2>
      <p className="settings-desc">
        To use Kaizen with the Chrome extension, you need to copy your auth token and paste it in the extension popup.
      </p>
      
      <div className="token-section">
        <button onClick={copyToken} className="token-copy-btn">
          Copy Auth Token
        </button>
        <p className="token-hint">
          Then in the Chrome extension popup, click "Paste Token" and paste the token.
        </p>
      </div>

      <div className="instructions">
        <h3>Quick Start:</h3>
        <ol>
          <li>Click "Copy Auth Token" above</li>
          <li>Open the Kaizen extension popup</li>
          <li>Click "Paste Token" and paste your token</li>
          <li>Click "Save Token"</li>
        </ol>
      </div>
    </div>
  );
}

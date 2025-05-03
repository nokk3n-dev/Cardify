import React, { useState, useEffect } from 'react';
import { generateCodeVerifier, generateCodeChallenge } from './utils/pkce';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './App.css';

// Spotify App Settings
const CLIENT_ID = '5afec2d74344467287f560f72d4da518';
const REDIRECT_URI = 'http://127.0.0.1:3000/callback';
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SCOPES = ['user-top-read'];

// UI Options & Helpers
const packs = [
  { label: 'Songs - 1 Month',     type: 'Songs',    time: '1 Month' },
  { label: 'Songs - 6 Months',    type: 'Songs',    time: '6 Months' },
  { label: 'Songs - 1 Year',      type: 'Songs',    time: '1 Year' },
  { label: 'Artists - 1 Month',   type: 'Artists',  time: '1 Month' },
  { label: 'Artists - 6 Months',  type: 'Artists',  time: '6 Months' },
  { label: 'Artists - 1 Year',    type: 'Artists',  time: '1 Year' },
];
const timeMap = {
  '1 Month': 'short_term',
  '6 Months': 'medium_term',
  '1 Year': 'long_term'
};

function App() {
  // Authorization & Data State
  const [token, setToken]           = useState(null);
  const [topSongs, setTopSongs]     = useState([]);
  const [topArtists, setTopArtists] = useState([]);

  // UI Flow State
  const [selection, setSelection] = useState(null);
  const [timeRange, setTimeRange] = useState(null);
  const [stage, setStage]         = useState(0);
  const [loading, setLoading]     = useState(false);

  // For Viewing Cards
  const [selectedCard, setSelectedCard] = useState(null);


  useEffect(() => {
    const storedToken = sessionStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      const verifier = sessionStorage.getItem('code_verifier');
      console.log('Exchanging code with verifier:', verifier);
      fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          code_verifier: verifier,
        }),
      })
        .then(res => {
          console.log('Token Exchange Status:', res.status);
          return res.json();
        })
        .then(data => {
          console.log('Token exchange payload:', data);
          if (data.access_token) {
            sessionStorage.setItem('access_token', data.access_token);
            setToken(data.access_token);
            window.history.replaceState({}, '', '/callback');
          } else {
            console.error('PKCE token exchange failed:', data.error, data.error_description);
          }
        })
        .catch(err => console.error('Network/token error:', err));
    } else {
      const codeVerifier = generateCodeVerifier();
      generateCodeChallenge(codeVerifier).then(codeChallenge => {
        sessionStorage.setItem('code_verifier', codeVerifier);
        const authUrl = `${AUTH_ENDPOINT}?response_type=code&client_id=${encodeURIComponent(CLIENT_ID)}` +
          `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
          `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
          `&code_challenge_method=S256&code_challenge=${encodeURIComponent(codeChallenge)}`;
        window.location.href = authUrl;
      });
    }
  }, []);

  // Fetch Helper Function
  const fetchItems = (type, timeParam) => {
    setLoading(true);
    const url =
      type === 'Songs'
        ? `https://api.spotify.com/v1/me/top/tracks?time_range=${timeParam}&limit=5`
        : `https://api.spotify.com/v1/me/top/artists?time_range=${timeParam}&limit=5`;
  
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(data => {
        if (type === 'Songs') setTopSongs(data.items || []);
        else setTopArtists(data.items || []);
      })
      .catch(err => console.error('Error fetching items:', err))
      .finally(() => setLoading(false));
  };
  

  // UI Handlers
  const handlePackClick = ({ type, time }) => {
    setSelection(type);
    setTimeRange(time);
    setStage(1);
    fetchItems(type, timeMap[time]);
  };

  const handleProgressClick = () => {
    setStage(prev => (prev < 5 ? prev + 1 : 6));
  };

  // Save as png handler
  const downloadAsImage = () => {
    const el = document.getElementById('download-target');
    if (!el) return;
    html2canvas(el, { useCORS: true }).then(canvas => {
      const link = document.createElement('a');
      link.download = `${selectedCard.name}.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  // export as PDF
  const downloadAsPDF = () => {
    const el = document.getElementById('download-target');
    if (!el) return;
    html2canvas(el, { useCORS: true }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('portrait', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${selectedCard.name}.pdf`);
    });
  };

  const renderStartScreen = () => (
    <div className="content">
      <div className="pack-selector">
        {packs.map(p => (
          <button
            key={p.label}
            className="pack-btn-img"
            onClick={() => handlePackClick(p)}
          >
            <img
              src='/blank-pack.png'
              alt={p.label}
              className='pack-img-only'
            />
            <span className="pack-label">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderProgressView = () => {
    //const singular = singularMap[selection];
    const items = selection === 'Songs' ? topSongs : topArtists;

    if (stage <= 5) {
      const item = items[stage - 1];
    
      if (loading || !item) {
        return (
          <div className="content">
            <h2>Loading...</h2>
          </div>
        );
      }
    
      return (
        <div className="content" onClick={handleProgressClick}>
          <div className="track-list">
            <div className="track-card">
              {selection === 'Songs' && (
                <>
                  <div className="track-image-container">
                    <img className="track-image" src={item.album.images[0]?.url} alt={`${item.name} album cover`} />
                  </div>
                  <div className="track-info">
                    <h2>{item.name}</h2>
                    <div className="stats-grid">
                      <p><strong>Artists:</strong> {item.artists.map(artist => artist.name).join(', ')}</p>
                      <p><strong>Album:</strong> {item.album.name}</p>
                      <p><strong>Release Date:</strong> {item.album.release_date}</p>
                      <p><strong>Popularity:</strong> {item.popularity}</p>
                    </div>
                  </div>
                </>
              )}
              {selection === 'Artists' && (
                <>
                  <div className="track-image-container">
                    <img
                      src={item.images[0]?.url}
                      alt={`${item.name} artist portrait`}
                      className="track-image"
                    />
                  </div>
                  <div className="track-info">
                    <h2>{item.name}</h2>
                    <div className="stats-grid">
                      <p><strong>Genres:</strong> {item.genres.join(', ')}</p>
                      <p><strong>Popularity:</strong> {item.popularity}</p>
                      <p><strong>Followers:</strong> {item.followers.total.toLocaleString()}</p>
                      <p>
                        <strong>Spotify:</strong>
                        <a href={item.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                          View Profile
                        </a>
                      </p>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      );
    }
    

    // Stage 6: Show all the Cards
    return (
      <div className="content">
        <div className="track-list">
          {(items || []).map(i => (
            <div key={i.id} className="track-card" onClick={() => setSelectedCard(i)}>
              {selection === 'Songs' && (
                <>
                  <div className="track-image-container">
                    <img
                      src={i.album.images[0]?.url}
                      alt={`${i.name} album cover`}
                      className="track-image"
                    />
                  </div>
                  <div className="track-info">
                    <h2>{i.name}</h2>
                    <div className="stats-grid">
                      <p><strong>Artists:</strong> {i.artists.map(artist => artist.name).join(', ')}</p>
                      <p><strong>Album:</strong> {i.album.name}</p>
                      <p><strong>Release Date:</strong> {i.album.release_date}</p>
                      <p><strong>Popularity:</strong> {i.popularity}</p>
                    </div>
                  </div>
                </>
              )}
              {selection === 'Artists' && (
                <>
                  <div className="track-image-container">
                    <img
                      src={i.images[0]?.url}
                      alt={`${i.name} artist portrait`}
                      className="track-image"
                    />
                  </div>
                  <div className="track-info">
                    <h2>{i.name}</h2>
                    <div className="stats-grid">
                      <p><strong>Genres:</strong> {i.genres?.join(', ') || 'Unknown'}</p>
                      <p><strong>Popularity:</strong> {i.popularity}</p>
                      <p><strong>Followers:</strong> {i.followers?.total?.toLocaleString() || 'N/A'}</p>
                      <p>
                        <strong>Spotify:</strong>{' '}
                        <a href={i.external_urls?.spotify} target="_blank" rel="noopener noreferrer">
                          View Profile
                        </a>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Download Section */}
        {selectedCard && (
          <div className="card-modal" onClick={() => setSelectedCard(null)}>
            <div
              className="card-modal-content"
              onClick={e => e.stopPropagation()}
            >
              {/* This is the part that will be downloaded */}
              <div className="track-card enlarged" id="download-target">
                <div className="track-image-container">
                  <img
                    crossOrigin="anonymous"
                    className="track-image"
                    src={
                      selection === 'Songs'
                        ? selectedCard.album.images[0]?.url
                        : selectedCard.images[0]?.url
                    }
                    alt={selectedCard.name}
                  />
                </div>
                <div className="track-info">
                  <h2>{selectedCard.name}</h2>
                  <div className="stats-grid">
                    {selection === 'Songs' ? (
                      <>
                        <p>
                          <strong>Artists:</strong>{' '}
                          {selectedCard.artists.map(a => a.name).join(', ')}
                        </p>
                        <p>
                          <strong>Album:</strong> {selectedCard.album.name}
                        </p>
                        <p>
                          <strong>Release Date:</strong>{' '}
                          {selectedCard.album.release_date}
                        </p>
                        <p>
                          <strong>Popularity:</strong> {selectedCard.popularity}
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          <strong>Genres:</strong>{' '}
                          {selectedCard.genres?.join(', ') || 'Unknown'}
                        </p>
                        <p>
                          <strong>Popularity:</strong>{' '}
                          {selectedCard.popularity}
                        </p>
                        <p>
                          <strong>Followers:</strong>{' '}
                          {selectedCard.followers?.total.toLocaleString() ||
                            'N/A'}
                        </p>
                        <p>
                          <strong>Spotify:</strong>{' '}
                          <a
                            href={selectedCard.external_urls.spotify}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Profile
                          </a>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="download-buttons">
                <button onClick={downloadAsImage}>Download as Image</button>
                <button onClick={downloadAsPDF}>Download as PDF</button>
              </div>
            </div>
          </div>
        )}

        {/* Start Over */}
        <div className="button-group">
          <button
            onClick={() => {
              setSelection(null);
              setTimeRange(null);
              setStage(0);
              setTopArtists([]);
              setTopSongs([]);
              setSelectedCard(null);
            }}
          >
            Open Another Pack
          </button>
        </div>
      </div>
    );
  };

  if (!token) {
    return <div>Redirecting to Spotify login...</div>;
  }

  return (
    <>
      <header className="nav-bar">
        
        <a href="https://open.spotify.com/"> <img height="32px" src="/spotify-logo.png" alt="Spotify logo" /></a>
        <h1 className="header-title">Cardify</h1>
      </header>
      <div className="App container">
        {selection ? renderProgressView() : renderStartScreen()}
      </div>
    </>
  );
}

export default App;
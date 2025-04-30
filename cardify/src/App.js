import React, { useState, useEffect } from 'react';
import { generateCodeVerifier, generateCodeChallenge } from './utils/pkce';
import './App.css';

// Spotify App Settings
const CLIENT_ID = '5afec2d74344467287f560f72d4da518';
const REDIRECT_URI = 'http://127.0.0.1:3000/callback';
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SCOPES = ['user-top-read'];

// UI Options & Helpers
const options = ['Songs', 'Artists'];
const timeOptions = ['1 Month', '6 Months', '1 Year'];
const timeMap = {
  '1 Month': 'short_term',
  '6 Months': 'medium_term',
  '1 Year': 'long_term'
};
const singularMap = {
  Songs: 'Song',
  Artists: 'Artist'
};

function App() {
  // Authorization & Data State
  const [token, setToken] = useState(null);
  const [topSongs, setTopSongs] = useState([]);
  const [topArtists, setTopArtists] = useState([]);

  // UI Flow State
  const [selection, setSelection] = useState(null);
  const [stage, setStage] = useState(0);
  const [timeRange, setTimeRange] = useState(timeOptions[0]);
  const [lockedTimeRange, setLockedTimeRange] = useState(timeOptions[0]);

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
    .catch(err => console.error('Error fetching items:', err));
  };

  // UI Handlers
  const handleOptionsClick = option => {
    setSelection(option);
    setStage(1);
    setLockedTimeRange(timeRange);
    fetchItems(option, timeMap[timeRange]);
  };

  const handleProgressClick = () => {
    setStage(prev => (prev < 5 ? prev + 1 : 6));
  };

  const handleSwitchClick = option => {
    setSelection(option);
    setStage(1);
    setLockedTimeRange(timeRange);
    fetchItems(option, timeMap[timeRange]);
  };

  const renderTimeSelector = () => (
    <div className="time-selector">
      {timeOptions.map(t => (
        <button
          key={t}
          onClick={() => setTimeRange(t)}
          className={timeRange === t ? 'active' : ''}
        >
          {t}
        </button>
      ))}
    </div>
  );

  const renderStartScreen = () => (
    <div className="content">
      {renderTimeSelector()}
      <div className="button-group">
        {options.map(opt => (
          <button key={opt} onClick={() => handleOptionsClick(opt)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  const renderProgressView = () => {
    const singular = singularMap[selection];
    const items = selection === 'Songs' ? topSongs : topArtists;

    if (stage <= 5) {
      const item = items[stage - 1];
      return(
        <div className="content" onClick={handleProgressClick}>
          <h2>
            {item
              ? selection === 'Songs'
                ? `${item.name} — ${item.artists[0]?.name}`
                : item.name
              : `${singular} ${stage} ${lockedTimeRange}`}
          </h2>
        </div>
      );
    }

    // Stage 6: Show all the Cards
    return (
      <div className="content">
        <ul>
          {(items || []).map(i => (
            <li key={i.id}>
              {selection === 'Songs'
                ? `${i.name} — ${i.artists[0]?.name}`
                : i.name}
            </li>
          ))}
        </ul>
        {renderTimeSelector()}
        <div className="button-group">
          {options.map(opt => (
            <button key={opt} onClick={() => handleSwitchClick(opt)}>
              {opt}
            </button>
          ))}
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
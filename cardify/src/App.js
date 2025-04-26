/*import { useState } from 'react';
import './App.css';

function App() {
  const options = ['Songs', 'Artists']; // Options left after removing Genres
  const timeOptions = ['1 month', '6 months', '1 year'];
  const singularMap = {
    Songs: 'Song',
    Artists: 'Artist',
  };

  const [selection, setSelection] = useState(null);      // "Songs" or "Artists"
  const [stage, setStage] = useState(0);                  // 0 = start, 1-5 = items, 6 = list view
  const [timeRange, setTimeRange] = useState('1 month');  // Current selected time
  const [lockedTimeRange, setLockedTimeRange] = useState(timeRange); // Fixed per session

  const handleOptionClick = (option) => {
    setSelection(option);
    setStage(1);
    setLockedTimeRange(timeRange); // Lock time when option is chosen
  };

  const handleProgressClick = () => {
    if (stage < 5) {
      setStage(stage + 1);
    } else {
      setStage(6); // Display list
    }
  };

  const handleSwitchClick = (option) => {
    setSelection(option);
    setStage(1); // Reset back to item display
    setLockedTimeRange(timeRange); // Lock time again for new session
  };

  const renderTimeSelector = () => (
    <div className="time-selector">
      {timeOptions.map((time) => (
        <button
          key={time}
          onClick={() => setTimeRange(time)}
          className={timeRange === time ? 'active' : ''}
        >
          {time}
        </button>
      ))}
    </div>
  );

  const renderStartScreen = () => (
    <div className="content">
      {renderTimeSelector()}
      <div className="button-group">
        {options.map((option) => (
          <button key={option} onClick={() => handleOptionClick(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  const renderProgressView = () => {
    const singular = singularMap[selection];

    if (stage <= 5) {
      return (
        <div className="content" onClick={handleProgressClick}>
          <h2>{singular} {stage} {lockedTimeRange}</h2>
        </div>
      );
    } else {
      const items = Array.from({ length: 5 }, (_, i) => `${singular} ${i + 1} ${lockedTimeRange}`);
      const otherOptions = options.filter((opt) => opt !== selection);

      return (
        <div className="content">
          <ul>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {renderTimeSelector()}
          <div className="button-group">
            {options.map((opt) => (
              <button key={opt} onClick={() => handleSwitchClick(opt)}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="container">
      {selection ? renderProgressView() : renderStartScreen()}
    </div>
  );
}

export default App;*/

import React, { useState, useEffect } from 'react';
import { generateCodeVerifier, generateCodeChallenge } from './utils/pkce';
import './App.css';

// Spotify App Settings
const CLIENT_ID = '3a69743648ff49109243f07ab2ec555e';
const REDIRECT_URI = 'http://127.0.0.1:3000/callback';
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SCOPES = ['user-top-read'];

function App() {
  const [token, setToken] = useState(null);
  const [topSongs, setTopSongs] = useState([]);
  const [recSongs, setRecSongs] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [recArtists, setRecArtists] = useState([]);

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

  useEffect(() => {
    if (!token) return;
    console.log('Fetching top tracks with token:', token);

    // Get the top songs
    fetch('https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5&offset=0', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        console.log('Top items status:', res.status);
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(data => {
        console.log('Top items payload:', data);
        setTopSongs(data.items || []);
      })
      .catch(err => {
        console.error('Error fetching top items', err);
        setTopSongs([]);
      });

    // Get the top artists
    fetch('https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=5&offset=0', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        console.log('Top items status:', res.status);
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(data => {
        console.log('Top items payload:', data);
        setTopArtists(data.items || []);
      })
      .catch(err => {
        console.error('Error fetching top items', err);
        setTopArtists([]);
      });
  }, [token]);

  if (!token) {
    return <div>Redirecting to Spotify login...</div>;
  }

  return (
    <div className="App">
      <h1>Your Top Songs (Last Month)</h1>
      {topSongs.length === 0 ? (
        <p>No items found or still loading.</p>
      ) : (
        <ul>
          {topSongs.map(item => (
            // Top Songs
            <li key={item.id}>
              {item.name} — {item.artists[0]?.name || 'Unknown Artist'}
            </li>
          ))}
        </ul>
      )}

      <h1>Your Top Artists (Last Month)</h1>
      {topSongs.length === 0 ? (
        <p>No items found or still loading.</p>
      ) : (
        <ul>
          {topArtists.map(item => (
            // Top Artists
            <li key={item.id}>
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
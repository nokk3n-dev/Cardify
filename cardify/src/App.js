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
    fetch('https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        console.log('Top tracks status:', res.status);
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(data => {
        console.log('Top tracks payload:', data);
        setTopSongs(data.items || []);
      })
      .catch(err => {
        console.error('Error fetching top tracks', err);
        setTopSongs([]);
      });
  }, [token]);

  if (!token) {
    return <div>Redirecting to Spotify login...</div>;
  }

  return (
    <div className="App">
      <h1>Your Top Songs (Last Month)</h1>
      {topSongs.length === 0 ? (
        <p>No tracks found or still loading.</p>
      ) : (
        <ul>
          {topSongs.map(track => (
            <li key={track.id}>
              {track.name} — {track.artists[0]?.name || 'Unknown Artist'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
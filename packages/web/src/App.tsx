import React, { useState, useEffect } from 'react';
import Game from './Game';
import Menu from './Menu';
import Overview from './Overview';

type Screen = 'menu' | 'overview' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameKey, setGameKey] = useState(0);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  if (screen === 'overview') {
    return <Overview onBack={() => setScreen('menu')} />;
  }

  if (screen === 'game') {
    return (
      <Game
        key={gameKey}
        onExit={() => setScreen('menu')}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
      />
    );
  }

  return (
    <Menu
      onStart={() => {
        setGameKey((k) => k + 1);
        setScreen('game');
      }}
      onOverview={() => setScreen('overview')}
      onTutorial={() => console.log('tutorial')}
    />
  );
}

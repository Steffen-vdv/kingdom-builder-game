import React, { useState, useEffect } from 'react';
import Game from './Game';
import Menu from './Menu';
import Overview from './Overview';
import Tutorial from './Tutorial';

enum Screen {
  Menu = 'menu',
  Overview = 'overview',
  Tutorial = 'tutorial',
  Game = 'game',
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.Menu);
  const [gameKey, setGameKey] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  switch (screen) {
    case Screen.Overview:
      return <Overview onBack={() => setScreen(Screen.Menu)} />;
    case Screen.Tutorial:
      return <Tutorial onBack={() => setScreen(Screen.Menu)} />;
    case Screen.Game:
      return (
        <Game
          key={gameKey}
          onExit={() => setScreen(Screen.Menu)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
          devMode={devMode}
        />
      );
    case Screen.Menu:
    default:
      return (
        <Menu
          onStart={() => {
            setDevMode(false);
            setGameKey((k) => k + 1);
            setScreen(Screen.Game);
          }}
          onStartDev={() => {
            setDevMode(true);
            setGameKey((k) => k + 1);
            setScreen(Screen.Game);
          }}
          onOverview={() => setScreen(Screen.Overview)}
          onTutorial={() => setScreen(Screen.Tutorial)}
        />
      );
  }
}

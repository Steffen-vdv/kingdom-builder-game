import React, { useState } from 'react';
import Game from './Game';
import Menu from './Menu';
import Overview from './Overview';

enum Screen {
  Menu = 'menu',
  Overview = 'overview',
  Game = 'game',
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.Menu);

  const navigate = (next: Screen) => setScreen(next);

  if (screen === Screen.Game)
    return <Game onExit={() => navigate(Screen.Menu)} />;
  if (screen === Screen.Overview)
    return <Overview onBack={() => navigate(Screen.Menu)} />;
  return (
    <Menu
      onStart={() => navigate(Screen.Game)}
      onOverview={() => navigate(Screen.Overview)}
    />
  );
}

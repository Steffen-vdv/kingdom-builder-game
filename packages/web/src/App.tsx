import React, { useState } from 'react';
import Game from './Game';
import Menu from './Menu';
import Overview from './Overview';

export enum Screen {
  Menu = 'menu',
  Overview = 'overview',
  Game = 'game',
}

export function navigate(
  setScreen: React.Dispatch<React.SetStateAction<Screen>>,
  next: Screen,
) {
  return () => setScreen(next);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.Menu);

  if (screen === Screen.Game)
    return <Game onExit={navigate(setScreen, Screen.Menu)} />;
  if (screen === Screen.Overview)
    return <Overview onBack={navigate(setScreen, Screen.Menu)} />;
  return (
    <Menu
      onStart={navigate(setScreen, Screen.Game)}
      onOverview={navigate(setScreen, Screen.Overview)}
    />
  );
}

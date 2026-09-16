import GameCanvas from './components/GameCanvas';

export default function App() {
  return (
    <>
      <div className="bg-glow" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />
      <GameCanvas />
    </>
  );
}

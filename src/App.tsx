import { useState } from 'react';
import Title from './components/Title';
import EquationTranscoder from './components/EquationTranscoder';
import Login from './components/Login';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <Login onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <>
      <Title />
      <EquationTranscoder />
    </>
  );
}

export default App;

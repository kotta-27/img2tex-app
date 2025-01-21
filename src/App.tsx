import { useState, useEffect } from "react";
import Title from "./components/Title";
import EquationTranscoder from "./components/EquationTranscoder";
import Login from "./components/Login";
import LogoutButton from "./components/LogoutButton"; // Import LogoutButton
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn");
    if (loggedIn === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div style={{ position: "relative" }}>
      {" "}
      {/* Add a relative container for positioning */}
      <LogoutButton onLogout={handleLogout} /> {/* Add LogoutButton */}
      <Title />
      <EquationTranscoder />
    </div>
  );
}

export default App;

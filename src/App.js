import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        return _jsx(Login, { onSuccess: () => setIsAuthenticated(true) });
    }
    return (_jsxs("div", { style: { position: "relative" }, children: [" ", _jsx(LogoutButton, { onLogout: handleLogout }), " ", _jsx(Title, {}), _jsx(EquationTranscoder, {})] }));
}
export default App;

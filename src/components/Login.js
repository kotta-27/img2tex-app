import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import "../styles/login-style.css";
const Login = ({ onSuccess }) => {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isButtonPushed, setIsButtonPushed] = useState(false);
    const [message, setMessage] = useState("");
    const myId = import.meta.env.VITE_ID;
    const myPassword = import.meta.env.VITE_PASS;
    const handleLogin = () => {
        // For now, hardcoded credentials
        if (isButtonPushed == false) {
            setIsButtonPushed(true);
        }
        if (userId === myId && password === myPassword) {
            setIsAuthenticated(true);
            setMessage("ログイン成功");
            localStorage.setItem("isLoggedIn", "true"); // Add this line
            setTimeout(() => {
                onSuccess();
            }, 1500);
        }
        else {
            setIsAuthenticated(false);
            setMessage("ユーザーIDまたはパスワードが違います");
        }
    };
    return (_jsx("div", { className: "login-wrapper", children: _jsxs("div", { className: "login-container", children: [_jsx("h3", { children: "\u30ED\u30B0\u30A4\u30F3" }), _jsxs("div", { className: "login-input-container", children: [_jsxs("div", { className: "login-id-container", children: [_jsx("div", { className: "login-id-label", children: "user ID:" }), _jsx("input", { className: "login-id-input", type: "text", value: userId, onChange: (e) => setUserId(e.target.value) })] }), _jsxs("div", { className: "login-pass-container", children: [_jsx("label", { className: "login-id-label", children: "Password:" }), _jsx("input", { className: "login-pass-input", type: "password", value: password, onChange: (e) => setPassword(e.target.value) })] })] }), _jsx("div", { className: `message ${isAuthenticated ? "success-message" : "error-message"}`, children: isButtonPushed ? (isAuthenticated ? (_jsxs("div", { children: [_jsx("i", { className: "fa-solid fa-circle-check", style: { color: "#63E6BE" } }), "  " + message] })) : (_jsxs("div", { children: [_jsx("i", { className: "fa-solid fa-circle-exclamation", style: { color: "#FFA07A" } }), "  " + message] }))) : ("") }), _jsx("button", { className: "login-button", onClick: handleLogin, children: "\u30ED\u30B0\u30A4\u30F3" })] }) }));
};
export default Login;

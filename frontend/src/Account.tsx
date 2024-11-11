import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Account.css";
export default function Account() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);
    const navigate = useNavigate()
    const handleLogin = () => {
        axios.post('http://localhost:5000/login', { username, password })
            .then(response => {
                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
                    setAuthError(null);
                    navigate("/board")
                } else {
                    navigate('/');
                    setAuthError(response.data.error);
                }
            })
            .catch(err => {
                console.log(err);
                setAuthError('Login failed')
            });
    };
    const handleRegister = () => {
        axios.post('http://localhost:5000/register', { username, password })
            .then(response => {
                if (response.data.message) {
                    setAuthError(null);
                    setUsername('');
                    setPassword('');
                } else {
                    setAuthError(response.data.error);
                }
            })
            .catch(err => {
                console.log(err);
                setAuthError('Registration failed')
            });
    };
    return (
        <>
            <div className="login-container">
                <h2>Login</h2>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="input-field"
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="input-field"
                />
                <button className="btn" onClick={handleLogin}>Login</button>
                <button className="btn" onClick={handleRegister}>Register</button>
                {authError && <p className="error-message">{authError}</p>}
            </div>
        </>
    );
}
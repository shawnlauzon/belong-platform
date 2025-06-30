import React, { useState } from "react";
import { useAuth } from "@belongnetwork/platform";

function AuthPage() {
  const { currentUser, isAuthenticated, signIn, signOut, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("email", email);
      console.log("password", password);
      console.log("isSignUp", isSignUp);
      if (isSignUp) {
        await signUp({ email, password, firstName });
      } else {
        await signIn({ email, password });
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err: any) {
      setError(err.message || "Sign out failed");
    }
  };

  if (isAuthenticated && currentUser) {
    return (
      <div data-testid="auth-container" data-is-authenticated={isAuthenticated}>
        <h2>Authentication Status</h2>
        <p data-testid="auth-status">Authenticated</p>
        <p data-testid="user-email">Email: {currentUser.email}</p>
        <p data-testid="user-id">ID: {currentUser.id}</p>
        <button onClick={handleSignOut} data-testid="sign-out-button">
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div data-testid="auth-container" data-is-authenticated={isAuthenticated}>
      <h2>{isSignUp ? "Sign Up" : "Sign In"}</h2>

      {error && (
        <div
          data-testid="auth-error"
          style={{ color: "red", marginBottom: "10px" }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="email-input"
            required
            style={{ padding: "5px", marginRight: "10px" }}
          />
        </div>

        {isSignUp && (
          <div style={{ marginBottom: "10px" }}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              data-testid="first-name-input"
              required
              style={{ padding: "5px", marginRight: "10px" }}
            />
          </div>
        )}

        <div style={{ marginBottom: "10px" }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="password-input"
            required
            style={{ padding: "5px", marginRight: "10px" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          data-testid={isSignUp ? "sign-up-button" : "sign-in-button"}
        >
          {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
        </button>
      </form>

      <p>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          data-testid="toggle-auth-mode"
          style={{
            background: "none",
            border: "none",
            color: "blue",
            cursor: "pointer",
          }}
        >
          {isSignUp
            ? "Already have an account? Sign In"
            : "Don't have an account? Sign Up"}
        </button>
      </p>
    </div>
  );
}

export default AuthPage;

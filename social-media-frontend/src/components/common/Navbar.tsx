import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from './Avatar';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">✦</span>
            <span className="brand-text">SocialApp</span>
          </Link>

          <form className="navbar-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search with AI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn" aria-label="Search">
              &#128269;
            </button>
          </form>

          <div className="navbar-actions">
            <Link to="/posts/new" className="btn btn-primary btn-sm">
              + Post
            </Link>
            <Link to="/my-posts" className="btn btn-ghost btn-sm">
              My Posts
            </Link>
            <Link to={`/profile/${user?._id}`} className="navbar-avatar">
              <Avatar src={user?.avatarUrl} username={user?.username || ''} size={34} />
            </Link>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <Link to="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
          <span className="bottom-nav-icon">🏠</span>
          <span className="bottom-nav-label">Feed</span>
        </Link>

        <Link to="/search" className={`bottom-nav-item ${isActive('/search') ? 'active' : ''}`}>
          <span className="bottom-nav-icon">🔍</span>
          <span className="bottom-nav-label">Search</span>
        </Link>

        <Link to="/posts/new" className="bottom-nav-item bottom-nav-create" aria-label="Create post">
          <span style={{ fontSize: '1.6rem', lineHeight: 1, color: 'white' }}>+</span>
        </Link>

        <Link
          to={`/profile/${user?._id}`}
          className={`bottom-nav-item ${location.pathname.startsWith('/profile') ? 'active' : ''}`}
        >
          <span className="bottom-nav-icon">
            <Avatar src={user?.avatarUrl} username={user?.username || ''} size={22} />
          </span>
          <span className="bottom-nav-label">Profile</span>
        </Link>

        <button className="bottom-nav-item" onClick={handleLogout}>
          <span className="bottom-nav-icon">🚪</span>
          <span className="bottom-nav-label">Logout</span>
        </button>
      </nav>
    </>
  );
};

export default Navbar;

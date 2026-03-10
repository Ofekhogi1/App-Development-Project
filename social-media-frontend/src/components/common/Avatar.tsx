import React from 'react';

interface AvatarProps {
  src?: string | null;
  username: string;
  size?: number;
  onClick?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({ src, username, size = 40, onClick }) => {
  const BASE_URL = import.meta.env.VITE_API_URL || '';

  const getAvatarUrl = (url: string) => {
    if (url.startsWith('http') || url.startsWith('//')) return url;
    return `${BASE_URL}${url}`;
  };

  const initial = username.charAt(0).toUpperCase();

  return (
    <div
      className="avatar"
      style={{ width: size, height: size, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {src ? (
        <img src={getAvatarUrl(src)} alt={username} />
      ) : (
        <span style={{ fontSize: size * 0.4 }}>{initial}</span>
      )}
    </div>
  );
};

export default Avatar;

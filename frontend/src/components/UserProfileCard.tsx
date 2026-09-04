import { useState } from 'react';
import { X, Mail, IdCard, Briefcase, Grid3x3 } from 'lucide-react';
import { MODULE_LABELS, type User } from '../api';

const initials = (fullName: string) =>
  fullName.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');

interface AvatarProps {
  user: User;
  size?: number;
  onClick?: () => void;
}

export const Avatar = ({ user, size = 40, onClick }: AvatarProps) => (
  <div
    onClick={onClick}
    style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: user.photo_url ? undefined : 'var(--accent-color)',
      backgroundImage: user.photo_url ? `url(${user.photo_url})` : undefined,
      backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 600, fontSize: size * 0.4,
      cursor: onClick ? 'pointer' : 'default',
    }}
    title={user.full_name}
  >
    {!user.photo_url && initials(user.full_name)}
  </div>
);

interface UserProfileCardProps {
  user: User;
  subtitle?: string;
}

const UserProfileCard = ({ user, subtitle }: UserProfileCardProps) => {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        onClick={() => setShowProfile(true)}
      >
        <Avatar user={user} />
        <div>
          <div style={{ fontWeight: 600 }}>{user.full_name}</div>
          {subtitle && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{subtitle}</div>}
        </div>
      </div>

      {showProfile && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '24px',
          }}
          onClick={() => setShowProfile(false)}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" style={{ padding: '8px' }} onClick={() => setShowProfile(false)}>
                <X size={18} />
              </button>
            </div>

            <Avatar user={user} size={100} />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '16px 0 4px' }}>{user.full_name}</h2>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '20px', textTransform: 'capitalize' }}>{user.role}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                <IdCard size={16} /> {user.document_id}
              </div>
              {user.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                  <Mail size={16} /> {user.email}
                </div>
              )}
              {user.cargo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                  <Briefcase size={16} /> {user.cargo}
                </div>
              )}
              {user.module && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                  <Grid3x3 size={16} /> {MODULE_LABELS[user.module]}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserProfileCard;

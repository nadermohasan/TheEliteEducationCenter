// Navbar.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default function Navbar({ userName = 'مستخدم', role = 'student' }) {
  const navigate = useNavigate();
  const [branch, setBranch] = useState('');

  useEffect(() => {
    const fetchBranch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('branch')
          .eq('id', user.id)
          .maybeSingle();
        setBranch(profile?.branch || '');
      }
    };
    fetchBranch();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const nameParts = userName.trim().split(/\s+/);
  let displayName = nameParts[0];

  if (nameParts.length > 1) {
    const lastIdx = nameParts.length - 1;
    const secondToLast = nameParts[lastIdx - 1];
    const compoundPrefixes = ['أبو', 'ابو'];

    if (compoundPrefixes.includes(secondToLast) && nameParts.length > 2) {
      displayName = `${nameParts[0]} ${secondToLast} ${nameParts[lastIdx]}`;
    } else {
      displayName = `${nameParts[0]} ${nameParts[lastIdx]}`;
    }
  }

  return (
    <>
      <header className="dashboard-header">
        <button onClick={handleLogout} className="logout-button">
          <span>خروج</span>
          <span className="logout-icon"><LogoutIcon /></span>
        </button>

        <div className="logo-section">
          <div className="logo-wrapper-dash">
            <div className="logo-glow"></div>
            <img
              src="https://i.imgur.com/WaAVV7H.png"
              alt="شعار المركز"
              className="logo-img-dash"
            />
          </div>
        </div>

        <div className="user-section">
          <div className="user-info">
            <div className="user-text">
              <span className="user-name">{displayName}</span>
            </div>
            <div className="user-avatar">
              <UserIcon />
            </div>
          </div>
        </div>
      </header>

      <style>{`
        .dashboard-header {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          
          padding: 12px 32px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          
          border-radius: 0 0 32px 32px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          
          box-shadow: 
            0 8px 32px rgba(15, 23, 42, 0.08),
            0 2px 8px rgba(15, 23, 42, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          
          position: sticky;
          top: 0;
          z-index: 1000;
          direction: rtl;
        }

        /* ========== Logo Section ========== */
        .logo-section {
          justify-self: center;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-wrapper-dash {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          
          padding: 10px 24px;
          margin: -8px 0;
          
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* تأثير التوهج خلف اللوجو */
        .logo-glow {
          position: absolute;
          width: 100px;
          height: 100px;
      
          
          border-radius: 50%;
          filter: blur(20px);
          z-index: 0;
          
          animation: logoPulse 3s ease-in-out infinite;
        }

        @keyframes logoPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }

        .logo-img-dash {
          height: 64px;
          width: auto;
          object-fit: contain;
          
          position: relative;
          z-index: 2;
          
          transition: 
            transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
            filter 0.3s ease;
        }

        .logo-wrapper-dash:hover {
          transform: translateY(-3px);
        }

        .logo-wrapper-dash:hover .logo-img-dash {
          transform: scale(1.08);
          filter: drop-shadow(0 6px 20px rgba(37, 99, 235, 0.35));
        }

        .logo-wrapper-dash:hover .logo-glow {
          animation: logoPulseHover 1.5s ease-in-out infinite;
        }

        @keyframes logoPulseHover {
          0%, 100% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.3);
            opacity: 1;
          }
        }

        /* ========== User Section ========== */
        .user-section {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-text {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.4;
        }

        .user-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 1rem;
          font-family: 'Cairo', sans-serif;
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: all 0.25s ease;
        }

        .user-avatar:hover {
          border-color: #2563eb;
          box-shadow: 0 0 16px rgba(37, 99, 235, 0.15);
        }

        .user-avatar svg {
          width: 20px;
          height: 20px;
        }

        /* ========== Logout Button ========== */
        .logout-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 10px 22px;
          border-radius: 30px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          justify-self: start;
          width: fit-content;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }

        .logout-button:hover {
          background-color: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.12);
          transform: translateY(-1px);
        }

        .logout-button:active {
          transform: translateY(0);
        }

        .logout-icon {
          width: 18px;
          height: 18px;
          display: flex;
        }

        /* ========== Responsive - Mobile ========== */
        @media (max-width: 768px) {
          .dashboard-header {
            padding: 10px 16px;
            border-radius: 0 0 24px 24px;
          }

          .logo-wrapper-dash {
            padding: 6px 16px;
          }

          .logo-img-dash {
            height: 48px;
          }

          .logo-glow {
            width: 70px;
            height: 70px;
          }

          .logout-button span:first-child {
            display: none;
          }

          .logout-button {
            padding: 10px;
            border-radius: 50%;
            aspect-ratio: 1;
          }
        }

        @media (max-width: 480px) {
          .dashboard-header {
            padding: 8px 12px;
          }

          .logo-img-dash {
            height: 56px;
          }

          .logo-glow {
            width: 56px;
            height: 56px;
          }
        }
      `}</style>
    </>
  );
}
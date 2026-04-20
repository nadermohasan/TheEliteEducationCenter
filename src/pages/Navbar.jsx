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

  // --- منطق استخراج الاسم الأول والأخير (مع دعم الأسماء المركبة مثل أبو قمر) ---
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
            <img src="https://i.imgur.com/p1hg12H.png" alt="شعار المركز" className="logo-img-dash" />
          </div>
          <span className="logo-text-dash">مركز النخبة التعليمي</span>
        </div>

        <div className="user-section">
          <div className="user-info">
            <div className="user-text">
              <span className="user-name">{displayName}</span>
              {branch && <span className="user-branch">الفرع: {branch}</span>}
            </div>
            <div className="user-avatar">
              <UserIcon />
            </div>
          </div>
        </div>
      </header>

      <style>{`
        .dashboard-header {
          background-color: #ffffff;
          padding: 12px 30px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          border-radius: 0 0 24px 24px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.04);
          position: sticky;
          top: 0;
          z-index: 1000;
          backdrop-filter: blur(10px);
          background: rgba(255,255,255,0.95);
          direction: rtl;
        }

        .logo-section {
          justify-self: center;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-wrapper-dash {
          background-color: white;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.08);
          border: 1px solid #e2e8f0;
        }

        .logo-img-dash {
          max-width: 90%;
          max-height: 90%;
          object-fit: contain;
        }

        .logo-text-dash {
          font-weight: 800;
          font-size: 1.2rem;
          color: #1e3a8a;
          letter-spacing: -0.3px;
        }

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
          font-weight: 600;
          color: #334155;
          font-size: 1rem;
          font-family: 'Cairo', sans-serif;
        }

        .user-branch {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 400;
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: #f1f5f9;
          border: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .user-avatar svg {
          width: 20px;
          height: 20px;
        }

        .logout-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 8px 18px;
          border-radius: 30px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
          justify-self: start;
          width: fit-content;
        }

        .logout-button:hover {
          background-color: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }

        .logout-icon {
          width: 18px;
          height: 18px;
          display: flex;
        }

        @media (max-width: 768px) {
          .dashboard-header {
            padding: 10px 16px;
          }
          .logo-text-dash {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
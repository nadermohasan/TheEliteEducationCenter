export default function Footer() {
  return (
    <footer className="app-footer">
      <p>تطوير : نادر محمد أبو سليمان</p>
      <p>Developed by <span></span><b>Nader Sulieman © </b></p>
      <style>{`
        .app-footer {
          padding: 25px;
          text-align: center;
          font-size: 14px;
          color: #64748b;
          background: transparent;
          direction: rtl;
          font-family: 'Cairo', sans-serif;
        }
        .app-footer p {
          margin: 0;
          line-height: 1.4;
        }
        @media (max-width: 768px) {
          .app-footer {
            padding: 20px 10px;
            font-size: 12px;
          }
        }
        .test{
        font-size: 20px;
        }
      `}</style>
    </footer>
  );
}
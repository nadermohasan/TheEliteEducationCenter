export default function Footer() {
  return (
    <footer className="app-footer">
      <p>The Elite Education Center</p>
      <p>Developed by <b>Nader Sulieman © </b></p>
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
        /* تقليل المسافة بين الفقرات */
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
      `}</style>
    </footer>
  );
}
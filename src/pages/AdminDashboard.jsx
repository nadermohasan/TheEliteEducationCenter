import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { toast } from "react-hot-toast";
import Footer from "./Footer";
import Navbar from "./Navbar";
import {
  Users, CheckCircle, Search, TrendingUp, RefreshCw
} from "lucide-react";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [stats, setStats] = useState({ totalStudents: 0, activeAttempts: 0 });
  const [activeAttemptsMap, setActiveAttemptsMap] = useState({});

  // ================= FETCH =================

  const fetchStats = useCallback(async () => {
    const { count: totalStudents } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    const { count: activeAttempts } = await supabase
      .from("attempts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    setStats({
      totalStudents: totalStudents || 0,
      activeAttempts: activeAttempts || 0,
    });
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("created_at", { ascending: false });

    setUsers(data || []);
    setLoading(false);
  }, []);

  const fetchActiveAttempts = useCallback(async () => {
    const { data } = await supabase
      .from("attempts")
      .select("student_id, status")
      .eq("status", "active");

    const map = {};
    (data || []).forEach(a => (map[a.student_id] = true));
    setActiveAttemptsMap(map);
  }, []);

  const refreshAll = () => {
    fetchUsers();
    fetchStats();
    fetchActiveAttempts();
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchActiveAttempts();
  }, []);

  // ================= ACTION =================

  const handleActivateAttempt = async (studentId) => {
    setProcessingId(studentId);

    try {
      await supabase
        .from("attempts")
        .update({ status: "completed" })
        .eq("student_id", studentId)
        .eq("status", "active");

      await supabase
        .from("attempts")
        .insert([{ student_id: studentId, status: "active" }]);

      toast.success("تم التفعيل ✅");
      refreshAll();
    } catch (e) {
      toast.error("خطأ ❌");
    }

    setProcessingId(null);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.includes(searchTerm) ||
      u.username?.includes(searchTerm)
  );

  // ================= UI =================

  return (
    <div className="container">
      <Navbar userName="مدير النظام" />

      <main className="main">

        {/* HEADER */}
        <div className="header">
          <h1>إدارة الطلاب</h1>
        </div>

        {/* STATS */}
        <div className="stats">
          <div className="card">
            <Users />
            <div>
              <span>عدد الطلاب</span>
              <h2>{stats.totalStudents}</h2>
            </div>
          </div>

          <div className="card">
            <CheckCircle />
            <div>
              <span>محاولات نشطة</span>
              <h2>{stats.activeAttempts}</h2>
            </div>
          </div>

          <div className="card">
            <TrendingUp />
            <div>
              <span>اليوم</span>
              <h2>
                {
                  users.filter(u =>
                    new Date(u.created_at).toDateString() === new Date().toDateString()
                  ).length
                }
              </h2>
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div className="search">
          <Search />
          <input
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")}>✖</button>
          )}
        </div>

        {/* DESKTOP TABLE */}
        <div className="table">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الفرع</th>
                  <th>التاريخ</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const active = activeAttemptsMap[u.id];

                  return (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.branch}</td>
                      <td>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          onClick={() => handleActivateAttempt(u.id)}
                          disabled={active || processingId === u.id}
                        >
                          {active ? "✔" : "تفعيل"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* MOBILE CARDS */}
        <div className="cards">
          {filteredUsers.map((u) => {
            const active = activeAttemptsMap[u.id];

            return (
              <div className="user-card" key={u.id}>
                <h3>{u.name}</h3>
                <p>{u.branch}</p>
                <small>
                  {new Date(u.created_at).toLocaleDateString()}
                </small>

                <button
                  onClick={() => handleActivateAttempt(u.id)}
                  disabled={active || processingId === u.id}
                >
                  {active ? "✔ مفعلة" : "تفعيل"}
                </button>
              </div>
            );
          })}
        </div>

      </main>

      <Footer />

      {/* ================= CSS ================= */}
      <style>{`
        body { font-family: Cairo; }

        .main {
          max-width: 1100px;
          margin: auto;
          padding: 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 20px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit,minmax(200px,1fr));
          gap: 10px;
          margin-bottom: 20px;
        }

        .card {
          background: white;
          padding: 15px;
          border-radius: 12px;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .search {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          background: white;
          padding: 10px;
          border-radius: 30px;
        }

        .search input {
          flex: 1;
          border: none;
          outline: none;
        }

        table {
          width: 100%;
        }

        th, td {
          padding: 10px;
          text-align: center;
        }

        button {
          padding: 8px 12px;
          border-radius: 10px;
          border: none;
          background: #3b82f6;
          color: white;
        }

        /* MOBILE */
        .cards { display: none; }

        @media (max-width: 768px) {
          .table { display: none; }

          .cards {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .user-card {
            background: white;
            padding: 15px;
            border-radius: 12px;
          }

          .user-card button {
            width: 100%;
            padding: 12px;
            margin-top: 10px;
          }
        }
      `}</style>
    </div>
  );
}
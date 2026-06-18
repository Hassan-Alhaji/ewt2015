"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "../../components/Logo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LeaderboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [sortBy, setSortBy] = useState("points"); // points, km, streak

  useEffect(() => {
    const savedToken = localStorage.getItem("ewt_token");
    if (savedToken) setToken(savedToken);
    // Leaderboard is public — works for guests too.
    fetchLeaderboard(savedToken, sortBy);
  }, [sortBy]);

  const fetchLeaderboard = async (authToken, sort) => {
    setLoading(true);
    try {
      const headers = {};
      if (authToken) headers["Authorization"] = `Token ${authToken}`;
      const res = await fetch(`${API_URL}/api/users/leaderboard/?sort_by=${sort}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setMembers(data);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const topThree = members.slice(0, 3);
  const restOfMembers = members.slice(3);

  const getMetricIcon = () => {
    if (sortBy === "points") return "⭐";
    if (sortBy === "km") return "🏃";
    return "🔥";
  };

  const getMetricValue = (m) => {
    if (sortBy === "points") return `${m.points} نقطة`;
    if (sortBy === "km") return `${m.total_km} كم`;
    return `${m.streak} يوم`;
  };

  // Safe Avatar Wrapper
  const renderAvatar = (url, gender, sizeClasses) => {
    if (url) {
      const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
      return <img src={fullUrl} alt="Avatar" className={`object-cover w-full h-full`} />;
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900 border border-zinc-800">
        <span className="text-2xl">{gender === "female" ? "👩" : "👨"}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#060709] bg-shoe-prints bg-speed-lines text-white flex flex-col items-center py-12 px-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[var(--neon-green)]/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#00f2fe]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl w-full space-y-12 z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3">
            <Logo height={48} />
            <div>
              <h1 className="text-3xl font-black italic tracking-wide text-[var(--neon-green)] glowing-text">لوحة الصدارة والشرف</h1>
              <p className="text-xs text-zinc-400 mt-1 font-semibold">أفضل أعضاء فريق الشرقية للمشي حسب الإنجازات</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-[var(--neon-green)]/50 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold transition-all duration-300"
            >
              🏠 الرئيسية
            </button>
            {token && (
              <button
                onClick={() => router.push("/profile")}
                className="px-6 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold transition-all duration-300"
              >
                ملفي الشخصي 👤
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex justify-center">
          <div className="inline-flex bg-zinc-950/80 border border-zinc-800 rounded-2xl p-1.5 backdrop-blur-sm">
            <button
              onClick={() => setSortBy("points")}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                sortBy === "points" 
                  ? "bg-[var(--neon-green)] text-black shadow-[0_0_15px_rgba(204,255,0,0.4)]" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              ⭐ الأعلى نقاطاً
            </button>
            <button
              onClick={() => setSortBy("km")}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                sortBy === "km" 
                  ? "bg-[#00f2fe] text-black shadow-[0_0_15px_rgba(0,242,254,0.4)]" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🏃 أبطال المسافات
            </button>
            <button
              onClick={() => setSortBy("streak")}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                sortBy === "streak" 
                  ? "bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🔥 ملوك الاستمرارية
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center space-y-4 py-20">
            <div className="w-12 h-12 border-4 border-[var(--neon-green)] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-zinc-400">جاري تحميل الأبطال...</p>
          </div>
        ) : (
          <div className="space-y-16">
            
            {/* Podium (Top 3) */}
            {topThree.length > 0 && (
              <div className="flex flex-row justify-center items-end gap-2 md:gap-6 pt-10">
                
                {/* 2nd Place */}
                {topThree[1] && (
                  <div className="flex flex-col items-center w-[30%] max-w-[160px] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="relative mb-3">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-[#C0C0C0] shadow-[0_0_20px_rgba(192,192,192,0.4)] z-10 relative">
                        {renderAvatar(topThree[1].avatar, topThree[1].gender)}
                      </div>
                      <div className="absolute -bottom-3 -right-3 bg-[#C0C0C0] text-black w-7 h-7 rounded-full flex items-center justify-center font-black text-sm z-20 shadow-lg">2</div>
                    </div>
                    <div className="text-center mb-4">
                      <h3 className="font-bold text-white text-xs md:text-sm line-clamp-1">{topThree[1].name}</h3>
                      <p className="text-[#C0C0C0] text-[10px] md:text-xs font-black mt-1 bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-800">
                        {getMetricIcon()} {getMetricValue(topThree[1])}
                      </p>
                    </div>
                    <div className="w-full h-24 md:h-32 bg-gradient-to-t from-zinc-900 to-[#C0C0C0]/20 rounded-t-lg border-t-2 border-[#C0C0C0] flex items-end justify-center pb-2">
                      <span className="text-[#C0C0C0] text-3xl opacity-20 font-black">🥈</span>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {topThree[0] && (
                  <div className="flex flex-col items-center w-[35%] max-w-[200px] z-10 animate-fade-in">
                    <div className="absolute top-[-50px] w-[150px] h-[150px] bg-yellow-500/20 blur-[50px] rounded-full pointer-events-none"></div>
                    <div className="relative mb-3">
                      <div className="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-[#FFD700] shadow-[0_0_30px_rgba(255,215,0,0.5)] z-10 relative animate-pulse-glow">
                        {renderAvatar(topThree[0].avatar, topThree[0].gender)}
                      </div>
                      <div className="absolute -bottom-4 -right-4 bg-[#FFD700] text-black w-9 h-9 rounded-full flex items-center justify-center font-black text-lg z-20 shadow-xl border-2 border-black">1</div>
                    </div>
                    <div className="text-center mb-4">
                      <h3 className="font-black text-white text-sm md:text-lg text-[#FFD700] glowing-text line-clamp-1">{topThree[0].name}</h3>
                      <p className="text-[#FFD700] text-xs md:text-sm font-black mt-1 bg-zinc-900/80 px-3 py-1 rounded-md border border-[#FFD700]/30 shadow-inner">
                        {getMetricIcon()} {getMetricValue(topThree[0])}
                      </p>
                    </div>
                    <div className="w-full h-32 md:h-44 bg-gradient-to-t from-zinc-900 to-[#FFD700]/20 rounded-t-xl border-t-4 border-[#FFD700] flex items-end justify-center pb-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
                      <span className="text-[#FFD700] text-5xl opacity-30 font-black">👑</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                  <div className="flex flex-col items-center w-[30%] max-w-[160px] animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="relative mb-3">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-[#CD7F32] shadow-[0_0_20px_rgba(205,127,50,0.4)] z-10 relative">
                        {renderAvatar(topThree[2].avatar, topThree[2].gender)}
                      </div>
                      <div className="absolute -bottom-3 -right-3 bg-[#CD7F32] text-white w-7 h-7 rounded-full flex items-center justify-center font-black text-sm z-20 shadow-lg border border-black">3</div>
                    </div>
                    <div className="text-center mb-4">
                      <h3 className="font-bold text-white text-xs md:text-sm line-clamp-1">{topThree[2].name}</h3>
                      <p className="text-[#CD7F32] text-[10px] md:text-xs font-black mt-1 bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-800">
                        {getMetricIcon()} {getMetricValue(topThree[2])}
                      </p>
                    </div>
                    <div className="w-full h-20 md:h-28 bg-gradient-to-t from-zinc-900 to-[#CD7F32]/20 rounded-t-lg border-t-2 border-[#CD7F32] flex items-end justify-center pb-2">
                      <span className="text-[#CD7F32] text-3xl opacity-20 font-black">🥉</span>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Rest of the List */}
            {restOfMembers.length > 0 && (
              <div className="bg-[#0e1014]/80 border border-zinc-850 rounded-3xl p-4 md:p-8 shadow-2xl backdrop-blur-md">
                <h3 className="text-lg font-black text-white italic mb-6 border-b border-zinc-800/80 pb-4 flex items-center gap-2">
                  <span>📜</span> سجل الشرف الألماسي
                </h3>
                
                <div className="space-y-3">
                  {restOfMembers.map((m, index) => (
                    <div 
                      key={m.id} 
                      className="flex items-center justify-between p-4 bg-zinc-950/40 hover:bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700 rounded-2xl transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="w-8 text-center text-zinc-500 font-black text-lg md:text-xl group-hover:text-white transition-colors">
                          #{index + 4}
                        </div>
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border border-zinc-700">
                          {renderAvatar(m.avatar, m.gender)}
                        </div>
                        <div>
                          <h4 className="text-sm md:text-base font-bold text-white group-hover:text-[var(--neon-green)] transition-colors">{m.name}</h4>
                          <p className="text-[10px] md:text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-white font-bold uppercase">{m.level_name_ar}</span>
                            <span>•</span>
                            <span>{m.city}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-left font-black text-base md:text-xl text-[var(--neon-green)] flex items-center gap-2 glowing-text tracking-wide">
                        {getMetricValue(m)}
                        <span className="text-xs opacity-60 grayscale">{getMetricIcon()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {members.length === 0 && !loading && (
              <div className="text-center text-zinc-500 py-12">
                لا توجد بيانات كافية لعرض لوحة الصدارة بعد.
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

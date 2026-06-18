"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "../components/Logo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MOTIVATION = [
  "كل خطوة تقربك من هدفك",
  "المشي أسلوب حياة",
  "صحتك تبدأ من قدميك",
  "تحدَّ نفسك اليوم",
  "خطوة • نقطة • إنجاز",
];

export default function LandingPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ total_users: 0, total_events: 0, total_km: 0, annual_goal_km: 100000 });
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [champions, setChampions] = useState({ month: 0, year: 0, categories: [] });
  const [loadingStats, setLoadingStats] = useState(true);
  const [token, setToken] = useState("");
  const [theme, setTheme] = useState("dark");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [joining, setJoining] = useState(false);

  // Countdown to the nearest upcoming event
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const savedToken = localStorage.getItem("ewt_token");
    if (savedToken) setToken(savedToken);
    setTheme(document.documentElement.getAttribute("data-theme") || "dark");
    fetchStats();
    fetchNews(savedToken);
    fetchEvents();
    fetchChampions();
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("ewt_theme", next);
    } catch (e) {}
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/stats/public/`);
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchNews = async (userToken) => {
    try {
      const headers = {};
      if (userToken) headers["Authorization"] = `Token ${userToken}`;
      const res = await fetch(`${API_URL}/api/users/news/`, { headers });
      const data = await res.json();
      if (res.ok) setNews(data);
    } catch (err) {
      console.error("Error fetching news:", err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/events/upcoming/`);
      const data = await res.json();
      if (res.ok) setEvents(data);
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  const fetchChampions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/leaderboard/monthly-champions/`);
      const data = await res.json();
      if (res.ok) setChampions(data);
    } catch (err) {
      console.error("Error fetching champions:", err);
    }
  };

  const nearestEvent = events.find((ev) => ev.event_date) || null;

  useEffect(() => {
    if (!nearestEvent) return;
    const target = nearestEvent.event_date + (nearestEvent.event_time ? `T${nearestEvent.event_time}:00` : "T00:00:00");

    const tick = () => {
      const diff = +new Date(target) - +new Date();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        fetchEvents();
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [nearestEvent?.id, nearestEvent?.event_date, nearestEvent?.event_time]);

  const handleJoinEvent = async (ev) => {
    if (!token) {
      router.push("/login");
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`${API_URL}/api/users/events/register-attendance/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({ event_id: ev.id }),
      });
      const data = await res.json();
      alert(data.detail || (res.ok ? "تم الانضمام للفعالية بنجاح." : "تعذّر الانضمام للفعالية."));
      if (res.ok) {
        setSelectedEvent(null);
        fetchEvents();
      }
    } catch (err) {
      alert("تعذّر الاتصال بالخادم.");
    } finally {
      setJoining(false);
    }
  };

  const handleLike = async (postId) => {
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/users/news/${postId}/like/`, {
        method: "POST",
        headers: { Authorization: `Token ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNews((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, user_liked: data.liked, likes_count: data.liked ? post.likes_count + 1 : post.likes_count - 1 }
              : post
          )
        );
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const goalPercentage = Math.min(100, Math.max(0, (stats.total_km / stats.annual_goal_km) * 100));
  const featuredNews = news[0] || null;
  const restNews = news.slice(1);
  const monthLabel = champions.year
    ? new Date(champions.year, champions.month - 1, 1).toLocaleDateString("ar-SA", { month: "long", year: "numeric" })
    : "";
  const medals = ["🥇", "🥈", "🥉"];

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }) : "";

  return (
    <div className="min-h-screen bg-[var(--dark-bg)] text-theme font-sans overflow-x-hidden transition-colors duration-300">
      {/* ===== Navbar ===== */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl lp-nav">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex justify-between items-center">
          <Logo height={44} />
          <div className="flex gap-2 md:gap-3 items-center">
            <button
              onClick={toggleTheme}
              aria-label="تبديل الوضع النهاري/الليلي"
              title={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
              className="w-10 h-10 rounded-xl border border-[var(--border-color)] flex items-center justify-center text-lg hover:border-[var(--neon-green)]/50 transition-colors cursor-pointer"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => router.push("/leaderboard")}
              className="px-4 py-2 text-sm font-bold text-theme-sec hover:text-[var(--neon-green)] transition-colors hidden md:block"
            >
              🏆 الصدارة
            </button>
            <button
              onClick={() => router.push(token ? "/profile" : "/login")}
              className="px-6 py-2.5 neon-glow-btn text-black font-black text-sm rounded-xl cursor-pointer"
            >
              {token ? "الملف الشخصي" : "تسجيل دخول"}
            </button>
          </div>
        </div>
      </nav>

      {/* ===== Hero (Dynamic background for day/night) ===== */}
      <section className="hero-dark relative w-full min-h-[92vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 ken-burns bg-cover bg-center transition-all duration-700" style={{ backgroundImage: theme === 'light' ? "url('/hero_bg_light.png')" : "url('/hero_bg_dark.png')" }} />
        <div className={`absolute inset-0 bg-gradient-to-b ${theme === 'light' ? 'from-white/40 via-white/60 to-[var(--dark-bg)]' : 'from-transparent via-transparent to-[var(--dark-bg)]'}`} />
        <div className={`absolute inset-0 bg-shoe-prints ${theme === 'light' ? 'opacity-20' : 'opacity-60'}`} />
        <div className="absolute top-[10%] left-[-8%] w-[480px] h-[480px] bg-[var(--neon-green)]/10 rounded-full blur-[130px] drift pointer-events-none" />
        <div className="absolute bottom-[-5%] right-[-8%] w-[420px] h-[420px] bg-[#00f2fe]/10 rounded-full blur-[130px] drift pointer-events-none" style={{ animationDelay: "-6s" }} />

        <div className="relative z-10 max-w-3xl">
          <div className={`fade-up inline-flex items-center gap-2 px-4 py-1.5 mb-7 rounded-full border text-xs font-black tracking-wider ${theme === 'light' ? 'bg-[var(--neon-green)]/30 border-[var(--neon-green)]/60 text-slate-900 shadow-sm' : 'bg-[var(--neon-green)]/10 border-[var(--neon-green)]/30 text-[var(--neon-green)]'}`}>
            <span className="w-2 h-2 rounded-full bg-[var(--neon-green)] animate-ping" />
            مجتمع المشي الأول في المنطقة الشرقية
          </div>

          <h1 className={`fade-up-1 text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1] ${theme === 'light' ? 'text-slate-900 drop-shadow-md' : 'text-white'}`}>
            المشي أسلوب <span className="text-shimmer">حياة</span>
          </h1>

          <p className={`fade-up-2 max-w-2xl mx-auto text-lg md:text-xl font-bold leading-relaxed mb-10 ${theme === 'light' ? 'text-slate-800 drop-shadow-sm' : 'text-zinc-200'}`}>
            انطلق في رحلتك نحو صحة أفضل. سجّل خطواتك، انضم للفعاليات، نافس زملاءك، وكن جزءاً من مجتمع يلهمك كل يوم. ⚡
          </p>

          <div className="fade-up-3 flex gap-4 flex-wrap justify-center">
            <button
              onClick={() => router.push(token ? "/profile" : "/login")}
              className="px-8 py-4 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-black text-lg rounded-2xl cursor-pointer transition-all shadow-[0_0_30px_rgba(204,255,0,0.35)] hover:scale-105"
            >
              {token ? "لوحة القيادة ⚡" : "ابدأ التحدي الآن ⚡"}
            </button>
            <button
              onClick={() => document.getElementById("news").scrollIntoView({ behavior: "smooth" })}
              className={`px-8 py-4 backdrop-blur-xl border-2 font-black text-lg rounded-2xl cursor-pointer transition-all hover:scale-105 shadow-xl ${
                theme === 'light'
                  ? 'bg-slate-900/80 border-slate-700 text-white hover:border-[#00f2fe] hover:bg-slate-800/90'
                  : 'bg-white/15 border-white/20 text-white hover:border-[#00f2fe]/80 hover:bg-white/20'
              }`}
            >
              إنجازات الأعضاء 📰
            </button>
          </div>
        </div>
      </section>

      {/* ===== Motivation ticker ===== */}
      <div className="relative z-20 -mt-px lp-soft overflow-hidden py-3">
        <div className="ticker-track">
          {[...MOTIVATION, ...MOTIVATION, ...MOTIVATION, ...MOTIVATION].map((m, i) => (
            <span key={i} className="mx-8 shrink-0 text-sm font-black tracking-widest uppercase text-theme-muted inline-flex items-center gap-3">
              <span className="text-[var(--neon-green)]">●</span> {m}
            </span>
          ))}
        </div>
      </div>

      {/* ===== Stats ===== */}
      <section className="w-full max-w-6xl mx-auto px-4 md:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {[
            { icon: "👥", color: "var(--neon-green)", value: loadingStats ? "..." : stats.total_users, label: "عضو نشط" },
            { icon: "🏃", color: "#00f2fe", value: loadingStats ? "..." : Math.round(stats.total_km).toLocaleString(), label: "كيلومتر مقطوع" },
            { icon: "📅", color: "#f97316", value: loadingStats ? "..." : stats.total_events, label: "فعالية منجزة" },
          ].map((s, i) => (
            <div
              key={i}
              className="sport-glass-card p-8 text-center flex flex-col items-center justify-center"
              style={{ borderBottom: `4px solid ${s.color}` }}
            >
              <span className="text-4xl mb-3 float-slow" style={{ animationDelay: `${i * -2}s` }}>{s.icon}</span>
              <span className="text-4xl md:text-5xl font-black text-theme mb-1">{s.value}</span>
              <span className="text-xs font-bold text-theme-muted uppercase tracking-widest">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Annual Goal Banner */}
        <div className="sport-glass-card p-8 md:p-10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-40 h-40 bg-[var(--neon-green)]/10 blur-3xl rounded-full drift" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 relative z-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-black italic text-theme mb-2">🎯 الهدف السنوي للفريق</h2>
              <p className="text-theme-sec text-sm font-semibold">تحدٍّ جماعي نقطعه معاً خطوة بخطوة هذا العام!</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-[var(--neon-green)] glowing-text">{Math.round(stats.total_km).toLocaleString()}</span>
              <span className="text-xl text-theme-muted font-bold mx-2">/</span>
              <span className="text-xl text-theme font-bold">{stats.annual_goal_km.toLocaleString()} كم</span>
            </div>
          </div>
          <div className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-full h-6 overflow-hidden relative z-10 p-1">
            <div
              className="bg-gradient-to-l from-[var(--neon-green)] to-[#00ff88] h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(204,255,0,0.5)] relative"
              style={{ width: `${goalPercentage}%` }}
            >
              {goalPercentage >= 5 && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-black">
                  {goalPercentage.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Upcoming Events ===== */}
      {events.length > 0 && (
        <section className="w-full max-w-6xl mx-auto px-4 md:px-8 py-10 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black italic text-theme mb-3">🗓️ الفعاليات القادمة</h2>
            <p className="text-theme-sec font-semibold">انضم إلينا في الميدان — أقرب فعالية تنطلق بعد:</p>
          </div>

          {nearestEvent && (
            <div
              onClick={() => setSelectedEvent(nearestEvent)}
              className="sport-glass-card featured-glow overflow-hidden mb-8 relative cursor-pointer"
            >
              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-2/5 h-56 lg:h-auto relative overflow-hidden bg-[var(--card-hover-bg)]">
                  {nearestEvent.image ? (
                    <img src={nearestEvent.image} alt={nearestEvent.name_ar} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl opacity-30">🏃⚡</div>
                  )}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-ping" />
                    <span className="text-[var(--neon-green)]">الأقرب</span>
                  </div>
                </div>

                <div className="lg:w-3/5 p-6 md:p-8 flex flex-col justify-center gap-5">
                  <div>
                    <h3 className="text-2xl font-black text-theme mb-2">{nearestEvent.name_ar}</h3>
                    <div className="flex flex-wrap gap-3 text-xs font-bold text-theme-sec">
                      {nearestEvent.event_date && <span>📅 {fmtDate(nearestEvent.event_date)}{nearestEvent.event_time ? ` • ${nearestEvent.event_time}` : ""}</span>}
                      {nearestEvent.location_name && <span>📍 {nearestEvent.location_name}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 font-mono" dir="ltr">
                    {[
                      { v: timeLeft.days, l: "يوم" },
                      { v: timeLeft.hours, l: "ساعة" },
                      { v: timeLeft.minutes, l: "دقيقة" },
                      { v: timeLeft.seconds, l: "ثانية" },
                    ].map((u, i) => (
                      <div key={i} className="flex items-center gap-2 md:gap-3">
                        <div className="flex flex-col items-center bg-[var(--input-bg)] border border-[var(--border-color)] px-3 py-2.5 rounded-xl min-w-[58px] md:min-w-[68px]">
                          <span className={`text-2xl md:text-3xl font-black ${i === 1 ? "text-[var(--neon-green)] glowing-text" : i === 3 ? "text-[var(--energy-cyan)] glowing-text-cyan" : "text-theme"}`}>
                            {String(u.v).padStart(2, "0")}
                          </span>
                          <span className="text-[8px] text-theme-muted font-bold uppercase tracking-wider mt-1" dir="rtl">{u.l}</span>
                        </div>
                        {i < 3 && <span className="text-xl font-black text-theme-muted">:</span>}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black bg-[var(--neon-green)]/15 text-[var(--neon-green)] border border-[var(--neon-green)]/30">⭐ {nearestEvent.points} نقطة</span>
                    {nearestEvent.km > 0 && <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/30">🏃 {nearestEvent.km} كم</span>}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleJoinEvent(nearestEvent); }}
                      disabled={joining}
                      className="ml-auto px-6 py-2.5 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-black text-sm rounded-xl cursor-pointer transition-all shadow-[0_0_15px_rgba(204,255,0,0.25)] disabled:opacity-50"
                    >
                      سجّل حضورك ⚡
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {events.filter((ev) => !nearestEvent || ev.id !== nearestEvent.id).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events
                .filter((ev) => !nearestEvent || ev.id !== nearestEvent.id)
                .map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="sport-glass-card overflow-hidden flex flex-col cursor-pointer"
                  >
                    <div className="h-36 relative overflow-hidden bg-[var(--card-hover-bg)] flex-shrink-0">
                      {ev.image ? (
                        <img src={ev.image} alt={ev.name_ar} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">🏃⚡</div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col gap-2 flex-1">
                      <h4 className="font-black text-theme">{ev.name_ar}</h4>
                      <div className="text-xs font-bold text-theme-sec flex flex-wrap gap-2">
                        {ev.event_date && <span>📅 {fmtDate(ev.event_date)}</span>}
                        {ev.location_name && <span>📍 {ev.location_name}</span>}
                      </div>
                      <div className="flex gap-2 mt-auto pt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/20">⭐ {ev.points}</span>
                        {ev.km > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/20">🏃 {ev.km} كم</span>}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* ===== Monthly Champions by category ===== */}
      <section className="w-full max-w-6xl mx-auto px-4 md:px-8 py-10 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/30 text-[var(--neon-green)] text-xs font-black tracking-wider">
            🏅 أبطال الشهر
          </div>
          <h2 className="text-3xl md:text-4xl font-black italic text-theme mb-3">الأكثر مشياً هذا الشهر — حسب الفئة</h2>
          <p className="text-theme-sec font-semibold">
            {monthLabel ? `أبطال شهر ${monthLabel}` : "أبطال هذا الشهر"} • تتجدد القائمة تلقائياً بداية كل شهر ميلادي
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {champions.categories.map((cat) => (
            <div key={cat.category_code} className="sport-glass-card p-6 md:p-7">
              <div className="flex items-center justify-between pb-4 mb-4 border-b lp-divider">
                <h3 className="text-lg font-black text-theme flex items-center gap-2">
                  <span>🏷️</span> {cat.category_name}
                </h3>
                <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">أعلى 3</span>
              </div>

              {cat.top.length === 0 ? (
                <p className="text-sm text-theme-muted text-center py-6">لا يوجد نشاط مسجّل بعد هذا الشهر — كن أول الأبطال! 🚀</p>
              ) : (
                <div className="space-y-3">
                  {cat.top.map((m, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-4 p-3 rounded-xl border ${
                        i === 0 ? "bg-[var(--neon-green)]/5 border-[var(--neon-green)]/30" : "lp-soft"
                      }`}
                    >
                      <span className="text-2xl w-8 text-center flex-shrink-0">{medals[i]}</span>
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-[var(--border-color)] bg-[var(--card-hover-bg)] flex-shrink-0">
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                        )}
                      </div>
                      <span className="font-bold text-theme flex-1 truncate">{m.name}</span>
                      <span className="font-mono font-black text-[var(--neon-green)] flex-shrink-0">
                        {m.km.toLocaleString()} <span className="text-xs text-theme-muted">كم</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== News / Member content wall (the centerpiece) ===== */}
      <section id="news" className="w-full max-w-6xl mx-auto px-4 md:px-8 py-16 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-[#00f2fe]/10 border border-[#00f2fe]/30 text-[#00f2fe] text-xs font-black tracking-wider">
            ✨ من صنع الأعضاء
          </div>
          <h2 className="text-3xl md:text-4xl font-black italic text-theme mb-3">حائط الإنجازات والقصص الملهمة</h2>
          <p className="text-theme-sec font-semibold">إنجازات حقيقية من أعضاء حقيقيين — شارك قصتك وألهم الفريق.</p>
        </div>

        {news.length === 0 ? (
          <div className="text-center py-20 sport-glass-card">
            <span className="text-6xl opacity-50 mb-4 block float-slow">📰</span>
            <p className="text-theme-sec font-bold text-lg mb-6">لا توجد مشاركات بعد. كن أول من يلهم الفريق بإنجازه!</p>
            <button
              onClick={() => router.push(token ? "/profile" : "/login")}
              className="px-7 py-3 neon-glow-btn text-black font-black rounded-xl cursor-pointer"
            >
              شارك إنجازك ➕
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {featuredNews && (
              <article className="sport-glass-card overflow-hidden group">
                <div className="flex flex-col lg:flex-row">
                  {featuredNews.image && (
                    <div className="lg:w-1/2 h-64 lg:h-auto relative overflow-hidden bg-[var(--card-hover-bg)]">
                      <img src={featuredNews.image} alt={featuredNews.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute top-3 right-3 bg-[var(--neon-green)] text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">الأحدث ⚡</div>
                    </div>
                  )}
                  <div className={`p-7 md:p-9 flex flex-col justify-center ${featuredNews.image ? "lg:w-1/2" : "w-full"}`}>
                    <div className="flex items-center gap-2 text-xs text-theme-muted font-semibold mb-3">
                      <span className="inline-flex items-center gap-1.5 bg-[var(--card-hover-bg)] px-2.5 py-1 rounded-full text-[var(--neon-green)]">
                        <span className="w-5 h-5 rounded-full bg-[var(--neon-green)]/20 flex items-center justify-center text-[10px]">👤</span>
                        {featuredNews.author_name}
                      </span>
                      <span>•</span>
                      <span>{fmtDate(featuredNews.created_at)}</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-theme mb-4 leading-snug">{featuredNews.title}</h3>
                    <p className="text-theme-sec leading-relaxed text-sm md:text-base whitespace-pre-line mb-6 line-clamp-4">{featuredNews.content}</p>
                    <div className="flex items-center justify-between pt-4 border-t lp-divider">
                      <button
                        onClick={() => handleLike(featuredNews.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                          featuredNews.user_liked
                            ? "bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/30"
                            : "lp-soft text-theme-sec hover:text-theme"
                        }`}
                      >
                        <span className={`text-lg ${featuredNews.user_liked ? "scale-110" : ""}`}>👏</span>
                        تشجيع ({featuredNews.likes_count})
                      </button>
                      <a href={`/news/${featuredNews.id}`} className="px-4 py-2 lp-soft text-theme hover:text-[var(--neon-green)] rounded-xl text-sm font-bold transition-all">
                        اقرأ التفاصيل ↗
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {restNews.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restNews.map((post) => (
                  <article key={post.id} className="sport-glass-card overflow-hidden flex flex-col group">
                    {post.image && (
                      <div className="h-48 relative overflow-hidden bg-[var(--card-hover-bg)] flex-shrink-0">
                        <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-theme-muted font-semibold mb-2">
                        <span className="bg-[var(--card-hover-bg)] px-2 py-0.5 rounded text-[var(--neon-green)]">{post.author_name}</span>
                        <span>•</span>
                        <span>{fmtDate(post.created_at)}</span>
                      </div>
                      <h3 className="text-lg font-black text-theme mb-2">{post.title}</h3>
                      <p className="text-theme-sec leading-relaxed text-sm whitespace-pre-line mb-5 line-clamp-3">{post.content}</p>
                      <div className="flex items-center justify-between pt-3 border-t lp-divider mt-auto">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            post.user_liked
                              ? "bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/30"
                              : "lp-soft text-theme-sec hover:text-theme"
                          }`}
                        >
                          <span className={post.user_liked ? "scale-110" : ""}>👏</span>
                          {post.likes_count}
                        </button>
                        <a href={`/news/${post.id}`} className="text-xs font-bold text-theme-sec hover:text-[var(--neon-green)] transition-colors">
                          التفاصيل ↗
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== CTA strip ===== */}
      <section className="w-full max-w-5xl mx-auto px-4 md:px-8 pb-20 relative z-10">
        <div className="sport-glass-card p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-shoe-prints opacity-40" />
          <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[var(--neon-green)]/10 blur-[120px] rounded-full drift" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-theme mb-4">جاهز تبدأ رحلتك؟ 🚀</h2>
            <p className="text-theme-sec font-semibold mb-8 max-w-xl mx-auto">انضم لمجتمع فريق الشرقية للمشي اليوم، وحوّل كل خطوة إلى إنجاز ونقاط ومراكز متقدمة.</p>
            <button
              onClick={() => router.push(token ? "/profile" : "/login")}
              className="px-10 py-4 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-black text-lg rounded-2xl cursor-pointer transition-all shadow-[0_0_30px_rgba(204,255,0,0.35)] hover:scale-105"
            >
              {token ? "اذهب للوحة القيادة ⚡" : "انضم إلينا مجاناً ⚡"}
            </button>
          </div>
        </div>
      </section>

      {/* ===== Event details modal (click any event) ===== */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="sport-glass-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b lp-divider sticky top-0 bg-[var(--card-bg)] z-10">
              <h3 className="text-lg font-black text-[var(--neon-green)] italic">معلومات الفعالية 📍</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-theme-muted hover:text-theme text-xl font-black w-8 h-8 flex items-center justify-center rounded-full lp-soft cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="w-full h-48 rounded-xl overflow-hidden relative bg-[var(--card-hover-bg)] flex items-center justify-center">
                {selectedEvent.image ? (
                  <img src={selectedEvent.image} alt={selectedEvent.name_ar} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl opacity-30">🏃⚡</span>
                )}
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-black text-theme">{selectedEvent.name_ar}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black bg-[var(--neon-green)]/15 text-[var(--neon-green)] border border-[var(--neon-green)]/30">
                    🎁 نقاط الحضور: {selectedEvent.points} نقطة
                  </span>
                  {selectedEvent.km > 0 && (
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/30">
                      🏃 المسافة: {selectedEvent.km} كم
                    </span>
                  )}
                </div>
              </div>

              <div className="lp-soft p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-theme text-sm">التفاصيل والتعليمات:</h4>
                <p className="text-theme-sec text-sm leading-relaxed whitespace-pre-wrap font-semibold">
                  {selectedEvent.description_ar || "لا توجد تفاصيل إضافية مسجّلة لهذه الفعالية."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="lp-soft p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-theme text-sm">📅 الزمان:</h4>
                  <p className="text-theme-sec text-sm">
                    {selectedEvent.event_date
                      ? new Date(selectedEvent.event_date).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                      : "غير محدد"}
                  </p>
                  {selectedEvent.event_time && <p className="text-theme-sec text-sm">الساعة: {selectedEvent.event_time}</p>}
                </div>
                <div className="lp-soft p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-theme text-sm">📍 المكان:</h4>
                  <p className="text-theme-sec text-sm">{selectedEvent.location_name || "غير محدد"}</p>
                  {selectedEvent.location_url && (
                    <a
                      href={selectedEvent.location_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 px-3 py-1.5 lp-soft text-[var(--neon-green)] hover:text-theme rounded-lg text-xs font-bold transition-colors"
                    >
                      فتح في خرائط جوجل ↗
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t lp-divider flex justify-end gap-3 sticky bottom-0 bg-[var(--card-bg)]">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2.5 lp-soft text-theme font-bold text-sm rounded-xl transition-colors"
              >
                إغلاق
              </button>
              <button
                onClick={() => handleJoinEvent(selectedEvent)}
                disabled={joining}
                className="px-8 py-2.5 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-black text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(204,255,0,0.25)] cursor-pointer disabled:opacity-50"
              >
                {joining ? "جاري الإرسال..." : token ? "تأكيد حضوري للفعالية ⚡" : "سجّل الدخول للانضمام"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Footer ===== */}
      <footer className="w-full border-t lp-divider py-8 text-center text-theme-muted text-sm font-semibold">
        <p>© {new Date().getFullYear()} فريق الشرقية للمشي. جميع الحقوق محفوظة.</p>
        <p className="mt-2 text-xs">منصة رياضية مجتمعية تهدف لتعزيز الصحة ونمط الحياة النشط.</p>
      </footer>
    </div>
  );
}

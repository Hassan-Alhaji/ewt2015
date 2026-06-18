"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "../../components/Logo";
import { 
  Home, HelpCircle, Trophy, LogOut, 
  Activity, MapPin, Calendar, Flame,
  Info, CheckCircle, Plus, Upload, X
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MOTIVATIONAL_QUOTES = [
  { text: "المشي ليس مجرد رياضة، بل أسلوب حياة يجدد طاقتك يومياً.", type: "motivation", icon: <Flame className="w-5 h-5 text-orange-500" /> },
  { text: "كل خطوة تقطعها اليوم هي استثمار في صحتك غداً.", type: "motivation", icon: <Activity className="w-5 h-5 text-[var(--neon-green)]" /> },
  { text: "لا تستسلم، فالبدايات دائماً هي الأصعب، وبعدها يبدأ الإنجاز.", type: "motivation", icon: <Trophy className="w-5 h-5 text-yellow-500" /> },
  { text: "الاستمرارية أهم من السرعة، حافظ على وتيرتك وستصل.", type: "motivation", icon: <Activity className="w-5 h-5 text-blue-400" /> },
  { text: "الرياضة تنعش العقل وتقوي الجسد، اجعلها جزءاً من روتينك.", type: "motivation", icon: <Activity className="w-5 h-5 text-purple-400" /> },
  { text: "اشرب كميات كافية من الماء قبل وأثناء المشي لتجنب الجفاف.", type: "tip", icon: <Info className="w-5 h-5 text-blue-300" /> },
  { text: "اختر حذاءً رياضياً مناسباً ومريحاً لحماية مفاصلك أثناء المشي.", type: "tip", icon: <Info className="w-5 h-5 text-teal-400" /> },
  { text: "ابدأ دائماً بتمارين الإحماء لتجنب الإصابات والشد العضلي.", type: "tip", icon: <Activity className="w-5 h-5 text-rose-400" /> },
  { text: "لا تقارن بدايتك بموسم حصاد غيرك، ركز على مسارك الخاص.", type: "motivation", icon: <Flame className="w-5 h-5 text-orange-400" /> },
  { text: "المشي لمسافات طويلة يساعد في تحسين المزاج وتقليل التوتر.", type: "tip", icon: <Info className="w-5 h-5 text-indigo-400" /> },
];

export default function ProfilePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registeringEvent, setRegisteringEvent] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Activities State
  const [activities, setActivities] = useState([]);
  const [activityForm, setActivityForm] = useState({ name: "", link: "", km: "" });
  const [submittingActivity, setSubmittingActivity] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  // News State
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: "", content: "" });
  const [newsImage, setNewsImage] = useState(null);
  const [submittingNews, setSubmittingNews] = useState(false);

  // Countdown State
  const [upcomingEvent, setUpcomingEvent] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Help Modal State
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Event Detail Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Pagination States
  const [currentPageEvents, setCurrentPageEvents] = useState(1);
  const [currentPageActivities, setCurrentPageActivities] = useState(1);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const itemsPerPage = 5;

  const indexOfLastEvent = currentPageEvents * itemsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - itemsPerPage;
  const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalEventPages = Math.ceil(events.length / itemsPerPage);

  const indexOfLastActivity = currentPageActivities * itemsPerPage;
  const indexOfFirstActivity = indexOfLastActivity - itemsPerPage;
  const currentActivities = activities.slice(indexOfFirstActivity, indexOfLastActivity);
  const totalActivityPages = Math.ceil(activities.length / itemsPerPage);

  useEffect(() => {
    const savedToken = localStorage.getItem("ewt_token");
    if (!savedToken) {
      router.push("/");
    } else {
      setToken(savedToken);
      fetchProfile(savedToken);
      fetchEvents(savedToken);
      fetchActivities(savedToken);
    }

    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 8000);
    return () => clearInterval(quoteInterval);
  }, [router]);

  // Find nearest upcoming event
  useEffect(() => {
    if (events.length === 0) return;

    // Filter events that have a date and are NOT expired
    const upcoming = events
      .filter(ev => ev.event_date && !ev.is_expired)
      .sort((a, b) => new Date(a.event_date + (a.event_time ? `T${a.event_time}` : 'T00:00:00')) - new Date(b.event_date + (b.event_time ? `T${b.event_time}` : 'T00:00:00')))[0];

    if (upcoming) {
      setUpcomingEvent(upcoming);
    } else {
      setUpcomingEvent(null);
    }
  }, [events]);

  // Countdown timer logic
  useEffect(() => {
    if (!upcomingEvent) return;

    const timer = setInterval(() => {
      const eventDateTimeStr = upcomingEvent.event_date + (upcomingEvent.event_time ? `T${upcomingEvent.event_time}:00` : 'T00:00:00');
      const difference = +new Date(eventDateTimeStr) - +new Date();

      if (difference <= 0) {
        clearInterval(timer);
        setUpcomingEvent(null);
        fetchEvents(token);
        fetchProfile(token);
      } else {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const m = Math.floor((difference / 1000 / 60) % 60);
        const s = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [upcomingEvent, token]);

  const fetchProfile = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/profile/`, {
        headers: {
          Authorization: `Token ${authToken}`,
        },
      });

      if (res.status === 404) {
        router.push("/register");
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setProfile(data);
      } else {
        setError("تعذر تحميل بيانات الملف الشخصي.");
      }
    } catch (err) {
      setError("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/events/`, {
        headers: {
          Authorization: `Token ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setEvents(data);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  const fetchActivities = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/activities/`, {
        headers: {
          Authorization: `Token ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setActivities(data);
      }
    } catch (err) {
      console.error("Error fetching activities:", err);
    }
  };

  const handleRegisterAttendance = async (eventId) => {
    setRegisteringEvent(eventId);
    try {
      const res = await fetch(`${API_URL}/api/users/events/register-attendance/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ event_id: eventId }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.detail);
        fetchEvents(token);
      } else {
        alert(data.detail || "فشل تسجيل حضور الفعالية.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setRegisteringEvent(null);
    }
  };

  const handleSubmitActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.name || !activityForm.link) {
      alert("الرجاء تعبئة اسم النشاط والرابط.");
      return;
    }
    setSubmittingActivity(true);
    try {
      const res = await fetch(`${API_URL}/api/users/activities/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          activity_name: activityForm.name,
          activity_link: activityForm.link,
          ...(activityForm.km ? { claimed_km: activityForm.km } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.detail || "تم رفع النشاط بنجاح! سيتم مراجعته من الإدارة قريباً.");
        setActivityForm({ name: "", link: "", km: "" });
        fetchActivities(token);
      } else {
        alert(data.detail || "فشل رفع النشاط.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setSubmittingActivity(false);
    }
  };

  const handleSubmitNews = async (e) => {
    e.preventDefault();
    if (!newsForm.title || !newsForm.content) {
      alert("الرجاء تعبئة العنوان والمحتوى.");
      return;
    }
    setSubmittingNews(true);
    const formData = new FormData();
    formData.append("title", newsForm.title);
    formData.append("content", newsForm.content);
    if (newsImage) formData.append("image", newsImage);

    try {
      const res = await fetch(`${API_URL}/api/users/news/create/`, {
        method: "POST",
        headers: { Authorization: `Token ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.detail);
        setShowNewsModal(false);
        setNewsForm({ title: "", content: "" });
        setNewsImage(null);
      } else {
        alert(data.detail || "فشل رفع الخبر.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setSubmittingNews(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/users/logout/`, {
        method: "POST",
        headers: { Authorization: `Token ${token}` },
      });
    } catch (err) {
      // even if the server call fails, clear the local session
    }
    localStorage.clear();
    router.push("/");
  };

  const handleUploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);
    // Since it's a PATCH, we must make sure the backend accepts partial update for multipart

    try {
      const res = await fetch(`${API_URL}/api/users/profile/`, {
        method: "PUT",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        fetchProfile(token); // Refresh profile to get new avatar URL
      } else {
        const data = await res.json();
        alert(data.detail || "فشل رفع الصورة.");
      }
    } catch (err) {
      alert("حدث خطأ أثناء الاتصال.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--dark-bg)] text-theme">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--neon-green)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-theme-sec">جاري تحميل ملفك الشخصي...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-bg)] bg-shoe-prints bg-speed-lines text-theme flex flex-col items-center py-16 px-6 relative overflow-hidden">
      {/* Oblique energy glow circles */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[var(--neon-green)]/3 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#00f2fe]/3 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-4xl w-full space-y-10 z-10">
        
        {/* Navigation & Header */}
        <div className="flex justify-between items-center w-full pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <Logo height={40} />
            <h1 className="text-2xl font-black italic tracking-wider text-theme glowing-text-cyan">لوحة أداء العضو</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowActivityModal(true)}
              className="px-5 py-2.5 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black rounded-xl text-sm font-black cursor-pointer transition-all duration-300 shadow-[0_0_15px_rgba(204,255,0,0.3)] flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> رفع نشاط
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2.5 bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-[var(--neon-green)]/50 text-theme rounded-xl text-sm font-bold cursor-pointer transition-all duration-300 flex items-center gap-2"
            >
              <Home className="w-4 h-4" /> الرئيسية
            </button>
            <button
              onClick={() => setShowHelpModal(true)}
              className="px-5 py-2.5 bg-[var(--card-bg)] border border-blue-500/50 hover:bg-blue-500/10 text-blue-500 rounded-xl text-sm font-bold cursor-pointer transition-all duration-300 flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" /> المساعدة
            </button>
            <button
              onClick={() => router.push("/leaderboard")}
              className="px-5 py-2.5 bg-[var(--card-bg)] border border-[var(--neon-green)]/50 hover:bg-[var(--neon-green)]/10 text-[var(--neon-green)] rounded-xl text-sm font-bold cursor-pointer transition-all duration-300 shadow-[0_0_10px_rgba(204,255,0,0.2)] flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" /> لوحة الصدارة
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 border border-[var(--border-color)] hover:bg-[var(--card-hover-bg)] text-theme-sec hover:text-theme rounded-xl text-sm font-bold cursor-pointer transition-all duration-300 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </button>
          </div>
        </div>

        {/* Motivational Banner */}
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden transition-all duration-500">
          <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-[var(--neon-green)] to-[var(--energy-cyan)]"></div>
          <div className="flex items-center gap-4 w-full">
            <div className="w-10 h-10 rounded-full bg-[var(--card-hover-bg)] flex items-center justify-center text-xl shadow-inner flex-shrink-0">
              {MOTIVATIONAL_QUOTES[currentQuoteIndex].icon}
            </div>
            <div key={currentQuoteIndex} className="flex-1 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <span className="text-[10px] font-black uppercase tracking-widest block mb-1 text-theme-muted">
                {MOTIVATIONAL_QUOTES[currentQuoteIndex].type === "tip" ? "نصيحة صحية 💡" : "جرعة تحفيز 🔥"}
              </span>
              <p className="text-sm font-bold text-theme">
                {MOTIVATIONAL_QUOTES[currentQuoteIndex].text}
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="bg-red-950/50 border border-red-500/50 text-red-200 text-sm px-4 py-3 rounded-lg text-right">
            {error}
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* ACTIVITY UPLOAD MOVED TO MODAL */}

            {/* Countdown Banner */}
            {upcomingEvent && (
              <div className="sport-glass-card p-6 border-l-4 border-l-[var(--neon-green)] relative overflow-hidden animate-pulse-glow">
                <div className="absolute inset-0 bg-speed-lines opacity-10 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                  <div className="space-y-2 text-center md:text-right w-full md:w-auto">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--neon-green)] animate-ping"></span>
                      <span className="text-[11px] text-[var(--neon-green)] font-black uppercase tracking-widest skew-x-[-6deg]">الفعالية القادمة المقتربة</span>
                    </div>
                    <h3 className="text-xl font-black italic text-theme uppercase">{upcomingEvent.name_ar}</h3>
                    {upcomingEvent.location_name && (
                      <p className="text-xs text-theme-sec font-semibold flex items-center justify-center md:justify-start gap-1">
                        <MapPin className="w-3 h-3" /> {upcomingEvent.location_name}
                      </p>
                    )}
                  </div>
                  
                  {/* Countdown dials */}
                  <div className="flex items-center gap-3 md:gap-4 font-mono" dir="ltr">
                    <div className="flex flex-col items-center bg-[var(--card-hover-bg)] border border-[var(--border-color)] p-3 rounded-xl min-w-[65px] md:min-w-[75px]">
                      <span className="text-2xl md:text-3xl font-black text-theme">{timeLeft.days}</span>
                      <span className="text-[9px] text-theme-muted font-bold uppercase tracking-wider mt-1">Days</span>
                    </div>
                    <span className="text-xl font-black text-theme-muted">:</span>
                    <div className="flex flex-col items-center bg-[var(--card-hover-bg)] border border-[var(--border-color)] p-3 rounded-xl min-w-[65px] md:min-w-[75px]">
                      <span className="text-2xl md:text-3xl font-black text-[var(--neon-green)] glowing-text">{timeLeft.hours}</span>
                      <span className="text-[9px] text-theme-muted font-bold uppercase tracking-wider mt-1">Hours</span>
                    </div>
                    <span className="text-xl font-black text-theme-muted">:</span>
                    <div className="flex flex-col items-center bg-[var(--card-hover-bg)] border border-[var(--border-color)] p-3 rounded-xl min-w-[65px] md:min-w-[75px]">
                      <span className="text-2xl md:text-3xl font-black text-theme">{timeLeft.minutes}</span>
                      <span className="text-[9px] text-theme-muted font-bold uppercase tracking-wider mt-1">Mins</span>
                    </div>
                    <span className="text-xl font-black text-theme-muted">:</span>
                    <div className="flex flex-col items-center bg-[var(--card-hover-bg)] border border-[var(--border-color)] p-3 rounded-xl min-w-[65px] md:min-w-[75px]">
                      <span className="text-2xl md:text-3xl font-black text-[var(--energy-cyan)] glowing-text-cyan">{timeLeft.seconds}</span>
                      <span className="text-[9px] text-theme-muted font-bold uppercase tracking-wider mt-1">Secs</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Athlete Hero Header Card */}
            <div className="sport-glass-card p-8 md:p-10 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 animate-pulse-glow">
              {/* Background footprint trail opacity watermark */}
              <div className="absolute right-4 top-4 w-32 h-32 bg-shoe-prints opacity-20 pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right w-full md:w-auto">
                <div className="relative group">
                  <label className="relative w-28 h-28 rounded-full overflow-hidden border-3 border-[var(--neon-green)] bg-zinc-950 shadow-2xl flex-shrink-0 pulse-glow cursor-pointer block">
                    {profile?.avatar ? (
                      <img src={profile.avatar.startsWith("http") ? profile.avatar : `${API_URL}${profile.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl bg-zinc-950 group-hover:bg-zinc-900 transition-colors">
                        {profile?.gender === "female" ? "👩" : "👨"}
                      </div>
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-bold tracking-wider">
                        {uploadingAvatar ? "جاري الرفع..." : (profile?.avatar ? "تغيير الصورة" : "رفع صورة")}
                      </span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} disabled={uploadingAvatar} />
                  </label>
                  <div className="absolute bottom-0 right-0 bg-[var(--neon-green)] text-black text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider skew-x-[-6deg] z-10 pointer-events-none">
                    نشط
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex flex-col md:flex-row items-center gap-3">
                    <h2 className="text-3xl font-black tracking-wide text-white uppercase italic">{profile?.name}</h2>
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black bg-[var(--neon-green)]/15 text-[var(--neon-green)] border border-[var(--neon-green)]/30 uppercase tracking-wider skew-x-[-6deg]">
                      {profile?.category_name || "الشباب"}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 font-mono tracking-wider" dir="ltr">{profile?.mobile}</p>
                  
                  <div className="pt-2">
                    {profile?.is_approved ? (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-extrabold bg-green-950/80 text-green-300 border border-green-800/80">
                        🟢 عضو مفعّل ومعتمد بالمنصة
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-extrabold bg-yellow-950/80 text-yellow-300 border border-yellow-800/80 animate-pulse">
                        🟡 حسابك بانتظار تفعيل الإدارة
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic oblique sport banner stats */}
              <div className="grid grid-cols-3 gap-4 md:gap-6 bg-zinc-950/70 border border-zinc-800/50 p-6 rounded-2xl text-center min-w-[280px] md:min-w-[320px] shadow-inner">
                <div className="relative">
                  <span className="text-[10px] text-zinc-500 block font-black uppercase tracking-wider mb-1">النقاط</span>
                  <span className="text-xl font-black text-white block glowing-text">{profile?.points || 0} ⭐</span>
                </div>
                <div className="relative border-r border-zinc-800/60 pr-4">
                  <span className="text-[10px] text-zinc-500 block font-black uppercase tracking-wider mb-1">المسافة</span>
                  <span className="text-xl font-black text-[var(--neon-green)] block">{profile?.total_km || "0.00"} 🏃</span>
                </div>
                <div className="relative border-r border-zinc-800/60 pr-4">
                  <span className="text-[10px] text-zinc-500 block font-black uppercase tracking-wider mb-1">الاستمرار</span>
                  <span className="text-xl font-black text-orange-500 block animate-flame">🔥 {profile?.streak || 0}</span>
                </div>
              </div>
            </div>

            {/* Performance & Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Column: Fitness / Level Ring Gauge */}
              <div className="sport-glass-card p-6 flex flex-col items-center justify-center text-center">
                <div className="w-full text-right pb-3 border-b border-zinc-800/50 mb-4">
                  <h3 className="text-sm font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏅</span> تقدم المستوى
                  </h3>
                </div>
                
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {/* Radial Activity Ring SVG */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.02)" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="url(#activeGlowGradient)" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (profile?.progress_percent || 0)) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                    <defs>
                      <linearGradient id="activeGlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ccff00" />
                        <stop offset="100%" stopColor="#00ff88" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-4xl font-black text-white italic tracking-wide">{profile?.level_number || 1}</span>
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-widest mt-1">LEVEL</span>
                  </div>
                </div>

                <div className="mt-6 space-y-2 w-full">
                  <h4 className="text-xl font-black tracking-wide text-[var(--neon-green)] glowing-text uppercase italic">
                    {profile?.level_name_ar || "مبتدئ"}
                  </h4>
                  <div className="w-full bg-zinc-900 border border-zinc-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-l from-[var(--neon-green)] to-[#00ff88] h-full transition-all duration-500" 
                      style={{ width: `${profile?.progress_percent || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-zinc-400 font-semibold pt-1">
                    {profile?.progress_percent === 100 
                      ? "🎉 وصلت للمستوى الأقصى للفريق!" 
                      : `${(Math.max(0, (profile?.next_level_min_km || 50) - (profile?.total_km || 0))).toFixed(2)} كم متبقية للترقية`}
                  </p>
                </div>
              </div>

              {/* Middle/Right Columns: Health & Personal Stats */}
              <div className="sport-glass-card p-6 md:col-span-2 space-y-6">
                <div className="pb-3 border-b border-zinc-800/50 flex justify-between items-center">
                  <h3 className="text-sm font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👟</span> البيانات الشخصية والرياضية
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-950/50 border border-zinc-800/40 p-4 rounded-xl flex items-center gap-4">
                    <span className="text-2xl">📍</span>
                    <div>
                      <span className="text-[10px] text-zinc-500 block font-bold uppercase tracking-wider">المدينة</span>
                      <span className="font-bold text-white text-base">{profile?.city}</span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/50 border border-zinc-800/40 p-4 rounded-xl flex items-center gap-4">
                    <span className="text-2xl">🧬</span>
                    <div>
                      <span className="text-[10px] text-zinc-500 block font-bold uppercase tracking-wider">الجنس</span>
                      <span className="font-bold text-white text-base">{profile?.gender === "male" ? "ذكر" : "أنثى"}</span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/50 border border-zinc-800/40 p-4 rounded-xl flex items-center gap-4">
                    <span className="text-2xl">📅</span>
                    <div>
                      <span className="text-[10px] text-zinc-500 block font-bold uppercase tracking-wider">تاريخ الميلاد</span>
                      <span className="font-bold text-white text-base">
                        {profile?.birth_date || "—"}
                        {profile?.age && <span className="text-xs text-zinc-400 mr-2">(العمر: {profile.age} سنة)</span>}
                      </span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/50 border border-zinc-800/40 p-4 rounded-xl flex items-center gap-4">
                    <span className="text-2xl">👟</span>
                    <div>
                      <span className="text-[10px] text-zinc-500 block font-bold uppercase tracking-wider">النشاط المفضل</span>
                      <span className="font-bold text-[var(--neon-green)] text-base">
                        {profile?.preferred_activity === "walk" ? "🚶 المشي الرياضي" : 
                         profile?.preferred_activity === "run" ? "🏃 الجري السريع" : "🚶🏃 كلاهما"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Biological Health Status (Weights & Notes) */}
                <div className="border-t border-zinc-850 pt-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest">
                    <span>🔒</span> البيانات الصحية الخاصة (سرية للعضو والأدمن)
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl text-center flex flex-col justify-center">
                      <span className="text-[10px] text-zinc-500 block font-bold mb-1">الطول</span>
                      <span className="font-mono text-white font-black text-lg">{profile?.height ? `${profile.height} سم` : "غير مسجل"}</span>
                    </div>
                    <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl text-center flex flex-col justify-center">
                      <span className="text-[10px] text-zinc-500 block font-bold mb-1">الوزن الحالي</span>
                      <span className="font-mono text-white font-black text-lg">{profile?.weight ? `${profile.weight} كجم` : "غير مسجل"}</span>
                    </div>
                    <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl sm:col-span-2 text-right">
                      <span className="text-[10px] text-zinc-500 block font-bold mb-1">الملاحظات والاحتياطات الطبية</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-semibold italic bg-[#0c0d10] p-2 rounded-lg border border-zinc-800/60">
                        {profile?.health_notes || "لا توجد أي ملاحظات طبية مسجلة."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Events & Attendance Section */}
            <div className="sport-glass-card p-6 md:p-8 space-y-6">
              <div className="pb-3 border-b border-zinc-800/50 flex justify-between items-center">
                <h3 className="text-lg font-black text-white italic flex items-center gap-2">
                  <span>📅</span> الفعاليات الرياضية والتحقق من الحضور
                </h3>
                <span className="text-xs text-zinc-400 font-semibold">سجل حضورك للحصول على نقاط ترقية</span>
              </div>

              {events.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-6">لا توجد فعاليات نشطة ومتاحة حالياً.</p>
              ) : (
                <div className="space-y-4">
                  {currentEvents.map((ev) => (
                    <div 
                      key={ev.id} 
                      className="bg-zinc-950/70 border border-zinc-850 hover:border-zinc-700 rounded-xl overflow-hidden flex flex-col md:flex-row items-center gap-4 transition-all duration-300 p-4"
                    >
                      {/* Image Thumbnail (Left on LTR, Right on RTL) */}
                      <div className="w-full md:w-32 h-32 md:h-24 rounded-lg overflow-hidden bg-zinc-900 relative flex-shrink-0">
                        {ev.image ? (
                          <img src={ev.image} alt={ev.name_ar} className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center">
                            <span className="text-3xl opacity-40">🏃⚡</span>
                          </div>
                        )}
                        {/* Status absolute tag */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider skew-x-[-6deg]">
                          {ev.is_expired ? (
                            <span className="text-red-400">انتهت</span>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-ping"></span>
                              <span className="text-[var(--neon-green)]">نشطة</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Content details */}
                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-base font-black text-white">{ev.name_ar}</h4>
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{ev.description_ar}</p>
                          </div>
                          
                          <div className="flex gap-2 flex-shrink-0 mr-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/20 uppercase tracking-wider skew-x-[-6deg]">
                              ⭐ {ev.points} نقطة
                            </span>
                            {ev.km > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/20 uppercase tracking-wider skew-x-[-6deg]">
                                🏃 {ev.km} كم
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Date & Location & Action Row */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 mt-2 border-t border-zinc-900">
                          <div className="flex flex-wrap items-center gap-3">
                            {(ev.event_date || ev.event_time) && (
                              <div className="flex items-center gap-1 text-xs text-zinc-400 font-semibold">
                                <span>📅</span>
                                <span>
                                  {ev.event_date ? new Date(ev.event_date).toLocaleDateString("en-GB") : ""}
                                  {ev.event_time ? ` | ⏰ ${ev.event_time}` : ""}
                                </span>
                              </div>
                            )}
                            {ev.location_name && (
                              <div className="flex items-center gap-1 text-xs text-zinc-400 font-semibold">
                                <span>📍</span>
                                {ev.location_url ? (
                                  <a href={ev.location_url} target="_blank" rel="noopener noreferrer" className="text-[var(--neon-green)] hover:underline flex items-center gap-1">
                                    {ev.location_name} ↗
                                  </a>
                                ) : (
                                  <span>{ev.location_name}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Attendance Status */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <button
                              onClick={() => setSelectedEvent(ev)}
                              className="px-4 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white font-bold text-xs rounded transition-all"
                            >
                              التفاصيل 📄
                            </button>
                            {ev.attendance_status === null ? (
                              ev.is_expired ? (
                                <span className="text-xs font-bold text-zinc-500">❌ التسجيل مغلق</span>
                              ) : (
                                <button
                                  onClick={() => handleRegisterAttendance(ev.id)}
                                  disabled={registeringEvent === ev.id}
                                  className="px-4 py-1.5 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-extrabold text-xs rounded transition-all disabled:opacity-50"
                                >
                                  {registeringEvent === ev.id ? "جاري الإرسال..." : "سجل حضوري ⚡"}
                                </button>
                              )
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded text-[11px] font-bold bg-green-950/60 text-green-300 border border-green-800/50">
                                ✅ تم الانضمام
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pagination Controls */}
                  {totalEventPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t border-zinc-800/50">
                      <button 
                        disabled={currentPageEvents === 1}
                        onClick={() => setCurrentPageEvents(prev => Math.max(prev - 1, 1))}
                        className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 text-xs font-bold"
                      >
                        السابق
                      </button>
                      <span className="text-xs text-zinc-500 font-mono">
                        {currentPageEvents} / {totalEventPages}
                      </span>
                      <button 
                        disabled={currentPageEvents === totalEventPages}
                        onClick={() => setCurrentPageEvents(prev => Math.min(prev + 1, totalEventPages))}
                        className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 text-xs font-bold"
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Independent Activities Section */}
            <div className="sport-glass-card p-6 md:p-8 space-y-6">
              <div className="pb-3 border-b border-zinc-800/50 flex justify-between items-center">
                <h3 className="text-lg font-black text-white italic flex items-center gap-2">
                  <span>🗺️</span> الأنشطة الحرة والمشي الفردي
                </h3>
              </div>

              {activities.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-6">لم تقم برفع أي أنشطة حرة حتى الآن.</p>
              ) : (
                <div className="space-y-3">
                  {currentActivities.map((act) => (
                    <div key={act.id} className="bg-zinc-950/70 border border-zinc-850 hover:border-zinc-700 transition-colors p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="space-y-1 text-center sm:text-right w-full sm:w-auto">
                        <div className="font-bold text-white text-base flex flex-col sm:flex-row items-center gap-2">
                          <span className="truncate max-w-xs">{act.activity_name}</span>
                          <a href={act.activity_link} target="_blank" rel="noreferrer" className="text-[10px] bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded text-[var(--neon-green)] hover:underline">عرض الرابط ↗</a>
                        </div>
                        <div className="text-xs text-zinc-500">
                          تاريخ الرفع: {new Date(act.created_at).toLocaleDateString("en-GB")}
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        {act.status === "pending" ? (
                          <span className="inline-flex items-center px-3 py-1 rounded text-[11px] font-bold bg-yellow-950/60 text-yellow-300 border border-yellow-800/50 animate-pulse">
                            ⏳ قيد المراجعة
                          </span>
                        ) : act.status === "approved" ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded text-[11px] font-bold bg-green-950/60 text-green-300 border border-green-800/50">
                              ✅ معتمد
                            </span>
                            <span className="text-[10px] font-black text-black bg-[var(--neon-green)] px-2 py-0.5 rounded">
                              +{act.approved_points} نقطة / {act.approved_km} كم
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded text-[11px] font-bold bg-red-950/60 text-red-300 border border-red-800/50">
                            ❌ مرفوض
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Pagination Controls */}
                  {totalActivityPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t border-zinc-800/50">
                      <button 
                        disabled={currentPageActivities === 1}
                        onClick={() => setCurrentPageActivities(prev => Math.max(prev - 1, 1))}
                        className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 text-xs font-bold"
                      >
                        السابق
                      </button>
                      <span className="text-xs text-zinc-500 font-mono">
                        {currentPageActivities} / {totalActivityPages}
                      </span>
                      <button 
                        disabled={currentPageActivities === totalActivityPages}
                        onClick={() => setCurrentPageActivities(prev => Math.min(prev + 1, totalActivityPages))}
                        className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 text-xs font-bold"
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Modification Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => router.push("/register")}
                className="flex-1 py-4 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-200 hover:text-white rounded-2xl text-sm font-extrabold cursor-pointer transition-all duration-300"
              >
                تعديل بيانات الملف الشخصي ⚙️
              </button>
              
              <button
                onClick={() => setShowNewsModal(true)}
                className="flex-1 py-4 bg-zinc-950 border border-[var(--neon-green)]/30 hover:bg-zinc-900 text-[var(--neon-green)] hover:text-white rounded-2xl text-sm font-extrabold cursor-pointer transition-all duration-300"
              >
                ➕ رفع خبر أو إنجاز للفريق
              </button>

              {localStorage.getItem("ewt_is_admin") === "true" && (
                <button
                  onClick={() => router.push("/admin")}
                  className="flex-1 py-4 bg-gradient-to-l from-[var(--neon-green)]/15 to-[#00ff88]/15 hover:from-[var(--neon-green)]/20 hover:to-[#00ff88]/20 border border-[var(--neon-green)]/30 text-[var(--neon-green)] hover:text-white rounded-2xl text-sm font-black italic tracking-wide cursor-pointer transition-all duration-300"
                >
                  الذهاب للوحة الإدارة ⚙️
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help Modal */}
      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0e1014] border border-zinc-800 rounded-2xl p-6 max-w-4xl w-full h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800/80 sticky top-0 bg-[#0e1014] z-10">
              <h3 className="text-xl font-bold text-[var(--neon-green)] flex items-center gap-1.5 glowing-text">
                ❓ آلية احتساب النقاط وتوزيعها
              </h3>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-zinc-500 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>📅</span> نقاط الفعاليات (المشي الجماعي)</h3>
                <p className="text-zinc-400 leading-relaxed">عند انتهاء أي فعالية رسمية للفريق تنضم إليها وتحضرها، يتم منحك مكافأة "النقاط" و "الكيلومترات" المخصصة للفعالية آلياً.</p>
              </div>
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>🚶</span> نقاط الكيلومتر (النشاط الحر)</h3>
                <p className="text-zinc-400 leading-relaxed">بإمكانك تسجيل نشاط مشي حر وإرفاق رابط (مثل Strava). بعد مراجعة النشاط واعتماد الكيلومترات من الإدارة، يتم ضرب عدد الكيلومترات في "معدل نقاط الكيلومتر" وتُضاف لرصيدك.</p>
              </div>
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>🎯</span> تحقيق الهدف الشهري</h3>
                <p className="text-zinc-400 leading-relaxed">يتم منح نقاط إضافية عندما تتمكن من إكمال تحدي الوصول إلى عدد محدد من الكيلومترات خلال الشهر الواحد (مثل 50 كم).</p>
              </div>
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>🔥</span> نقاط الاستمرارية (Streak)</h3>
                <p className="text-zinc-400 leading-relaxed">مكافأة الانضباط اليومي! تحصل عليها عندما تُكمل المشي لمدة 7 أيام متتالية، وهناك جائزة كبرى أيضاً عند إتمام 30 يوماً من المشي المستمر.</p>
              </div>
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>🏆</span> أبطال لوحة الصدارة</h3>
                <p className="text-zinc-400 leading-relaxed">في نهاية الدورة التقييمية (سواء كانت أسبوعية أو شهرية)، يحصل الأعضاء أصحاب المراكز (الأول، الثاني، والثالث) على جوائز ونقاط مضاعفة تقديراً لجهودهم.</p>
              </div>
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>🌟</span> المحتوى المعتمد والقصة الملهمة</h3>
                <p className="text-zinc-400 leading-relaxed">شارك قصتك الملهمة أو إنجازك في المشي عبر زر "رفع خبر أو إنجاز". بمجرد أن تعتمد الإدارة مشاركتك وتنشرها على حائط الأخبار، تُضاف إلى رصيدك تلقائياً "نقاط المحتوى المعتمد" كمكافأة تحفيزية (تُمنح مرة واحدة لكل مشاركة).</p>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center">
              <button 
                onClick={() => setShowHelpModal(false)}
                className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                حسناً، فهمت الآلية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0e1014] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-zinc-800/80 sticky top-0 bg-[#0e1014] z-10">
              <h3 className="text-lg font-bold text-[var(--neon-green)] italic tracking-wide">
                معلومات الفعالية 📍
              </h3>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-zinc-500 hover:text-white text-xl font-black w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {selectedEvent.image && (
                <div className="w-full h-48 rounded-xl overflow-hidden relative">
                  <img src={selectedEvent.image} alt={selectedEvent.name_ar} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e1014] to-transparent opacity-50"></div>
                </div>
              )}

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">{selectedEvent.name_ar}</h2>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black bg-[var(--neon-green)]/15 text-[var(--neon-green)] border border-[var(--neon-green)]/30 uppercase tracking-wider skew-x-[-6deg]">
                    المكافأة: ⭐ {selectedEvent.points} نقطة
                  </span>
                  {selectedEvent.km > 0 && (
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/30 uppercase tracking-wider skew-x-[-6deg]">
                      المسافة المقررة: 🏃 {selectedEvent.km} كم
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <h4 className="font-bold text-white text-sm">التفاصيل والتعليمات:</h4>
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-semibold">
                  {selectedEvent.description_ar || "لا توجد تفاصيل إضافية مسجلة لهذه الفعالية."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <h4 className="font-bold text-white text-sm">📅 الزمان:</h4>
                  <p className="text-zinc-400 text-sm">
                    {selectedEvent.event_date ? new Date(selectedEvent.event_date).toLocaleDateString("ar-SA", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "غير محدد"}
                  </p>
                  <p className="text-zinc-400 text-sm">
                    {selectedEvent.event_time ? `الساعة: ${selectedEvent.event_time}` : ""}
                  </p>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <h4 className="font-bold text-white text-sm">📍 المكان:</h4>
                  <p className="text-zinc-400 text-sm">{selectedEvent.location_name || "غير محدد"}</p>
                  {selectedEvent.location_url && (
                    <a 
                      href={selectedEvent.location_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block mt-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-[var(--neon-green)] hover:text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      فتح في خرائط جوجل ↗
                    </a>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer (Action) */}
            <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 flex justify-end gap-3 sticky bottom-0">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl transition-colors"
              >
                إغلاق
              </button>
              
              {!selectedEvent.is_expired && selectedEvent.attendance_status === null && (
                <button
                  onClick={() => {
                    handleRegisterAttendance(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                  className="px-8 py-2.5 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-extrabold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                >
                  تأكيد حضوري للفعالية ⚡
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Activity Upload Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)] sticky top-0 bg-[var(--card-bg)] z-10">
              <h3 className="text-lg font-bold text-[var(--neon-green)] flex items-center gap-1.5 glowing-text">
                <Upload className="w-5 h-5" /> رفع نشاط رياضي
              </h3>
              <button
                onClick={() => setShowActivityModal(false)}
                className="text-theme-muted hover:text-theme text-xl font-black w-8 h-8 flex items-center justify-center rounded-full bg-[var(--card-hover-bg)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitActivity} className="p-6 space-y-5">
              <p className="text-xs text-theme-sec leading-relaxed bg-[var(--card-hover-bg)] border border-[var(--border-color)] rounded-xl p-3">
                شاركنا مسارك اليومي من تطبيقات الرياضة (Strava، Garmin، وغيرها). الإدارة ستقوم بفرز واعتماد المسافة التي قطعتها وإضافتها لإحصائياتك ونقاطك.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-theme-muted uppercase tracking-wider block">اسم أو عنوان النشاط</label>
                <input
                  type="text"
                  required
                  value={activityForm.name}
                  onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-theme focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] outline-none transition-all placeholder:text-theme-muted"
                  placeholder="مثال: مشي حول حديقة الحي"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-theme-muted uppercase tracking-wider block">رابط النشاط (Strava وغيرها)</label>
                <input
                  type="url"
                  required
                  value={activityForm.link}
                  onChange={(e) => setActivityForm({ ...activityForm, link: e.target.value })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-theme focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] outline-none transition-all placeholder:text-theme-muted font-mono text-left"
                  dir="ltr"
                  placeholder="https://www.strava.com/activities/..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-theme-muted uppercase tracking-wider block">المسافة التقريبية (كم) — اختياري</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={activityForm.km}
                  onChange={(e) => setActivityForm({ ...activityForm, km: e.target.value })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-theme focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] outline-none transition-all placeholder:text-theme-muted text-center"
                  placeholder="مثال: 5.2 — تساعد الإدارة على مراجعة أسرع"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingActivity}
                  className="flex-1 py-3 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-black text-sm rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                >
                  {submittingActivity ? "جاري الإرسال..." : "رفع النشاط للاعتماد 🚀"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="flex-1 py-3 bg-transparent border border-[var(--border-color)] text-theme-sec hover:text-theme text-sm rounded-xl cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* News / Achievement Submission Modal */}
      {showNewsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0e1014] border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800/80 sticky top-0 bg-[#0e1014] z-10">
              <h3 className="text-lg font-bold text-[var(--neon-green)] flex items-center gap-1.5 glowing-text">
                ➕ مشاركة خبر أو إنجاز
              </h3>
              <button
                onClick={() => setShowNewsModal(false)}
                className="text-zinc-500 hover:text-white text-xl font-black w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNews} className="p-6 space-y-5">
              <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
                شاركنا إنجازك أو قصتك الملهمة في المشي. ستظهر مشاركتك على حائط الأخبار بعد مراجعتها واعتمادها من الإدارة.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">عنوان الخبر / الإنجاز</label>
                <input
                  type="text"
                  required
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] outline-none transition-all placeholder:text-zinc-600"
                  placeholder="مثال: أكملت أول 100 كم!"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">المحتوى</label>
                <textarea
                  required
                  rows={5}
                  value={newsForm.content}
                  onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] outline-none transition-all resize-y placeholder:text-zinc-600"
                  placeholder="اكتب تفاصيل إنجازك أو قصتك هنا..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">صورة مرفقة (اختياري)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewsImage(e.target.files[0] || null)}
                  className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-[var(--neon-green)] hover:file:bg-zinc-700 cursor-pointer"
                />
                {newsImage && (
                  <span className="text-[10px] text-zinc-500 block">الصورة المختارة: {newsImage.name}</span>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingNews}
                  className="flex-1 py-3 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-black text-sm rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                >
                  {submittingNews ? "جاري الإرسال..." : "إرسال للمراجعة 🚀"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewsModal(false)}
                  className="flex-1 py-3 bg-transparent border border-zinc-800 text-zinc-400 hover:text-white text-sm rounded-xl cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

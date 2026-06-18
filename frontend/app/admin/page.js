"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Logo from "../../components/Logo";

const MapPicker = dynamic(() => import("../../components/MapPicker"), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReviewer, setIsReviewer] = useState(false);
  const [isContentManager, setIsContentManager] = useState(false);
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null); // stores mobile of user currently being updated
  
  // Tab Navigation State
  const [activeTab, setActiveTab] = useState("activity_review"); // default to new tab
  
  // News State
  const [pendingNews, setPendingNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  
  // Locations State
  const [locations, setLocations] = useState([]);
  const [importing, setImporting] = useState(false);
  
  // Walk registration states
  const [showWalkModal, setShowWalkModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [walkKm, setWalkKm] = useState("");
  const [pointsOption, setPointsOption] = useState("1"); // "1", "2", "custom"
  const [customPoints, setCustomPoints] = useState("");
  const [walkDescription, setWalkDescription] = useState("نشاط مشي معتمد");

  // Points adjustment (bonus) states
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsReason, setPointsReason] = useState("");

  const [events, setEvents] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [adminActivities, setAdminActivities] = useState([]);
  const [reviewActivity, setReviewActivity] = useState(null); // The activity being reviewed
  const [activityLoading, setActivityLoading] = useState(null); // id of activity being updated
  const [newEvent, setNewEvent] = useState({
    name_ar: "",
    name_en: "",
    description_ar: "",
    description_en: "",
    points: 0,
    km: 0.0,
    event_date: "",
    event_time: "",
    location_name: "",
    location_url: "",
    is_active: true
  });
  const [eventImage, setEventImage] = useState(null);
  const [eventImagePreview, setEventImagePreview] = useState("");
  const [createEventLoading, setCreateEventLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(null);

  // Points Settings State
  const [pointsSettings, setPointsSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("ewt_token");
    const adminCheck = localStorage.getItem("ewt_is_admin") === "true";
    const reviewerCheck = localStorage.getItem("ewt_is_reviewer") === "true";
    const contentManagerCheck = localStorage.getItem("ewt_is_content_manager") === "true";
    
    if (!savedToken || (!adminCheck && !reviewerCheck && !contentManagerCheck)) {
      router.push("/");
    } else {
      setToken(savedToken);
      setIsAdmin(adminCheck);
      setIsReviewer(reviewerCheck);
      setIsContentManager(contentManagerCheck);
      
      if (!adminCheck) {
        if (reviewerCheck) {
          setActiveTab("activity_review");
        } else if (contentManagerCheck) {
          setActiveTab("news");
        }
        setLoading(false);
      }
      
      if (adminCheck) {
        fetchMembers(savedToken);
        fetchCategories(savedToken);
        fetchAdminEvents(savedToken);
        fetchAdminAttendances(savedToken);
        fetchLocations(savedToken);
        fetchPointsSettings(savedToken);
      }
      if (adminCheck || reviewerCheck) fetchAdminActivities(savedToken);
      if (adminCheck || contentManagerCheck) fetchPendingNews(savedToken);
    }
  }, [router]);

  const fetchPendingNews = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/admin/news/pending/`, {
        headers: { Authorization: `Token ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPendingNews(data);
      }
    } catch (err) {
      console.error("Error fetching pending news:", err);
    }
  };

  const handleReviewNews = async (postId, statusVal) => {
    if (!window.confirm(statusVal === 'approved' ? "هل أنت متأكد من قبول الخبر ونشره؟" : "هل أنت متأكد من رفض الخبر؟")) return;
    setNewsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/admin/news/review/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ post_id: postId, status: statusVal }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.detail || "تم تحديث حالة الخبر بنجاح.");
        fetchPendingNews(token);
      } else {
        alert(data.detail || "فشل تحديث حالة الخبر.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال.");
    } finally {
      setNewsLoading(false);
    }
  };

  const fetchPointsSettings = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/admin/points-settings/`, {
        headers: { Authorization: `Token ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPointsSettings(data);
      }
    } catch (err) {
      console.error("Error fetching points settings:", err);
    }
  };

  const fetchLocations = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/admin/event-locations/`, {
        headers: { Authorization: `Token ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setLocations(data);
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
    }
  };

  const fetchCategories = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/categories/`, {
        headers: {
          Authorization: `Token ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setCategories(data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchMembers = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/admin/members/`, {
        headers: {
          Authorization: `Token ${authToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setMembers(data);
      } else {
        setError("تعذر تحميل قائمة الأعضاء. تأكد من صلاحيات الإدارة.");
      }
    } catch (err) {
      setError("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminEvents = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/admin/events/`, {
        headers: {
          Authorization: `Token ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setEvents(data);
      }
    } catch (err) {
      console.error("Error fetching admin events:", err);
    }
  };

  const fetchAdminAttendances = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/admin/event-attendees/`, {
        headers: {
          Authorization: `Token ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setAttendances(data);
      }
    } catch (err) {
      console.error("Error fetching admin attendances:", err);
    }
  };

  const fetchAdminActivities = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/admin/activities/`, {
        headers: {
          Authorization: `Token ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setAdminActivities(data);
      }
    } catch (err) {
      console.error("Error fetching admin activities:", err);
    }
  };

  const handleReviewActivity = async (e) => {
    e.preventDefault();
    if (!reviewActivity) return;
    
    setActivityLoading(reviewActivity.id);
    try {
      const res = await fetch(`${API_URL}/api/users/admin/activities/${reviewActivity.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          status: reviewActivity.status,
          approved_km: reviewActivity.approved_km,
          approved_points: reviewActivity.approved_points,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("تم تحديث حالة النشاط بنجاح!");
        setReviewActivity(null);
        fetchAdminActivities(token);
      } else {
        alert(data.detail || "فشل تحديث النشاط.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setActivityLoading(null);
    }
  };

  const handleToggleApproval = async (mobile, currentApprovalStatus) => {
    setActionLoading(mobile);
    try {
      const res = await fetch(`${API_URL}/api/users/admin/members/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          mobile,
          is_approved: !currentApprovalStatus,
        }),
      });

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.mobile === mobile ? { ...m, is_approved: !currentApprovalStatus } : m
          )
        );
      } else {
        const data = await res.json();
        alert(data.detail || "فشل تحديث حالة العضو.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleReviewer = async (mobile, currentReviewerStatus) => {
    setActionLoading(mobile);
    try {
      const res = await fetch(`${API_URL}/api/users/admin/members/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          mobile,
          is_reviewer: !currentReviewerStatus,
        }),
      });

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.mobile === mobile ? { ...m, is_reviewer: !currentReviewerStatus } : m
          )
        );
        alert("تم تحديث صلاحية المراجع بنجاح");
      } else {
        const data = await res.json();
        alert(data.detail || "فشل تحديث صلاحية المراجع.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleContentManager = async (mobile, currentStatus) => {
    setActionLoading(mobile);
    try {
      const res = await fetch(`${API_URL}/api/users/admin/members/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          mobile,
          is_content_manager: !currentStatus,
        }),
      });

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.mobile === mobile ? { ...m, is_content_manager: !currentStatus } : m
          )
        );
        alert("تم تحديث صلاحية مدير المحتوى بنجاح");
      } else {
        const data = await res.json();
        alert(data.detail || "فشل تحديث الصلاحية.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCategoryChange = async (mobile, categoryId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/admin/members/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          mobile,
          category_id: categoryId === "" ? null : categoryId,
        }),
      });

      if (res.ok) {
        const selectedCat = categories.find(c => c.id === parseInt(categoryId));
        setMembers((prev) =>
          prev.map((m) =>
            m.mobile === mobile ? { 
              ...m, 
              category: categoryId === "" ? null : parseInt(categoryId),
              category_name: selectedCat ? selectedCat.name : "الشباب",
              category_code: selectedCat ? selectedCat.code : "youth",
              is_category_manual: categoryId !== ""
            } : m
          )
        );
      } else {
        const data = await res.json();
        alert(data.detail || "فشل تغيير الفئة.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم.");
    }
  };

  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    if (!selectedMember || !pointsAmount || !pointsReason) return;
    
    setActionLoading(selectedMember.mobile);
    try {
      const res = await fetch(`${API_URL}/api/users/admin/add-points/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          mobile: selectedMember.mobile,
          amount: parseInt(pointsAmount),
          description: pointsReason,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMembers((prev) =>
          prev.map((m) =>
            m.mobile === selectedMember.mobile ? { ...m, points: data.points } : m
          )
        );
        setShowPointsModal(false);
        alert(data.detail);
      } else {
        const data = await res.json();
        alert(data.detail || "فشل إضافة نقاط المكافأة.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegisterWalk = async (e) => {
    e.preventDefault();
    if (!selectedMember || !walkKm || !walkDescription) return;

    const kmFloat = parseFloat(walkKm);
    if (isNaN(kmFloat) || kmFloat < 0) {
      alert("الرجاء إدخال مسافة صالحة.");
      return;
    }

    let pointsToAward = 0;
    if (pointsOption === "1") {
      pointsToAward = Math.round(kmFloat * 1);
    } else if (pointsOption === "2") {
      pointsToAward = Math.round(kmFloat * 2);
    } else if (pointsOption === "custom") {
      pointsToAward = parseInt(customPoints);
      if (isNaN(pointsToAward) || pointsToAward < 0) {
        alert("الرجاء إدخال نقاط مخصصة صالحة.");
        return;
      }
    }

    setActionLoading(selectedMember.mobile);
    try {
      const res = await fetch(`${API_URL}/api/users/admin/add-walk/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          mobile: selectedMember.mobile,
          km: kmFloat,
          points: pointsToAward,
          description: walkDescription,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMembers((prev) =>
          prev.map((m) =>
            m.mobile === selectedMember.mobile
              ? { 
                  ...m, 
                  total_km: data.total_km.toFixed(2), 
                  points: data.points,
                  level_number: data.level_number,
                  level_name_ar: data.level_name_ar
                }
              : m
          )
        );
        setShowWalkModal(false);
        alert(data.detail);
      } else {
        const data = await res.json();
        alert(data.detail || "فشل تسجيل النشاط.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreateEventLoading(true);

    if (newEvent.event_date) {
      const selectedDate = new Date(newEvent.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        alert("تاريخ الفعالية لا يمكن أن يكون في الماضي.");
        setCreateEventLoading(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append("name_ar", newEvent.name_ar);
    formData.append("name_en", newEvent.name_en);
    formData.append("description_ar", newEvent.description_ar || "");
    formData.append("description_en", newEvent.description_en || "");
    formData.append("points", newEvent.points);
    formData.append("km", newEvent.km);
    formData.append("is_active", String(newEvent.is_active));
    if (newEvent.event_date) formData.append("event_date", newEvent.event_date);
    if (newEvent.event_time) formData.append("event_time", newEvent.event_time);
    if (newEvent.location_name) formData.append("location_name", newEvent.location_name);
    if (newEvent.location_url) formData.append("location_url", newEvent.location_url);
    if (eventImage) {
      formData.append("image", eventImage);
    }

    try {
      const res = await fetch(`${API_URL}/api/users/admin/events/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.detail);
        setNewEvent({
          name_ar: "",
          name_en: "",
          description_ar: "",
          description_en: "",
          points: 0,
          km: 0.0,
          event_date: "",
          event_time: "",
          location_name: "",
          location_url: "",
          is_active: true
        });
        setEventImage(null);
        setEventImagePreview("");
        fetchAdminEvents(token);
      } else {
        alert(data.detail || "فشل إنشاء الفعالية.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setCreateEventLoading(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const term = search.toLowerCase();
    return (
      m.name?.toLowerCase().includes(term) ||
      m.mobile?.toLowerCase().includes(term) ||
      m.city?.toLowerCase().includes(term)
    );
  });

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

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/users/admin/import-members/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.detail);
        fetchMembers(token); // refresh table
      } else {
        alert(data.detail || "فشل الاستيراد.");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setImporting(false);
      e.target.value = ""; // reset input
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#060709] text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--neon-green)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-zinc-400">جاري تحميل لوحة التحكم الإدارية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060709] bg-shoe-prints bg-speed-lines text-white p-6 md:p-12 relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[var(--neon-green)]/3 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#00f2fe]/3 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-8 z-10 relative">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 pb-6 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-3">
              <Logo height={44} />
              <h1 className="text-3xl font-black italic tracking-wide glowing-text">لوحة إدارة ومراقبة المنصة</h1>
            </div>
            <p className="text-xs text-zinc-400 mt-2 font-medium">التحكم بالأعضاء، الفئات، الفعاليات، وتأكيد الحضور الرياضي</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-[var(--neon-green)]/50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all duration-300"
            >
              🏠 الرئيسية
            </button>
            <button
              onClick={() => router.push("/leaderboard")}
              className="px-5 py-2.5 bg-zinc-950 border border-[var(--neon-green)]/50 hover:bg-[var(--neon-green)]/10 text-[var(--neon-green)] rounded-xl text-xs font-bold cursor-pointer transition-all duration-300 shadow-[0_0_10px_rgba(204,255,0,0.2)]"
            >
              🏆 لوحة الصدارة
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="px-5 py-2.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all duration-300"
            >
              ملفي الشخصي 👤
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 border border-red-950 text-red-400 hover:bg-red-950/20 rounded-xl text-xs font-bold cursor-pointer transition-all duration-300"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-500/50 text-red-200 text-sm px-4 py-3 rounded-lg text-right">
            {error}
          </div>
        )}

        {/* Dynamic Sports Tabs */}
        <div className="flex gap-4 border-b border-zinc-800/80 pb-1 overflow-x-auto whitespace-nowrap hide-scrollbar">
          <button
            onClick={() => setActiveTab("activity_review")}
            className={`py-3 px-6 text-sm font-black italic tracking-wider transition-all duration-300 rounded-t-xl cursor-pointer ${
              activeTab === "activity_review"
                ? "bg-zinc-950/70 border border-zinc-800 border-b-transparent text-[var(--neon-green)] glowing-text border-t-3 border-t-[var(--neon-green)]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            🗺️ مراجعة الأنشطة
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab("members")}
                className={`py-3 px-6 text-sm font-black italic tracking-wider transition-all duration-300 rounded-t-xl cursor-pointer ${
                  activeTab === "members"
                    ? "bg-zinc-950/70 border border-zinc-800 border-b-transparent text-[var(--neon-green)] glowing-text border-t-3 border-t-[var(--neon-green)]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                🏃 إدارة الأعضاء والأنشطة
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`py-3 px-6 text-sm font-black italic tracking-wider transition-all duration-300 rounded-t-xl cursor-pointer ${
                  activeTab === "events"
                    ? "bg-zinc-950/70 border border-zinc-800 border-b-transparent text-[var(--neon-green)] glowing-text border-t-3 border-t-[var(--neon-green)]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                📅 الفعاليات والموافقات
              </button>
              <button
                onClick={() => setActiveTab("locations")}
                className={`py-3 px-6 text-sm font-black italic tracking-wider transition-all duration-300 rounded-t-xl cursor-pointer ${
                  activeTab === "locations"
                    ? "bg-zinc-950/70 border border-zinc-800 border-b-transparent text-[var(--neon-green)] glowing-text border-t-3 border-t-[var(--neon-green)]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                📍 إدارة المواقع
              </button>
              <button
                onClick={() => setActiveTab("points-settings")}
                className={`py-3 px-6 text-sm font-black italic tracking-wider transition-all duration-300 rounded-t-xl cursor-pointer ${
                  activeTab === "points-settings"
                    ? "bg-zinc-950/70 border border-zinc-800 border-b-transparent text-[var(--neon-green)] glowing-text border-t-3 border-t-[var(--neon-green)]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                ⚙️ إعدادات النقاط
              </button>
            </>
          )}
          {(isAdmin || isContentManager) && (
              <button
                onClick={() => setActiveTab("news")}
                className={`py-3 px-6 text-sm font-black italic tracking-wider transition-all duration-300 rounded-t-xl cursor-pointer ${
                  activeTab === "news"
                    ? "bg-zinc-950/70 border border-zinc-800 border-b-transparent text-[var(--neon-green)] glowing-text border-t-3 border-t-[var(--neon-green)]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                📰 مراجعة الأخبار
              </button>
          )}
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab("help")}
                className={`py-3 px-6 text-sm font-black italic tracking-wider transition-all duration-300 rounded-t-xl cursor-pointer ${
                  activeTab === "help"
                    ? "bg-zinc-950/70 border border-zinc-800 border-b-transparent text-[var(--neon-green)] glowing-text border-t-3 border-t-[var(--neon-green)]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                ❓ المساعدة والشرح
              </button>
            </>
          )}
        </div>

        {/* Tab: Activity Review */}
        {activeTab === "activity_review" && (
          <div className="space-y-8">
            <div className="sport-glass-card p-6 md:p-8 space-y-6">
              <div className="pb-3 border-b border-zinc-800/60 flex justify-between items-center">
                <h3 className="text-xl font-black italic text-white flex items-center gap-2">
                  <span>🗺️</span> طلبات الأنشطة الحرة المعلقة
                </h3>
                <span className="text-xs text-zinc-900 font-bold bg-[var(--neon-green)] px-3 py-1 rounded-full shadow-[0_0_10px_rgba(76,217,100,0.3)]">
                  {adminActivities.filter(a => a.status === "pending").length} طلبات معلقة
                </span>
              </div>

              {adminActivities.filter(a => a.status === "pending").length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-12">لا توجد طلبات أنشطة حرة معلقة حالياً.</p>
              ) : (
                <div className="space-y-4">
                  {adminActivities.filter(a => a.status === "pending").map((act) => (
                    <div 
                      key={act.id}
                      className="bg-zinc-950/70 border border-zinc-850 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-zinc-800 transition-all duration-300"
                    >
                      <div className="space-y-1.5 w-full sm:w-auto text-right">
                        <div className="font-bold text-white text-base">{act.user_name} <span className="text-xs text-zinc-500 font-mono tracking-wide">({act.user_mobile})</span></div>
                        <div className="text-sm font-bold text-[var(--neon-green)]">{act.activity_name}</div>
                        <div className="text-xs text-zinc-400">
                          المسافة التقريبية (من العضو): <span className="text-white font-bold">{act.claimed_km || "غير محدد"} كم</span>
                        </div>
                      </div>

                      <div className="flex gap-3 w-full sm:w-auto">
                        <a 
                          href={act.activity_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none px-6 py-2 bg-[#fc4c02] hover:bg-[#e34402] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors text-center flex items-center justify-center"
                        >
                          رابط النشاط 🔗
                        </a>
                        <button
                          onClick={() => {
                            setReviewActivity({
                              ...act,
                              approved_km: act.claimed_km || "",
                              approved_points: "" // leave blank → server computes points from the configured km rate
                            });
                          }}
                          className="flex-1 sm:flex-none px-6 py-2 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black rounded-xl text-xs font-bold cursor-pointer transition-colors"
                        >
                          مراجعة واعتماد 🔎
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 1: Members Management */}
        {activeTab === "members" && (
          <div className="space-y-8">
            {/* Stats Cards & Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#0e1014]/80 border border-zinc-850 p-5 rounded-2xl shadow-md">
                <span className="text-zinc-500 text-xs font-bold block mb-1">إجمالي الأعضاء</span>
                <span className="text-3xl font-black text-white">{members.length}</span>
              </div>
              <div className="bg-[#0e1014]/80 border border-zinc-850 p-5 rounded-2xl shadow-md">
                <span className="text-zinc-500 text-xs font-bold block mb-1">الأعضاء المفعلين</span>
                <span className="text-3xl font-black text-[var(--neon-green)]">
                  {members.filter((m) => m.is_approved).length}
                </span>
              </div>
              <div className="bg-[#0e1014]/80 border border-zinc-850 p-5 rounded-2xl shadow-md">
                <span className="text-zinc-500 text-xs font-bold block mb-1">بانتظار التفعيل</span>
                <span className="text-3xl font-black text-yellow-500">
                  {members.filter((m) => !m.is_approved).length}
                </span>
              </div>
              <div className="flex flex-col gap-2 justify-end">
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الجوال أو المدينة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#0e1014] border border-zinc-850 text-white rounded-xl focus:border-[var(--neon-green)] text-xs font-semibold"
                />
                <label className="w-full px-4 py-3.5 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-800 text-blue-200 rounded-xl text-xs font-bold cursor-pointer text-center transition-all duration-300">
                  {importing ? "جاري الاستيراد..." : "📥 استيراد من إكسيل (Excel)"}
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleImportExcel}
                    disabled={importing}
                  />
                </label>
              </div>
            </div>

            {/* Members Table */}
            <div className="bg-[#0e1014]/80 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm md:text-base">
                  <thead>
                    <tr className="border-b border-zinc-850 bg-zinc-950/40 text-zinc-400">
                      <th className="p-6 font-bold">العضو</th>
                      <th className="p-6 font-bold">رقم الجوال</th>
                      <th className="p-6 font-bold">المدينة / الجنس / العمر</th>
                      <th className="p-6 font-bold">النشاط</th>
                      <th className="p-6 font-bold">ذوي الهمم</th>
                      <th className="p-6 font-bold">الفئة / المستوى</th>
                      <th className="p-6 font-bold text-center">النقاط</th>
                      <th className="p-6 font-bold">بيانات صحية</th>
                      <th className="p-6 font-bold text-center">التفعيل</th>
                      <th className="p-6 font-bold text-center">مُراجع أنشطة</th>
                      <th className="p-6 font-bold text-center">مدير محتوى</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {filteredMembers.map((m) => (
                      <tr key={m.mobile} className="hover:bg-zinc-900/10 transition-colors">
                        {/* Member Info */}
                        <td className="p-6 flex items-center space-x-4 space-x-reverse">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-700 bg-zinc-950 flex-shrink-0 animate-pulse-glow">
                            {m.avatar ? (
                              <img src={m.avatar.startsWith("http") ? m.avatar : `${API_URL}${m.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl bg-zinc-900">👤</div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white text-base">{m.name}</div>
                            <div className="text-xs text-zinc-400 mt-1">
                              تاريخ التسجيل: {new Date(m.created_at || m.date_joined).toLocaleDateString("en-GB")}
                            </div>
                          </div>
                        </td>

                        {/* Mobile */}
                        <td className="p-6 font-mono text-zinc-300 text-sm" dir="ltr">
                          {m.mobile}
                        </td>

                        {/* City/Gender */}
                        <td className="p-6">
                          <div className="font-semibold text-zinc-200">{m.city || "—"}</div>
                          <div className="text-xs text-zinc-400 mt-1 flex flex-col gap-1">
                            <span>{m.gender === "male" ? "ذكر" : m.gender === "female" ? "أنثى" : "—"}</span>
                            <span>العمر: {m.age ? `${m.age} سنة` : "غير محدد"}</span>
                            {m.birth_date && <span className="text-[10px] text-zinc-600">({m.birth_date})</span>}
                          </div>
                        </td>

                        {/* Preferred Activity */}
                        <td className="p-6">
                          <span className="font-bold text-zinc-200">
                            {m.preferred_activity === "walk" ? "🚶 مشي" : 
                             m.preferred_activity === "run" ? "🏃 جري" : 
                             m.preferred_activity === "both" ? "🚶🏃 الاثنين" : "—"}
                          </span>
                        </td>

                        {/* Special Needs */}
                        <td className="p-6 text-sm">
                          {m.is_disabled ? (
                            <span className="text-[var(--neon-green)] font-bold">✓ نعم</span>
                          ) : (
                            <span className="text-zinc-500">لا</span>
                          )}
                        </td>

                        {/* Category & Level Progression */}
                        <td className="p-6">
                          <div className="space-y-2 min-w-[160px]">
                            <div className="text-xs text-zinc-300 font-medium">
                              🏅 المستوى {m.level_number || 1}: {m.level_name_ar || "مبتدئ"}
                              <span className="text-zinc-500 block mt-0.5">({m.total_km || "0.00"} كم)</span>
                            </div>
                            <select
                              value={m.category || ""}
                              onChange={(e) => handleCategoryChange(m.mobile, e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:border-[var(--neon-green)] focus:ring-0 cursor-pointer"
                            >
                              <option value="">-- تصنيف تلقائي --</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                            {m.is_category_manual && (
                              <span className="text-xs text-yellow-500 block">✏️ تعديل يدوي</span>
                            )}
                          </div>
                        </td>

                        {/* Points Column */}
                        <td className="p-6 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <span className="font-extrabold text-white text-base">{m.points || 0} ⭐</span>
                            <button
                              onClick={() => {
                                setSelectedMember(m);
                                setPointsAmount("");
                                setPointsReason("");
                                setShowPointsModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-[var(--neon-green)] rounded-lg hover:bg-zinc-850 cursor-pointer transition-colors w-24 text-center font-semibold"
                            >
                              + نقاط
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMember(m);
                                setWalkKm("");
                                setPointsOption("1");
                                setCustomPoints("");
                                setWalkDescription("نشاط مشي معتمد");
                                setShowWalkModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-[var(--neon-green)] rounded-lg hover:bg-zinc-850 cursor-pointer transition-colors w-24 text-center font-semibold"
                            >
                              + نشاط
                            </button>
                          </div>
                        </td>

                        {/* Health Details (Secret info displayed to Admin) */}
                        <td className="p-6 max-w-md">
                          {m.weight || m.health_notes ? (
                            <div className="space-y-1.5">
                              {m.weight && (
                                <div className="text-xs text-zinc-300 font-semibold">الوزن: {m.weight} كجم</div>
                              )}
                              {m.health_notes && (
                                <div className="text-xs text-zinc-400 italic truncate max-w-[200px]" title={m.health_notes}>
                                  {m.health_notes}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>

                        {/* Approval Action */}
                        <td className="p-6 text-center">
                          <button
                            onClick={() => handleToggleApproval(m.mobile, m.is_approved)}
                            disabled={actionLoading === m.mobile}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              m.is_approved
                                ? "bg-green-950 text-green-300 hover:bg-green-900 border border-green-800"
                                : "bg-yellow-950 text-yellow-300 hover:bg-yellow-900 border border-yellow-800"
                            } disabled:opacity-50`}
                          >
                            {actionLoading === m.mobile
                              ? "جاري..."
                              : m.is_approved
                              ? "مفعّل (تعطيل)"
                              : "غير مفعّل (تفعيل)"}
                          </button>
                        </td>

                        {/* Reviewer Action */}
                        <td className="p-6 text-center">
                          <button
                            onClick={() => handleToggleReviewer(m.mobile, m.is_reviewer)}
                            disabled={actionLoading === m.mobile}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              m.is_reviewer
                                ? "bg-purple-950 text-purple-300 hover:bg-purple-900 border border-purple-800"
                                : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800 border border-zinc-800"
                            } disabled:opacity-50`}
                          >
                            {actionLoading === m.mobile
                              ? "جاري..."
                              : m.is_reviewer
                              ? "مُراجع (إلغاء)"
                              : "لا (تفعيل)"}
                          </button>
                        </td>

                        {/* Content Manager Action */}
                        <td className="p-6 text-center">
                          <button
                            onClick={() => handleToggleContentManager(m.mobile, m.is_content_manager)}
                            disabled={actionLoading === m.mobile}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              m.is_content_manager
                                ? "bg-yellow-950 text-yellow-300 hover:bg-yellow-900 border border-yellow-800"
                                : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800 border border-zinc-800"
                            } disabled:opacity-50`}
                          >
                            {actionLoading === m.mobile
                              ? "جاري..."
                              : m.is_content_manager
                              ? "مدير (إلغاء)"
                              : "لا (تفعيل)"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Events & Attendance Approvals */}
        {activeTab === "events" && (
          <div className="space-y-12">
            
            {/* Create Event Card (Top) */}
            <div className="sport-glass-card p-6 md:p-8 space-y-6">
              <div className="pb-3 border-b border-zinc-800/60">
                <h3 className="text-xl font-black italic text-[var(--neon-green)] flex items-center gap-2">
                  <span>⭐</span> إدارة وإضافة فعالية جديدة
                </h3>
                <p className="text-sm text-zinc-400 mt-2">إنشاء فعالية جديدة ليتسنى للأعضاء التسجيل بها واعتماد مسافاتهم الرياضية.</p>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  
                  {/* Right Column: Event Details (span 8) */}
                  <div className="xl:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5">اسم الفعالية بالعربية *</label>
                        <input
                          type="text"
                          placeholder="مثال: فعالية المشي الرمضاني"
                          value={newEvent.name_ar}
                          onChange={(e) => setNewEvent({...newEvent, name_ar: e.target.value})}
                          className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-850 text-sm font-semibold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5">اسم الفعالية بالإنجليزية *</label>
                        <input
                          type="text"
                          placeholder="Example: Ramadan Walk Event"
                          value={newEvent.name_en}
                          onChange={(e) => setNewEvent({...newEvent, name_en: e.target.value})}
                          className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-850 text-sm font-semibold"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5">النقاط المكتسبة *</label>
                        <input
                          type="number"
                          placeholder="50"
                          value={newEvent.points}
                          onChange={(e) => setNewEvent({...newEvent, points: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-850 text-sm font-semibold text-center font-bold text-[var(--neon-green)]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5">المسافة (كم) *</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="5.0"
                          value={newEvent.km}
                          onChange={(e) => setNewEvent({...newEvent, km: parseFloat(e.target.value) || 0.0})}
                          className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-850 text-sm font-semibold text-center font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5">تاريخ الفعالية</label>
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={newEvent.event_date || ""}
                          onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
                          onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                          onFocus={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                          className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-850 text-sm font-semibold text-right cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5">وقت الفعالية</label>
                        <input
                          type="time"
                          value={newEvent.event_time || ""}
                          onChange={(e) => setNewEvent({...newEvent, event_time: e.target.value})}
                          onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                          onFocus={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                          className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-850 text-sm font-semibold text-right cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Location details */}
                    <div className="border border-zinc-850 rounded-xl p-4 bg-zinc-950/30 space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-bold text-[var(--neon-green)]">📍 تحديد موقع الفعالية</h4>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5">اختر موقعاً جاهزاً أو أدخل موقعاً جديداً</label>
                        <select
                          className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-850 text-sm font-semibold rounded-lg focus:border-[var(--neon-green)]"
                          onChange={(e) => {
                            if (e.target.value === "new") {
                              setNewEvent({...newEvent, location_name: "", location_url: ""});
                            } else {
                              const loc = locations.find(l => l.id.toString() === e.target.value);
                              if (loc) {
                                setNewEvent({...newEvent, location_name: loc.name_ar, location_url: loc.location_url});
                              }
                            }
                          }}
                        >
                          <option value="new">➕ موقع جديد (سيتم حفظه تلقائياً)</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name_ar}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="order-2 lg:order-1 space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1.5">اسم موقع الفعالية</label>
                            <input
                              type="text"
                              placeholder="مثال: ممشى كورنيش الخبر"
                              value={newEvent.location_name || ""}
                              onChange={(e) => setNewEvent({...newEvent, location_name: e.target.value})}
                              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-850 text-sm font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1.5">الرابط المولد (Google Maps)</label>
                            <input
                              type="url"
                              placeholder="https://maps.google.com/..."
                              value={newEvent.location_url || ""}
                              onChange={(e) => setNewEvent({...newEvent, location_url: e.target.value})}
                              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-850 text-sm font-semibold text-left ltr focus:border-[var(--neon-green)] text-zinc-400"
                            />
                          </div>
                        </div>

                        <div className="order-1 lg:order-2">
                          <p className="text-xs text-zinc-400 mb-2 font-semibold">اضغط على الخريطة لتحديد الموقع (في حال أردت موقعاً جديداً)</p>
                          <div className="relative z-0 h-48 rounded-lg overflow-hidden border border-zinc-850">
                            <MapPicker
                              onLocationSelected={(latlng) => {
                                const mapsUrl = `https://maps.google.com/?q=${latlng.lat},${latlng.lng}`;
                                setNewEvent(prev => ({ ...prev, location_url: mapsUrl }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5">الوصف بالعربية</label>
                        <textarea
                          placeholder="وصف مختصر للفعالية..."
                          value={newEvent.description_ar}
                          onChange={(e) => setNewEvent({...newEvent, description_ar: e.target.value})}
                          className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 text-sm h-32 md:h-40 resize-y focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] transition-all rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5">الوصف بالإنجليزية</label>
                        <textarea
                          placeholder="Event description in English..."
                          value={newEvent.description_en}
                          onChange={(e) => setNewEvent({...newEvent, description_en: e.target.value})}
                          className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 text-sm h-32 md:h-40 resize-y focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] transition-all rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Left Column: Image & Submit (span 4) */}
                  <div className="xl:col-span-4 bg-zinc-950/40 p-6 rounded-2xl border border-zinc-850 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      {/* Event Image Upload */}
                      <div className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-800 rounded-xl hover:border-[var(--neon-green)]/40 transition-colors bg-zinc-900/20">
                        <span className="text-xs font-bold text-zinc-400 mb-2">صورة الفعالية (اختياري)</span>
                        <label className="relative cursor-pointer group w-full">
                          <div className="w-full h-40 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-950 border border-zinc-850 group-hover:border-[var(--neon-green)] transition-all">
                            {eventImagePreview ? (
                              <img src={eventImagePreview} alt="Event Preview" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-zinc-600 group-hover:text-[var(--neon-green)]">
                                <span className="text-3xl mb-2">📷</span>
                                <span className="text-xs text-center font-semibold">انقر لرفع صورة معبرة للفعالية</span>
                              </div>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setEventImage(file);
                                setEventImagePreview(URL.createObjectURL(file));
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        {eventImagePreview && (
                          <button
                            type="button"
                            onClick={() => {
                              setEventImage(null);
                              setEventImagePreview("");
                            }}
                            className="text-xs text-red-400 hover:text-red-300 mt-3 font-bold cursor-pointer bg-red-950/30 px-3 py-1.5 rounded-lg w-full"
                          >
                            إلغاء الصورة المرفقة
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-5 pt-4 border-t border-zinc-800/50">
                      <div className="flex items-center gap-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-850">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={newEvent.is_active}
                          onChange={(e) => setNewEvent({...newEvent, is_active: e.target.checked})}
                          className="w-6 h-6 accent-[var(--neon-green)] cursor-pointer"
                        />
                        <label htmlFor="isActive" className="text-sm font-bold text-zinc-200 cursor-pointer flex-1">
                          تفعيل الفعالية وتلقي طلبات الحضور فوراً
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={createEventLoading}
                        className="w-full py-4 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-black text-base rounded-xl cursor-pointer transition-all duration-300 disabled:opacity-50 shadow-[0_0_20px_rgba(76,217,100,0.2)] hover:shadow-[0_0_30px_rgba(76,217,100,0.4)]"
                      >
                        {createEventLoading ? "جاري الإنشاء..." : "إنشاء الفعالية واعتمادها 🚀"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Active Events & Attendees List */}
            <div className="sport-glass-card p-6 md:p-8 space-y-6">
              <div className="pb-3 border-b border-zinc-800/60 flex justify-between items-center">
                <h3 className="text-xl font-black italic text-white flex items-center gap-2">
                  <span>🛎️</span> الفعاليات النشطة والمنضمين
                </h3>
                <span className="text-xs text-zinc-900 font-bold bg-[var(--neon-green)] px-3 py-1 rounded-full shadow-[0_0_10px_rgba(76,217,100,0.3)]">
                  {events.filter(e => e.is_active).length} فعاليات نشطة
                </span>
              </div>

              {events.filter(e => e.is_active).length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-12">لا توجد فعاليات نشطة حالياً.</p>
              ) : (
                <div className="space-y-6">
                  {events.filter(e => e.is_active).map((ev) => {
                    const eventAttendees = attendances.filter(a => a.event_id === ev.id);
                    return (
                      <div 
                        key={ev.id}
                        className="bg-zinc-950/70 border border-zinc-850 p-5 rounded-2xl flex flex-col gap-4 hover:border-zinc-800 transition-all duration-300"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-4">
                          <div className="space-y-1 w-full text-right">
                            <div className="font-bold text-white text-lg">{ev.name_ar}</div>
                            <div className="text-xs font-bold text-[var(--neon-green)]">
                              ( {ev.points} نقطة / {ev.km} كم ) • {eventAttendees.length} منضمين
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if(window.confirm(`هل أنت متأكد من إنهاء فعالية "${ev.name_ar}" وتوزيع النقاط والكيلومترات على ${eventAttendees.length} مشارك؟`)) {
                                setAttendanceLoading(ev.id);
                                try {
                                  const res = await fetch(`${API_URL}/api/users/admin/events/close/`, {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Token ${token}`,
                                    },
                                    body: JSON.stringify({ event_id: ev.id }),
                                  });
                                  const data = await res.json();
                                  if (res.ok) {
                                    alert(data.detail);
                                    fetchAdminEvents(token);
                                    fetchAdminAttendances(token);
                                  } else {
                                    alert(data.detail || "حدث خطأ.");
                                  }
                                } catch (err) {
                                  alert("فشل الاتصال بالخادم.");
                                } finally {
                                  setAttendanceLoading(null);
                                }
                              }
                            }}
                            disabled={attendanceLoading === ev.id}
                            className="w-full sm:w-auto px-6 py-2.5 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black rounded-xl text-sm font-black cursor-pointer transition-colors shadow-[0_0_15px_rgba(76,217,100,0.3)] whitespace-nowrap"
                          >
                            {attendanceLoading === ev.id ? "جاري..." : "إنهاء وتوزيع الجوائز 🏁"}
                          </button>
                        </div>
                        
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                          {eventAttendees.length === 0 ? (
                            <p className="text-xs text-zinc-500">لم ينضم أحد لهذه الفعالية بعد.</p>
                          ) : (
                            eventAttendees.map((att) => (
                              <div key={att.id} className="bg-zinc-900/50 p-2.5 rounded-lg flex justify-between items-center text-xs border border-zinc-800">
                                <span className="font-bold text-zinc-200">{att.user_name}</span>
                                <span className="font-mono text-zinc-500 tracking-wider" dir="ltr">{att.mobile}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Finished Events & Attendees List */}
            <div className="sport-glass-card p-6 md:p-8 space-y-6 mt-8">
              <div className="pb-3 border-b border-zinc-800/60 flex justify-between items-center">
                <h3 className="text-xl font-black italic text-zinc-400 flex items-center gap-2">
                  <span>🏁</span> الفعاليات المنتهية وسجل الحضور
                </h3>
                <span className="text-xs text-zinc-400 font-bold bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                  {events.filter(e => !e.is_active).length} فعاليات منتهية
                </span>
              </div>

              {events.filter(e => !e.is_active).length === 0 ? (
                <p className="text-sm text-zinc-600 text-center py-12">لا توجد فعاليات منتهية في السجل.</p>
              ) : (
                <div className="space-y-4">
                  {events.filter(e => !e.is_active).map((ev) => {
                    const eventAttendees = attendances.filter(a => a.event_id === ev.id);
                    return (
                      <div 
                        key={ev.id}
                        className="bg-zinc-950/40 border border-zinc-900 p-5 rounded-2xl flex flex-col gap-4"
                      >
                        <div className="flex justify-between items-center border-b border-zinc-900/80 pb-3">
                          <div className="space-y-1 w-full text-right">
                            <div className="font-bold text-zinc-300 text-base">{ev.name_ar}</div>
                            <div className="text-xs font-bold text-zinc-500">
                              ( {ev.points} نقطة / {ev.km} كم ) • {eventAttendees.length} حاضرين
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-zinc-900 text-zinc-500 text-[10px] font-black rounded border border-zinc-800 whitespace-nowrap">مغلقة</span>
                        </div>
                        
                        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                          {eventAttendees.length === 0 ? (
                            <p className="text-[10px] text-zinc-600">لم يسجل أحد حضوراً لهذه الفعالية.</p>
                          ) : (
                            eventAttendees.map((att) => (
                              <div key={att.id} className="bg-zinc-900/30 p-2 rounded flex justify-between items-center text-[10px] border border-zinc-800/50">
                                <span className="font-bold text-zinc-400">{att.user_name}</span>
                                <span className="font-mono text-zinc-600 tracking-wider" dir="ltr">{att.mobile}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 3: Locations Management */}
        {activeTab === "locations" && (
          <div className="space-y-8">
            <div className="sport-glass-card p-6 md:p-8">
              <h3 className="text-xl font-black italic text-white mb-6">📍 إدارة المواقع الجاهزة للفعاليات</h3>
              
              {locations.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">لا توجد مواقع محفوظة حالياً.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.map((loc) => (
                    <div key={loc.id} className="bg-zinc-950/70 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between">
                      <div className="mb-4">
                        <div className="font-bold text-white mb-1">{loc.name_ar}</div>
                        {loc.name_en && loc.name_en !== loc.name_ar && <div className="text-xs text-zinc-400 mb-2">{loc.name_en}</div>}
                        <a href={loc.location_url} target="_blank" rel="noreferrer" className="text-xs text-[var(--neon-green)] hover:underline truncate block w-full">عرض الخريطة ↗</a>
                      </div>
                      <button
                        onClick={async () => {
                          if (window.confirm("هل أنت متأكد من حذف هذا الموقع؟")) {
                            try {
                              const res = await fetch(`${API_URL}/api/users/admin/event-locations/`, {
                                method: "DELETE",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Token ${token}`
                                },
                                body: JSON.stringify({ id: loc.id })
                              });
                              if (res.ok) {
                                setLocations(locations.filter(l => l.id !== loc.id));
                              } else {
                                alert("فشل حذف الموقع.");
                              }
                            } catch (err) {
                               alert("خطأ في الاتصال بالخادم.");
                            }
                          }
                        }}
                        className="w-full py-2 border border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-950 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        حذف الموقع 🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Points Settings */}
        {activeTab === "points-settings" && pointsSettings && (
          <div className="bg-[#0e1014]/80 border border-zinc-850 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="border-b border-zinc-800 pb-4">
              <h2 className="text-xl font-black text-[var(--neon-green)] glowing-text">لوحة إعدادات النقاط الشاملة</h2>
              <p className="text-sm text-zinc-400 mt-2">أي تغيير هنا سينطبق على الأنشطة الجديدة مستقبلاً، ولا يؤثر على ما تم اعتماده مسبقاً.</p>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSettingsLoading(true);
              try {
                const res = await fetch(`${API_URL}/api/users/admin/points-settings/`, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${token}`,
                  },
                  body: JSON.stringify(pointsSettings),
                });
                if (res.ok) {
                  alert("تم حفظ إعدادات النقاط بنجاح!");
                } else {
                  alert("حدث خطأ أثناء الحفظ.");
                }
              } catch (err) {
                alert("خطأ في الاتصال.");
              } finally {
                setSettingsLoading(false);
              }
            }} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">نقاط الكيلومتر (نشاط حر)</label>
                  <input
                    type="number" step="0.01"
                    value={pointsSettings.km_points_rate}
                    onChange={(e) => setPointsSettings({...pointsSettings, km_points_rate: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg focus:border-[var(--neon-green)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">نقاط تحقيق الهدف الشهري</label>
                  <input
                    type="number"
                    value={pointsSettings.monthly_goal_points}
                    onChange={(e) => setPointsSettings({...pointsSettings, monthly_goal_points: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg focus:border-[var(--neon-green)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">نقاط المركز الأول</label>
                  <input
                    type="number"
                    value={pointsSettings.rank_1_points}
                    onChange={(e) => setPointsSettings({...pointsSettings, rank_1_points: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg focus:border-[var(--neon-green)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">نقاط المركز الثاني</label>
                  <input
                    type="number"
                    value={pointsSettings.rank_2_points}
                    onChange={(e) => setPointsSettings({...pointsSettings, rank_2_points: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg focus:border-[var(--neon-green)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">نقاط المركز الثالث</label>
                  <input
                    type="number"
                    value={pointsSettings.rank_3_points}
                    onChange={(e) => setPointsSettings({...pointsSettings, rank_3_points: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg focus:border-[var(--neon-green)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">نقاط الأكثر تطوراً</label>
                  <input
                    type="number"
                    value={pointsSettings.most_improved_points}
                    onChange={(e) => setPointsSettings({...pointsSettings, most_improved_points: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg focus:border-[var(--neon-green)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">نقاط المحتوى المعتمد</label>
                  <input
                    type="number"
                    value={pointsSettings.content_points}
                    onChange={(e) => setPointsSettings({...pointsSettings, content_points: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg focus:border-[var(--neon-green)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">نقاط القصة الملهمة</label>
                  <input
                    type="number"
                    value={pointsSettings.inspiring_story_points}
                    onChange={(e) => setPointsSettings({...pointsSettings, inspiring_story_points: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg focus:border-[var(--neon-green)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">استمرارية 7 أيام</label>
                  <input
                    type="number"
                    value={pointsSettings.streak_7_points}
                    onChange={(e) => setPointsSettings({...pointsSettings, streak_7_points: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg focus:border-[var(--neon-green)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">استمرارية 30 يوم</label>
                  <input
                    type="number"
                    value={pointsSettings.streak_30_points}
                    onChange={(e) => setPointsSettings({...pointsSettings, streak_30_points: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg focus:border-[var(--neon-green)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">نقاط التفاعل للإعجاب/المشاركة</label>
                  <input
                    type="number"
                    value={pointsSettings.interaction_points}
                    onChange={(e) => setPointsSettings({...pointsSettings, interaction_points: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg focus:border-[var(--neon-green)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">السقف اليومي لنقاط التفاعل</label>
                  <input
                    type="number"
                    value={pointsSettings.interaction_daily_cap}
                    onChange={(e) => setPointsSettings({...pointsSettings, interaction_daily_cap: e.target.value})}
                    className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg focus:border-[var(--neon-green)] text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="w-full md:w-auto px-8 py-3 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-black rounded-xl cursor-pointer transition-colors"
                >
                  {settingsLoading ? "جاري الحفظ..." : "حفظ إعدادات النقاط"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab: News Review (admin + content manager) */}
        {activeTab === "news" && (
          <div className="space-y-8">
            <div className="sport-glass-card p-6 md:p-8 space-y-6">
              <div className="pb-3 border-b border-zinc-800/60 flex justify-between items-center">
                <h3 className="text-xl font-black italic text-white flex items-center gap-2">
                  <span>📰</span> الأخبار والإنجازات بانتظار المراجعة
                </h3>
                <span className="text-xs text-zinc-900 font-bold bg-[var(--neon-green)] px-3 py-1 rounded-full shadow-[0_0_10px_rgba(76,217,100,0.3)]">
                  {pendingNews.length} بانتظار النشر
                </span>
              </div>

              {pendingNews.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-12">لا توجد أخبار معلقة بانتظار المراجعة حالياً.</p>
              ) : (
                <div className="space-y-4">
                  {pendingNews.map((post) => (
                    <div key={post.id} className="bg-zinc-950/70 border border-zinc-850 rounded-2xl overflow-hidden hover:border-zinc-800 transition-all duration-300">
                      <div className="flex flex-col md:flex-row gap-4 p-5">
                        {post.image && (
                          <div className="w-full md:w-48 h-40 md:h-32 rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0">
                            <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 space-y-2 text-right">
                          <h4 className="text-lg font-black text-white">{post.title}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-semibold flex-wrap">
                            <span className="bg-zinc-900 px-2 py-1 rounded text-[var(--neon-green)]">بواسطة: {post.author_name}</span>
                            <span className="font-mono" dir="ltr">{post.author_mobile}</span>
                            <span>•</span>
                            <span>{new Date(post.created_at).toLocaleDateString("en-GB")}</span>
                          </div>
                          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{post.content}</p>
                        </div>
                      </div>
                      <div className="flex gap-3 p-4 border-t border-zinc-850 bg-zinc-950/40">
                        <button
                          onClick={() => handleReviewNews(post.id, "approved")}
                          disabled={newsLoading}
                          className="flex-1 py-2.5 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-black text-xs rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                        >
                          قبول ونشر ✅
                        </button>
                        <button
                          onClick={() => handleReviewNews(post.id, "rejected")}
                          disabled={newsLoading}
                          className="flex-1 py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                        >
                          رفض ❌
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tab 5: Help & Points Explanation */}
      {activeTab === "help" && (
        <div className="bg-[#0e1014]/80 border border-zinc-850 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="border-b border-zinc-800 pb-4">
            <h2 className="text-xl font-black text-[var(--neon-green)] glowing-text">آلية احتساب النقاط وتوزيعها</h2>
            <p className="text-sm text-zinc-400 mt-2">دليل شامل للإدارة يشرح كيف يكتسب الأعضاء النقاط في المنصة بناءً على الإعدادات الحالية.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>📅</span> نقاط الفعاليات (المشي الجماعي)</h3>
              <p className="text-zinc-400 leading-relaxed">عند انتهاء فعالية رسمية للفريق، يقوم الإداري بالضغط على زر إنهاء الفعالية، فيقوم النظام آلياً بمنح جميع المسجلين في الفعالية "نقاط الحضور" و "الكيلومترات" المخصصة لهذه الفعالية.</p>
            </div>
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>🚶</span> نقاط الكيلومتر (النشاط الحر)</h3>
              <p className="text-zinc-400 leading-relaxed">يقوم اللاعب بتسجيل نشاط مشي حر ويرفق رابطاً (مثل Strava). بعد مراجعة الإدارة للنشاط واعتماد الكيلومترات المقطوعة، يقوم النظام بضرب عدد الكيلومترات المعتمدة في "معدل نقاط الكيلومتر" ويضيفها لرصيد اللاعب.</p>
            </div>
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>🎯</span> تحقيق الهدف الشهري</h3>
              <p className="text-zinc-400 leading-relaxed">يتم منح نقاط هذه الجائزة عندما يتمكن اللاعب من إكمال تحدي الوصول إلى عدد معين من الكيلومترات في شهر واحد (مثل 50 كم).</p>
            </div>
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>🔥</span> نقاط الاستمرارية (Streak)</h3>
              <p className="text-zinc-400 leading-relaxed">مكافأة الانضباط اليومي. يتم منحها عندما يكمل اللاعب تسجيل أنشطته بانتظام لمدة 7 أيام متتالية، وكذلك هناك جائزة كبرى عند إتمام 30 يوماً من المشي المستمر.</p>
            </div>
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>🏆</span> أبطال لوحة الصدارة</h3>
              <p className="text-zinc-400 leading-relaxed">في نهاية الدورة التقييمية (أسبوعياً أو شهرياً)، يحصل اللاعبون المتصدرون في المركز الأول والثاني والثالث على مكافأة النقاط الكبرى تقديراً لجهودهم وتفوقهم.</p>
            </div>
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>🌟</span> المحتوى المعتمد والقصة الملهمة</h3>
              <p className="text-zinc-400 leading-relaxed">عندما يرفع العضو خبراً أو إنجازاً ويقوم الأدمن أو مدير المحتوى باعتماده ونشره من تبويب "مراجعة الأخبار"، يُمنح الناشر تلقائياً "نقاط المحتوى المعتمد". قيمة هذه النقاط يتحكم بها الأدمن من تبويب "إعدادات النقاط" (حقل "نقاط المحتوى المعتمد")، وتُمنح مرة واحدة لكل خبر عند أول اعتماد. ويمكن دائماً منح نقاط إضافية يدوياً عبر زر "إضافة نقاط مكافأة".</p>
            </div>
          </div>
        </div>
      )}

      {/* Points Adjustment Modal (Bonus Points) */}
      {showPointsModal && selectedMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0e1014] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800/80">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                ⭐ إضافة نقاط مكافأة للعضو
              </h3>
              <button 
                onClick={() => setShowPointsModal(false)}
                className="text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-zinc-400">
              العضو: <span className="text-white font-semibold">{selectedMember.name}</span> ({selectedMember.mobile})
            </div>

            <form onSubmit={handleAdjustPoints} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 mb-1.5">
                  عدد النقاط (موجب للإضافة، سالب للخصم)
                </label>
                <input
                  type="number"
                  placeholder="مثال: 50"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 text-white text-sm rounded-lg focus:border-[var(--neon-green)] focus:ring-0 text-center font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 mb-1.5">
                  سبب أو اسم الفعالية/المناسبة
                </label>
                <input
                  type="text"
                  placeholder="مثال: حضور فعالية ممشى الكورنيش الرياضي"
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 text-white text-sm rounded-lg focus:border-[var(--neon-green)] focus:ring-0"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading === selectedMember.mobile}
                  className="flex-1 py-2 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {actionLoading === selectedMember.mobile ? "جاري الإضافة..." : "تأكيد إضافة النقاط"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPointsModal(false)}
                  className="flex-1 py-2 bg-transparent border border-zinc-800 text-zinc-400 hover:text-white text-xs rounded-lg cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Walk Registration Modal */}
      {showWalkModal && selectedMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0e1014] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800/80">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                🚶 تسجيل نشاط مشي جديد للعضو
              </h3>
              <button 
                onClick={() => setShowWalkModal(false)}
                className="text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-zinc-400">
              العضو: <span className="text-white font-semibold">{selectedMember.name}</span> ({selectedMember.mobile})
            </div>

            <form onSubmit={handleRegisterWalk} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 mb-1.5">
                  المسافة المقطوعة (بالكيلومتر)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="مثال: 5.5"
                  value={walkKm}
                  onChange={(e) => setWalkKm(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 text-white text-sm rounded-lg focus:border-[var(--neon-green)] focus:ring-0 text-center font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 mb-1.5">
                  خيارات احتساب النقاط
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPointsOption("1")}
                    className={`py-2 px-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      pointsOption === "1"
                        ? "bg-[var(--neon-green)] text-black border-[var(--neon-green)]"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                    }`}
                  >
                    1 نقطة / كم
                    {walkKm && ` (${Math.round(parseFloat(walkKm) * 1 || 0)} ن)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsOption("2")}
                    className={`py-2 px-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      pointsOption === "2"
                        ? "bg-[var(--neon-green)] text-black border-[var(--neon-green)]"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                    }`}
                  >
                    2 نقطة / كم
                    {walkKm && ` (${Math.round(parseFloat(walkKm) * 2 || 0)} ن)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsOption("custom")}
                    className={`py-2 px-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      pointsOption === "custom"
                        ? "bg-[var(--neon-green)] text-black border-[var(--neon-green)]"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                    }`}
                  >
                    نقاط مخصصة
                  </button>
                </div>
              </div>

              {pointsOption === "custom" && (
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1.5">
                    عدد النقاط المخصصة
                  </label>
                  <input
                    type="number"
                    placeholder="مثال: 15"
                    value={customPoints}
                    onChange={(e) => setCustomPoints(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 text-white text-sm rounded-lg focus:border-[var(--neon-green)] focus:ring-0 text-center font-bold"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 mb-1.5">
                  الوصف أو اسم الفعالية
                </label>
                <input
                  type="text"
                  placeholder="مثال: نشاط مشي معتمد"
                  value={walkDescription}
                  onChange={(e) => setWalkDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 text-white text-sm rounded-lg focus:border-[var(--neon-green)] focus:ring-0"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading === selectedMember.mobile}
                  className="flex-1 py-2 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {actionLoading === selectedMember.mobile ? "جاري الحفظ..." : "تسجيل النشاط"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWalkModal(false)}
                  className="flex-1 py-2 bg-transparent border border-zinc-800 text-zinc-400 hover:text-white text-xs rounded-lg cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Activity Modal */}
      {reviewActivity && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0e1014] border border-zinc-800 rounded-2xl p-6 max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>🔍</span> مراجعة نشاط حر: {reviewActivity.activity_name}
              </h3>
              <button 
                onClick={() => setReviewActivity(null)}
                className="text-zinc-500 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6 py-4">
              {/* Left Side: Details & Form */}
              <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2">
                  <div className="text-xs text-zinc-500">العضو: <span className="text-white font-bold">{reviewActivity.user_name} ({reviewActivity.user_mobile})</span></div>
                  <div className="text-xs text-zinc-500">اسم النشاط: <span className="text-[var(--neon-green)] font-bold">{reviewActivity.activity_name}</span></div>
                  <div className="text-xs text-zinc-500">المسافة المدخلة (تقريباً): <span className="text-white font-bold">{reviewActivity.claimed_km || "غير محدد"} كم</span></div>
                  <div className="text-xs pt-2">
                    <a href={reviewActivity.activity_link} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white py-2 rounded-lg border border-zinc-700 transition-colors">
                      🔗 فتح الرابط في نافذة جديدة
                    </a>
                  </div>
                </div>

                <form onSubmit={handleReviewActivity} className="flex-1 flex flex-col justify-end space-y-4">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-4">
                    <h4 className="text-sm font-bold text-white border-b border-zinc-800 pb-2">قرار الإدارة</h4>
                    
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--neon-green)] mb-1.5">
                        المسافة المعتمدة فعلياً (كم)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={reviewActivity.approved_km}
                        onChange={(e) => setReviewActivity({...reviewActivity, approved_km: e.target.value})}
                        className="w-full px-3 py-2 bg-black border border-zinc-700 text-white text-sm rounded-lg focus:border-[var(--neon-green)] focus:ring-0 font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--neon-green)] mb-1.5">
                        النقاط المعتمدة
                      </label>
                      <input
                        type="number"
                        value={reviewActivity.approved_points}
                        onChange={(e) => setReviewActivity({...reviewActivity, approved_points: e.target.value})}
                        placeholder="يُحسب تلقائياً حسب معدل النقاط"
                        className="w-full px-3 py-2 bg-black border border-zinc-700 text-white text-sm rounded-lg focus:border-[var(--neon-green)] focus:ring-0 font-bold"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">اتركه فارغاً ليُحسب تلقائياً (كم × معدل نقاط الكيلومتر)، أو أدخل قيمة مخصصة.</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="submit"
                      onClick={() => setReviewActivity({...reviewActivity, status: 'approved'})}
                      disabled={activityLoading === reviewActivity.id}
                      className="w-full py-3 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-black text-sm rounded-xl cursor-pointer transition-colors"
                    >
                      {activityLoading === reviewActivity.id ? "جاري..." : "اعتماد النشاط وإضافة النقاط ✅"}
                    </button>
                    
                    <button
                      type="submit"
                      onClick={() => setReviewActivity({...reviewActivity, status: 'rejected', approved_km: 0, approved_points: 0})}
                      disabled={activityLoading === reviewActivity.id}
                      className="w-full py-3 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-sm rounded-xl cursor-pointer transition-colors"
                    >
                      رفض النشاط ❌
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Side: Activity link preview (open in a new tab — apps like Strava block embedding) */}
              <div className="w-full md:w-2/3 h-64 md:h-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden relative flex flex-col items-center justify-center text-center p-8 gap-5">
                <div className="absolute top-0 right-0 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-bl-lg text-[10px] font-bold text-zinc-400 z-10 flex items-center gap-2">
                  <span>🗺️</span> رابط النشاط
                </div>
                <span className="text-6xl opacity-60">🏃‍♂️🔗</span>
                <p className="text-sm text-zinc-400 font-semibold leading-relaxed max-w-sm">
                  تطبيقات الرياضة (مثل Strava وGarmin) تمنع عرض صفحاتها داخل المنصة لأسباب أمنية.
                  افتح الرابط في نافذة جديدة للاطلاع على تفاصيل النشاط والمسافة قبل الاعتماد.
                </p>
                <a
                  href={reviewActivity.activity_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3 bg-[var(--neon-green)] hover:bg-[var(--neon-green-hover)] text-black font-black text-sm rounded-xl transition-colors shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                >
                  فتح رابط النشاط في نافذة جديدة ↗
                </a>
                <span className="text-[10px] text-zinc-600 font-mono break-all max-w-sm" dir="ltr">{reviewActivity.activity_link}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "../../components/Logo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RegisterPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("الدمام");
  const [email, setEmail] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);
  const [preferredActivity, setPreferredActivity] = useState("walk");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("ewt_token");
    if (!savedToken) {
      router.push("/");
    } else {
      setToken(savedToken);
      fetchProfile(savedToken);
    }
  }, [router]);

  const fetchProfile = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/users/profile/`, {
        headers: { Authorization: `Token ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setGender(data.gender || "male");
        setBirthDate(data.birth_date || "");
        setCity(data.city || "الدمام");
        setEmail(data.email || "");
        setHeight(data.height || "");
        setWeight(data.weight || "");
        setHealthNotes(data.health_notes || "");
        setIsDisabled(data.is_disabled || false);
        setPreferredActivity(data.preferred_activity || "walk");
        if (data.avatar) setAvatarPreview(data.avatar.startsWith("http") ? data.avatar : `${API_URL}${data.avatar}`);
        setTermsAccepted(true); // Pre-accept terms if editing existing profile
      }
    } catch (err) {
      console.error("Error fetching profile", err);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !birthDate || !city) {
      setError("الرجاء تعبئة الحقول الأساسية: الاسم، تاريخ الميلاد، والمدينة");
      return;
    }
    if (!termsAccepted) {
      setError("الرجاء الموافقة على الشروط والأحكام لإتمام التسجيل.");
      return;
    }
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("gender", gender);
    formData.append("birth_date", birthDate);
    formData.append("city", city);
    if (email) formData.append("email", email);
    if (height) formData.append("height", height);
    if (weight) formData.append("weight", weight);
    if (healthNotes) formData.append("health_notes", healthNotes);
    formData.append("is_disabled", String(isDisabled));
    formData.append("preferred_activity", preferredActivity);
    if (avatar) {
      formData.append("avatar", avatar);
    }

    try {
      const res = await fetch(`${API_URL}/api/users/profile/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        // Wait 2 seconds and redirect
        setTimeout(() => {
          const isAdmin = localStorage.getItem("ewt_is_admin") === "true";
          if (isAdmin) {
            router.push("/admin");
          } else {
            router.push("/profile");
          }
        }, 2500);
      } else {
        setError(JSON.stringify(data) || "حدث خطأ أثناء حفظ الملف الشخصي.");
      }
    } catch (err) {
      setError("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen px-4 bg-[#050505] text-center">
        <div className="bg-[#121212] border border-zinc-850 p-8 rounded-2xl max-w-md w-full space-y-6">
          <div className="text-[var(--neon-green)] text-6xl pulse-glow inline-flex w-24 h-24 items-center justify-center bg-zinc-900 border border-zinc-800 rounded-full mb-4">
            ✓
          </div>
          <h1 className="text-2xl font-extrabold text-white glowing-text">
            تم حفظ بياناتك بنجاح!
          </h1>
          <p className="text-zinc-400 text-sm">
            تم تفعيل حسابك بنجاح! يمكنك الآن رفع أنشطتك، الانضمام للفعاليات، والظهور في جداول الترتيب مباشرة.
          </p>
          <p className="text-xs text-[var(--neon-green)] font-semibold animate-pulse">
            جاري تحويلك الآن...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-[#050505] flex flex-col items-center">
      <button
        onClick={() => router.push("/")}
        className="absolute top-5 right-5 px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-[var(--neon-green)]/50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 z-10"
      >
        🏠 الرئيسية
      </button>
      <div className="max-w-2xl w-full space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo height={72} href="/" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight glowing-text">
            إعداد الملف الرياضي الشخصي
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            خطوتك الأولى لتكون جزءاً من مجتمع فريق الشرقية للمشي
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-[#121212] border border-zinc-850 rounded-2xl p-8 shadow-2xl space-y-6">
          {error && (
            <div className="bg-red-950/50 border border-red-500/50 text-red-200 text-xs px-4 py-3 rounded-lg text-right">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Avatar Selector */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <span className="text-xs font-semibold text-zinc-400">الصورة الشخصية</span>
              <label className="relative cursor-pointer group">
                <div className="w-28 h-28 rounded-full border-2 border-dashed border-zinc-700 overflow-hidden flex items-center justify-center bg-zinc-900 group-hover:border-[var(--neon-green)] transition-all">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl text-zinc-600 group-hover:text-[var(--neon-green)]">📷</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              <span className="text-[10px] text-zinc-500">انقر لرفع أو تغيير الصورة (سيتم ضغطها تلقائياً)</span>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">الاسم الكامل *</label>
                <input
                  type="text"
                  placeholder="مثال: خالد الحربي"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#181818] border border-zinc-800 text-white rounded-lg focus:border-[var(--neon-green)] text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">المدينة *</label>
                <input
                  type="text"
                  placeholder="مثال: الخبر"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 bg-[#181818] border border-zinc-800 text-white rounded-lg focus:border-[var(--neon-green)] text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">الجنس *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3 bg-[#181818] border border-zinc-800 text-white rounded-lg focus:border-[var(--neon-green)] text-sm"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">تاريخ الميلاد *</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#181818] border border-zinc-800 text-white rounded-lg focus:border-[var(--neon-green)] text-sm text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#181818] border border-zinc-800 text-white rounded-lg focus:border-[var(--neon-green)] text-sm ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">النشاط الرياضي المفضل</label>
                <select
                  value={preferredActivity}
                  onChange={(e) => setPreferredActivity(e.target.value)}
                  className="w-full px-4 py-3 bg-[#181818] border border-zinc-800 text-white rounded-lg focus:border-[var(--neon-green)] text-sm"
                >
                  <option value="walk">مشي</option>
                  <option value="run">جري</option>
                  <option value="both">الاثنين</option>
                </select>
              </div>
            </div>

            {/* Special Needs */}
            <div className="flex items-center space-x-3 space-x-reverse bg-zinc-900/50 p-4 rounded-xl border border-zinc-850">
              <input
                id="is_disabled"
                type="checkbox"
                checked={isDisabled}
                onChange={(e) => setIsDisabled(e.target.checked)}
                className="w-5 h-5 rounded border-zinc-800 text-[var(--neon-green)] focus:ring-0 bg-[#181818] cursor-pointer"
              />
              <label htmlFor="is_disabled" className="text-sm font-semibold text-white cursor-pointer select-none">
                أنا من ذوي الهمم (الاحتياجات الخاصة)
              </label>
            </div>

            {/* Health Info (Secret) Section */}
            <div className="border-t border-zinc-800 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center">
                  🔒 بيانات صحية سرّية جداً
                </h3>
                <span className="text-[10px] text-zinc-500">لا تظهر للعامة إطلاقاً</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">الطول (سم)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="مثال: 175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-4 py-3 bg-[#181818] border border-zinc-800 text-white rounded-lg focus:border-[var(--neon-green)] text-sm text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">الوزن الحالي (كجم)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="مثال: 75.4"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-4 py-3 bg-[#181818] border border-zinc-800 text-white rounded-lg focus:border-[var(--neon-green)] text-sm text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">الملاحظات والقيود الصحية إن وجدت</label>
                <textarea
                  placeholder="مثل: آلام الركبة، الربو، أو أمراض مزمنة لتنبيه المدربين عند اللزوم..."
                  rows={2}
                  value={healthNotes}
                  onChange={(e) => setHealthNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-[#181818] border border-zinc-800 text-white rounded-lg focus:border-[var(--neon-green)] text-sm resize-none"
                />
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-zinc-950/80 p-5 rounded-xl border border-zinc-800 space-y-3">
              <h4 className="text-sm font-bold text-[var(--neon-green)] flex items-center gap-2">
                <span>📜</span> الشروط والأحكام للانتساب
              </h4>
              <ul className="text-xs text-zinc-400 space-y-2 list-disc list-inside leading-relaxed">
                <li><strong className="text-zinc-300">إخلاء المسؤولية الصحية:</strong> أقر بسلامتي الصحية وأتحمل المسؤولية الكاملة عن أي إصابات بدنية أو عوارض صحية قد تحدث أثناء ممارسة النشاط، ولا يتحمل الفريق أي مسؤولية قانونية أو تعويضات.</li>
                <li><strong className="text-zinc-300">استخدام البيانات والصور:</strong> أوافق على أحقية الفريق في استخدام الصور الجماعية والفردية الملتقطة، بالإضافة لبيانات الإنجازات بغرض التوثيق الإعلامي والتسويق لبرامج الفريق.</li>
                <li><strong className="text-zinc-300">آداب المشاركة:</strong> ألتزم باحترام جميع الأعضاء، وتجنب الإساءة أو نشر أي محتوى غير لائق في منصات الفريق ومجموعاته.</li>
              </ul>
              
              <div className="flex items-start space-x-3 space-x-reverse pt-3 mt-3 border-t border-zinc-800/60">
                <input
                  id="termsAccepted"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-zinc-700 text-[var(--neon-green)] focus:ring-0 bg-[#181818] cursor-pointer"
                />
                <label htmlFor="termsAccepted" className="text-sm font-bold text-white cursor-pointer select-none leading-tight">
                  قرأت جميع الشروط والأحكام المذكورة أعلاه وأوافق عليها تماماً.
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 neon-glow-btn text-black font-bold text-base cursor-pointer disabled:opacity-50"
            >
              {loading ? "جاري الحفظ..." : "حفظ وإنشاء الملف الرياضي"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

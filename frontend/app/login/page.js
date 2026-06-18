"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "../../components/Logo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1); // 1: request OTP, 2: verify OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [simulatedOtp, setSimulatedOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  // OTP expiry countdown (only while on the verification step)
  useEffect(() => {
    if (step !== 2 || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [step, secondsLeft]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!mobile) {
      setError("الرجاء إدخال رقم الجوال");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/users/send-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep(2);
        setSecondsLeft(data.expires_in || 300);
        if (data.otp_code) {
          setSimulatedOtp(data.otp_code);
        }
      } else {
        setError(data.mobile ? data.mobile[0] : "حدث خطأ أثناء إرسال الرمز. تأكد من الرقم.");
      }
    } catch (err) {
      setError("تعذر الاتصال بالخادم. تأكد من تشغيل خادم Django API.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError("الرجاء إدخال رمز التحقق المكون من 6 أرقام");
      return;
    }
    if (secondsLeft <= 0) {
      setError("انتهت صلاحية رمز التحقق. الرجاء إعادة الإرسال.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/users/verify-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, code }),
      });

      const data = await res.json();

      if (res.ok) {
        // Save auth details to local storage
        localStorage.setItem("ewt_token", data.token);
        localStorage.setItem("ewt_mobile", data.mobile);
        localStorage.setItem("ewt_is_approved", String(data.is_approved));
        localStorage.setItem("ewt_is_admin", String(data.is_admin));
        localStorage.setItem("ewt_is_reviewer", String(data.is_reviewer));
        localStorage.setItem("ewt_is_content_manager", String(data.is_content_manager));

        if (data.is_new_user) {
          router.push("/register");
        } else if (data.is_admin || data.is_reviewer || data.is_content_manager) {
          router.push("/admin");
        } else {
          router.push("/profile");
        }
      } else {
        setError(data.detail || data.non_field_errors?.[0] || "رمز التحقق غير صحيح أو منتهي الصلاحية.");
      }
    } catch (err) {
      setError("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (role) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/users/dev-login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("ewt_token", data.token);
        localStorage.setItem("ewt_mobile", data.mobile);
        localStorage.setItem("ewt_is_approved", String(data.is_approved));
        localStorage.setItem("ewt_is_admin", String(data.is_admin));
        localStorage.setItem("ewt_is_reviewer", String(data.is_reviewer));
        localStorage.setItem("ewt_is_content_manager", String(data.is_content_manager));

        if (data.is_admin || data.is_reviewer || data.is_content_manager) {
          router.push("/admin");
        } else {
          router.push("/profile");
        }
      } else {
        setError(data.detail || "حدث خطأ أثناء الدخول للاختبار.");
      }
    } catch (err) {
      setError("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col flex-1 items-center justify-center min-h-screen px-4 py-12 sm:px-6 lg:px-8 bg-[#050505]">
      <button
        onClick={() => router.push("/")}
        className="absolute top-5 right-5 px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-[var(--neon-green)]/50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
      >
        🏠 الرئيسية
      </button>
      <div className="w-full max-w-md space-y-8">

        {/* Header / Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo height={88} href="/" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight glowing-text">
            فريق الشرقية للمشي
          </h1>
          <p className="mt-2 text-sm text-[var(--neon-green)] font-semibold tracking-wide">
            &quot;المشي أسلوب حياة&quot;
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-[#121212] border border-zinc-850 rounded-2xl p-8 shadow-2xl space-y-6">
          <h2 className="text-xl font-bold text-center text-white">
            {step === 1 ? "تسجيل الدخول / الاشتراك" : "تأكيد رقم الجوال"}
          </h2>

          {error && (
            <div className="bg-red-950/50 border border-red-500/50 text-red-200 text-xs px-4 py-3 rounded-lg text-right">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label htmlFor="mobile" className="block text-xs font-semibold text-zinc-400 mb-2">
                  رقم الجوال
                </label>
                <input
                  id="mobile"
                  type="tel"
                  placeholder="مثال: 0501234567"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-4 py-3 bg-[#181818] border border-zinc-800 text-white rounded-lg focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] text-center text-lg tracking-wider"
                  dir="ltr"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 neon-glow-btn text-black font-bold text-base cursor-pointer disabled:opacity-50"
              >
                {loading ? "جاري الإرسال..." : "إرسال رمز التحقق OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label htmlFor="code" className="block text-xs font-semibold text-zinc-400 mb-2">
                  رمز التحقق (OTP)
                </label>
                <input
                  id="code"
                  type="text"
                  maxLength={6}
                  placeholder="------"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 bg-[#181818] border border-zinc-800 text-white rounded-lg focus:border-[var(--neon-green)] focus:ring-1 focus:ring-[var(--neon-green)] text-center text-2xl tracking-widest font-bold"
                  dir="ltr"
                  required
                />
                <p className="mt-2 text-xs text-zinc-500 text-center">
                  أدخل الرمز المكون من 6 أرقام المرسل إلى {mobile}
                </p>
                <div className="mt-3 text-center">
                  {secondsLeft > 0 ? (
                    <span className="text-xs text-zinc-400">
                      ينتهي الرمز خلال{" "}
                      <span className="font-mono font-bold text-[var(--neon-green)]">{formatTime(secondsLeft)}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-red-400 font-bold">انتهت صلاحية الرمز، الرجاء إعادة الإرسال.</span>
                  )}
                </div>
              </div>

              {simulatedOtp && (
                <div className="bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/30 p-3 rounded-lg text-center">
                  <span className="text-xs text-zinc-400 block mb-1">
                    [بيئة التطوير والتجربة] رمز التحقق المستلم:
                  </span>
                  <span className="text-xl font-mono font-bold text-[var(--neon-green)] tracking-widest">
                    {simulatedOtp}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={loading || secondsLeft <= 0}
                  className="w-full py-3 neon-glow-btn text-black font-bold text-base cursor-pointer disabled:opacity-50"
                >
                  {loading ? "جاري التحقق..." : "تأكيد الدخول"}
                </button>

                <button
                  type="button"
                  disabled={loading || secondsLeft > 0}
                  onClick={() => handleSendOtp({ preventDefault: () => {} })}
                  className="w-full py-2 bg-transparent border-0 text-xs text-[var(--neon-green)] hover:underline cursor-pointer transition-colors text-center disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline disabled:text-zinc-500"
                >
                  إعادة إرسال الرمز
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError("");
                    setCode("");
                    setSimulatedOtp("");
                    setSecondsLeft(0);
                  }}
                  className="w-full py-2 bg-transparent border-0 text-xs text-zinc-400 hover:text-white cursor-pointer transition-colors text-center"
                >
                  تغيير رقم الجوال
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Dev Login Buttons */}
        <div className="bg-[#121212]/80 border border-zinc-850 rounded-2xl p-6 shadow-2xl space-y-4">
          <h3 className="text-sm font-bold text-center text-zinc-400 border-b border-zinc-800 pb-2">
            [بيئة التطوير] دخول سريع للحسابات التجريبية
          </h3>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleDevLogin('admin')}
              disabled={loading}
              className="w-full py-2.5 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-800 text-blue-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              👑 دخول كـ مدير عام
            </button>
            <button
              type="button"
              onClick={() => handleDevLogin('reviewer')}
              disabled={loading}
              className="w-full py-2.5 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-800 text-purple-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              🗺️ دخول كـ مدقق أنشطة
            </button>
            <button
              type="button"
              onClick={() => handleDevLogin('content_manager')}
              disabled={loading}
              className="w-full py-2.5 bg-yellow-900/40 hover:bg-yellow-900/60 border border-yellow-800 text-yellow-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              📰 دخول كـ مدير محتوى
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-zinc-600">
          تسجيل الدخول يتم بدون كلمة مرور تقليدية عبر نظام OTP آمن ومؤقت.
        </p>

      </div>
    </div>
  );
}

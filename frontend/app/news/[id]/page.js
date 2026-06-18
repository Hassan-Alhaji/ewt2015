"use client";


import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function NewsDetailPage({ params }) {
  const unwrappedParams = React.use(params);
  const { id } = unwrappedParams;
  const router = useRouter();
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("ewt_token");
    if (savedToken) setToken(savedToken);
    
    fetchNewsDetail(id, savedToken);
  }, [id]);

  const fetchNewsDetail = async (postId, authToken) => {
    try {
      const headers = {};
      if (authToken) {
        headers["Authorization"] = `Token ${authToken}`;
      }
      const res = await fetch(`${API_URL}/api/users/news/${postId}/`, { headers });
      
      if (res.status === 404) {
        setError("هذا الخبر غير موجود أو تم حذفه.");
        setLoading(false);
        return;
      }
      
      if (!res.ok) {
        throw new Error("فشل تحميل الخبر.");
      }

      const data = await res.json();
      setPost(data);
    } catch (err) {
      console.error(err);
      setError("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!token) {
      alert("يرجى تسجيل الدخول لتتمكن من تشجيع والإعجاب بالأخبار!");
      router.push("/login");
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/users/news/${post.id}/like/`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPost(prev => ({
          ...prev,
          user_liked: data.liked,
          likes_count: data.liked ? prev.likes_count + 1 : prev.likes_count - 1
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center pt-24">
        <div className="animate-spin text-4xl text-[var(--neon-green)]">⏳</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center pt-24">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-4">{error}</h2>
        <Link href="/" className="px-6 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link href="/#news" className="text-zinc-400 hover:text-[var(--neon-green)] text-sm font-bold flex items-center gap-2 transition-colors">
            <span>←</span> العودة للأخبار
          </Link>
        </div>

        {/* Article Container */}
        <article className="bg-[#0e1014] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
          {post.image && (
            <div className="w-full h-[40vh] md:h-[60vh] relative bg-zinc-900 border-b border-zinc-800/80">
              <img 
                src={post.image} 
                alt={post.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e1014] to-transparent opacity-80"></div>
            </div>
          )}

          <div className="p-8 md:p-12 relative -mt-20 z-10">
            <div className="bg-zinc-950/90 backdrop-blur-md p-6 rounded-2xl border border-zinc-800/50 shadow-xl mb-8">
              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">{post.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-zinc-400">
                <span className="bg-[var(--neon-green)]/10 text-[var(--neon-green)] px-3 py-1.5 rounded-lg border border-[var(--neon-green)]/20">
                  بواسطة: {post.author_name}
                </span>
                <span className="flex items-center gap-1.5">
                  📅 {new Date(post.created_at).toLocaleDateString("ar-SA", { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="prose prose-invert prose-lg max-w-none text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>

            <div className="mt-12 pt-8 border-t border-zinc-800/80 flex items-center justify-between">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-base font-black transition-all cursor-pointer ${
                  post.user_liked 
                    ? "bg-[var(--neon-green)]/15 text-[var(--neon-green)] border border-[var(--neon-green)]/40 shadow-[0_0_20px_rgba(204,255,0,0.2)]" 
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <span className={`text-2xl transition-transform ${post.user_liked ? "scale-125 drop-shadow-[0_0_10px_rgba(204,255,0,0.8)]" : ""}`}>👏</span>
                <span>تشجيع العضو ({post.likes_count})</span>
              </button>
            </div>
          </div>
        </article>

      </div>
    </div>
  );
}

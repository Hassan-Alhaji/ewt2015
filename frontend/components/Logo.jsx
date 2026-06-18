"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared team logo.
 * - Tries /logo.png first (drop the real team logo there).
 * - Falls back automatically to /logo.svg (always present) if the PNG is missing,
 *   so it never shows a broken-image icon.
 */
export default function Logo({ height = 44, withText = false, href = "/", className = "" }) {
  const router = useRouter();
  const [src, setSrc] = useState("/logo.png");
  const imgRef = useRef(null);

  const handleError = () => {
    setSrc((cur) => (cur === "/logo.png" ? "/logo.svg" : cur));
  };

  // Catch the case where the PNG already failed before React hydrated.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) handleError();
  }, []);

  return (
    <div
      className={`flex items-center gap-3 ${href ? "cursor-pointer" : ""} ${className}`}
      onClick={() => href && router.push(href)}
    >
      <img
        ref={imgRef}
        src={src}
        alt="فريق الشرقية للمشي"
        style={{ height, width: "auto" }}
        className="object-contain select-none"
        onError={handleError}
      />
      {withText && (
        <span className="font-black text-lg tracking-wider hidden sm:block text-theme">
          فريق الشرقية للمشي
        </span>
      )}
    </div>
  );
}

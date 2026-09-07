"use client";

export function ShareButton({ title, text }: { title: string; text: string }) {
  async function share() {
    if (navigator.share) {
      await navigator.share({ title, text, url: window.location.href });
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    alert("تم نسخ الرابط");
  }

  return (
    <button className="btn green no-print" type="button" onClick={share}>
      ↗️ مشاركة
    </button>
  );
}

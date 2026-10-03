// 1. الاتصال بقاعدة بيانات Supabase
const SUPABASE_URL = "https://xxfykrtdhsyqtmizvgav.supabase.co";
const SUPABASE_KEY = "Sb_publishable_I1ru_zUVcgszKRcGc4u6wQ_L1BZ9hPh";
const MARKETPLACE_ADDRESS = "0x25548...b07a1"; // استبدل هذا الجزء فقط بالعنوان الكامل المكون من 42 حرفاً

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. تفعيل النموذج عند التحميل
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const inputs = form.querySelectorAll("input");
      const email = inputs[0].value;
      const password = inputs[1].value;

      // محاولة تسجيل الدخول
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        alert("خطأ في تسجيل الدخول: " + error.message);
      } else {
        alert("تم تسجيل الدخول بنجاح!");
        // التوجيه إلى الصفحة الرئيسية أو صفحة المنتجات
        window.location.href = "index.html";
      }
    });
  }
});

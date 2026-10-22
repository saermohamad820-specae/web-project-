// 1. إعداد الاتصال بـ Supabase
const SUPABASE_URL = "https://xxfykrtdhsyqtmizvgav.supabase.co";
const SUPABASE_KEY = "Sb_publishable_I1ru_zUVcgszKRcGc4u6wQ_L1BZ9hPh";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// 2. تسجيل الدخول
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const inputs = loginForm.querySelectorAll("input");
      const email = inputs[0].value.trim();
      const password = inputs[1].value;

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          alert("تعذر تسجيل الدخول: " + error.message);
          return;
        }

        alert("تم تسجيل الدخول بنجاح!");
        window.location.href = "index.html";
      } catch (error) {
        console.error("خطأ تسجيل الدخول:", error);
        alert("حدث خطأ في الاتصال. حاول مرة أخرى.");
      }
    });
  }

  fetchProducts();
});

// 3. جلب المنتجات من قاعدة البيانات
async function fetchProducts() {
  const productsContainer = document.getElementById("products-container");
  if (!productsContainer) return;

  const { data: products, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("خطأ في جلب المنتجات:", error.message);
    return;
  }

  productsContainer.innerHTML = "";

  if (!products || products.length === 0) {
    productsContainer.textContent = "لا توجد منتجات حتى الآن.";
    return;
  }

  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";

    const title = document.createElement("h3");
    title.textContent = product.title || "منتج رقمي";

    const description = document.createElement("p");
    description.textContent = product.description || "";

    const price = document.createElement("p");
    price.textContent = "السعر: " + (product.price ?? "");

    card.append(title, description, price);

    if (product.image_url) {
      const image = document.createElement("img");
      image.src = product.image_url;
      image.alt = product.title || "صورة المنتج";
      image.style.maxWidth = "100%";
      card.prepend(image);
    }

    productsContainer.appendChild(card);
  });
}

// 4. رفع ملف إلى مساحة تخزين Supabase
async function uploadFileToSupabase(fileInputId) {
  const fileInput = document.getElementById(fileInputId);

  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    alert("يرجى اختيار ملف أولاً.");
    return null;
  }

  const { data: userData, error: authError } =
    await supabaseClient.auth.getUser();

  if (authError || !userData.user) {
    alert("يرجى تسجيل الدخول قبل رفع الملف.");
    return null;
  }

  const file = fileInput.files[0];
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userData.user.id}/${Date.now()}_${safeName}`;

  const { data, error } = await supabaseClient.storage
    .from("product-files")
    .upload(filePath, file);

  if (error) {
    console.error("خطأ في رفع الملف:", error.message);
    alert("تعذر رفع الملف: " + error.message);
    return null;
  }

  // الحاوية خاصة؛ هذا مسار الملف وليس رابط تنزيل عام.
  return data.path;
}

// 5. تسجيل الخروج عند الحاجة
async function signOutDigiNest() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("تعذر تسجيل الخروج: " + error.message);
    return;
  }

  window.location.href = "login.html";
}

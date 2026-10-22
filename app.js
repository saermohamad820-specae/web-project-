// ========================================
// 1. الاتصال بـ Supabase
// ========================================
const SUPABASE_URL = "https://xxfykrtdhsyqtmizvgav.supabase.co";
const SUPABASE_KEY = "sb_publishable_I1ru_zUVcgszKrCGc4u6wQ_L1BZ9hPh";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ========================================
// 2. تسجيل الدخول
// ========================================
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const inputs = loginForm.querySelectorAll("input");
      const email = inputs[0]?.value.trim();
      const password = inputs[1]?.value;

      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        alert("تعذر تسجيل الدخول: " + error.message);
        return;
      }

      alert("تم تسجيل الدخول بنجاح!");
      window.location.href = "index.html";
    });
  }

  // عرض المنتجات المحفوظة في قاعدة البيانات
  fetchProducts();

  // ربط نموذج إضافة المنتج
  connectProductForm();
});

// ========================================
// 3. جلب المنتجات من Supabase
// ========================================
async function fetchProducts() {
  const container = document.getElementById("products-container");
  if (!container) return;

  const { data: products, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("خطأ في جلب المنتجات:", error.message);
    container.textContent = "تعذر تحميل المنتجات. يرجى المحاولة لاحقاً.";
    return;
  }

  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.textContent = "لا توجد منتجات حتى الآن.";
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

    container.appendChild(card);
  });
}

// ========================================
// 4. رفع ملف إلى Storage
// ========================================
async function uploadFileToSupabase(file) {
  if (!file) return null;

  const { data: userData, error: authError } =
    await supabaseClient.auth.getUser();

  if (authError || !userData.user) {
    throw new Error("يرجى تسجيل الدخول قبل رفع الملف.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath =
    `${userData.user.id}/${Date.now()}_${safeName}`;

  const { data, error } = await supabaseClient.storage
    .from("product-files")
    .upload(filePath, file);

  if (error) {
    throw new Error("تعذر رفع الملف: " + error.message);
  }

  // نعيد مسار الملف لأن الحاوية خاصة
  return data.path;
}

// ========================================
// 5. حفظ المنتج في قاعدة البيانات
// ========================================
async function saveProductToSupabase({
  title,
  description,
  price,
  imageUrl,
  filePath
}) {
  const { data: userData, error: authError } =
    await supabaseClient.auth.getUser();

  if (authError || !userData.user) {
    throw new Error("يرجى تسجيل الدخول قبل إضافة المنتج.");
  }

  const product = {
    title,
    description,
    price: Number(price),
    image_url: imageUrl || null,
    file_url: filePath || null
  };

  const { data, error } = await supabaseClient
    .from("products")
    .insert(product)
    .select()
    .single();

  if (error) {
    throw new Error("تعذر حفظ المنتج في قاعدة البيانات: " + error.message);
  }

  return data;
}

// ========================================
// 6. ربط نموذج المنتج
// ========================================
function connectProductForm() {
  const form =
    document.getElementById("productForm") ||
    document.getElementById("addProductForm");

  if (!form) {
    console.warn(
      "لم يُعثر على نموذج productForm أو addProductForm. قد نحتاج إلى مطابقة اسم النموذج في index.html."
    );
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const titleInput =
      form.querySelector('[name="title"]') ||
      form.querySelector("#product-title") ||
      form.querySelector("#dn-name");

    const descriptionInput =
      form.querySelector('[name="description"]') ||
      form.querySelector("#product-description") ||
      form.querySelector("#dn-description");

    const priceInput =
      form.querySelector('[name="price"]') ||
      form.querySelector("#product-price") ||
      form.querySelector("#dn-price");

    const imageInput =
      form.querySelector('[name="image_url"]') ||
      form.querySelector("#product-image") ||
      form.querySelector("#dn-image");

    const fileInput =
      form.querySelector('input[type="file"]');

    const title = titleInput?.value.trim();
    const description = descriptionInput?.value.trim() || "";
    const price = priceInput?.value;
    const imageUrl = imageInput?.value.trim() || "";
    const file = fileInput?.files?.[0] || null;

    if (!title || price === "" || price == null || !Number.isFinite(Number(price)) || Number(price) < 0) {
      alert("يرجى إدخال اسم المنتج وسعر صحيح.");
      return;
    }

    const submitButton = form.querySelector(
      'button[type="submit"], input[type="submit"]'
    );
    const originalText = submitButton
      ? submitButton.textContent
      : "";

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "جارٍ حفظ المنتج...";
      }

      let filePath = null;

      if (file) {
        filePath = await uploadFileToSupabase(file);
      }

      await saveProductToSupabase({
        title,
        description,
        price,
        imageUrl,
        filePath
      });

      alert("تم حفظ المنتج في قاعدة بيانات Supabase بنجاح!");
      form.reset();
      await fetchProducts();

    } catch (error) {
      console.error("خطأ في حفظ المنتج:", error);
      alert(error.message || "تعذر حفظ المنتج. يرجى المحاولة مرة أخرى.");

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText || "حفظ المنتج";
      }
    }
  });
}

// ========================================
// 7. تسجيل الخروج
// ========================================
async function signOutDigiNest() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("تعذر تسجيل الخروج: " + error.message);
    return;
  }

  window.location.href = "login.html";
}

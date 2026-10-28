// ========================================
// 1. الاتصال بـ Supabase
// ========================================
const SUPABASE_URL = "https://xxfykrtdhsyqtmizvgav.supabase.co";
const SUPABASE_KEY = "sb_publishable_I1ru_zUVcgszKrCGc4u6wQ_L1BZ9hPh";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const FILES_BUCKET = "product-files";
const IMAGES_BUCKET = "product-images";
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// ========================================
// 2. تشغيل الصفحة
// ========================================
document.addEventListener("DOMContentLoaded", async () => {
  connectLoginForm();
  connectProductForm();
  connectLogoutButtons();

  await fetchProducts();
});

// ========================================
// 3. تسجيل الدخول
// ========================================
function connectLoginForm() {
  const loginForm = document.getElementById("loginForm");

  if (!loginForm || loginForm.dataset.connected === "true") {
    return;
  }

  loginForm.dataset.connected = "true";

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const inputs = loginForm.querySelectorAll("input");
    const email = inputs[0]?.value.trim();
    const password = inputs[1]?.value;

    if (!email || !password) {
      alert("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    const button = loginForm.querySelector(
      'button[type="submit"], input[type="submit"]'
    );

    setButtonLoading(button, true, "جارٍ تسجيل الدخول...");

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(error.message);
      }

      alert("تم تسجيل الدخول بنجاح!");
      window.location.href = "index.html";
    } catch (error) {
      alert("تعذر تسجيل الدخول: " + error.message);
    } finally {
      setButtonLoading(button, false);
    }
  });
}

// ========================================
// 4. التحقق من المستخدم
// ========================================
async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    throw new Error("تعذر التحقق من تسجيل الدخول: " + error.message);
  }

  if (!data?.user) {
    throw new Error("يرجى تسجيل الدخول قبل إضافة المنتج.");
  }

  return data.user;
}

// ========================================
// 5. أسماء الملفات الآمنة
// ========================================
function makeSafeFileName(file) {
  const originalName = file.name || "file";
  const extensionIndex = originalName.lastIndexOf(".");
  const extension =
    extensionIndex > 0
      ? originalName.slice(extensionIndex).toLowerCase()
      : "";

  const baseName =
    extensionIndex > 0
      ? originalName.slice(0, extensionIndex)
      : originalName;

  const safeBaseName = baseName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80) || "file";

  return `${Date.now()}_${safeBaseName}${extension}`;
}

// ========================================
// 6. رفع الملف الرقمي إلى مخزن خاص
// ========================================
async function uploadFileToSupabase(file, userId) {
  if (!file) return null;

  if (!userId) {
    throw new Error("تعذر تحديد المستخدم المسجل.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("حجم الملف الرقمي أكبر من الحد المسموح (50 MB).");
  }

  const filePath = `${userId}/${makeSafeFileName(file)}`;

  const { data, error } = await supabaseClient.storage
    .from(FILES_BUCKET)
    .upload(filePath, file, {
      upsert: false
    });

  if (error) {
    throw new Error("تعذر رفع الملف الرقمي: " + error.message);
  }

  // نخزن المسار، وليس رابطًا عامًا لملف خاص.
  return data.path;
}

// ========================================
// 7. رفع صورة المنتج
// ========================================
async function uploadImageToSupabase(imageFile, userId) {
  if (!imageFile) return null;

  if (!userId) {
    throw new Error("تعذر تحديد المستخدم المسجل.");
  }

  if (!imageFile.type.startsWith("image/")) {
    throw new Error("يرجى اختيار ملف صورة صالح.");
  }

  if (imageFile.size > MAX_IMAGE_SIZE) {
    throw new Error("يجب ألا يتجاوز حجم الصورة 5 MB.");
  }

  const imagePath = `${userId}/${makeSafeFileName(imageFile)}`;

  const { data, error } = await supabaseClient.storage
    .from(IMAGES_BUCKET)
    .upload(imagePath, imageFile, {
      upsert: false
    });

  if (error) {
    throw new Error(
      "تعذر رفع صورة المنتج. تأكد من وجود مخزن الصور وصلاحيات الرفع. " +
      error.message
    );
  }

  // صورة المنتج يمكن عرضها من رابط عام إذا كان مخزن الصور عامًا.
  const { data: publicData } = supabaseClient.storage
    .from(IMAGES_BUCKET)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

// ========================================
// 8. حفظ المنتج في قاعدة البيانات
// ========================================
async function saveProductToSupabase({
  title,
  description,
  price,
  imageUrl,
  filePath,
  userId
}) {
  if (!userId) {
    throw new Error("يرجى تسجيل الدخول قبل إضافة المنتج.");
  }

  const product = {
    title: title.trim(),
    description: description.trim() || null,
    price: Number(price),
    image_url: imageUrl || null,
    file_url: filePath || null,
    user_id: userId
  };

  const { data, error } = await supabaseClient
    .from("products")
    .insert(product)
    .select("id,title,description,price,image_url,file_url,created_at,user_id")
    .single();

  if (error) {
    console.error("خطأ Supabase عند حفظ المنتج:", error);
    throw new Error("تعذر حفظ المنتج: " + error.message);
  }

  return data;
}

// ========================================
// 9. جلب المنتجات وعرضها
// ========================================
async function fetchProducts() {
  const container = document.getElementById("products-container");

  if (!container) return;

  const { data: products, error } = await supabaseClient
    .from("products")
    .select("id,title,description,price,image_url,created_at,file_url")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("خطأ في جلب المنتجات:", error.message);
    container.textContent = "تعذر تحميل المنتجات. يرجى المحاولة لاحقًا.";
    return;
  }

  container.replaceChildren();

  if (!products || products.length === 0) {
    container.textContent = "لا توجد منتجات حتى الآن.";
    return;
  }

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";

    if (product.image_url) {
      const image = document.createElement("img");
      image.src = product.image_url;
      image.alt = product.title || "صورة المنتج";
      image.loading = "lazy";
      image.style.maxWidth = "100%";
      image.style.height = "auto";

      image.addEventListener("error", () => {
        image.style.display = "none";
      });

      card.appendChild(image);
    }

    const title = document.createElement("h3");
    title.textContent = product.title || "منتج رقمي";

    const description = document.createElement("p");
    description.textContent = product.description || "";

    const price = document.createElement("p");
    price.textContent = "السعر: " + Number(product.price || 0).toFixed(2);

    card.append(title, description, price);
    container.appendChild(card);
  });
}

// ========================================
// 10. أدوات أزرار النماذج
// ========================================
function setButtonLoading(button, loading, loadingText = "") {
  if (!button) return;

  if (loading) {
    if (button.dataset.originalText === undefined) {
      button.dataset.originalText =
        button.tagName === "INPUT"
          ? button.value
          : button.textContent;
    }

    button.disabled = true;

    if (button.tagName === "INPUT") {
      button.value = loadingText;
    } else {
      button.textContent = loadingText;
    }

    return;
  }

  button.disabled = false;

  if (button.dataset.originalText !== undefined) {
    if (button.tagName === "INPUT") {
      button.value = button.dataset.originalText;
    } else {
      button.textContent = button.dataset.originalText;
    }

    delete button.dataset.originalText;
  }
}

// ========================================
// 11. ربط نموذج إضافة المنتج
// ========================================
function connectProductForm() {
  const form =
    document.getElementById("productForm") ||
    document.getElementById("addProductForm");

  if (!form || form.dataset.diginestConnected === "true") {
    return;
  }

  form.dataset.diginestConnected = "true";

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

    const imageUrlInput =
      form.querySelector('[name="image_url"]') ||
      form.querySelector("#product-image-url") ||
      form.querySelector("#dn-image-url");

    const imageFileInput =
      form.querySelector('input[name="image_file"]') ||
      form.querySelector('input[name="product_image"]') ||
      form.querySelector("#product-image-file") ||
      form.querySelector("#dn-image-file") ||
      form.querySelector('input[type="file"][accept*="image"]');

    const fileInput =
      form.querySelector('input[name="product_file"]') ||
      form.querySelector("#product-file") ||
      form.querySelector("#dn-file") ||
      form.querySelector('input[type="file"]:not([accept*="image"])');

    const title = titleInput?.value.trim() || "";
    const description = descriptionInput?.value.trim() || "";
    const priceText = priceInput?.value;
    const price = Number(priceText);
    const imageUrl = imageUrlInput?.value.trim() || "";
    const imageFile = imageFileInput?.files?.[0] || null;
    const productFile = fileInput?.files?.[0] || null;

    if (!title) {
      alert("يرجى إدخال اسم المنتج.");
      return;
    }

    if (
      priceText === "" ||
      priceText == null ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      alert("يرجى إدخال سعر صحيح.");
      return;
    }

    if (imageUrl && imageFile) {
      alert("يرجى اختيار صورة أو إدخال رابط صورة، وليس الاثنين معًا.");
      return;
    }

    const submitButton = form.querySelector(
      'button[type="submit"], input[type="submit"]'
    );

    setButtonLoading(submitButton, true, "جارٍ رفع الملفات وحفظ المنتج...");

    try {
      const user = await getCurrentUser();
      const userId = user.id;

      let uploadedImageUrl = imageUrl || null;
      let uploadedFilePath = null;

      // رفع صورة المنتج إذا اختار البائع صورة.
      if (imageFile) {
        uploadedImageUrl = await uploadImageToSupabase(
          imageFile,
          userId
        );
      }

      // رفع الملف الرقمي إذا اختار البائع ملفًا.
      if (productFile) {
        uploadedFilePath = await uploadFileToSupabase(
          productFile,
          userId
        );
      }

      const savedProduct = await saveProductToSupabase({
        title,
        description,
        price,
        imageUrl: uploadedImageUrl,
        filePath: uploadedFilePath,
        userId
      });

      console.log("تم حفظ المنتج بنجاح:", savedProduct);

      alert("تم حفظ المنتج بنجاح!");

      form.reset();
      await fetchProducts();

    } catch (error) {
      console.error("خطأ في حفظ المنتج:", error);
      alert(error.message || "تعذر حفظ المنتج. يرجى المحاولة مرة أخرى.");
    } finally {
      setButtonLoading(submitButton, false);
    }
  });
}

// ========================================
// 12. تسجيل الخروج
// ========================================
function connectLogoutButtons() {
  const logoutButtons = document.querySelectorAll(
    "#logoutButton, #logoutBtn, [data-action='logout']"
  );

  logoutButtons.forEach((button) => {
    if (button.dataset.logoutConnected === "true") return;

    button.dataset.logoutConnected = "true";

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      await signOutDigiNest();
    });
  });
}

async function signOutDigiNest() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("تعذر تسجيل الخروج: " + error.message);
    return;
  }

  window.location.href = "login.html";
}

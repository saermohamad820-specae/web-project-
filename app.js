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
// 1. إعداد عنوان العقد والـ ABI

const contractABI = [
  "function productCount() view returns (uint256)",
  "function products(uint256) view returns (uint256 id, address seller, uint256 price, string metadataURI, bool active)",
  "function buyProduct(uint256 _id) payable",
  "event ProductPurchased(uint256 indexed id, address indexed buyer, address indexed seller, uint256 price)"
];

let provider;
let signer;
let marketplaceContract;

// 2. تهيئة الاتصال بالعقد بعد ربط المحفظة
async function initContract() {
  if (typeof window.ethereum !== 'undefined') {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, contractABI, signer);
    
    // جلب المنتجات فور إتمام الاتصال
    loadMarketplaceProducts();
  } else {
    alert("يرجى تثبيت محفظة MetaMask أو محفظة Web3 مدعومة.");
  }
}

// 3. جلب وعرض المنتجات ديناميكياً من العقد الذكي
async function loadMarketplaceProducts() {
  try {
    const count = await marketplaceContract.productCount();
    const productsContainer = document.getElementById("products-container"); // تأكد من وجود عنصر بهذا ID في index.html
    if (!productsContainer) return;

    productsContainer.innerHTML = ""; // تفريغ المحتوى القديم

    for (let i = 1; i <= count; i++) {
      const product = await marketplaceContract.products(i);
      
      if (product.active) {
        // تحويل السعر من Wei إلى ETH/MATIC
        const priceInEth = ethers.utils.formatEther(product.price);

        // جلب بيانات المنتج المترجمة من IPFS أو Metadata URI إذا كانت متوفرة
        const productCard = `
          <div class="product-card" style="border: 1px solid #333; padding: 15px; margin: 10px; border-radius: 8px;">
            <h3>منتج رقم #${product.id}</h3>
            <p><strong>البائع:</strong> ${product.seller.substring(0, 6)}...${product.seller.substring(38)}</p>
            <p><strong>السعر:</strong> ${priceInEth} ETH / MATIC</p>
            <button onclick="buyProduct(${product.id}, '${priceInEth}')" style="background-color: #10B981; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">
              شراء الآن (تسليم تلقائي)
            </button>
          </div>
        `;
        productsContainer.innerHTML += productCard;
      }
    }
  } catch (error) {
    console.error("خطأ في جلب المنتجات:", error);
  }
}

// 4. دالة شراء المنتج والتفاعل مع العقد
async function buyProduct(productId, priceInEth) {
  try {
    const priceInWei = ethers.utils.parseEther(priceInEth);
    
    // استدعاء دالة buyProduct في العقد وإرسال القيمة المالية
    const tx = await marketplaceContract.buyProduct(productId, {
      value: priceInWei
    });

    alert("جاري معالجة المعاملة على البلوكشين...");
    await tx.wait(); // الانتظار حتى تأكيد المعاملة

    alert("تم الشراء بنجاح! تم توزيع الأرباح تلقائياً.");
    
    // توجيه المشتري لصفحة مشترياته أو فتح رابط التحميل
    window.location.href = "muchtaryati.html"; // أو الصفحات المعنية في تطبيقك
  } catch (error) {
    console.error("فشلت عملية الشراء:", error);
    alert("حدث خطأ أثناء الشراء، يرجى التأكد من رصيد المحفظة وإعادة المحاولة.");
  }
}

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
});// 3. جلب المنتجات وعرضها في الصفحة
async function fetchProducts() {
  const productsContainer = document.getElementById("products-container");
  if (!productsContainer) return;

  const { data: products, error } = await supabase
    .from("products")
    .select("*");

  if (error) {
    console.error("خطأ في جلب المنتجات:", error.message);
    return;
  }

  productsContainer.innerHTML = "";

  products.forEach((product) => {
    const productCard = `
      <div class="product-card">
        <img src="${product.image_url}" alt="${product.title}">
        <h3>${product.title}</h3>
        <p>${product.description}</p>
        <span class="price">${product.price} ETH</span>
        <button onclick="buyProduct('${product.id}', '${product.price}')">شراء الآن</button>
      </div>
    `;
    productsContainer.innerHTML += productCard;
  });
}

document.addEventListener("DOMContentLoaded", fetchProducts);
// 1. دالة رفع الصور/الملفات إلى Supabase Storage
async function uploadFileToSupabase(fileInputId) {
  try {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || !fileInput.files[0]) {
      alert("يرجى اختيار ملف أو صورة أولاً.");
      return null;
    }

    const file = fileInput.files[0];
    const fileName = `${Date.now()}_${file.name}`;

    const { data, error } = await supabase.storage
      .from('products')
      .upload(fileName, file);

    if (error) {
      console.error("خطأ أثناء الرفع إلى Supabase:", error);
      alert("فشل رفع الملف.");
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('products')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("حدث خطأ غير متوقع:", err);
    return null;
  }
}

// 2. دالة إضافة المنتج عبر العقد الذكي والتخزين
async function handleAddProduct() {
  const priceInput = document.getElementById("product-price").value;
  
  const fileUrl = await uploadFileToSupabase("product-file-input");
  if (!fileUrl) return;

  await listNewProduct(priceInput, fileUrl);
}

async function handleAddProduct() {
  const priceInput = document.getElementById("product-price").value;
  
  // 1. رفع الملف وسحب الرابط المباشر
  const fileUrl = await uploadFileToSupabase("product-file-input");
  if (!fileUrl) return;

  // 2. تسجيل المنتج في العقد الذكي باستخدام الرابط
  await listNewProduct(priceInput, fileUrl);
}


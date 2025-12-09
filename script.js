// --- ۱. تنظیمات اتصال به Supabase ---
const supabaseUrl = 'https://evdgfokcypawlaxgzxdg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2ZGdmb2tjeXBhd2xheGd6eGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTQzNTgsImV4cCI6MjA4MDc3MDM1OH0.XF2C5GeANSetMkoyVDIDFWMNvmtDU9beP70ZwGHV3M0';

let db = null;
try {
    if (typeof supabase !== 'undefined') {
        db = supabase.createClient(supabaseUrl, supabaseKey);
    }
} catch (err) { console.error("خطا در بارگذاری Supabase", err); }

// --- متغیرهای سراسری ---
let menuData = {}; // منو اینجا بارگذاری می‌شود
let cart = {}; 
let currentUser = null; 
let currentTable = null;

// --- ۲. شروع برنامه ---
window.onload = async function() {
    // الف) بررسی وضعیت ورود کاربر
    checkAuth();
    
    // ب) دانلود منو از دیتابیس
    await loadMenuFromDB();
};

// --- ۳. توابع مربوط به احراز هویت ---
function checkAuth() {
    // آیا اطلاعات کاربر در حافظه مرورگر هست؟
    const storedUser = localStorage.getItem('restaurant_customer_v2');
    
    if (storedUser) {
        // بله، قبلاً ثبت نام کرده -> برو به انتخاب میز
        currentUser = JSON.parse(storedUser);
        showTableModal();
    } else {
        // خیر، کاربر جدید است -> نمایش فرم ثبت نام
        document.getElementById('register-modal').classList.remove('hidden');
    }
}

// ثبت نام کاربر جدید
window.registerUser = async function() {
    const fname = document.getElementById('reg-fname').value.trim();
    const lname = document.getElementById('reg-lname').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();

    if (!fname || !lname || !phone) {
        alert("لطفاً تمام فیلدهای ستاره‌دار (*) را پر کنید.");
        return;
    }

    currentUser = { fname, lname, phone };

    // ارسال به دیتابیس (باشگاه مشتریان)
    if (db) {
        // خطا را نادیده می‌گیریم (مثلاً اگر شماره تکراری بود)
        await db.from('customers').insert([
            { first_name: fname, last_name: lname, phone: phone }
        ]);
    }

    // ذخیره در مرورگر مشتری
    localStorage.setItem('restaurant_customer_v2', JSON.stringify(currentUser));

    // مخفی کردن فرم ثبت نام
    document.getElementById('register-modal').classList.add('hidden');
    showTableModal();
}

function showTableModal() {
    document.getElementById('table-modal').classList.remove('hidden');
    document.getElementById('welcome-msg').innerText = `خوش آمدید، ${currentUser.fname} عزیز`;
}

// تایید شماره میز
window.confirmTable = function() {
    const tableNum = document.getElementById('table-num').value;
    if (!tableNum) {
        alert("لطفاً شماره میز را وارد کنید.");
        return;
    }

    currentTable = tableNum;
    
    // باز کردن منوی اصلی
    document.getElementById('table-modal').classList.add('hidden');
    document.getElementById('main-container').classList.remove('hidden');
    document.getElementById('cart-bar').classList.remove('hidden');

    // نمایش نام کاربر و میز در هدر
    const infoDisplay = document.getElementById('user-info-display');
    if(infoDisplay) {
        infoDisplay.innerText = `${currentUser.fname} ${currentUser.lname} | میز: ${currentTable}`;
    }
}

// خروج (پاک کردن اطلاعات از مرورگر)
window.logout = function() {
    if(confirm("آیا می‌خواهید با شماره دیگری وارد شوید؟")) {
        localStorage.removeItem('restaurant_customer_v2');
        location.reload();
    }
}

// --- ۴. توابع مربوط به منو و دیتابیس ---
async function loadMenuFromDB() {
    if (!db) return;

    const container = document.getElementById('menu-container');
    container.innerHTML = '<p style="text-align:center; padding:20px;">در حال دریافت منو...</p>';

    // دریافت آیتم‌های فعال از دیتابیس
    const { data, error } = await db
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('id', { ascending: true });

    if (error) {
        console.error("Error menu:", error);
        container.innerHTML = '<p style="text-align:center; color:red;">خطا در دریافت منو</p>';
        return;
    }

    // تبدیل لیست تخت به دسته‌بندی شده
    const structuredMenu = {};
    data.forEach(item => {
        if (!structuredMenu[item.category]) structuredMenu[item.category] = {};
        if (!structuredMenu[item.category][item.subcategory]) structuredMenu[item.category][item.subcategory] = [];
        
        structuredMenu[item.category][item.subcategory].push(item);
    });

    menuData = structuredMenu;
    renderMenu();
}

function renderMenu() {
    const container = document.getElementById('menu-container');
    container.innerHTML = '';

    if (Object.keys(menuData).length === 0) {
        container.innerHTML = '<p style="text-align:center;">منو خالی است.</p>';
        return;
    }

    for (const [category, subcategories] of Object.entries(menuData)) {
        const catHeader = document.createElement('div');
        catHeader.className = 'category-title';
        catHeader.innerText = category;
        container.appendChild(catHeader);

        for (const [subcat, items] of Object.entries(subcategories)) {
            const subHeader = document.createElement('div');
            subHeader.className = 'subcategory-title';
            subHeader.innerText = subcat;
            container.appendChild(subHeader);

            items.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'item-card';
                itemEl.innerHTML = `
                    <div class="item-info">
                        <h3>${item.name}</h3>
                        <span class="item-price">${item.price.toLocaleString()} تومان</span>
                    </div>
                    <div class="item-controls">
                        <button class="btn-qty" onclick="updateCart(${item.id}, 1)">+</button>
                        <span id="qty-${item.id}" class="qty-display">${cart[item.id] || 0}</span>
                        <button class="btn-qty" onclick="updateCart(${item.id}, -1)">-</button>
                    </div>
                `;
                container.appendChild(itemEl);
            });
        }
    }
}

// --- ۵. توابع سبد خرید و سفارش ---
window.updateCart = function(itemId, change) {
    if (!cart[itemId]) cart[itemId] = 0;
    cart[itemId] += change;
    
    if (cart[itemId] < 0) cart[itemId] = 0;

    const qtyDisplay = document.getElementById(`qty-${itemId}`);
    if (qtyDisplay) qtyDisplay.innerText = cart[itemId];
    
    if (cart[itemId] === 0) delete cart[itemId];

    calculateTotal();
}

function calculateTotal() {
    let total = 0;
    for (const cat in menuData) {
        for (const sub in menuData[cat]) {
            menuData[cat][sub].forEach(item => {
                if (cart[item.id]) total += item.price * cart[item.id];
            });
        }
    }
    const totalEl = document.getElementById('total-price');
    if(totalEl) totalEl.innerText = total.toLocaleString();
}

window.placeOrder = async function() {
    if (!db) { alert("اتصال به دیتابیس برقرار نیست."); return; }
    if (Object.keys(cart).length === 0) { alert("سبد خرید شما خالی است!"); return; }

    const orderItems = [];
    let totalPrice = 0;

    for (const cat in menuData) {
        for (const sub in menuData[cat]) {
            menuData[cat][sub].forEach(item => {
                if (cart[item.id] > 0) {
                    orderItems.push({
                        name: item.name,
                        price: item.price,
                        quantity: cart[item.id]
                    });
                    totalPrice += item.price * cart[item.id];
                }
            });
        }
    }

    const btn = document.getElementById('order-btn');
    const originalText = btn.innerText;
    btn.innerText = "در حال ارسال...";
    btn.disabled = true;

    const { error } = await db.from('orders').insert([{
        first_name: currentUser.fname,
        last_name: currentUser.lname,
        customer_name: `${currentUser.fname} ${currentUser.lname}`,
        customer_phone: currentUser.phone,
        table_number: currentTable,
        items: orderItems,
        total_price: totalPrice,
        status: 'pending'
    }]);

    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        console.error(error);
        alert("خطا در ثبت سفارش: " + error.message);
    } else {
        alert("سفارش شما با موفقیت ثبت شد!");
        cart = {};
        renderMenu(); // ریست کردن عددها
        calculateTotal();
    }
}

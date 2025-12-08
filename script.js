// --- تنظیمات Supabase ---
// ابتدا مطمئن می‌شویم کتابخانه لود شده است
const supabaseUrl = 'https://evdgfokcypawlaxgzxdg.supabase.co'; // آدرس خود را اینجا بگذارید
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2ZGdmb2tjeXBhd2xheGd6eGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTQzNTgsImV4cCI6MjA4MDc3MDM1OH0.XF2C5GeANSetMkoyVDIDFWMNvmtDU9beP70ZwGHV3M0'; // کلید خود را اینجا بگذارید

let db = null;

try {
    if (typeof supabase !== 'undefined') {
        db = supabase.createClient(supabaseUrl, supabaseKey);
        console.log("Supabase متصل شد.");
    } else {
        console.error("کتابخانه Supabase لود نشد. اینترنت خود را چک کنید.");
        alert("خطا در بارگذاری سیستم. لطفاً صفحه را رفرش کنید.");
    }
} catch (err) {
    console.error("خطا در تنظیمات Supabase:", err);
}

// --- داده‌های منو ---
const menuData = {
    "غذاها": {
        "کباب‌ها": [
            { id: 1, name: "کباب کوبیده", price: 150000 },
            { id: 2, name: "جوجه کباب", price: 140000 }
        ],
        "خورشت‌ها": [
            { id: 3, name: "قرمه سبزی", price: 120000 },
            { id: 4, name: "قیمه بادمجان", price: 110000 }
        ]
    },
    "نوشیدنی گرم": {
        "قهوه": [
            { id: 5, name: "اسپرسو", price: 40000 },
            { id: 6, name: "لاته", price: 55000 }
        ],
        "چای": [
            { id: 7, name: "چای سیاه", price: 20000 }
        ]
    },
    "نوشیدنی سرد": {
        "گازدار": [
            { id: 8, name: "نوشابه قوطی", price: 25000 }
        ],
        "طبیعی": [
            { id: 9, name: "آب پرتقال", price: 60000 }
        ]
    }
};

let cart = {}; 
let userInfo = null;

// --- شروع برنامه ---
window.onload = function() {
    console.log("برنامه شروع شد...");
    checkLogin();
    renderMenu();
};

function checkLogin() {
    try {
        const storedUser = localStorage.getItem('restaurant_user');
        if (storedUser) {
            userInfo = JSON.parse(storedUser);
            document.getElementById('login-modal').classList.add('hidden');
            document.getElementById('main-container').classList.remove('hidden');
            document.getElementById('cart-bar').classList.remove('hidden');
            
            const infoDisplay = document.getElementById('user-info-display');
            if(infoDisplay) {
                infoDisplay.innerText = `${userInfo.name} | میز: ${userInfo.table}`;
            }
        }
    } catch (e) {
        console.error("خطا در خواندن اطلاعات کاربر", e);
    }
}

// تابع متصل به دکمه ورود
window.saveUserInfo = function() {
    console.log("دکمه زده شد."); // برای تست
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const tableInput = document.getElementById('table-num');

    if (!nameInput || !phoneInput || !tableInput) {
        console.error("المان‌های ورودی پیدا نشدند!");
        return;
    }

    const name = nameInput.value;
    const phone = phoneInput.value;
    const table = tableInput.value;

    if (!name || !phone || !table) {
        alert("لطفاً همه موارد را پر کنید.");
        return;
    }

    userInfo = { name, phone, table };
    localStorage.setItem('restaurant_user', JSON.stringify(userInfo));
    checkLogin();
}

function renderMenu() {
    const container = document.getElementById('menu-container');
    if (!container) return;
    
    container.innerHTML = ''; // پاک کردن محتوای قبلی برای جلوگیری از تکرار

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
                        <span id="qty-${item.id}" class="qty-display">0</span>
                        <button class="btn-qty" onclick="updateCart(${item.id}, -1)">-</button>
                    </div>
                `;
                container.appendChild(itemEl);
            });
        }
    }
}

// توابع گلوبال برای دسترسی در HTML
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
                if (cart[item.id]) {
                    total += item.price * cart[item.id];
                }
            });
        }
    }
    const totalEl = document.getElementById('total-price');
    if(totalEl) totalEl.innerText = total.toLocaleString();
}

window.placeOrder = async function() {
    if (!db) {
        alert("ارتباط با دیتابیس برقرار نیست. لطفاً تنظیمات فایل script.js را بررسی کنید.");
        return;
    }

    if (Object.keys(cart).length === 0) {
        alert("سبد خرید شما خالی است!");
        return;
    }

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

    // تغییر وضعیت دکمه برای جلوگیری از کلیک مجدد
    const btn = document.getElementById('order-btn');
    const originalText = btn.innerText;
    btn.innerText = "در حال ارسال...";
    btn.disabled = true;

    const { data, error } = await db
        .from('orders')
        .insert([
            {
                customer_name: userInfo.name,
                customer_phone: userInfo.phone,
                table_number: userInfo.table,
                items: orderItems,
                total_price: totalPrice,
                status: 'pending'
            }
        ]);

    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        console.error('Error:', error);
        alert("خطا در ثبت سفارش: " + error.message);
    } else {
        alert("سفارش شما با موفقیت ثبت شد!");
        cart = {};
        document.querySelectorAll('.qty-display').forEach(el => el.innerText = '0');
        calculateTotal();
    }
}

// --- تنظیمات Supabase ---
const supabaseUrl = 'https://evdgfokcypawlaxgzxdg.supabase.co'; // آدرس پروژه خود را اینجا بگذارید
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2ZGdmb2tjeXBhd2xheGd6eGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTQzNTgsImV4cCI6MjA4MDc3MDM1OH0.XF2C5GeANSetMkoyVDIDFWMNvmtDU9beP70ZwGHV3M0'; // کلید anon خود را اینجا بگذارید
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

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

let cart = {}; // سبد خرید: { id: quantity }
let userInfo = null;

// --- شروع برنامه ---
window.onload = function() {
    checkLogin();
    renderMenu();
};

function checkLogin() {
    const storedUser = localStorage.getItem('restaurant_user');
    if (storedUser) {
        userInfo = JSON.parse(storedUser);
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');
        document.getElementById('cart-bar').classList.remove('hidden');
        document.getElementById('user-info-display').innerText = 
            `${userInfo.name} | میز: ${userInfo.table}`;
    }
}

function saveUserInfo() {
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const table = document.getElementById('table-num').value;

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

function updateCart(itemId, change) {
    if (!cart[itemId]) cart[itemId] = 0;
    cart[itemId] += change;

    if (cart[itemId] < 0) cart[itemId] = 0;

    // به‌روزرسانی عدد در کادر
    document.getElementById(`qty-${itemId}`).innerText = cart[itemId];

    // اگر صفر شد از سبد حذف کن (اختیاری)
    if (cart[itemId] === 0) delete cart[itemId];

    calculateTotal();
}

function calculateTotal() {
    let total = 0;
    
    // جستجو در تمام آیتم‌ها برای پیدا کردن قیمت
    for (const cat in menuData) {
        for (const sub in menuData[cat]) {
            menuData[cat][sub].forEach(item => {
                if (cart[item.id]) {
                    total += item.price * cart[item.id];
                }
            });
        }
    }

    document.getElementById('total-price').innerText = total.toLocaleString();
}

async function placeOrder() {
    if (Object.keys(cart).length === 0) {
        alert("سبد خرید شما خالی است!");
        return;
    }

    const orderItems = [];
    let totalPrice = 0;

    // تبدیل سبد خرید به فرمت قابل ذخیره و محاسبه قیمت نهایی
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

    // ارسال به Supabase
    const { data, error } = await supabase
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

    if (error) {
        console.error('Error:', error);
        alert("خطا در ثبت سفارش. لطفاً دوباره تلاش کنید.");
    } else {
        alert("سفارش شما با موفقیت ثبت شد!");
        // ریست کردن سبد خرید (اختیاری)
        cart = {};
        document.querySelectorAll('.qty-display').forEach(el => el.innerText = '0');
        calculateTotal();
    }
}

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
let menuData = {}; 
let itemMap = {}; // برای جستجوی سریع آیتم‌ها با ID
let cart = {}; 
let currentUser = null; 
let currentTable = null;
const SESSION_TIMEOUT = 60 * 60 * 1000;

// --- ۲. شروع برنامه ---
window.onload = async function() {
    checkAuth();
    await loadMenuFromDB();
};

// --- ۳. توابع احراز هویت ---
function checkAuth() {
    const loadingScreen = document.getElementById('loading-screen');
    const storedUser = localStorage.getItem('restaurant_customer_v2');
    
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        const storedSession = localStorage.getItem('restaurant_table_session');
        
        if (storedSession) {
            const session = JSON.parse(storedSession);
            const now = Date.now();

            if (now - session.timestamp < SESSION_TIMEOUT) {
                currentTable = session.table;
                showApp();
            } else {
                showTableModal();
            }
        } else {
            showTableModal();
        }
    } else {
        document.getElementById('register-modal').classList.remove('hidden');
    }

    if (loadingScreen) loadingScreen.style.display = 'none';
}

window.registerUser = async function() {
    const fname = document.getElementById('reg-fname').value.trim();
    const lname = document.getElementById('reg-lname').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();

    if (!fname || !lname || !phone) {
        alert("لطفاً تمام فیلدهای ستاره‌دار (*) را پر کنید.");
        return;
    }

    currentUser = { fname, lname, phone };

    if (db) {
        await db.from('customers').insert([
            { first_name: fname, last_name: lname, phone: phone }
        ]);
    }

    localStorage.setItem('restaurant_customer_v2', JSON.stringify(currentUser));
    document.getElementById('register-modal').classList.add('hidden');
    showTableModal();
}

function showTableModal() {
    document.getElementById('main-container').classList.add('hidden');
    document.getElementById('register-modal').classList.add('hidden');
    document.getElementById('table-modal').classList.remove('hidden');
    if(currentUser) document.getElementById('welcome-msg').innerText = `خوش آمدید، ${currentUser.fname} عزیز`;
}

window.confirmTable = function() {
    const tableNum = document.getElementById('table-num').value;
    if (!tableNum) { alert("لطفاً شماره میز را وارد کنید."); return; }

    currentTable = tableNum;
    localStorage.setItem('restaurant_table_session', JSON.stringify({
        table: tableNum,
        timestamp: Date.now()
    }));

    document.getElementById('table-modal').classList.add('hidden');
    showApp();
}

function showApp() {
    document.getElementById('register-modal').classList.add('hidden');
    document.getElementById('table-modal').classList.add('hidden');
    document.getElementById('main-container').classList.remove('hidden');
    
    const infoDisplay = document.getElementById('user-info-display');
    if(infoDisplay) infoDisplay.innerText = `${currentUser.fname} ${currentUser.lname} | میز: ${currentTable}`;
    
    // پیش‌فرض: تب منو باز شود
    switchTab('menu');
}

window.changeTable = function() {
    showTableModal();
    document.getElementById('table-num').value = '';
}

window.logout = function() {
    if(confirm("خروج از حساب؟")) {
        localStorage.removeItem('restaurant_customer_v2');
        localStorage.removeItem('restaurant_table_session');
        location.reload();
    }
}

// --- ۴. مدیریت تب‌ها (جدید) ---
window.switchTab = function(tabName) {
    // تغییر رنگ دکمه‌های پایین
    document.getElementById('nav-btn-menu').classList.remove('active');
    document.getElementById('nav-btn-cart').classList.remove('active');
    
    // مخفی/نمایان کردن صفحات
    document.getElementById('menu-page').classList.add('hidden');
    document.getElementById('cart-page').classList.add('hidden');
    
    if (tabName === 'menu') {
        document.getElementById('menu-page').classList.remove('hidden');
        document.getElementById('nav-btn-menu').classList.add('active');
    } else if (tabName === 'cart') {
        document.getElementById('cart-page').classList.remove('hidden');
        document.getElementById('nav-btn-cart').classList.add('active');
        renderCartPage(); // بازسازی صفحه سبد خرید
    }
}

// --- ۵. توابع منو ---
async function loadMenuFromDB() {
    if (!db) return;
    const container = document.getElementById('menu-container');
    container.innerHTML = '<p style="text-align:center; padding:20px;">در حال دریافت منو...</p>';

    const { data, error } = await db
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('id', { ascending: true });

    if (error) {
        container.innerHTML = '<p style="text-align:center;">خطا در دریافت منو</p>';
        return;
    }

    const structuredMenu = {};
    itemMap = {}; // ریست کردن مپ

    data.forEach(item => {
        // ذخیره در مپ برای دسترسی سریع
        itemMap[item.id] = item;

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
                const descHtml = item.description ? `<p class="item-desc">${item.description}</p>` : '';
                const itemEl = document.createElement('div');
                itemEl.className = 'item-card';
                itemEl.innerHTML = `
                    <div class="item-info">
                        <h3>${item.name}</h3>
                        ${descHtml}
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

// --- ۶. مدیریت سبد خرید ---
window.updateCart = function(itemId, change) {
    if (!cart[itemId]) cart[itemId] = 0;
    cart[itemId] += change;
    if (cart[itemId] < 0) cart[itemId] = 0;
    if (cart[itemId] === 0) delete cart[itemId];

    // آپدیت عدد در صفحه منو (اگر وجود داشت)
    const qtyDisplay = document.getElementById(`qty-${itemId}`);
    if (qtyDisplay) qtyDisplay.innerText = cart[itemId] || 0;

    // آپدیت بج (عدد قرمز) روی نوار پایین
    updateCartBadge();

    // اگر در صفحه سبد خرید هستیم، لیست را رفرش کن
    if (!document.getElementById('cart-page').classList.contains('hidden')) {
        renderCartPage();
    }
}

function updateCartBadge() {
    const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
    const badge = document.getElementById('cart-badge');
    if (totalItems > 0) {
        badge.innerText = totalItems;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// رندر صفحه سبد خرید (جدید)
function renderCartPage() {
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-page');
    list.innerHTML = '';
    
    let total = 0;
    let hasItems = false;

    // پیمایش آیتم‌های سبد خرید
    for (const [id, qty] of Object.entries(cart)) {
        if (qty > 0 && itemMap[id]) {
            hasItems = true;
            const item = itemMap[id];
            total += item.price * qty;

            const div = document.createElement('div');
            div.className = 'item-card';
            div.innerHTML = `
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <span class="item-price">${(item.price * qty).toLocaleString()} تومان</span>
                </div>
                <div class="item-controls">
                    <button class="btn-qty" onclick="updateCart(${item.id}, 1)">+</button>
                    <span class="qty-display">${qty}</span>
                    <button class="btn-qty" onclick="updateCart(${item.id}, -1)">-</button>
                </div>
            `;
            list.appendChild(div);
        }
    }

    if (!hasItems) {
        list.innerHTML = '<div class="cart-empty-msg">سبد خرید شما خالی است 🛒</div>';
        document.getElementById('order-btn').disabled = true;
        document.getElementById('order-btn').style.background = '#ccc';
    } else {
        document.getElementById('order-btn').disabled = false;
        document.getElementById('order-btn').style.background = '#2ecc71';
    }

    totalEl.innerText = total.toLocaleString() + ' تومان';
}

window.placeOrder = async function() {
    if (!db) { alert("اتصال برقرار نیست."); return; }
    if (Object.keys(cart).length === 0) { alert("سبد خالی است"); return; }

    const orderItems = [];
    let totalPrice = 0;

    for (const [id, qty] of Object.entries(cart)) {
        const item = itemMap[id];
        if (item && qty > 0) {
            orderItems.push({
                name: item.name,
                price: item.price,
                quantity: qty
            });
            totalPrice += item.price * qty;
        }
    }

    const btn = document.getElementById('order-btn');
    const oldText = btn.innerText;
    btn.innerText = "⏳ در حال ارسال...";
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

    btn.innerText = oldText;
    btn.disabled = false;

    if (error) {
        alert("خطا: " + error.message);
    } else {
        alert("سفارش با موفقیت ثبت شد!");
        cart = {};
        updateCartBadge();
        switchTab('menu'); // بازگشت به منو
        renderMenu(); // ریست کردن عددها
    }
}

// --- ۷. تاریخچه ---
window.openHistory = async function() {
    if (!currentUser) return;
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    
    modal.classList.remove('hidden');
    list.innerHTML = '<p style="text-align:center;">در حال دریافت...</p>';

    const { data, error } = await db
        .from('orders')
        .select('*')
        .eq('customer_phone', currentUser.phone)
        .order('created_at', { ascending: false });

    if (error) { list.innerHTML = 'خطا در دریافت'; return; }
    if (!data.length) { list.innerHTML = '<p style="text-align:center;">خالی</p>'; return; }

    list.innerHTML = '';
    data.forEach(order => {
        const d = new Date(order.created_at);
        const dateStr = d.toLocaleDateString('fa-IR');
        const timeStr = d.toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'});

        let itemsHtml = '';
        order.items.forEach(i => itemsHtml += `<li><span>${i.name}</span><span>${i.quantity}</span></li>`);

        const div = document.createElement('div');
        div.className = 'history-card';
        div.innerHTML = `
            <div class="history-date">${dateStr} | ${timeStr}</div>
            <ul class="history-items">${itemsHtml}</ul>
            <div class="history-total">مبلغ: ${order.total_price.toLocaleString()}</div>
        `;
        list.appendChild(div);
    });
}

window.closeHistory = function() {
    document.getElementById('history-modal').classList.add('hidden');
}

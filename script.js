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
let itemMap = {}; 
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

    if (!fname || !lname || !phone) { alert("لطفاً تمام فیلدها را پر کنید."); return; }
    currentUser = { fname, lname, phone };

    if (db) await db.from('customers').insert([{ first_name: fname, last_name: lname, phone: phone }]);
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
    if (!tableNum) { alert("شماره میز الزامی است."); return; }
    currentTable = tableNum;
    localStorage.setItem('restaurant_table_session', JSON.stringify({ table: tableNum, timestamp: Date.now() }));
    document.getElementById('table-modal').classList.add('hidden');
    showApp();
}

function showApp() {
    document.getElementById('register-modal').classList.add('hidden');
    document.getElementById('table-modal').classList.add('hidden');
    document.getElementById('main-container').classList.remove('hidden');
    
    const infoDisplay = document.getElementById('user-info-display');
    if(infoDisplay) {
        // نمایش اطلاعات در گوشه بالا چپ
        infoDisplay.innerHTML = `<span>میز: ${currentTable}</span>${currentUser.fname} ${currentUser.lname}`;
    }
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
window.closeModal = function(id) { document.getElementById(id).classList.add('hidden'); }

// --- ۴. مدیریت تب‌ها ---
window.switchTab = function(tabName) {
    document.getElementById('nav-btn-menu').classList.remove('active');
    document.getElementById('nav-btn-cart').classList.remove('active');
    document.getElementById('menu-page').classList.add('hidden');
    document.getElementById('cart-page').classList.add('hidden');
    
    if (tabName === 'menu') {
        document.getElementById('menu-page').classList.remove('hidden');
        document.getElementById('nav-btn-menu').classList.add('active');
    } else if (tabName === 'cart') {
        document.getElementById('cart-page').classList.remove('hidden');
        document.getElementById('nav-btn-cart').classList.add('active');
        renderCartPage();
    }
}

// --- ۵. توابع منو ---
async function loadMenuFromDB() {
    if (!db) return;
    const { data, error } = await db.from('menu_items').select('*').eq('is_available', true).order('id', { ascending: true });
    if (error) return;

    const structuredMenu = {};
    itemMap = {};
    data.forEach(item => {
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
    const qtyDisplay = document.getElementById(`qty-${itemId}`);
    if (qtyDisplay) qtyDisplay.innerText = cart[itemId] || 0;
    updateCartBadge();
    if (!document.getElementById('cart-page').classList.contains('hidden')) renderCartPage();
}

function updateCartBadge() {
    const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
    const badge = document.getElementById('cart-badge');
    if (totalItems > 0) { badge.innerText = totalItems; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }
}

function renderCartPage() {
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-page');
    list.innerHTML = '';
    let total = 0;
    let hasItems = false;

    for (const [id, qty] of Object.entries(cart)) {
        if (qty > 0 && itemMap[id]) {
            hasItems = true;
            const item = itemMap[id];
            total += item.price * qty;
            const div = document.createElement('div');
            div.className = 'item-card';
            div.innerHTML = `
                <div class="item-info"><h3>${item.name}</h3><span class="item-price">${(item.price * qty).toLocaleString()} تومان</span></div>
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
        list.innerHTML = '<div style="text-align:center;color:#999;margin-top:50px;">سبد خرید خالی است</div>';
        document.getElementById('order-btn').disabled = true;
        document.getElementById('order-btn').style.background = '#ccc';
    } else {
        document.getElementById('order-btn').disabled = false;
        document.getElementById('order-btn').style.background = '#2ecc71';
    }
    totalEl.innerText = total.toLocaleString() + ' تومان';
}

window.placeOrder = async function() {
    if (!db) return;
    if (Object.keys(cart).length === 0) return;

    const orderItems = [];
    let totalPrice = 0;
    for (const [id, qty] of Object.entries(cart)) {
        const item = itemMap[id];
        if (item && qty > 0) {
            orderItems.push({ name: item.name, price: item.price, quantity: qty });
            totalPrice += item.price * qty;
        }
    }

    const btn = document.getElementById('order-btn');
    const oldText = btn.innerText;
    btn.innerText = "⏳ ارسال...";
    btn.disabled = true;

    const { error } = await db.from('orders').insert([{
        first_name: currentUser.fname,
        last_name: currentUser.lname,
        customer_name: `${currentUser.fname} ${currentUser.lname}`,
        customer_phone: currentUser.phone,
        table_number: currentTable,
        items: orderItems,
        total_price: totalPrice,
        status: 'pending',
        is_read: false
    }]);

    btn.innerText = oldText;
    btn.disabled = false;

    if (error) alert("خطا: " + error.message);
    else {
        alert("سفارش ثبت شد!");
        cart = {};
        updateCartBadge();
        switchTab('menu');
        renderMenu();
    }
}

// --- ۷. توابع همون همیشگی و تاریخچه ---
window.openFavorites = async function() {
    const list = document.getElementById('favorites-list');
    document.getElementById('favorites-modal').classList.remove('hidden');
    list.innerHTML = 'در حال دریافت...';
    
    // دریافت ۱۰ سفارش آخر
    const { data } = await db.from('orders').select('*').eq('customer_phone', currentUser.phone).order('created_at', {ascending: false}).limit(10);
    
    if(!data || data.length === 0) { list.innerHTML = 'سوابقی یافت نشد.'; return; }

    list.innerHTML = '';
    data.forEach(order => {
        let itemsHtml = '';
        order.items.forEach(i => itemsHtml += `<li>${i.name} (${i.quantity})</li>`);
        const div = document.createElement('div');
        div.className = 'history-card';
        // دکمه سفارش دوباره
        div.innerHTML = `
            <div class="history-date">${new Date(order.created_at).toLocaleDateString('fa-IR')}</div>
            <ul class="history-items">${itemsHtml}</ul>
            <button class="reorder-btn" onclick='reorder(${JSON.stringify(order.items)}, ${order.total_price})'>🔄 سفارش دوباره</button>
        `;
        list.appendChild(div);
    });
}

window.reorder = async function(items, price) {
    if(!confirm("آیا همین سفارش دوباره برای میز " + currentTable + " ثبت شود؟")) return;
    
    // ثبت سفارش جدید با آیتم‌های قدیمی اما میز و زمان جدید
    const { error } = await db.from('orders').insert([{
        first_name: currentUser.fname,
        last_name: currentUser.lname,
        customer_name: `${currentUser.fname} ${currentUser.lname}`,
        customer_phone: currentUser.phone,
        table_number: currentTable,
        items: items,
        total_price: price,
        status: 'pending',
        is_read: false
    }]);

    if (error) alert(error.message);
    else {
        alert("سفارش دوباره با موفقیت ثبت شد!");
        document.getElementById('favorites-modal').classList.add('hidden');
    }
}

window.openHistory = async function() {
    const list = document.getElementById('history-list');
    document.getElementById('history-modal').classList.remove('hidden');
    list.innerHTML = 'در حال دریافت...';
    const { data } = await db.from('orders').select('*').eq('customer_phone', currentUser.phone).order('created_at', {ascending: false});
    if(!data.length) { list.innerHTML = 'خالی'; return; }
    list.innerHTML = '';
    data.forEach(order => {
        let itemsHtml = '';
        order.items.forEach(i => itemsHtml += `<li>${i.name} (${i.quantity})</li>`);
        const div = document.createElement('div');
        div.className = 'history-card';
        div.innerHTML = `<div class="history-date">${new Date(order.created_at).toLocaleDateString('fa-IR')} | ${order.status === 'pending' ? 'در انتظار' : order.status}</div><ul class="history-items">${itemsHtml}</ul><div class="history-total">${order.total_price.toLocaleString()}</div>`;
        list.appendChild(div);
    });
}

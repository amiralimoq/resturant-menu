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
let cart = {}; 
let currentUser = null; 
let currentTable = null;
const SESSION_TIMEOUT = 60 * 60 * 1000; // ۱ ساعت

// --- ۲. شروع برنامه ---
window.onload = async function() {
    checkAuth();
    await loadMenuFromDB();
};

// --- ۳. توابع احراز هویت و مدیریت نشست ---
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
                showMainPage();
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
        // تلاش برای ذخیره (اگر تکراری باشد، خطا می‌دهد که نادیده می‌گیریم)
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
    document.getElementById('cart-bar').classList.add('hidden');
    document.getElementById('register-modal').classList.add('hidden');
    document.getElementById('table-modal').classList.remove('hidden');
    
    if(currentUser) {
        document.getElementById('welcome-msg').innerText = `خوش آمدید، ${currentUser.fname} عزیز`;
    }
}

window.confirmTable = function() {
    const tableNum = document.getElementById('table-num').value;
    if (!tableNum) {
        alert("لطفاً شماره میز را وارد کنید.");
        return;
    }

    currentTable = tableNum;
    
    const sessionData = {
        table: tableNum,
        timestamp: Date.now()
    };
    localStorage.setItem('restaurant_table_session', JSON.stringify(sessionData));

    document.getElementById('table-modal').classList.add('hidden');
    showMainPage();
}

function showMainPage() {
    document.getElementById('register-modal').classList.add('hidden');
    document.getElementById('table-modal').classList.add('hidden');
    document.getElementById('main-container').classList.remove('hidden');
    document.getElementById('cart-bar').classList.remove('hidden');
    
    const infoDisplay = document.getElementById('user-info-display');
    if(infoDisplay) {
        infoDisplay.innerText = `${currentUser.fname} ${currentUser.lname} | میز: ${currentTable}`;
    }
}

window.changeTable = function() {
    showTableModal();
    document.getElementById('table-num').value = '';
}

window.logout = function() {
    if(confirm("آیا می‌خواهید با نام و شماره دیگری وارد شوید؟")) {
        localStorage.removeItem('restaurant_customer_v2');
        localStorage.removeItem('restaurant_table_session');
        location.reload();
    }
}

// --- ۴. توابع منو و دیتابیس ---
async function loadMenuFromDB() {
    if (!db) return;
    const container = document.getElementById('menu-container');
    container.innerHTML = '<p style="text-align:center; padding:20px;">در حال دریافت منو...</p>';

    // دریافت توضیحات (description) همراه سایر فیلدها
    const { data, error } = await db
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('id', { ascending: true });

    if (error) {
        console.error("Error loading menu:", error);
        container.innerHTML = '<p style="text-align:center; color:red;">خطا در دریافت منو</p>';
        return;
    }

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
                // بررسی اینکه آیا توضیحاتی وجود دارد یا خیر
                const descriptionHtml = item.description 
                    ? `<p class="item-desc">${item.description}</p>` 
                    : '';

                const itemEl = document.createElement('div');
                itemEl.className = 'item-card';
                itemEl.innerHTML = `
                    <div class="item-info">
                        <h3>${item.name}</h3>
                        ${descriptionHtml}
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

// --- ۵. توابع سبد خرید ---
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
    if (!db) { alert("اتصال برقرار نیست."); return; }
    if (Object.keys(cart).length === 0) { alert("سبد خرید خالی است!"); return; }

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

    btn.innerText = originalText;
    btn.disabled = false;

    if (error) {
        alert("خطا در ثبت سفارش: " + error.message);
    } else {
        alert("سفارش شما با موفقیت ثبت شد!");
        cart = {};
        renderMenu(); 
        calculateTotal();
    }
}

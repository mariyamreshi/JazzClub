document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('dishesGrid');
    const status = document.getElementById('menuStatus');
    const retry = document.getElementById('retryMenu');
    const count = document.getElementById('menuCount');
    const search = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchBtn');
    const filters = Array.from(document.querySelectorAll('.filter-btn'));
    let menuItems = [];
    let activeCategory = 'recommended';
    let loading = false;

    const categoryLabels = {
        recommended: 'Recommended', seasonal: 'Seasonal', cocktail: 'Cocktail', liquor: 'Liquor',
        dessert: 'Dessert', appetizer: 'Appetizer',
    };
    const itemImages = {
        'Truffle Cream Pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80',
        'Grilled Salmon Steak': 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80',
        'Garnet Negroni': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80',
        'Midnight Mule': 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=900&q=80',
        'Single Malt Flight': 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=900&q=80',
        'Small Batch Bourbon': 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=900&q=80',
        'Tiramisu Delight': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80',
        'Basque Cheesecake': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=80',
        'Truffle Parmesan Fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80',
        'Mediterranean Salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
    };
    const fallbackImage = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80';

    function createTextElement(tag, className, value) {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = value;
        return element;
    }

    function createCard(item) {
        const card = document.createElement('article');
        card.className = 'dish-card';

        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'image-wrapper';
        const image = document.createElement('img');
        image.className = 'dish-img';
        image.src = itemImages[item.item_name] || fallbackImage;
        image.alt = item.item_name;
        image.loading = 'lazy';
        imageWrapper.appendChild(image);
        if (item.category === 'recommended') imageWrapper.appendChild(createTextElement('span', 'badge', 'RECOMMENDED'));

        const info = document.createElement('div');
        info.className = 'dish-info';
        info.appendChild(createTextElement('span', 'dish-category', categoryLabels[item.category] || item.category));
        info.appendChild(createTextElement('h3', 'dish-name', item.item_name));
        info.appendChild(createTextElement('span', 'dish-price', `$${Number(item.price).toFixed(2)}`));
        card.append(imageWrapper, info);
        return card;
    }

    function renderMenu() {
        const query = search.value.trim().toLocaleLowerCase();
        const filtered = menuItems.filter(item => {
            const matchesCategory = item.category === activeCategory;
            const searchable = `${item.item_name} ${categoryLabels[item.category] || item.category}`.toLocaleLowerCase();
            return matchesCategory && searchable.includes(query);
        });

        grid.replaceChildren(...filtered.map(createCard));
        count.textContent = `${filtered.length} ${filtered.length === 1 ? 'item' : 'items'}`;
        status.textContent = filtered.length ? '' : (menuItems.length ? 'No menu items match your search.' : 'No menu items are available yet.');
        status.hidden = filtered.length > 0;
    }

    async function loadMenu() {
        if (loading) return;
        loading = true;
        retry.hidden = true;
        status.hidden = false;
        status.textContent = 'Loading menu...';
        grid.setAttribute('aria-busy', 'true');
        try {
            const response = await fetch('/api/menu-items', { cache: 'no-store' });
            if (!response.ok) throw new Error('Unable to load menu');
            const result = await response.json();
            if (!Array.isArray(result.data)) throw new Error('Invalid menu response');
            menuItems = result.data;
            renderMenu();
        } catch {
            menuItems = [];
            grid.replaceChildren();
            count.textContent = '0 items';
            status.hidden = false;
            status.textContent = 'Unable to load the menu. Please try again.';
            retry.hidden = false;
        } finally {
            loading = false;
            grid.setAttribute('aria-busy', 'false');
        }
    }

    filters.forEach(button => {
        button.addEventListener('click', () => {
            filters.forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            activeCategory = button.dataset.category;
            renderMenu();
        });
    });
    search.addEventListener('input', renderMenu);
    searchButton.addEventListener('click', renderMenu);
    retry.addEventListener('click', loadMenu);
    return loadMenu();
});

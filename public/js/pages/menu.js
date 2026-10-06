const dishes = [
    {
        id: 1,
        name: "Truffle Cream Pasta",
        category: "pasta",
        badge: "CHEF'S CHOICE",
        price: "$18.50",
        image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: 2,
        name: "Classic Wagyu Burger",
        category: "mains",
        badge: "POPULAR",
        price: "$16.00",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: 3,
        name: "Mediterranean Salad",
        category: "salads",
        badge: "",
        price: "$12.50",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: 4,
        name: "Avocado Toast & Egg",
        category: "breakfast",
        badge: "POPULAR",
        price: "$11.00",
        image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: 5,
        name: "Grilled Salmon Steak",
        category: "mains",
        badge: "",
        price: "$22.00",
        image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: 6,
        name: "Tiramisu Delight",
        category: "desserts",
        badge: "CHEF'S CHOICE",
        price: "$9.50",
        image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80"
    }
];

let activeCategory = "all";
let searchQuery = "";

function renderDishes() {
    const grid = document.getElementById("dishesGrid");

    const filteredDishes = dishes.filter(dish => {
        const matchesCategory = activeCategory === "all" || dish.category === activeCategory;
        const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    document.getElementById("countNum").innerText = filteredDishes.length;

    if (filteredDishes.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 60px 0;">No dishes found.</p>`;
        return;
    }

    grid.innerHTML = filteredDishes.map(dish => `
        <div class="dish-card">
            <div class="image-wrapper">
                <img src="${dish.image}" alt="${dish.name}" class="dish-img">
                ${dish.badge ? `<span class="badge">${dish.badge}</span>` : ''}
                <button class="btn-add">+</button>
            </div>
            <div class="dish-info">
                <span class="dish-category">${dish.category}</span>
                <h3 class="dish-name">${dish.name}</h3>
                <span class="dish-price">${dish.price}</span>
            </div>
        </div>
    `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    renderDishes();

    const filterBtns = document.querySelectorAll(".filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeCategory = btn.dataset.category;
            renderDishes();
        });
    });

    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderDishes();
    });
});
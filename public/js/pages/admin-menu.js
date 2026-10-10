document.addEventListener('DOMContentLoaded', () => {
    const body = document.getElementById('menuTableBody');
    const status = document.getElementById('menuAdminStatus');
    const search = document.getElementById('menuSearch');
    const categoryFilter = document.getElementById('menuCategoryFilter');
    const stockFilter = document.getElementById('menuStockFilter');
    const refresh = document.getElementById('refreshMenuItems');
    const itemDialog = document.getElementById('menuItemDialog');
    const deleteDialog = document.getElementById('deleteMenuItemDialog');
    const form = document.getElementById('menuItemForm');
    const formError = document.getElementById('menuItemError');
    const deleteError = document.getElementById('deleteMenuItemError');
    const fields = {
        item_name: document.getElementById('menuItemName'),
        category: document.getElementById('menuItemCategory'),
        price: document.getElementById('menuItemPrice'),
        stock_quantity: document.getElementById('menuItemStock'),
    };
    const labels = { recommended: 'Recommended', seasonal: 'Seasonal', cocktail: 'Cocktail', liquor: 'Liquor', dessert: 'Dessert', appetizer: 'Appetizer' };
    const itemImages = {
        'Truffle Cream Pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=200&q=70',
        'Grilled Salmon Steak': 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=200&q=70',
        'Garnet Negroni': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=200&q=70',
        'Midnight Mule': 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=200&q=70',
        'Single Malt Flight': 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=200&q=70',
        'Small Batch Bourbon': 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=200&q=70',
        'Tiramisu Delight': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=200&q=70',
        'Basque Cheesecake': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=200&q=70',
        'Truffle Parmesan Fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=200&q=70',
        'Mediterranean Salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=200&q=70',
    };
    const fallbackImage = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=200&q=70';
    let items = [];
    let loading = false;
    let saving = false;
    let editingId = null;
    let deletingId = null;

    function textCell(value, className = '') {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        cell.className = className;
        return cell;
    }

    function pill(text, className) {
        const element = document.createElement('span');
        element.className = className;
        element.textContent = text;
        return element;
    }

    function updateStats() {
        document.getElementById('menuTotalCount').textContent = String(items.length);
        document.getElementById('menuInStockCount').textContent = String(items.filter(item => item.stock_quantity > 0).length);
        document.getElementById('menuStockTotal').textContent = String(items.reduce((sum, item) => sum + item.stock_quantity, 0));
    }

    function emptyRow(message) {
        const row = document.createElement('tr');
        const cell = textCell(message);
        cell.colSpan = 6;
        row.appendChild(cell);
        body.replaceChildren(row);
    }

    function render() {
        if (loading) return;
        const query = search.value.trim().toLocaleLowerCase();
        const filtered = items.filter(item => {
            const text = `${item.item_name} ${labels[item.category] || item.category}`.toLocaleLowerCase();
            const categoryMatches = !categoryFilter.value || item.category === categoryFilter.value;
            const stockMatches = !stockFilter.value
                || (stockFilter.value === 'in-stock' ? item.stock_quantity > 0 : item.stock_quantity === 0);
            return text.includes(query) && categoryMatches && stockMatches;
        });

        const rows = filtered.map(item => {
            const row = document.createElement('tr');
            const itemCell = textCell('', 'menu-item-cell');
            const image = document.createElement('img');
            image.className = 'menu-thumb';
            image.src = itemImages[item.item_name] || fallbackImage;
            image.alt = '';
            const details = document.createElement('div');
            const name = document.createElement('div');
            name.className = 'menu-item-name';
            name.textContent = item.item_name;
            const itemId = document.createElement('div');
            itemId.className = 'menu-item-badge';
            itemId.textContent = `Item #${item.item_id}`;
            details.append(name, itemId);
            itemCell.append(image, details);
            row.appendChild(itemCell);

            const categoryCell = textCell('');
            categoryCell.appendChild(pill(labels[item.category] || item.category, 'menu-category-pill'));
            row.appendChild(categoryCell);
            row.appendChild(textCell(`$${Number(item.price).toFixed(2)}`));

            row.appendChild(textCell(item.stock_quantity));

            const availabilityCell = textCell('');
            const inStock = item.stock_quantity > 0;
            availabilityCell.appendChild(pill(inStock ? 'In stock' : 'Out of stock', `menu-status-pill ${inStock ? 'available' : 'hidden'}`));
            row.appendChild(availabilityCell);

            const actions = textCell('', 'menu-row-actions');
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'tab-btn';
            edit.textContent = 'Edit';
            edit.setAttribute('aria-label', `Edit ${item.item_name}`);
            edit.addEventListener('click', () => openItemDialog(item));
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'menu-danger';
            remove.textContent = 'Delete';
            remove.setAttribute('aria-label', `Delete ${item.item_name}`);
            remove.addEventListener('click', () => openDeleteDialog(item));
            actions.append(edit, remove);
            row.appendChild(actions);
            return row;
        });

        body.replaceChildren(...rows);
        if (!rows.length) emptyRow(items.length ? 'No menu items match your filters.' : 'No menu items yet.');
        status.textContent = `Showing ${filtered.length} of ${items.length} menu items`;
        updateStats();
    }

    function setSaving(value) {
        saving = value;
        for (const id of ['saveMenuItem', 'cancelMenuItem', 'confirmDeleteMenuItem', 'cancelDeleteMenuItem']) {
            document.getElementById(id).disabled = value;
        }
    }

    function openItemDialog(item = null) {
        if (saving) return;
        editingId = item ? item.item_id : null;
        document.getElementById('menuItemDialogTitle').textContent = item ? `Edit ${item.item_name}` : 'Add menu item';
        document.getElementById('saveMenuItem').textContent = item ? 'Save changes' : 'Add item';
        form.reset();
        fields.category.value = item?.category || 'seasonal';
        for (const key of ['item_name', 'price', 'stock_quantity']) fields[key].value = item?.[key] ?? '';
        formError.hidden = true;
        itemDialog.showModal();
    }

    function openDeleteDialog(item) {
        if (saving) return;
        deletingId = item.item_id;
        document.getElementById('deleteMenuItemSummary').textContent = `${item.item_name} — $${Number(item.price).toFixed(2)}`;
        deleteError.hidden = true;
        deleteDialog.showModal();
    }

    async function request(url, options = {}) {
        const response = await fetch(url, options);
        if (!response.ok) {
            let result = {};
            try { result = await response.json(); } catch {}
            throw new Error(result.error?.message || 'Unable to save this change. Please try again.');
        }
        return response.status === 204 ? null : (await response.json()).data;
    }

    async function loadItems() {
        if (loading || saving || itemDialog.open || deleteDialog.open) return;
        loading = true;
        refresh.disabled = true;
        body.setAttribute('aria-busy', 'true');
        status.textContent = 'Loading menu items...';
        try {
            const data = await request('/api/admin/menu-items', { cache: 'no-store' });
            if (!Array.isArray(data)) throw new Error('Invalid menu list');
            items = data;
        } catch {
            items = [];
            status.textContent = 'Unable to load menu items. Please click Refresh to try again.';
            emptyRow('Menu items could not be loaded.');
            updateStats();
            return;
        } finally {
            loading = false;
            refresh.disabled = false;
            body.setAttribute('aria-busy', 'false');
        }
        render();
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        formError.hidden = true;
        const payload = {
            item_name: fields.item_name.value.trim(),
            category: fields.category.value,
            price: fields.price.value,
            stock_quantity: fields.stock_quantity.value,
        };
        try {
            const saved = await request(editingId === null ? '/api/menu-items' : `/api/menu-items/${editingId}`, {
                method: editingId === null ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (editingId === null) items.push(saved);
            else items = items.map(item => item.item_id === editingId ? saved : item);
            itemDialog.close();
            render();
        } catch (error) {
            formError.textContent = error.message;
            formError.hidden = false;
        } finally {
            setSaving(false);
        }
    });

    document.getElementById('confirmDeleteMenuItem').addEventListener('click', async () => {
        if (saving || deletingId === null) return;
        setSaving(true);
        deleteError.hidden = true;
        try {
            await request(`/api/menu-items/${deletingId}`, { method: 'DELETE' });
            items = items.filter(item => item.item_id !== deletingId);
            deleteDialog.close();
            render();
        } catch (error) {
            deleteError.textContent = error.message;
            deleteError.hidden = false;
        } finally {
            setSaving(false);
        }
    });

    document.getElementById('addMenuItem').addEventListener('click', () => openItemDialog());
    document.getElementById('cancelMenuItem').addEventListener('click', () => { if (!saving) itemDialog.close(); });
    document.getElementById('cancelDeleteMenuItem').addEventListener('click', () => { if (!saving) deleteDialog.close(); });
    itemDialog.addEventListener('close', () => { editingId = null; });
    deleteDialog.addEventListener('close', () => { deletingId = null; });
    for (const dialog of [itemDialog, deleteDialog]) dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
    search.addEventListener('input', render);
    categoryFilter.addEventListener('change', render);
    stockFilter.addEventListener('change', render);
    refresh.addEventListener('click', loadItems);
    return loadItems();
});

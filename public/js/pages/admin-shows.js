document.addEventListener('DOMContentLoaded', () => {
    const get = id => document.getElementById(id);
    const list = get('adminShowsList');
    const template = get('adminShowTemplate');
    const pageStatus = get('showsAdminStatus');
    const modal = get('addShowModal');
    const form = get('showForm');
    const formStatus = get('showFormStatus');
    const saveButton = get('saveShowBtn');
    const fields = {
        artist_name: get('showArtistName'),
        artist_type: get('showArtistType'),
        genre: get('showGenre'),
        performance_date: get('showDate'),
        start_time: get('showStartTime'),
        end_time: get('showEndTime'),
    };
    let shows = [];
    let editingId = null;

    const dateFormatter = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
    });
    const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });

    function todayInBangkok() {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Bangkok',
        }).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
        return `${parts.year}-${parts.month}-${parts.day}`;
    }

    function timeLabel(value) {
        const [hours, minutes] = value.split(':').map(Number);
        return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
    }

    function badge(show) {
        if (show.total_capacity > 0 && show.reserved_seats >= show.total_capacity) {
            return ['Sold out', 'status-soldout'];
        }
        const today = todayInBangkok();
        if (show.performance_date < today) return ['Completed', 'status-completed'];
        if (show.performance_date === today) return ['Tonight', 'status-tonight'];
        return ['On sale', 'status-onsale'];
    }

    function render(show) {
        const card = template.content.firstElementChild.cloneNode(true);
        card.dataset.showId = String(show.show_id);
        const date = new Date(`${show.performance_date}T00:00:00Z`);
        card.querySelector('.date-num').textContent = show.performance_date.slice(-2);
        card.querySelector('.date-month').textContent = monthFormatter.format(date);
        card.querySelector('.show-genre').textContent = `${show.artist_type} · ${show.genre}`;
        card.querySelector('.show-title').textContent = show.artist_name;
        card.querySelector('.show-time').textContent = `🕒 ${dateFormatter.format(date)} · ${timeLabel(show.start_time)}–${timeLabel(show.end_time)}`;
        card.querySelector('.show-bookings').textContent = `👥 ${show.reservation_count} tables · ${show.reserved_seats} / ${show.total_capacity} seats reserved`;
        const status = card.querySelector('.status-pill');
        const [label, className] = badge(show);
        status.textContent = label;
        status.classList.add(className);
        card.querySelector('.btn-show-edit').addEventListener('click', () => openEdit(show));
        card.querySelector('.btn-show-delete').addEventListener('click', () => removeShow(show));
        return card;
    }

    async function loadShows() {
        list.setAttribute('aria-busy', 'true');
        pageStatus.hidden = false;
        pageStatus.textContent = 'Loading shows...';
        try {
            const response = await fetch('/api/shows', { cache: 'no-store' });
            const result = await response.json();
            if (!response.ok || !Array.isArray(result.data)) throw new Error(result.error?.message || 'Unable to load shows.');
            shows = result.data;
            list.replaceChildren(...shows.map(render));
            pageStatus.textContent = shows.length ? '' : 'No shows scheduled yet.';
            pageStatus.hidden = shows.length > 0;
        } catch (error) {
            list.replaceChildren();
            pageStatus.textContent = error.message;
        } finally {
            list.setAttribute('aria-busy', 'false');
        }
    }

    function openAdd() {
        editingId = null;
        form.reset();
        fields.artist_type.value = 'group';
        fields.start_time.value = '20:30';
        fields.end_time.value = '22:30';
        get('showModalTitle').textContent = 'Add New Show';
        saveButton.textContent = 'Save Show';
        formStatus.textContent = '';
        modal.classList.add('open');
        fields.artist_name.focus();
    }

    function openEdit(show) {
        editingId = show.show_id;
        Object.entries(fields).forEach(([name, input]) => { input.value = show[name]; });
        get('showModalTitle').textContent = `Edit Show #${show.show_id}`;
        saveButton.textContent = 'Save Changes';
        formStatus.textContent = '';
        modal.classList.add('open');
        fields.artist_name.focus();
    }

    function closeModal() {
        if (saveButton.disabled) return;
        modal.classList.remove('open');
    }

    async function removeShow(show) {
        if (!window.confirm(`Delete ${show.artist_name} on ${show.performance_date}?`)) return;
        pageStatus.hidden = false;
        pageStatus.textContent = 'Deleting show...';
        try {
            const response = await fetch(`/api/shows/${show.show_id}`, { method: 'DELETE' });
            const result = response.status === 204 ? null : await response.json();
            if (!response.ok) throw new Error(result?.error?.message || 'Unable to delete show.');
            await loadShows();
        } catch (error) {
            pageStatus.hidden = false;
            pageStatus.textContent = error.message;
        }
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const payload = Object.fromEntries(Object.entries(fields).map(([name, input]) => [name, input.value]));
        saveButton.disabled = true;
        formStatus.textContent = editingId ? 'Saving changes...' : 'Creating show...';
        try {
            const response = await fetch(editingId ? `/api/shows/${editingId}` : '/api/shows', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error?.message || 'Unable to save show.');
            modal.classList.remove('open');
            await loadShows();
        } catch (error) {
            formStatus.textContent = error.message;
        } finally {
            saveButton.disabled = false;
        }
    });

    fields.start_time.addEventListener('change', () => {
        if (editingId) return;
        fields.end_time.value = { '20:00': '22:00', '20:30': '22:30', '21:00': '23:00' }[fields.start_time.value];
    });
    get('openAddShowModalBtn').addEventListener('click', openAdd);
    get('closeShowModalBtn').addEventListener('click', closeModal);
    get('cancelShowModalBtn').addEventListener('click', closeModal);
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

    loadShows();
});

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // PART 1: FETCH & RENDER SHOWS LIST
    // ==========================================
    const list = document.getElementById('showsList');
    const status = document.getElementById('showsStatus');
    const retry = document.getElementById('retryShows');
    const template = document.getElementById('showTemplate');

    // Only run fetch logic if the shows list element exists on the current page
    if (list && template) {
        const dateFormatter = new Intl.DateTimeFormat('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
        });
        let loading = false;

        function renderShow(show) {
            const item = template.content.firstElementChild.cloneNode(true);
            item.dataset.showId = String(show.show_id);
            item.querySelector('.arrow-btn').href = `/reserve.html?show_id=${encodeURIComponent(show.show_id)}`;
            item.querySelector('.band-title').textContent = show.artist_name;
            item.querySelector('.genre-tag').textContent = show.genre;

            const date = item.querySelector('.date-badge');
            date.dateTime = show.performance_date;
            date.textContent = dateFormatter.format(new Date(`${show.performance_date}T00:00:00Z`)).toUpperCase();

            const time = item.querySelector('.start-time');
            const [hours, minutes] = show.start_time.split(':');
            time.dateTime = show.start_time;
            time.textContent = `${Number(hours) % 12 || 12}:${minutes} ${Number(hours) >= 12 ? 'PM' : 'AM'}`;

            return item;
        }

        async function loadShows() {
            if (loading) return;
            loading = true;
            if (retry) retry.hidden = true;
            if (status) {
                status.hidden = false;
                status.textContent = 'Loading shows...';
            }
            list.setAttribute('aria-busy', 'true');
            list.replaceChildren();

            try {
                const response = await fetch('/api/shows', { cache: 'no-store' });
                if (!response.ok) throw new Error('Unable to load shows');
                const result = await response.json();
                if (!Array.isArray(result.data)) throw new Error('Invalid shows response');

                list.replaceChildren(...result.data.map(renderShow));

                if (status) {
                    status.textContent = result.data.length ? '' : 'No shows scheduled yet. Please check back soon.';
                    status.hidden = result.data.length > 0;
                }
            } catch {
                if (status) status.textContent = 'Unable to load shows. Please try again.';
                if (retry) retry.hidden = false;
            } finally {
                loading = false;
                list.setAttribute('aria-busy', 'false');
            }
        }

        if (retry) retry.addEventListener('click', loadShows);
        return loadShows();
    }

    // ==========================================
    // PART 2: ADD SHOW MODAL CONTROLLER
    // ==========================================
    const modal = document.getElementById('addShowModal');
    const openBtn = document.getElementById('openAddShowModalBtn');
    const closeBtn = document.getElementById('closeShowModalBtn');
    const cancelBtn = document.getElementById('cancelShowModalBtn');
    const addShowForm = document.getElementById('addShowForm');

    function openModal() {
        if (modal) modal.classList.add('open');
    }

    function closeModal() {
        if (modal) modal.classList.remove('open');
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (addShowForm) {
        addShowForm.addEventListener('submit', (e) => {
            e.preventDefault();
            closeModal();
        });
    }
});

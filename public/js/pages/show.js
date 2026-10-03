document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('showsList');
    const status = document.getElementById('showsStatus');
    const retry = document.getElementById('retryShows');
    const template = document.getElementById('showTemplate');
    const dateFormatter = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
    });
    let loading = false;

    function renderShow(show) {
        const item = template.content.firstElementChild.cloneNode(true);
        item.dataset.showId = String(show.show_id);
        item.querySelector('.arrow-btn').href = `/reserve.html?show_id=${encodeURIComponent(show.show_id)}`;
        item.querySelector('.band-title').textContent = show.artist;
        item.querySelector('.genre-tag').textContent = show.genre;
        const date = item.querySelector('.date-badge');
        date.dateTime = show.show_date;
        date.textContent = dateFormatter.format(new Date(`${show.show_date}T00:00:00Z`)).toUpperCase();
        const time = item.querySelector('.start-time');
        const [hours, minutes] = show.start_time.split(':');
        time.dateTime = show.start_time;
        time.textContent = `${Number(hours) % 12 || 12}:${minutes} ${Number(hours) >= 12 ? 'PM' : 'AM'}`;
        return item;
    }

    async function loadShows() {
        if (loading) return;
        loading = true;
        retry.hidden = true;
        status.hidden = false;
        status.textContent = 'Loading shows...';
        list.setAttribute('aria-busy', 'true');
        list.replaceChildren();
        try {
            const response = await fetch('/api/shows', { cache: 'no-store' });
            if (!response.ok) throw new Error('Unable to load shows');
            const result = await response.json();
            if (!Array.isArray(result.data)) throw new Error('Invalid shows response');
            list.replaceChildren(...result.data.map(renderShow));
            status.textContent = result.data.length ? '' : 'No shows scheduled yet. Please check back soon.';
            status.hidden = result.data.length > 0;
        } catch {
            status.textContent = 'Unable to load shows. Please try again.';
            retry.hidden = false;
        } finally {
            loading = false;
            list.setAttribute('aria-busy', 'false');
        }
    }

    retry.addEventListener('click', loadShows);
    return loadShows();
});

document.getElementById('reservationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        name: document.getElementById('guestName').value,
        email: document.getElementById('guestEmail').value
    };

    const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        alert('Reservation successfully created!');
    }
});
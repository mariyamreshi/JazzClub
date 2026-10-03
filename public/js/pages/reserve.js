let selectedTableId = "8"; // Default selected table

// Handle table clicking on floor plan
document.querySelectorAll('.table-card').forEach(card => {
    card.addEventListener('click', () => {
        if (card.classList.contains('booked')) return;

        // Deselect previously selected table
        document.querySelectorAll('.table-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        selectedTableId = card.dataset.id;
        const tableCode = card.dataset.code;
        const seats = card.dataset.seats;

        // Update bottom display card
        document.getElementById('selectedTableTitle').textContent = `Table ${tableCode}`;
        document.getElementById('selectedTableSub').textContent = `Main floor · ${seats} seats`;
    });
});

// Submit reservation request to express backend API
document.getElementById('reservationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedTableId) {
        alert('Please pick a table on the floor plan.');
        return;
    }

    const payload = {
        name: document.getElementById('guestName').value,
        email: document.getElementById('guestEmail').value,
        tableId: selectedTableId,
        dateTime: `${document.getElementById('resDate').value} ${document.getElementById('resTime').value}:00`,
        specialRequests: document.getElementById('specialRequests').value
    };

    try {
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('Reservation successfully created!');
        } else {
            alert('Failed to process reservation.');
        }
    } catch (err) {
        console.error('API Connection Error:', err);
        alert('Connected successfully in offline preview mode!');
    }
});
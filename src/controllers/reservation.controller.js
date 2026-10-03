const reservationModel = require('../models/reservation.model');

async function createReservation(req, res, next) {
    try {
        const { name, email } = req.body;
        // Logic to insert into database via model
        return res.status(201).json({ message: 'Reservation created successfully' });
    } catch (err) {
        next(err);
    }
}

module.exports = { createReservation };
const express = require('express');
const router = express.Router();
const { listEvents, createEvent, updateEvent, deleteEvent, rsvpEvent } = require('../controllers/eventsController');

router.get('/', listEvents);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

// RSVP
router.post('/:id/rsvp', rsvpEvent);

module.exports = router;

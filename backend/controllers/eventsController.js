const { getCalendarService } = require('../services/googleCalendar');
const EventMetadata = require('../models/EventMetadata');
const connectDB = require('../config/db');

// Ensure DB is connected (in serverless, this might be called on every request)
const ensureDB = async () => {
    await connectDB();
};

const listEvents = async (req, res) => {
    try {
        await ensureDB();
        const calendar = getCalendarService(req.user);
        const calendarId = process.env.CALENDAR_ID || 'primary';

        // Fetch events from Google Calendar
        // Default: 2 years back to 2 years future or just basic list
        const response = await calendar.events.list({
            calendarId,
            timeMin: req.query.timeMin || new Date().toISOString(),
            timeMax: req.query.timeMax, // Add support for timeMax
            maxResults: 2500, // Increase limit from 250
            singleEvents: true,
            orderBy: 'startTime',
        });

        const googleEvents = response.data.items;

        // Gather IDs: both event.id and event.recurringEventId
        const googleEventIds = googleEvents.map(e => e.id);
        const recurringIds = googleEvents
            .map(e => e.recurringEventId)
            .filter(Boolean);

        const allIds = [...new Set([...googleEventIds, ...recurringIds])];

        // Fetch metadata from MongoDB
        const metadataList = await EventMetadata.find({
            googleEventId: { $in: allIds },
            userId: req.user._id
        })
            .populate('category');
        const metadataMap = new Map(metadataList.map(m => [m.googleEventId, m]));

        // Merge logic: Prefer Instance Metadata -> Recurring Series Metadata -> None
        const mergedEvents = googleEvents.map(event => {
            let metadata = metadataMap.get(event.id);
            if (!metadata && event.recurringEventId) {
                metadata = metadataMap.get(event.recurringEventId);
            }
            return {
                ...event,
                extendedProps: metadata || {},
            };
        });

        res.json(mergedEvents);
    } catch (error) {
        console.error('Error listing events:', error);
        res.status(500).json({ error: error.message });
    }
};

const createEvent = async (req, res) => {
    try {
        await ensureDB();
        const calendar = getCalendarService(req.user);
        const calendarId = process.env.CALENDAR_ID || 'primary';
        const { summary, description, start, end, location, tags, notes, categoryId } = req.body;

        // Sanitize categoryId
        const validCategoryId = categoryId === '' ? null : categoryId;

        // Create in Google Calendar
        const googleEvent = {
            summary,
            description,
            start, // { dateTime: '...' }
            end,   // { dateTime: '...' }
            location
        };

        const response = await calendar.events.insert({
            calendarId,
            resource: googleEvent,
        });

        const newEvent = response.data;

        // Create Metadata in MongoDB
        if (tags || notes || validCategoryId) {
            const metadata = await EventMetadata.create({
                googleEventId: newEvent.id,
                tags,
                notes,
                category: validCategoryId,
                userId: req.user._id
            });

            // Re-fetch to populate if needed, or just attach
            newEvent.extendedProps = metadata;
        }

        res.status(201).json(newEvent);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: error.message });
    }
};

const updateEvent = async (req, res) => {
    try {
        await ensureDB();
        const calendar = getCalendarService(req.user);
        const calendarId = process.env.CALENDAR_ID || 'primary';
        const eventId = req.params.id;
        const { summary, description, start, end, location, tags, notes, categoryId } = req.body;

        // Sanitize categoryId
        const validCategoryId = categoryId === '' ? null : categoryId;

        // Update Google Calendar
        const googleEvent = {
            summary,
            description,
            start,
            end,
            location
        };

        const response = await calendar.events.patch({
            calendarId,
            eventId,
            resource: googleEvent,
        });

        const updatedEvent = response.data;

        // Update MongoDB Metadata
        // Logic: If recurringEventId present, update THAT id to apply to the series
        // (This assumes user always wants to update series if it is recurring. 
        //  A more complex app would ask "Verification: This event or all events?")
        // For this MVP per user request: "adding categories should apply to all instances"

        // We need to fetch the event from Google first to know if it's recurring? 
        // Actually, the `updatedEvent` returned from patch contains current state.
        // It might NOT contain recurringEventId if it is the master? No, instances have it.

        const targetId = updatedEvent.recurringEventId || eventId;

        // Construct update operations
        const updateOps = {
            $set: { tags, notes }
        };

        if (categoryId === '' || categoryId === null) {
            updateOps.$unset = { category: 1 };
        } else {
            updateOps.$set.category = categoryId;
        }

        // Upsert
        const metadata = await EventMetadata.findOneAndUpdate(
            { googleEventId: targetId, userId: req.user._id }, // Ensure we match user
            { ...updateOps, $setOnInsert: { userId: req.user._id } }, // Set userId on insert
            { new: true, upsert: true }
        ).populate('category');

        updatedEvent.extendedProps = metadata;

        res.json(updatedEvent);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: error.message });
    }
};

const deleteEvent = async (req, res) => {
    try {
        await ensureDB();
        const calendar = getCalendarService(req.user);
        const calendarId = process.env.CALENDAR_ID || 'primary';
        const eventId = req.params.id;

        await calendar.events.delete({
            calendarId,
            eventId,
        });

        await EventMetadata.findOneAndDelete({ googleEventId: eventId, userId: req.user._id });

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: error.message });
    }
};

const rsvpEvent = async (req, res) => {
    try {
        await ensureDB();
        const calendar = getCalendarService(req.user);
        const calendarId = process.env.CALENDAR_ID || 'primary';
        const eventId = req.params.id;
        const { responseStatus } = req.body; // 'accepted', 'declined', 'tentative'

        // 1. Fetch current event to find self attendee
        const event = await calendar.events.get({
            calendarId,
            eventId
        });

        const attendees = event.data.attendees || [];
        const selfAttendeeIndex = attendees.findIndex(a => a.self);

        if (selfAttendeeIndex === -1) {
            return res.status(400).json({ error: 'You are not an attendee of this event' });
        }

        // 2. Update status
        attendees[selfAttendeeIndex].responseStatus = responseStatus;

        // 3. Patch event
        const response = await calendar.events.patch({
            calendarId,
            eventId,
            resource: {
                attendees
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error sending RSVP:', error);
        res.status(500).json({ error: 'Failed to send RSVP' });
    }
};

module.exports = {
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    rsvpEvent,
};

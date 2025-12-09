const mongoose = require('mongoose');

const EventMetadataSchema = new mongoose.Schema({
    googleEventId: {
        type: String,
        required: true,
        unique: true,
    },
    // Add any custom fields here
    tags: [String],
    notes: String,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    customStatus: String,
}, { timestamps: true });

module.exports = mongoose.model('EventMetadata', EventMetadataSchema);

const mongoose = require('mongoose');

const statusLogSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    status: {
        type: String,
        enum: ['OPEN', 'CLOSED'],
        required: true
    },
    source: {
        type: String,
        enum: ['OWNER', 'COMMUNITY'],
        required: true
    },
    reportedAt: {
        type: Date,
        default: Date.now
    },
    ipAddress: {
        type: String,
        select: false // Privacy: Don't select by default
    }
});

module.exports = mongoose.model('StatusLog', statusLogSchema);

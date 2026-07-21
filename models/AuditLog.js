const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const auditLogSchema = new Schema({
    event: {
        type: String,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    ip: {
        type: String
    },
    details: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Add database index for fast query lookups of recent logs
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ event: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);

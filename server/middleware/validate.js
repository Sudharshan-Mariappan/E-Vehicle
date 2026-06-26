const Joi = require('joi');
const { AppError } = require('./errorHandler');

/**
 * Validation middleware factory.
 * Returns an Express middleware that validates req[source] against the given schema.
 *
 * @param {Joi.Schema} schema  - Joi validation schema
 * @param {string}     source  - 'body' | 'query' | 'params'
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,  // Return all errors, not just the first
            stripUnknown: true, // Remove unknown fields
        });

        if (error) {
            const messages = error.details.map((d) => d.message).join('; ');
            return next(new AppError(`Validation error: ${messages}`, 400));
        }

        // Replace req[source] with the validated (and stripped) value
        req[source] = value;
        next();
    };
};

// ── Reusable Joi schemas ──────────────────────────────────────────────────────

const schemas = {
    register: Joi.object({
        name: Joi.string().min(2).max(100).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).max(100).required(),
        phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional().messages({
            'string.pattern.base': 'Phone must be a valid 10-digit Indian mobile number',
        }),
        vehicle_type: Joi.string().valid('Two-Wheeler', 'Car', 'SUV', 'Bus', 'Other').optional(),
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }),

    nearbyQuery: Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required(),
        radius: Joi.number().min(1).max(500).default(20), // km
    }),

    createBooking: Joi.object({
        stationId: Joi.number().integer().positive().required(),
        slotId: Joi.number().integer().positive().required(),
    }),

    completeBooking: Joi.object({
        energyConsumed: Joi.number().min(0).required(), // kWh
    }),

    joinQueue: Joi.object({
        stationId: Joi.number().integer().positive().required(),
    }),

    stationSearch: Joi.object({
        query: Joi.string().min(1).optional(),
        state: Joi.string().optional(),
        district: Joi.string().optional(),
        local_area: Joi.string().optional(),
    }),

    addReview: Joi.object({
        stationId: Joi.number().integer().positive().required(),
        rating: Joi.number().min(1).max(5).required(),
        comment: Joi.string().max(500).optional(),
    }),
};

module.exports = { validate, schemas };

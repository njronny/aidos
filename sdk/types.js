"use strict";
// Aidos SDK - TypeScript Types
Object.defineProperty(exports, "__esModule", { value: true });
exports.AidosError = void 0;
// SDK Error
class AidosError extends Error {
    statusCode;
    code;
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AidosError';
    }
}
exports.AidosError = AidosError;
//# sourceMappingURL=types.js.map
/**
 * 提供 Symbol 支持
 */
let idCounter = 0;

function Symbol(key) {
    return "__symbol_" + key + "_" + (++idCounter);
}

// ES6 Symbol.for
Symbol.for = function (key) {
    return "__symbol_for_" + key;
};

export default Symbol; 
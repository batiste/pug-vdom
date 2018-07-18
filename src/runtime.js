exports.compileAttrs = compileAttrs;
exports.exposeLocals = exposeLocals;
exports.deleteExposedLocals = deleteExposedLocals;

global.pugVDOMRuntime = exports

if (!global) global = window;

var flatten = function(arr) {
    return Array.prototype.concat.apply([], arr); 
};

var exposedLocals = {};

function compileAttrs(attrs, attrBlocks) {
    var attrsObj = attrBlocks
        .reduce(function(finalObj, currObj) {
            for (var propName in currObj) {
                finalObj[propName] = finalObj[propName] ? finalObj[propName].concat(currObj[propName]) : [currObj[propName]];
            }
            return finalObj;
        }, attrs.reduce(function(finalObj, attr) {
            var val = attr.val;
            finalObj[attr.name] = finalObj[attr.name] ? finalObj[attr.name].concat(val) : [val];
            return finalObj;
        }, {}));
    
    for (var propName in attrsObj) {
        if (propName === 'class') {
            attrsObj[propName] = flatten(attrsObj[propName].map(attrValue => {
                if (attrValue && typeof attrValue === 'object' && !Array.isArray(attrValue)) {
                    var classResult = [];
                    for (var className in attrValue) {
                        if (attrValue[className]) {
                            classResult.push(className);
                        }
                    }
                    return classResult;
                }
                return attrValue;
            })).join(' ');            
        } else {
            attrsObj[propName] = attrsObj[propName].pop();
        }
    }

    return attrsObj;
}

function exposeLocals(locals) {
    return Object.keys(locals).reduce(function(acc, prop) {
        if (!(prop in global))  {
            Object.defineProperty(global, prop, {
                configurable: true, 
                get: function() {
                    return locals[prop]
                }
            });
            exposedLocals[prop] = 1;
        } else {
            acc[prop] = 1;
        }
        return acc
    }, {})
}

function deleteExposedLocals() {
    for (var prop in exposedLocals) {
        delete global[prop];
        delete exposedLocals[prop];
    }
}
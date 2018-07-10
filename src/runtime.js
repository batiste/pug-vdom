exports.compileAttrs = compileAttrs;
exports.exposeLocals = exposeLocals;
exports.deleteExposedLocals = deleteExposedLocals;

global.pugVDOMRuntime = exports

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
    return Object.keys(locals).forEach(function(prop) {
        if (!(prop in window))  {
            Object.defineProperty(window, prop, {
                configurable: true, 
                get: function() {
                    return locals[prop]
                }
            });
            exposedLocals[prop] = 1;
        } else {
            eval('var ' + prop + ' =  locals.' + prop);
        }
    })
}

function deleteExposedLocals() {
    for (var prop in exposedLocals) {
        delete window[prop];
        delete exposedLocals[prop];
    }
}
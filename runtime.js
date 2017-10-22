var mergeAttrs = {class: 1};

exports.compileAttrs = compileAttrs;

function stripQuotes(str) {
    return str.replace(/"|'/g,"");
}

function compileAttrs(attrs, attrBlocks) {
    var attrsObj = attrBlocks
        .reduce(function(finalObj, currObj) {
            for (var propName in currObj) {
                finalObj[propName] = finalObj[propName] ? finalObj[propName].concat(currObj[propName]) : [currObj[propName]];
            }
            return finalObj;
        }, attrs.reduce(function(finalObj, attr) {
            var val = stripQuotes(attr.val);
            finalObj[attr.name] = finalObj[attr.name] ? finalObj[attr.name].concat(val) : [val]
            return finalObj;
        }, {}));

    for (var propName in attrsObj) {
        attrsObj[propName] = mergeAttrs[propName] ? attrsObj[propName].join(' ') : attrsObj[propName].pop();
    }

    return attrsObj;
}

if (!('pugVDOMRuntime' in window)) window.pugVDOMRuntime = exports;

exports.compileAttrs = compileAttrs;
exports.exposeLocals = exposeLocals;
exports.deleteExposedLocals = deleteExposedLocals;
exports.makeHtmlNode = makeHtmlNode;

global.pugVDOMRuntime = exports

if (!global) global = window;

var flatten = function(arr) {
    return Array.prototype.concat.apply([], arr);
};

var exposedLocals = {};

function domNodeWidget(node) {
    this.node = node;
}
domNodeWidget.widgetType = 'domNodeWidget';
domNodeWidget.prototype.type = 'Widget';
domNodeWidget.prototype.init = function() {
    return loadScripts(this.node.cloneNode(true));
}

domNodeWidget.prototype.update = function(previous, domNode) {
    if (previous.constructor.widgetType === 'domNodeWidget' && domNode.nodeType === this.node.nodeType) {
        switch (domNode.nodeType) {
            case 3:
                domNode.textContent = this.node.textContent;
                return domNode;
            case 1:
                domNode.outerHTML = this.node.outerHTML;
                return domNode;
        }
    }
    return this.init();
}

function replaceScript(script) {
    if (script.type && script.type !== 'text/javascript') {
        return script;
    }
    var newScript = document.createElement('script')
    newScript.type = 'text/javascript'
    if (script.src) {
        // Note: scripts will be loaded asynchronously (not in order)
        newScript.src = script.src
    } else {
        newScript.textContent = script.textContent
    }

    return newScript;
}

function loadScripts(domNode) {
    if (!domNode.querySelectorAll) return domNode;
    if (domNode.tagName ===  'SCRIPT') {
        return replaceScript(domNode);
    }

    Array.prototype.slice.call(domNode.querySelectorAll('script'))
        .forEach(function(script) {
            var newScript = replaceScript(script);
            if (newScript !== script) {
                script.parentNode.insertBefore(newScript, script);
                script.parentNode.removeChild(script);
            }
        });
    return domNode;
}

function makeHtmlNode(html) {
    if (typeof html !== 'string') {
        return html;
    }

    var div = document.createElement('div');
    div.innerHTML = html;

    return Array.prototype.slice.call(div.childNodes).map(function(child) {
        return new domNodeWidget(child)
    });
}

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
            attrsObj[propName] = flatten(attrsObj[propName].map(function(attrValue) {
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

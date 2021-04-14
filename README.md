# pug-vdom

The pug-vdom can compile a pug template into a render function that
can create a virtual dom tree by using a library such as `virtual-dom`

## Install

``` shell
  npm install pug-vdom
```

## Usage

``` js
  var pugVDOM = require('pug-vdom')
  var ast = pugVDOM.ast('mytemplate.pug', './basedir')
  var compiler = new pugVDOM.Compiler(ast)
  var code = compiler.compile()
```

The code variable contain a render function with this signature:  

``` js
 function render(context, h) {
  return Array(h(), h(), ...)
 }
```

The return value is a list of hyperscript node, the hyperscript function (https://github.com/hyperhype/hyperscript)
is the one provided as the second parameter.

An convenient function can be used to compile your pug files into
directly usable module

``` js
var vDom = require('./pug-vdom')
vDom.generateFile('input.pug', 'output.pug.js', './basedir')
```

Then typically you can use the resulting file like this

``` js
var render = require('./output.pug.js') // importing the render function of this template
var h = require('virtual-dom/h') // we use virtual hyperscript function
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')
var createElement = require('virtual-dom/create-element')
//runtime library is required and puts 'pugVDOMRuntime' into the global scope.
require('pug-vdom/runtime')

var tree = render({variable: 1}, h)
var rootNode = createElement(tree[0]) // we expect only one node at the root from our template
document.querySelector('main').appendChild(rootNode)

function liveRender () {
  var newTree = render({variable: 2}, h)
  var domDiff = diff(tree[0], newTree[0])
  patch(rootNode, domDiff)
  tree = newTree
}
```

If you are using Browserify, a transform is available https://github.com/gryphonmyers/pugvdomify

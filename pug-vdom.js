var lex = require('pug-lexer')
var parse = require('pug-parser')
var linker = require('pug-linker')
var load = require('pug-load')
var fs = require('fs')

function buildAst (filename, basedir) {
  var buf = fs.readFileSync(filename, 'utf8')
  var ast = parse(lex(buf.toString()))
  ast = load(ast, {lex: lex, parse: parse, basedir: basedir, filename: filename})
  ast = linker(ast)
  return ast
}

var _id = 0
function uid () {
  _id++
  return _id
}

function Compiler (ast) {
  this.ast = ast
  this.indent = 1
  this.parentId = 0
  this.parentTagId = 0
  this.buffer = []
}

Compiler.prototype.add = function (str) {
  this.buffer.push(str)
}

Compiler.prototype.addI = function (str) {
  this.buffer.push(Array(this.indent).join('  ') + str)
}

Compiler.prototype.compile = function () {
  this.bootstrap()
  return this.buffer.join('')
}

Compiler.prototype.bootstrap = function () {
  this.addI(`// PUG VDOM generated file\r\n`)
  this.addI(`function render(context, h) {\r\n`)
  this.indent++
  // Bring all the variables from this into this scope
  this.addI(`var locals = context;\r\n`)
  this.addI(`var self = locals;\r\n`)
  this.addI(`for (var prop in locals) eval('var ' + prop + ' =  locals.' + prop)\r\n`)
  this.addI(`var n0Child = []\r\n`)
  this.visit(this.ast)
  this.addI(`return n0Child\r\n`)
  this.indent--
  this.addI(`}\r\n`)
}

Compiler.prototype.visit = function (node, parent) {
  if (!this['visit' + node.type]) {
    throw new Error('Node not handled: ' + node.type)
  }
  this['visit' + node.type](node, parent)
}

Compiler.prototype.visitBlock = function (node, parent) {
  for (var i = 0; i < node.nodes.length; ++i) {
    this.visit(node.nodes[i], node)
  }
}

Compiler.prototype.visitTag = function (node, parent) {
  var id = uid()
  this.addI(`var n${id}Child = []\r\n`)
  var s = this.parentTagId
  this.parentTagId = id
  this.visitBlock(node.block, node)
  this.add('var attrs = [' + node.attributeBlocks.join(',') + '].reduce(function(finalObj, currObj){ for (var propName in currObj) {finalObj[propName] = propName === "class" ? (finalObj[propName] ? finalObj[propName].concat(currObj[propName]) : [currObj[propName]]) : currObj[propName]; } return finalObj; }, {');
  var at = []
  var classes = []

  node.attrs.forEach(function (attr) {
    if(attr.name === 'class'){
      classes = classes.concat(attr.val)
    } else {
      at.push(`'${attr.name}': ${attr.val}`)
    }
  })
  if(classes.length > 0){
    at.push(`'class': ${'[' + classes.join(',') + ']'}`)
  }
  this.add(at.join(', '))
  this.add('});')
  this.add('if (attrs.class) attrs.class = attrs.class.reduce(function(arr, currClass){ return arr.concat(currClass) }, []).join(" ");');
  this.add('var properties = {attributes:attrs};');
  this.add('if (attrs.id) properties.key = attrs.id;');
  this.addI(`var n${id} = h('${node.name}', properties, n${id}Child)\r\n`)
  this.parentTagId = s
  this.addI(`n${s}Child.push(n${id})\r\n`)
}

Compiler.prototype.visitText = function (node, parent) {
  if (node.val[0] === '<') {
    throw new Error(`Literal HTML cannot be supported properly yet (DomParser could do the trick): ${node.val}`)
  }
  var s = JSON.stringify(node.val)
  this.addI(`n${this.parentTagId}Child.push(${s})\r\n`)
}

Compiler.prototype.visitNamedBlock = function (node, parent) {
  this.visitBlock(node, parent)
}

Compiler.prototype.visitCode = function (node, parent) {
  if (node.buffer) {
    this.addI(`n${this.parentTagId}Child.push(${node.val})\r\n`)
  } else {
    this.addI(node.val + '\r\n')
  }
}

Compiler.prototype.visitConditional = function (node, parent) {
  this.addI(`if(${node.test}) {\r\n`)
  this.indent++
  this.visitBlock(node.consequent, node)
  this.indent--
  if (node.alternate) {
    this.addI(`} else {\r\n`)
    this.indent++
    this.visit(node.alternate, node)
    this.indent--
  }
  this.addI(`}\r\n`)
}

Compiler.prototype.visitComment = function (node, parent) {}

Compiler.prototype.visitEach = function (node, parent) {
  var key = node.key || 'k' + uid()
  this.addI(`Object.keys(${node.obj}).forEach(function (${key}) {\r\n`)
  this.indent++
  this.addI(`var ${node.val} = ${node.obj}[${key}]\r\n`)
  this.visitBlock(node.block)
  this.indent--
  this.addI(`})\r\n`)
}

Compiler.prototype.visitExtends = function (node, parent) {
  throw new Error('Extends nodes need to be resolved with pug-load and pug-linker')
}

mixinBlock = null

Compiler.prototype.visitMixin = function (node, parent) {
  var s = this.parentTagId
  if (node.call) {
    if(node.block) { // the call mixin define a block
      console.log(node.name, node.block)
      mixinBlock = node.block
    }
    this.addI(`n${s}Child.push(${node.name}(${node.args}));\r\n`)
    return
  }
  var id = uid()
  this.parentTagId = id
  this.addI(`function ${node.name}(${node.args || ''}) {\r\n`)
  this.indent++
  this.addI(`var n${id}Child = []\r\n`)

  if (node.block) {
    this.visitBlock(node.block, node)
  }
  this.addI(`return n${id}Child\r\n`)
  this.indent--
  this.parentTagId = s
  this.addI(`}\r\n`)
}

Compiler.prototype.visitMixinBlock = function (node, parent) {
  console.log('visitMixinBlock', node, parent)
  if(mixinBlock) {
    this.visitBlock(mixinBlock, node)
    mixinBlock = null
  } else {
  }
}

Compiler.prototype.visitCase = function (node, parent) {
  this.addI(`switch(${node.expr}) {\r\n`)
  var self = this
  node.block.nodes.forEach(function (_case, index) {
    self.indent++
    self.visit(_case)
    self.indent--
  })
  this.addI(`}\r\n`)
}

Compiler.prototype.visitWhen = function (node, parent) {
  if (node.expr === 'default') {
    this.addI(`default:\r\n`)
  } else {
    this.addI(`case ${node.expr}:\r\n`)
  }
  this.indent++
  if (node.block) {
    this.visit(node.block, node)
  }
  this.addI(`break;\r\n`)
  this.indent--
}

function generateFile (file, out, basedir) {
  var ast = buildAst(file, basedir || '.')
  var compiler = new Compiler(ast)
  var code = compiler.compile()
  code += '\r\nmodule.exports = render\r\n'
  fs.writeFileSync(out, code)
}

module.exports = {
  ast: buildAst,
  generateFile: generateFile,
  Compiler: Compiler
}

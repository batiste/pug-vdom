var lex = require('pug-lexer')
var parse = require('pug-parser')
var linker = require('pug-linker')
var load = require('pug-load')
var generateCode = require('./pug-code-gen')

var pug_tpl = `
extends /layout.pug

block content
  p(class="1", toto=1) Hello world!
    a Top
      |  
    a.somthing.toto Blop
    
    - var pets = ['cat', 'dog']
    each petName in pets
      = petName
    each key, petName in pets
      = petName
block footer
  include /foot.pug
`

var ast = parse(lex(pug_tpl))
ast = load(ast, {lex: lex, parse: parse, basedir: './'})
ast = linker(ast)

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
  this.currentTagId = 0
  this.buffer = []
}

Compiler.prototype.add = function (str) {
  this.buffer.push(str)
}

Compiler.prototype.addI = function (str) {
  this.buffer.push(Array(this.indent + 1).join('  ') + str)
}

Compiler.prototype.compile = function () {
  this.visit(this.ast)
}

Compiler.prototype.visit = function (node, parent) {
  if (!this['visit' + node.type]) {
    throw 'Node not handled: ' + node.type
  }
  this['visit' + node.type](node, parent)
}

Compiler.prototype.visitBlock = function (node, parent) {
  for (var i = 0; i < node.nodes.length; ++i) {
    this.visit(node.nodes[i], node)
  }
}

Compiler.prototype.visitTag = function (node, parent) {
  this.currentTagId++
  var id = uid()
  this.addI(`var n${id}_child = []\r\n`)
  var s = this.parentTagId
  this.parentTagId = id
  this.visitBlock(node.block)
  this.addI(`var n${id} = h('${node.name}', {`)
  var at = []
  node.attrs.forEach(function (attr) {
    at.push(`'${attr.name}': ${attr.val}`)
  })
  this.add(at.join(', '))
  this.add(`}, n${id}_child)\r\n`)
  this.parentTagId = s
  this.addI(`n${s}_child.push(n${id})\r\n`)
  this.currentTagId--
}

Compiler.prototype.visitText = function (node, parent) {
  var s = JSON.stringify(node.val)
  this.addI(`n${this.parentTagId}_child.push(${s})\r\n`)
}

Compiler.prototype.visitNamedBlock = function (node, parent) {
  this.visitBlock(node, parent)
}

Compiler.prototype.visitCode = function (node, parent) {
  if (node.buffer) {
    this.addI(`n${this.parentTagId}_child.push(${node.val})\r\n`)
  } else {
    this.addI(node.val + '\r\n')
  }
}

Compiler.prototype.visitEach = function (node, parent) {
  var key = node.key || 'k' + uid()
  this.addI(`Object.keys(${node.obj}).forEach(function (${key}) {\r\n`)
  this.indent++
  this.addI(`var ${node.val} = ${node.obj}[${key}]\r\n`)
  this.visitBlock(node.block)
  this.indent--
  this.addI(`}\r\n`)
}

Compiler.prototype.visitExtends = function (node, parent) {
  throw "Extends nodes need to be resolved with pug-load and pug-linker"
}

compiler = new Compiler(ast)
compiler.compile()
console.log(compiler.buffer.join(''))

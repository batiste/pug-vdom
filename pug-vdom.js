var lex = require('pug-lexer')
var parse = require('pug-parser')
var linker = require('pug-linker')
var load = require('pug-load')
var fs = require('fs')

function buildAst (filename, basedir, options) {
  if (filename.substr(-4) !== '.pug') {
    filename = filename + '.pug';
  }
  var buf = fs.readFileSync(filename, 'utf8')
  var ast = parse(lex(buf.toString()), { filename })
  ast = load(ast, Object.assign({}, options, {lex: lex, parse: parse, basedir: basedir }))
  ast = linker(ast)
  return ast
}

function pugTextToAst (pugText) {
    var ast = parse(lex(pugText.trim()))
    ast = linker(ast)
    return ast
}

function generateTemplateFunction(pugText) {
    return eval('('+new Compiler(pugTextToAst(pugText)).compile()+')');
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
  this.addI(`function render(context, h, text = (string) => string) {\r\n`)
  this.indent++
  this.addI(`if (!pugVDOMRuntime) throw "pug-vdom runtime not found.";\r\n`)
  this.addI(`var runtime = pugVDOMRuntime\r\n`)
  // Bring all the variables from this into this scope
  this.addI(`var locals = context;\r\n`)
  this.addI(`var self = locals;\r\n`)
  this.addI(`var remainingKeys = pugVDOMRuntime.exposeLocals(locals);\r\n`)
  this.addI(`for (var prop in remainingKeys) {\r\n`)
  this.indent++
  this.addI(`eval('var ' + prop + ' =  locals.' + prop);\r\n`)
  this.indent--
  this.addI(`}\r\n`)
  this.addI(`var n0Child = []\r\n`)
  this.visit(this.ast)
  this.addI(`pugVDOMRuntime.deleteExposedLocals()\r\n`)
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
  this.addI(`var props = {attributes: runtime.compileAttrs([${node.attrs.map(attr => '{name:\'' + attr.name + '\', val: ' + attr.val + '}').join(',')}], [${node.attributeBlocks.join(',')}])};\r\n`);
  this.addI(`if (props.attributes.id) props.key = props.attributes.id;\r\n`);
  this.addI(`var n${id} = h(${node.name ? `'${node.name}'` : `${node.expr}`}, props, n${id}Child)\r\n`)
  this.parentTagId = s
  this.addI(`n${s}Child.push(n${id})\r\n`)
}

Compiler.prototype.visitInterpolatedTag = Compiler.prototype.visitTag;
Compiler.prototype.visitText = function (node, parent) {
  var val = node.val;
  var s = JSON.stringify(val)
  if (val[0] === '<') {
    this.addI(`n${this.parentTagId}Child = n${this.parentTagId}Child.concat(runtime.makeHtmlNode(${s}))\r\n`)
  } else {
    this.addI(`n${this.parentTagId}Child.push(text(${s}))\r\n`)
  }  
}

Compiler.prototype.visitNamedBlock = function (node, parent) {
  this.visitBlock(node, parent)
}

Compiler.prototype.visitCode = function (node, parent) {
  if (node.buffer) {
    this.addI(`n${this.parentTagId}Child = n${this.parentTagId}Child.concat(${node.mustEscape ? `text(${node.val})` : `runtime.makeHtmlNode(${node.val})`})\r\n`)
  } else {
    this.addI(node.val + '\r\n')
  }

  if(node.block){
    this.addI('{\r\n')
    this.indent++
    this.visitBlock(node.block, node)
    this.indent--
    this.addI('}\r\n')
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

Compiler.prototype.visitBlockComment = function(node, parent) {}

Compiler.prototype.visitWhile = function (node) {
  this.addI(`while (${node.test}){\r\n`);
  this.indent++
  this.visitBlock(node.block);
  this.indent--
  this.addI(`}\r\n`);
}

Compiler.prototype.visitEach = function (node, parent) {
  var tempVar = 'v' + uid()
  var key = node.key || 'k' + uid()

  this.addI(`var ${tempVar} = ${node.obj}\r\n`)
  this.addI(`Object.keys(${tempVar}).forEach(function (${key}) {\r\n`)
  this.indent++
  this.addI(`var ${node.val} = ${tempVar}[${key}]\r\n`)
  this.visitBlock(node.block)
  this.indent--
  this.addI(`}.bind(this))\r\n`)
}

Compiler.prototype.visitExtends = function (node, parent) {
  throw new Error('Extends nodes need to be resolved with pug-load and pug-linker')
}

Compiler.prototype.visitMixin = function (node, parent) {
  var s = this.parentTagId
  if (node.call) {
    if(node.block) { // the call mixin define a block
      var id = uid()
      this.parentTagId = id
      this.indent++
      this.addI(`var n${id}Child = []\r\n`)
      this.visitBlock(node.block, node)
      var args = node.args ? `${node.args}, n${id}Child` : `n${id}Child`
      this.addI(`n${s}Child.push(${node.name}(${args}));\r\n`)
      this.indent--
      this.parentTagId = s
    } else {
      this.addI(`n${s}Child.push(${node.name}(${node.args}));\r\n`)
    }
    return
  }
  var id = uid()
  this.parentTagId = id
  var args = node.args ? `${node.args}, __block` : `__block`
  this.addI(`function ${node.name}(${args}) {\r\n`)
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
  this.addI(`n${this.parentTagId}Child.push(__block);\r\n`)
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
  var code = '// PUG VDOM generated file\r\n' + compiler.compile()
  code += '\r\nmodule.exports = render\r\n'
  fs.writeFileSync(out, code)
}


module.exports = {
  ast: buildAst,
  generateTemplateFunction: generateTemplateFunction,
  pugTextToAst: pugTextToAst,
  generateFile: generateFile,
  Compiler: Compiler
}

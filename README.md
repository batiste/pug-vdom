# pug-vdom

Usage:

    var pugVDOM = require('pug-vdom')
    var ast = vDom.ast('mytemplate.pug', './basedir')
    var compiler = new pugVDOM.Compiler(ast)
    var code = compiler.compile()

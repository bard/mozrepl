repl.print('started loading class B');

repl.print('requiring class A from B');
module.require('class', 'circClassA');

repl.print('finished loading class B');
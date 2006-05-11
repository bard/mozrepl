devbox.mozrepl.dump('started loading class B\n');

devbox.mozrepl.dump('requiring class A from B\n');
Module.require('class', 'circClassA');

devbox.mozrepl.dump('finished loading class B\n');
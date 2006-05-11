devbox.mozrepl.dump('started loading package A\n');

devbox.mozrepl.dump('requiring package B from A\n');
Module.require('package', 'circPkgB');

devbox.mozrepl.dump('finished loading package A\n');
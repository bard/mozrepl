/*
  Copyright (C) 2006 by Massimiliano Mirra

  This program is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation; either version 2 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301 USA

  Author: Massimiliano Mirra, <bard [at] hyperstruct [dot] net>
*/

const REPL = Module.require('class', 'repl');

function constructor(instream, outstream, server) {
    this._server = server;
    this._instream = instream;
    this._outstream = outstream;
    this._repl = new REPL(this, window);
}

function output(string) {
    this._outstream.write(string, string.length);
}

function close() {
    this._instream.close();
    this._outstream.close();
    this._server.removeSession(this);
}

function onStartRequest(request, context) {
}

function onStopRequest(request, context, status) {
    this.close();
    dump('MozRepl: Closed a connection.\n');
}

function onDataAvailable(request, context, inputStream, offset, count) {
    this._repl._feed(this._instream.read(count));
}

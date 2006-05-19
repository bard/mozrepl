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

function constructor(instream, outstream, server) {
    this._server = server;
    this._instream = instream;
    this._outstream = outstream;
    this._buffer == '';
    this._loader = Components
        .classes['@mozilla.org/moz/jssubscript-loader;1']
        .getService(Components.interfaces.mozIJSSubScriptLoader);

    var session = this;
    var replHelper = {
        contextHistory: [],
        print: function(string) {
            session._outstream.write(string, string.length);
        },
        load: function(url, context) {
            return session._loader.loadSubScript(url, context || session._context);
        },
        enter: function(context) {
            this.contextHistory.push(session._context);
            this.setContext(context);
        },
        leave: function() {
            var context = this.contextHistory.pop();
            this.setContext(context);
        },
        setContext: function(context) {
            if(session._context)
                delete session._context.repl;
            session._context = context;
            session._context.repl = replHelper;
        },
        exit: function() {
            session.close();
        }
    };
    replHelper.setContext(window);

    this._repl = replHelper;
    this.USE_SUBSCRIPT_LOADER_FOR_EVAL = true;
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
    var outstream = this._outstream;
    function print(text) {
        outstream.write(text, text.length);
    }

    try {
        this._buffer += this._instream.read(count);

        var rx = /^::([^\s]+) (.+)\n/m;
        m = this._buffer.match(rx);
        if(m) {
            var cmd = m[1];
            var arg = m[2];
            this._buffer = this._buffer.replace(rx, '');
            
            print('!!! Special REPL commands no longer supported. (' + cmd + ', ' + arg + ')\n\n');
        }

        var match = this._buffer.match(/\n--end-emacs-input\n/m);
        if (match) {
            var code = this._buffer.substr(0, match.index);
            this._buffer = '';

            var result = this._repl.load(
                'data:application/x-javascript,' + encodeURIComponent(code)) +
                '\n\n';
            print('>>> ' + result);
        }

    } catch(exception) {
        var trace = '';
                
        if(exception.stack) {
            var calls = exception.stack.split('\n');
            for each (call in calls) {
                if(call.length > 0) {
                    call = call.replace(/\\n/g, '\n');
                            
                    if(call.length > 200)
                        call = call.substr(0, 200) + '[...]\n';
                            
                    trace += call.replace(/^/mg, '\t') + '\n';
                }
            }
        }

        trace +=  '!!! ' + exception.toString() + '\n\n';
                    
        print(trace);
        this._buffer = '';
    }
}

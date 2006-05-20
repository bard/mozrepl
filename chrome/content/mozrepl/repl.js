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

function constructor(instream, outstream, server, hostContext) {
    var repl = this;
    this._instream = instream;
    this._outstream = outstream;
    this._server = server;
    this._hostContext = hostContext;
    
    this._loader = Components
        .classes['@mozilla.org/moz/jssubscript-loader;1']
        .getService(Components.interfaces.mozIJSSubScriptLoader);
    this._contextHistory = [];
    this._currentContext = this._hostContext;
    this._inputBuffer = '';
    this._networkListener = {
        onStartRequest: function(request, context) {
        },
        onStopRequest: function(request, context, status) {
            repl.exit();
        },
        onDataAvailable: function(request, context, inputStream, offset, count) {
            repl._feed(repl._instream.read(count));
        }
    }

    this._name = 'repl';
    if(this._hostContext[this._name]) {
        for(var i=1; this._hostContext['repl' + i]; i++)
            ;
        this._name = 'repl' + i;
    }
    this._hostContext[this._name] = this;

    this._inputTerminators = {
        line:      /\n/m,
        multiline: /\n--end-remote-input\n/m
    }
    this.inputMode = 'line';

    if(this._name != 'repl')
        this.print('Hmmm, seems like other repl\'s are running in this context.\n' +
                   'To avoid conflicts, yours will be named "' + this._name + '".\n\n');
    this.prompt();
}

function print(data) {
    var string = data.toString();
    this._outstream.write(string, string.length);
}

function prompt() {
    this.print('> ');
}
        
function load(url, arbitraryContext) {
    return this._loader.loadSubScript(
        url, arbitraryContext || this._currentContext);
}
        
function enter(newContext) {
    this._contextHistory.push(this._currentContext);
    this._currentContext = newContext;
}
        
function leave() {
    var previousContext = this._contextHistory.pop();
    if(previousContext)
        this._currentContext = previousContext;
}

function exit() {
    delete this._hostContext[this._name];
    this._instream.close();
    this._outstream.close();
    this._server.removeSession(this);
}

function _feed(input) {
    var code;
    this._inputBuffer += input;
    
    switch(this.inputMode) {
    case 'line':
    case 'multiline':
        var match = this._inputBuffer.match(this._inputTerminators[this.inputMode]);
        if(match) 
            code = this._inputBuffer.substr(0, match.index);
        break;
    case 'syntax':
        code = this._inputBuffer;
        break;
    }

    if(code) {
        try { 
            this.print(this.load('data:application/x-javascript,' +
                                 encodeURIComponent(code)) + '\n');
            this._inputBuffer = '';
            this.prompt();
        } catch(e) {
            if(e.name == 'SyntaxError' && this.inputMode == 'syntax') {
                // ignore, and keep the buffer
            } else {
                this.print(_formatStackTrace1(e));
                this.print('!!! ' + e.toString() + '\n\n');
                this._inputBuffer = '';
                this.prompt();
            }
        }
    }
}

function _formatStackTrace1(exception) {
    var trace = '';                
    if(exception.stack) {
        var calls = exception.stack.split('\n');
        for each(var call in calls) {
            if(call.length > 0) {
                call = call.replace(/\\n/g, '\n');
                            
                if(call.length > 200)
                    call = call.substr(0, 200) + '[...]\n';
                            
                trace += call.replace(/^/mg, '\t') + '\n';
            }
        }
    }
    return trace;
}

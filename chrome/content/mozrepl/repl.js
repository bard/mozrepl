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

function constructor(session, topLevelContext) {
    this._session = session;
    this._loader = Components
        .classes['@mozilla.org/moz/jssubscript-loader;1']
        .getService(Components.interfaces.mozIJSSubScriptLoader);
    this._contextHistory = [];
    this._currentContext = topLevelContext;
    this._buffer = '';
    this._topLevelContext = topLevelContext;

    this.multilineTerminator = /\n--end-remote-input\n/m;
    this.inputMode = 'chunk';

    var name = 'repl';
    if(this._topLevelContext[name]) {
        for(var n=1; this._topLevelContext['repl' + n]; n++)
            ;
        name = 'repl' + n;
        this.print('Hmmm, other repl\'s are running in this context.  To avoid conflicts, yours will be named "' + name + '".\n\n');
    }
    this._topLevelContext[name] = this;
    this.prompt();
}

function print(data) {
    this._session.output(data.toString());
}

function prompt() {
    this.print('> ');
}
        
function load(url, arbitraryContext) {
    return this._loader.loadSubScript(url, arbitraryContext || this._currentContext);
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
    this._session.close();
}

function _feed(input) {
    var code;
    switch(this.inputMode) {
    case 'chunk':
        code = input;
        break;
    case 'multiline':
        this._buffer += input;
        
        var match = this._buffer.match(this.multilineTerminator);
        if (match) {
            code = this._buffer.substr(0, match.index);
            this._buffer = '';
        }
        break;
    }

    if(code) {
        try { 
            this.print(this.load('data:application/x-javascript,' +
                                 encodeURIComponent(code)) + '\n');
        } catch(exception) {
            this.print(_formatStackTrace1(exception));
            this.print('!!! ' + exception.toString() + '\n\n');
        }
        this.prompt();
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
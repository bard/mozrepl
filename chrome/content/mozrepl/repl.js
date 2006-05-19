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
    this._buffer == '';
    this._multilineTerminator = /\n--end-emacs-input\n/m;

    var name = 'repl';
    if(topLevelContext[name]) {
        for(var n=1; topLevelContext['repl' + n]; n++)
            ;
        name = 'repl' + n;
        this.print('Other repl\'s found in this context, yours will be named "' + name + '". Enjoy!\n\n');
    }
    topLevelContext[name] = this;
}

function print(string) {
    this._session.output(string);
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
    try {
        this._buffer += input;

        var match = this._buffer.match(this._multilineTerminator);
        if (match) {
            var code = this._buffer.substr(0, match.index);
            this._buffer = '';

            var result = this.load(
                'data:application/x-javascript,' + encodeURIComponent(code)) +
                '\n\n';
            this.print('>>> ' + result);
        }

    } catch(exception) {
        this.print(_formatStackTrace1(exception));
        this.print('!!! ' + exception.toString() + '\n\n');
        this._buffer = '';
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
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

function constructor(session, startingContext) {
    this._session = session;
    this._loader = Components
        .classes['@mozilla.org/moz/jssubscript-loader;1']
        .getService(Components.interfaces.mozIJSSubScriptLoader);
    this._contextHistory = [];
    this._currentContext = [];
    if(startingContext)
        this._setContext(startingContext);
}

function print(string) {
    this._session._outstream.write(string, string.length);
}
        
function load(url, arbitraryContext) {
    return this._loader.loadSubScript(url, arbitraryContext || this._currentContext);
}
        
function enter(newContext) {
    this._contextHistory.push(this._currentContext);
    this._setContext(newContext);
}
        
function leave() {
    var previousContext = this._contextHistory.pop();
    if(previousContext)
        this._setContext(previousContext);
}
        
function _setContext(context) {
    if(this._currentContext)
        delete this._currentContext.repl;
    this._currentContext = context;
    this._currentContext.repl = this;
}
        
function exit() {
    this._session.close();
}

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
    this._inputSeparators = {
        line:      /\n/gm,
        multiline: /\n--end-remote-input\n/gm,
        syntax:    /\n$/m
    }
    this._inputMode = 'line';

    this._name = _chooseName1('repl', this._hostContext);
    this._hostContext[this._name] = this;

    this.__defineSetter__(
        'inputMode', function(mode) {
            if(mode.match(/^(line|syntax|multiline)$/)) 
                this._inputMode = mode;
            else
                repl.print('Input mode must be one of line, syntax, multiline.');
        });
    this.__defineGetter__(
        'inputMode', function() {
            return this._inputMode;
        });

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
    if(newContext instanceof Window)
        this._migrate(newContext);
    
    this._currentContext = newContext;
    return this._currentContext;
}
        
function leave() {
    var previousContext = this._contextHistory.pop();
    if(previousContext) {
        if(previousContext instanceof Window)
            this._migrate(previousContext)
        this._currentContext = previousContext;        
    }
    return this._currentContext;
}

function quit() {
    delete this._hostContext[this._name];
    this._instream.close();
    this._outstream.close();
    this._server.removeSession(this);
}

// adapted from ddumpObject() at
// http://lxr.mozilla.org/mozilla/source/extensions/sroaming/resources/content/transfer/utility.js

function inspect(obj, maxDepth, name, curDepth) {
    function print(text) {
        repl.print(text + "\n");
    }

    name = name || '<obj>';
    maxDepth = maxDepth || 1;

    if (curDepth == undefined)
        curDepth = 0;
    if (maxDepth != undefined && curDepth > maxDepth)
        return;

    var i = 0;
    for(var prop in obj) {
        i++;
        if (typeof(obj[prop]) == "object") {
            if (obj[prop] && obj[prop].length != undefined)
                print(name + "." + prop + "=[probably array, length "
                      + obj[prop].length + "]");
            else
                print(name + "." + prop + "=[" + typeof(obj[prop]) + "]");
            inspect(obj[prop], maxDepth, name + "." + prop, curDepth+1);
        }
        else if (typeof(obj[prop]) == "function")
            print(name + "." + prop + "=[function]");
        else
            print(name + "." + prop + "=" + obj[prop]);
    }
    if(!i)
        print(name + " is empty");    
}

/* Private functions */

function _feed(input) {
    if(input.match(/^\s*$/) &&
       this._inputBuffer.match(/^\s*$/)) {
        this.prompt();
        return;
    }
    
    repl = this;

    function evaluate(code) {
        var result = repl.load('data:application/x-javascript,' +
                               encodeURIComponent(code));
        repl.print(result + '\n');
        repl.prompt();
    }

    function handleError(e) {
        repl.print(_formatStackTrace1(e));
        repl.print('!!! ' + e.toString() + '\n\n');
        repl.prompt();        
    }

    switch(this.inputMode) {
    case 'line':
    case 'multiline':
        this._inputBuffer = _eachChunk(
            this._inputBuffer + input,
            this._inputSeparators[this.inputMode],
            function(inputChunk) {
                try {
                    evaluate(inputChunk);
                } catch(e) {
                    handleError(e);
                };
            });
        break;
    case 'syntax':
        this._inputBuffer += input;
        try {
            evaluate(this._inputBuffer);
            this._inputBuffer = '';
        } catch(e if e.name == 'SyntaxError') {
            // ignore and keep filling the buffer
        } catch(e) {
            handleError(e);
            this._inputBuffer = '';
        }
        break;
    }
}

function _migrate(context) {
    context.repl = this;
    delete this._currentContext.repl;
}

/* private, side-effects free functions */

function _eachChunk(string, separator, chunkHandler) {
    var start = 0;
    var match;
    while(match = separator.exec(string)) {
        chunkHandler(string.substring(start, match.index));
        start = separator.lastIndex;
    }
    return string.substring(start, string.length);
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

function _chooseName1(basename, context) {
    return (basename in context) ?
        (function() {
            var i = 1;
            do { i++ } while(basename + i in context);
            return basename + i;
        })()
        :
        basename;
}



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

function constructor(instream, outstream, server, context) {
    var _this = this;

    this._instream = instream;
    this._outstream = outstream;
    this._server = server;

    this._name            = _chooseName1('repl', context);
    this._creationContext = context;
    this._hostContext     = context;
    this._workContext     = context;
    this._creationContext[this._name] = this;

    this._loader = Components
        .classes['@mozilla.org/moz/jssubscript-loader;1']
        .getService(Components.interfaces.mozIJSSubScriptLoader);
    this._contextHistory = [];
    this._inputBuffer = '';
    this._networkListener = {
        onStartRequest: function(request, context) {
        },
        onStopRequest: function(request, context, status) {
            _this.quit();
        },
        onDataAvailable: function(request, context, inputStream, offset, count) {
            _this._feed(_this._instream.read(count));
        }
    }
    this._inputSeparators = {
        line:      /\n/m,
        multiline: /\n--end-remote-input\n/m,
        syntax:    /\n$/m
    }

    if(this._name != 'repl') {
        this.print('Hmmm, seems like other repl\'s are running in this context.');
        this.print('To avoid conflicts, yours will be named "' + this._name + '".');
    }

    this._env = {};
    this._savedEnv = {};
    this.setenv('printPrompt', true);
    this.setenv('inputMode', 'line');
    
    this.prompt();
}

function setenv(name, value) {
    this._env[name] = value;
    return value;
}

function getenv(name) {
    return this._env[name];
}

function pushenv() {
    var name;
    for(var i=0, l=arguments.length; i<l; i++) {
        name = arguments[i];
        this._savedEnv[name] = this._env[name];
    }
    
    return this._env[name];
}

function popenv() {
    var name;
    for(var i=0, l=arguments.length; i<l; i++) {
        name = arguments[i];
        if(name in this._savedEnv) {
            this._env[name] = this._savedEnv[name];
            delete this._savedEnv[name];
        }        
    }

    return this._env[name];
}

function print(data, appendNewline) {
    var string = data +
        (appendNewline == false ? '' : '\n');

    this._outstream.write(string, string.length);
}

function prompt() {
    if(this.getenv('printPrompt'))
        this.print(this._name + '> ', false);
}
        
function load(url, arbitraryContext) {
    return this._loader.loadSubScript(
        url, arbitraryContext || this._workContext);
}
        
function enter(newContext) {
    this._contextHistory.push(this._workContext);
    if(newContext instanceof Window)
        this._cloneTo(newContext);
    
    this._workContext = newContext;
    return this._workContext;
}
        
function leave() {
    var previousContext = this._contextHistory.pop();
    if(previousContext) 
        this._workContext = previousContext;        

    return this._workContext;
}

function content() {
    if(this._hostContext['content'])
        return this.enter(this._hostContext['content']);
}

function quit() {
    delete this._hostContext[this._name];
    delete this._creationContext[this._name];
    this._instream.close();
    this._outstream.close();
    this._server.removeSession(this);
}

function rename(name) {
    if(name in this._hostContext) 
        this.print('Sorry, name already exists in the context repl is hosted in.');
    else if(name in this._creationContext)
        this.print('Sorry, name already exists in the context was created.')
    else {
        delete this._creationContext[this._name];
        delete this._hostContext[this._name];
        this._name = name;
        this._creationContext[this._name] = this;
        this._hostContext[this._name] = this;        
    } 
}

// adapted from ddumpObject() at
// http://lxr.mozilla.org/mozilla/source/extensions/sroaming/resources/content/transfer/utility.js

function inspect(obj, maxDepth, name, curDepth) {
    if(name == undefined)
        name = '<' + typeof(obj) + '>'
    if(maxDepth == undefined)
        maxDepth = 0;
    if(curDepth == undefined)
        curDepth = 0;
    if(maxDepth != undefined && curDepth > maxDepth)
        return;

    var i = 0;
    for(var prop in obj) {
        i++;
        if (typeof(obj[prop]) == "object") {
            if (obj[prop] && obj[prop].length != undefined)
                this.print(name + "." + prop + "=[probably array, length "
                           + obj[prop].length + "]");
            else
                this.print(name + "." + prop + "=[" + typeof(obj[prop]) + "]");
            inspect(obj[prop], maxDepth, name + "." + prop, curDepth+1);
        }
        else if (typeof(obj[prop]) == "function")
            this.print(name + "." + prop + "=[function]");
        else
            this.print(name + "." + prop + "=" + obj[prop]);
    }
    if(!i)
        this.print(name + " is empty");    
}

function look() {
    this.inspect(this._workContext, 0);
}

function whereAmI() {
    return this._workContext;
}

function lookup(criteria, context) {
    context = context || this._hostContext;
    
    var matcher;
    if(typeof(criteria) == 'function')
        matcher = criteria;
    else
        matcher = function(name) { return name == criteria; }
    
    for(var name in context)
        if(matcher(name))
            this.print(name);
}

function home() {
    return this.enter(this._creationContext);
}

/* Private functions */

function _feed(input) {
    if(input.match(/^\s*$/) && this._inputBuffer.match(/^\s*$/)) {
        this.prompt();
        return;
    }
    
    var _this = this;
    function evaluate(code) {
        var result = _this.load('data:application/x-javascript,' +
                                encodeURIComponent(code));
        if(result != undefined)
            _this.print(result);
        _this.prompt();
    }

    function handleError(e) {
        _this.print(_formatStackTrace1(e));
        _this.print('!!! ' + e.toString() + '\n');
        _this.prompt();        
    }

    function scan(string, separator) {
        var match = string.match(separator);
        if(match)
            return [string.substring(0, match.index),
                    string.substr(match.index + match[0].length)];
        else
            return [null, string];
    }


    switch(this._env['inputMode']) {
    case 'line':
    case 'multiline':
        this._inputBuffer += input;
        var res = scan(this._inputBuffer, this._inputSeparators[this._env['inputMode']]);
        while(res[0]) {
            try {
                evaluate(res[0]);
            } catch(e) {
                handleError(e);
            }
            res = scan(res[1], this._inputSeparators[this._env['inputMode']]);
        }
        this._inputBuffer = res[1];
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

function _cloneTo(context) {
    context[this._name] = this;
    this._hostContext = context;
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
            var i = 0;
            do { i++ } while(basename + i in context);
            return basename + i;
        })()
        :
        basename;
}



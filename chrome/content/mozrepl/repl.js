/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is MozRepl.
 *
 * The Initial Developer of the Original Code is
 * Massimiliano Mirra <bard [at] hyperstruct [dot] net>.
 * Portions created by the Initial Developer are Copyright (C) 2006-2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Massimiliano Mirra <bard [at] hyperstruct [dot] net>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


// GLOBAL DEFINITIONS
// ----------------------------------------------------------------------

const Cc = Components.classes;
const Ci = Components.interfaces;
const loader = Cc['@mozilla.org/moz/jssubscript-loader;1']
    .getService(Ci.mozIJSSubScriptLoader);

var util = {};
loader.loadSubScript('chrome://mozlab/content/mozrepl/util.js', util);


// CORE
// ----------------------------------------------------------------------

function onOutput() {
    throw new Error('onInput callback must be assigned.');
}

function onQuit() {
    throw new Error('onQuit callback must be assigned.');
}

function init(context) {
    var _this = this;

    this._name            = chooseName('repl', context);
    this._creationContext = context;
    this._hostContext     = context;
    this._workContext     = context;
    this._creationContext[this._name] = this;

    this._contextHistory = [];
    this._inputBuffer = '';

    this._eval_buffer = Cc['@mozilla.org/file/directory_service;1']
        .getService(Ci.nsIProperties)
        .get('ProfD', Ci.nsIFile);
    this._eval_buffer.append('mozrepl.tmp.js');
    
    this._eval_buffer_url = Cc['@mozilla.org/network/io-service;1']
        .getService(Ci.nsIIOService)
        .getProtocolHandler('file')
        .QueryInterface(Ci.nsIFileProtocolHandler)
        .getURLSpecFromFile(this._eval_buffer);
    
    this._inputSeparators = {
        line:      /\n/m,
        multiline: /\n--end-remote-input\n/m,
        syntax:    /\n$/m
    }

    this._emergencyExit = function(event) {
        _this.print('Host context unloading! Going back to creation context.')
        _this.home();
    }

    this.__defineGetter__(
        'repl', function() {
            return this;
        });

    this._env = {};
    this._savedEnv = {};
    this.setenv('printPrompt', true);
    this.setenv('inputMode', 'syntax');

    this.loadInit();

    this.print('Current input mode is: ' + this._env['inputMode']);
    this.print('');
    this.print('If you get stuck at the "...>" prompt, enter a semicolon (;) at the beginning of the line to force evaluation.');
    this.print('');
    
    if(this._name != 'repl') {
        this.print('Hmmm, seems like other repl\'s are running in this context.');
        this.print('To avoid conflicts, yours will be named "' + this._name + '".');
    }

    this._prompt();
}


// ENVIRONMENT HANDLING
// ----------------------------------------------------------------------

function setenv(name, value) {
    this._env[name] = value;
    return value;
}
setenv.doc =
    'Takes a name and a value and stores them so that \
they can be later retrieved via setenv(). Some, such as \
"printPrompt"/boolean, affect there way the REPL works.';


function getenv(name) {
    return this._env[name];
}
getenv.doc =
    'Given a name, returns a value previously stored via \
setenv().';


function pushenv() {
    var name;
    for(var i=0, l=arguments.length; i<l; i++) {
        name = arguments[i];
        this._savedEnv[name] = this._env[name];
    }
}
pushenv.doc =
    'Takes one or more names of values previously stored \
via setenv(), and stores them so that they can be later \
restored via popenv().';


function popenv() {
    var name;
    for(var i=0, l=arguments.length; i<l; i++) {
        name = arguments[i];
        if(name in this._savedEnv) {
            this._env[name] = this._savedEnv[name];
            delete this._savedEnv[name];
        }        
    }
}
popenv.doc =
    'Takes one or more names of values previously pushed \
via popenv() and restores them, overwriting the current ones.';


// OUTPUT
// ----------------------------------------------------------------------

function represent(thing) {
    var represent = arguments.callee;
    var s;
    switch(typeof(thing)) {
    case 'string':
        s = '"' + thing + '"';
        break;
    case 'number':
        s = thing;
        break;
    case 'object':
        var names = [];
        for(var name in thing)
            names.push(name);

        s = thing;
        if(names.length > 0) {
            s += ' — {';
            s += names.slice(0, 7).map(function(n) {
                var repr = n + ': ';
                try {
                    repr += (typeof(thing[n]) == 'object' ?
                             '{…}' : represent(thing[n]));
                } catch(e) {
                    repr += '[Exception!]'
                }
                return repr;
            }).join(', ');
            if(names.length > 7)
                s += ', ...'
            s += '}';
        }
        break;
    case 'function':
        s = 'function() {…}';
        break;
    default:
        s = thing;
    }
    return s;
}

function print(data, appendNewline) {
    var string = data == undefined ?
        '\n' :
        data + (appendNewline == false ? '' : '\n');

    this.onOutput(string);
}
print.doc =
    'Converts an object to a string and prints the string. \
Appends a newline unless false is given as second parameter.';


// SCRIPT HANDLING
// ----------------------------------------------------------------------

function loadInit() {
    try {
        var initUrl = Cc['@mozilla.org/preferences-service;1']
            .getService(Ci.nsIPrefBranch)
            .getCharPref('extensions.mozlab.mozrepl.initUrl');

        if(initUrl) {
            this.print('Loading ' + initUrl + '...');
            this.load(initUrl, this);
        }
        
    } catch(e) {
        this.print('Could not load initialization script ' +
                   initUrl + ': ' + e);
    }
}

function load(url, arbitraryContext) {
    return loader.loadSubScript(
        url, arbitraryContext || this._workContext);
}
load.doc =
    'Loads a chrome:// or file:// script into the current context, \
or optionally into an arbitrary context passed as a second parameter.';


// CONTEXT NAVIGATION
// ----------------------------------------------------------------------

function enter(context) {
    this._contextHistory.push(this._workContext);

    if(isTopLevel(context))
        this._migrateTopLevel(context);
    this._workContext = context;

    return this._workContext;
}
enter.doc =
    'Makes a new context the current one.  After this, new definitions \
(variables, functions etc.) will be members of the new context. \
Remembers the previous context, so that you can get back to it with \
leave().';

function back() {
    // do sanity check to prevent re-entering stale contextes
    
    var context = this._contextHistory.pop();
    if(context) {
        if(isTopLevel(context))
            this._migrateTopLevel(context);
        this._workContext = context;
        return this._workContext;
    }
}
back.doc =
    "Returns to the previous context.";


function home() {
    return this.enter(this._creationContext);
}
home.doc =
    'Returns to the context where the REPL was created.';


// MISC
// ----------------------------------------------------------------------

function quit() {
    delete this._hostContext[this._name];
    delete this._creationContext[this._name];
    this.onQuit();
}
quit.doc =
    'Ends the session.';


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
rename.doc =
    'Renames the session.';


// CONTEXT EXPLORING
// ----------------------------------------------------------------------

function inspect(obj, maxDepth, name, curDepth) {
// adapted from ddumpObject() at
// http://lxr.mozilla.org/mozilla/source/extensions/sroaming/resources/content/transfer/utility.js

    function crop(string, max) {
        string = string.match(/^(.+?)(\n|$)/m)[1];
        max = max || 70;
        return (string.length > max-3) ?
            string.slice(0, max-3) + '...' : string;
    }

    if(name == undefined)
        name = '<' + typeof(obj) + '>';
    if(maxDepth == undefined)
        maxDepth = 0;
    if(curDepth == undefined)
        curDepth = 0;
    if(maxDepth != undefined && curDepth > maxDepth)
        return;

    var i = 0;
    for(var prop in obj) {
        if(obj instanceof Ci.nsIDOMWindow &&
           (prop == 'java' || prop == 'sun' || prop == 'Packages')) {
            this.print(name + "." + prop + "=[not inspecting, dangerous]");
            continue;
        }

        try {
            i++;
            if(typeof(obj[prop]) == "object") {
                if(obj.length != undefined)
                    this.print(name + "." + prop + "=[probably array, length "
                               + obj[prop].length + "]");
                else
                    this.print(name + "." + prop + "=[" + typeof(obj[prop]) + "]");
                    
                this.inspect(obj[prop], maxDepth, name + "." + prop, curDepth+1);
            }
            else if (typeof(obj[prop]) == "function")
                this.print(name + "." + prop + "=[function]");
            else
                this.print(name + "." + prop + "=" + obj[prop]);
            
            if(obj[prop] && obj[prop].doc && typeof(obj[prop].doc) == 'string')
                this.print('    ' + crop(obj[prop].doc));
            
        } catch(e) {
            this.print(name + '.' + prop + ' - Exception while inspecting.');
        }
    }
    if(!i)
        this.print(name + " is empty");    
}
inspect.doc =
    "Lists members of a given object.";


function look() {
    this.inspect(this._workContext, 0, 'this');
}
look.doc =
    "Lists objects in the current context.";


function highlight(context, time) {
    context = context || this._workContext;
    time = time || 1000;
    if(!context.QueryInterface)
        return;

    const NS_NOINTERFACE = 0x80004002;
    
    try {
        context.QueryInterface(Ci.nsIDOMXULElement);
        var savedBorder = context.style.border;
        context.style.border = 'thick dotted red';
        Cc['@mozilla.org/timer;1']
            .createInstance(Ci.nsITimer)
            .initWithCallback(
                {notify: function() {
                        context.style.border = savedBorder;
                    }}, time, Ci.nsITimer.TYPE_ONE_SHOT);
    } catch(e if e.result == NS_NOINTERFACE) {}
}
highlight.doc =
    "Highlights the passed context (or the current, if none given) if it is \
a XUL element.";


function whereAmI() {
    var context = this._workContext;
    var desc = '';
    desc += context;
    if(context.document && context.document.title)
        desc += ' - Document title: "' + context.document.title + '"';
    if(context.nodeName)
        desc += ' - ' + context.nodeName;
    this.print(desc);
    this.highlight();
}
whereAmI.doc =
    "Returns a string representation of the current context.";


function search(criteria, context) {
    context = context || this._workContext;
    
    var matcher;
    if(typeof(criteria) == 'function')
        matcher = criteria;
    else
        matcher = function(name) { return name == criteria; }
    
    for(var name in context)
        if(matcher(name))
            this.print(name);
}
search.doc =
    "Searches for a member in the current context, or optionally in an \
arbitrary given as a second parameter.";
    

function doc(thing) {
    this.print(util.docFor(thing));

    var url = util.helpUrlFor(thing);
    if(url) {
        this.print('Online help found, displaying...');
        Cc['@mozilla.org/embedcomp/window-watcher;1']
            .getService(Ci.nsIWindowWatcher)
            .openWindow(null, url, 'help',
                        'width=640,height=600,scrollbars=yes,menubars=no,' +
                        'toolbar=no,location=no,status=no,resizable=yes', null);
    }
}
doc.doc =
    'Looks up documentation for a given object, either in the doc string \
(if present) or on XULPlanet.com.';


// INTERNALS
// ----------------------------------------------------------------------

function _migrateTopLevel(context) {
    if(this._hostContext instanceof Ci.nsIDOMWindow)
        this._hostContext.removeEventListener('unload', this._emergencyExit, false);
    
    this._hostContext[this._name] = undefined;
    this._hostContext = context;
    this._hostContext[this._name] = this;

    if(this._hostContext instanceof Ci.nsIDOMWindow)
        this._hostContext.addEventListener('unload', this._emergencyExit, false);
}

function _prompt(prompt) {
    if(this.getenv('printPrompt'))
        if(prompt)
            this.print(prompt, false);
        else 
            this.print(this._name + '> ', false);
}
        
function receive(input) {
    if(input.match(/^\s*$/) && this._inputBuffer.match(/^\s*$/)) {
        this._prompt();
        return;
    }
    
    var _this = this;
    function evaluate(code) {
        var fos = Cc['@mozilla.org/network/file-output-stream;1']
            .createInstance(Ci.nsIFileOutputStream);
        fos.init(_this._eval_buffer, 0x02 | 0x08 | 0x20, 0600, 0); 

        var os = Cc['@mozilla.org/intl/converter-output-stream;1']
            .createInstance(Ci.nsIConverterOutputStream);
        os.init(fos, 'UTF-8', 0, 0x0000);
        os.writeString(code);
        os.close();

        var result = _this.load(_this._eval_buffer_url);

        _this.$$ = result;
        if(result != undefined)
            _this.print(represent(result));
        _this._prompt();
    }

    function handleError(e) {
        if(e) 
            _this.print(formatStackTrace(e));
        
        _this.print('!!! ' + e + '\n');
        _this._prompt();        
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
        if(/^\s*;\s*$/.test(input)) {
            try {
                evaluate(this._inputBuffer);
            } catch(e) {
                handleError(e);
            }
            this._inputBuffer = '';
        } else {
            this._inputBuffer += input;
            try {
                evaluate(this._inputBuffer);
                this._inputBuffer = '';
            } catch(e if e.name == 'SyntaxError') {
                // ignore and keep filling the buffer
                this._prompt(this._name.replace(/./g, '.') + '> ');
            } catch(e) {
                handleError(e);
                this._inputBuffer = '';
            }
            break;
        }
    }
}


// UTILITIES
// ----------------------------------------------------------------------

function formatStackTrace(exception) {
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

function chooseName(basename, context) {
    if(basename in context) {
        var i = 0;
        do { i++ } while(basename + i in context);
        return basename + i;
    } else
        return basename;
}

function isTopLevel(object) {
    return (object instanceof Ci.nsIDOMWindow ||
            'wrappedJSObject' in object ||
            'NSGetModule' in object)
}
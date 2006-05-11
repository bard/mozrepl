// Copyright (C) 2006 by Massimiliano Mirra
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301 USA
//
// Author: Massimiliano Mirra, <bard [at] hyperstruct [dot] net>

function MozRepl_Interactor(instream, outstream) {
    this.__instream = instream;
    this.__outstream = outstream;
};

MozRepl_Interactor.prototype = {
    __buffer: '',

    __loader: Components
    .classes['@mozilla.org/moz/jssubscript-loader;1']
    .getService(Components.interfaces.mozIJSSubScriptLoader),

    USE_SUBSCRIPT_LOADER_FOR_EVAL: false,
    
    eval: function(code) {
        if(this.USE_SUBSCRIPT_LOADER_FOR_EVAL) {
            dump('MozRepl: Evaluating as subscript: ' + code + '\n');
            code = 'data:application/x-javascript,' + encodeURIComponent(code);
            return this.load(code);
        } else {
            dump('MozRepl: Evaluating with eval(): ' + code + '\n');
            return eval(code);
        }
    },

    load: function(url, context) {
        dump('MozRepl: Loading subscript ' + url + '\n');
        return this.__loader.loadSubScript(url, context || window);    
    },

    output: function(text) {
        this.__outstream.write(text, text.length);
    },

    onStartRequest: function(request, context) {
        this.name = (new Date()).getTime()
        MozRepl_Server.addInteractor(this, this.name);
    },

    onStopRequest: function(request, context, status) {
        this.__instream.close();
        this.__outstream.close();
        if(this.name)
            MozRepl_Server.removeInteractor(name);
        dump('MozRepl: Closed a connection.\n');
    },

    onDataAvailable: function(request, context, inputStream, offset, count) {
        try {
            this.__buffer += this.__instream.read(count);

            var rx = /^::([^\s]+) (.+)\n/m;
            m = this.__buffer.match(rx);
            if(m) {
                var cmd = m[1];
                var arg = m[2];
                this.__buffer = this.__buffer.replace(rx, '');
            
                switch(cmd) {
                case 'name':
                    var oldName = this.name;
                    this.name = arg;
                    MozRepl_Server.renameInteractor(oldName, this.name);
                    break;
                case 'echo':
                    this.__outstream.write(arg + '\n', arg.length + 1);
                    break;
                case 'load':
                    var result = this.load(arg) + '\n\n';
                    this.__outstream.write('>>> ' + result, result.length + 4);
                    break;
                }
            }

            var match = this.__buffer.match(/\n--end-emacs-input\n/m);
            if (match) {
                var code = this.__buffer.substr(0, match.index);
                this.__buffer = '';

                var result = this.eval(code) + '\n\n';
                this.__outstream.write('>>> ' + result, result.length + 4);
            }

        } catch(exception) {
            var trace = '';
                
            if(exception.stack) {
                var calls = exception.stack.split('\n');
                for each (call in calls) {
                    if(call.length > 0) {
                        call = call.replace(/\\n/g, '\n');
                            
                        if(call.length > 200)
                            call = call.substr(0, 200) + '[...]\n'
                            
                                trace += call.replace(/^/mg, '\t') + '\n';
                    }
                }
            }

            trace +=  '!!! ' + exception.toString() + '\n\n';
                    
            this.output(trace);
            this.__buffer = '';
        }
    }
}


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
 * The Original Code is ModuleManager.
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


function ModuleManager(searchPath, suffixList) {
    this._searchPath = [];

    var pathItem;
    if(searchPath)
        for each(pathItem in searchPath) 
            if(pathItem.match(/^\./))
                this._searchPath.push(
                    Components.stack.caller.filename.replace(/\/[^/]+$/, '/' + pathItem));
            else
                this._searchPath.push(pathItem);
    
    this._suffixList = suffixList || ['.js'];
    this._loader = Components
        .classes['@mozilla.org/moz/jssubscript-loader;1']
        .getService(Components.interfaces.mozIJSSubScriptLoader);
    this._requireCache = {};
}

ModuleManager.prototype = {
    require: function(type, logicalUrl) {

        var directoryOfCaller = Components.stack.caller.filename.replace(/\/[^/]+$/, '');
        var realUrl = this._locate(
            logicalUrl,
            [directoryOfCaller].concat(this._searchPath),
            this._suffixList);

        if(realUrl)
            switch(type) {
            case 'class_p': // DEPRECATED
                return this._loadClassPrivateEnv(realUrl);
                break;
            case 'class':
                return this._loadClassSharedEnv(realUrl);
                break;
            case 'package':
                return this._loadPackage(realUrl);
                break;
            default:
                throw new Error('Unknown module type. (' + type + ')');
            }
        else
            throw new Error('No script with given logical URL available. (' + logicalUrl + ')');

        return null;
    },

    inject: function(logicalUrl, target) {
        var directoryOfCaller = Components.stack.caller.filename.replace(/\/[^/]+$/, '');
        var realUrl = this._locate(
            logicalUrl,
            [directoryOfCaller].concat(this._searchPath),
            this._suffixList);

        if(realUrl)
            this._loader.loadSubScript(realUrl, target);
        else
            throw new Error('No script with given logical URL available. (' + logicalUrl + ')');        
    },

    /* Internals */

    _loadClassSharedEnv: function(realUrl) {
        var cacheKey = ['class', realUrl];

        var classConstructor = this._requireCache[cacheKey];
        if(!classConstructor) {
            var proto = {
                module: this
            };
            classConstructor = function() {
                if(proto.constructor)
                    proto.constructor.apply(this, arguments);
            };

            this._requireCache[cacheKey] = classConstructor;

            this._loader.loadSubScript(realUrl, proto);

            for(var name in proto) 
                if(name != 'inheritor' &&
                   name != 'constructor')
                    classConstructor.prototype[name] = proto[name];

            if(proto.inheritor)
                classConstructor.prototype = proto.inheritor();
            
        }
        return classConstructor;
    },

    // This variant brings a severe performance penalty (about seven
    // times slower than shared environment), because a file is loaded
    // and evaluated *each time* the constructor is called.

    _loadClassPrivateEnv: function(realUrl) {
        var _loader = this._loader;
        var _module = this;
        return function() {
            this.module = _module;
            _loader.loadSubScript(realUrl, this);
            this.constructor.apply(this, arguments);
        }
    },

    _loadPackage: function(realUrl) {
        var cacheKey = ['package', realUrl] // BUG
        var pkg = this._requireCache[cacheKey];
        if(!pkg) {
            pkg = {
                module: this
            };
            this._requireCache[cacheKey] = pkg;

            this._loader.loadSubScript(realUrl, pkg);
        }
        return pkg;
    },

    /* Internals, side-effect free */

    _locate: function(fileName, directoryList, suffixList) {
        var url, directoryName, suffixName;

        directoryList = directoryList || [];
        suffixList = suffixList || [''];

        for each(directoryName in directoryList) {
            for each(suffixName in suffixList) {
                url =
                    directoryName +
                    (directoryName.match(/\/$/) ? '' : '/') +
                    fileName +
                    suffixName;

                if(this._urlAvailable(url))
                    return url;
            }
        }
        return null;
    },

    _urlAvailable: function(url) {
        const NS_ERROR_FILE_NOT_FOUND = 0x80520012;
        const NS_ERROR_FAILURE = 0x80004005

        var channel, input, result;
        try {
            channel = Components.classes['@mozilla.org/network/io-service;1']
            .getService(Components.interfaces.nsIIOService)
            .newChannel(url, null, null);

            input = channel.open();
            // non-existing chrome:// urls within xpi packages do not
            // throw FILE_NOT_FOUND on channel opening but can be
            // checked with contentLength
            result = channel.contentLength != -1;
            input.close();
            return result;

        } catch(e if e.result == NS_ERROR_FILE_NOT_FOUND) {
            return false;
        } catch(e if e.result == NS_ERROR_FAILURE) {
            return false;
        }
        return false;
    }
};

ModuleManager.testBasic = function() {
    repl.print('\n***** Verifying class loader functionality (private class) *****\n');

    var module = new ModuleManager(['.']);
    var Test = module.require('class_p', 'test/classPrivateEnv');
    
    var t1 = new Test();
    var t2 = new Test();
    
    t1.setVar(4);
    t2.setVar(5);

    repl.print(t1.getVar() + '\n');
    repl.print(t2.getVar() + '\n');    
}


ModuleManager.benchmark = function() {
    var module = new ModuleManager();

    function benchmark(fn) {
        var start, end;
        
        start = new Date();
        fn();
        end = new Date();

        return end.getTime() - start.getTime();
    }

    repl.print('\n***** Benchmarking instantiation of 1000 loaded class vs. normal class *****\n');

    repl.print(
        'Class in private environment: ' +
        benchmark(
            function() {
                var Test = module.require('class_p', 'test/classPrivateEnv');
                for(var i=0; i<1000; i++)
                    new Test();
            }) +
        ' msecs.');

    repl.print(
        'Class in shared environment: ' +
        benchmark(
            function() {
                var Test = module.require('class', 'test/classSharedEnv');
                for(var i=0; i<1000; i++)
                    new Test();
            }) +
        ' msecs.');

    repl.print(
        'Native definition: ' +
        benchmark(
            function() {
                function Test() {}
                for (var i=0; i<1000; i++)
                    new Test();
            }) +
        ' msecs.');    
}

ModuleManager.testCircular = function() {
    repl.print('\n***** Handling circular dependencies *****\n');

    var module = new ModuleManager();

    repl.print('CIRCULAR PACKAGES');
    var pkgA = module.require('package', 'test/circPkgA');

    repl.print('CIRCULAR CLASSES');
    var classA = module.require('class', 'test/circClassA');
};

/*
  ModuleManager.testBasic();
  ModuleManager.testCircular();
  ModuleManager.benchmark();
*/


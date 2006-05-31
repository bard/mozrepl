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
// Author: Massimiliano Mirra <bard [at] hyperstruct [dot] net>

// ----------------------------------------------------------------------

// Much more than just convenience assignments: saving local
// references ensures that we can still access them if the window
// where ActiveRDF was defined, and from whose context 'Components'
// was taken, goes away.

const Cc = Components.classes;
const Ci = Components.interfaces;

// ****** Programmer interface ******

function ActiveRDF(ds) {
    if(!ds)
        this.datasource = Cc['@mozilla.org/rdf/datasource;1?name=in-memory-datasource'].
            createInstance(Ci.nsIRDFDataSource);
}

// Create and register a record class as described by the given schema

ActiveRDF.prototype.create = function(schema) {
    var recordClass = function(optionalUriOrIdOrResource) {
        if(optionalUriOrIdOrResource)
            return recordClass.load(optionalUriOrIdOrResource);
    };
    this.mold(recordClass, schema);
    return recordClass;
};

// Return type name for uri (or resource) of record, if record exists

ActiveRDF.prototype.typeOf = function(uriOrResource) {
    var resource = ActiveRDF.normalize(uriOrResource, true);
    var typeResource = this.datasource.GetTarget(
        resource,
        ActiveRDF.Service.GetResource('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        true);
    return typeResource;
};


ActiveRDF.prototype.getType = function(typeName) {
    return this.__types[typeName];
};

// Load a record and cast it to the appropriate class

ActiveRDF.prototype.load = function(uriOrResource) {
    var resource = ActiveRDF.normalize(uriOrResource, true);

    var typeResource = this.typeOf(resource);
    if(typeResource) {
        typeResource.QueryInterface(Ci.nsIRDFLiteral).Value;
        var object = new this.__types[typeResource.Value]();
        object.init(resource);
        return object;
    } else {
        return null;
    }
};

// Checks for existence of record

ActiveRDF.prototype.exists = function(uriOrResource) {
    return this.typeOf(uriOrResource) != null;
};

// Remove all assertions from the datasource

ActiveRDF.prototype.clean = function() {
    var ds = this.datasource;
    var resources = ds.GetAllResources();

    while(resources.hasMoreElements()) {
        var resource = resources.getNext();
        var arcs = ds.ArcLabelsOut(resource);
        while(arcs.hasMoreElements()) {
            var arc = arcs.getNext();
            var targets = ds.GetTargets(resource, arc, true);
            while(targets.hasMoreElements()) {
                var target = targets.getNext();
                ds.Unassert(resource, arc, target);
            }
        }
    }
};


// ****** Internal routines, enter at your own risk ******

ActiveRDF.Service = Components.
    classes['@mozilla.org/rdf/rdf-service;1'].
    getService(Ci.nsIRDFService);
ActiveRDF.ContainerUtils = Components.
    classes['@mozilla.org/rdf/container-utils;1'].
    getService(Ci.nsIRDFContainerUtils);

ActiveRDF.normalize = function(something, forceUri) {
    if(!something)
        return null;
    else if(something instanceof Ci.nsIRDFResource ||
            something instanceof Ci.nsIRDFLiteral)
        return something;
    else if(something.__root)
        return something.__root;
    else if(forceUri)
        return ActiveRDF.Service.GetResource(something);
    else if(something.toString)
        return ActiveRDF.Service.GetLiteral(something.toString());
};

ActiveRDF.prototype.getNextID = function(object) {
    if(!this.__counters)
        this.__counters = {};
        
    if(!this.__counters[object])
        this.__counters[object] = 0;

    this.__counters[object] += 1;
    return this.__counters[object];
};

ActiveRDF.prototype.returnResource = function(source, predicate) {
    source = ActiveRDF.normalize(source, true);
    predicate = ActiveRDF.normalize(predicate, true);
    var ds = this.datasource;
    
    var target = ds.GetTarget(source, predicate, true);
    if(target)
        return target.QueryInterface(Ci.nsIRDFResource);
    else
        return null;
};

ActiveRDF.prototype.returnLiteral = function(source, predicate) {
    source = ActiveRDF.normalize(source, true);
    predicate = ActiveRDF.normalize(predicate, true);
    var ds = this.datasource;

    var target = ds.GetTarget(source, predicate, true);
    if(target)
        return target.QueryInterface(Ci.nsIRDFLiteral).Value;
    else
        return null;
};

ActiveRDF.prototype.replaceSource = function(target, predicate, source) {
    target = ActiveRDF.normalize(target, true);
    predicate = ActiveRDF.normalize(predicate, true);
    source = ActiveRDF.normalize(source, true);
    var ds = this.datasource;

    var oldSource = ds.GetSource(predicate, target, true);

    if(oldSource == source)  // REVIEW TEST
        return;

    if(oldSource && !source)
        ds.Unassert(oldSource, predicate, target);
    else if(oldSource && source) {
        ds.Unassert(oldSource, predicate, target);
        ds.Assert(source, predicate, target, true);
    } else if(!oldSource && source)
        ds.Assert(source, predicate, source, true);
    else if(!oldSource && !source)
        ;
};

ActiveRDF.prototype.replaceTarget = function(source, predicate, target) {
    source = ActiveRDF.normalize(source, true);
    predicate = ActiveRDF.normalize(predicate, true);
    target = ActiveRDF.normalize(target);
    var ds = this.datasource;

    var oldTarget = ds.GetTarget(source, predicate, true);

    if(oldTarget == target)  // REVIEW TEST
        return;

    if(oldTarget && !target) 
        ds.Unassert(source, predicate, oldTarget);
    else if(oldTarget && target)
        ds.Change(source, predicate, oldTarget, target);
    else if(!oldTarget && target) 
        ds.Assert(source, predicate, target, true);
    else if(!oldTarget && !target)
        ;
};

ActiveRDF.prototype.unassertTargets = function(source) {
    if(!(source instanceof Ci.nsIRDFResource))
        source = ActiveRDF.Service.GetResource(source);
    var ds = this.datasource;

    var arcsOut = ds.ArcLabelsOut(source);
    while(arcsOut.hasMoreElements()) {
        var arcOut = arcsOut.getNext();
        var targets = ds.GetTargets(source, arcOut, true);
        while(targets.hasMoreElements()) {
            var target = targets.getNext();
            ds.Unassert(source, arcOut, target);
        }
    }
};

ActiveRDF.prototype.unassertSources = function(target) {
    if(!(target instanceof Ci.nsIRDFResource))
        target = ActiveRDF.Service.GetResource(target);
    var ds = this.datasource;

    var arcsIn = ds.ArcLabelsIn(target);
    while(arcsIn.hasMoreElements()) {
        var arcIn = arcsIn.getNext();
        var sources = ds.GetSources(arcIn, target, true);
        while(sources.hasMoreElements()) {
            var source = sources.getNext();
            ds.Unassert(source, arcIn, target);
        }
    }
};

ActiveRDF.prototype.extract = function(resourceOrLiteral) {
    if(resourceOrLiteral instanceof Ci.nsIRDFResource)
        return this.load(resourceOrLiteral);
    else if(resourceOrLiteral instanceof Ci.nsIRDFLiteral)
        return resourceOrLiteral.Value;         
};

ActiveRDF.prototype.makeIntoCollection = function(object) {
    var context = this;

    object.prototype.add = function(value, forceUri) {
        value = ActiveRDF.normalize(value, forceUri);
        this.__container.AppendElement(value);
    };

    object.prototype.has = function(value, forceUri) {
        return (this.indexOf(value, forceUri) != -1);
    };

    object.prototype.indexOf = function(value, forceUri) {
        value = ActiveRDF.normalize(value, forceUri);
        return this.__container.IndexOf(value);
    };

    object.prototype.at = function(index) {
        var target = context.datasource.GetTarget(
            this.__root,
            ActiveRDF.ContainerUtils.IndexToOrdinalResource(index+1),
            true);

        return context.extract(target);
    };

    object.prototype.remove = function(value, forceUri) {
        value = ActiveRDF.normalize(value, forceUri);
        this.__container.RemoveElement(value, true);
    };

    object.prototype.getCount = function() {
        return this.__container.GetCount(); 
    };

    object.prototype.clear = function() { // XXX untested
        var elements = this.__container.GetElements();
        while (elements.hasMoreElements()){
            var e = elements.getNext();
            this.__container.RemoveElement(e, false);
        }
    };

    object.prototype.getArray = function() { // XXX untested
        var elements = this.__container.GetElements();
        var array = [];
        while(elements.hasMoreElements()) 
            array.push(context.extract(elements.getNext()));
        return array;
    };
    
    object.prototype.getElements = function() {
        var elements = this.__container.GetElements();
        var enumeration = {
            getNext: function() {
                return context.extract(elements.getNext());
            },

            hasMoreElements: function() {
                return elements.hasMoreElements();
            }
        }
        return enumeration;
    };
};

ActiveRDF.prototype.createCollectionAccessor = function(object, fieldName, predicate) {
    var context = this;

    object.prototype.__defineGetter__(
        fieldName, function() {
            var record = this;

            var collection = {
                getCount: function() {
                    var targets = this.__getEnumeration();
                    
                    var count = 0;
                    while(targets.hasMoreElements()) {
                        count += 1;
                        targets.getNext();
                    }
                    
                    return count;
                },

                add: function(value, forceUri) {
                    if(value)
                        context.datasource.Assert(
                            record.__root,
                            ActiveRDF.normalize(predicate, true),
                            ActiveRDF.normalize(value, forceUri),
                            true);
                },

                fetch: function(value, forceUri) {
                    if(this.has(value, forceUri))
                        return context.extract(
                            ActiveRDF.normalize(value, forceUri))
                },

                remove: function(value, forceUri) {
                    if(this.has(value, forceUri))
                        context.datasource.Unassert(
                            record.__root,
                            ActiveRDF.normalize(predicate, true),
                            ActiveRDF.normalize(value, forceUri));
                },

                has: function(value, forceUri) {
                    return context.datasource.HasAssertion(
                        record.__root,
                        ActiveRDF.normalize(predicate, true),
                        ActiveRDF.normalize(value, forceUri),
                        true);
                },

                clear: function(value) {
                    var targets = this.__getEnumeration();

                    while(targets.hasMoreElements())
                        context.datasource.Unassert(
                            record.__root,
                            ActiveRDF.normalize(predicate, true),
                            targets.getNext());
                },

                getElements: function() {
                    var elements = this.__getEnumeration();

                    var enumeration = {
                        getNext: function() {
                            var element = elements.getNext();
                            try {
                                element.QueryInterface(Ci.nsIRDFResource);
                                return context.load(element);
                            } catch(e) {
                                element.QueryInterface(Ci.nsIRDFLiteral);
                                return element.Value;
                            }
                        },
                        
                        hasMoreElements: function() {
                            return elements.hasMoreElements();
                        }
                    }
                    return enumeration;
                },

                __getEnumeration: function() {
                    return context.datasource.GetTargets(
                        record.__root,
                        ActiveRDF.normalize(predicate, true),
                        true);
                }
            };
            return collection;
        });
};

ActiveRDF.prototype.createFieldAccessor = function(object, fieldName, predicate, direction) {
    var context = this;

    object.prototype.__defineGetter__(
        fieldName, function() {
            if(direction == 'source') 
                var otherEnd = context.datasource.GetSource(
                    ActiveRDF.normalize(predicate, true),
                    this.__root,
                    true);
            else
                var otherEnd = context.datasource.GetTarget(
                    this.__root,
                    ActiveRDF.normalize(predicate, true),
                    true);
                    
            if(otherEnd) {
                try {
                    otherEnd.QueryInterface(Ci.nsIRDFResource);
                    return context.load(otherEnd);
                } catch(e) {
                    otherEnd.QueryInterface(Ci.nsIRDFLiteral);
                    return otherEnd.Value;
                }
            }
            
        });

    if(direction == 'source') {
        object.prototype.__defineSetter__(
            fieldName, function(value) {
                if(!value)
                    context.replaceSource(this, predicate, value);
                else if(value.__root ||
                   value instanceof Ci.nsIRDFResource) {
                    context.replaceSource(this, predicate, value);
                } else
                    throw new Error('Invalid value.');
            }); 
    } else {
        object.prototype.__defineSetter__(
            fieldName, function(value) {
                context.replaceTarget(this, predicate, value);
            });
    }
};

ActiveRDF.prototype.mold = function(object, schema) {
    object.schema = schema;
    var context = this;

    if(!this.__types)
        this.__types = {};
    
    this.__types[schema.name] = object;

    object.load = function(idOrUri) {
        var uri;

        if(idOrUri) {
            if(idOrUri.match(/^(http:\/\/|urn:)/)) {
                uri = idOrUri; // XXX uri to a record of different class might have been given, throw exception if that is the case
            } else {
                if(!this.schema.uri.match(/__ID__/)) {
                    var e = new Error(this.schema.uri);
                    e.name = 'IDNotNeeded';
                    throw e;
                }

                uri = this.schema.uri.replace('__ID__', idOrUri);                
            }
        } else
            uri = this.schema.uri;

        return context.load(uri);
    };

    object.create = function() {
        var id, initFields;

        switch(arguments.length) {
        case 0:
            id = context.getNextID(object);
            break;
        case 1:
            if(typeof(arguments[0]) == 'object') {
                initFields = arguments[0];                
                id = context.getNextID(object);
            } else {
                id = arguments[0];
//                if(!this.schema.uri.match(/__ID__/))
//                    throw 'IDNotNeeded';
            }
            break;
        case 2:
            id = arguments[0];
            if(!this.schema.uri.match(/__ID__/)) {
                var e = new Error(this.schema.uri);
                e.name = 'IDNotNeeded';
                throw e;
            }
            initFields = arguments[1];
            break;
        }
        
        if(object.exists(id)) {
            var e = new Error('ID ' + id + ' already exists.');
            e.name = 'RecordAlreadyExists';
            throw e;
        }
            
        var uri = this.schema.uri.replace('__ID__', id);
        
        var o = new this();
        o.init(uri, initFields);
        return o;
    };

    object.find = function(which, opts, forceUri) {
        if(which == 'first') {
            var target, name;
            for(name in opts) { // is there no more elegant way?
                target = ActiveRDF.normalize(opts[name], forceUri);
                break;
            }

            var predicate = ActiveRDF.Service.GetResource(
                this.schema.fields[name].predicate);
            var source = context.datasource.GetSource(
                predicate, target, true);
            return context.extract(source);
            
        } else if(which == 'all') {
            
        } else {
            // throw something
        }
    };

    object.get = function(id) {
        var instance = object.load(id) || object.create(id);
        return instance;
    };

    object.exists = function(id) {
//        if(!this.schema.uri.match(/__ID__/))
//            throw 'IDNotNeeded';
        var uri = this.schema.uri.replace('__ID__', id);

        return context.exists(uri);
    };

    object.resourceFor = function(id) {
        return ActiveRDF.Service.GetResource(this.schema.uri.replace('__ID__', id));
    };

    object.prototype.destroy = function() {
        context.unassertTargets(this.__root);
        context.unassertSources(this.__root);
    };

    object.prototype.__defineGetter__(
        'uri', function() {
            return this.__root.Value;
        });

    if(schema.isCollection)
        context.makeIntoCollection(object);

    schema.fields = schema.fields || {};
    schema.isCollection = schema.isCollection || false;
    for(fieldName in schema.fields) {
        var spec = schema.fields[fieldName];
        spec.direction = spec.direction || 'target';

        if(spec.isCollection)
            context.createCollectionAccessor(object, fieldName, spec.predicate);
        else
            context.createFieldAccessor(object, fieldName, spec.predicate, spec.direction);
    }

    object.prototype.init = function(uriOrResource, initFields) {
        initFields = initFields || {};

        this.__root = ActiveRDF.normalize(uriOrResource, true);

        // Checking for type: if it is set, just make resource a
        // collection if needed and return it right away

        var type = context.datasource.GetTarget(
            this.__root,
            ActiveRDF.Service.GetResource('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            true);

        if(type) {
            type.QueryInterface(Ci.nsIRDFLiteral);
            if(type.Value != schema.name)
                // XXX replace with true exception here
                throw {name: 'RecordAlreadyInitialized',
                        message: 'Requested to init ' + this.__root.Value +
                        ' to ' + schema.name +
                        ' but it already is initialized to ' + type.Value};
            else {
                if(schema.isCollection)
                    this.__container = ActiveRDF.ContainerUtils.MakeSeq(
                        context.datasource,
                        this.__root);
                
                    return;
            }
        }

        if(schema.isCollection)
            this.__container = ActiveRDF.ContainerUtils.MakeSeq(
                context.datasource,
                this.__root);

        for(fieldName in initFields) {
            var fieldValue = initFields[fieldName];
            this[fieldName] = fieldValue;
        }

        // Setting type at the end, since observer are likely to
        // watch for this, so that they'll get the object only when it
        // has been initialized
        context.datasource.Assert(
            this.__root,
            ActiveRDF.Service.GetResource('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            ActiveRDF.Service.GetLiteral(schema.name),
            true);
    };
};


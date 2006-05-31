var Schemas = {
    Person: {
        name:        'Person',
        uri:          'urn:person:__ID__',
        isCollection: true,
        
        fields: {
            name: {
                predicate: 'urn:predicate:name',
                // direction: 'target' is default
                // isCollection: false is default
            },
            address: {
                predicate: 'urn:predicate:address',
            },
            son: {
                predicate: 'urn:predicate:son',
            },
            father: {
                predicate: 'urn:predicate:son',
                direction: 'source'
            },
            hobbies: {
                predicate: 'urn:predicate:hobby',
                isCollection: true
            }
        },
    },
    Group: {
        name:         'Group',
        uri:          'urn:group:__ID__',
        isCollection: true
    },
    Universe: {
        name:         'Universe',
        uri:          'urn:universe',
        isCollection: true
    }
};

var module = new ModuleManager(['chrome://mozlab/content']);
var ActiveRDF = module.require('package', 'lib/activerdf').ActiveRDF;

var spec = new mozlab.mozunit.Specification();
var assert = mozlab.mozunit.assertions;
        
spec.stateThat = {
    'Record class is registered in context': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
                
        assert.isDefined(context.getType('Person'));
    },

    'When record is created, type is asserted for its root resource': function() {
        var context = new ActiveRDF();
        var RDF = ActiveRDF.Service;
        var DS = context.datasource;
        var Person = context.create(Schemas.Person);
        var person = Person.create();
                
        assert.equals(RDF.GetLiteral('Person'),
                      DS.GetTarget(person.__root,
                                   RDF.GetResource('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                                   true));
    },
            
    'Generic loader returns record cast to correct type': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var person = Person.create('abc', {name: 'joe'});
                
        var record = context.load('urn:person:abc');
        assert.equals('joe', record.name);
    },

    'Specialized loader accepts both IDs and URIs as parameters': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var person = Person.create('abc', {name: 'joe'});
                
        var record;
        record = Person.load('abc');
        assert.equals('joe', record.name);
        record = Person.load('urn:person:abc');
        assert.equals('joe', record.name);
    },

    'Class constructor works as a shortcut to the specialized loader if it is passed an argument': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        Person.create('joe', {name: 'joe', address: 'stairway to heaven'});

        var record;
        record = Person('joe');
        assert.equals('stairway to heaven', record.address);
        record = Person('urn:person:joe');
        assert.equals('stairway to heaven', record.address);
    },

    'Loaders return null when requested record does not exist': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);

        assert.isNull(context.load('urn:person:abc'));
        assert.isNull(Person.load('abc'));
    },

    'Record is initialized with properties passed at creation time': function() {
        var context = new ActiveRDF();
        var DS = context.datasource;
        var RDF = ActiveRDF.Service;
        var Person = context.create(Schemas.Person);
        var person = Person.create({name: 'sam'});

        assert.equals('sam', person.name);
        assert.equals(RDF.GetLiteral('sam'),
                      DS.GetTarget(person.__root,
                                   RDF.GetResource('urn:predicate:name'),
                                   true));
    },

    'Record has accessors to allow assigning literal values to properties': function() {
        var context = new ActiveRDF();
        var DS = context.datasource;
        var RDF = ActiveRDF.Service;
        var Person = context.create(Schemas.Person);
        var person = Person.create({name: 'joe'});

        assert.equals(RDF.GetLiteral('joe'),
                      DS.GetTarget(person.__root,
                                   RDF.GetResource('urn:predicate:name'),
                                   true));
        assert.isNull(DS.GetTarget(person.__root,
                                   RDF.GetResource('urn:predicate:address'),
                                   true));

        person.name = 'jim';

        assert.equals('jim', person.name);
        assert.equals(RDF.GetLiteral('jim'),
                      DS.GetTarget(person.__root,
                                   RDF.GetResource('urn:predicate:name'),
                                   true));
                
        person.address = 'kimagure orange road';
                
        assert.equals('kimagure orange road', person.address);
        assert.equals(RDF.GetLiteral('kimagure orange road'),
                      DS.GetTarget(person.__root,
                                   RDF.GetResource('urn:predicate:address'),
                                   true));
    },

    'Record can be assigned an ID explicitely': function() {
        var context = new ActiveRDF();
        var RDF = ActiveRDF.Service;
        var Person = context.create(Schemas.Person);
        var person = Person.create('jim');

        assert.equals(RDF.GetResource('urn:person:jim'),
                      person.__root);
    },

    'Null value can be assigned to record properties': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var person = Person.create({name: 'joe'});

        person.name = null;
        assert.equals(null, person.name);
    },

    'Target assertions are unasserted when record is destroyed': function() {
        var context = new ActiveRDF();
        var DS = context.datasource;
        var RDF = ActiveRDF.Service;
        var Person = context.create(Schemas.Person);
        var person = Person.create({name: 'joe'});

        assert.equals(RDF.GetLiteral('joe'),
                      DS.GetTarget(person.__root,
                                   RDF.GetResource('urn:predicate:name'),
                                   true));
                
        person.destroy();
                
        assert.isNull(DS.GetTarget(person.__root,
                                   RDF.GetResource('urn:predicate:name'),
                                   true));
    },

    'Source assertions are unasserted when record is destroyed': function() {
        var context = new ActiveRDF();
        var DS = context.datasource;
        var RDF = ActiveRDF.Service;
        var Person = context.create(Schemas.Person);

        var joe = Person.create();
        var sam = Person.create();

        joe.son = sam;
        assert.isTrue(joe.son);
        assert.isTrue(DS.hasArcOut(
                          joe.__root,
                          RDF.GetResource('urn:predicate:son')));
        sam.destroy();
        assert.isNull(joe.son);
        assert.isFalse(DS.hasArcOut(
                           joe.__root,
                           RDF.GetResource('urn:predicate:son')));
                
    },

    'URI of record can be retrieved': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var person = Person.create('abc');

        assert.equals('urn:person:abc', person.uri);
    },
            
    'Record can be associated to another record as a property of it': function() {
        var context = new ActiveRDF();
        var DS = context.datasource;
        var RDF = ActiveRDF.Service;
        var Person = context.create(Schemas.Person);

        var joe = Person.create({name: 'joe'});
        var sam = Person.create({name: 'sam'});
        var luke = Person.create({name: 'luke'});

        assert.equals('sam', sam.name);
        assert.equals(RDF.GetLiteral('sam'),
                      DS.GetTarget(sam.__root,
                                   RDF.GetResource('urn:predicate:name'),
                                   true));

        joe.son = sam;
        assert.equals('sam', joe.son.name);
        assert.equals(sam.__root,
                      DS.GetTarget(joe.__root,
                                   RDF.GetResource('urn:predicate:son'),
                                   true));

        sam = joe.son;
        assert.equals('joe', sam.father.name);
        assert.equals(joe.__root, sam.father.__root);

        assert.equals('luke', luke.name);
        sam.father = luke;
        assert.equals(null, joe.son); // Worse than a soap opera
        assert.equals('luke', sam.father.name);
        assert.equals('sam', luke.son.name);
    },

    'Record can host a collection that can hold literals and resources': function() {
        var context = new ActiveRDF();
        var RDF = ActiveRDF.Service;
        var RDFCU = ActiveRDF.ContainerUtils;
        var Person = context.create(Schemas.Person);

        var joe = Person.create({name: 'joe'});
        var sam = Person.create({name: 'sam'});

        assert.isTrue(RDFCU.IsContainer(
                          context.datasource,
                          joe.__root));

        joe.add('jolly');
        joe.add(sam);
                
        assert.equals(2, joe.getCount());

        assert.equals(1, joe.__container.IndexOf(
                          RDF.GetLiteral('jolly')));
        assert.equals('jolly', joe.at(0));

        assert.equals(2, joe.__container.IndexOf(sam.__root));
        assert.equals('sam', joe.at(1).name);
    },

    'When loading a record, it can be created it on the fly if it does not exist yet': function() {
        var context = new ActiveRDF();
        var DS = context.datasource;
        var RDF = ActiveRDF.Service;
        var Person = context.create(Schemas.Person);

        assert.isNull(DS.GetTarget(
                          RDF.GetResource('urn:person:alfred'),
                          RDF.GetResource('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                          true));
                
        var firstReference = Person.get('alfred');
        firstReference.address = 'stairway to heaven';
        assert.isTrue(DS.GetTarget(
                          RDF.GetResource('urn:person:alfred'),
                          RDF.GetResource('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                          true));
                
        secondReference = Person.get('alfred');
        assert.equals(secondReference.address, firstReference.address);
    },

    'Retrieving a record via get() only causes creation of it the first time': function() {
        var context = new ActiveRDF();
        var DS = context.datasource;
        var RDF = ActiveRDF.Service;
        var Universe = context.create(Schemas.Universe);
        var Person = context.create(Schemas.Person);

        var typeassertionsCount = 0;

        var observer = {
            onChange: function(ds, source, predicate, oldTarget, newTarget) {},
            onUnassert: function(ds, source, predicate, target) {},
            onassert: function(ds, source, predicate, target) {
                if(predicate == RDF.GetResource('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'))
                    typeassertionsCount += 1;
            }
        };

        DS.AddObserver(observer);
        assert.equals(0, typeassertionsCount);
        Universe.get();
        assert.equals(1, typeassertionsCount);
        Universe.get();
        assert.equals(1, typeassertionsCount);
        Universe.load();
        assert.equals(1, typeassertionsCount);
        DS.RemoveObserver(observer);

        Universe.get().add(Person.create());
        assert.equals(1, Universe.get().getCount());
    },

    'Existance of record can be checked': function() {
        var context = new ActiveRDF();
        var DS = context.datasource;
        var RDF = ActiveRDF.Service;
        var Person = context.create(Schemas.Person);

        Person.create('jack');

        assert.isTrue(Person.exists('jack'));
        assert.isTrue(context.exists('urn:person:jack'));
        assert.isFalse(Person.exists('foo'));
        assert.isFalse(context.exists('urn:person:foo'));
    },

    'Exception is raised creation of a record with the same ID of an existing one is attempted': function() {
        var context = new ActiveRDF();
        var DS = context.datasource;
        var RDF = ActiveRDF.Service;
        var Person = context.create(Schemas.Person);

        assert.isNull(DS.GetTarget(
                          RDF.GetResource('urn:person:jack'),
                          RDF.GetResource('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                          true));

        var jack = Person.create('jack');

        assert.isTrue(DS.GetTarget(
                          RDF.GetResource('urn:person:jack'),
                          RDF.GetResource('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                          true));

        assert.raises(
            'RecordAlreadyExists',
            function() {
                Person.create('jack');
            }, this);
    },

    'Records can require no ID by design (e.g. for singletons)': function() {
        var context = new ActiveRDF();
        var DS = context.datasource;
        var RDF = ActiveRDF.Service;
        var Universe = context.create(Schemas.Universe);

        assert.isNull(DS.GetTarget(
                          RDF.GetResource('urn:universe'),
                          RDF.GetResource('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                          true));
                
        var universe = Universe.get();
        assert.isTrue(DS.GetTarget(
                          RDF.GetResource('urn:universe'),
                          RDF.GetResource('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                          true));
    },

    'Exception is raised when it is attempted to load a record through the loader of another record type': function() {
        assert.fail('Write me!');
    },

    'Exception is raised when ID is provided to get a record who should have none according to its schema': function() {
        var context = new ActiveRDF();
        var Universe = context.create(Schemas.Universe);
                
        assert.raises(
            'IDNotNeeded',
            function() {
                Universe.get('abc');
            }, this);
    },

    'Items can be removed from collections': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var Group = context.create(Schemas.Group);

        var joe = Person.create();
        var sam = Person.create();
        var group = Group.create();

        group.add(joe);
        group.add(sam);

        assert.equals(2, group.getCount());
        group.remove(sam);
        assert.equals(1, group.getCount());
    },

    'Collection can be queried for inclusion of a specific item': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var Group = context.create(Schemas.Group);

        var joe = Person.create();
        var sam = Person.create();
        var group = Group.create();
                
        group.add(joe);
        group.add(sam);

        assert.isTrue(group.has(joe));
        assert.isTrue(group.has(sam));
    },

    // REVIEW also test with mixed literal/resource collections
    'Collections can be iterated over': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var Group = context.create(Schemas.Group);

        var joe = Person.create({name: 'joe'});
        var sam = Person.create({name: 'sam'});
        var luke = Person.create({name: 'luke'});

        var group = Group.create();
        group.add(joe);
        group.add(sam);
        group.add(luke);

        var person, namesSeen, enum;
        namesSeen = [];
        enumeration = group.getElements();
        while(enumeration.hasMoreElements()) {
            person = enumeration.getNext();
            namesSeen.push(person.name);
        }
        assert.equals('joe,sam,luke', namesSeen.join(','));
    },

    'Record can have external named unordered collections': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var joe = Person.create({name: 'joe'});

        assert.equals(0, joe.hobbies.getCount());
        joe.hobbies.add('coding');
        assert.equals(1, joe.hobbies.getCount());
    },

    'External collections can be cleared': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var joe = Person.create();

        joe.hobbies.add('coding');
        assert.equals(1, joe.hobbies.getCount());
        joe.hobbies.clear();
        assert.equals(0, joe.hobbies.getCount());
    },

    'A specific element can be retrieved from external collection given its value': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var person = Person.create();
        var joe = Person.create();

        joe.hobbies.add('coding');
        assert.equals('coding', joe.hobbies.fetch('coding'));

        assert.fail('Try with resources as well!');
    },

    'A specific element can be removed from external collection': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var person = Person.create();
        var joe = Person.create();

        joe.hobbies.add('coding');
        assert.equals(1, joe.hobbies.getCount());
        joe.hobbies.remove('coding');
        assert.equals(0, joe.hobbies.getCount());                
    },

    'A specific element can be checked for inclusion in external collection': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var person = Person.create();
        var joe = Person.create();

        assert.isFalse(joe.hobbies.has('coding'));
        joe.hobbies.add('coding');
        assert.isTrue(joe.hobbies.has('coding'));
    },

    'External collections can handle resources and literals, even together': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var person = Person.create();

        var joe = Person.create('joe');
        var nancy = Person.create('nancy');

        assert.isFalse(joe.hobbies.has(nancy));
        joe.hobbies.add(nancy);
        assert.isTrue(joe.hobbies.has(nancy));
        assert.isFalse(joe.hobbies.has('nancy'));
        assert.isFalse(joe.hobbies.has('urn:person:nancy'));
        assert.isTrue(joe.hobbies.has('urn:person:nancy', true));
        assert.isTrue(joe.hobbies.has(Person.resourceFor('nancy')));
    },

    'Unordered external collections can be iterated over': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        var person = Person.create();
        var joe = Person.create();

        joe.hobbies.add('coding');
        joe.hobbies.add('skating');
        joe.hobbies.add('eating');

        var hobbiesSeen, enumeration;
        hobbiesSeen = [];
        enumeration = joe.hobbies.getElements();
        while(enumeration.hasMoreElements()) {
            hobby = enumeration.getNext();
            hobbiesSeen.push(hobby);
        }
        assert.equals('coding,skating,eating', hobbiesSeen.join(','));
    },

    'A record can be found given the value of one of its properties': function() {
        var context = new ActiveRDF();
        var Person = context.create(Schemas.Person);
        Person.create({name: 'joe', address: 'saturn'});
        Person.create({name: 'jim', address: 'jupiter'});

        var p = Person.find('first', {name: 'joe'});
        assert.equals('saturn', p.address);
        var p = Person.find('first', {name: 'jim'});
        assert.equals('jupiter', p.address);
    }
};

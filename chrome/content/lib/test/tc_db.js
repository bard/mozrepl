var module = new ModuleManager(['chrome://mozlab/content']);
var database = module.require('package', 'lib/db');
var assert = mozlab.mozunit.assertions;

var dbSpec = new mozlab.mozunit.Specification('Object DB');

dbSpec.stateThat = {
    'Object is stamped with ID when put in database': function() {
        var db = new database.DB();

        var object = {foo: 'bar'};
        assert.isUndefined(object.id);

        db.put(object);
        assert.isDefined(object.id);
    },

    'Find objects through properties with equal (==) value': function() {
        var db = new database.DB();

        db.put({firstname: 'joe', lastname: 'smith'});
        db.put({firstname: 'mary', lastname: 'scott'});

        var result = db.get({firstname: 'mary'});
        assert.equals('scott', result.lastname);
    },
    
    'Find objects through properties with matching value (defined by regexps)': function() {
        var db = new database.DB();

        db.put({firstname: 'joe', lastname: 'smith'});
        db.put({firstname: 'mary', lastname: 'scott'});

        var result = db.get({firstname: /^j..$/});
        assert.equals('smith', result.lastname);
    },

    'Find objects through object identity (defined by stamped id)': function() {
        var db = new database.DB();

        var bard = {type: 'entity', jid: 'bard@localhost', status: 'online'};
        var alyssa = {type: 'entity', jid: 'alyssa@localhost', status: 'chatty'};

        db.put(bard);
        db.put(alyssa);

        db.put({type: 'message', from: bard, to: alyssa, body: 'hello!'});
        db.put({type: 'message', from: alyssa, to: bard, body: 'hey there'});
       
        var entity = db.get({type: 'entity', jid: 'alyssa@localhost'});
        var message = db.get({type: 'message', from: entity});
        assert.equals('hey there', message.body);
    },

    'Return null when object not found': function() {
        var db = new database.DB();
        assert.isNull(db.get({type: 'none'}));
    },

    'Watch insertion of new objects based on pattern': function() {
        var db = new database.DB();

        var personSeen;
        db.on(
            {type: 'person'}, function(person) {
                personSeen = person;
            });

        db.put({type: 'food', name: 'pizza'});
        assert.isUndefined(personSeen);

        db.put({type: 'person', name: 'joe'});
        assert.isDefined(personSeen);
        assert.equals('joe', personSeen.name);


        var client;
        var joe = db.get({type: 'person', name: 'joe'});
        client = {type: 'client', of: joe};
        assert.equals('joe', client.of.name);
        db.put(client);

        client = db.get({type: 'client'});
        assert.equals('joe', client.of.name);
    },

    'Object got then put replaces former but triggers put event': function() {
        var db = new database.DB();

        var contactSeen;
        db.on(
            {type: 'contact'},
            function(contact) {
                contactSeen = contact;
            });
        
        var contact = {type: 'contact', name: 'bard', status: 'online'};
        assert.isUndefined(contactSeen);

        db.put(contact);
        assert.isDefined(contactSeen);
        assert.equals('bard', contactSeen.name);
        assert.equals('online', contactSeen.status);
        contactSeen = null;
        
        contact.status = 'away';
        assert.isDefined(contact.id);
        db.put(contact);
        assert.equals('bard', contactSeen.name);
        assert.equals('away', contactSeen.status);        
    }
};



var matcherSpec = new mozlab.mozunit.Specification('Template Matcher');

matcherSpec.stateThat = {
    'Template matcher matches when pattern and template have members with equal (==) value': function() {
        assert.isTrue(
            database._match1(
                {firstname: 'joe', lastname: 'smith'},
                {firstname: 'joe'}));
    },

    'Template matcher matches on regular expressions': function() {
        assert.isTrue(
            database._match1(
                {firstname: 'joe', lastname: 'smith'},
                {firstname: /j/}));

        assert.isTrue(
            database._match1(
                {type: 'person', firstname: 'joe', lastname: 'smith'},
                {type: 'person', firstname: /j/}));
    },

    'Template matcher matches on object identity (defined by stamped id)': function() {
        assert.isTrue(
            database._match1(
                {id: 2, firstname: 'joe', lastname: 'smith'},
                {id: 2}));

        assert.isFalse(
            database._match1(
                {id: 2, firstname: 'joe', lastname: 'smith'},
                {id: 1}));        
    },

    'Template matcher match on arbitrary condition (specified by function)': function() {
        assert.isTrue(
            database._match1(
                {firstname: 'joe', lastname: 'smith'},
                {firstname: function(s) { return s.length == 3 }}));

        assert.isFalse(
            database._match1(
                {firstname: 'joe', lastname: 'smith'},
                {firstname: function(s) { return s.length < 3}}));
    },

    'Template matcher treats null as matchable and undefined as wildcard': function() {
        assert.isTrue(
            database._match1(
                {firstname: 'joe', lastname: null},
                {lastname: null}));

        assert.isFalse(
            database._match1(
                {firstname: 'joe', lastname: 'smith'},
                {lastname: null}));

        assert.isTrue(
            database._match1(
                {firstname: 'joe', lastname: 'smith'},
                {lastname: undefined}));
    }
};


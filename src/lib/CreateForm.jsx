var React = require('react/addons');
var contextConfig = require('./contextConfig');
var convertSchema = require('./convertSchema');

var EMAIL_REGEX = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;
var NUMBER_REGEX = /^\d+$/;

module.exports = function CreateForm(config) {

  if (!config.schema) throw new Error('You must include "schema" as one of the properties for CreateForm');
  if (!config.mixins) config.mixins = [];

  // If we get an array for the schema,
  // assume we want a multi-part form
  if (config.schema instanceof Array) {
    config.schema = convertSchema(config.schema);
  }

  // We need this for setting up linked state
  if (config.mixins.indexOf(React.addons.LinkedStateMixin) === -1) {
    config.mixins.push(React.addons.LinkedStateMixin);
  }

  config.mixins.push({

    getInitialState: function () {

      var state = {
        isValid: false,
        didSubmit: false,
        dirtyFields: []
      };

      Object.keys(this.schema).forEach(key => {
        state[key] = this.schema[key].initial;
      });

      return state;
    },

    childContextTypes: contextConfig.types,

    getChildContext: function() {
      var methods = {};
      contextConfig.methods.forEach(method => {
        methods[method] = this[method];
      });
      return {
        composableForms: methods
      };
    },

    linkField: function (key) {
      if (!this.schema[key]) throw new Error('No value "' + key + '" exists in the schema');
      return this.linkState(key);
    },

    getValues: function () {
      var values = {};
      Object.keys(this.schema).forEach(key => {
        values[key] = this.linkField(key).value;
      });
      return values;
    },

    submitGroup: function (group, onSuccess, onError) {

      var dirtyFields = this.state.dirtyFields;

      Object.keys(this.schema).forEach(key => {
        if (this.schema[key].group === group && dirtyFields.indexOf(key) === -1) dirtyFields.push(key);
      });

      this.setState({dirtyFields});

      // TODO return values
      if (this.isGroupValid(group)) {
        onSuccess && onSuccess();
      } else {
        onError && onError();
      }
    },

    submitForm: function(e) {

      if (e) e.preventDefault();

      // Make all fields dirty
      var dirtyFields = this.state.dirtyFields;
      Object.keys(this.schema).forEach(key => {
        if (dirtyFields.indexOf(key) === -1) dirtyFields.push(key);
      });

      this.setState({
        dirtyFields,
        didSubmit: true
      });

      if (!this.isValid()) return;

      var data = {};

      Object.keys(this.schema).forEach(key => {
        if (typeof this.state[key] !== 'undefined') data[key] = this.state[key];
      });

      if (this.onSuccess) {
        this.onSuccess(data);
      }
    },

    validations: require('./validations'),

    validateField: function (key) {
      var errors = [];
      var schema = this.schema[key];
      var currentValue = this.state[key];
      var label = schema.label || key;

      if (schema.required === true && !currentValue) errors.push(label + ' is required');
      if (typeof schema.required === 'function') {
        var isConditionallyRequred = schema.required.bind(this)();
        if (isConditionallyRequred && !currentValue) errors.push(label + ' is required');
      }
      if (currentValue && schema.type && this.validations[schema.type]) {
        var typeError = this.validations[schema.type](currentValue);
        if (typeError) errors.push(label + typeError);
      }
      if (!errors.length) return false;
      return errors;
    },

    didSubmit: function (field) {
      if (!field) return this.state.didSubmit;
      return this.state.dirtyFields.indexOf(field) !== -1;
    },

    isGroupValid: function (groupName) {
      var isValid = true;
      var fields = Object.keys(this.schema).filter(key => this.schema[key].group === groupName);
      fields.forEach(key => {
        if (this.validateField(key)) isValid = false;
      });
      return isValid;
    },

    isValid: function () {
      var isValid = true;
      Object.keys(this.schema).forEach(key => {
        if (this.validateField(key)) isValid = false;
      });
      return isValid;
    }
  });

  return React.createClass(config);
}